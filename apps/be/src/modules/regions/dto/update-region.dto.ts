import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRegionDto } from './create-region.dto';

export class UpdateRegionDto extends PartialType(CreateRegionDto) {
  @ApiPropertyOptional({ description: 'GeoJSON Polygon/MultiPolygon boundary' })
  @IsOptional()
  @IsObject()
  boundary_polygon?: object | null;
}
