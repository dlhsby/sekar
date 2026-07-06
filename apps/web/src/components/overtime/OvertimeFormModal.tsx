'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { OvertimeForm } from '@/components/forms/OvertimeForm';
import { FormActions } from '@/components/forms/FormActions';
import { useCreateOvertime, useUpdateOvertime } from '@/lib/api/overtime';
import { getErrorMessage } from '@/lib/api/client';
import type { Overtime } from '@/types/models';

interface OvertimeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  overtime?: Overtime | null;
  onSuccess?: () => void;
}

/**
 * Create / edit an overtime record in a modal.
 */
export function OvertimeFormModal({
  open,
  onOpenChange,
  overtime,
  onSuccess,
}: OvertimeFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEdit = !!overtime;
  const createMutation = useCreateOvertime();
  const updateMutation = useUpdateOvertime();
  const scalarMutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: Record<string, unknown>): Promise<void> => {
    try {
      if (isEdit && overtime) {
        await updateMutation.mutateAsync({ id: overtime.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('overtime:form.successUpdated')
        : t('overtime:form.successCreated')
    );
    onSuccess?.();
    onOpenChange(false);
  };

  const errorMessage =
    scalarMutation.isError &&
    (scalarMutation.error instanceof Error
      ? scalarMutation.error.message
      : isEdit
        ? t('overtime:form.updateErrorMessage')
        : t('overtime:form.createErrorMessage'));
  const isPending = scalarMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('overtime:form.editTitle') : t('overtime:form.createTitle')}
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
          <OvertimeForm
            key={`${overtime?.id ?? 'new'}`}
            formId={formId}
            initialData={overtime ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isPending}
          />
        </DialogBody>
        <DialogFooter>
          <FormActions
            formId={formId}
            submitLabel={
              isPending
                ? isEdit
                  ? t('admin:shared.updating')
                  : t('admin:shared.creating')
                : isEdit
                  ? t('common:actions.update')
                  : t('common:actions.create')
            }
            loading={isPending}
            onCancel={() => onOpenChange(false)}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
