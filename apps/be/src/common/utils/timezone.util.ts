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

  /**
   * The half-open UTC instant range covering a WIB calendar day, plus the
   * normalized date string. Pass `YYYY-MM-DD`; omit for today in WIB.
   *
   * Exists because the obvious version is wrong in the way that hurts: parsing
   * `new Date('2026-03-05')` yields UTC midnight and then `setHours(0,0,0,0)`
   * moves it to SERVER-local midnight. Containers set no `TZ`, so they run UTC
   * while the business day is WIB — between 00:00 and 07:00 WIB that silently
   * queried the previous day.
   *
   * The range is half-open (`start <= t < end`) rather than ending at
   * 23:59:59.999, which drops any timestamp in the final millisecond.
   */
  static jakartaDayRange(
    date?: string,
    now: Date = new Date(),
  ): {
    dateStr: string;
    start: Date;
    end: Date;
  } {
    const dateStr = date ?? TimezoneUtil.jakartaDateString(now);
    // Read the parts explicitly; `new Date(str)` would reintroduce UTC parsing.
    const [y, m, d] = dateStr.split('-').map(Number);
    const startWibAsUtc = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    const start = new Date(startWibAsUtc - WIB_OFFSET_MS);
    return {
      dateStr,
      start,
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
  }
}
