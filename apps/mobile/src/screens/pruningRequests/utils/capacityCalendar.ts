/**
 * Capacity calendar projection utilities (Phase 3 Round 4).
 *
 * `service_capacity` is stored weekly per ADR-035 (Apr 24, 2026). The
 * staff_kecamatan submit calendar — and the admin reschedule sheet — need a
 * day-by-day visualization. These helpers project the weekly storage model
 * into per-day status without altering the backend.
 *
 * 2026-04-28 amendment to ADR-035 documents this projection as UX-only.
 */

import { getISOWeek } from '../../../utils/dateUtils';

/**
 * Tolerant capacity row shape. Backend serializer may emit either snake_case
 * (`iso_week`, `capacity_units`, `booked_units`) or camelCase (`isoWeek`,
 * `capacityUnits`, `bookedUnits`); historical mobile code already normalizes
 * both — keep that here so the helper survives either shape.
 */
export interface RawCapacityRow {
  year: number;
  iso_week?: number;
  isoWeek?: number;
  week?: number;
  service_type?: string;
  serviceType?: string;
  capacity_units?: number;
  capacityUnits?: number;
  booked_units?: number;
  bookedUnits?: number;
}

export type DayStatus = 'available' | 'partial' | 'full' | 'unknown';

export interface DayAvailability {
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  isoYear: number;
  isoWeek: number;
  status: DayStatus;
  capacity: number;
  booked: number;
}

const PARTIAL_THRESHOLD = 0.8;

function pickWeek(row: RawCapacityRow): number {
  return row.iso_week ?? row.isoWeek ?? row.week ?? 0;
}

function pickCapacity(row: RawCapacityRow): number {
  return row.capacity_units ?? row.capacityUnits ?? 0;
}

function pickBooked(row: RawCapacityRow): number {
  return row.booked_units ?? row.bookedUnits ?? 0;
}

/**
 * Pad a date to `YYYY-MM-DD` in local time.
 */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Categorize a single (capacity, booked) pair.
 */
export function classifyDay(capacity: number, booked: number): DayStatus {
  if (capacity <= 0) {
    return 'unknown';
  }
  if (booked >= capacity) {
    return 'full';
  }
  if (booked >= capacity * PARTIAL_THRESHOLD) {
    return 'partial';
  }
  return 'available';
}

/**
 * Project weekly capacity rows onto each day in `[rangeStart, rangeEnd]`
 * (inclusive). Days whose ISO-week is missing from the input are flagged
 * `unknown` (admin hasn't filled the slot yet).
 */
export function projectWeeklyToDaily(
  rows: RawCapacityRow[],
  rangeStart: Date,
  rangeEnd: Date,
): DayAvailability[] {
  const byKey = new Map<string, RawCapacityRow>();
  for (const row of rows) {
    const week = pickWeek(row);
    if (week === 0) {
      continue;
    }
    byKey.set(`${row.year}:${week}`, row);
  }

  const results: DayAvailability[] = [];
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

  while (cursor.getTime() <= end.getTime()) {
    const { year, week } = getISOWeek(cursor);
    const row = byKey.get(`${year}:${week}`);
    const capacity = row ? pickCapacity(row) : 0;
    const booked = row ? pickBooked(row) : 0;
    results.push({
      date: toIsoDate(cursor),
      isoYear: year,
      isoWeek: week,
      status: classifyDay(capacity, booked),
      capacity,
      booked,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

/**
 * Build an 8-week-ahead range starting from today (local).
 */
export function buildEightWeekRange(today: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7 * 8 - 1);
  return { start, end };
}

/**
 * Build a ~3-month-ahead range (May 2026). The range starts at the most-recent
 * Sunday on/before today (so the first week card always renders all 7 day
 * positions even if today is mid-week) and ends roughly 3 months later.
 */
export function buildThreeMonthRange(today: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  // Roll back to the Sunday of this calendar week (Sunday-start convention).
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  end.setDate(end.getDate() - 1);
  return { start, end };
}
