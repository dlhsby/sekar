import { ApiProperty } from '@nestjs/swagger';

/**
 * Area summary within a rayon
 */
export class AreaSummaryDto {
  @ApiProperty({ example: 'area-uuid' })
  id: string;

  @ApiProperty({ example: 'Taman Bungkul' })
  name: string;

  @ApiProperty({ example: 'active' })
  area_type_category: string;

  @ApiProperty({ example: 6 })
  workers_required: number;

  @ApiProperty({ example: 5 })
  workers_online: number;

  @ApiProperty({ example: 1 })
  workers_offline: number;

  @ApiProperty({ example: false })
  is_fully_staffed: boolean;

  @ApiProperty({ example: -1, description: 'Negative means understaffed' })
  staffing_delta: number;

  @ApiProperty({ example: 3 })
  tasks_pending: number;

  @ApiProperty({ example: 2 })
  tasks_in_progress: number;
}

/**
 * Shift summary within a rayon
 */
export class ShiftSummaryDto {
  @ApiProperty({ example: 'shift-uuid' })
  id: string;

  @ApiProperty({ example: 'Shift 1' })
  name: string;

  @ApiProperty({ example: '06:00' })
  start_time: string;

  @ApiProperty({ example: '15:00' })
  end_time: string;

  @ApiProperty({ example: true })
  is_current: boolean;

  @ApiProperty({ example: 48 })
  workers_required: number;

  @ApiProperty({ example: 45 })
  workers_on_shift: number;
}

/**
 * Rayon-level statistics DTO
 */
export class RayonStatsDto {
  @ApiProperty({ example: 'rayon-uuid' })
  id: string;

  @ApiProperty({ example: 'Rayon Selatan' })
  name: string;

  @ApiProperty({ example: 15 })
  total_areas: number;

  @ApiProperty({ example: 50 })
  total_workers: number;

  @ApiProperty({ example: 45 })
  workers_online: number;

  @ApiProperty({ example: 5 })
  workers_offline: number;

  @ApiProperty({ example: 10 })
  active_shifts: number;

  @ApiProperty({ example: 12 })
  tasks_pending: number;

  @ApiProperty({ example: 5 })
  tasks_in_progress: number;

  @ApiProperty({ example: 30 })
  tasks_completed_today: number;

  @ApiProperty({ example: 20 })
  activities_submitted_today: number;

  @ApiProperty({ type: [AreaSummaryDto] })
  areas: AreaSummaryDto[];

  @ApiProperty({ type: [ShiftSummaryDto] })
  shifts: ShiftSummaryDto[];

  @ApiProperty({ example: ['Taman Bungkul - needs 1 more satgas'] })
  alerts: string[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
