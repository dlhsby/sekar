/**
 * Pre-punch advisory warnings (ADR-050 / ADR-055).
 *
 * SEKAR never blocks a punch: GPS is advisory, lateness is recorded not refused,
 * and an unscheduled worker may still clock in (the punch simply lands ad-hoc).
 * There is no approval workflow — so the only honest thing to do before a punch
 * that will be recorded unfavourably is to TELL the worker what will be recorded
 * and let them confirm.
 *
 * This module is the single decision point for "does this punch deserve a
 * confirm dialog, and why". It is pure so the rules are testable without a
 * device: the caller supplies `now`, the derived attendance state and the
 * geofence verdict, and gets back ordered warning codes plus the numbers needed
 * to render them. Copy lives in i18n (`attendance:punchConfirm.*`), never here.
 */
import type { AttendanceState } from './attendance';
import type { ShiftDefinition } from '../types/models.types';

/** Which punch is about to be submitted. */
export type PunchAction = 'clock_in' | 'clock_out';

/** Geofence verdict, mirroring `AreaState` in `useClockInOut`. */
export type PunchAreaState = 'within' | 'outside' | 'scope' | 'none';

export type PunchWarningCode =
  /** GPS is outside the assigned lokasi / kawasan / rayon boundary. */
  | 'outside_area'
  /** Clocking in after the shift start — will be recorded as `terlambat`. */
  | 'late'
  /** The shift window has already closed — the punch can no longer attach to it. */
  | 'outside_window'
  /** Clocking out before the shift end — will be recorded as leaving early. */
  | 'early_leave'
  /** No roster row today — the punch is ad-hoc and is NOT counted in monitoring. */
  | 'no_schedule';

export interface PunchWarning {
  code: PunchWarningCode;
  /** Minutes past the shift start (`late`) or remaining until its end (`early_leave`). */
  minutes?: number;
  /** The relevant shift boundary as `HH:MM` — start for `late`, end for the rest. */
  time?: string;
  /** Name of the area the worker is assigned to, when known (`outside_area`). */
  areaName?: string;
}

export interface PunchWarningInput {
  action: PunchAction;
  areaState: PunchAreaState;
  /** From `deriveAttendanceStatus` — already projected against `now`. */
  attendanceState: AttendanceState;
  /** Today's roster shift, or null when unscheduled. */
  rosterShift: ShiftDefinition | null;
  /** Assigned area name for the `outside_area` copy. */
  areaName?: string | null;
  now?: Date;
}

const MINUTES_PER_DAY = 24 * 60;

/** `"06:00:00"` / `"6:00"` → minutes since midnight, or null when unparseable. */
function toMinutes(hhmm?: string | null): number | null {
  if (!hhmm) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** `"06:00:00"` → `"06:00"`; leaves anything unparseable alone. */
function toDisplayTime(hhmm?: string | null): string | undefined {
  const match = hhmm ? /^(\d{1,2}):(\d{2})/.exec(hhmm) : null;
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : undefined;
}

/**
 * Signed minute gap on the local clock, wrapped forward for a shift that runs
 * past midnight — so a 21:00 shift clocked into at 01:00 reads 240 minutes late,
 * not 1200 minutes early.
 */
function gapMinutes(from: number, to: number, crossesMidnight: boolean): number {
  const diff = to - from;
  return crossesMidnight && diff < 0 ? diff + MINUTES_PER_DAY : diff;
}

/**
 * Ordered warnings for a punch that is about to be submitted. Empty means
 * nothing is off-nominal and the punch should go through without a dialog.
 *
 * Order is severity-first — where the worker *is* outranks when they are — so a
 * single dialog listing every reason reads top-down in the order that matters.
 */
export function buildPunchWarnings(input: PunchWarningInput): PunchWarning[] {
  const { action, areaState, attendanceState, rosterShift, areaName, now = new Date() } = input;
  const warnings: PunchWarning[] = [];

  // 'scope' (assigned, but no polygon to test against) and 'none' (genuinely
  // unassigned) are NOT warnings — the screen already states both inline, and
  // neither means the worker is somewhere they shouldn't be.
  if (areaState === 'outside') {
    warnings.push({ code: 'outside_area', areaName: areaName ?? undefined });
  }

  const crossesMidnight = !!rosterShift?.crosses_midnight;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (action === 'clock_in') {
    if (attendanceState === 'outside_window') {
      warnings.push({ code: 'outside_window', time: toDisplayTime(rosterShift?.end_time) });
    } else if (attendanceState === 'late') {
      const start = toMinutes(rosterShift?.start_time);
      warnings.push({
        code: 'late',
        minutes: start === null ? undefined : Math.max(0, gapMinutes(start, nowMinutes, crossesMidnight)),
        time: toDisplayTime(rosterShift?.start_time),
      });
    }
  } else {
    // Early leave is projected against `now`, not against a clock-out that has
    // not happened yet — the whole point is to warn BEFORE it is recorded.
    const end = toMinutes(rosterShift?.end_time);
    if (end !== null) {
      const remaining = gapMinutes(nowMinutes, end, crossesMidnight);
      if (remaining > 0) {
        warnings.push({ code: 'early_leave', minutes: remaining, time: toDisplayTime(rosterShift?.end_time) });
      }
    }
  }

  // Stated last: it explains why the punch will not appear in monitoring, which
  // is context for the reasons above rather than a problem with this punch.
  if (attendanceState === 'no_schedule') {
    warnings.push({ code: 'no_schedule' });
  }

  return warnings;
}
