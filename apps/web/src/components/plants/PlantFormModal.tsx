'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { PlantForm } from '@/components/forms/PlantForm';
import { FormActions } from '@/components/forms/FormActions';
import {
  useCreatePlantSpecies,
  useUpdatePlantSpecies,
  type CreatePlantSpeciesDto,
  type UpdatePlantSpeciesDto,
  type PlantSpeciesRow,
} from '@/lib/api/plants';
import { getErrorMessage } from '@/lib/api/client';

interface PlantFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  plant?: PlantSpeciesRow | null;
  onSuccess?: () => void;
  /** Read-only "Detail" mode — reuses the form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit a plant species in a modal.
 */
export function PlantFormModal({
  open,
  onOpenChange,
  plant,
  onSuccess,
  readOnly = false,
}: PlantFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEdit = !!plant;
  const createMutation = useCreatePlantSpecies();
  const updateMutation = useUpdatePlantSpecies();

  const handleSubmit = async (data: CreatePlantSpeciesDto | UpdatePlantSpeciesDto): Promise<void> => {
    try {
      if (isEdit && plant) {
        await updateMutation.mutateAsync({
          id: plant.id,
          data: data as UpdatePlantSpeciesDto,
        });
      } else {
        await createMutation.mutateAsync(data as CreatePlantSpeciesDto);
      }
    } catch (err) {
      // Also surfaced via the mutation.isError banner below; keep the modal open.
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('plants:successUpdated', { name: data.nameId })
        : t('plants:successCreated', { name: data.nameId })
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
        ? t('plants:updateErrorMessage')
        : t('plants:createErrorMessage'));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('plants:detailTitle')
              : isEdit
                ? t('plants:actionEdit')
                : t('plants:buttonAdd')}
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
          <PlantForm
            key={`${plant?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            formId={formId}
            initialData={plant ?? undefined}
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
                    ? t('common:actions.updating')
                    : t('common:actions.creating')
                  : isEdit
                    ? t('plants:form.submit')
                    : t('plants:form.submitNew')
              }
              loading={isPending}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
