/**
 * Shared "which shift do I show right now" logic for the three attendance
 * surfaces — the Home Kehadiran card, the Kehadiran hub, and the Clock-In/Out
 * screen — so all three read identically (the divergence that made Home show a
 * stale/other shift than the clock-in screen).
 *
 * Precedence mirrors the clock-in screen exactly:
 *   1. The server's attribution default (`GET /shifts/current-state`, ADR-055) —
 *      the shift a punch would attribute to *now*. This is the authoritative,
 *      always-fresh answer.
 *   2. Today's roster shift (`GET /schedules/my`) as a fallback, for when the
 *      attribution window is closed (e.g. mid-afternoon between shifts) yet the
 *      worker is still scheduled today.
 *   3. Otherwise none → the "Tidak Ada Shift" placeholder.
 */
import type { ShiftOption } from '../types/api.types';
import { formatLongDate } from './dateUtils';
import type { ShiftDefinition } from '../types/models.types';

export interface DisplayShift {
  name: string;
  start_time: string; // 'HH:MM[:SS]'
  end_time: string;
}

/**
 * Resolve the single shift to display, attribution-first (see module doc).
 * Returns null when neither an attribution option nor a roster shift is present.
 */
export function pickDisplayShift(
  options: ShiftOption[] | null | undefined,
  rosterShift: ShiftDefinition | null | undefined,
): DisplayShift | null {
  const list = Array.isArray(options) ? options : [];
  const def = list.find((o) => o.is_default) ?? list[0];
  if (def && def.start_time && def.end_time) {
    return { name: def.shift_name ?? '', start_time: def.start_time, end_time: def.end_time };
  }
  if (rosterShift) {
    return {
      name: rosterShift.name,
      start_time: rosterShift.start_time,
      end_time: rosterShift.end_time,
    };
  }
  return null;
}

const MINUTES_PER_DAY = 24 * 60;

function toMinutes(time?: string | null): number | null {
  const m = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * The roster shift that is operative at `now`: the one currently covering it,
 * else the next one to start today, else the last that ran.
 *
 * `GET /schedules/my` returns ONE row, and on a multi-shift day (Shift 2 + Shift
 * 3) that single pick can be the shift that has not started yet. Choosing by the
 * clock instead means a worker late for Shift 2 is never graded against Shift 3.
 */
export function pickOperativeShift(
  shifts: (ShiftDefinition | null | undefined)[],
  now: Date = new Date(),
): ShiftDefinition | null {
  const list = shifts.filter((s): s is ShiftDefinition => !!s?.start_time && !!s?.end_time);
  if (list.length <= 1) return list[0] ?? null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const covering = list.find((s) => {
    const start = toMinutes(s.start_time);
    const end = toMinutes(s.end_time);
    if (start === null || end === null) return false;
    const spanEnd = s.crosses_midnight ? end + MINUTES_PER_DAY : end;
    const t = s.crosses_midnight && nowMinutes < start ? nowMinutes + MINUTES_PER_DAY : nowMinutes;
    return t >= start && t < spanEnd;
  });
  if (covering) return covering;

  const upcoming = list
    .filter((s) => (toMinutes(s.start_time) ?? 0) > nowMinutes)
    .sort((a, b) => (toMinutes(a.start_time) ?? 0) - (toMinutes(b.start_time) ?? 0))[0];
  if (upcoming) return upcoming;

  return list
    .slice()
    .sort((a, b) => (toMinutes(a.start_time) ?? 0) - (toMinutes(b.start_time) ?? 0))
    .pop() ?? null;
}

/**
 * The ONE shift every attendance surface should reason about — label, lateness
 * and status alike. Attribution-first (the server's ranked default), falling
 * back to the roster shift operative right now.
 *
 * Returns a full `ShiftDefinition` rather than a display-only triple, because
 * lateness needs `crosses_midnight`: deriving the label from attribution while
 * deriving the status from a different row is what let the record page show
 * "Shift 2" and "TEPAT WAKTU" for a worker four hours late.
 */
export function resolveActiveShift(
  options: ShiftOption[] | null | undefined,
  rosterShifts: (ShiftDefinition | null | undefined)[],
  now: Date = new Date(),
): ShiftDefinition | null {
  const list = Array.isArray(options) ? options : [];
  const def = list.find((o) => o.is_default) ?? list[0];
  if (def?.start_time && def?.end_time) {
    return {
      id: def.shift_definition_id,
      name: def.shift_name ?? '',
      start_time: def.start_time,
      end_time: def.end_time,
      crosses_midnight: !!def.crosses_midnight,
    } as ShiftDefinition;
  }
  return pickOperativeShift(rosterShifts, now);
}

/** 'HH:MM:SS' | 'HH:MM' → 'HH:MM'. */
function hhmm(time: string): string {
  return time.slice(0, 5);
}

/**
 * Format the shift label shown on the card, e.g. "Shift 1 · 06:00–15:00".
 * Falls back to the caller-supplied "no shift" copy when there is nothing to show.
 */
export function formatShiftLabel(shift: DisplayShift | null, noShiftLabel: string): string {
  if (!shift) return noShiftLabel;
  return `${shift.name} · ${hhmm(shift.start_time)}–${hhmm(shift.end_time)}`;
}

/**
 * Label for one of the OTHER shifts a worker holds, as listed under the heading.
 *
 * The heading already states the day, so repeating it on every line is noise —
 * but a candidate can belong to a different service day (a past-midnight Shift 3
 * attributes to yesterday), and there the date is the whole point. Prefixed only
 * when it differs from the day the heading shows.
 */
export function formatShiftOptionLabel(option: ShiftOption, headingDate: string): string {
  const window = formatShiftLabel(
    { name: option.shift_name ?? '', start_time: option.start_time, end_time: option.end_time },
    '',
  );
  if (!option.service_day || option.service_day === headingDate) return window;
  return `${formatLongDate(`${option.service_day}T00:00:00`)} · ${window}`;
}
