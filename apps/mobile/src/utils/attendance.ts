/**
 * Shared attendance summary used by the home "Kehadiran saya" hero across the
 * field / coordinator / admin_rayon dashboards (avoids triplicating the memo).
 */
import { isClockInLate, isClockOutEarly } from './dateUtils';
import type { Shift, ShiftDefinition } from '../types/models.types';

export interface AttendanceSummary {
  /** Earliest clock-in time today (ISO), or undefined. */
  firstClockIn?: string;
  /** Latest clock-out time today (ISO), or undefined if still on shift. */
  lastClockOut?: string;
  /** First clock-in is after the scheduled shift start (false for overtime / no schedule). */
  isLate: boolean;
  /** Last clock-out is before the scheduled shift end (false while on shift / overtime / no schedule). */
  isEarlyLeave: boolean;
}

/** Attendance state relative to today's roster. */
export type AttendanceState = 'no_schedule' | 'on_time' | 'late';

export interface AttendanceStatus extends AttendanceSummary {
  /** Whether the worker has a roster (schedule) row for today. */
  hasScheduleToday: boolean;
  /** The roster shift for today (null when unscheduled — e.g. patrol / ad-hoc). */
  scheduledShift: ShiftDefinition | null;
  /** Coarse state driving the badge: no_schedule vs on_time vs late. */
  state: AttendanceState;
}

/**
 * @param todayShifts today's shifts, sorted clock_in DESC (so the earliest is last)
 * @param currentShift the active shift (used as a fallback when history is empty)
 */
export function summarizeAttendance(
  todayShifts: Shift[],
  currentShift: Shift | null,
): AttendanceSummary {
  const earliest = todayShifts.length ? todayShifts[todayShifts.length - 1] : currentShift;
  const firstClockIn = earliest?.clock_in_time ?? currentShift?.clock_in_time;
  const lastClockOut = todayShifts.reduce<string | undefined>((latest, s) => {
    if (!s.clock_out_time) {
      return latest;
    }
    return !latest || s.clock_out_time > latest ? s.clock_out_time : latest;
  }, currentShift?.clock_out_time);
  const scheduledDef = earliest?.shift_definition ?? currentShift?.shift_definition;
  const isOvertime = !!currentShift?.is_overtime;
  const isLate =
    !isOvertime &&
    isClockInLate(firstClockIn, scheduledDef?.start_time, scheduledDef?.crosses_midnight);
  const isEarlyLeave =
    !isOvertime &&
    isClockOutEarly(lastClockOut, scheduledDef?.end_time, scheduledDef?.crosses_midnight);
  return { firstClockIn, lastClockOut, isLate, isEarlyLeave };
}

/**
 * Roster-gated attendance status. Lateness is judged ONLY against the worker's
 * own roster shift for today (`rosterShift`) — never against a shift inferred
 * from the current time or a standing template. An unscheduled worker (patrol /
 * ad-hoc, `rosterShift === null`) is therefore never "late": their state is
 * `no_schedule`. Lateness uses the day's FIRST clock-in, so clocking out and
 * back in later never re-triggers "late".
 *
 * @param todayShifts today's shifts, sorted clock_in DESC (earliest is last)
 * @param currentShift the active shift (fallback when history is empty)
 * @param rosterShift today's roster shift definition, or null when unscheduled
 */
export function deriveAttendanceStatus(
  todayShifts: Shift[],
  currentShift: Shift | null,
  rosterShift: ShiftDefinition | null,
): AttendanceStatus {
  const summary = summarizeAttendance(todayShifts, currentShift);
  const hasScheduleToday = !!rosterShift;
  const isOvertime = !!currentShift?.is_overtime;
  const isLate =
    hasScheduleToday &&
    !isOvertime &&
    isClockInLate(summary.firstClockIn, rosterShift?.start_time, rosterShift?.crosses_midnight);
  const isEarlyLeave =
    hasScheduleToday &&
    !isOvertime &&
    isClockOutEarly(summary.lastClockOut, rosterShift?.end_time, rosterShift?.crosses_midnight);
  const state: AttendanceState = !hasScheduleToday ? 'no_schedule' : isLate ? 'late' : 'on_time';
  return {
    ...summary,
    isLate,
    isEarlyLeave,
    hasScheduleToday,
    scheduledShift: rosterShift,
    state,
  };
}
