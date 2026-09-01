import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Grade } from '../services/performance-score.service';

export class WorkerAnalyticsDto {
  @ApiProperty({ description: 'Worker ID', example: 'user-123' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Worker full name' })
  @Expose()
  full_name: string;

  @ApiProperty({ description: 'Analytics date', example: '2026-06-16' })
  @Expose()
  date: string;

  @ApiProperty({ description: 'Days attended', example: 20 })
  @Expose()
  attended: number;

  @ApiProperty({ description: 'Average late minutes', example: 5 })
  @Expose()
  late_minutes: number;

  @ApiProperty({ description: 'Total tasks assigned', example: 15 })
  @Expose()
  total_tasks: number;

  @ApiProperty({ description: 'Tasks completed', example: 14 })
  @Expose()
  completed_tasks: number;

  @ApiProperty({ description: 'Task completion rate (%)', example: 93.3 })
  @Expose()
  task_completion_rate: number;

  @ApiProperty({ description: 'Days with activities submitted', example: 18 })
  @Expose()
  total_activities: number;

  @ApiProperty({ description: 'Activities approved', example: 17 })
  @Expose()
  approved_activities: number;

  @ApiProperty({ description: 'Activity submission rate (%)', example: 90 })
  @Expose()
  activity_submission_rate: number;

  @ApiProperty({ description: 'Activity approval rate (%)', example: 94.4 })
  @Expose()
  activity_approval_rate: number;

  @ApiProperty({ description: 'GPS pings within area', example: 450 })
  @Expose()
  within_area_pings: number;

  @ApiProperty({ description: 'Total GPS pings', example: 480 })
  @Expose()
  total_pings: number;

  @ApiProperty({ description: 'Location compliance rate (%)', example: 93.75 })
  @Expose()
  area_compliance: number;

  @ApiProperty({ description: 'Overtime hours', example: 12.5 })
  @Expose()
  overtime_hours: number;

  @ApiProperty({ description: 'Composite performance score (0-100)', example: 88 })
  @Expose()
  performance_score: number;

  @ApiProperty({ description: 'Performance grade (A-F)', example: 'B' })
  @Expose()
  grade: Grade;

  @ApiPropertyOptional({ description: 'Last updated timestamp', example: '2026-06-16T10:00:00Z' })
  @Expose()
  last_updated?: string;
}
