export interface ParsedContent {
  frontmatter: Record<string, string>;
  /**
   * Markdown to render. Removed parts (frontmatter, MDX import/export lines)
   * are replaced with blank lines, so every line keeps its source line number.
   * Comments, `data-line-start` and the outline all rely on source line numbers.
   */
  body: string;
}

function parseFrontmatter(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

/** Same number of line breaks as `text`, with no content. */
const blankLines = (text: string) => '\n'.repeat((text.match(/\n/g) ?? []).length);

export function parseMdContent(content: string, filename: string): ParsedContent {
  const isMdx = filename.endsWith('.mdx');
  let body = content;
  let frontmatter: Record<string, string> = {};

  // Extract frontmatter
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    frontmatter = parseFrontmatter(fmMatch[1]);
    body = blankLines(fmMatch[0]) + content.slice(fmMatch[0].length);
  }

  // Blank out import/export lines for MDX
  if (isMdx) {
    body = body
      .split('\n')
      .map((line) => (/^(import|export)\s/.test(line) ? '' : line))
      .join('\n');
  }

  return { frontmatter, body };
}
