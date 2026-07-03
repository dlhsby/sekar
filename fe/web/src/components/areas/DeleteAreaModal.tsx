'use client';

/**
 * Delete Area Modal Component
 * Confirmation dialog for deleting an area
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui';
import { useDeleteArea } from '@/lib/api/areas';
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
      await deleteArea.mutateAsync(area.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || t('admin:areas.deleteErrorMessage'));
      } else {
        setError(t('admin:areas.deleteErrorMessage'));
      }
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
      title="Hapus Area"
      description={
        <>
          Anda akan menghapus area <strong>{area?.name}</strong>. Tindakan ini tidak dapat dibatalkan.
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
            <span className="font-bold">Nama:</span>
            <span>{area?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Tipe:</span>
            <span>{area?.areaType?.name ?? '—'}</span>
          </div>
          {area?.rayon && (
            <div className="flex justify-between">
              <span className="font-bold">Rayon:</span>
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
