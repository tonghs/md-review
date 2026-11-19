import { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { SidebarCollapseButton } from './SidebarLayout';
import '../styles/filetree.css';

interface FileInfo {
  name: string;
  path: string;
  dir: string;
}

interface FileTreeProps {
  files: FileInfo[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  onToggleSidebar?: () => void;
  autoFocusSearch?: boolean;
  /** Fold the pane down to its header (when stacked above the outline) */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

interface TreeNode {
  name: string;
  path?: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildTree(files: FileInfo[]): TreeNode {
  const root: TreeNode = {
    name: 'root',
    children: new Map(),
    isFile: false,
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLastPart = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: isLastPart ? file.path : undefined,
          children: new Map(),
          isFile: isLastPart,
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

function TreeNodeComponent({
  node,
  selectedFile,
  onFileSelect,
  level = 0,
}: {
  node: TreeNode;
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0 || level === 1);

  if (node.isFile) {
    return (
      <div
        className={`tree-item file ${selectedFile === node.path ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => node.path && onFileSelect(node.path)}
      >
        <span className="file-icon">📄</span>
        <span className="file-name">{node.name}</span>
      </div>
    );
  }

  const sortedChildren = Array.from(node.children.entries()).sort((a, b) => {
    // Directories first, then files
    if (!a[1].isFile && b[1].isFile) return -1;
    if (a[1].isFile && !b[1].isFile) return 1;
    return a[0].localeCompare(b[0]);
  });

  if (node.name === 'root') {
    return (
      <>
        {sortedChildren.map(([, child]) => (
          <TreeNodeComponent
            key={child.path || child.name}
            node={child}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            level={0}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <div
        className="tree-item directory"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg
          className="chevron-icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="folder-icon">📁</span>
        <span className="folder-name">{node.name}</span>
      </div>
      {isExpanded && (
        <div className="tree-children">
          {sortedChildren.map(([, child]) => (
            <TreeNodeComponent
              key={child.path || child.name}
              node={child}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const FileTree = ({
  files,
  selectedFile,
  onFileSelect,
  onToggleSidebar,
  autoFocusSearch,
  collapsed = false,
  onToggleCollapsed,
}: FileTreeProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Focus requested while folded: expand first, then focus once the input exists.
  const pendingFocusRef = useRef(false);
  const latestRef = useRef({ collapsed, onToggleCollapsed });
  useEffect(() => {
    latestRef.current = { collapsed, onToggleCollapsed };
  }, [collapsed, onToggleCollapsed]);

  const focusSearch = useCallback(() => {
    const { collapsed: isCollapsed, onToggleCollapsed: expand } = latestRef.current;
    if (isCollapsed && expand) {
      pendingFocusRef.current = true;
      expand();
    } else {
      searchInputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!collapsed && pendingFocusRef.current) {
      pendingFocusRef.current = false;
      searchInputRef.current?.focus();
    }
  }, [collapsed]);

  // Filter files based on search query
  const filteredFiles = searchQuery
    ? files.filter(
        (file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.path.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : files;

  const tree = buildTree(filteredFiles);

  // Auto focus search input when requested
  useEffect(() => {
    if (autoFocusSearch) {
      focusSearch();
    }
  }, [autoFocusSearch, focusSearch]);

  // Keyboard shortcut: Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        focusSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusSearch]);

  return (
    <div className={`file-tree ${collapsed ? 'collapsed' : ''}`}>
      <div className="file-tree-header">
        {onToggleCollapsed ? (
          <button
            type="button"
            className="file-tree-header-content file-tree-fold-toggle"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
          >
            <svg
              className={`fold-chevron ${collapsed ? '' : 'expanded'}`}
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
            <span>
              <h3>Files</h3>
              <span className="file-count">
                {filteredFiles.length} of {files.length} files
              </span>
            </span>
          </button>
        ) : (
          <div className="file-tree-header-content">
            <h3>Files</h3>
            <span className="file-count">
              {filteredFiles.length} of {files.length} files
            </span>
          </div>
        )}
        <div className="file-tree-header-actions">
          <ThemeToggle />
          {onToggleSidebar && <SidebarCollapseButton onClick={onToggleSidebar} />}
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Jump to..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className="search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
              <kbd className="search-shortcut">⌘K</kbd>
            </div>
          </div>
          <div className="file-tree-content">
            <TreeNodeComponent
              node={tree}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
            />
          </div>
        </>
      )}
    </div>
  );
};
