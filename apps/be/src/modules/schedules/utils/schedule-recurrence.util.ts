import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleEvent, RecurrenceConfig } from '../entities/schedule-event.entity';

/**
 * Pure utility to expand a ScheduleEvent's recurrence into concrete YYYY-MM-DD dates.
 * All date parameters and returns are in string format (YYYY-MM-DD) representing WIB days.
 *
 * Weekday convention (recurrence_config.weekdays):
 * 0=Sunday, 1=Monday, ..., 6=Saturday (matches JS Date.getDay())
 */
export class ScheduleRecurrenceUtil {
  /**
   * Expand a ScheduleEvent's recurrence into a date range [fromDate, toDate].
   * Returns array of YYYY-MM-DD strings in the expanded range.
   *
   * @param event ScheduleEvent with recurrence_type and recurrence_config
   * @param fromDate Start of range (YYYY-MM-DD), defaults to event.start_date
   * @param toDate End of range (YYYY-MM-DD), defaults to event.end_date or supplied toDate
   * @returns Sorted array of YYYY-MM-DD strings
   */
  static expandOccurrenceDates(
    event: Pick<ScheduleEvent, 'recurrence_type' | 'start_date' | 'end_date' | 'recurrence_config'>,
    fromDate?: string,
    toDate?: string,
  ): string[] {
    const from = fromDate || event.start_date;
    const to = toDate || event.end_date || fromDate || event.start_date;

    // Clamp range to [event.start_date, event.end_date ?? toDate]
    const clampFrom = this.maxDate(from, event.start_date);
    const clampTo = event.end_date ? this.minDate(to, event.end_date) : to;

    if (this.compareDate(clampFrom, clampTo) > 0) {
      return []; // Empty range
    }

    const dates: string[] = [];

    switch (event.recurrence_type) {
      case RecurrenceType.NONE:
        // Single day on start_date
        if (
          this.compareDate(event.start_date, clampFrom) >= 0 &&
          this.compareDate(event.start_date, clampTo) <= 0
        ) {
          dates.push(event.start_date);
        }
        break;

      case RecurrenceType.DAILY:
        dates.push(...this.expandDaily(clampFrom, clampTo));
        break;

      case RecurrenceType.EVERY_N_DAYS: {
        const config = event.recurrence_config as RecurrenceConfig;
        const interval = config?.interval_n ?? 1;
        dates.push(...this.expandEveryNDays(event.start_date, clampFrom, clampTo, interval));
        break;
      }

      case RecurrenceType.WEEKLY: {
        const config = event.recurrence_config as RecurrenceConfig;
        const weekdays = config?.weekdays ?? [];
        dates.push(...this.expandWeekly(clampFrom, clampTo, weekdays));
        break;
      }

      case RecurrenceType.SPECIFIC_DATES: {
        const config = event.recurrence_config as RecurrenceConfig;
        const specificDates = config?.dates ?? [];
        dates.push(
          ...specificDates.filter(
            (d) => this.compareDate(d, clampFrom) >= 0 && this.compareDate(d, clampTo) <= 0,
          ),
        );
        break;
      }
    }

    return dates.sort().filter((d, i, arr) => i === 0 || d !== arr[i - 1]); // Sort and dedupe
  }

  private static expandDaily(from: string, to: string): string[] {
    const dates: string[] = [];
    let current = from;
    while (this.compareDate(current, to) <= 0) {
      dates.push(current);
      current = this.addDays(current, 1);
    }
    return dates;
  }

  private static expandEveryNDays(
    start: string,
    from: string,
    to: string,
    interval: number,
  ): string[] {
    const dates: string[] = [];
    // Find the first occurrence >= from that is aligned to the start date
    let current = start;
    // Calculate days from start
    let dayCount = 0;
    while (this.compareDate(current, from) < 0) {
      current = this.addDays(current, 1);
      dayCount++;
    }
    // Now current >= from; check if it's aligned to interval
    const diffFromStart = this.daysDiff(start, current);
    if (diffFromStart % interval === 0) {
      // current is aligned
      while (this.compareDate(current, to) <= 0) {
        dates.push(current);
        current = this.addDays(current, interval);
      }
    } else {
      // Move to next aligned date
      const daysUntilNext = interval - (diffFromStart % interval);
      current = this.addDays(current, daysUntilNext);
      while (this.compareDate(current, to) <= 0) {
        dates.push(current);
        current = this.addDays(current, interval);
      }
    }
    return dates;
  }

  private static expandWeekly(from: string, to: string, weekdays: number[]): string[] {
    if (weekdays.length === 0) return [];
    const dates: string[] = [];
    let current = from;
    while (this.compareDate(current, to) <= 0) {
      const dayOfWeek = this.getWeekday(current);
      if (weekdays.includes(dayOfWeek)) {
        dates.push(current);
      }
      current = this.addDays(current, 1);
    }
    return dates;
  }

  private static addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  private static daysDiff(from: string, to: string): number {
    const d1 = new Date(from + 'T00:00:00Z');
    const d2 = new Date(to + 'T00:00:00Z');
    return Math.floor((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
  }

  private static compareDate(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  private static minDate(a: string, b: string): string {
    return a < b ? a : b;
  }

  private static maxDate(a: string, b: string): string {
    return a > b ? a : b;
  }

  private static getWeekday(dateStr: string): number {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.getUTCDay();
  }
}
