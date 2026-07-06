/**
 * ISO 8601 week number utilities.
 *
 * Mirrors apps/be/src/modules/pruning-requests/utils/iso-week.util.ts.
 */

/**
 * Compute ISO week number and year from a date.
 * Returns { year: ISO 8601 year, isoWeek: ISO 8601 week number (1-53) }
 * Uses the ISO 8601 standard: week 1 is the first week with at least 4 days in the new year.
 */
export function getIsoWeek(date: string | Date): { year: number; isoWeek: number } {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);

  // Thursday in current week decides the year
  const thu = new Date(d);
  thu.setDate(thu.getDate() + (4 - (d.getDay() || 7)));

  // Year of that Thursday
  const year = thu.getFullYear();

  // First Thursday of year
  const jan4 = new Date(year, 0, 4);
  const thu1 = new Date(jan4);
  thu1.setDate(thu1.getDate() + (4 - (jan4.getDay() || 7)));

  // Milliseconds in a week
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;

  // ISO week number
  const isoWeek = Math.round((thu.getTime() - thu1.getTime()) / msPerWeek) + 1;

  return { year, isoWeek };
}

/**
 * Return the Monday (00:00 local) that opens the given ISO week.
 */
export function isoWeekStart(year: number, isoWeek: number): Date {
  // ISO week 1 contains the year's first Thursday, so Jan 4 is always in week 1.
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Sun=7
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day + 1);

  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (isoWeek - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Return the Sunday (23:59:59.999 local) that closes the given ISO week.
 */
export function isoWeekEnd(year: number, isoWeek: number): Date {
  const monday = isoWeekStart(year, isoWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

/**
 * Yield each calendar day (Mon → Sun) of the given ISO week, with hours zeroed.
 */
export function isoWeekDays(year: number, isoWeek: number): Date[] {
  const monday = isoWeekStart(year, isoWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

/**
 * Compute a rolling 12-week (ISO) window starting from the current week.
 * Returns { year, fromWeek, toWeek } for querying capacity data.
 */
export function getRolling12WeekWindow(today: Date = new Date()): {
  year: number;
  fromWeek: number;
  toWeek: number;
} {
  const { year, isoWeek } = getIsoWeek(today);

  // 12-week window: from this week to this week + 11 weeks
  const fromWeek = isoWeek;
  let toWeek = isoWeek + 11;

  // If toWeek exceeds 53, wrap to next year
  if (toWeek > 53) {
    toWeek = toWeek - 53;
  }

  return { year, fromWeek, toWeek };
}
