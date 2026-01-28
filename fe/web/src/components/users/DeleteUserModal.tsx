'use client';

import { useState } from 'react';
import { NBModal } from '@/components/nb/NBModal';
import { NBButton } from '@/components/nb/NBButton';
import { User } from '@/types/models';
import { useDeleteUser } from '@/lib/api/users';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Delete User Confirmation Modal
 *
 * Features:
 * - Confirmation dialog before deletion
 * - Loading state during deletion
 * - Error handling
 * - Success callback
 *
 * @example
 * ```tsx
 * const [userToDelete, setUserToDelete] = useState<User | null>(null);
 *
 * <DeleteUserModal
 *   user={userToDelete}
 *   isOpen={!!userToDelete}
 *   onClose={() => setUserToDelete(null)}
 *   onSuccess={() => {
 *     toast.success('User berhasil dihapus');
 *     setUserToDelete(null);
 *   }}
 * />
 * ```
 */
export function DeleteUserModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: DeleteUserModalProps) {
  const [error, setError] = useState<string>('');
  const deleteUserMutation = useDeleteUser();

  const handleDelete = async () => {
    if (!user) return;

    try {
      setError('');
      await deleteUserMutation.mutateAsync(user.id);
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus user';
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    if (!deleteUserMutation.isPending) {
      setError('');
      onClose();
    }
  };

  return (
    <NBModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Hapus User"
      size="sm"
    >
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-nb-danger/10 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-nb-danger" />
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <p className="text-sm text-nb-gray-700">
            Apakah Anda yakin ingin menghapus user{' '}
            <span className="font-bold">{user?.name}</span>?
          </p>
          <p className="text-sm text-nb-gray-600 mt-2">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
            <p className="text-sm text-nb-danger font-medium">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <NBButton
            variant="secondary"
            onClick={handleClose}
            disabled={deleteUserMutation.isPending}
            className="flex-1"
          >
            Batal
          </NBButton>
          <NBButton
            variant="danger"
            onClick={handleDelete}
            loading={deleteUserMutation.isPending}
            disabled={deleteUserMutation.isPending}
            className="flex-1"
          >
            Hapus
          </NBButton>
        </div>
      </div>
    </NBModal>
  );
}
