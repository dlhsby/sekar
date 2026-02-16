/**
 * Unit Tests: DeleteUserModal
 * Tests user deletion confirmation modal
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteUserModal } from '../DeleteUserModal';
import { useDeleteUser } from '@/lib/api/users';
import type { User } from '@/types/models';

// Mock the API hook
jest.mock('@/lib/api/users', () => ({
  useDeleteUser: jest.fn(),
}));

describe('DeleteUserModal', () => {
  const mockUser: User = {
    id: '1',
    username: 'testuser',
    full_name: 'Test User',
    role: 'satgas',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDeleteUser as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it.skip('should render modal when open', () => {
    render(
      <DeleteUserModal
        user={mockUser}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Hapus User')).toBeInTheDocument();
    expect(screen.getByText(/testuser/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <DeleteUserModal
        user={mockUser}
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText('Hapus User')).not.toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', async () => {
    const user = userEvent.setup();

    render(
      <DeleteUserModal
        user={mockUser}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /batal/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should delete user and call onSuccess when confirmed', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue(undefined);

    render(
      <DeleteUserModal
        user={mockUser}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /hapus/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('1');
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should display error message when deletion fails', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error('Delete failed'));

    render(
      <DeleteUserModal
        user={mockUser}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /hapus/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/delete failed/i)).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should disable close when deletion is pending', () => {
    (useDeleteUser as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });

    render(
      <DeleteUserModal
        user={mockUser}
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /hapus/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should handle null user gracefully', () => {
    render(
      <DeleteUserModal user={null} isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );

    expect(screen.getByText('Hapus User')).toBeInTheDocument();
  });
});
