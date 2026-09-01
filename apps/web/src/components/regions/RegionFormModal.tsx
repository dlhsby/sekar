'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { RegionForm } from '@/components/forms/RegionForm';
import { FormActions } from '@/components/forms/FormActions';
import {
  useCreateRegion,
  useUpdateRegion,
  type Region,
  type CreateRegionDto,
  type UpdateRegionDto,
} from '@/lib/api/regions';
import { getErrorMessage } from '@/lib/api/client';

interface RegionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region?: Region | null;
  onSuccess?: () => void;
  readOnly?: boolean;
}

/** Create / edit / view a region (Kawasan) in a modal. */
export function RegionFormModal({
  open,
  onOpenChange,
  region,
  onSuccess,
  readOnly = false,
}: RegionFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEdit = !!region;
  const createMutation = useCreateRegion();
  const updateMutation = useUpdateRegion();

  const handleSubmit = async (data: CreateRegionDto | UpdateRegionDto): Promise<void> => {
    // boundary_polygon is update-only on the backend → two-step create.
    const { boundary_polygon, ...scalars } = data as UpdateRegionDto;
    try {
      if (isEdit && region) {
        await updateMutation.mutateAsync({
          id: region.id,
          data: { ...scalars, boundary_polygon: boundary_polygon ?? null },
        });
      } else {
        const created = await createMutation.mutateAsync(scalars as CreateRegionDto);
        if (boundary_polygon) {
          await updateMutation.mutateAsync({ id: created.id, data: { boundary_polygon } });
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('admin:regions.successUpdated', { name: data.name })
        : t('admin:regions.successCreated', { name: data.name }),
    );
    onSuccess?.();
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('admin:regions.detailTitle')
              : isEdit
                ? t('admin:regions.actionEdit')
                : t('admin:regions.buttonAdd')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <RegionForm
            key={`${region?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            formId={formId}
            mode={isEdit ? 'edit' : 'create'}
            initialData={region ?? undefined}
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
                  ? t('admin:shared.creating')
                  : isEdit
                    ? t('admin:regions.form.submit')
                    : t('admin:regions.form.submitNew')
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
