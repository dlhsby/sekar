import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { CLOCKABLE_ROLES } from '../../users/constants/role-groups';
import { TrackingStatus } from '../entities/user-tracking-status.entity';

export class LiveUserDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @ApiProperty({ example: '08123456789', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'satgas' })
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

  @ApiProperty({ enum: TrackingStatus, example: 'active' })
  status: TrackingStatus;

  @ApiProperty({ example: true })
  is_within_area: boolean;

  @ApiProperty({ example: false, description: 'Whether user clocked in outside area boundary' })
  outside_boundary: boolean;

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

export class LiveUsersFilterDto {
  @ApiPropertyOptional({ description: 'Filter by rayon ID' })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiPropertyOptional({ description: 'Filter by area ID' })
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiPropertyOptional({ description: 'Filter by role', enum: CLOCKABLE_ROLES })
  @IsEnum(CLOCKABLE_ROLES)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by tracking status', enum: TrackingStatus })
  @IsEnum(TrackingStatus)
  @IsOptional()
  status?: TrackingStatus;
}

export class LiveUsersResponseDto {
  @ApiProperty({ example: 30 })
  total_active: number;

  @ApiProperty({ example: 10 })
  total_inactive: number;

  @ApiProperty({ example: 3 })
  total_outside_area: number;

  @ApiProperty({ example: 2 })
  total_missing: number;

  @ApiProperty({ example: 5 })
  total_offline: number;

  @ApiProperty({ type: [LiveUserDto] })
  users: LiveUserDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
