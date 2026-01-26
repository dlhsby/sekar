/**
 * Date Utils Tests
 * Unit tests for date formatting and calculations
 */

import {
  formatDate,
  formatDateLong,
  formatTime,
  formatDateTime,
  getRelativeTime,
  formatRelativeTime,
  calculateDuration,
  formatHours,
  isToday,
  getStartOfDay,
  getEndOfDay,
  parseISODate,
} from '../dateUtils';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2026-01-19T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2026-01-19');
    });

    it('should format ISO string to YYYY-MM-DD', () => {
      const formatted = formatDate('2026-06-15T08:30:00Z');
      expect(formatted).toBe('2026-06-15');
    });

    it('should pad single digit month and day', () => {
      const date = new Date('2026-01-05T10:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle end of year date', () => {
      // Use local time to avoid timezone issues
      const date = new Date(2026, 11, 31, 23, 59, 59); // Dec 31, 2026
      const formatted = formatDate(date);
      expect(formatted).toBe('2026-12-31');
    });

    it('should handle beginning of year date', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toBe('2026-01-01');
    });
  });

  describe('formatDateLong', () => {
    it('should format date in long Indonesian format', () => {
      const date = new Date('2026-01-19T10:00:00Z');
      const formatted = formatDateLong(date);
      // Indonesian locale format: "19 Januari 2026"
      expect(formatted).toContain('2026');
      expect(formatted).toContain('19');
    });

    it('should format ISO string in long format', () => {
      const formatted = formatDateLong('2026-06-15T08:30:00Z');
      expect(formatted).toContain('2026');
    });

    it('should include month name', () => {
      const formatted = formatDateLong(new Date('2026-03-15'));
      // Should contain Indonesian month name
      expect(formatted.length).toBeGreaterThan(8);
    });
  });

  describe('formatTime', () => {
    it('should format time in HH:MM format with colon separator', () => {
      const date = new Date('2026-01-11T14:30:00Z');
      const formatted = formatTime(date);
      // Uses colon separator: HH:MM
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format time from ISO string', () => {
      const formatted = formatTime('2026-01-11T08:00:00Z');
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should handle invalid date', () => {
      const formatted = formatTime('invalid');
      expect(formatted).toBe('--:--');
    });

    it('should handle midnight', () => {
      const date = new Date('2026-01-19T00:00:00');
      const formatted = formatTime(date);
      expect(formatted).toBe('00:00');
    });

    it('should handle noon', () => {
      const date = new Date('2026-01-19T12:00:00');
      const formatted = formatTime(date);
      expect(formatted).toBe('12:00');
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime with date and time', () => {
      const date = new Date('2026-01-19T14:30:00Z');
      const formatted = formatDateTime(date);
      expect(formatted).toContain('2026');
    });

    it('should format ISO string datetime', () => {
      const formatted = formatDateTime('2026-06-15T08:30:00Z');
      expect(formatted).toContain('2026');
    });

    it('should include short month format', () => {
      const formatted = formatDateTime(new Date('2026-01-19T10:00:00'));
      expect(formatted.length).toBeGreaterThan(10);
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-19T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "baru saja" for less than 60 seconds', () => {
      const date = new Date('2026-01-19T09:59:30Z');
      expect(getRelativeTime(date)).toBe('baru saja');
    });

    it('should return minutes for 1-59 minutes ago', () => {
      const date = new Date('2026-01-19T09:45:00Z');
      expect(getRelativeTime(date)).toBe('15 menit yang lalu');
    });

    it('should return hours for 1-23 hours ago', () => {
      const date = new Date('2026-01-19T07:00:00Z');
      expect(getRelativeTime(date)).toBe('3 jam yang lalu');
    });

    it('should return days for 1-6 days ago', () => {
      const date = new Date('2026-01-17T10:00:00Z');
      expect(getRelativeTime(date)).toBe('2 hari yang lalu');
    });

    it('should return formatted date for 7+ days ago', () => {
      const date = new Date('2026-01-10T10:00:00Z');
      expect(getRelativeTime(date)).toBe('2026-01-10');
    });

    it('should handle 1 minute ago', () => {
      const date = new Date('2026-01-19T09:59:00Z');
      expect(getRelativeTime(date)).toBe('1 menit yang lalu');
    });

    it('should handle 1 hour ago', () => {
      const date = new Date('2026-01-19T09:00:00Z');
      expect(getRelativeTime(date)).toBe('1 jam yang lalu');
    });

    it('should handle 1 day ago', () => {
      const date = new Date('2026-01-18T10:00:00Z');
      expect(getRelativeTime(date)).toBe('1 hari yang lalu');
    });

    it('should work with ISO string', () => {
      const result = getRelativeTime('2026-01-19T09:55:00Z');
      expect(result).toBe('5 menit yang lalu');
    });

    it('should return "-" for null date', () => {
      expect(getRelativeTime(null)).toBe('-');
    });

    it('should return "-" for undefined date', () => {
      expect(getRelativeTime(undefined)).toBe('-');
    });

    it('should return "-" for invalid date string', () => {
      expect(getRelativeTime('invalid-date')).toBe('-');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-19T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Future dates (for deadlines)
    it('should return "sebentar lagi" for less than 60 seconds in future', () => {
      const date = new Date('2026-01-19T10:00:30Z');
      expect(formatRelativeTime(date)).toBe('sebentar lagi');
    });

    it('should return "dalam X menit" for 1-59 minutes in future', () => {
      const date = new Date('2026-01-19T10:15:00Z');
      expect(formatRelativeTime(date)).toBe('dalam 15 menit');
    });

    it('should return "dalam X jam" for 1-23 hours in future', () => {
      const date = new Date('2026-01-19T13:00:00Z');
      expect(formatRelativeTime(date)).toBe('dalam 3 jam');
    });

    it('should return "dalam X hari" for 1-6 days in future', () => {
      const date = new Date('2026-01-21T10:00:00Z');
      expect(formatRelativeTime(date)).toBe('dalam 2 hari');
    });

    it('should return formatted date for 7+ days in future', () => {
      const date = new Date('2026-01-28T10:00:00Z');
      // Should return long date format
      expect(formatRelativeTime(date)).toContain('2026');
    });

    // Past dates (for overdue)
    it('should return "baru saja" for less than 60 seconds ago', () => {
      const date = new Date('2026-01-19T09:59:30Z');
      expect(formatRelativeTime(date)).toBe('baru saja');
    });

    it('should return "X menit lalu" for 1-59 minutes ago', () => {
      const date = new Date('2026-01-19T09:45:00Z');
      expect(formatRelativeTime(date)).toBe('15 menit lalu');
    });

    it('should return "X jam lalu" for 1-23 hours ago', () => {
      const date = new Date('2026-01-19T07:00:00Z');
      expect(formatRelativeTime(date)).toBe('3 jam lalu');
    });

    it('should return "X hari lalu" for 1-6 days ago', () => {
      const date = new Date('2026-01-17T10:00:00Z');
      expect(formatRelativeTime(date)).toBe('2 hari lalu');
    });

    it('should return formatted date for 7+ days ago', () => {
      const date = new Date('2026-01-10T10:00:00Z');
      expect(formatRelativeTime(date)).toContain('2026');
    });

    // Edge cases
    it('should handle 1 minute in future', () => {
      const date = new Date('2026-01-19T10:01:00Z');
      expect(formatRelativeTime(date)).toBe('dalam 1 menit');
    });

    it('should handle 1 hour in future', () => {
      const date = new Date('2026-01-19T11:00:00Z');
      expect(formatRelativeTime(date)).toBe('dalam 1 jam');
    });

    it('should handle 1 day in future', () => {
      const date = new Date('2026-01-20T10:00:00Z');
      expect(formatRelativeTime(date)).toBe('dalam 1 hari');
    });

    it('should work with ISO string', () => {
      const result = formatRelativeTime('2026-01-19T10:05:00Z');
      expect(result).toBe('dalam 5 menit');
    });

    it('should return "-" for null date', () => {
      expect(formatRelativeTime(null)).toBe('-');
    });

    it('should return "-" for undefined date', () => {
      expect(formatRelativeTime(undefined)).toBe('-');
    });

    it('should return "-" for invalid date string', () => {
      expect(formatRelativeTime('invalid-date')).toBe('-');
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration between two dates', () => {
      const start = new Date('2026-01-11T08:00:00Z');
      const end = new Date('2026-01-11T16:30:00Z');
      const duration = calculateDuration(start, end);

      expect(duration.hours).toBe(8);
      expect(duration.minutes).toBe(30);
      expect(duration.totalMinutes).toBe(510);
      expect(duration.formatted).toBe('8j 30m');
    });

    it('should handle less than 1 hour', () => {
      const start = new Date('2026-01-11T08:00:00Z');
      const end = new Date('2026-01-11T08:45:00Z');
      const duration = calculateDuration(start, end);

      expect(duration.hours).toBe(0);
      expect(duration.minutes).toBe(45);
      expect(duration.formatted).toBe('45m');
    });

    it('should handle exact hours', () => {
      const start = new Date('2026-01-11T08:00:00Z');
      const end = new Date('2026-01-11T13:00:00Z');
      const duration = calculateDuration(start, end);

      expect(duration.hours).toBe(5);
      expect(duration.minutes).toBe(0);
      expect(duration.formatted).toBe('5j');
    });

    it('should handle same start and end time', () => {
      const start = new Date('2026-01-11T08:00:00Z');
      const end = new Date('2026-01-11T08:00:00Z');
      const duration = calculateDuration(start, end);

      expect(duration.hours).toBe(0);
      expect(duration.minutes).toBe(0);
      expect(duration.formatted).toBe('0m');
    });

    it('should calculate from ISO strings', () => {
      const duration = calculateDuration(
        '2026-01-11T08:00:00Z',
        '2026-01-11T10:15:00Z'
      );

      expect(duration.hours).toBe(2);
      expect(duration.minutes).toBe(15);
    });

    it('should handle overnight duration', () => {
      const start = new Date('2026-01-11T22:00:00Z');
      const end = new Date('2026-01-12T06:00:00Z');
      const duration = calculateDuration(start, end);

      expect(duration.hours).toBe(8);
      expect(duration.minutes).toBe(0);
    });
  });

  describe('formatHours', () => {
    it('should format hours and minutes', () => {
      expect(formatHours(8, 30)).toBe('8j 30m');
      expect(formatHours(5, 0)).toBe('5j');
      expect(formatHours(0, 45)).toBe('45m');
    });

    it('should handle zero time', () => {
      expect(formatHours(0, 0)).toBe('0m');
    });

    it('should handle large hours', () => {
      expect(formatHours(24, 0)).toBe('24j');
      expect(formatHours(10, 5)).toBe('10j 5m');
    });

    it('should format decimal hours', () => {
      expect(formatHours(2.5)).toBe('2 jam 30 menit');
      expect(formatHours(3)).toBe('3 jam');
    });

    it('should handle fractional hours', () => {
      expect(formatHours(1.25)).toBe('1 jam 15 menit');
      expect(formatHours(0.5)).toBe('0 jam 30 menit');
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-19T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for today', () => {
      const today = new Date('2026-01-19T08:00:00Z');
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date('2026-01-18T10:00:00Z');
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date('2026-01-20T10:00:00Z');
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should work with ISO string', () => {
      // Use a time that will be same day in most timezones
      expect(isToday('2026-01-19T12:00:00Z')).toBe(true);
    });

    it('should return false for last year', () => {
      const lastYear = new Date('2025-01-19T10:00:00Z');
      expect(isToday(lastYear)).toBe(false);
    });
  });

  describe('getStartOfDay', () => {
    it('should return date at 00:00:00.000', () => {
      const date = new Date('2026-01-19T14:30:45.123Z');
      const startOfDay = getStartOfDay(date);

      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });

    it('should use current date when no argument provided', () => {
      const startOfDay = getStartOfDay();
      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
    });

    it('should preserve the date', () => {
      const date = new Date('2026-06-15T18:45:00Z');
      const startOfDay = getStartOfDay(date);

      expect(startOfDay.getDate()).toBe(date.getDate());
      expect(startOfDay.getMonth()).toBe(date.getMonth());
      expect(startOfDay.getFullYear()).toBe(date.getFullYear());
    });
  });

  describe('getEndOfDay', () => {
    it('should return date at 23:59:59.999', () => {
      const date = new Date('2026-01-19T10:30:00Z');
      const endOfDay = getEndOfDay(date);

      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });

    it('should use current date when no argument provided', () => {
      const endOfDay = getEndOfDay();
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
    });

    it('should preserve the date', () => {
      const date = new Date('2026-06-15T08:00:00Z');
      const endOfDay = getEndOfDay(date);

      expect(endOfDay.getDate()).toBe(date.getDate());
      expect(endOfDay.getMonth()).toBe(date.getMonth());
      expect(endOfDay.getFullYear()).toBe(date.getFullYear());
    });
  });

  describe('parseISODate', () => {
    it('should parse valid ISO string', () => {
      const result = parseISODate('2026-01-19T10:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2026);
    });

    it('should parse ISO string without timezone', () => {
      const result = parseISODate('2026-01-19T10:00:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse date only string', () => {
      const result = parseISODate('2026-01-19');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for invalid string', () => {
      const result = parseISODate('not-a-date');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseISODate('');
      expect(result).toBeNull();
    });

    it('should return null for malformed date', () => {
      const result = parseISODate('2026-13-45');
      expect(result).toBeNull();
    });

    it('should parse ISO string with offset', () => {
      const result = parseISODate('2026-01-19T10:00:00+07:00');
      expect(result).toBeInstanceOf(Date);
    });
  });
});
