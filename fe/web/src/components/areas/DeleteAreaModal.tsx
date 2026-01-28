'use client';

/**
 * Delete Area Modal Component
 * Confirmation dialog for deleting an area
 */

import { useState } from 'react';
import { NBModal, NBButton } from '@/components/nb';
import { useDeleteArea } from '@/lib/api/areas';
import type { Area } from '@/types/models';

export interface DeleteAreaModalProps {
  area: Area | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteAreaModal({
  area,
  isOpen,
  onClose,
  onSuccess,
}: DeleteAreaModalProps) {
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
        setError(err.message || 'Gagal menghapus area');
      } else {
        setError('Gagal menghapus area');
      }
    }
  };

  if (!area) return null;

  return (
    <NBModal
      isOpen={isOpen}
      onClose={onClose}
      title="Hapus Area"
      size="md"
    >
      <div className="space-y-4">
        {/* Warning */}
        <div className="bg-red-100 border-4 border-black p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-bold mb-1">Peringatan!</h4>
              <p className="text-sm">
                Anda akan menghapus area <strong>{area.name}</strong>.
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
        </div>

        {/* Area Details */}
        <div className="bg-gray-100 border-4 border-black p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="font-bold">Nama:</span>
            <span>{area.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Kode:</span>
            <span className="font-mono">{area.code}</span>
          </div>
          {area.rayon && (
            <div className="flex justify-between">
              <span className="font-bold">Rayon:</span>
              <span>{area.rayon.name}</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-4 border-black p-4 rounded-lg">
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <NBButton
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={deleteArea.isPending}
          >
            Batal
          </NBButton>
          <NBButton
            onClick={handleDelete}
            variant="danger"
            className="flex-1"
            loading={deleteArea.isPending}
            disabled={deleteArea.isPending}
          >
            {deleteArea.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </NBButton>
        </div>
      </div>
    </NBModal>
  );
}
