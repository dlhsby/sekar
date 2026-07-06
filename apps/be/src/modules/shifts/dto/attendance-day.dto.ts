import { ApiProperty } from '@nestjs/swagger';
import { Shift } from '../entities/shift.entity';

/**
 * One calendar day (WIB) of a user's attendance, summarized for the list view.
 * Regular shifts only — overtime is excluded (it has its own listing).
 */
export class AttendanceDaySummaryDto {
  @ApiProperty({ description: 'Calendar day in WIB', example: '2026-06-22' })
  date: string;

  @ApiProperty({
    description: 'Earliest clock-in of the day (ISO 8601)',
    example: '2026-06-22T01:05:00.000Z',
  })
  first_clock_in: string;

  @ApiProperty({
    description: 'Latest clock-out of the day (ISO 8601), or null if a shift is still active',
    example: '2026-06-22T10:02:00.000Z',
    nullable: true,
  })
  last_clock_out: string | null;

  @ApiProperty({ description: 'Number of shifts that day', example: 2 })
  shift_count: number;

  @ApiProperty({
    description: 'Total worked minutes that day (active shift counted up to now)',
    example: 480,
  })
  total_worked_minutes: number;

  @ApiProperty({
    description: "Scheduled start (HH:mm[:ss]) of the day's earliest shift, for the late check",
    example: '06:00:00',
    nullable: true,
  })
  scheduled_start_time: string | null;

  @ApiProperty({
    description: "Whether the earliest shift's definition crosses midnight",
    example: false,
  })
  crosses_midnight: boolean;

  @ApiProperty({
    description: 'Whether the first clock-in was after the scheduled start (computed in WIB)',
    example: false,
  })
  is_late: boolean;

  @ApiProperty({ description: 'Whether any shift that day is still active', example: false })
  has_active: boolean;
}

/**
 * All of a user's regular shifts on one WIB calendar day (for the detail view).
 */
export class AttendanceDayDetailDto {
  @ApiProperty({ description: 'Calendar day in WIB', example: '2026-06-22' })
  date: string;

  @ApiProperty({ description: "That day's shifts, newest first", type: () => [Shift] })
  shifts: Shift[];
}
