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
  @ApiProperty({ description: 'Worker UUID' })
  id: string;

  @ApiProperty({ description: 'Worker username', example: 'worker1' })
  username: string;

  @ApiProperty({ description: 'Worker full name', example: 'Worker One' })
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
    description: 'Total number of active workers',
    example: 10,
  })
  total_workers: number;

  @ApiProperty({
    description: 'Number of workers who clocked in today',
    example: 8,
  })
  clocked_in_count: number;

  @ApiProperty({
    type: [NotClockedInWorkerDto],
    description: 'Workers who did not clock in today',
  })
  not_clocked_in: NotClockedInWorkerDto[];
}
