'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { RayonForm } from '@/components/forms/RayonForm';
import { useCreateRayon, useUpdateRayon, type CreateRayonDto, type UpdateRayonDto } from '@/lib/api/rayons';
import { getErrorMessage } from '@/lib/api/client';
import type { Rayon } from '@/types/models';

interface RayonFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  rayon?: Rayon | null;
  onSuccess?: () => void;
  /** Read-only "Detail" mode — reuses the form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit / view a rayon in a modal.
 */
export function RayonFormModal({ open, onOpenChange, rayon, onSuccess, readOnly = false }: RayonFormModalProps) {
  const { t } = useTranslation();
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
    } catch (err) {
      // Also surfaced via the mutation.isError banner below; keep the modal open.
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('admin:rayons.successUpdated', { name: data.name })
        : t('admin:rayons.successCreated', { name: data.name })
    );
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
      : isEdit
        ? t('admin:rayons.updateErrorMessage')
        : t('admin:rayons.createErrorMessage'));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('admin:rayons.detailTitle')
              : isEdit
                ? t('admin:rayons.actionEdit')
                : t('admin:rayons.buttonAdd')}
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
          <RayonForm
            key={`${rayon?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            mode={isEdit ? 'edit' : 'create'}
            initialData={rayon ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isPending}
            readOnly={readOnly}
            onCancel={() => onOpenChange(false)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
