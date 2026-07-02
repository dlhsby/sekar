import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';
import { CreateRayonDto } from './create-rayon.dto';

/**
 * Data Transfer Object for updating an existing rayon.
 * All fields optional (name, description, color, center_lat, center_lng).
 *
 * `boundary_polygon` is update-only (not on create): rayon boundaries are the
 * official KMZ "Batas Wilayah Kerja Rayon" outlines, so this lets an admin
 * correct a rayon's stored outline (e.g. after a bad import) without a reseed.
 */
export class UpdateRayonDto extends PartialType(CreateRayonDto) {
  @ApiPropertyOptional({
    description: 'GeoJSON Polygon boundary (official KMZ outline). Update-only.',
  })
  @IsOptional()
  @IsObject()
  boundary_polygon?: object;
}
