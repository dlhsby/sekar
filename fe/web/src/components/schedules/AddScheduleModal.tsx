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
import type { AddScheduleInput } from '@/lib/api/schedules';

interface AddScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: AddScheduleInput) => Promise<void>;
  loading?: boolean;
  date: string;
  allUsers: Array<{ id: string; full_name: string; username: string; role: string; rayon_id?: string | null }>;
  shifts: Array<{ id: string; name: string; start_time: string; end_time: string }>;
  allAreas: Array<{ id: string; name: string }>;
  error?: string | null;
}

export function AddScheduleModal({
  open,
  onClose,
  onSubmit,
  loading,
  date,
  allUsers,
  shifts,
  allAreas,
  error,
}: AddScheduleModalProps) {
  const { t } = useTranslation(['schedules']);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  // Filter schedulable workers (satgas, linmas)
  const schedulableUsers = allUsers.filter((u) =>
    ['satgas', 'linmas'].includes(u.role),
  );

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast.error(t('modals.add.workerRequired'));
      return;
    }

    try {
      await onSubmit({
        user_id: selectedUserId,
        date,
        shift_definition_id: selectedShiftId,
        area_ids: selectedAreaIds.length > 0 ? selectedAreaIds : undefined,
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

        <div className="space-y-4">
          <FormCombobox
            label={t('modals.add.workerLabel')}
            placeholder={t('modals.add.workerPlaceholder')}
            value={selectedUserId}
            onChange={setSelectedUserId}
            required
            options={schedulableUsers.map((u) => ({
              value: u.id,
              label: `${u.full_name} (${u.username})`,
            }))}
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

          <FormMultiCombobox
            label={t('modals.add.areaLabel')}
            options={allAreas.map((a) => ({ value: a.id, label: a.name }))}
            values={selectedAreaIds}
            onChange={setSelectedAreaIds}
            placeholder={t('modals.add.areaPlaceholder')}
            searchPlaceholder={t('modals.areas.searchPlaceholder')}
            emptyText={t('modals.areas.emptyText')}
            helperText={t('modals.add.areaHelper')}
          />

          {error && <div className="rounded-nb-base border-2 border-nb-danger bg-nb-danger-light/20 p-3 text-sm text-nb-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!selectedUserId}>
            {t('modals.add.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
