'use client';

import { useState } from 'react';
import { Controller, type Control, type UseFormSetValue, type FieldErrors } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { X } from 'lucide-react';
import { Badge, Button, DatePicker, FormSelect, Label } from '@/components/ui';
import type { FormValues } from '@/components/schedules/ScheduleEventModal';
import { CustomRecurrenceDialog } from '@/components/schedules/CustomRecurrenceDialog';
import {
  customToValues,
  presetToValues,
  resolvePreset,
  valuesToCustom,
  weekdayOf,
  type CustomRecurrence,
  type RecurrencePreset,
} from '@/lib/schedules/recurrencePresets';

/** Monday-first display rank (JS getDay() puts Sunday at 0). */
const WEEKDAY_RANK: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };

/** Full weekday names, indexed by JS getDay() — for the derived preset labels. */
const WEEKDAY_LONG_KEYS: Record<number, string> = {
  0: 'weekdayLongSun',
  1: 'weekdayLongMon',
  2: 'weekdayLongTue',
  3: 'weekdayLongWed',
  4: 'weekdayLongThu',
  5: 'weekdayLongFri',
  6: 'weekdayLongSat',
};

/** Short weekday names for the summary line. */
const WEEKDAY_SHORT_KEYS: Record<number, string> = {
  0: 'weekdaysSun',
  1: 'weekdaysMon',
  2: 'weekdaysTue',
  3: 'weekdaysWed',
  4: 'weekdaysThu',
  5: 'weekdaysFri',
  6: 'weekdaysSat',
};

/**
 * The date + recurrence half of the Buat Jadwal form.
 *
 * Modelled on Google Calendar: the DATE comes first, the recurrence select
 * offers presets read off that date ("Mingguan pada hari Senin"), and nothing
 * else is on screen. An operator who never touches it saves a one-off, which is
 * what almost every schedule is. Interval, weekday set and an end date live
 * behind "Kustom…" — the only place "Berakhir" exists at all.
 *
 * `specific_dates` stays a top-level option with its own inline list: it is not
 * a recurrence rule the custom dialog can express, it's a hand-picked set.
 */
export interface RecurrenceFieldsProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  errors: FieldErrors<FormValues>;
  t: TFunction;
  recurrence: FormValues['recurrence_type'];
  intervalN?: number;
  weekdays: number[];
  startDate: string;
  endDate: string;
  dateDraft: string;
  setDateDraft: (v: string) => void;
}

export function RecurrenceFields({
  control,
  setValue,
  errors,
  t,
  recurrence,
  intervalN,
  weekdays,
  startDate,
  endDate,
  dateDraft,
  setDateDraft,
}: RecurrenceFieldsProps) {
  const [customOpen, setCustomOpen] = useState(false);

  const values = { recurrence_type: recurrence, interval_n: intervalN, weekdays, dates: [], end_date: endDate };
  const preset = resolvePreset(values, startDate);
  const startDow = weekdayOf(startDate);

  /** Presets read off the chosen date, so the label states the actual rule. */
  const presetOptions: Array<{ value: RecurrencePreset; label: string }> = [
    { value: 'none', label: t('schedules:calendar.event.recurrenceNoRepeat') },
    { value: 'daily', label: t('schedules:calendar.event.recurrenceDaily') },
    ...(startDow !== null
      ? [
          {
            value: 'weekly_on_day' as const,
            label: t('schedules:calendar.event.recurrenceWeeklyOn', {
              day: t(`schedules:calendar.event.${WEEKDAY_LONG_KEYS[startDow]}`),
            }),
          },
        ]
      : []),
    { value: 'weekdays', label: t('schedules:calendar.event.recurrenceWeekdays') },
    { value: 'specific_dates', label: t('schedules:calendar.event.recurrenceSpecificDates') },
    { value: 'custom', label: t('schedules:calendar.event.recurrenceCustom') },
  ];

  const applyCustom = (c: CustomRecurrence) => {
    const next = customToValues(c);
    setValue('recurrence_type', next.recurrence_type, { shouldValidate: true });
    setValue('interval_n', next.interval_n ?? 2);
    setValue('weekdays', next.weekdays, { shouldValidate: true });
    setValue('end_date', next.end_date ?? '', { shouldValidate: true });
  };

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      setCustomOpen(true);
      return;
    }
    const next = presetToValues(value as Exclude<RecurrencePreset, 'custom'>, startDate);
    setValue('recurrence_type', next.recurrence_type, { shouldValidate: true });
    setValue('weekdays', next.weekdays, { shouldValidate: true });
    setValue('end_date', '', { shouldValidate: true });
    if (next.recurrence_type !== 'specific_dates') setValue('dates', []);
  };

  /** One-line restatement of a custom rule, so it isn't hidden behind a click. */
  const customSummary = (): string => {
    const rule =
      recurrence === 'every_n_days'
        ? t('schedules:calendar.event.recurrenceEveryNDays', { n: intervalN ?? 2 })
        : recurrence === 'weekly'
          ? t('schedules:calendar.event.recurrenceSummaryWeekly', {
              days: [...weekdays]
                .sort((a, b) => (WEEKDAY_RANK[a] ?? 99) - (WEEKDAY_RANK[b] ?? 99))
                .map((d) => t(`schedules:calendar.event.${WEEKDAY_SHORT_KEYS[d]}`))
                .join(', '),
            })
          : t('schedules:calendar.event.recurrenceDaily');
    return endDate
      ? `${rule} · ${t('schedules:calendar.event.recurrenceSummaryUntil', { date: endDate })}`
      : rule;
  };

  return (
    <>
      {/* The date leads: every preset below is phrased in terms of it. */}
      <Controller
        control={control}
        name="start_date"
        render={({ field }) => (
          <div className="space-y-1">
            <Label>
              {recurrence === 'none'
                ? t('schedules:calendar.event.dateLabel')
                : t('schedules:calendar.event.startDateLabel')}
              <span className="ml-1 text-nb-danger">*</span>
            </Label>
            <DatePicker
              value={field.value || undefined}
              onValueChange={(v) => field.onChange(v ?? '')}
              error={!!errors.start_date}
            />
            {errors.start_date && (
              <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
                {errors.start_date.message}
              </p>
            )}
          </div>
        )}
      />

      <div className="space-y-1">
        <FormSelect
          label={t('schedules:calendar.event.recurrenceLabel')}
          options={presetOptions}
          value={preset}
          onChange={handlePresetChange}
          error={errors.recurrence_type?.message ?? errors.end_date?.message}
        />
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <p className="text-nb-body-sm text-nb-gray-600">{customSummary()}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCustomOpen(true)}>
              {t('common:actions.edit')}
            </Button>
          </div>
        )}
        {errors.weekdays && (
          <p className="text-nb-body-sm font-medium text-nb-danger" role="alert">
            {errors.weekdays.message}
          </p>
        )}
      </div>

      {recurrence === 'specific_dates' && (
        <Controller
          control={control}
          name="dates"
          render={({ field }) => (
            <div>
              <p className="mb-1 text-nb-body-sm font-medium">
                {t('schedules:calendar.event.datesLabel')}
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <DatePicker
                    value={dateDraft || undefined}
                    onValueChange={(v) => setDateDraft(v ?? '')}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!dateDraft || field.value.includes(dateDraft)}
                  onClick={() => {
                    field.onChange([...field.value, dateDraft].sort());
                    setDateDraft('');
                  }}
                >
                  {t('common:actions.add')}
                </Button>
              </div>
              {field.value.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {field.value.map((d) => (
                    <Badge key={d} variant="secondary" className="gap-1">
                      {d}
                      <button
                        type="button"
                        aria-label={t('common:actions.delete')}
                        onClick={() => field.onChange(field.value.filter((x) => x !== d))}
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {errors.dates && (
                <p className="mt-1 text-nb-caption text-nb-danger-dark">{errors.dates.message}</p>
              )}
            </div>
          )}
        />
      )}

      {/* Mounted only while open so the dialog's draft seeds from a plain
          useState — no effect racing the operator's edits. */}
      {customOpen && (
        <CustomRecurrenceDialog
          open
          onOpenChange={setCustomOpen}
          value={valuesToCustom(values, startDate)}
          onSubmit={applyCustom}
          startDate={startDate}
        />
      )}
    </>
  );
}
