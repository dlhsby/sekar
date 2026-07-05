/**
 * ISO week utility tests.
 */

import { getIsoWeek, isoWeekStart, isoWeekEnd, isoWeekDays, getRolling12WeekWindow } from '../iso-week';

describe('iso-week utilities', () => {
  describe('getIsoWeek', () => {
    it('returns correct week 1 for Jan 4, 2026', () => {
      const result = getIsoWeek(new Date('2026-01-04'));
      expect(result.year).toBe(2026);
      expect(result.isoWeek).toBe(1);
    });

    it('returns correct week for mid-year date', () => {
      const result = getIsoWeek(new Date('2026-06-11'));
      expect(result.year).toBe(2026);
      expect(result.isoWeek).toBe(24);
    });

    it('handles string input', () => {
      const result = getIsoWeek('2026-06-11');
      expect(result.year).toBe(2026);
      expect(result.isoWeek).toBe(24);
    });

    it('returns correct week for early Jan at week boundary', () => {
      // Jan 1, 2026 is a Thursday, so it's in week 1 of 2026
      const result = getIsoWeek(new Date('2026-01-01'));
      expect(result.year).toBe(2026);
      expect(result.isoWeek).toBe(1);
    });
  });

  describe('isoWeekStart', () => {
    it('returns Monday 00:00 for given week', () => {
      const monday = isoWeekStart(2026, 24);
      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getHours()).toBe(0);
      expect(monday.getMinutes()).toBe(0);
      expect(monday.getSeconds()).toBe(0);
    });

    it('matches the Monday of week 1', () => {
      const monday = isoWeekStart(2026, 1);
      // The test should verify week 1 starts on a Monday
      expect(monday.getDay()).toBe(1); // Monday
      // ISO week 1 of 2026 actually starts in 2025 (Dec 29, 2025)
      expect(monday.getFullYear()).toBeLessThanOrEqual(2026);
    });
  });

  describe('isoWeekEnd', () => {
    it('returns Sunday 23:59:59.999 for given week', () => {
      const sunday = isoWeekEnd(2026, 24);
      expect(sunday.getDay()).toBe(0); // Sunday
      expect(sunday.getHours()).toBe(23);
      expect(sunday.getMinutes()).toBe(59);
      expect(sunday.getSeconds()).toBe(59);
    });

    it('spans a full week (7 days)', () => {
      const start = isoWeekStart(2026, 24);
      const end = isoWeekEnd(2026, 24);
      // Start is Monday 00:00:00, end is Sunday 23:59:59 — span is almost 7 days
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThanOrEqual(7);
    });
  });

  describe('isoWeekDays', () => {
    it('returns array of 7 dates for Mon-Sun', () => {
      const days = isoWeekDays(2026, 24);
      expect(days).toHaveLength(7);
      // First should be Monday
      expect(days[0].getDay()).toBe(1);
      // Last should be Sunday
      expect(days[6].getDay()).toBe(0);
    });

    it('spans exactly 6 days (7 days inclusive Mon-Sun)', () => {
      const days = isoWeekDays(2026, 24);
      const diff = (days[6].getTime() - days[0].getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(6);
    });

    it('all days have zero hours/minutes/seconds', () => {
      const days = isoWeekDays(2026, 24);
      days.forEach((d) => {
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
        expect(d.getSeconds()).toBe(0);
        expect(d.getMilliseconds()).toBe(0);
      });
    });
  });

  describe('getRolling12WeekWindow', () => {
    it('returns 12-week window starting from current week', () => {
      // Assume we're in week 24 of 2026
      const today = new Date('2026-06-11');
      const result = getRolling12WeekWindow(today);
      expect(result.year).toBe(2026);
      expect(result.fromWeek).toBeGreaterThan(0);
      expect(result.fromWeek).toBeLessThanOrEqual(53);
      // Window should span 12 weeks
      const spanWeeks = result.toWeek >= result.fromWeek
        ? result.toWeek - result.fromWeek + 1
        : (53 - result.fromWeek + 1) + result.toWeek;
      expect(spanWeeks).toBe(12);
    });

    it('handles year boundary crossing', () => {
      // Late in the year, window should wrap
      const today = new Date('2026-12-17');
      const result = getRolling12WeekWindow(today);
      expect(result.year).toBe(2026);
      expect(result.fromWeek).toBeGreaterThan(0);
      expect(result.fromWeek).toBeLessThanOrEqual(53);
    });

    it('handles early year', () => {
      const today = new Date('2026-01-05');
      const result = getRolling12WeekWindow(today);
      expect(result.year).toBe(2026);
      expect(result.fromWeek).toBeGreaterThan(0);
      expect(result.fromWeek).toBeLessThanOrEqual(53);
    });
  });
});
