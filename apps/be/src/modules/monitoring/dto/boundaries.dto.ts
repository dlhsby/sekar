import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RoleStaffingItemDto {
  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiProperty({ example: 3 })
  required: number;

  @ApiProperty({ example: 2 })
  active: number;
}

export class AreaBoundaryDto {
  @ApiProperty({ example: 'area-uuid' })
  id: string;

  @ApiProperty({ example: 'Taman Bungkul' })
  name: string;

  @ApiPropertyOptional()
  boundary_polygon: object | null;

  @ApiProperty({ example: -7.2575 })
  center_lat: number;

  @ApiProperty({ example: 112.7521 })
  center_lng: number;

  @ApiProperty({ example: 'rayon-uuid' })
  rayon_id: string | null;

  @ApiProperty({ example: 'Rayon Selatan' })
  rayon_name: string;

  @ApiPropertyOptional({ example: 200 })
  radius_meters: number | null;

  @ApiProperty({ example: 6 })
  assigned_count: number;

  @ApiProperty({ example: false })
  is_understaffed: boolean;

  @ApiProperty({ type: [RoleStaffingItemDto] })
  staffing_summary: RoleStaffingItemDto[];
}

export class RayonBoundaryDto {
  @ApiProperty({ example: 'rayon-uuid' })
  id: string;

  @ApiProperty({ example: 'Rayon Selatan' })
  name: string;

  /** Boundary tint for the monitoring map — derived from the rayon's per-level
   *  styling (`border_color`, falling back to `fill_color`). */
  @ApiPropertyOptional({ example: '#7FBC8C' })
  color: string | null;

  @ApiPropertyOptional()
  boundary_polygon: object | null;

  @ApiProperty({ example: -7.2575 })
  center_lat: number | null;

  @ApiProperty({ example: 112.7521 })
  center_lng: number | null;

  @ApiProperty({ example: 5 })
  area_count: number;

  @ApiProperty({ example: false })
  is_understaffed: boolean;

  @ApiProperty({ example: 1 })
  understaffed_area_count: number;

  @ApiProperty({ type: [AreaBoundaryDto] })
  areas: AreaBoundaryDto[];
}

export class BoundariesResponseDto {
  @ApiProperty({ type: [RayonBoundaryDto] })
  rayons: RayonBoundaryDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
