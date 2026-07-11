/**
 * filterHelpers Tests
 * Covers parseFilterDate, toFilterDateString, and toTitleCase utilities
 */

import { parseFilterDate, toFilterDateString, toTitleCase } from '../filterHelpers';

describe('filterHelpers', () => {
  describe('parseFilterDate', () => {
    it('returns null for empty string', () => {
      expect(parseFilterDate('')).toBeNull();
    });

    it('returns a valid Date for a well-formed YYYY-MM-DD string', () => {
      const result = parseFilterDate('2026-02-14');
      expect(result).toBeInstanceOf(Date);
      expect(isNaN((result as Date).getTime())).toBe(false);
    });

    it('parses the correct local date components for 2026-02-14', () => {
      const result = parseFilterDate('2026-02-14') as Date;
      // The function appends T00:00:00 so it parses as local time
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1); // February is month index 1
      expect(result.getDate()).toBe(14);
    });

    it('returns null for an invalid date string', () => {
      expect(parseFilterDate('invalid')).toBeNull();
    });

    it('returns null for a malformed date like "2026-99-99"', () => {
      // New Date with an out-of-range value produces Invalid Date
      expect(parseFilterDate('2026-99-99')).toBeNull();
    });

    it('returns a valid Date for the first day of the year', () => {
      const result = parseFilterDate('2026-01-01');
      expect(result).toBeInstanceOf(Date);
      expect(isNaN((result as Date).getTime())).toBe(false);
    });

    it('returns a valid Date for the last day of the year', () => {
      const result = parseFilterDate('2026-12-31');
      expect(result).toBeInstanceOf(Date);
      expect(isNaN((result as Date).getTime())).toBe(false);
    });
  });

  describe('toFilterDateString', () => {
    it('formats a mid-month date to YYYY-MM-DD', () => {
      // Month index 1 = February
      const date = new Date(2026, 1, 14);
      expect(toFilterDateString(date)).toBe('2026-02-14');
    });

    it('pads single-digit month and day with leading zeros', () => {
      const date = new Date(2026, 0, 5); // January 5
      expect(toFilterDateString(date)).toBe('2026-01-05');
    });

    it('formats December 31 correctly', () => {
      const date = new Date(2026, 11, 31);
      expect(toFilterDateString(date)).toBe('2026-12-31');
    });

    it('is the inverse of parseFilterDate for a valid date string', () => {
      const dateStr = '2026-07-20';
      const parsed = parseFilterDate(dateStr) as Date;
      expect(toFilterDateString(parsed)).toBe(dateStr);
    });
  });

  describe('toTitleCase', () => {
    it('capitalises a simple single-word role', () => {
      expect(toTitleCase('satgas')).toBe('Satgas');
    });

    it('capitalises a simple role with a leading uppercase character unchanged', () => {
      expect(toTitleCase('linmas')).toBe('Linmas');
    });

    it('replaces underscores with spaces and capitalises each word for kepala_rayon', () => {
      expect(toTitleCase('kepala_rayon')).toBe('Kepala Rayon');
    });

    it('replaces underscores with spaces and capitalises each word for admin_rayon', () => {
      expect(toTitleCase('admin_rayon')).toBe('Admin Rayon');
    });

    it('replaces underscores with spaces and capitalises each word for admin_system', () => {
      expect(toTitleCase('admin_system')).toBe('Admin System');
    });

    it('replaces underscores with spaces and capitalises each word for management', () => {
      expect(toTitleCase('management')).toBe('Management');
    });

    it('handles strings with no underscores', () => {
      expect(toTitleCase('korlap')).toBe('Korlap');
    });

    it('handles already title-cased strings without duplicating capitals', () => {
      // toTitleCase does not lower-case first — it just upper-cases each word boundary
      expect(toTitleCase('Korlap')).toBe('Korlap');
    });

    it('handles empty string without throwing', () => {
      expect(toTitleCase('')).toBe('');
    });
  });
});
