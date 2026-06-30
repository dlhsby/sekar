'use client';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { RayonForm } from '@/components/forms/RayonForm';
import { useCreateRayon, useUpdateRayon, type CreateRayonDto, type UpdateRayonDto } from '@/lib/api/rayons';
import type { Rayon } from '@/types/models';

interface RayonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  rayon?: Rayon | null;
  onSuccess?: () => void;
}

/**
 * Create / edit a rayon in a modal.
 */
export function RayonFormModal({ open, onOpenChange, rayon, onSuccess }: RayonFormModalProps) {
  const isEdit = !!rayon;
  const createMutation = useCreateRayon();
  const updateMutation = useUpdateRayon();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: CreateRayonDto | UpdateRayonDto): Promise<void> => {
    if (isEdit && rayon) {
      await updateMutation.mutateAsync({ id: rayon.id, data: data as UpdateRayonDto });
    } else {
      await createMutation.mutateAsync(data as CreateRayonDto);
    }
    onSuccess?.();
    onOpenChange(false);
  };

  const errorMessage =
    mutation.isError &&
    (mutation.error instanceof Error
      ? mutation.error.message
      : `Gagal ${isEdit ? 'memperbarui' : 'membuat'} rayon. Silakan coba lagi.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Rayon' : 'Tambah Rayon'}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {errorMessage ? (
            <div
              className="mb-4 border-2 border-nb-danger bg-nb-danger-light px-4 py-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-nb-body-sm font-medium text-nb-danger">{errorMessage}</p>
            </div>
          ) : null}
          <RayonForm
            key={rayon?.id ?? 'new'}
            mode={isEdit ? 'edit' : 'create'}
            initialData={rayon ?? undefined}
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
