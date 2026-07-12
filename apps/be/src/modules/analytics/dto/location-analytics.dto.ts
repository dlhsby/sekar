import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LocationAnalyticsDto {
  @ApiProperty({ description: 'Location ID', example: 'area-123' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Location name', example: 'Taman Utara' })
  @Expose()
  area_name: string;

  @ApiProperty({ description: 'Analytics date', example: '2026-06-16' })
  @Expose()
  date: string;

  @ApiProperty({ description: 'Workers who attended today', example: 5 })
  @Expose()
  attended_workers: number;

  @ApiProperty({ description: 'Required staff count for area', example: 6 })
  @Expose()
  required_workers: number;

  @ApiProperty({ description: 'Staffing coverage (%)', example: 83.3 })
  @Expose()
  staffing_coverage: number;

  @ApiProperty({ description: 'Open (non-completed) tasks', example: 8 })
  @Expose()
  open_tasks: number;

  @ApiProperty({ description: 'Maintenance records today', example: 2 })
  @Expose()
  maintenance_count: number;

  @ApiProperty({ description: 'Incident rate (incidents/day)', example: 0.5 })
  @Expose()
  incident_rate: number;

  @ApiProperty({ description: 'Average worker performance score (0-100)', example: 82.5 })
  @Expose()
  avg_worker_performance: number;

  @ApiPropertyOptional({ description: 'Last updated timestamp', example: '2026-06-16T10:00:00Z' })
  @Expose()
  last_updated?: string;
}
