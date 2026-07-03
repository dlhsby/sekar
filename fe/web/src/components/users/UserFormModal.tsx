'use client';

import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { UserForm } from '@/components/forms/UserForm';
import { useCreateUser, useUpdateUser } from '@/lib/api/users';
import { getErrorMessage } from '@/lib/api/client';
import type { CreateUserDto, UpdateUserDto, User, CreatedUser } from '@/types/models';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit that user; omitted/null → create a new user. */
  user?: User | null;
  /** Called after a successful create/update (the list refetches via cache invalidation). */
  onSuccess?: () => void;
  /** Called after a successful CREATE with the new user — carries the one-time
   *  `temp_password` so the caller can show it (TempPasswordDialog). */
  onCreated?: (user: CreatedUser) => void;
  /** Read-only "Lihat" mode — shows the same form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit a user in a responsive modal (replaces the standalone
 * /users/new and /users/[id] form pages). Reuses the shared UserForm and
 * surfaces the mutation error inline.
 */
export function UserFormModal({
  open,
  onOpenChange,
  user,
  onSuccess,
  onCreated,
  readOnly = false,
}: UserFormModalProps) {
  const isEdit = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: CreateUserDto & UpdateUserDto): Promise<void> => {
    try {
      if (isEdit && user) {
        // username is immutable — UpdateUserDto rejects it (forbidNonWhitelisted).
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { username, ...updateData } = data;
        await updateMutation.mutateAsync({ id: user.id, data: updateData });
        toast.success(`Pengguna "${data.full_name}" berhasil diperbarui.`);
      } else {
        const created = (await createMutation.mutateAsync(data)) as CreatedUser;
        toast.success(`Pengguna "${created.full_name}" berhasil dibuat.`);
        onCreated?.(created);
      }
    } catch (err) {
      // Also surfaced via the inline error banner; keep the modal open.
      toast.error(getErrorMessage(err));
      return;
    }
    onSuccess?.();
    onOpenChange(false);
  };

  const errorMessage =
    mutation.isError &&
    (mutation.error instanceof Error
      ? mutation.error.message
      : `Gagal ${isEdit ? 'memperbarui' : 'membuat'} pengguna. Silakan coba lagi.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? 'Detail Pengguna' : isEdit ? 'Ubah Pengguna' : 'Tambah Pengguna'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {errorMessage && !readOnly ? (
            <div
              className="mb-4 border-2 border-nb-danger bg-nb-danger-light px-4 py-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-nb-body-sm font-medium text-nb-danger">{errorMessage}</p>
            </div>
          ) : null}
          {/* Remount the form per target so edit/create reset cleanly. */}
          <UserForm
            key={`${user?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            initialData={user ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            loading={mutation.isPending}
            submitText={isEdit ? 'Simpan' : 'Buat Pengguna'}
            readOnly={readOnly}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
