import { describe, it, expect, afterEach } from 'vitest';
import { computeActiveLine, ACTIVE_OFFSET_PX } from './useActiveHeading';

// jsdom has no layout, so stub each heading's top and the scroller geometry.
const setup = (tops: number[], { atBottom = false } = {}) => {
  const main = document.createElement('div');
  main.className = 'dev-main';
  const container = document.createElement('div');
  tops.forEach((top, i) => {
    const el = document.createElement(i === 0 ? 'h1' : 'h2');
    el.dataset.lineStart = String((i + 1) * 10);
    el.getBoundingClientRect = () => ({ top }) as DOMRect;
    container.appendChild(el);
  });
  main.appendChild(container);
  document.body.appendChild(main);
  main.getBoundingClientRect = () => ({ top: 0, bottom: 800 }) as DOMRect;
  Object.defineProperties(main, {
    scrollTop: { value: atBottom ? 1200 : 0, configurable: true },
    clientHeight: { value: 800, configurable: true },
    scrollHeight: { value: 2000, configurable: true },
  });
  return container;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('computeActiveLine', () => {
  it('returns null when there are no headings', () => {
    expect(computeActiveLine(setup([]))).toBeNull();
  });

  it('falls back to the first heading before any heading reaches the top', () => {
    expect(computeActiveLine(setup([300, 900]))).toBe(10);
  });

  it('picks the last heading scrolled past the offset', () => {
    expect(computeActiveLine(setup([-500, -100, ACTIVE_OFFSET_PX, 600]))).toBe(30);
  });

  it('ignores headings just below the offset', () => {
    expect(computeActiveLine(setup([-500, ACTIVE_OFFSET_PX + 1]))).toBe(10);
  });

  it('treats visible trailing headings as reached when scrolled to the bottom', () => {
    expect(computeActiveLine(setup([-500, 400, 700, 900], { atBottom: true }))).toBe(30);
  });

  it('skips headings without a source line', () => {
    const container = setup([-100]);
    const stray = document.createElement('h2');
    stray.getBoundingClientRect = () => ({ top: -50 }) as DOMRect;
    container.appendChild(stray);
    expect(computeActiveLine(container)).toBe(10);
  });
});
