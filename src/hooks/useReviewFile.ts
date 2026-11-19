import { useState, useEffect, useRef, useCallback } from 'react';
import { Comment } from '../components/CommentList';

interface UseReviewFileOptions {
  /**
   * Relative file path (dev mode), `undefined` for the single CLI-mode file,
   * or `null` when no file is selected (nothing is loaded or saved).
   * Mirrors the convention of `useMarkdown`.
   */
  filePath?: string | null;
}

interface UseReviewFileReturn {
  comments: Comment[];
  setComments: (comments: Comment[] | ((prev: Comment[]) => Comment[])) => void;
  saving: boolean;
  saveNow: () => Promise<void>;
}

const DEBOUNCE_MS = 1000;

export function apiUrl(filePath: string | undefined): string {
  if (filePath === undefined) return '/api/reviews';
  return `/api/reviews/${encodeURIComponent(filePath)}`;
}

function deserializeComments(raw: Array<Record<string, unknown>>): Comment[] {
  return raw.map((c) => ({
    id: c.id as string,
    text: c.text as string,
    selectedText: c.selectedText as string,
    startLine: c.startLine as number,
    endLine: c.endLine as number,
    createdAt: new Date(c.createdAt as string),
  }));
}

function serializeComments(comments: Comment[]) {
  return comments.map((c) => ({
    id: c.id,
    text: c.text,
    selectedText: c.selectedText,
    startLine: c.startLine,
    endLine: c.endLine,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  }));
}

export function useReviewFile({ filePath }: UseReviewFileOptions): UseReviewFileReturn {
  const [comments, setCommentsState] = useState<Comment[]>([]);
  const [saving, setSaving] = useState(false);

  // Latest comments / path, for user-initiated saves (saveNow)
  const commentsRef = useRef<Comment[]>(comments);
  const filePathRef = useRef(filePath);
  commentsRef.current = comments;
  filePathRef.current = filePath;

  // A debounced save captures its comments and target path when scheduled, so
  // switching files before it fires can never write one file's comments into
  // another file's review.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ comments: Comment[]; filePath: string | undefined } | null>(null);

  const doSave = useCallback(async (toSave: Comment[], fp: string | undefined) => {
    setSaving(true);
    try {
      if (toSave.length === 0) {
        await fetch(apiUrl(fp), { method: 'DELETE' });
      } else {
        await fetch(apiUrl(fp), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments: serializeComments(toSave) }),
        });
      }
    } catch (err) {
      console.error('Failed to save review file:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  /** Saves the pending debounced change right away, if there is one. */
  const flushPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) return doSave(pending.comments, pending.filePath);
  }, [doSave]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    const fp = filePathRef.current;
    if (fp === null) return;
    await doSave(commentsRef.current, fp);
  }, [doSave]);

  // Wrapper that accepts functional updates like useState
  const setComments = useCallback(
    (value: Comment[] | ((prev: Comment[]) => Comment[])) => {
      const fp = filePathRef.current;
      setCommentsState((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        if (fp !== null) {
          pendingRef.current = { comments: next, filePath: fp };
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            void flushPending();
          }, DEBOUNCE_MS);
        }
        return next;
      });
    },
    [flushPending],
  );

  // Load comments on mount / file change
  useEffect(() => {
    let cancelled = false;

    async function load(filePath: string | undefined) {
      try {
        const res = await fetch(apiUrl(filePath));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.comments && data.comments.length > 0) {
          setCommentsState(deserializeComments(data.comments));
        } else {
          // One-time migration from localStorage
          const lsKey = 'md-review-comments';
          try {
            const stored = window.localStorage.getItem(lsKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              // Dev mode: commentsMap keyed by path; CLI mode: plain array
              const migrateComments: Comment[] | undefined = filePath
                ? parsed[filePath]
                : Array.isArray(parsed)
                  ? parsed
                  : undefined;

              if (migrateComments && migrateComments.length > 0) {
                const deserialized = deserializeComments(
                  migrateComments as unknown as Array<Record<string, unknown>>,
                );
                if (!cancelled) {
                  setCommentsState(deserialized);
                  // Save migrated comments to server
                  await fetch(apiUrl(filePath), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comments: serializeComments(deserialized) }),
                  });
                }
              } else {
                setCommentsState([]);
              }
            } else {
              setCommentsState([]);
            }
          } catch {
            setCommentsState([]);
          }
        }
      } catch (err) {
        console.error('Failed to load review file:', err);
        if (!cancelled) setCommentsState([]);
      }
    }

    if (filePath === null) {
      setCommentsState([]);
    } else {
      load(filePath);
    }

    return () => {
      cancelled = true;
      // Save edits made just before switching files to the file they belong to.
      void flushPending();
    };
  }, [filePath, flushPending]);

  return { comments, setComments, saving, saveNow };
}
