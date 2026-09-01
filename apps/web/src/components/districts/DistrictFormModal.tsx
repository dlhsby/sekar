'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { DistrictForm } from '@/components/forms/DistrictForm';
import { FormActions } from '@/components/forms/FormActions';
import { useCreateDistrict, useUpdateDistrict, type CreateDistrictDto, type UpdateDistrictDto } from '@/lib/api/districts';
import { getErrorMessage } from '@/lib/api/client';
import type { District } from '@/types/models';

interface DistrictFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  district?: District | null;
  onSuccess?: () => void;
  /** Read-only "Detail" mode — reuses the form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit / view a district in a modal.
 */
export function DistrictFormModal({ open, onOpenChange, district, onSuccess, readOnly = false }: DistrictFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEdit = !!district;
  const createMutation = useCreateDistrict();
  const updateMutation = useUpdateDistrict();

  const handleSubmit = async (data: CreateDistrictDto | UpdateDistrictDto): Promise<void> => {
    // `boundary_polygon` is update-only on the backend (not accepted on create),
    // so a new district is saved in two steps: POST scalars, then PATCH the polygon.
    const { boundary_polygon, ...scalars } = data as UpdateDistrictDto;
    try {
      if (isEdit && district) {
        await updateMutation.mutateAsync({
          id: district.id,
          data: { ...scalars, boundary_polygon: boundary_polygon ?? null },
        });
      } else {
        const created = await createMutation.mutateAsync(scalars as CreateDistrictDto);
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
        ? t('admin:districts.successUpdated', { name: data.name })
        : t('admin:districts.successCreated', { name: data.name })
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
        ? t('admin:districts.updateErrorMessage')
        : t('admin:districts.createErrorMessage'));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('admin:districts.detailTitle')
              : isEdit
                ? t('admin:districts.actionEdit')
                : t('admin:districts.buttonAdd')}
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
          <DistrictForm
            key={`${district?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            formId={formId}
            mode={isEdit ? 'edit' : 'create'}
            initialData={district ?? undefined}
            onSubmit={handleSubmit}
            readOnly={readOnly}
          />
        </DialogBody>
        <DialogFooter>
          {readOnly ? (
            <FormActions readOnly onCancel={() => onOpenChange(false)} />
          ) : (
            <FormActions
              formId={formId}
              submitLabel={
                isPending
                  ? isEdit
                    ? t('admin:shared.updating')
                    : t('admin:shared.creating')
                  : isEdit
                    ? t('admin:districts.form.submit')
                    : t('admin:districts.form.submitNew')
              }
              loading={isPending}
              showReset={isEdit}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
