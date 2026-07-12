import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUUID,
  IsOptional,
  ValidateNested,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Parsed coordinate from KML
 */
export class ParsedCoordinateDto {
  @ApiProperty({ description: 'Longitude', example: 112.7398 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Latitude', example: -7.2905 })
  @IsNumber()
  latitude: number;

  @ApiPropertyOptional({ description: 'Altitude', example: 0 })
  @IsNumber()
  @IsOptional()
  altitude?: number;
}

/**
 * Parsed area from KML
 */
export class ParsedAreaDto {
  @ApiProperty({ description: 'Location name from KML', example: 'Taman Bungkul' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Location description from KML' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Center coordinate',
    type: ParsedCoordinateDto,
  })
  @ValidateNested()
  @Type(() => ParsedCoordinateDto)
  center: ParsedCoordinateDto;

  @ApiPropertyOptional({
    description: 'Polygon boundary coordinates (if available)',
    type: [ParsedCoordinateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParsedCoordinateDto)
  @IsOptional()
  polygon?: ParsedCoordinateDto[];

  @ApiPropertyOptional({
    description: 'Calculated coverage area in square meters',
    example: 2500,
  })
  @IsNumber()
  @IsOptional()
  coverage_area?: number;

  @ApiPropertyOptional({ description: 'Existing area ID if matched' })
  @IsUUID()
  @IsOptional()
  existing_area_id?: string;

  @ApiPropertyOptional({
    description: 'Match status: new, update, or skip',
    example: 'new',
  })
  @IsString()
  @IsOptional()
  match_status?: 'new' | 'update' | 'skip';
}

/**
 * Upload response with session and parsed areas
 */
export class KmzUploadResponseDto {
  @ApiProperty({ description: 'Session ID for preview/confirm', example: 'uuid' })
  session_id: string;

  @ApiProperty({ description: 'Number of areas parsed', example: 5 })
  total_areas: number;

  @ApiProperty({ description: 'Number of new areas', example: 3 })
  new_areas: number;

  @ApiProperty({ description: 'Number of areas to update', example: 2 })
  update_areas: number;

  @ApiProperty({
    description: 'Parsed areas preview',
    type: [ParsedAreaDto],
  })
  areas: ParsedAreaDto[];

  @ApiProperty({ description: 'Session expiration time' })
  expires_at: Date;
}

/**
 * Location selection for confirm
 */
export class AreaSelectionDto {
  @ApiProperty({ description: 'Index of the area in the parsed list', example: 0 })
  @IsNumber()
  index: number;

  @ApiPropertyOptional({ description: 'Override area name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name_override?: string;

  @ApiPropertyOptional({ description: 'Location type ID to assign' })
  @IsUUID()
  @IsOptional()
  location_type_id?: string;

  @ApiPropertyOptional({ description: 'Rayon ID to assign' })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiProperty({
    description: 'Action: create, update, or skip',
    example: 'create',
  })
  @IsString()
  action: 'create' | 'update' | 'skip';
}

/**
 * Confirm import request
 */
export class KmzConfirmRequestDto {
  @ApiProperty({ description: 'Session ID from upload', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  session_id: string;

  @ApiProperty({
    description: 'Areas to import with actions',
    type: [AreaSelectionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AreaSelectionDto)
  areas: AreaSelectionDto[];
}

/**
 * Import result for a single area
 */
export class AreaImportResultDto {
  @ApiProperty({ description: 'Original area name', example: 'Taman Bungkul' })
  name: string;

  @ApiProperty({ description: 'Action taken', example: 'created' })
  action: 'created' | 'updated' | 'skipped' | 'failed';

  @ApiPropertyOptional({ description: 'Location ID if created/updated' })
  location_id?: string;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}

/**
 * Confirm import response
 */
export class KmzConfirmResponseDto {
  @ApiProperty({ description: 'Total areas processed', example: 5 })
  total_processed: number;

  @ApiProperty({ description: 'Areas created', example: 3 })
  created: number;

  @ApiProperty({ description: 'Areas updated', example: 2 })
  updated: number;

  @ApiProperty({ description: 'Areas skipped', example: 0 })
  skipped: number;

  @ApiProperty({ description: 'Areas failed', example: 0 })
  failed: number;

  @ApiProperty({
    description: 'Detailed results per area',
    type: [AreaImportResultDto],
  })
  results: AreaImportResultDto[];
}
