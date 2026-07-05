/**
 * Shared attendance summary used by the home "Kehadiran saya" hero across the
 * field / coordinator / admin_data dashboards (avoids triplicating the memo).
 */
import { isClockInLate, isClockOutEarly } from './dateUtils';
import type { Shift } from '../types/models.types';

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
