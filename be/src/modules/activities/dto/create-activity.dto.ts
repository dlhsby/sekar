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
  IsEnum,
  IsObject,
  ValidateNested,
  IsInt,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const VALID_CASE_TYPES = ['GT', 'PT', 'PS', 'PD', 'PK'] as const;
export type CaseType = (typeof VALID_CASE_TYPES)[number];

class ActivityPlantItemInputDto {
  @ApiProperty({ description: 'Plant species UUID' })
  @IsUUID()
  species_id: string;

  @ApiProperty({ description: 'Number of plants in this line item' })
  @IsInt()
  @IsPositive()
  count: number;

  @ApiPropertyOptional({ description: 'Optional notes for this plant item' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for creating a new activity (work activity report)
 * Phase 2C: Simplified activity submission with auto-detected shift
 * Phase 3: Added case_type, custom_fields, photo_before/after, reference_code, pruning_request_id, plant_items
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

  // Phase 3 fields --------------------------------------------------------

  @ApiPropertyOptional({
    description: 'Case type for pruning activities (GT/PT/PS/PD/PK)',
    enum: VALID_CASE_TYPES,
    example: 'GT',
  })
  @IsOptional()
  @IsEnum(VALID_CASE_TYPES, {
    message: `case_type must be one of: ${VALID_CASE_TYPES.join(', ')}`,
  })
  case_type?: CaseType;

  @ApiPropertyOptional({
    description: 'Type-specific custom fields (JSON)',
    example: { maintenance_type: 'PM', road_context: 'JT' },
  })
  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'S3 URL of the "before" photo',
    example: 'https://sekar-bucket.s3.amazonaws.com/activities/before.jpg',
  })
  @IsOptional()
  @IsString()
  photo_before_url?: string;

  @ApiPropertyOptional({
    description: 'S3 URL of the "after" photo',
    example: 'https://sekar-bucket.s3.amazonaws.com/activities/after.jpg',
  })
  @IsOptional()
  @IsString()
  photo_after_url?: string;

  @ApiPropertyOptional({
    description: 'External reference code (e.g. 25PR0001). Auto-generated if omitted.',
    example: '25PR0001',
  })
  @IsOptional()
  @IsString()
  reference_code?: string;

  @ApiPropertyOptional({
    description: 'UUID of the pruning request this activity fulfils',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  pruning_request_id?: string;

  @ApiPropertyOptional({
    description: 'Plant species line items processed in this activity',
    type: [ActivityPlantItemInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityPlantItemInputDto)
  plant_items?: ActivityPlantItemInputDto[];

  /**
   * ADR-038 (May 2026) — user IDs to tag as involved on this activity.
   *
   * Owner remains the sole writer (`Activity.user_id`); tagged users gain
   * read-only feed visibility via `GET /activities?involving_me=true` and
   * receive an FCM push (notification stub lands in a follow-up commit).
   *
   * Server deduplicates the list and silently skips an entry equal to the
   * owner — tagging yourself is a no-op, not an error.
   */
  @ApiPropertyOptional({
    description: 'User IDs to tag as involved on this activity (ADR-038, May 2026)',
    type: [String],
    example: ['33333333-3333-3333-3333-333333333301'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagged_user_ids?: string[];
}
