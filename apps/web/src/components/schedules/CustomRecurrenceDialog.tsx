'use client';

/**
 * "Pengulangan khusus" — the one place the raw recurrence parts live.
 *
 * Google's model: the main form offers presets only, and everything an operator
 * rarely needs (interval, weekday set, an end date) is one click away here. The
 * dialog edits a local draft and commits on Selesai, so Batal is a true cancel.
 *
 * Shape follows what the backend can materialize: every N days (1..30) or
 * weekly on chosen weekdays. There is no "every N weeks" — so picking `minggu`
 * hides the interval rather than offering a number that cannot move.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Radio,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  CUSTOM_INTERVAL_MAX,
  CUSTOM_INTERVAL_MIN,
  type CustomRecurrence,
} from '@/lib/schedules/recurrencePresets';

/** Monday-first display order (JS getDay() puts Sunday at 0). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** i18n keys for the weekday toggles, indexed by JS getDay(). */
export const WEEKDAY_KEYS: Record<number, string> = {
  0: 'weekdaysSun',
  1: 'weekdaysMon',
  2: 'weekdaysTue',
  3: 'weekdaysWed',
  4: 'weekdaysThu',
  5: 'weekdaysFri',
  6: 'weekdaysSat',
};

export interface CustomRecurrenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Seed for the draft, read once on mount. The parent mounts this component
   * only while the dialog is open, so "on mount" is "on open" — which is what
   * lets the draft be a plain useState instead of an effect that re-seeds and
   * fights the operator's edits.
   */
  value: CustomRecurrence;
  onSubmit: (value: CustomRecurrence) => void;
  /** Guards the "Berakhir pada" date — an end before the start is nonsense. */
  startDate?: string;
}

const toggleWeekday = (current: number[], day: number): number[] =>
  current.includes(day) ? current.filter((d) => d !== day) : [...current, day];

export function CustomRecurrenceDialog({
  open,
  onOpenChange,
  value,
  onSubmit,
  startDate,
}: CustomRecurrenceDialogProps) {
  const { t } = useTranslation(['schedules', 'common', 'validation']);
  const [draft, setDraft] = useState<CustomRecurrence>(value);

  const patch = (p: Partial<CustomRecurrence>) => setDraft((d) => ({ ...d, ...p }));

  const error = useMemo(() => {
    if (draft.unit === 'day') {
      if (
        !Number.isInteger(draft.interval) ||
        draft.interval < CUSTOM_INTERVAL_MIN ||
        draft.interval > CUSTOM_INTERVAL_MAX
      ) {
        return t('schedules:calendar.validation.customIntervalRange');
      }
    } else if (draft.weekdays.length === 0) {
      return t('schedules:calendar.validation.weekdaysRequired');
    }
    if (draft.endDate && startDate && draft.endDate < startDate) {
      return t('schedules:calendar.validation.endBeforeStart');
    }
    return null;
  }, [draft, startDate, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('schedules:calendar.event.customTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Ulangi setiap [N] [hari|minggu] — one labelled row, because it
                reads as a single sentence rather than two fields. */}
            <div className="space-y-1">
              <Label htmlFor="recurrence-unit">
                {t('schedules:calendar.event.customRepeatEvery')}
              </Label>
              <div className="flex items-center gap-2">
                {/* The backend has no every-N-weeks, so the interval is a
                    days-only control rather than a number pinned at 1. */}
                {draft.unit === 'day' && (
                  <Input
                    type="number"
                    className="w-20"
                    min={CUSTOM_INTERVAL_MIN}
                    max={CUSTOM_INTERVAL_MAX}
                    aria-label={t('schedules:calendar.event.customIntervalAria')}
                    value={String(draft.interval)}
                    onChange={(e) => patch({ interval: Number(e.target.value) })}
                  />
                )}
                <Select
                  value={draft.unit}
                  onValueChange={(v) => patch({ unit: v as CustomRecurrence['unit'] })}
                >
                  <SelectTrigger id="recurrence-unit" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">
                      {t('schedules:calendar.event.customUnitDay')}
                    </SelectItem>
                    <SelectItem value="week">
                      {t('schedules:calendar.event.customUnitWeek')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ulangi pada — weekly only. */}
            {draft.unit === 'week' && (
              <div>
                <p className="mb-1 text-nb-body-sm font-medium">
                  {t('schedules:calendar.event.customRepeatOn')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAY_ORDER.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={draft.weekdays.includes(day) ? 'default' : 'outline'}
                      aria-pressed={draft.weekdays.includes(day)}
                      onClick={() => patch({ weekdays: toggleWeekday(draft.weekdays, day) })}
                    >
                      {t(`schedules:calendar.event.${WEEKDAY_KEYS[day]}`)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Berakhir: Tidak pernah | Pada <tanggal> */}
            <fieldset className="space-y-2">
              <legend className="mb-1 text-nb-body-sm font-medium">
                {t('schedules:calendar.event.customEndsLabel')}
              </legend>
              <Radio
                name="recurrence-ends"
                checked={!draft.endDate}
                onChange={() => patch({ endDate: '' })}
                label={t('schedules:calendar.event.customEndsNever')}
              />
              <div className="flex items-center gap-2">
                <Radio
                  name="recurrence-ends"
                  checked={!!draft.endDate}
                  onChange={() => patch({ endDate: draft.endDate || startDate || '' })}
                  label={t('schedules:calendar.event.customEndsOn')}
                />
                <div className="flex-1">
                  <DatePicker
                    value={draft.endDate || undefined}
                    onValueChange={(v) => patch({ endDate: v ?? '' })}
                    error={!!draft.endDate && !!error}
                  />
                </div>
              </div>
            </fieldset>

            {error && (
              <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
                {error}
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!!error}
            onClick={() => {
              onSubmit(draft);
              onOpenChange(false);
            }}
          >
            {t('schedules:calendar.event.customDone')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Exported for the summary line in RecurrenceFields. */
export { WEEKDAY_ORDER };
