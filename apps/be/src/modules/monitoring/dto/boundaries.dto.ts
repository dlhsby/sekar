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

  /** Per-entity styling (ADR-045). Border + fill are drawn separately on the
   *  map — the border is the outline, the fill tints the interior. */
  @ApiPropertyOptional({ example: '#2D5233' })
  border_color: string | null;

  @ApiPropertyOptional({ example: '#7FBC8C' })
  fill_color: string | null;

  @ApiPropertyOptional({ example: 0.9 })
  border_opacity: number | null;

  @ApiPropertyOptional({ example: 0.25 })
  fill_opacity: number | null;

  @ApiProperty({ example: -7.2575 })
  center_lat: number;

  @ApiProperty({ example: 112.7521 })
  center_lng: number;

  @ApiProperty({ example: 'district-uuid' })
  district_id: string | null;

  @ApiProperty({ example: 'Rayon Selatan' })
  district_name: string;

  @ApiProperty({ example: 6 })
  assigned_count: number;

  @ApiProperty({ example: false })
  is_understaffed: boolean;

  @ApiProperty({ type: [RoleStaffingItemDto] })
  staffing_summary: RoleStaffingItemDto[];
}

export class RegionBoundaryDto {
  @ApiProperty({ example: 'region-uuid' })
  id: string;

  @ApiProperty({ example: 'Kawasan Menur dan Manyar' })
  name: string;

  @ApiPropertyOptional({ example: '#2D5233' })
  border_color: string | null;

  @ApiPropertyOptional({ example: '#7FBC8C' })
  fill_color: string | null;

  @ApiPropertyOptional({ example: 0.9 })
  border_opacity: number | null;

  @ApiPropertyOptional({ example: 0.25 })
  fill_opacity: number | null;

  @ApiPropertyOptional()
  boundary_polygon: object | null;

  @ApiProperty({ example: -7.2575 })
  center_lat: number | null;

  @ApiProperty({ example: 112.7521 })
  center_lng: number | null;
}

export class DistrictBoundaryDto {
  @ApiProperty({ example: 'district-uuid' })
  id: string;

  @ApiProperty({ example: 'Rayon Selatan' })
  name: string;

  @ApiPropertyOptional({ example: '#af1dd7' })
  border_color: string | null;

  @ApiPropertyOptional({ example: '#FFFF00' })
  fill_color: string | null;

  @ApiPropertyOptional({ example: 0.9 })
  border_opacity: number | null;

  @ApiPropertyOptional({ example: 0.18 })
  fill_opacity: number | null;

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

  /** Kawasan (region) outlines within the district — drawn tinted at district zoom. */
  @ApiProperty({ type: [RegionBoundaryDto] })
  regions: RegionBoundaryDto[];

  @ApiProperty({ type: [AreaBoundaryDto] })
  areas: AreaBoundaryDto[];
}

export class BoundariesResponseDto {
  @ApiProperty({ type: [DistrictBoundaryDto] })
  districts: DistrictBoundaryDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
