'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui';
import { User } from '@/types/models';
import { useDeleteUser } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';

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
  const { t } = useTranslation();
  const [error, setError] = useState<string>('');
  const deleteUserMutation = useDeleteUser();

  const handleDelete = async () => {
    if (!user) return;

    try {
      setError('');
      const name = user.full_name;
      await deleteUserMutation.mutateAsync(user.id);
      toast.success(`Pengguna "${name}" berhasil dihapus.`);
      onSuccess();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
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
      confirmLabel={t('admin:shared.delete')}
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
