import {
  IsUUID,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new activity (work activity report)
 * Phase 2C: Simplified activity submission with auto-detected shift
 */
export class CreateActivityDto {
  @ApiProperty({
    description: 'Activity type ID',
    example: '33333333-3333-3333-3333-333333333301',
  })
  @IsUUID()
  @IsNotEmpty()
  activity_type_id: string;

  @ApiProperty({
    description: 'Description of work done (5-500 characters)',
    example: 'Melakukan penyiraman tanaman di area Taman Bungkul',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Deskripsi minimal 5 karakter' })
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
  description: string;

  @ApiProperty({
    description: 'Photo URLs (1-3 required)',
    type: [String],
    example: [
      'https://sekar-bucket.s3.amazonaws.com/activities/photo1.jpg',
      'https://sekar-bucket.s3.amazonaws.com/activities/photo2.jpg',
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 foto diperlukan' })
  @ArrayMaxSize(3, { message: 'Maksimal 3 foto diperbolehkan' })
  @IsString({ each: true })
  photo_urls: string[];

  @ApiPropertyOptional({
    description: 'GPS latitude',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  gps_lat?: number;

  @ApiPropertyOptional({
    description: 'GPS longitude',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  gps_lng?: number;
}
