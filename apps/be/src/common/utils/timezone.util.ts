/**
 * Jakarta-timezone date helpers (Phase 4-7 E1).
 *
 * Storage stays UTC; these helpers exist for business logic that depends on
 * "today" / day boundaries, which must be computed in Asia/Jakarta (WIB,
 * UTC+7) regardless of the server's local timezone. WIB has no DST, so a
 * fixed offset is exact.
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export class TimezoneUtil {
  /** Current date/time shifted so its UTC fields read as WIB wall-clock */
  static jakartaNow(now: Date = new Date()): Date {
    return new Date(now.getTime() + WIB_OFFSET_MS);
  }

  /** Today's date in WIB as `YYYY-MM-DD` (for DATE columns / date inputs) */
  static jakartaDateString(now: Date = new Date()): string {
    return TimezoneUtil.jakartaNow(now).toISOString().split('T')[0];
  }

  /**
   * The WIB calendar day of an arbitrary instant, as `YYYY-MM-DD`. Use to bucket
   * timestamps (e.g. a shift's `clock_in_time`) into local days regardless of
   * the server timezone. An instant near UTC midnight maps to the WIB day it
   * falls on once shifted +7h (e.g. `2026-06-21T20:00:00Z` → `2026-06-22`).
   */
  static jakartaDateOf(instant: Date): string {
    return TimezoneUtil.jakartaDateString(instant);
  }

  /**
   * Midnight WIB of "today", returned as a UTC instant. Use for comparing
   * date-typed values (e.g. `effective_date >= jakartaStartOfToday()`).
   */
  static jakartaStartOfToday(now: Date = new Date()): Date {
    const shifted = TimezoneUtil.jakartaNow(now);
    shifted.setUTCHours(0, 0, 0, 0);
    return new Date(shifted.getTime() - WIB_OFFSET_MS);
  }
}
