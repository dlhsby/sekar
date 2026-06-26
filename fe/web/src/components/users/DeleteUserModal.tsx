'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui';
import { User } from '@/types/models';
import { useDeleteUser } from '@/lib/api/users';

interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Delete User Confirmation Modal
 */
export function DeleteUserModal({ user, isOpen, onClose, onSuccess }: DeleteUserModalProps) {
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

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setError('');
          onClose();
        }
      }}
      title="Hapus User"
      description={
        <>
          Apakah Anda yakin ingin menghapus user{' '}
          <span className="font-bold">{user?.full_name}</span>? Tindakan ini tidak dapat dibatalkan.
        </>
      }
      confirmLabel="Hapus"
      variant="destructive"
      loading={deleteUserMutation.isPending}
      onConfirm={handleDelete}
    >
      {error && (
        <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
          <p className="text-sm text-nb-danger font-medium">{error}</p>
        </div>
      )}
    </ConfirmDialog>
  );
}
