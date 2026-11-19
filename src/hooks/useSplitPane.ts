import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSplitPaneOptions {
  /** Initial fraction (0–1) of the container height given to the top pane */
  initialRatio: number;
  minRatio: number;
  maxRatio: number;
  storageKey?: string;
}

export const clampRatio = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const readStoredRatio = (key: string | undefined, min: number, max: number): number | null => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clampRatio(parsed, min, max) : null;
  } catch {
    return null;
  }
};

/**
 * Vertical split between two stacked panes. Attach `containerRef` to the
 * element that holds both panes and `handleMouseDown` to the divider.
 */
export const useSplitPane = ({
  initialRatio,
  minRatio,
  maxRatio,
  storageKey,
}: UseSplitPaneOptions) => {
  const [ratio, setRatio] = useState<number>(
    () => readStoredRatio(storageKey, minRatio, maxRatio) ?? initialRatio,
  );
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(ratio);
  useEffect(() => {
    ratioRef.current = ratio;
  }, [ratio]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.height <= 0) return;
      setRatio(clampRatio((e.clientY - rect.top) / rect.height, minRatio, maxRatio));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, ratioRef.current.toFixed(4));
        } catch {
          // Persisting is a convenience; ignore storage failures.
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minRatio, maxRatio, storageKey]);

  return { ratio, isDragging, containerRef, handleMouseDown };
};
