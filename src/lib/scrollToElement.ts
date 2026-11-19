const HIGHLIGHT_CLASS = 'highlight-line';
const HIGHLIGHT_MS = 2000;
const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/** Smooth-scrolls to `element` and plays the temporary highlight animation. */
export function scrollToElement(element: Element, block: ScrollLogicalPosition = 'center') {
  element.scrollIntoView({ behavior: 'smooth', block });

  // Restart the animation if the same element is clicked again before it ends.
  const pending = timers.get(element);
  if (pending) clearTimeout(pending);
  element.classList.remove(HIGHLIGHT_CLASS);
  void (element as HTMLElement).offsetWidth;
  element.classList.add(HIGHLIGHT_CLASS);
  timers.set(
    element,
    setTimeout(() => {
      element.classList.remove(HIGHLIGHT_CLASS);
      timers.delete(element);
    }, HIGHLIGHT_MS),
  );
}

/** First element inside `container` rendered from source `line`, optionally narrowed by `selector`. */
export function findLineElement(
  container: ParentNode,
  line: number,
  selector = '*',
): Element | null {
  const candidates = container.querySelectorAll(`[data-line-start="${line}"]`);
  return Array.from(candidates).find((el) => el.matches(selector)) ?? null;
}
