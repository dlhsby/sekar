'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  FormCombobox,
  FormSelect,
  FormMultiCombobox,
} from '@/components/ui';
import { getErrorMessage } from '@/lib/api/client';
import type { Schedule } from '@/lib/api/schedules';

interface EditScheduleModalProps {
  open: boolean;
  onClose: () => void;
  roster: Schedule | null;
  onReplaceWorker: (id: string, replacementUserId: string, notes?: string) => Promise<void>;
  onUpdateShift: (id: string, shiftId: string | null) => Promise<void>;
  onUpdateAreas: (id: string, areaIds: string[]) => Promise<void>;
  replaceLoading?: boolean;
  shiftLoading?: boolean;
  areasLoading?: boolean;
  allUsers: Array<{ id: string; full_name: string; username: string; role: string; rayon_id?: string | null }>;
  shifts: Array<{ id: string; name: string; start_time: string; end_time: string }>;
  allAreas: Array<{ id: string; name: string }>;
  error?: string | null;
}

export function EditScheduleModal({
  open,
  onClose,
  roster,
  onReplaceWorker,
  onUpdateShift,
  onUpdateAreas,
  replaceLoading,
  shiftLoading,
  areasLoading,
  allUsers,
  shifts,
  allAreas,
  error,
}: EditScheduleModalProps) {
  const { t } = useTranslation(['schedules', 'common']);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  // Filter schedulable workers (same rayon as the current roster)
  const rosterRayonId = roster?.rayon_id;
  const schedulableUsers = allUsers.filter((u) =>
    ['satgas', 'linmas'].includes(u.role) &&
    (!rosterRayonId || u.rayon_id === rosterRayonId),
  );

  useEffect(() => {
    if (roster && open) {
      setSelectedUserId(roster.user_id);
      setSelectedShiftId(roster.shift_definition_id);
      setSelectedAreaIds(roster.schedule_areas.map((a) => a.area_id));
    }
  }, [roster, open]);

  const loading = replaceLoading || shiftLoading || areasLoading;
  const isWorkerChanged = selectedUserId !== roster?.user_id;
  const isShiftChanged = selectedShiftId !== roster?.shift_definition_id;
  const isAreasChanged =
    selectedAreaIds.length !== roster?.schedule_areas.length ||
    !selectedAreaIds.every((id) =>
      roster?.schedule_areas.some((a) => a.area_id === id),
    );

  const handleSubmit = async () => {
    if (!roster) return;

    try {
      if (isWorkerChanged) {
        // If worker changed, call replace (which handles areas + shift inheritance)
        await onReplaceWorker(roster.id, selectedUserId);
      } else {
        // Otherwise call shift + areas independently if they changed
        if (isShiftChanged) {
          await onUpdateShift(roster.id, selectedShiftId);
        }
        if (isAreasChanged) {
          await onUpdateAreas(roster.id, selectedAreaIds);
        }
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

        <div className="space-y-4">
          <FormCombobox
            label={t('modals.edit.workerLabel')}
            value={selectedUserId}
            onChange={setSelectedUserId}
            options={schedulableUsers.map((u) => ({
              value: u.id,
              label: `${u.full_name} (${u.username})`,
            }))}
          />
          {isWorkerChanged && (
            <div className="rounded-nb-base border-2 border-nb-warning bg-nb-warning-light/20 p-3 text-sm text-nb-black">
              {t('modals.edit.replaceHint')}
            </div>
          )}

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
            disabled={isWorkerChanged}
          />

          <FormMultiCombobox
            label={t('modals.edit.areaLabel')}
            options={allAreas.map((a) => ({ value: a.id, label: a.name }))}
            values={selectedAreaIds}
            onChange={setSelectedAreaIds}
            placeholder={t('modals.areas.placeholder')}
            searchPlaceholder={t('modals.areas.searchPlaceholder')}
            emptyText={t('modals.areas.emptyText')}
            disabled={isWorkerChanged}
          />

          {error && (
            <div className="rounded-nb-base border-2 border-nb-danger bg-nb-danger-light/20 p-3 text-sm text-nb-danger">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!isWorkerChanged && !isShiftChanged && !isAreasChanged}
          >
            {t('modals.edit.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
