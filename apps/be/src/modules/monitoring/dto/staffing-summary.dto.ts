import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class StaffingSummaryQueryDto {
  @ApiPropertyOptional({ example: 'rayon-uuid' })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiPropertyOptional({ example: 'area-uuid' })
  @IsUUID()
  @IsOptional()
  location_id?: string;
}

export class DayTypeRequirementsDto {
  @ApiProperty({ example: 6 })
  weekday: number;

  @ApiProperty({ example: 4 })
  weekend: number;

  @ApiProperty({ example: 3 })
  holiday: number;
}

export class RoleStaffingDto {
  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiProperty({ example: 3, description: 'Clocked in, location fresher than the threshold' })
  active: number;

  @ApiProperty({
    example: 1,
    description: 'Clocked in but unreachable — location older than the threshold, or none at all',
  })
  offline: number;

  @ApiProperty({
    example: 2,
    description: 'Not clocked in. Reads as "tidak hadir" only where a schedule exists for today',
  })
  absent: number;

  @ApiProperty({
    example: 0,
    description:
      'Axis, NOT a status: how many of the above are outside their assigned boundary. Overlaps active/offline rather than partitioning them',
  })
  outside_area: number;

  @ApiProperty({ example: 6 })
  total_assigned: number;

  @ApiProperty({ example: 5 })
  total_required: number;

  @ApiProperty({ type: DayTypeRequirementsDto })
  requirements_by_day_type: DayTypeRequirementsDto;
}

export class StaffingSummaryItemDto {
  @ApiProperty({ example: 'area-uuid' })
  id: string;

  @ApiProperty({ example: 'Taman Bungkul' })
  name: string;

  @ApiProperty({ example: 'area', enum: ['rayon', 'area'] })
  type: 'rayon' | 'area';

  @ApiProperty({ type: [RoleStaffingDto] })
  roles: RoleStaffingDto[];

  @ApiProperty({ example: 3 })
  total_active: number;

  @ApiProperty({ example: 1 })
  total_offline: number;

  @ApiProperty({ example: 2 })
  total_absent: number;

  /** Axis, not a status — see {@link RoleStaffingDto.outside_area}. */
  @ApiProperty({ example: 0 })
  total_outside_area: number;

  @ApiProperty({ example: true })
  is_fully_staffed: boolean;
}

export class StaffingSummaryResponseDto {
  @ApiProperty({ type: [StaffingSummaryItemDto] })
  items: StaffingSummaryItemDto[];

  @ApiProperty({ example: 'WEEKDAY', enum: ['WEEKDAY', 'WEEKEND', 'HOLIDAY'] })
  current_day_type: string;

  @ApiProperty({ example: 'Hari Kerja' })
  current_day_type_label: string;

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
