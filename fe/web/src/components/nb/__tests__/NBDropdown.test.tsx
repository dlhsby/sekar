import { render, screen, fireEvent } from '@testing-library/react';
import { NBDropdown } from '../NBDropdown';

const mockItems = [
  { id: 'edit', label: 'Edit', onClick: jest.fn() },
  { id: 'duplicate', label: 'Duplicate', onClick: jest.fn() },
  { id: 'delete', label: 'Delete', onClick: jest.fn(), danger: true },
  { id: 'disabled', label: 'Disabled', onClick: jest.fn(), disabled: true },
];

describe('NBDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger element', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('does not show dropdown initially', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('opens dropdown on trigger click', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClick handler when item clicked', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Edit'));
    expect(mockItems[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown after item clicked', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('applies danger styling to danger items', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    fireEvent.click(screen.getByText('Actions'));
    const deleteButton = screen.getByText('Delete');
    expect(deleteButton).toHaveClass('text-nb-danger');
  });

  it('disables disabled items', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    fireEvent.click(screen.getByText('Actions'));
    const disabledButton = screen.getByText('Disabled');
    expect(disabledButton).toBeDisabled();
  });

  it('does not call onClick for disabled items', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByText('Disabled'));
    expect(mockItems[3].onClick).not.toHaveBeenCalled();
  });

  it('renders icons in items', () => {
    const itemsWithIcon = [
      {
        id: 'edit',
        label: 'Edit',
        icon: <span data-testid="edit-icon">✏️</span>,
        onClick: jest.fn(),
      },
    ];
    render(
      <NBDropdown trigger={<button>Actions</button>} items={itemsWithIcon} />
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  it('closes on escape key', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    const trigger = screen.getByText('Actions');
    fireEvent.click(trigger);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation with arrow keys', () => {
    render(
      <NBDropdown trigger={<button>Actions</button>} items={mockItems} />
    );
    const trigger = screen.getByText('Actions');
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    // First non-disabled item should be focused
  });

  it('renders in different positions', () => {
    const positions = ['bottom-left', 'bottom-right', 'top-left', 'top-right'] as const;
    positions.forEach((position) => {
      const { unmount } = render(
        <NBDropdown
          trigger={<button>Actions</button>}
          items={mockItems}
          position={position}
        />
      );
      fireEvent.click(screen.getByText('Actions'));
      expect(screen.getByText('Edit')).toBeInTheDocument();
      unmount();
    });
  });
});
