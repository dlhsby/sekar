import {
  classifyDay,
  projectWeeklyToDaily,
  buildEightWeekRange,
  toIsoDate,
} from '../capacityCalendar';

describe('capacityCalendar', () => {
  describe('classifyDay', () => {
    it('returns unknown when capacity is zero', () => {
      expect(classifyDay(0, 0)).toBe('unknown');
      expect(classifyDay(0, 5)).toBe('unknown');
    });

    it('returns full when booked >= capacity', () => {
      expect(classifyDay(10, 10)).toBe('full');
      expect(classifyDay(10, 15)).toBe('full');
    });

    it('returns partial at exactly 80% utilization', () => {
      expect(classifyDay(10, 8)).toBe('partial');
    });

    it('returns partial between 80% and 100%', () => {
      expect(classifyDay(10, 9)).toBe('partial');
    });

    it('returns available below 80%', () => {
      expect(classifyDay(10, 7)).toBe('available');
      expect(classifyDay(10, 0)).toBe('available');
    });
  });

  describe('toIsoDate', () => {
    it('formats local date as YYYY-MM-DD', () => {
      const d = new Date(2026, 3, 28); // 2026-04-28 local
      expect(toIsoDate(d)).toBe('2026-04-28');
    });
  });

  describe('projectWeeklyToDaily', () => {
    it('marks unknown when no row covers the week', () => {
      const start = new Date(2026, 3, 28);
      const end = new Date(2026, 3, 30);
      const days = projectWeeklyToDaily([], start, end);
      expect(days).toHaveLength(3);
      expect(days.every((d) => d.status === 'unknown')).toBe(true);
    });

    it('accepts both snake_case and camelCase row shapes', () => {
      const start = new Date(2026, 3, 27); // Monday
      const end = new Date(2026, 3, 27);
      const { week, year } = require('../../../../utils/dateUtils').getISOWeek(start);
      const days = projectWeeklyToDaily(
        [
          {
            year,
            iso_week: week,
            capacity_units: 10,
            booked_units: 5,
          },
        ],
        start,
        end,
      );
      expect(days[0].status).toBe('available');
      expect(days[0].capacity).toBe(10);
      expect(days[0].booked).toBe(5);
    });

    it('classifies full week correctly', () => {
      const start = new Date(2026, 3, 27);
      const end = new Date(2026, 3, 27);
      const { week, year } = require('../../../../utils/dateUtils').getISOWeek(start);
      const days = projectWeeklyToDaily(
        [
          {
            year,
            isoWeek: week,
            capacityUnits: 10,
            bookedUnits: 10,
          },
        ],
        start,
        end,
      );
      expect(days[0].status).toBe('full');
    });
  });

  describe('buildEightWeekRange', () => {
    it('returns 56-day inclusive window', () => {
      const today = new Date(2026, 3, 28);
      const { start, end } = buildEightWeekRange(today);
      const diff = (end.getTime() - start.getTime()) / 86400000;
      expect(Math.round(diff)).toBe(55);
    });
  });
});
