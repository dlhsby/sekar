'use client';

import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { LocationForm } from '@/components/forms/LocationForm';
import { FormActions } from '@/components/forms/FormActions';
import { useCreateLocation, useUpdateLocation, useUpdateLocationBoundary } from '@/lib/api/locations';
import { getErrorMessage } from '@/lib/api/client';
import type { Location, CreateLocationDto, UpdateLocationDto } from '@/types/models';

interface LocationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit; omitted/null → create. */
  area?: Location | null;
  onSuccess?: () => void;
  /** Read-only "Detail" mode — reuses the form disabled, no submit. */
  readOnly?: boolean;
}

/**
 * Create / edit an area in a full-screen modal — the LocationForm embeds a Google
 * Maps boundary editor, so it needs the whole viewport. Replaces the standalone
 * /locations/new and /locations/[id] form pages.
 *
 * Persistence is two-step: `boundary_polygon` is NOT accepted by the create /
 * update area endpoints (backend whitelist), so scalar fields go through
 * POST/PATCH `/areas` and the polygon goes through `PUT /locations/:id/boundary`.
 */
export function LocationFormModal({ open, onOpenChange, area, onSuccess, readOnly = false }: LocationFormModalProps) {
  const { t } = useTranslation();
  const formId = useId();
  const [hasGeometry, setHasGeometry] = useState(true);
  const isEdit = !!area;
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const boundaryMutation = useUpdateLocationBoundary();
  const scalarMutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = async (data: CreateLocationDto | UpdateLocationDto): Promise<void> => {
    // Split out the fields the scalar create/update endpoints reject:
    //  - boundary_polygon → only via PUT /locations/:id/boundary,
    //  - location_type_id → create-only (UpdateLocationDto omits it; PATCH 400s on it).
    const { boundary_polygon, location_type_id, ...rest } = data as CreateLocationDto;
    const scalars = rest;
    try {
      // The boundary endpoint accepts a Polygon only. A freshly drawn/edited
      // boundary is always a single Polygon; an untouched MultiPolygon (KMZ
      // import) is detected as unchanged and never re-sent here.
      const polygonForPut =
        boundary_polygon == null || boundary_polygon.type === 'Polygon' ? boundary_polygon : null;
      if (isEdit && area) {
        await updateMutation.mutateAsync({ id: area.id, data: scalars as UpdateLocationDto });
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
        // location_type_id is required on create — add it back here.
        const created = await createMutation.mutateAsync({ ...scalars, location_type_id } as CreateLocationDto);
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
        ? t('admin:locations.successUpdated', { name: data.name })
        : t('admin:locations.successCreated', { name: data.name })
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
        ? t('admin:locations.updateErrorMessage')
        : t('admin:locations.createErrorMessage'));
  const isPending = scalarMutation.isPending || boundaryMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>
            {readOnly
              ? t('admin:locations.detailTitle')
              : isEdit
                ? t('admin:locations.actionEdit')
                : t('admin:locations.buttonAdd')}
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
          <LocationForm
            key={`${area?.id ?? 'new'}-${readOnly ? 'view' : 'edit'}`}
            formId={formId}
            mode={isEdit ? 'edit' : 'create'}
            initialData={area ?? undefined}
            onSubmit={handleSubmit}
            readOnly={readOnly}
            onValidityChange={setHasGeometry}
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
                    ? t('admin:shared.updating')
                    : t('admin:shared.creating')
                  : isEdit
                    ? t('admin:locations.form.submit')
                    : t('admin:locations.form.submitNew')
              }
              loading={isPending}
              disabled={!hasGeometry}
              showReset={isEdit}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
