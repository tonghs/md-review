import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useReviewFile, apiUrl } from './useReviewFile';
import type { Comment } from '../components/CommentList';

const comment = (id: string): Comment => ({
  id,
  text: `text ${id}`,
  selectedText: 'sel',
  startLine: 1,
  endLine: 1,
  createdAt: new Date('2025-01-01T00:00:00Z'),
});

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn((_url: string, init?: RequestInit) =>
    init?.method ? ok({ ok: true }) : ok({ comments: [] }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const writes = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method)
    .map(([url, init]) => ({
      url,
      method: init.method,
      ids: init.body ? JSON.parse(init.body).comments.map((c: Comment) => c.id) : [],
    }));

describe('apiUrl', () => {
  it('uses the CLI endpoint without a path and encodes dev paths', () => {
    expect(apiUrl(undefined)).toBe('/api/reviews');
    expect(apiUrl('docs/a b.md')).toBe('/api/reviews/docs%2Fa%20b.md');
  });
});

describe('useReviewFile', () => {
  it('does not request anything while no file is selected', async () => {
    const { result } = renderHook(() => useReviewFile({ filePath: null }));
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.comments).toEqual([]);
  });

  it('does not save while no file is selected', async () => {
    const { result } = renderHook(() => useReviewFile({ filePath: null }));
    await act(async () => {
      await result.current.saveNow();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads from the CLI endpoint when filePath is omitted', async () => {
    fetchMock.mockImplementation(() =>
      ok({ comments: [{ ...comment('c1'), createdAt: '2025-01-01T00:00:00Z' }] }),
    );
    const { result } = renderHook(() => useReviewFile({}));
    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/reviews');
    expect(result.current.comments[0].createdAt).toBeInstanceOf(Date);
  });

  it('loads the selected file once one is chosen', async () => {
    const { rerender } = renderHook(({ fp }) => useReviewFile({ filePath: fp }), {
      initialProps: { fp: null as string | null },
    });
    rerender({ fp: 'a.md' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/reviews/a.md'));
  });

  it('saves pending comments to the file they belong to when switching files', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ fp }) => useReviewFile({ filePath: fp }), {
      initialProps: { fp: 'a.md' as string | null },
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => result.current.setComments([comment('for-a')]));
    // Let the scheduling tick run, but switch before the debounce fires.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    rerender({ fp: 'b.md' });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(writes()).toEqual([{ url: '/api/reviews/a.md', method: 'PUT', ids: ['for-a'] }]);
  });

  it('flushes a pending save on unmount exactly once', async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useReviewFile({ filePath: 'a.md' }));
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    act(() => result.current.setComments([comment('x')]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    unmount();
    await vi.runAllTimersAsync();
    expect(writes()).toEqual([{ url: '/api/reviews/a.md', method: 'PUT', ids: ['x'] }]);
  });

  it('deletes the review file when all comments are removed', async () => {
    const { result } = renderHook(() => useReviewFile({ filePath: 'a.md' }));
    await act(async () => {});
    await act(async () => {
      await result.current.saveNow();
    });
    expect(writes()).toEqual([{ url: '/api/reviews/a.md', method: 'DELETE', ids: [] }]);
  });
});
