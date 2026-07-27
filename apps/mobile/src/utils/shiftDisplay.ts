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
