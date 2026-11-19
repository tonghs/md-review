import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Outline } from './Outline';
import type { Comment } from './CommentList';

const md = ['# Guide', '', '## Install', '', 'text', '', '### macOS', '', '## Usage', ''].join(
  '\n',
);
// Lines:    1          3              5         7               9

const comment = (startLine: number): Comment => ({
  id: String(startLine) + Math.random(),
  text: 't',
  selectedText: 's',
  startLine,
  endLine: startLine,
  createdAt: new Date(),
});

const renderOutline = (props: Partial<Parameters<typeof Outline>[0]> = {}) =>
  render(<Outline content={md} comments={[]} activeLine={null} onNavigate={vi.fn()} {...props} />);

describe('Outline', () => {
  it('renders the heading hierarchy and the heading count', () => {
    renderOutline();
    expect(screen.getByRole('button', { name: 'Guide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'macOS' })).toBeInTheDocument();
    expect(screen.getByText('4')).toHaveClass('outline-count');
  });

  it('calls onNavigate with the heading source line', async () => {
    const onNavigate = vi.fn();
    renderOutline({ onNavigate });
    await userEvent.click(screen.getByRole('button', { name: 'macOS' }));
    expect(onNavigate).toHaveBeenCalledWith(7);
  });

  it('marks the active heading', () => {
    renderOutline({ activeLine: 3 });
    expect(screen.getByRole('button', { name: 'Install' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(screen.getByRole('button', { name: 'Usage' })).not.toHaveAttribute('aria-current');
  });

  it('collapses and expands a node with children', async () => {
    renderOutline();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Install' }));
    expect(screen.queryByRole('button', { name: 'macOS' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand Install' }));
    expect(screen.getByRole('button', { name: 'macOS' })).toBeInTheDocument();
  });

  it('marks a folded parent active when the active heading is hidden inside it', async () => {
    renderOutline({ activeLine: 7 });
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Install' }));
    expect(screen.getByRole('button', { name: 'Install' })).toHaveAttribute(
      'aria-current',
      'location',
    );
  });

  it('toggles all nodes with collapse all / expand all', async () => {
    renderOutline();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(screen.getByRole('button', { name: 'macOS' })).toBeInTheDocument();
  });

  it('shows own comment counts and rolls them up when folded', async () => {
    renderOutline({ comments: [comment(5), comment(8), comment(8)] });
    const install = screen.getByRole('button', { name: /^Install/ });
    expect(within(install).getByText('1')).toHaveAttribute('title', '1 comment');
    const macos = screen.getByRole('button', { name: /^macOS/ });
    expect(within(macos).getByText('2')).toHaveAttribute('title', '2 comments');

    await userEvent.click(screen.getByRole('button', { name: 'Collapse Install' }));
    expect(within(screen.getByRole('button', { name: /^Install/ })).getByText('3')).toBeVisible();
  });

  it('does not show a badge for sections without comments', () => {
    renderOutline({ comments: [comment(9)] });
    const usage = screen.getByRole('button', { name: /^Usage/ });
    expect(within(usage).getByText('1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Install' }).querySelector('.outline-comment-count'),
    ).toBeNull();
  });

  it('shows an empty state for a document without headings', () => {
    renderOutline({ content: 'plain text only' });
    expect(screen.getByText('No headings in this document')).toBeInTheDocument();
  });

  it('shows the placeholder when there is no content', () => {
    renderOutline({ content: null, placeholder: 'Select a file to see its outline' });
    expect(screen.getByText('Select a file to see its outline')).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('folds the whole panel via the header when foldable', async () => {
    const onToggleCollapsed = vi.fn();
    const { rerender } = renderOutline({ onToggleCollapsed });
    const header = screen.getByRole('button', { name: /Outline/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(header);
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);

    rerender(
      <Outline
        content={md}
        comments={[]}
        activeLine={null}
        onNavigate={vi.fn()}
        collapsed
        onToggleCollapsed={onToggleCollapsed}
      />,
    );
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Collapse all' })).not.toBeInTheDocument();
  });

  it('renders a static header and extra actions when not foldable', () => {
    renderOutline({ headerActions: <button>extra</button> });
    expect(screen.queryByRole('button', { name: /^Outline/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'extra' })).toBeInTheDocument();
  });

  it('updates when the content changes (hot reload)', () => {
    const { rerender } = renderOutline();
    rerender(
      <Outline content={'# New title'} comments={[]} activeLine={null} onNavigate={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'New title' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guide' })).not.toBeInTheDocument();
  });

  it('ignores frontmatter and MDX import/export lines, keeping source line numbers', async () => {
    const onNavigate = vi.fn();
    const mdx = ['---', 'title: Doc', '---', '', 'import A from "./a"', '', '# Real', ''].join(
      '\n',
    );
    render(
      <Outline
        content={mdx}
        filename="doc.mdx"
        comments={[]}
        activeLine={null}
        onNavigate={onNavigate}
      />,
    );
    const links = screen.getAllByRole('button').filter((b) => b.classList.contains('outline-link'));
    expect(links.map((b) => b.textContent)).toEqual(['Real']);
    await userEvent.click(links[0]);
    expect(onNavigate).toHaveBeenCalledWith(7);
  });
});
