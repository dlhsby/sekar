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
import { useLocationCapacity, useSetLocationCapacity } from '@/lib/api/location-capacity';
import { getErrorMessage } from '@/lib/api/client';

interface CapacityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string | null;
  locationName: string | null;
}

/** Set the per-shift staffing target (satgas+linmas) for a location. */
export function CapacityModal({
  open,
  onOpenChange,
  locationId,
  locationName,
}: CapacityModalProps) {
  const { t } = useTranslation(['schedules', 'common']);
  const { data: shifts = [] } = useShiftDefinitions();
  const { data: current = [] } = useLocationCapacity(locationId ?? '', open && !!locationId);
  const setCapacity = useSetLocationCapacity();

  const [values, setValues] = useState<Record<string, number>>({});

  // Seed the steppers from the saved targets whenever the modal (re)opens.
  useEffect(() => {
    if (!open) return;
    const seed: Record<string, number> = {};
    for (const row of current) seed[row.shift_definition_id] = row.target_count;
    setValues(seed);
  }, [open, current]);

  const setVal = (shiftId: string, next: number) =>
    setValues((v) => ({ ...v, [shiftId]: Math.max(0, Math.min(1000, next)) }));

  const onSave = async () => {
    if (!locationId) return;
    try {
      await setCapacity.mutateAsync({
        locationId,
        items: shifts.map((s) => ({
          shift_definition_id: s.id,
          target_count: values[s.id] ?? 0,
        })),
      });
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
            {shifts.map((s) => {
              const n = values[s.id] ?? 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-nb-base border-2 border-nb-black bg-nb-gray-50 px-3 py-2"
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-nb-caption text-nb-gray-500">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVal(s.id, n - 1)}
                      className="grid size-8 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white font-bold shadow-nb-sm hover:bg-nb-gray-50 disabled:opacity-40"
                      disabled={n <= 0}
                      aria-label={t('common:actions.decrease', 'Decrease')}
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center font-bold tabular-nums">{n}</span>
                    <button
                      type="button"
                      onClick={() => setVal(s.id, n + 1)}
                      className="grid size-8 place-items-center rounded-nb-base border-2 border-nb-black bg-nb-white font-bold shadow-nb-sm hover:bg-nb-gray-50"
                      aria-label={t('common:actions.increase', 'Increase')}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSave} loading={setCapacity.isPending}>
            {t('common:actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
