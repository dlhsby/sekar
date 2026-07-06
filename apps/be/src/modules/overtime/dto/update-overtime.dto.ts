import {
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an existing overtime record
 *
 * Admin users can update overtime records.
 * Fields: start_datetime, end_datetime, activity_type_id, description, photo_urls, gps_lat, gps_lng
 */
export class UpdateOvertimeDto {
  @ApiPropertyOptional({
    description: 'Start datetime (ISO 8601 with timezone)',
    example: '2026-02-14T17:00:00+07:00',
  })
  @IsDateString()
  @IsOptional()
  start_datetime?: string;

  @ApiPropertyOptional({
    description: 'End datetime (ISO 8601 with timezone, may cross midnight)',
    example: '2026-02-14T20:00:00+07:00',
  })
  @IsDateString()
  @IsOptional()
  end_datetime?: string;

  @ApiPropertyOptional({
    description: 'Activity type UUID',
  })
  @IsString()
  @IsOptional()
  activity_type_id?: string;

  @ApiPropertyOptional({
    description: 'Activity description',
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Photo URLs (1-3 photos)',
    example: ['https://s3.amazonaws.com/photo1.jpg'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @IsOptional()
  photo_urls?: string[];

  @ApiPropertyOptional({
    description: 'GPS latitude',
    example: -7.250445,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  gps_lat?: number;

  @ApiPropertyOptional({
    description: 'GPS longitude',
    example: 112.768845,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  gps_lng?: number;
}
