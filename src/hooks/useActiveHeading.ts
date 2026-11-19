import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { HEADING_SELECTOR } from '../lib/outline';

/** A heading counts as "current" once its top is within this many px of the scroller's top. */
export const ACTIVE_OFFSET_PX = 96;
/** After an outline click, ignore scroll-driven updates until scrolling has been idle this long. */
const CLICK_LOCK_IDLE_MS = 150;
/** Grace period for the smooth scroll to emit its first scroll event. */
const CLICK_LOCK_START_MS = 400;

const getScroller = (el: HTMLElement): HTMLElement =>
  (el.closest('.dev-main') as HTMLElement | null) ??
  (document.scrollingElement as HTMLElement | null) ??
  document.documentElement;

/**
 * Computes which heading line the reader is currently in, from the rendered
 * headings inside `container`. Returns null when there are no headings.
 */
export function computeActiveLine(container: HTMLElement): number | null {
  const headings = Array.from(container.querySelectorAll<HTMLElement>(HEADING_SELECTOR)).filter(
    (h) => h.dataset.lineStart,
  );
  if (headings.length === 0) return null;

  const scroller = getScroller(container);
  const scrollerTop =
    scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
  const viewportBottom =
    scroller === document.documentElement
      ? window.innerHeight
      : scroller.getBoundingClientRect().bottom;
  const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;

  let active = headings[0];
  for (const h of headings) {
    const top = h.getBoundingClientRect().top;
    // At the very bottom, short trailing sections can never reach the top
    // threshold; treat any heading visible on screen as reached.
    if (top - scrollerTop <= ACTIVE_OFFSET_PX || (atBottom && top < viewportBottom)) {
      active = h;
    } else {
      break;
    }
  }
  return Number(active.dataset.lineStart);
}

/**
 * Tracks the heading currently being read in the markdown preview.
 * `revision` should change whenever the rendered content changes.
 * `lockTo(line)` marks a heading active immediately (e.g. after an outline
 * click) and keeps it until the resulting smooth scroll settles.
 */
export const useActiveHeading = (
  containerRef: RefObject<HTMLElement | null>,
  revision: unknown,
) => {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleUnlock = useCallback((delay: number) => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      lockedRef.current = false;
      unlockTimerRef.current = null;
    }, delay);
  }, []);

  const lockTo = useCallback(
    (line: number) => {
      lockedRef.current = true;
      setActiveLine(line);
      // If the target is already in place no scroll event fires; release anyway.
      scheduleUnlock(CLICK_LOCK_START_MS);
    },
    [scheduleUnlock],
  );

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const container = containerRef.current;
      setActiveLine(container ? computeActiveLine(container) : null);
    };

    const onScroll = () => {
      if (lockedRef.current) {
        scheduleUnlock(CLICK_LOCK_IDLE_MS);
        return;
      }
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    // Scroll events don't bubble, but capture on document sees every scroller.
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, [containerRef, revision, scheduleUnlock]);

  useEffect(
    () => () => {
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    },
    [],
  );

  return { activeLine, lockTo };
};
