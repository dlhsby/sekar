import { render, screen, fireEvent } from '@testing-library/react';
import { NBModal, NBModalHeader, NBModalContent, NBModalFooter } from '../NBModal';

describe('NBModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <NBModal isOpen={false} onClose={jest.fn()}>
        Modal Content
      </NBModal>
    );
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <NBModal isOpen={true} onClose={jest.fn()}>
        Modal Content
      </NBModal>
    );
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <NBModal isOpen={true} onClose={jest.fn()} title="Edit User">
        Content
      </NBModal>
    );
    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  it('renders close button by default', () => {
    render(
      <NBModal isOpen={true} onClose={jest.fn()} title="Modal">
        Content
      </NBModal>
    );
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <NBModal isOpen={true} onClose={jest.fn()} showCloseButton={false}>
        Content
      </NBModal>
    );
    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = jest.fn();
    render(
      <NBModal isOpen={true} onClose={handleClose} title="Modal">
        Content
      </NBModal>
    );
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const handleClose = jest.fn();
    render(
      <NBModal isOpen={true} onClose={handleClose} closeOnBackdrop={true}>
        Content
      </NBModal>
    );
    const backdrop = screen.getByText('Content').parentElement?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  it('does not close on backdrop click when closeOnBackdrop is false', () => {
    const handleClose = jest.fn();
    render(
      <NBModal isOpen={true} onClose={handleClose} closeOnBackdrop={false}>
        Content
      </NBModal>
    );
    const backdrop = screen.getByText('Content').parentElement?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).not.toHaveBeenCalled();
    }
  });

  it('renders all sizes', () => {
    const sizes = ['sm', 'md', 'lg', 'xl'] as const;
    sizes.forEach((size) => {
      const { unmount } = render(
        <NBModal isOpen={true} onClose={jest.fn()} size={size}>
          {size}
        </NBModal>
      );
      expect(screen.getByText(size)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders modal sections', () => {
    render(
      <NBModal isOpen={true} onClose={jest.fn()}>
        <NBModalHeader>Header</NBModalHeader>
        <NBModalContent>Content</NBModalContent>
        <NBModalFooter>Footer</NBModalFooter>
      </NBModal>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(
      <NBModal isOpen={true} onClose={jest.fn()} title="Test Modal">
        Content
      </NBModal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });
});
