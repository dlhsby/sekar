import { ApiProperty } from '@nestjs/swagger';

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
 * Response DTO for attendance endpoint
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
    type: [NotClockedInWorkerDto],
    description: 'Users who did not clock in today',
  })
  not_clocked_in: NotClockedInWorkerDto[];
}
