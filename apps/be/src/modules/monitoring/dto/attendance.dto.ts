import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

/**
 * Attendance DTOs for the monitoring module.
 *
 * Deliberately NOT imported from `supervisor`: that module is superseded and
 * importing its DTOs would make monitoring depend on the thing it replaces. The
 * SHAPE is kept identical so a client can move between the two endpoints
 * without a type change, which is what makes the mobile migration a one-line
 * swap later.
 */

export class AttendanceQueryDto {
  @ApiProperty({
    required: false,
    description: 'Date in YYYY-MM-DD (WIB). Defaults to today in WIB.',
    example: '2026-03-05',
  })
  @IsOptional()
  @IsString()
  // Rejected rather than coerced: a malformed date silently falling back to
  // "today" is how someone reads yesterday's numbers believing they are old.
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class AttendanceLocationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class ClockedInWorkerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty({ description: 'Role code (lowercase), e.g. satgas / linmas' })
  role: string;

  @ApiProperty({ type: AttendanceLocationDto, nullable: true })
  area: AttendanceLocationDto | null;

  @ApiProperty()
  clock_in_time: string;

  @ApiProperty({ nullable: true })
  clock_out_time: string | null;
}

export class NotClockedInWorkerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty({ description: 'Role code (lowercase), e.g. satgas / linmas' })
  role: string;

  @ApiProperty({ type: AttendanceLocationDto, nullable: true })
  area: AttendanceLocationDto | null;
}

export class MonitoringAttendanceDto {
  @ApiProperty({ description: 'The WIB calendar day these figures describe' })
  date: string;

  @ApiProperty({ description: 'Size of the counted roster (satgas + linmas)' })
  total_workers: number;

  @ApiProperty()
  clocked_in_count: number;

  @ApiProperty({ type: PaginatedResponseDto })
  clocked_in: PaginatedResponseDto<ClockedInWorkerDto>;

  @ApiProperty({ type: PaginatedResponseDto })
  not_clocked_in: PaginatedResponseDto<NotClockedInWorkerDto>;
}

export class UserShiftDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  clock_in_time: string;

  @ApiProperty({ nullable: true })
  clock_out_time: string | null;

  @ApiProperty({ nullable: true, description: 'Null while the shift is still open' })
  duration_minutes: number | null;

  @ApiProperty()
  clock_in_outside_boundary: boolean;

  @ApiProperty()
  clock_out_outside_boundary: boolean;
}

export class UserAttendanceUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  full_name: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ type: AttendanceLocationDto, nullable: true })
  area: AttendanceLocationDto | null;
}

export class UserAttendanceDetailDto {
  @ApiProperty()
  date: string;

  @ApiProperty({ type: UserAttendanceUserDto })
  user: UserAttendanceUserDto;

  @ApiProperty()
  clocked_in: boolean;

  @ApiProperty({
    type: [UserShiftDetailDto],
    description:
      'Every shift on the day, earliest first. A list rather than one shift: a worker can clock in twice (break, area change), and the old single-shift shape hid the second.',
  })
  shifts: UserShiftDetailDto[];
}
