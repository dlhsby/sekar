'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { AreaForm } from '@/components/forms/AreaForm';
import { useCreateArea, useUpdateArea, useUpdateAreaBoundary } from '@/lib/api/areas';
import { getErrorMessage } from '@/lib/api/client';
import type { Area, CreateAreaDto, UpdateAreaDto } from '@/types/models';

interface AreaFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  area?: Area | null;
  onSuccess?: () => void;
  /** Read-only "Detail" mode — reuses the form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit an area in a full-screen modal — the AreaForm embeds a Google
 * Maps boundary editor, so it needs the whole viewport. Replaces the standalone
 * /areas/new and /areas/[id] form pages.
 *
 * Persistence is two-step: `boundary_polygon` is NOT accepted by the create /
 * update area endpoints (backend whitelist), so scalar fields go through
 * POST/PATCH `/areas` and the polygon goes through `PUT /areas/:id/boundary`.
 */
export function AreaFormModal({ open, onOpenChange, area, onSuccess, readOnly = false }: AreaFormModalProps) {
  const { t } = useTranslation();
  const isEdit = !!area;
  const createMutation = useCreateArea();
  const updateMutation = useUpdateArea();
  const boundaryMutation = useUpdateAreaBoundary();
  const scalarMutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: CreateAreaDto | UpdateAreaDto): Promise<void> => {
    // Split out the fields the scalar create/update endpoints reject:
    //  - boundary_polygon → only via PUT /areas/:id/boundary,
    //  - area_type_id → create-only (UpdateAreaDto omits it; PATCH 400s on it).
    const { boundary_polygon, area_type_id, ...rest } = data as CreateAreaDto;
    const scalars = rest;
    try {
      // The boundary endpoint accepts a Polygon only. A freshly drawn/edited
      // boundary is always a single Polygon; an untouched MultiPolygon (KMZ
      // import) is detected as unchanged and never re-sent here.
      const polygonForPut =
        boundary_polygon == null || boundary_polygon.type === 'Polygon' ? boundary_polygon : null;
      if (isEdit && area) {
        await updateMutation.mutateAsync({ id: area.id, data: scalars as UpdateAreaDto });
        const polygonChanged =
          JSON.stringify(area.boundary_polygon ?? null) !==
          JSON.stringify(boundary_polygon ?? null);
        if (polygonChanged) {
          await boundaryMutation.mutateAsync({
            id: area.id,
            data: { boundary_polygon: polygonForPut ?? null },
          });
        }
      } else {
        // area_type_id is required on create — add it back here.
        const created = await createMutation.mutateAsync({ ...scalars, area_type_id } as CreateAreaDto);
        if (polygonForPut) {
          await boundaryMutation.mutateAsync({
            id: created.id,
            data: { boundary_polygon: polygonForPut },
          });
        }
      }
    } catch (err) {
      // Also surfaced via the mutation.isError banner; keep the modal open.
      toast.error(getErrorMessage(err));
      return;
    }
    toast.success(
      isEdit
        ? t('admin:areas.successUpdated', { name: data.name })
        : t('admin:areas.successCreated', { name: data.name })
    );
    onSuccess?.();
    onOpenChange(false);
  };

  const failedMutation = scalarMutation.isError
    ? scalarMutation
    : boundaryMutation.isError
      ? boundaryMutation
      : null;
  const errorMessage =
    !!failedMutation &&
    (failedMutation.error instanceof Error
      ? failedMutation.error.message
      : isEdit
        ? t('admin:areas.updateErrorMessage')
        : t('admin:areas.createErrorMessage'));
  const isPending = scalarMutation.isPending || boundaryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('admin:areas.detailTitle')
              : isEdit
                ? t('admin:areas.actionEdit')
                : t('admin:areas.buttonAdd')}
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
          <AreaForm
            key={`${area?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            mode={isEdit ? 'edit' : 'create'}
            initialData={area ?? undefined}
            onSubmit={handleSubmit}
            isLoading={isPending}
            readOnly={readOnly}
            onCancel={() => onOpenChange(false)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
