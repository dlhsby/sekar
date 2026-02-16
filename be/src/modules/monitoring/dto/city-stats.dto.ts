import { ApiProperty } from '@nestjs/swagger';

/**
 * Rayon summary for city-wide stats
 */
export class RayonSummaryDto {
  @ApiProperty({ example: 'rayon-uuid' })
  id: string;

  @ApiProperty({ example: 'Rayon Selatan' })
  name: string;

  @ApiProperty({ example: 'SELATAN' })
  code: string;

  @ApiProperty({ example: 15 })
  area_count: number;

  @ApiProperty({ example: 50 })
  worker_count: number;

  @ApiProperty({ example: 45 })
  workers_online: number;

  @ApiProperty({ example: 5 })
  workers_offline: number;

  @ApiProperty({ example: 48 })
  workers_required: number;

  @ApiProperty({ example: true })
  is_fully_staffed: boolean;
}

/**
 * City-wide statistics DTO
 */
export class CityStatsDto {
  @ApiProperty({ example: 7 })
  total_rayons: number;

  @ApiProperty({ example: 105 })
  total_areas: number;

  @ApiProperty({ example: 350 })
  total_workers: number;

  @ApiProperty({ example: 310 })
  workers_online: number;

  @ApiProperty({ example: 40 })
  workers_offline: number;

  @ApiProperty({ example: 15 })
  active_shifts: number;

  @ApiProperty({ example: 25 })
  tasks_pending: number;

  @ApiProperty({ example: 10 })
  tasks_in_progress: number;

  @ApiProperty({ example: 85 })
  tasks_completed_today: number;

  @ApiProperty({ example: 45 })
  activities_submitted_today: number;

  @ApiProperty({ type: [RayonSummaryDto] })
  rayons: RayonSummaryDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
