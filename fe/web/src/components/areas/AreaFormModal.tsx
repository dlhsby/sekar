'use client';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { AreaForm } from '@/components/forms/AreaForm';
import { useCreateArea, useUpdateArea } from '@/lib/api/areas';
import type { Area, CreateAreaDto, UpdateAreaDto } from '@/types/models';

interface AreaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  area?: Area | null;
  onSuccess?: () => void;
}

/**
 * Create / edit an area in a full-screen modal — the AreaForm embeds a Mapbox
 * boundary drawer, so it needs the whole viewport. Replaces the standalone
 * /areas/new and /areas/[id] form pages.
 */
export function AreaFormModal({ open, onOpenChange, area, onSuccess }: AreaFormModalProps) {
  const isEdit = !!area;
  const createMutation = useCreateArea();
  const updateMutation = useUpdateArea();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: CreateAreaDto | UpdateAreaDto): Promise<void> => {
    if (isEdit && area) {
      await updateMutation.mutateAsync({ id: area.id, data: data as UpdateAreaDto });
    } else {
      await createMutation.mutateAsync(data as CreateAreaDto);
    }
    onSuccess?.();
    onOpenChange(false);
  };

  const errorMessage =
    mutation.isError &&
    (mutation.error instanceof Error
      ? mutation.error.message
      : `Gagal ${isEdit ? 'memperbarui' : 'membuat'} area. Silakan coba lagi.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Ubah Area' : 'Tambah Area'}</DialogTitle>
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
          <AreaForm
            key={area?.id ?? 'new'}
            mode={isEdit ? 'edit' : 'create'}
            initialData={area ?? undefined}
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
