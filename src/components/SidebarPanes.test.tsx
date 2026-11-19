import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { SidebarPanes } from './SidebarPanes';

function pane(name: string) {
  return function renderPane(collapsed: boolean, toggle: () => void) {
    return (
      <div>
        <button onClick={toggle}>{`toggle ${name}`}</button>
        {!collapsed && <span>{`${name} body`}</span>}
      </div>
    );
  };
}

describe('SidebarPanes', () => {
  it('shows both panes with a draggable divider by default', () => {
    render(<SidebarPanes renderFiles={pane('files')} renderOutline={pane('outline')} />);
    expect(screen.getByText('files body')).toBeInTheDocument();
    expect(screen.getByText('outline body')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('folds a pane, hides the divider, and persists the fold state', async () => {
    const { unmount } = render(
      <SidebarPanes renderFiles={pane('files')} renderOutline={pane('outline')} />,
    );
    await userEvent.click(screen.getByText('toggle files'));
    expect(screen.queryByText('files body')).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    unmount();

    render(<SidebarPanes renderFiles={pane('files')} renderOutline={pane('outline')} />);
    expect(screen.queryByText('files body')).not.toBeInTheDocument();
    expect(screen.getByText('outline body')).toBeInTheDocument();
  });

  it('renders only the outline, always open, without a files pane', () => {
    render(<SidebarPanes renderOutline={pane('outline')} />);
    expect(screen.getByText('outline body')).toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('tolerates partial stored fold state', () => {
    localStorage.setItem('md-review-sidebar-panes', JSON.stringify({ outline: true }));
    render(<SidebarPanes renderFiles={pane('files')} renderOutline={pane('outline')} />);
    expect(screen.getByText('files body')).toBeInTheDocument();
    expect(screen.queryByText('outline body')).not.toBeInTheDocument();
  });
});
