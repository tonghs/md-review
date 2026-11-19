import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSplitPane, clampRatio } from './useSplitPane';

const options = { initialRatio: 0.5, minRatio: 0.15, maxRatio: 0.85, storageKey: 'split-test' };

describe('clampRatio', () => {
  it('clamps into [min, max]', () => {
    expect(clampRatio(0.05, 0.15, 0.85)).toBe(0.15);
    expect(clampRatio(0.95, 0.15, 0.85)).toBe(0.85);
    expect(clampRatio(0.4, 0.15, 0.85)).toBe(0.4);
  });
});

describe('useSplitPane', () => {
  it('uses the initial ratio without stored data', () => {
    const { result } = renderHook(() => useSplitPane(options));
    expect(result.current.ratio).toBe(0.5);
  });

  it('restores a stored ratio, clamped to bounds', () => {
    localStorage.setItem('split-test', '0.99');
    const { result } = renderHook(() => useSplitPane(options));
    expect(result.current.ratio).toBe(0.85);
  });

  it('ignores invalid stored data', () => {
    localStorage.setItem('split-test', 'garbage');
    const { result } = renderHook(() => useSplitPane(options));
    expect(result.current.ratio).toBe(0.5);
  });

  it('follows the mouse while dragging and persists on release', () => {
    const { result } = renderHook(() => useSplitPane(options));
    const container = document.createElement('div');
    container.getBoundingClientRect = () => ({ top: 100, height: 400 }) as DOMRect;
    (result.current.containerRef as { current: HTMLDivElement | null }).current = container;

    act(() => {
      result.current.handleMouseDown({ preventDefault: () => {} } as React.MouseEvent);
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 200 }));
    });
    expect(result.current.ratio).toBeCloseTo(0.25);

    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 0 }));
    });
    expect(result.current.ratio).toBe(0.15);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(result.current.isDragging).toBe(false);
    expect(localStorage.getItem('split-test')).toBe('0.1500');
  });
});
