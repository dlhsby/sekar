/**
 * Date Utilities
 * Helper functions for date formatting and calculations
 */

/**
 * Format date to YYYY-MM-DD
 * @param date - Date object or string (or undefined/null)
 * @returns Formatted date string or '-' if invalid
 */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '-';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date to readable format (e.g., "7 January 2026")
 * @param date - Date object or string (or undefined/null)
 * @returns Formatted date string or '-' if invalid
 */
export function formatDateLong(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '-';
  }
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format time to HH:MM (with colon separator)
 * @param date - Date object or string
 * @returns Formatted time string (e.g., "08:29")
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '--:--';
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format datetime to readable format (with colon time separator)
 * @param date - Date object or string (or undefined/null)
 * @returns Formatted datetime string or '-' if invalid (e.g., "24 Jan 2026, 08:29")
 */
export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '-';
  }
  // Format date part using locale
  const datePart = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  // Format time part manually to ensure colon separator
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${datePart}, ${hours}:${minutes}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "5 minutes ago")
 * @param date - Date object or string (or undefined/null)
 * @returns Relative time string or '-' if invalid
 */
export function getRelativeTime(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '-';
  }
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'baru saja';
  }
  if (diffMin < 60) {
    return `${diffMin} menit yang lalu`;
  }
  if (diffHour < 24) {
    return `${diffHour} jam yang lalu`;
  }
  if (diffDay < 7) {
    return `${diffDay} hari yang lalu`;
  }
  return formatDate(d);
}

/**
 * Calculate duration between two dates
 * @param startDate - Start date
 * @param endDate - End date (defaults to now)
 * @returns Duration object
 */
export function calculateDuration(
  startDate: Date | string,
  endDate: Date | string = new Date(),
): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
} {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    formatted: formatHours(hours, minutes),
  };
}

/**
 * Format duration in hours
 * @param hours - Number of hours (can be decimal) OR integer hours
 * @param minutes - Optional minutes (if provided, hours is treated as integer)
 * @returns Formatted string
 */
export function formatHours(hours: number, minutes?: number): string {
  if (minutes !== undefined) {
    // Called with separate hours and minutes
    if (hours === 0 && minutes === 0) {
      return '0m';
    }
    if (hours === 0) {
      return `${minutes}m`;
    }
    if (minutes === 0) {
      return `${hours}j`;
    }
    return `${hours}j ${minutes}m`;
  }

  // Called with decimal hours
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h} jam`;
  }
  return `${h} jam ${m} menit`;
}

/**
 * Check if date is today
 * @param date - Date object or string
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return formatDate(d) === formatDate(today);
}

/**
 * Get start of day
 * @param date - Date object (defaults to today)
 * @returns Date at 00:00:00
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 * @param date - Date object (defaults to today)
 * @returns Date at 23:59:59
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Parse ISO date string
 * @param isoString - ISO date string
 * @returns Date object or null if invalid
 */
export function parseISODate(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Format relative time for deadlines (handles both past and future)
 * @param date - Date object or string (or undefined/null)
 * @returns Relative time string (e.g., "dalam 2 jam", "2 jam yang lalu")
 */
export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return '-';
  }
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);

  const diffSec = Math.floor(absDiffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return isFuture ? 'sebentar lagi' : 'baru saja';
  }
  if (diffMin < 60) {
    return isFuture ? `dalam ${diffMin} menit` : `${diffMin} menit lalu`;
  }
  if (diffHour < 24) {
    return isFuture ? `dalam ${diffHour} jam` : `${diffHour} jam lalu`;
  }
  if (diffDay < 7) {
    return isFuture ? `dalam ${diffDay} hari` : `${diffDay} hari lalu`;
  }
  // For dates more than a week away, show the date
  return formatDateLong(d);
}

/**
 * Get ISO week and year from a date
 * @param date - Date object or string
 * @returns Object with year and week (ISO week number, 1-53)
 */
export function getISOWeek(date: Date | string): { year: number; week: number } {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Copy date object so we don't mutate the original
  const target = new Date(d);
  // Standard ISO week date calculation
  const dayNum = target.getUTCDay() || 7; // Monday = 1, Sunday = 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return {
    year: target.getUTCFullYear(),
    week: weekNum,
  };
}

/**
 * Inverse of getISOWeek — given an ISO year + week number, return the
 * Monday and Sunday that bracket that week.
 */
export function getIsoWeekBounds(
  year: number,
  week: number,
): { monday: Date; sunday: Date } {
  // Jan 4 is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { monday, sunday };
}

/**
 * Sunday-start week bounds for the calendar week that *contains* the given
 * ISO week's midweek (Thursday). Indonesian convention is Minggu→Sabtu
 * (Sun→Sat), but storage uses ISO 8601 (Mon→Sun) — this helper bridges the
 * two so display can be Sun-Sat while the persisted `iso_week` field stays
 * ISO. The returned `sunday` is the Sunday on/before the ISO Monday, and
 * `saturday` is `sunday + 6`.
 *
 * Example: ISO 2026-W21 = Mon May 18 – Sun May 24 → returns
 *   { sunday: 2026-05-17, saturday: 2026-05-23 }
 */
export function getSundayWeekBoundsForIso(
  year: number,
  week: number,
): { sunday: Date; saturday: Date } {
  const { monday } = getIsoWeekBounds(year, week);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() - 1);
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);
  return { sunday, saturday };
}

/**
 * Format an ISO year + week as a human-readable Indonesian label using the
 * **Sunday-start** convention used by the WeekPicker on the kecamatan submit
 * form. e.g. (2026, 21) → "Minggu 21 · 17–23 Mei 2026" (Sun May 17 – Sat
 * May 23) — NOT "18–24 Mei" (which would be the literal ISO Mon–Sun bounds
 * and would mismatch what the kecamatan saw on the submit calendar).
 */
export function formatIsoWeekLabel(year: number, week: number): string {
  const { sunday, saturday } = getSundayWeekBoundsForIso(year, week);
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const daySun = sunday.getUTCDate();
  const daySunMonth = monthsShort[sunday.getUTCMonth()];
  const daySat = saturday.getUTCDate();
  const daySatMonth = monthsShort[saturday.getUTCMonth()];
  const daySatYear = saturday.getUTCFullYear();
  if (sunday.getUTCMonth() === saturday.getUTCMonth()) {
    return `Minggu ${week} · ${daySun}–${daySat} ${daySatMonth} ${daySatYear}`;
  }
  return `Minggu ${week} · ${daySun} ${daySunMonth} – ${daySat} ${daySatMonth} ${daySatYear}`;
}


/**
 * True when a clock-in happened later than the scheduled shift start.
 * Compares the clock-in's local HH:mm against the scheduled "HH:mm" start
 * (e.g. `ShiftDefinition.start_time`). Returns false when no schedule is
 * supplied or either input is invalid (so "no schedule" never reads as late).
 *
 * For a night shift that crosses midnight (e.g. 21:00–05:00) a naive HH:mm
 * compare is wrong: a 01:00 clock-in (60 min) reads as "before" a 21:00 start
 * (1260 min). When `crossesMidnight` is set, early-morning clock-ins (after
 * midnight, before noon) are treated as late — they're well past the evening
 * start — while an evening clock-in before the start time stays on time.
 *
 * @param clockInIso ISO timestamp of the (first) clock-in
 * @param scheduledStartHHmm scheduled start time in "HH:mm"
 * @param crossesMidnight whether the scheduled shift spans midnight
 */
export function isClockInLate(
  clockInIso?: string | null,
  scheduledStartHHmm?: string | null,
  crossesMidnight: boolean = false,
): boolean {
  if (!clockInIso || !scheduledStartHHmm) {
    return false;
  }
  const d = typeof clockInIso === 'string' ? new Date(clockInIso) : clockInIso;
  if (isNaN(d.getTime())) {
    return false;
  }
  const match = /^(\d{1,2}):(\d{2})/.exec(scheduledStartHHmm);
  if (!match) {
    return false;
  }
  const scheduledMinutes = Number(match[1]) * 60 + Number(match[2]);
  const clockInMinutes = d.getHours() * 60 + d.getMinutes();
  if (crossesMidnight) {
    const NOON = 12 * 60;
    return clockInMinutes > scheduledMinutes || clockInMinutes < NOON;
  }
  return clockInMinutes > scheduledMinutes;
}
