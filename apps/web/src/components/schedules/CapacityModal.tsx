'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useShiftDefinitions } from '@/lib/api/shift-definitions';
import {
  useLocationStaffRequirements,
  useSetStaffRequirements,
  type StaffRole,
} from '@/lib/api/location-staff-requirements';
import { getErrorMessage } from '@/lib/api/client';

interface CapacityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | null;
  locationName: string | null;
}

const ROLES: StaffRole[] = ['satgas', 'linmas'];

/**
 * Set a location's weekday staffing requirement (Satgas + Linmas per shift) —
 * the source monitoring also reads. Weekend/holiday targets are a follow-up.
 */
export function CapacityModal({
  open,
  onOpenChange,
  locationId,
  locationName,
}: CapacityModalProps) {
  const { t } = useTranslation(['schedules', 'roles', 'common']);
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: current = [] } = useLocationStaffRequirements(
    locationId ?? '',
    open && !!locationId
  );
  const setReq = useSetStaffRequirements();

  // values[shiftId][role] = required count (weekday)
  const [values, setValues] = useState<Record<string, Record<StaffRole, number>>>({});

  useEffect(() => {
    if (!open) return;
    const seed: Record<string, Record<StaffRole, number>> = {};
    for (const row of current) {
      if (row.day_type !== 'WEEKDAY') continue;
      (seed[row.shift_definition_id] ??= { satgas: 0, linmas: 0 })[row.role] = row.required_count;
    }
    setValues(seed);
  }, [open, current]);

  const get = (shiftId: string, role: StaffRole) => values[shiftId]?.[role] ?? 0;
  const set = (shiftId: string, role: StaffRole, next: number) =>
    setValues((v) => ({
      ...v,
      [shiftId]: {
        satgas: v[shiftId]?.satgas ?? 0,
        linmas: v[shiftId]?.linmas ?? 0,
        [role]: Math.max(0, Math.min(1000, next)),
      },
    }));

  const onSave = async () => {
    if (!locationId) return;
    try {
      const items = shifts.flatMap((s) =>
        ROLES.map((role) => ({
          shift_definition_id: s.id,
          role,
          day_type: 'WEEKDAY' as const,
          required_count: get(s.id, role),
        }))
      );
      await setReq.mutateAsync({ locationId, items });
      toast.success(t('schedules:staffCapacity.saved'));
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('schedules:staffCapacity.title')}</DialogTitle>
          {locationName && <p className="text-nb-body-sm text-nb-gray-500">{locationName}</p>}
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-nb-body-sm text-nb-gray-600">
            {t('schedules:staffCapacity.hint')}
          </p>
          <div className="flex flex-col gap-2">
            {shifts.map((s) => (
              <div
                key={s.id}
                className="rounded-nb-base border-2 border-nb-black bg-nb-gray-50 px-3 py-2"
              >
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="font-bold">{s.name}</span>
                  <span className="text-nb-caption text-nb-gray-500">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {ROLES.map((role) => (
                    <RoleStepper
                      key={role}
                      label={t(`roles:${role}`, role)}
                      value={get(s.id, role)}
                      onChange={(n) => set(s.id, role, n)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSave} loading={setReq.isPending}>
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const { t } = useTranslation(['common']);
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-nb-caption font-bold uppercase tracking-wide text-nb-gray-600">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        aria-label={t('common:actions.decrease', 'Decrease')}
        className="grid size-8 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white font-bold shadow-nb-sm hover:bg-nb-gray-50 disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center font-bold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={t('common:actions.increase', 'Increase')}
        className="grid size-8 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white font-bold shadow-nb-sm hover:bg-nb-gray-50"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
