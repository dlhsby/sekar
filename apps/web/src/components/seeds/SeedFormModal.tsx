'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { SeedForm } from '@/components/forms/SeedForm';
import { useCreateSeed, useUpdateSeed, type CreateSeedInput, type UpdateSeedInput } from '@/lib/api/seeds';
import { getErrorMessage } from '@/lib/api/client';
import type { PlantSeedRow } from '@/lib/api/seeds';

interface SeedFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  seed?: PlantSeedRow | null;
  onSuccess?: () => void;
}

/**
 * Create / edit a seed in a modal.
 */
export function SeedFormModal({ open, onOpenChange, seed, onSuccess }: SeedFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!seed;
  const createMutation = useCreateSeed();
  const updateMutation = useUpdateSeed();

  const handleSubmit = async (data: CreateSeedInput | UpdateSeedInput): Promise<void> => {
    try {
      if (isEdit && seed) {
        await updateMutation.mutateAsync({
          id: seed.id,
          data: data as UpdateSeedInput,
        });
      } else {
        await createMutation.mutateAsync(data as CreateSeedInput);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('seeds:form.successUpdated', { name: (data as CreateSeedInput | UpdateSeedInput).nameId || '...' })
        : t('seeds:form.successCreated', { name: (data as CreateSeedInput | UpdateSeedInput).nameId || '...' })
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
        ? t('seeds:form.updateErrorMessage')
        : t('seeds:form.createErrorMessage'));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('seeds:form.editTitle')
              : t('seeds:form.createTitle')}
          </DialogTitle>
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
          <SeedForm
            key={`${seed?.id ?? 'new'}-${isEdit ? 'edit' : 'create'}`}
            mode={isEdit ? 'edit' : 'create'}
            initialData={seed ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isPending}
            onCancel={() => onOpenChange(false)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
