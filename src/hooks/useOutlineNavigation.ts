import { useRef, useCallback } from 'react';
import { useActiveHeading } from './useActiveHeading';
import { HEADING_SELECTOR } from '../lib/outline';
import { findLineElement, scrollToElement } from '../lib/scrollToElement';

/**
 * Glue between the outline and the markdown preview: owns the ref to the
 * rendered content, tracks the active heading, and scrolls to a heading.
 * `revision` must change whenever the rendered content changes.
 */
export const useOutlineNavigation = (revision: unknown) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { activeLine, lockTo } = useActiveHeading(previewRef, revision);

  const navigateToHeading = useCallback(
    (line: number) => {
      const container = previewRef.current;
      if (!container) return;
      const element = findLineElement(container, line, HEADING_SELECTOR);
      if (!element) return;
      lockTo(line);
      scrollToElement(element, 'start');
    },
    [lockTo],
  );

  return { previewRef, activeLine, navigateToHeading };
};
