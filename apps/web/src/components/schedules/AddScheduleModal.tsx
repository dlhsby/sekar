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
import type { AddScheduleInput } from '@/lib/api/schedules';

interface AddScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddScheduleInput) => Promise<void>;
  loading?: boolean;
  date: string;
  allUsers: Array<{ id: string; full_name: string; username: string; role: string; rayon_id?: string | null }>;
  /** User ids that already have a schedule for `date` — excluded from the worker picker. */
  scheduledUserIds?: Set<string>;
  shifts: Array<{ id: string; name: string; start_time: string; end_time: string }>;
  allRayons: Array<{ id: string; name: string }>;
  allAreas: Array<{ id: string; name: string; rayon_id: string }>;
  error?: string | null;
}

export function AddScheduleModal({
  open,
  onClose,
  onSubmit,
  loading,
  date,
  allUsers,
  scheduledUserIds,
  shifts,
  allRayons,
  allAreas,
  error,
}: AddScheduleModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const formId = useId();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRayonId, setSelectedRayonId] = useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  // Filter schedulable workers (satgas, linmas, korlap) who don't already have
  // a schedule for this date — one schedule per worker per day is enforced
  // server-side, so keep the picker from offering a guaranteed-400 choice.
  const schedulableUsers = allUsers.filter(
    (u) => ['satgas', 'linmas', 'korlap'].includes(u.role) && !scheduledUserIds?.has(u.id),
  );

  // Default rayon to selected worker's rayon
  const selectedWorker = allUsers.find((u) => u.id === selectedUserId);
  useEffect(() => {
    if (selectedWorker?.rayon_id) {
      setSelectedRayonId(selectedWorker.rayon_id);
    }
  }, [selectedUserId, selectedWorker?.rayon_id]);

  // Filter areas by selected rayon
  const filteredAreas = useMemo(() => {
    if (!selectedRayonId) return [];
    return allAreas.filter((a) => a.rayon_id === selectedRayonId);
  }, [allAreas, selectedRayonId]);

  // Change rayon → prune selected areas outside the new rayon (in the handler,
  // not an effect, to avoid a fresh-array-reference render loop).
  const handleRayonChange = (rayonId: string) => {
    setSelectedRayonId(rayonId);
    setSelectedAreaIds((prev) =>
      prev.filter((id) => allAreas.some((a) => a.id === id && a.rayon_id === rayonId)),
    );
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error(t('modals.add.workerRequired'));
      return;
    }

    // Guard: only submit areas that belong to the chosen rayon.
    const areaIds = selectedAreaIds.filter((id) => filteredAreas.some((a) => a.id === id));

    try {
      await onSubmit({
        user_id: selectedUserId,
        date,
        shift_definition_id: selectedShiftId,
        location_ids: areaIds.length > 0 ? areaIds : undefined,
      });
      toast.success(t('messages.addSuccess'));
      onClose();
      // Reset form
      setSelectedUserId('');
      setSelectedShiftId(null);
      setSelectedAreaIds([]);
    } catch (err) {
      const msg = getErrorMessage(err);
      toast.error(msg);
    }
  };

  // Clear form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedUserId('');
      setSelectedShiftId(null);
      setSelectedAreaIds([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('modals.add.title')}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <form id={formId} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <div className="space-y-4">
              <FormCombobox
                label={t('modals.add.workerLabel')}
                placeholder={t('modals.add.workerPlaceholder')}
                helperText={t('modals.add.workerHelper')}
                value={selectedUserId}
                onChange={setSelectedUserId}
                required
                options={schedulableUsers.map((u) => ({
                  value: u.id,
                  label: u.full_name,
                }))}
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

              <FormMultiCombobox
                label={t('modals.add.areaLabel')}
                options={filteredAreas.map((a) => ({ value: a.id, label: a.name }))}
                values={selectedAreaIds}
                onChange={setSelectedAreaIds}
                placeholder={t('modals.add.areaPlaceholder')}
                searchPlaceholder={t('modals.areas.searchPlaceholder')}
                emptyText={t('modals.areas.emptyText')}
                hideSelectedChips
                helperText={t('modals.add.areaHelper')}
              />

              <FormSelect
                label={t('modals.add.shiftLabel')}
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

              {error && <div className="rounded-nb-base border-2 border-nb-danger bg-nb-danger-light/20 p-3 text-sm text-nb-danger">{error}</div>}
            </div>
          </form>
        </DialogBody>

        <DialogFooter>
          <FormActions
            formId={formId}
            submitLabel={t('modals.add.submit')}
            loading={loading}
            disabled={!selectedUserId}
            onCancel={onClose}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
