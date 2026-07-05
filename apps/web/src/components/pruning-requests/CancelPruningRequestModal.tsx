'use client';

/**
 * Cancel Pruning Request Modal Component
 * Confirmation dialog for cancelling a pruning request
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui';
import { useCancelPruningRequest } from '@/lib/api/pruning-requests';
import { getErrorMessage } from '@/lib/api/client';
import type { PruningRequest } from '@/lib/api/pruning-requests';

export interface CancelPruningRequestModalProps {
  request: PruningRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CancelPruningRequestModal({
  request,
  isOpen,
  onClose,
  onSuccess,
}: CancelPruningRequestModalProps) {
  const { t } = useTranslation();
  const cancelMutation = useCancelPruningRequest(request?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!request) return;

    setError(null);

    try {
      const code = request.referenceCode;
      await cancelMutation.mutateAsync(undefined);
      toast.success(t('pruning:cancel.successCancelled', { code }));
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <ConfirmDialog
      open={isOpen && !!request}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
      title={t('pruning:cancel.title')}
      description={
        <>
          {t('pruning:cancel.confirmation', { code: request?.referenceCode })}
        </>
      }
      confirmLabel={t('pruning:cancel.buttonCancel')}
      variant="destructive"
      loading={cancelMutation.isPending}
      onConfirm={handleCancel}
    >
      {/* Request Details */}
      <div className="space-y-2">
        <div className="bg-nb-gray-100 border-2 border-nb-black p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-bold">{t('pruning:cancel.referenceCode')}:</span>
            <span>{request?.referenceCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t('pruning:cancel.address')}:</span>
            <span className="text-right max-w-xs">{request?.address ?? '—'}</span>
          </div>
          {request?.kecamatanName && (
            <div className="flex justify-between">
              <span className="font-bold">{t('pruning:cancel.kecamatan')}:</span>
              <span>{request.kecamatanName}</span>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-nb-danger/10 border-2 border-nb-danger px-4 py-3">
            <p className="text-sm text-nb-danger font-medium">{error}</p>
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
