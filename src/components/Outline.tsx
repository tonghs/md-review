import { useMemo, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import type { Comment } from './CommentList';
import {
  buildOutline,
  extractHeadings,
  subtreeContainsLine,
  type OutlineNode,
} from '../lib/outline';
import '../styles/outline.css';

interface OutlineProps {
  /** Markdown source; null when no document is available */
  content: string | null;
  /** Shown in place of the tree when `content` is null */
  placeholder?: string;
  comments: Comment[];
  /** Source line of the heading currently being read */
  activeLine: number | null;
  onNavigate: (line: number) => void;
  /** Whether the whole panel is folded down to its header */
  collapsed?: boolean;
  /** Omit to render a fixed (non-foldable) header, e.g. when the outline is the only pane */
  onToggleCollapsed?: () => void;
  /** Extra controls on the right side of the header */
  headerActions?: ReactNode;
}

const Chevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`outline-chevron ${expanded ? 'expanded' : ''}`}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const collectParentKeys = (nodes: OutlineNode[], into: Set<string> = new Set()) => {
  for (const node of nodes) {
    if (node.children.length > 0) {
      into.add(node.key);
      collectParentKeys(node.children, into);
    }
  }
  return into;
};

interface OutlineItemProps {
  node: OutlineNode;
  level: number;
  activeLine: number | null;
  collapsedKeys: Set<string>;
  onToggle: (key: string) => void;
  onNavigate: (line: number) => void;
}

const OutlineItem = ({
  node,
  level,
  activeLine,
  collapsedKeys,
  onToggle,
  onNavigate,
}: OutlineItemProps) => {
  const hasChildren = node.children.length > 0;
  const expanded = hasChildren && !collapsedKeys.has(node.key);
  // A folded node stands in for its hidden descendants, so it carries their
  // active state and comment total.
  const isActive =
    activeLine !== null &&
    (node.line === activeLine ||
      (hasChildren && !expanded && subtreeContainsLine(node, activeLine)));
  const commentCount = expanded || !hasChildren ? node.ownComments : node.totalComments;

  return (
    <li role="none">
      <div
        className={`outline-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="outline-toggle"
            onClick={() => onToggle(node.key)}
            aria-label={expanded ? `Collapse ${node.text}` : `Expand ${node.text}`}
            aria-expanded={expanded}
          >
            <Chevron expanded={expanded} />
          </button>
        ) : (
          <span className="outline-toggle-spacer" />
        )}
        <button
          type="button"
          className={`outline-link depth-${node.depth}`}
          onClick={() => onNavigate(node.line)}
          title={node.text}
          aria-current={isActive ? 'location' : undefined}
        >
          <span className="outline-text">{node.text}</span>
          {commentCount > 0 && (
            <span
              className="outline-comment-count"
              title={`${commentCount} comment${commentCount === 1 ? '' : 's'}`}
            >
              {commentCount}
            </span>
          )}
        </button>
      </div>
      {expanded && (
        <ul role="group">
          {node.children.map((child) => (
            <OutlineItem
              key={child.key}
              node={child}
              level={level + 1}
              activeLine={activeLine}
              collapsedKeys={collapsedKeys}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const Outline = ({
  content,
  placeholder,
  comments,
  activeLine,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  headerActions,
}: OutlineProps) => {
  const headings = useMemo(() => (content === null ? [] : extractHeadings(content)), [content]);
  const commentLines = useMemo(() => comments.map((c) => c.startLine), [comments]);
  const tree = useMemo(() => buildOutline(headings, commentLines), [headings, commentLines]);
  const parentKeys = useMemo(() => collectParentKeys(tree), [tree]);

  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(() => new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const toggleNode = useCallback((key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const anyCollapsed = Array.from(collapsedKeys).some((k) => parentKeys.has(k));
  const toggleAll = () => setCollapsedKeys(anyCollapsed ? new Set() : new Set(parentKeys));

  // Keep the active entry visible inside the outline's own scroller. Adjust
  // scrollTop directly: scrollIntoView would cancel an in-flight smooth scroll
  // of the document.
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>('.outline-item.active');
    if (!list || !item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      list.scrollTop -= listRect.top - itemRect.top + 8;
    } else if (itemRect.bottom > listRect.bottom) {
      list.scrollTop += itemRect.bottom - listRect.bottom + 8;
    }
  }, [activeLine, collapsedKeys, collapsed]);

  const titleContent = (
    <>
      <span className="outline-title">Outline</span>
      {headings.length > 0 && <span className="outline-count">{headings.length}</span>}
    </>
  );

  return (
    <section className={`outline-panel ${collapsed ? 'collapsed' : ''}`} aria-label="Outline">
      <div className="outline-header">
        {onToggleCollapsed ? (
          <button
            type="button"
            className="outline-header-toggle"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
          >
            <Chevron expanded={!collapsed} />
            {titleContent}
          </button>
        ) : (
          <div className="outline-header-toggle static">{titleContent}</div>
        )}
        {!collapsed && parentKeys.size > 0 && (
          <button
            type="button"
            className="outline-header-action"
            onClick={toggleAll}
            title={anyCollapsed ? 'Expand all' : 'Collapse all'}
            aria-label={anyCollapsed ? 'Expand all' : 'Collapse all'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              {anyCollapsed ? (
                <path
                  d="M4 6l4 4 4-4M4 2l4 4 4-4"
                  transform="translate(0 2)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M4 10l4-4 4 4M4 14l4-4 4 4"
                  transform="translate(0 -2)"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        )}
        {headerActions && <div className="outline-header-actions">{headerActions}</div>}
      </div>
      {!collapsed && (
        <div className="outline-body" ref={listRef}>
          {content === null ? (
            placeholder && <p className="outline-empty">{placeholder}</p>
          ) : tree.length === 0 ? (
            <p className="outline-empty">No headings in this document</p>
          ) : (
            <ul className="outline-tree" role="tree">
              {tree.map((node) => (
                <OutlineItem
                  key={node.key}
                  node={node}
                  level={0}
                  activeLine={activeLine}
                  collapsedKeys={collapsedKeys}
                  onToggle={toggleNode}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
