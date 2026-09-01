import type { Schedule } from '../types/shift.types';

/** Minutes since midnight for an "HH:mm[:ss]" string, or null. */
function minutesOf(hms?: string | null): number | null {
  if (!hms) return null;
  const [h, m] = hms.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * The next scheduled shift today after `nowMinutes` — the shift a worker would
 * clock into once they finish the current one. Excludes the shift they're
 * currently on (matched by `shift_definition_id`), returning the EARLIEST
 * upcoming row. Multi-place rows sharing one shift (ADR-053) need no explicit
 * de-dup: they tie on start time and only one row is ever returned.
 * `allToday` is the day's roster rows (`useTodayRoster.allToday`);
 * time-of-day only, so it stays correct for a worker with back-to-back shifts.
 * Returns null when nothing is scheduled later today.
 */
export function resolveNextShift(
  allToday: Schedule[],
  nowMinutes: number,
  currentShiftDefId?: string | null,
): Schedule | null {
  const upcoming = allToday
    .filter((r) => {
      if (!r.shift_definition) return false;
      if (currentShiftDefId && r.shift_definition.id === currentShiftDefId) return false;
      const start = minutesOf(r.shift_definition.start_time);
      return start != null && start > nowMinutes;
    })
    .sort(
      (a, b) =>
        (minutesOf(a.shift_definition!.start_time) ?? 0) -
        (minutesOf(b.shift_definition!.start_time) ?? 0),
    );
  return upcoming[0] ?? null;
}
