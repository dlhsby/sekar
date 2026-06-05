import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';

/**
 * DTO for area info in attendance
 */
export class AttendanceAreaDto {
  @ApiProperty({ description: 'Area UUID' })
  id: string;

  @ApiProperty({ description: 'Area name', example: 'Taman Bungkul' })
  name: string;
}

/**
 * DTO for workers who clocked in
 */
export class ClockedInWorkerDto {
  @ApiProperty({ description: 'User UUID' })
  id: string;

  @ApiProperty({ description: 'User username', example: 'satgas1' })
  username: string;

  @ApiProperty({ description: 'User full name', example: 'Satgas One' })
  full_name: string;

  @ApiProperty({
    type: AttendanceAreaDto,
    description: 'Area (from shift or user assignment)',
    nullable: true,
  })
  area: AttendanceAreaDto | null;

  @ApiProperty({
    description: 'Clock-in time (ISO format)',
    example: '2026-01-09T08:00:00.000Z',
  })
  clock_in_time: string;

  @ApiProperty({
    description: 'Clock-out time (ISO format), or null if still clocked in',
    example: '2026-01-09T16:00:00.000Z',
    nullable: true,
  })
  clock_out_time: string | null;
}

/**
 * DTO for workers who did not clock in
 */
export class NotClockedInWorkerDto {
  @ApiProperty({ description: 'User UUID' })
  id: string;

  @ApiProperty({ description: 'User username', example: 'satgas1' })
  username: string;

  @ApiProperty({ description: 'User full name', example: 'Satgas One' })
  full_name: string;

  @ApiProperty({
    type: AttendanceAreaDto,
    description: 'Assigned area',
    nullable: true,
  })
  area: AttendanceAreaDto | null;
}

/**
 * DTO for per-user shift details
 */
export class UserShiftDetailDto {
  @ApiProperty({ description: 'Shift UUID' })
  id: string;

  @ApiProperty({
    description: 'Clock-in time (ISO format)',
    example: '2026-01-09T08:00:00.000Z',
  })
  clock_in_time: string;

  @ApiProperty({
    description: 'Clock-out time (ISO format), or null if still clocked in',
    example: '2026-01-09T16:00:00.000Z',
    nullable: true,
  })
  clock_out_time: string | null;

  @ApiProperty({
    description: 'Duration of shift in minutes, or null if still clocked in',
    example: 480,
    nullable: true,
  })
  duration_minutes: number | null;

  @ApiProperty({
    description: 'Whether user was outside area boundary at clock-in',
    example: false,
  })
  clock_in_outside_boundary: boolean;

  @ApiProperty({
    description: 'Whether user was outside area boundary at clock-out',
    example: false,
  })
  clock_out_outside_boundary: boolean;
}

/**
 * DTO for user info in attendance detail
 */
export class UserAttendanceDetailUserDto {
  @ApiProperty({ description: 'User UUID' })
  id: string;

  @ApiProperty({ description: 'User username', example: 'satgas1' })
  username: string;

  @ApiProperty({ description: 'User full name', example: 'Satgas One' })
  full_name: string;

  @ApiProperty({ description: 'User role', example: 'satgas' })
  role: string;

  @ApiProperty({
    type: AttendanceAreaDto,
    description: 'Assigned area',
    nullable: true,
  })
  area: AttendanceAreaDto | null;
}

/**
 * DTO for user attendance detail (per-date, per-user query)
 */
export class UserAttendanceDetailDto {
  @ApiProperty({
    description: 'Date of attendance (ISO format)',
    example: '2026-01-09',
  })
  date: string;

  @ApiProperty({
    type: UserAttendanceDetailUserDto,
    description: 'User details',
  })
  user: UserAttendanceDetailUserDto;

  @ApiProperty({
    description: 'Whether user clocked in on this date',
    example: true,
  })
  clocked_in: boolean;

  @ApiProperty({
    type: UserShiftDetailDto,
    description: 'Shift details if clocked in, null otherwise',
    nullable: true,
  })
  shift: UserShiftDetailDto | null;
}

/**
 * Response DTO for attendance endpoint (paginated)
 */
export class AttendanceResponseDto {
  @ApiProperty({
    description: 'Date of attendance report (ISO format)',
    example: '2026-01-09',
  })
  date: string;

  @ApiProperty({
    description: 'Total number of active users',
    example: 10,
  })
  total_workers: number;

  @ApiProperty({
    description: 'Number of users who clocked in today',
    example: 8,
  })
  clocked_in_count: number;

  @ApiProperty({
    description: 'Paginated list of clocked-in workers',
    isArray: true,
  })
  clocked_in: PaginatedResponseDto<ClockedInWorkerDto>;

  @ApiProperty({
    description: 'Paginated list of workers who did not clock in',
    isArray: true,
  })
  not_clocked_in: PaginatedResponseDto<NotClockedInWorkerDto>;
}
