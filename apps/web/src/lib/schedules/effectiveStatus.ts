/**
 * Effective schedule status for display (ADR schedule-status-lifecycle).
 *
 * The backend advances a roster row `planned → present` on clock-in and, via an
 * hourly cron, `planned → absent` once the shift window + grace closes with no
 * clock-in. This helper reproduces the *absent* rule at render time so the board
 * flips a past no-show to "Tidak Hadir" immediately instead of waiting up to an
 * hour for the cron — the two always agree because they use the same rule:
 *
 *   `planned` AND shift window + grace has closed  ⇒  `absent`
 *
 * (Because clock-in sets `present`, any row still `planned` after its window is a
 * no-show, so no attendance lookup is needed here.)
 *
 * Times are compared in device-local time — the app treats the device clock as
 * WIB, matching how the rest of the schedule UI reads dates.
 */

export type ScheduleStatusValue =
  | 'planned'
  | 'present'
  | 'absent'
  | 'leave_sick'
  | 'leave_annual'
  | 'leave_permit'
  | 'replaced'
  | 'off';

export interface ShiftWindow {
  end_time: string; // 'HH:MM[:SS]'
  crosses_midnight?: boolean;
  /** Latest-clock-in grace (min). Defaults to the backend default (60) when absent. */
  cutoff_grace_min?: number | null;
}

const DEFAULT_GRACE_MIN = 60;

/** Whether the shift's clock-in window + grace has fully closed at `now` (local). */
export function isScheduleWindowClosed(
  serviceDay: string,
  shift: ShiftWindow | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!shift?.end_time) return false;
  const hms = shift.end_time.length === 5 ? `${shift.end_time}:00` : shift.end_time;
  const end = new Date(`${serviceDay}T${hms}`); // device-local (= WIB)
  if (Number.isNaN(end.getTime())) return false;
  if (shift.crosses_midnight) end.setDate(end.getDate() + 1);
  end.setMinutes(end.getMinutes() + Math.max(0, shift.cutoff_grace_min ?? DEFAULT_GRACE_MIN));
  return now.getTime() > end.getTime();
}

/**
 * The status to display: `absent` for a past no-show still stored as `planned`,
 * otherwise the raw status unchanged.
 */
export function effectiveScheduleStatus(
  status: string,
  shift: ShiftWindow | null | undefined,
  serviceDay: string,
  now: Date = new Date(),
): string {
  if (status !== 'planned') return status;
  return isScheduleWindowClosed(serviceDay, shift, now) ? 'absent' : status;
}
