'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ActivityForm } from '@/components/forms/ActivityForm';
import { FormActions } from '@/components/forms/FormActions';
import { useCreateActivity, useUpdateActivity } from '@/lib/api/activities';
import { getErrorMessage } from '@/lib/api/client';
import type { Activity, CreateActivityDto, UpdateActivityDto } from '@/types/models';

interface ActivityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
  onSuccess?: () => void;
  readOnly?: boolean;
}

export function ActivityFormModal({
  open,
  onOpenChange,
  activity,
  onSuccess,
  readOnly = false,
}: ActivityFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEdit = !!activity;
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const activeMutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: CreateActivityDto | UpdateActivityDto): Promise<void> => {
    try {
      if (isEdit && activity) {
        await updateMutation.mutateAsync({
          id: activity.id,
          data: data as UpdateActivityDto,
        });
      } else {
        await createMutation.mutateAsync(data as CreateActivityDto);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }

    toast.success(
      isEdit
        ? t('activities:successUpdated')
        : t('activities:successCreated')
    );
    onSuccess?.();
    onOpenChange(false);
  };

  const errorMessage =
    activeMutation.isError &&
    (activeMutation.error instanceof Error
      ? activeMutation.error.message
      : isEdit
        ? t('activities:updateErrorMessage')
        : t('activities:createErrorMessage'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('activities:detailTitle')
              : isEdit
                ? t('activities:editTitle')
                : t('activities:createTitle')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {errorMessage && !readOnly && (
            <div
              className="mb-4 border-2 border-nb-danger bg-nb-danger-light px-4 py-3"
              role="alert"
              aria-live="polite"
            >
              <p className="text-nb-body-sm font-medium text-nb-danger">{errorMessage}</p>
            </div>
          )}
          <ActivityForm
            key={`${activity?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            formId={formId}
            mode={isEdit ? 'edit' : 'create'}
            initialData={activity ?? undefined}
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
                activeMutation.isPending
                  ? isEdit
                    ? t('common:actions.updating')
                    : t('common:actions.creating')
                  : isEdit
                    ? t('activities:form.submit')
                    : t('activities:form.submitNew')
              }
              loading={activeMutation.isPending}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
