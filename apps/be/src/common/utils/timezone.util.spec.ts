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

  describe('jakartaDayRange', () => {
    it('brackets a WIB day as a UTC range starting at 17:00Z the day before', () => {
      const { dateStr, start, end } = TimezoneUtil.jakartaDayRange('2026-03-05');
      expect(dateStr).toBe('2026-03-05');
      expect(start.toISOString()).toBe('2026-03-04T17:00:00.000Z');
      expect(end.toISOString()).toBe('2026-03-05T17:00:00.000Z');
    });

    /**
     * The bug this helper exists to prevent: a container runs UTC, so at
     * 02:00 WIB the server's local date is still the previous day. Asking for
     * "today" must resolve in WIB, not server-local.
     */
    it('resolves today in WIB, not server-local, in the 00:00-07:00 WIB window', () => {
      // 2026-03-04T20:00Z = 2026-03-05 03:00 WIB.
      const { dateStr } = TimezoneUtil.jakartaDayRange(undefined, new Date('2026-03-04T20:00:00Z'));
      expect(dateStr).toBe('2026-03-05');
    });

    it('is half-open, so an instant at the boundary belongs to exactly one day', () => {
      const day1 = TimezoneUtil.jakartaDayRange('2026-03-05');
      const day2 = TimezoneUtil.jakartaDayRange('2026-03-06');
      expect(day1.end.getTime()).toBe(day2.start.getTime());
    });

    it('spans exactly 24 hours across a month boundary', () => {
      const { start, end } = TimezoneUtil.jakartaDayRange('2026-02-28');
      expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
      expect(end.toISOString()).toBe('2026-02-28T17:00:00.000Z');
    });
  });
});
