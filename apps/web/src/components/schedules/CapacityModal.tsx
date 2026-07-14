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
  useSubjectStaffRequirements,
  useSetSubjectStaffRequirements,
  type DayType,
  type StaffRole,
  type StaffSubject,
} from '@/lib/api/location-staff-requirements';
import { getErrorMessage } from '@/lib/api/client';

interface CapacityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The subject whose requirements to edit — a location, kawasan, or rayon. */
  subject: StaffSubject | null;
}

const ROLES: StaffRole[] = ['satgas', 'linmas'];
const DAY_TYPES: DayType[] = ['WEEKDAY', 'WEEKEND', 'HOLIDAY'];

type DayValues = Record<string, Record<StaffRole, number>>;
const emptyValues = (): Record<DayType, DayValues> => ({ WEEKDAY: {}, WEEKEND: {}, HOLIDAY: {} });

/**
 * Set a location's staffing requirement (Satgas + Linmas per shift) for each day
 * type — the source monitoring also reads. The board flags understaffing against
 * the requirement for the day's type (weekday/weekend; holiday detection TBD).
 */
export function CapacityModal({ open, onOpenChange, subject }: CapacityModalProps) {
  const { t } = useTranslation(['schedules', 'roles', 'common']);
  const { data: shifts = [] } = useShiftDefinitions();
  // Keep the raw query ref (do NOT default to `[]` here): a fresh `[]` each render
  // would change the effect's dependency identity while loading and loop setState
  // ("Maximum update depth exceeded"). React-query's `data` is referentially stable.
  const { data: current, isLoading } = useSubjectStaffRequirements(subject, open);
  const setReq = useSetSubjectStaffRequirements();

  const [dayType, setDayType] = useState<DayType>('WEEKDAY');
  // values[dayType][shiftId][role] = required count
  const [values, setValues] = useState<Record<DayType, DayValues>>(emptyValues);

  useEffect(() => {
    if (!open) return;
    setDayType('WEEKDAY');
    const seed = emptyValues();
    for (const row of current ?? []) {
      const day = (seed[row.day_type] ??= {});
      (day[row.shift_definition_id] ??= { satgas: 0, linmas: 0 })[row.role] = row.required_count;
    }
    setValues(seed);
  }, [open, current]);

  const get = (shiftId: string, role: StaffRole) => values[dayType]?.[shiftId]?.[role] ?? 0;
  const set = (shiftId: string, role: StaffRole, next: number) =>
    setValues((v) => {
      const day = v[dayType] ?? {};
      return {
        ...v,
        [dayType]: {
          ...day,
          [shiftId]: {
            satgas: day[shiftId]?.satgas ?? 0,
            linmas: day[shiftId]?.linmas ?? 0,
            [role]: Math.max(0, Math.min(1000, next)),
          },
        },
      };
    });

  const onSave = async () => {
    if (!subject) return;
    try {
      const items = DAY_TYPES.flatMap((dt) =>
        shifts.flatMap((s) =>
          ROLES.map((role) => ({
            shift_definition_id: s.id,
            role,
            day_type: dt,
            required_count: values[dt]?.[s.id]?.[role] ?? 0,
          }))
        )
      );
      await setReq.mutateAsync({ subject, items });
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
          {subject?.name && <p className="text-nb-body-sm text-nb-gray-500">{subject.name}</p>}
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-nb-body-sm text-nb-gray-600">
            {t('schedules:staffCapacity.hint')}
          </p>
          <div
            role="tablist"
            aria-label={t('schedules:staffCapacity.dayTypeLabel')}
            className="mb-3 flex gap-1 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 p-1"
          >
            {DAY_TYPES.map((dt) => (
              <button
                key={dt}
                type="button"
                role="tab"
                aria-selected={dayType === dt}
                onClick={() => setDayType(dt)}
                className={`min-h-touch flex-1 rounded-nb-sm px-2 py-1.5 text-nb-body-sm font-bold transition-colors ${
                  dayType === dt
                    ? 'bg-nb-primary text-white shadow-nb-sm'
                    : 'text-nb-gray-600 hover:bg-nb-gray-100'
                }`}
              >
                {t(`schedules:staffCapacity.dayType.${dt}`)}
              </button>
            ))}
          </div>
          {isLoading && subject && (
            <div className="py-8 text-center text-nb-body-sm text-nb-gray-500">
              {t('common:loading', 'Loading…')}
            </div>
          )}
          <div className={`flex flex-col gap-2 ${isLoading && subject ? 'hidden' : ''}`}>
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
