import { ReactNode, useState, useCallback } from 'react';
import { useResizable } from '../hooks/useResizable';
import { ThemeToggle } from './ThemeToggle';
import '../styles/devmode.css';

const REPO_URL = 'https://github.com/ryo-manba/md-review';

const GitHubIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export const SidebarCollapseButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    className="sidebar-collapse-button"
    onClick={onClick}
    aria-label="Collapse sidebar"
    title="Collapse sidebar"
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M12 4L6 10L12 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

export const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M5 3h6l2 2h4a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h2z"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export const OutlineIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3 4.5h14M6 8.5h11M6 12.5h11M3 16.5h14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M13.5 13.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

interface SidebarLayoutProps {
  /** Icon and tooltip for the "open sidebar" button in the folded icon bar */
  openIcon: ReactNode;
  openTitle: string;
  /** Extra icon-bar buttons shown after the open button; `open` expands the sidebar */
  renderIconBarExtras?: (open: () => void) => ReactNode;
  /** Sidebar body; `close` folds the sidebar to the icon bar */
  renderSidebar: (close: () => void) => ReactNode;
  children: ReactNode;
}

/**
 * Full-height app shell: resizable left sidebar (foldable to an icon bar)
 * next to a scrollable main area. Shared by dev mode and CLI mode.
 */
export const SidebarLayout = ({
  openIcon,
  openTitle,
  renderIconBarExtras,
  renderSidebar,
  children,
}: SidebarLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { width, isResizing, isCollapsed, handleMouseDown, toggleCollapse } = useResizable({
    initialWidth: 240,
    minWidth: 180,
    maxWidth: 500,
    storageKey: 'md-review-sidebar-width',
    collapsible: true,
    collapseThreshold: 120,
  });

  const effectiveOpen = sidebarOpen && !isCollapsed;

  // Undo both ways the sidebar can be folded: the button and dragging it shut.
  const open = useCallback(() => {
    setSidebarOpen(true);
    if (isCollapsed) toggleCollapse();
  }, [isCollapsed, toggleCollapse]);
  const close = useCallback(() => setSidebarOpen(false), []);

  return (
    <div
      className={`dev-container ${!effectiveOpen ? 'sidebar-closed' : ''} ${isResizing ? 'resizing' : ''}`}
    >
      <div
        className={`dev-sidebar ${!effectiveOpen ? 'closed' : ''}`}
        style={effectiveOpen ? { width: `${width}px` } : undefined}
      >
        {effectiveOpen ? (
          <>
            <div className="sidebar-content">
              <div className="sidebar-body">{renderSidebar(close)}</div>
              <div className="sidebar-footer">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-link"
                  aria-label="View on GitHub"
                  title="View on GitHub"
                >
                  <GitHubIcon size={16} />
                </a>
              </div>
            </div>
            <div className="sidebar-resizer" onMouseDown={handleMouseDown} />
          </>
        ) : (
          <div className="sidebar-icon-bar">
            <button
              type="button"
              className="icon-bar-item"
              onClick={open}
              title={openTitle}
              aria-label={openTitle}
            >
              {openIcon}
            </button>
            {renderIconBarExtras?.(open)}
            <ThemeToggle />
            <div className="icon-bar-spacer" />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-bar-item"
              title="View on GitHub"
              aria-label="View on GitHub"
            >
              <GitHubIcon size={20} />
            </a>
          </div>
        )}
      </div>
      <div className="dev-main">{children}</div>
    </div>
  );
};
