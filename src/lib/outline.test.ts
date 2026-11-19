import { describe, it, expect } from 'vitest';
import {
  buildOutline,
  extractHeadings,
  findSectionIndex,
  subtreeContainsLine,
  type Heading,
} from './outline';

describe('extractHeadings', () => {
  it('returns an empty list for empty or heading-less documents', () => {
    expect(extractHeadings('')).toEqual([]);
    expect(extractHeadings('just a paragraph\n\n- a list')).toEqual([]);
  });

  it('extracts ATX headings with depth, text and 1-based line', () => {
    const md = '# Title\n\nintro\n\n## Section\n\n###### Deep';
    expect(extractHeadings(md)).toEqual([
      { depth: 1, text: 'Title', line: 1 },
      { depth: 2, text: 'Section', line: 5 },
      { depth: 6, text: 'Deep', line: 7 },
    ]);
  });

  it('extracts setext headings', () => {
    const md = 'Title\n=====\n\nSub\n---';
    expect(extractHeadings(md)).toEqual([
      { depth: 1, text: 'Title', line: 1 },
      { depth: 2, text: 'Sub', line: 4 },
    ]);
  });

  it('ignores # lines inside fenced and indented code blocks', () => {
    const md = '# Real\n\n```bash\n# not a heading\n```\n\n    # also code\n\n## Also real';
    expect(extractHeadings(md).map((h) => h.text)).toEqual(['Real', 'Also real']);
  });

  it('ignores # that is not a heading (no space, escaped, html)', () => {
    const md = '#hashtag\n\n\\# escaped\n\n<h2>raw html</h2>';
    expect(extractHeadings(md)).toEqual([]);
  });

  it('strips inline markup from heading text', () => {
    const md = '## **Bold** `code` [link](http://x) _em_ ~~del~~';
    expect(extractHeadings(md)[0].text).toBe('Bold code link em del');
  });

  it('strips trailing closing hashes', () => {
    expect(extractHeadings('## Closed ##')[0].text).toBe('Closed');
  });

  it('skips empty headings', () => {
    expect(extractHeadings('#\n\n## \n\n## ok')).toEqual([{ depth: 2, text: 'ok', line: 5 }]);
  });

  it('finds headings nested in blockquotes and list items', () => {
    const md = '> ## Quoted\n\n- ### In list';
    expect(extractHeadings(md)).toEqual([
      { depth: 2, text: 'Quoted', line: 1 },
      { depth: 3, text: 'In list', line: 3 },
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(extractHeadings('# A\r\n\r\n## B\r\n')).toEqual([
      { depth: 1, text: 'A', line: 1 },
      { depth: 2, text: 'B', line: 3 },
    ]);
  });
});

const h = (depth: number, text: string, line: number): Heading => ({ depth, text, line });

describe('buildOutline', () => {
  it('returns an empty tree for no headings', () => {
    expect(buildOutline([])).toEqual([]);
  });

  it('nests headings by depth', () => {
    const tree = buildOutline([
      h(1, 'A', 1),
      h(2, 'B', 3),
      h(3, 'C', 5),
      h(2, 'D', 7),
      h(1, 'E', 9),
    ]);
    expect(tree.map((n) => n.text)).toEqual(['A', 'E']);
    expect(tree[0].children.map((n) => n.text)).toEqual(['B', 'D']);
    expect(tree[0].children[0].children.map((n) => n.text)).toEqual(['C']);
  });

  it('nests skipped levels under the nearest shallower heading', () => {
    const tree = buildOutline([h(1, 'A', 1), h(4, 'Deep', 2), h(2, 'B', 3)]);
    expect(tree[0].children.map((n) => n.text)).toEqual(['Deep', 'B']);
  });

  it('keeps documents that start below H1 flat at the root', () => {
    const tree = buildOutline([h(3, 'x', 1), h(2, 'y', 2), h(3, 'z', 3)]);
    expect(tree.map((n) => n.text)).toEqual(['x', 'y']);
    expect(tree[1].children.map((n) => n.text)).toEqual(['z']);
  });

  it('gives duplicate heading texts distinct keys', () => {
    const tree = buildOutline([h(2, 'Same', 1), h(2, 'Same', 2)]);
    expect(tree[0].key).not.toBe(tree[1].key);
  });

  it('attributes comments to the section they start in and rolls totals up', () => {
    const headings = [h(1, 'A', 1), h(2, 'B', 5), h(3, 'C', 10), h(2, 'D', 20)];
    // line 0 (before any heading) is unattributed; line 1 is the heading line itself
    const tree = buildOutline(headings, [0, 1, 6, 11, 12, 25]);
    const [a] = tree;
    const [b, d] = a.children;
    const [c] = b.children;
    expect([a.ownComments, b.ownComments, c.ownComments, d.ownComments]).toEqual([1, 1, 2, 1]);
    expect(c.totalComments).toBe(2);
    expect(b.totalComments).toBe(3);
    expect(d.totalComments).toBe(1);
    expect(a.totalComments).toBe(5);
  });
});

describe('findSectionIndex', () => {
  const headings = [h(1, 'a', 3), h(2, 'b', 8)];

  it('returns -1 before the first heading or with no headings', () => {
    expect(findSectionIndex(headings, 1)).toBe(-1);
    expect(findSectionIndex([], 10)).toBe(-1);
  });

  it('returns the last heading at or before the line', () => {
    expect(findSectionIndex(headings, 3)).toBe(0);
    expect(findSectionIndex(headings, 7)).toBe(0);
    expect(findSectionIndex(headings, 8)).toBe(1);
    expect(findSectionIndex(headings, 999)).toBe(1);
  });
});

describe('subtreeContainsLine', () => {
  it('matches the node itself and any descendant heading line', () => {
    const [root] = buildOutline([h(1, 'A', 1), h(2, 'B', 3), h(3, 'C', 5), h(1, 'D', 7)]);
    expect(subtreeContainsLine(root, 1)).toBe(true);
    expect(subtreeContainsLine(root, 5)).toBe(true);
    expect(subtreeContainsLine(root, 7)).toBe(false);
    expect(subtreeContainsLine(root, 4)).toBe(false);
  });
});
