/**
 * Recurrence presets for the Buat/Ubah Jadwal form (Google-Calendar model).
 *
 * The form no longer asks the operator to assemble a rule out of raw parts. It
 * offers a short list of presets DERIVED FROM THE CHOSEN DATE ("Mingguan pada
 * hari Senin"), and hides everything else — interval, weekday set, end date —
 * behind a single "Kustom…" dialog. This module is the pure translation layer
 * between that UI and the API's `recurrence_type` + `recurrence_config`.
 *
 * The API supports `none | daily | every_n_days(2..30) | weekly(weekdays[]) |
 * specific_dates(dates[])` plus an optional `end_date`. There is deliberately no
 * "every N weeks" and no occurrence-count end — the custom dialog is shaped to
 * what the backend can actually materialize.
 */

import type { RecurrenceType } from '@/lib/api/schedule-events';

/** What the Pengulangan select shows. `custom` is anything a preset can't say. */
export type RecurrencePreset =
  | 'none'
  | 'daily'
  | 'weekly_on_day'
  | 'weekdays'
  | 'specific_dates'
  | 'custom';

/** The recurrence slice of the form, independent of react-hook-form. */
export interface RecurrenceValues {
  recurrence_type: RecurrenceType | '';
  interval_n?: number;
  weekdays: number[];
  dates: string[];
  end_date?: string;
}

/** Monday–Friday as JS `getDay()` values. */
export const WEEKDAYS_MON_FRI = [1, 2, 3, 4, 5];

/** Custom dialog state. `endDate: ''` means "Tidak pernah" (open-ended). */
export interface CustomRecurrence {
  unit: 'day' | 'week';
  /** Every N days. Ignored for `week` — the backend only does every-1-week. */
  interval: number;
  weekdays: number[];
  endDate: string;
}

export const CUSTOM_INTERVAL_MIN = 1;
export const CUSTOM_INTERVAL_MAX = 30;

/**
 * `getDay()` for an ISO `yyyy-MM-dd`, parsed as a LOCAL date.
 *
 * `new Date('2026-07-27')` parses as UTC midnight, which is the previous day in
 * any negative-offset zone — enough to label a Monday schedule "Mingguan pada
 * hari Minggu". Splitting the parts avoids the whole question.
 */
export function weekdayOf(isoDate: string | undefined): number | null {
  if (!isoDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

const sameDays = (a: number[], b: number[]): boolean =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Which preset describes these values, or `custom` when none does.
 *
 * An end date always means custom: "Berakhir" only exists in the custom dialog,
 * so a preset that quietly carried one would be unrepresentable in the UI that
 * produced it (and un-editable back to "never").
 */
export function resolvePreset(v: RecurrenceValues, startDate?: string): RecurrencePreset {
  if (!v.recurrence_type || v.recurrence_type === 'none') return 'none';
  if (v.recurrence_type === 'specific_dates') return 'specific_dates';
  if (v.end_date) return 'custom';
  if (v.recurrence_type === 'daily') return 'daily';
  if (v.recurrence_type === 'weekly') {
    if (sameDays(v.weekdays, WEEKDAYS_MON_FRI)) return 'weekdays';
    const dow = weekdayOf(startDate);
    if (dow !== null && sameDays(v.weekdays, [dow])) return 'weekly_on_day';
  }
  return 'custom';
}

/**
 * The values a preset stands for. Always clears `end_date` — presets are
 * open-ended by definition; only the custom dialog can set an end.
 */
export function presetToValues(
  preset: Exclude<RecurrencePreset, 'custom'>,
  startDate?: string
): Pick<RecurrenceValues, 'recurrence_type' | 'weekdays' | 'end_date'> {
  switch (preset) {
    case 'daily':
      return { recurrence_type: 'daily', weekdays: [], end_date: '' };
    case 'weekly_on_day': {
      const dow = weekdayOf(startDate);
      return { recurrence_type: 'weekly', weekdays: dow === null ? [] : [dow], end_date: '' };
    }
    case 'weekdays':
      return { recurrence_type: 'weekly', weekdays: [...WEEKDAYS_MON_FRI], end_date: '' };
    case 'specific_dates':
      return { recurrence_type: 'specific_dates', weekdays: [], end_date: '' };
    case 'none':
    default:
      return { recurrence_type: 'none', weekdays: [], end_date: '' };
  }
}

/** Seed the custom dialog from the current values (or sensible defaults). */
export function valuesToCustom(v: RecurrenceValues, startDate?: string): CustomRecurrence {
  const dow = weekdayOf(startDate);
  const fallbackWeekdays = dow === null ? [] : [dow];
  const endDate = v.end_date ?? '';

  if (v.recurrence_type === 'weekly') {
    return {
      unit: 'week',
      interval: 1,
      weekdays: v.weekdays.length ? [...v.weekdays] : fallbackWeekdays,
      endDate,
    };
  }
  if (v.recurrence_type === 'every_n_days') {
    return { unit: 'day', interval: v.interval_n ?? 2, weekdays: fallbackWeekdays, endDate };
  }
  if (v.recurrence_type === 'daily') {
    return { unit: 'day', interval: 1, weekdays: fallbackWeekdays, endDate };
  }
  // none / specific_dates / unset — open the dialog on the simplest rule.
  return { unit: 'day', interval: 1, weekdays: fallbackWeekdays, endDate };
}

/** Translate the custom dialog back into API-shaped values. */
export function customToValues(
  c: CustomRecurrence
): Pick<RecurrenceValues, 'recurrence_type' | 'interval_n' | 'weekdays' | 'end_date'> {
  if (c.unit === 'week') {
    return {
      recurrence_type: 'weekly',
      interval_n: undefined,
      weekdays: [...c.weekdays].sort((a, b) => a - b),
      end_date: c.endDate,
    };
  }
  if (c.interval <= 1) {
    return { recurrence_type: 'daily', interval_n: undefined, weekdays: [], end_date: c.endDate };
  }
  return {
    recurrence_type: 'every_n_days',
    interval_n: c.interval,
    weekdays: [],
    end_date: c.endDate,
  };
}
