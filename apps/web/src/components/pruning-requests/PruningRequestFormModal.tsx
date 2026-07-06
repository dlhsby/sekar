'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { PruningRequestForm } from '@/components/forms/PruningRequestForm';
import { FormActions } from '@/components/forms/FormActions';
import {
  useCreatePruningRequestAdmin,
  useUpdatePruningRequest,
  type UpdatePruningRequestPayload,
  type SubmitPruningRequestPayload,
  type PruningRequest,
} from '@/lib/api/pruning-requests';
import { getErrorMessage } from '@/lib/api/client';

interface PruningRequestFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  request?: PruningRequest | null;
  onSuccess?: () => void;
  /** Read-only "Detail" mode — reuses the form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit a pruning request in a modal.
 *
 * Create: uses the normal POST endpoint with admin-friendly defaults (optional GPS/photos).
 * Edit: uses PATCH to update editable fields (address, notes, tree details, contacts).
 * Status changes must use workflow endpoints (review/assign-to-task/cancel) — not here.
 */
export function PruningRequestFormModal({
  open,
  onOpenChange,
  request,
  onSuccess,
  readOnly = false,
}: PruningRequestFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const isEdit = !!request;
  const createMutation = useCreatePruningRequestAdmin();
  const updateMutation = useUpdatePruningRequest(request?.id ?? '');

  const handleSubmit = async (
    data: UpdatePruningRequestPayload & { gpsLat?: number; gpsLng?: number }
  ): Promise<void> => {
    try {
      if (isEdit && request) {
        await updateMutation.mutateAsync(data);
      } else {
        // Admin creation: map form fields to SubmitPruningRequestPayload
        // Required: address; optional: tree details, contacts, GPS
        const createPayload: Partial<SubmitPruningRequestPayload> = {
          address: data.address,
          notes: data.notes,
          tree_count: data.treeCount,
          tree_height_estimate: data.treeHeightEstimate,
          tree_diameter_estimate: data.treeDiameterEstimate,
          requester_name: data.requesterName,
          requester_phone: data.requesterPhone,
          rt_leader_name: data.rtLeaderName,
          rt_leader_phone: data.rtLeaderPhone,
          // Left blank by the admin, falls back to an area-center estimate — see useCreatePruningRequestAdmin.
          lat: data.gpsLat,
          lng: data.gpsLng,
          // Admin entries don't require photos; server will use empty array
          photo_keys: [],
        };
        await createMutation.mutateAsync(createPayload);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      return;
    }

    toast.success(
      isEdit
        ? t('pruning:form.successUpdated', { code: request?.referenceCode })
        : t('pruning:form.successCreated')
    );
    onSuccess?.();
    onOpenChange(false);
  };

  const failedMutation = isEdit ? updateMutation : createMutation;
  const errorMessage =
    !!failedMutation.isError &&
    (failedMutation.error instanceof Error
      ? failedMutation.error.message
      : isEdit
        ? t('pruning:form.updateErrorMessage')
        : t('pruning:form.createErrorMessage'));
  const isPending = failedMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('pruning:form.detailTitle')
              : isEdit
                ? t('pruning:form.editTitle')
                : t('pruning:form.createTitle')}
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
          <PruningRequestForm
            key={`${request?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            formId={formId}
            mode={isEdit ? 'edit' : 'create'}
            initialData={request ?? undefined}
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
                    ? t('pruning:form.updateButton')
                    : t('pruning:form.submitButton')
                  : isEdit
                    ? t('pruning:form.updateButton')
                    : t('pruning:form.submitButton')
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
