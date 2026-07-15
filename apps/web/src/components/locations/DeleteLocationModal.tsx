'use client';

/**
 * Delete Area Modal Component
 * Confirmation dialog for deleting an area
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui';
import { useDeleteLocation } from '@/lib/api/locations';
import { getErrorMessage } from '@/lib/api/client';
import type { Location } from '@/types/models';

export interface DeleteLocationModalProps {
  area: Location | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteLocationModal({ area, isOpen, onClose, onSuccess }: DeleteLocationModalProps) {
  const { t } = useTranslation();
  const deleteArea = useDeleteLocation();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!area) return;

    setError(null);

    try {
      const name = area.name;
      await deleteArea.mutateAsync(area.id);
      toast.success(t('admin:locations.successDeleted', { name }));
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
      open={isOpen && !!area}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
      title={t('admin:locations.deleteTitle')}
      description={
        <>
          {t('admin:locations.deleteConfirmation', { areaName: area?.name })}
        </>
      }
      confirmLabel={t('admin:shared.delete')}
      variant="destructive"
      loading={deleteArea.isPending}
      onConfirm={handleDelete}
    >
      {/* Area Details */}
      <div className="space-y-2">
        <div className="bg-nb-gray-100 border-2 border-nb-black p-4 space-y-2">
          <div className="flex justify-between">
            <span className="font-bold">{t('admin:locations.detailName')}:</span>
            <span>{area?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t('admin:locations.detailType')}:</span>
            <span>{area?.locationType?.name ?? '—'}</span>
          </div>
          {area?.rayon && (
            <div className="flex justify-between">
              <span className="font-bold">{t('admin:locations.detailRayon')}:</span>
              <span>{area.rayon.name}</span>
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
