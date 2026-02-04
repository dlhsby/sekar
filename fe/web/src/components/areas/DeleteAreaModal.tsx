'use client';

/**
 * Delete Area Modal Component
 * Confirmation dialog for deleting an area
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
} from '@/components/ui';
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

  const handleClose = () => {
    if (!deleteArea.isPending) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen && !!area} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Area</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-nb-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-nb-danger" />
            </div>
          </div>

          {/* Warning Message */}
          <div className="text-center">
            <p className="text-sm text-nb-gray-700">
              Anda akan menghapus area <strong>{area?.name}</strong>.
            </p>
            <p className="text-sm text-nb-gray-600 mt-2">
              Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          {/* Area Details */}
          <div className="bg-nb-gray-100 border-3 border-nb-black p-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-bold">Nama:</span>
              <span>{area?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Kode:</span>
              <span className="font-mono">{area?.code}</span>
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

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={deleteArea.isPending}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={deleteArea.isPending}
            disabled={deleteArea.isPending}
            className="flex-1"
          >
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
