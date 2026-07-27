/**
 * Effective schedule status for display (ADR schedule-status-lifecycle).
 *
 * The backend advances a roster row `planned → present` on clock-in and, via an
 * hourly cron, `planned → absent` once the shift window + grace closes with no
 * clock-in. This helper reproduces the *absent* rule at render time so the Jadwal
 * flips a past no-show to "Tidak Hadir" immediately instead of waiting for the
 * cron — same rule the backend + web use, so they always agree:
 *
 *   `planned` AND shift window + grace has closed  ⇒  `absent`
 *
 * (Clock-in sets `present`, so any row still `planned` past its window is a
 * no-show — no attendance lookup needed here.)
 *
 * Times compare in device-local time — the app treats the device clock as WIB,
 * matching the rest of the schedule/attendance UI.
 */

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
