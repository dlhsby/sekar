import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OperationalAnalyticsDto {
  @ApiProperty({ description: 'Analytics date', example: '2026-06-16' })
  @Expose()
  date: string;

  @ApiProperty({ description: 'System-wide attendance rate (%)', example: 85.5 })
  @Expose()
  system_attendance: number;

  @ApiProperty({ description: 'Tasks completed per day', example: 42 })
  @Expose()
  task_throughput: number;

  @ApiProperty({ description: 'Average task completion time (hours)', example: 4.2 })
  @Expose()
  avg_response_hours: number;

  @ApiProperty({ description: 'Overtime ratio (overtime hours / regular hours)', example: 0.08 })
  @Expose()
  overtime_ratio: number;

  @ApiProperty({ description: 'Worker utilization (%)', example: 92.3 })
  @Expose()
  worker_utilization: number;

  @ApiProperty({ description: 'System-wide geofence compliance (%)', example: 94.1 })
  @Expose()
  geofence_compliance: number;

  @ApiPropertyOptional({ description: 'Last updated timestamp', example: '2026-06-16T10:00:00Z' })
  @Expose()
  last_updated?: string;
}
