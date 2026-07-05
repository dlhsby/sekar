'use client';

/**
 * Delete Area Modal Component
 * Confirmation dialog for deleting an area
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui';
import { useDeleteArea } from '@/lib/api/areas';
import { getErrorMessage } from '@/lib/api/client';
import type { Area } from '@/types/models';

export interface DeleteAreaModalProps {
  area: Area | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteAreaModal({ area, isOpen, onClose, onSuccess }: DeleteAreaModalProps) {
  const { t } = useTranslation();
  const deleteArea = useDeleteArea();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!area) return;

    setError(null);

    try {
      const name = area.name;
      await deleteArea.mutateAsync(area.id);
      toast.success(t('admin:areas.successDeleted', { name }));
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
      title={t('admin:areas.deleteTitle')}
      description={
        <>
          {t('admin:areas.deleteConfirmation', { areaName: area?.name })}
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
            <span className="font-bold">{t('admin:areas.detailName')}:</span>
            <span>{area?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t('admin:areas.detailType')}:</span>
            <span>{area?.areaType?.name ?? '—'}</span>
          </div>
          {area?.rayon && (
            <div className="flex justify-between">
              <span className="font-bold">{t('admin:areas.detailRayon')}:</span>
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
