import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional } from 'class-validator';

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export class AreaBoundaryResponseDto {
  @ApiProperty({ example: 'area-uuid' })
  location_id: string;

  @ApiProperty({ example: 'Taman Bungkul' })
  name: string;

  @ApiPropertyOptional({ example: { type: 'Polygon', coordinates: [[[112.7, -7.2]]] } })
  boundary_polygon: GeoJsonPolygon | null;

  @ApiProperty({ example: -7.2575 })
  gps_lat: number;

  @ApiProperty({ example: 112.7521 })
  gps_lng: number;

  @ApiPropertyOptional({ example: 2500 })
  coverage_area: number | null;
}

export class UpdateAreaBoundaryDto {
  @ApiProperty({
    description: 'GeoJSON Polygon with coordinates in [lng, lat] format',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [112.7388, -7.2905],
          [112.7395, -7.2905],
          [112.7395, -7.291],
          [112.7388, -7.291],
          [112.7388, -7.2905],
        ],
      ],
    },
  })
  @IsObject()
  boundary_polygon: GeoJsonPolygon;

  @ApiPropertyOptional({
    description: 'Coverage area in square meters. Auto-computed from polygon if not provided.',
    example: 2500,
  })
  @IsNumber()
  @IsOptional()
  coverage_area?: number;
}
