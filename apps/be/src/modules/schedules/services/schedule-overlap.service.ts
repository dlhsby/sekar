import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';

export interface OverlapConflict {
  schedule_id: string;
  date: string;
  shift_name: string;
}

/**
 * Checks for time-based overlaps in a user's schedule.
 * A user can have multiple non-overlapping shifts per day, but overlapping
 * time windows are rejected. Touching windows (end=start) are allowed.
 *
 * Uses half-open [start, end) semantics: touching windows (15:00 end vs 15:00 start)
 * do NOT conflict.
 *
 * For shifts that cross midnight, the real end instant extends to the next day.
 */
@Injectable()
export class ScheduleOverlapService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
  ) {}

  /**
   * Check if a candidate shift creates a time-based conflict for a user.
   *
   * @param userId User id
   * @param dateStr Schedule date (YYYY-MM-DD)
   * @param shift ShiftDefinition with start_time, end_time, crosses_midnight
   * @param opts Optional: { excludeEventId, excludeScheduleId } to ignore specific rows
   * @returns null if no conflict, or OverlapConflict if one exists
   */
  async findConflict(
    userId: string,
    dateStr: string,
    shift: ShiftDefinition,
    opts?: { excludeEventId?: string; excludeScheduleId?: string },
  ): Promise<OverlapConflict | null> {
    // Compute the time window for the candidate shift.
    const { start, end } = this.shiftWindow(dateStr, shift);

    // Query all non-deleted schedules for this user on adjacent days
    // (date-1, date, date+1) to account for midnight-crossing shifts.
    const prevDay = this.addDaysToDateStr(dateStr, -1);
    const nextDay = this.addDaysToDateStr(dateStr, 1);

    // Bounded to the 3-day window in SQL (an unbounded >= would scan the
    // user's whole future roster). Soft-deleted rows are excluded by the
    // repository's default scope.
    const existingRows = await this.scheduleRepo.find({
      where: {
        user_id: userId,
        schedule_date: Between(prevDay, nextDay),
      },
      relations: ['shift_definition'],
    });

    const relevant = existingRows.filter(
      (row) =>
        row.shift_definition_id != null &&
        // SIBLINGS ARE NOT CONFLICTS (ADR-053). Another row for the SAME shift is
        // the same stretch of time at a different place — the worker covering
        // lokasi A then lokasi B during one shift. Flagging those as overlapping
        // would warn on every multi-place day, which is now the normal case. A
        // genuine conflict is a DIFFERENT shift whose window overlaps.
        row.shift_definition_id !== shift.id &&
        (!opts?.excludeScheduleId || row.id !== opts.excludeScheduleId) &&
        (!opts?.excludeEventId || row.schedule_event_id !== opts.excludeEventId),
    );

    // Check each row for time overlap.
    for (const row of relevant) {
      if (!row.shift_definition) continue; // Loaded but null (shouldn't happen)

      const { start: existStart, end: existEnd } = this.shiftWindow(
        row.schedule_date,
        row.shift_definition,
      );

      if (this.windowsOverlap(start, end, existStart, existEnd)) {
        return {
          schedule_id: row.id,
          date: row.schedule_date,
          shift_name: row.shift_definition.name,
        };
      }
    }

    return null;
  }

  /**
   * Compute [start, end) instants for a shift on a given date.
   * Returns ISO strings in UTC, with midnight-crossing shifts extended to the next day.
   */
  private shiftWindow(dateStr: string, shift: ShiftDefinition): { start: string; end: string } {
    // INVARIANT (do not "fix" this by subtracting the WIB offset): shift start/end
    // are WIB civil times and are placed on the same UTC calendar day using
    // setUTCHours. This shifts every window by the same +7h, so it is NOT the real
    // UTC instant — but it is a *consistent* clock shared by all windows compared
    // here, which is all `windowsOverlap` needs (relative ordering + midnight
    // crossing are preserved). Overlap detection is comparison-only, never wall-clock.
    const date = new Date(dateStr + 'T12:00:00Z');

    // Parse HH:MM:SS
    const [startHh, startMm, startSs] = shift.start_time.split(':').map(Number);
    const [endHh, endMm, endSs] = shift.end_time.split(':').map(Number);

    // Create start instant on this date
    const startDate = new Date(date);
    startDate.setUTCHours(startHh, startMm, startSs, 0);

    // Create end instant, possibly on next day
    let endDate = new Date(date);
    endDate.setUTCHours(endHh, endMm, endSs, 0);
    if (shift.crosses_midnight) {
      endDate.setUTCDate(endDate.getUTCDate() + 1);
    }

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };
  }

  /**
   * Check if two half-open intervals [a1, a2) and [b1, b2) overlap.
   * Touching intervals (a2 == b1) do NOT overlap.
   */
  private windowsOverlap(a1: string, a2: string, b1: string, b2: string): boolean {
    // Parse ISO 8601 timestamps
    const a1Time = new Date(a1).getTime();
    const a2Time = new Date(a2).getTime();
    const b1Time = new Date(b1).getTime();
    const b2Time = new Date(b2).getTime();

    // [a1, a2) and [b1, b2) overlap iff a1 < b2 AND b1 < a2
    // (using strict inequality to allow touching)
    return a1Time < b2Time && b1Time < a2Time;
  }

  private addDaysToDateStr(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }
}
