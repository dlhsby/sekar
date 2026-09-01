import { ScheduleRecurrenceUtil } from './schedule-recurrence.util';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleEvent } from '../entities/schedule-event.entity';

describe('ScheduleRecurrenceUtil', () => {
  describe('expandOccurrenceDates - none', () => {
    it('should return single date for none type', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-01',
        '2026-07-31',
      );
      expect(result).toEqual(['2026-07-15']);
    });

    it('should return empty if none start_date is outside range', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-16',
        '2026-07-31',
      );
      expect(result).toEqual([]);
    });

    it('should use start_date as default fromDate', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        undefined,
        '2026-07-31',
      );
      expect(result).toEqual(['2026-07-15']);
    });
  });

  describe('expandOccurrenceDates - daily', () => {
    it('should expand daily for full range', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.DAILY,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-18',
      );
      expect(result).toEqual(['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18']);
    });

    it('should respect end_date from event', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.DAILY,
        start_date: '2026-07-15',
        end_date: '2026-07-17',
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-31',
      );
      expect(result).toEqual(['2026-07-15', '2026-07-16', '2026-07-17']);
    });

    it('should return empty if range before start_date', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.DAILY,
        start_date: '2026-07-20',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-10',
        '2026-07-15',
      );
      expect(result).toEqual([]);
    });
  });

  describe('expandOccurrenceDates - every_n_days', () => {
    it('should expand every 2 days', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.EVERY_N_DAYS,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: { interval_n: 2 },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-24',
      );
      expect(result).toEqual([
        '2026-07-15',
        '2026-07-17',
        '2026-07-19',
        '2026-07-21',
        '2026-07-23',
      ]);
    });

    it('should align to start_date when from is later', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.EVERY_N_DAYS,
        start_date: '2026-07-15', // 0 mod 2
        end_date: null,
        recurrence_config: { interval_n: 2 },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-16', // Start from day after start
        '2026-07-24',
      );
      // Should skip 2026-07-16 (not aligned), start from 2026-07-17
      expect(result).toEqual(['2026-07-17', '2026-07-19', '2026-07-21', '2026-07-23']);
    });

    it('should expand every 3 days', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.EVERY_N_DAYS,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: { interval_n: 3 },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-30',
      );
      expect(result).toEqual([
        '2026-07-15',
        '2026-07-18',
        '2026-07-21',
        '2026-07-24',
        '2026-07-27',
        '2026-07-30',
      ]);
    });
  });

  describe('expandOccurrenceDates - weekly', () => {
    it('should expand for specified weekdays', () => {
      // 2026-07-13 is Monday (1), 2026-07-15 is Wednesday (3), 2026-07-17 is Friday (5)
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.WEEKLY,
        start_date: '2026-07-13',
        end_date: null,
        recurrence_config: { weekdays: [1, 3, 5] }, // Mon, Wed, Fri
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-13',
        '2026-07-19',
      );
      expect(result).toEqual(['2026-07-13', '2026-07-15', '2026-07-17']);
    });

    it('should handle Sunday (0) correctly', () => {
      // 2026-07-12 is Sunday (0)
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.WEEKLY,
        start_date: '2026-07-12',
        end_date: null,
        recurrence_config: { weekdays: [0] }, // Sunday only
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-12',
        '2026-07-26',
      );
      expect(result).toEqual(['2026-07-12', '2026-07-19', '2026-07-26']);
    });

    it('should return empty if no matching weekdays', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.WEEKLY,
        start_date: '2026-07-13',
        end_date: null,
        recurrence_config: { weekdays: [] },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-13',
        '2026-07-19',
      );
      expect(result).toEqual([]);
    });
  });

  describe('expandOccurrenceDates - specific_dates', () => {
    it('should use supplied dates within range', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.SPECIFIC_DATES,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: { dates: ['2026-07-15', '2026-07-17', '2026-07-20'] },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-16',
        '2026-07-20',
      );
      expect(result).toEqual(['2026-07-17', '2026-07-20']);
    });

    it('should filter dates outside range', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.SPECIFIC_DATES,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: { dates: ['2026-07-10', '2026-07-15', '2026-07-20', '2026-07-25'] },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-20',
      );
      expect(result).toEqual(['2026-07-15', '2026-07-20']);
    });
  });

  describe('edge cases', () => {
    it('should clamp fromDate to start_date', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.DAILY,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-10', // Before start_date
        '2026-07-18',
      );
      expect(result[0]).toBe('2026-07-15');
    });

    it('should handle open-ended end_date correctly', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.DAILY,
        start_date: '2026-07-15',
        end_date: null, // Open-ended
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-18',
      );
      expect(result).toEqual(['2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18']);
    });

    it('should deduplicate results', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.SPECIFIC_DATES,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: { dates: ['2026-07-15', '2026-07-15', '2026-07-17'] },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-18',
      );
      expect(result).toEqual(['2026-07-15', '2026-07-17']);
    });

    it('should return sorted dates', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.SPECIFIC_DATES,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: { dates: ['2026-07-20', '2026-07-15', '2026-07-17'] },
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-20',
      );
      expect(result).toEqual(['2026-07-15', '2026-07-17', '2026-07-20']);
    });

    it('should handle empty range', () => {
      const event: Partial<ScheduleEvent> = {
        recurrence_type: RecurrenceType.DAILY,
        start_date: '2026-07-20',
        end_date: null,
        recurrence_config: null,
      };
      const result = ScheduleRecurrenceUtil.expandOccurrenceDates(
        event as ScheduleEvent,
        '2026-07-25',
        '2026-07-24', // fromDate > toDate
      );
      expect(result).toEqual([]);
    });
  });
});
