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

  const handleSubmit = async (data: CreateRayonDto | UpdateRayonDto): Promise<void> => {
    // `boundary_polygon` is update-only on the backend (not accepted on create),
    // so a new rayon is saved in two steps: POST scalars, then PATCH the polygon.
    const { boundary_polygon, ...scalars } = data as UpdateRayonDto;
    try {
      if (isEdit && rayon) {
        await updateMutation.mutateAsync({
          id: rayon.id,
          data: { ...scalars, boundary_polygon: boundary_polygon ?? null },
        });
      } else {
        const created = await createMutation.mutateAsync(scalars as CreateRayonDto);
        if (boundary_polygon) {
          await updateMutation.mutateAsync({
            id: created.id,
            data: { boundary_polygon },
          });
        }
      }
    } catch {
      // Failure is surfaced via the mutation.isError banner below; keep the
      // modal open so the user can correct and retry. Swallow here so the
      // rejection doesn't escape react-hook-form as an unhandled rejection.
      return;
    }
    onSuccess?.();
    onOpenChange(false);
  };

  const failedMutation = createMutation.isError
    ? createMutation
    : updateMutation.isError
      ? updateMutation
      : null;
  const errorMessage =
    !!failedMutation &&
    (failedMutation.error instanceof Error
      ? failedMutation.error.message
      : `Gagal ${isEdit ? 'memperbarui' : 'membuat'} rayon. Silakan coba lagi.`);
  const isPending = createMutation.isPending || updateMutation.isPending;

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
            isLoading={isPending}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
