import {
  getIsoWeek,
  isoWeekStart,
  isoWeekEnd,
  isoWeekDays,
} from '../iso-week.util';

describe('iso-week util', () => {
  describe('getIsoWeek', () => {
    it('returns ISO week 1 for January 4 (always week 1 by ISO 8601)', () => {
      const { year, isoWeek } = getIsoWeek('2026-01-04');
      expect(year).toBe(2026);
      expect(isoWeek).toBe(1);
    });

    it('crosses the year boundary correctly: 2026-01-01 is week 1 of 2026', () => {
      const { year, isoWeek } = getIsoWeek('2026-01-01');
      expect(year).toBe(2026);
      expect(isoWeek).toBe(1);
    });

    it('treats 2024-12-30 as week 1 of 2025 (Mon ≥ Thu of new year)', () => {
      const { year, isoWeek } = getIsoWeek('2024-12-30');
      expect(year).toBe(2025);
      expect(isoWeek).toBe(1);
    });
  });

  describe('isoWeekStart / isoWeekEnd', () => {
    it('round-trips: getIsoWeek(isoWeekStart(y,w)) returns (y,w)', () => {
      for (const w of [1, 5, 18, 26, 40, 52]) {
        const start = isoWeekStart(2026, w);
        const round = getIsoWeek(start);
        expect(round.year).toBe(2026);
        expect(round.isoWeek).toBe(w);
      }
    });

    it('isoWeekStart returns a Monday', () => {
      const start = isoWeekStart(2026, 18);
      // getDay(): Sun=0..Sat=6 → Monday=1
      expect(start.getDay()).toBe(1);
    });

    it('isoWeekEnd returns a Sunday at the end of the day', () => {
      const end = isoWeekEnd(2026, 18);
      expect(end.getDay()).toBe(0); // Sunday
      expect(end.getHours()).toBe(23);
    });
  });

  describe('isoWeekDays', () => {
    it('returns 7 days, Mon → Sun', () => {
      const days = isoWeekDays(2026, 18);
      expect(days).toHaveLength(7);
      expect(days[0].getDay()).toBe(1); // Mon
      expect(days[6].getDay()).toBe(0); // Sun
    });

    it('all days share the same ISO week', () => {
      const days = isoWeekDays(2026, 18);
      for (const d of days) {
        const { year, isoWeek } = getIsoWeek(d);
        expect(year).toBe(2026);
        expect(isoWeek).toBe(18);
      }
    });
  });
});
