'use client';

import { useEffect, useState, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  FormCombobox,
  FormSelect,
  FormMultiCombobox,
} from '@/components/ui';
import { FormActions } from '@/components/forms/FormActions';
import { getErrorMessage } from '@/lib/api/client';
import type { Schedule } from '@/lib/api/schedules';

interface EditScheduleModalProps {
  open: boolean;
  onClose: () => void;
  roster: Schedule | null;
  onUpdateShift: (id: string, shiftId: string | null) => Promise<void>;
  onUpdateAreas: (id: string, locationIds: string[]) => Promise<void>;
  shiftLoading?: boolean;
  areasLoading?: boolean;
  shifts: Array<{ id: string; name: string; start_time: string; end_time: string }>;
  allRayons: Array<{ id: string; name: string }>;
  allAreas: Array<{ id: string; name: string; rayon_id: string }>;
  error?: string | null;
}

export function EditScheduleModal({
  open,
  onClose,
  roster,
  onUpdateShift,
  onUpdateAreas,
  shiftLoading,
  areasLoading,
  shifts,
  allRayons,
  allAreas,
  error,
}: EditScheduleModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const formId = useId();

  const [selectedRayonId, setSelectedRayonId] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  // Filter areas by selected rayon
  const filteredAreas = useMemo(() => {
    if (!selectedRayonId) return [];
    return allAreas.filter((a) => a.rayon_id === selectedRayonId);
  }, [allAreas, selectedRayonId]);

  // Change rayon → prune any selected areas that don't belong to the new rayon.
  // Done in the handler (not an effect) so it never fights the preselect effect
  // or loops on a fresh `.filter()` array reference.
  const handleRayonChange = (rayonId: string) => {
    setSelectedRayonId(rayonId);
    setSelectedAreaIds((prev) =>
      prev.filter((id) => allAreas.some((a) => a.id === id && a.rayon_id === rayonId)),
    );
  };

  useEffect(() => {
    if (roster && open) {
      setSelectedRayonId(roster.rayon_id || '');
      setSelectedShiftId(roster.shift_definition_id);
      setSelectedAreaIds(roster.schedule_areas.map((a) => a.area_id));
    }
  }, [roster, open]);

  const loading = shiftLoading || areasLoading;
  const isShiftChanged = selectedShiftId !== roster?.shift_definition_id;
  const isAreasChanged =
    selectedAreaIds.length !== roster?.schedule_areas.length ||
    !selectedAreaIds.every((id) =>
      roster?.schedule_areas.some((a) => a.area_id === id),
    );

  const handleSubmit = async () => {
    if (!roster) return;

    try {
      // The worker is fixed for a schedule row — changing it is not offered
      // here (see the disabled Pekerja field below); only shift/areas can change.
      if (isShiftChanged) {
        await onUpdateShift(roster.id, selectedShiftId);
      }
      if (isAreasChanged) {
        await onUpdateAreas(roster.id, selectedAreaIds);
      }

      toast.success(t('messages.editSuccess'));
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('modals.edit.title')}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form id={formId} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="space-y-4">
              <FormCombobox
                label={t('modals.edit.workerLabel')}
                value={roster?.user_id ?? ''}
                onChange={() => {}}
                disabled
                helperText={t('modals.edit.workerLocked')}
                options={
                  roster
                    ? [{ value: roster.user_id, label: `${roster.user.full_name} (${roster.user.username})` }]
                    : []
                }
              />

              <FormCombobox
                label={t('modals.edit.rayonLabel')}
                value={selectedRayonId}
                onChange={handleRayonChange}
                options={allRayons.map((r) => ({
                  value: r.id,
                  label: r.name,
                }))}
              />

              <FormSelect
                label={t('modals.edit.shiftLabel')}
                value={selectedShiftId ?? 'none'}
                onChange={(value) => setSelectedShiftId(value === 'none' ? null : value)}
                options={[
                  { value: 'none', label: t('modals.add.shiftOptional') },
                  ...shifts.map((shift) => ({
                    value: shift.id,
                    label: `${shift.name} (${shift.start_time}-${shift.end_time})`,
                  })),
                ]}
              />

              <FormMultiCombobox
                label={t('modals.edit.areaLabel')}
                options={filteredAreas.map((a) => ({ value: a.id, label: a.name }))}
                values={selectedAreaIds}
                onChange={setSelectedAreaIds}
                placeholder={t('modals.areas.placeholder')}
                searchPlaceholder={t('modals.areas.searchPlaceholder')}
                emptyText={t('modals.areas.emptyText')}
                hideSelectedChips
              />

              {error && (
                <div className="rounded-nb-base border-2 border-nb-danger bg-nb-danger-light/20 p-3 text-sm text-nb-danger">
                  {error}
                </div>
              )}
            </div>
          </form>
        </DialogBody>

        <DialogFooter>
          <FormActions
            formId={formId}
            submitLabel={t('modals.edit.submit')}
            loading={loading}
            disabled={!isShiftChanged && !isAreasChanged}
            onCancel={onClose}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
