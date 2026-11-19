import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';

export interface Heading {
  /** Heading level, 1–6 */
  depth: number;
  /** Plain text of the heading (inline markup stripped) */
  text: string;
  /** 1-based source line; matches the `data-line-start` attribute in the preview */
  line: number;
}

export interface OutlineNode extends Heading {
  /** Stable identity for UI state (collapse), derived from the ancestor path */
  key: string;
  children: OutlineNode[];
  /** Comments that start in this heading's own section (up to the next heading of any level) */
  ownComments: number;
  /** ownComments plus all descendants' comments */
  totalComments: number;
}

interface MdNode {
  type: string;
  depth?: number;
  position?: { start: { line: number } };
  children?: MdNode[];
}

// Parse with the same remark plugins the preview uses for block structure,
// so heading line numbers line up with the rendered `data-line-start` attributes.
const parser = unified().use(remarkParse).use(remarkGfm);

/**
 * Extracts all headings (ATX and setext, including ones nested in lists or
 * blockquotes) in document order. Empty headings are skipped because they
 * cannot be navigated meaningfully.
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];

  const walk = (node: MdNode) => {
    if (node.type === 'heading' && node.depth && node.position) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = toString(node as any, { includeHtml: false })
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        headings.push({ depth: node.depth, text, line: node.position.start.line });
      }
      return;
    }
    node.children?.forEach(walk);
  };

  walk(parser.parse(markdown) as MdNode);
  return headings;
}

/**
 * Builds a nested outline from flat headings. Skipped levels (e.g. H1 → H3)
 * nest under the nearest shallower heading. Each comment is counted toward the
 * last heading at or before its start line; comments before the first heading
 * are not attributed to any node.
 */
export function buildOutline(headings: Heading[], commentStartLines: number[] = []): OutlineNode[] {
  const ownCounts = new Array<number>(headings.length).fill(0);
  for (const line of commentStartLines) {
    const index = findSectionIndex(headings, line);
    if (index >= 0) ownCounts[index]++;
  }

  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  headings.forEach((heading, index) => {
    while (stack.length > 0 && stack[stack.length - 1].depth >= heading.depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    const siblings = parent ? parent.children : roots;
    const node: OutlineNode = {
      ...heading,
      key: `${parent ? parent.key : ''}/${siblings.length}:${heading.text}`,
      children: [],
      ownComments: ownCounts[index],
      totalComments: 0,
    };
    siblings.push(node);
    stack.push(node);
  });

  const sumTotals = (node: OutlineNode): number => {
    node.totalComments = node.ownComments + node.children.reduce((s, c) => s + sumTotals(c), 0);
    return node.totalComments;
  };
  roots.forEach(sumTotals);

  return roots;
}

/** Index of the last heading whose line is <= `line`, or -1. Headings must be sorted by line. */
export function findSectionIndex(headings: Heading[], line: number): number {
  let lo = 0;
  let hi = headings.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (headings[mid].line <= line) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** True if `line` is this node's heading line or one of its descendants' heading lines. */
export function subtreeContainsLine(node: OutlineNode, line: number): boolean {
  return node.line === line || node.children.some((c) => subtreeContainsLine(c, line));
}

export const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
