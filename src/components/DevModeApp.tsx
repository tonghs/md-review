import { useState } from 'react';
import { useFileList } from '../hooks/useFileList';
import { useMarkdown } from '../hooks/useMarkdown';
import { useFileWatch } from '../hooks/useFileWatch';
import { useReviewFile } from '../hooks/useReviewFile';
import { useOutlineNavigation } from '../hooks/useOutlineNavigation';
import { FileTree } from './FileTree';
import { MarkdownPreview } from './MarkdownPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { Outline } from './Outline';
import { SidebarPanes } from './SidebarPanes';
import { SidebarLayout, FolderIcon, SearchIcon } from './SidebarLayout';

export const DevModeApp = () => {
  const {
    files,
    selectedFile,
    setSelectedFile,
    loading: filesLoading,
    error: filesError,
  } = useFileList();
  const [focusSearch, setFocusSearch] = useState<boolean>(false);
  const { comments, setComments, saving, saveNow } = useReviewFile({
    filePath: selectedFile,
  });
  const {
    content,
    filename,
    loading: markdownLoading,
    error: markdownError,
    reload,
  } = useMarkdown(selectedFile);

  // Watch for file changes and reload current file
  useFileWatch((changedPath) => {
    if (selectedFile === changedPath) {
      reload();
    }
  });

  const showPreview = Boolean(
    selectedFile && !markdownLoading && !markdownError && content && filename,
  );
  const { previewRef, activeLine, navigateToHeading } = useOutlineNavigation(
    showPreview ? content : null,
  );

  const handleSearchClick = (open: () => void) => {
    open();
    setFocusSearch(true);
    setTimeout(() => setFocusSearch(false), 100);
  };

  if (filesLoading) {
    return (
      <div className="dev-loading">
        <p>Loading files...</p>
      </div>
    );
  }

  if (filesError) {
    return <ErrorDisplay error={filesError} />;
  }

  if (files.length === 0) {
    return (
      <div className="dev-empty">
        <h2>No Markdown Files Found</h2>
        <p>No .md files were found in the current directory.</p>
      </div>
    );
  }

  const outlinePlaceholder = !selectedFile
    ? 'Select a file to see its outline'
    : markdownLoading
      ? 'Loading…'
      : 'Outline unavailable';

  return (
    <SidebarLayout
      openIcon={<FolderIcon />}
      openTitle="Open sidebar"
      renderIconBarExtras={(open) => (
        <button
          type="button"
          className="icon-bar-item"
          onClick={() => handleSearchClick(open)}
          title="Search"
          aria-label="Search"
        >
          <SearchIcon />
        </button>
      )}
      renderSidebar={(close) => (
        <SidebarPanes
          renderFiles={(collapsed, onToggleCollapsed) => (
            <FileTree
              files={files}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              onToggleSidebar={close}
              autoFocusSearch={focusSearch}
              collapsed={collapsed}
              onToggleCollapsed={onToggleCollapsed}
            />
          )}
          renderOutline={(collapsed, onToggleCollapsed) => (
            <Outline
              content={showPreview ? content : null}
              placeholder={outlinePlaceholder}
              comments={comments}
              activeLine={activeLine}
              onNavigate={navigateToHeading}
              collapsed={collapsed}
              onToggleCollapsed={onToggleCollapsed}
            />
          )}
        />
      )}
    >
      {!selectedFile ? (
        <div className="dev-placeholder">
          <h2>Welcome to md-review</h2>
          <p>Select a markdown file from the sidebar to preview</p>
          <p className="file-count">{files.length} markdown files found</p>
        </div>
      ) : markdownLoading ? (
        <div className="dev-loading">
          <p>Loading markdown...</p>
        </div>
      ) : markdownError ? (
        <ErrorDisplay error={markdownError} />
      ) : content && filename ? (
        <MarkdownPreview
          content={content}
          filename={filename}
          filePath={selectedFile || filename}
          comments={comments}
          onCommentsChange={setComments}
          saving={saving}
          onSaveNow={saveNow}
          contentRef={previewRef}
        />
      ) : (
        <div className="dev-placeholder">
          <p>No content available</p>
        </div>
      )}
    </SidebarLayout>
  );
};
