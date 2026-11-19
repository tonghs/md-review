import { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSplitPane } from '../hooks/useSplitPane';

interface PaneFoldState {
  files: boolean;
  outline: boolean;
}

type RenderPane = (collapsed: boolean, onToggleCollapsed: () => void) => ReactNode;

interface SidebarPanesProps {
  /** Top pane (file tree). When omitted, the outline fills the sidebar. */
  renderFiles?: RenderPane;
  renderOutline: RenderPane;
}

const DEFAULT_FOLD: PaneFoldState = { files: false, outline: false };

/**
 * Stacks the file tree above the outline, VS Code explorer style. Each pane
 * can fold to its header; when both are open the divider between them can be
 * dragged. Fold state and split ratio persist in localStorage.
 */
export const SidebarPanes = ({ renderFiles, renderOutline }: SidebarPanesProps) => {
  const [storedFold, setFold] = useLocalStorage<PaneFoldState>(
    'md-review-sidebar-panes',
    DEFAULT_FOLD,
  );
  const fold = { ...DEFAULT_FOLD, ...storedFold };
  const { ratio, isDragging, containerRef, handleMouseDown } = useSplitPane({
    initialRatio: 0.5,
    minRatio: 0.15,
    maxRatio: 0.85,
    storageKey: 'md-review-sidebar-split',
  });

  const toggle = (pane: keyof PaneFoldState) =>
    setFold((prev) => ({ ...prev, [pane]: !prev[pane] }));

  if (!renderFiles) {
    return <div className="sidebar-panes">{renderOutline(false, () => {})}</div>;
  }

  const bothOpen = !fold.files && !fold.outline;
  // An open pane takes the remaining space; a folded pane shrinks to its header.
  const filesStyle = bothOpen
    ? { flex: `0 0 ${(ratio * 100).toFixed(2)}%` }
    : { flex: fold.files ? '0 0 auto' : '1 1 0' };
  const outlineStyle = { flex: fold.outline ? '0 0 auto' : '1 1 0' };

  return (
    <div className={`sidebar-panes ${isDragging ? 'splitting' : ''}`} ref={containerRef}>
      <div className="sidebar-pane" style={filesStyle}>
        {renderFiles(fold.files, () => toggle('files'))}
      </div>
      {bothOpen ? (
        <div
          className="sidebar-pane-divider"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize files and outline"
        />
      ) : (
        <div className="sidebar-pane-border" />
      )}
      <div className="sidebar-pane" style={outlineStyle}>
        {renderOutline(fold.outline, () => toggle('outline'))}
      </div>
    </div>
  );
};
