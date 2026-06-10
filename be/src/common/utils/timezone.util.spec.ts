import { TimezoneUtil } from './timezone.util';

describe('TimezoneUtil', () => {
  // 2026-06-10 22:30 UTC == 2026-06-11 05:30 WIB (crosses the date line)
  const LATE_UTC = new Date('2026-06-10T22:30:00.000Z');
  // 2026-06-10 10:00 UTC == 2026-06-10 17:00 WIB (same date)
  const MID_UTC = new Date('2026-06-10T10:00:00.000Z');

  describe('jakartaDateString', () => {
    it('should roll to the next date when WIB is past midnight but UTC is not', () => {
      expect(TimezoneUtil.jakartaDateString(LATE_UTC)).toBe('2026-06-11');
    });

    it('should match the UTC date when both are on the same day', () => {
      expect(TimezoneUtil.jakartaDateString(MID_UTC)).toBe('2026-06-10');
    });
  });

  describe('jakartaNow', () => {
    it('should shift the instant by +7 hours', () => {
      expect(TimezoneUtil.jakartaNow(MID_UTC).toISOString()).toBe('2026-06-10T17:00:00.000Z');
    });
  });

  describe('jakartaStartOfToday', () => {
    it('should return 17:00 UTC of the previous day (= 00:00 WIB)', () => {
      // WIB date for LATE_UTC is 2026-06-11 → midnight WIB = 2026-06-10T17:00Z
      expect(TimezoneUtil.jakartaStartOfToday(LATE_UTC).toISOString()).toBe(
        '2026-06-10T17:00:00.000Z',
      );
    });

    it('should bound the same WIB day for a mid-day instant', () => {
      // WIB date for MID_UTC is 2026-06-10 → midnight WIB = 2026-06-09T17:00Z
      expect(TimezoneUtil.jakartaStartOfToday(MID_UTC).toISOString()).toBe(
        '2026-06-09T17:00:00.000Z',
      );
    });
  });
});
