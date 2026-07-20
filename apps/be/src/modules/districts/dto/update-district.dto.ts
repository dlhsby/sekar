import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';
import { CreateDistrictDto } from './create-district.dto';

/**
 * Data Transfer Object for updating an existing district.
 * All fields optional (name, description, color, center_lat, center_lng).
 *
 * `boundary_polygon` is update-only (not on create): district boundaries are the
 * official KMZ "Batas Wilayah Kerja District" outlines, so this lets an admin
 * correct a district's stored outline (e.g. after a bad import) without a reseed.
 */
export class UpdateDistrictDto extends PartialType(CreateDistrictDto) {
  @ApiPropertyOptional({
    description: 'GeoJSON Polygon boundary (official KMZ outline). Update-only.',
  })
  @IsOptional()
  @IsObject()
  boundary_polygon?: object;
}
