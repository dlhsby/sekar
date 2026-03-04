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
  area_id?: string;
}

export class RoleStaffingDto {
  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiProperty({ example: 3 })
  active: number;

  @ApiProperty({ example: 1 })
  idle: number;

  @ApiProperty({ example: 0 })
  outside_area: number;

  @ApiProperty({ example: 0 })
  missing: number;

  @ApiProperty({ example: 2 })
  offline: number;

  @ApiProperty({ example: 6 })
  total_assigned: number;

  @ApiProperty({ example: 5 })
  total_required: number;
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
  total_idle: number;

  @ApiProperty({ example: 0 })
  total_outside_area: number;

  @ApiProperty({ example: 0 })
  total_missing: number;

  @ApiProperty({ example: 2 })
  total_offline: number;

  @ApiProperty({ example: true })
  is_fully_staffed: boolean;
}

export class StaffingSummaryResponseDto {
  @ApiProperty({ type: [StaffingSummaryItemDto] })
  items: StaffingSummaryItemDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
