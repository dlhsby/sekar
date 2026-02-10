import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';

/**
 * Live worker position data
 */
export class LiveWorkerDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @ApiProperty({ example: 'worker' })
  role: string;

  @ApiProperty({ example: 'area-uuid', nullable: true })
  area_id: string | null;

  @ApiProperty({ example: 'Taman Bungkul' })
  area_name: string;

  @ApiProperty({ example: 'rayon-uuid' })
  rayon_id: string | null;

  @ApiProperty({ example: 'Rayon Selatan' })
  rayon_name: string | null;

  @ApiProperty({ example: -7.2575 })
  latitude: number;

  @ApiProperty({ example: 112.7521 })
  longitude: number;

  @ApiProperty({ example: 15.5, description: 'GPS accuracy in meters' })
  accuracy: number | null;

  @ApiProperty({ example: 85, description: 'Battery level percentage' })
  battery_level: number | null;

  @ApiProperty({ example: '2024-01-24T10:25:00Z' })
  last_update: Date;

  @ApiProperty({ example: true })
  is_within_area: boolean;

  @ApiProperty({ example: 'shift-uuid' })
  shift_id: string;

  @ApiProperty({ example: 'Shift 1' })
  shift_name: string;

  @ApiProperty({ example: '2024-01-24T06:00:00Z' })
  clock_in_time: Date;

  @ApiProperty({ example: 'in_progress' })
  current_task_status: string | null;

  @ApiProperty({ example: 'Clean fountain area' })
  current_task_title: string | null;
}

/**
 * Filter for live workers query
 */
export class LiveWorkersFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by rayon ID',
    example: 'rayon-uuid',
  })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by area ID',
    example: 'area-uuid',
  })
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by role',
    enum: ['worker', 'linmas'],
    example: 'worker',
  })
  @IsEnum(['worker', 'linmas'])
  @IsOptional()
  role?: string;
}

/**
 * Live workers response DTO
 */
export class LiveWorkersResponseDto {
  @ApiProperty({ example: 45 })
  total_online: number;

  @ApiProperty({ example: 5 })
  total_offline: number;

  @ApiProperty({ type: [LiveWorkerDto] })
  workers: LiveWorkerDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
