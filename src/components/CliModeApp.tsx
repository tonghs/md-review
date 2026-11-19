import { useMarkdown } from '../hooks/useMarkdown';
import { useFileWatch } from '../hooks/useFileWatch';
import { useReviewFile } from '../hooks/useReviewFile';
import { useOutlineNavigation } from '../hooks/useOutlineNavigation';
import { MarkdownPreview } from './MarkdownPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { Outline } from './Outline';
import { SidebarPanes } from './SidebarPanes';
import { SidebarLayout, SidebarCollapseButton, OutlineIcon } from './SidebarLayout';
import { ThemeToggle } from './ThemeToggle';

export const CliModeApp = () => {
  const { content, filename, loading, error, reload } = useMarkdown();
  const { comments, setComments, saving, saveNow } = useReviewFile({});
  const ready = Boolean(!loading && !error && content && filename);
  const { previewRef, activeLine, navigateToHeading } = useOutlineNavigation(
    ready ? content : null,
  );

  // Watch for file changes and reload
  useFileWatch(() => {
    reload();
  });

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  if (!content || !filename) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No content available</p>
      </div>
    );
  }

  return (
    <SidebarLayout
      openIcon={<OutlineIcon />}
      openTitle="Open outline"
      renderSidebar={(close) => (
        <SidebarPanes
          renderOutline={() => (
            <Outline
              content={content}
              filename={filename}
              comments={comments}
              activeLine={activeLine}
              onNavigate={navigateToHeading}
              headerActions={
                <>
                  <ThemeToggle />
                  <SidebarCollapseButton onClick={close} />
                </>
              }
            />
          )}
        />
      )}
    >
      <MarkdownPreview
        content={content}
        filename={filename}
        comments={comments}
        onCommentsChange={setComments}
        saving={saving}
        onSaveNow={saveNow}
        contentRef={previewRef}
      />
    </SidebarLayout>
  );
};
