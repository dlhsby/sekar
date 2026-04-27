/**
 * Compute ISO week number and year from a date.
 *
 * Returns { year: ISO 8601 year, isoWeek: ISO 8601 week number (1-53) }
 * Uses the ISO 8601 standard: week 1 is the first week with at least 4 days in the new year.
 *
 * @param date Date to convert (string ISO 8601 or Date object)
 * @returns ISO week and year
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
