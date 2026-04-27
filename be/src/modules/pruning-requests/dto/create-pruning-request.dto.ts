import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for submitting a new pruning request.
 *
 * Used by `staff_kecamatan` to request pruning work for a specific location.
 * The request captures GPS coordinates, photos, and target plant count.
 */
export class CreatePruningRequestDto {
  /**
   * Physical address of the pruning site.
   *
   * @example 'Jalan Darmo No. 123, Surabaya'
   */
  @ApiProperty({
    description: 'Physical address of the pruning site',
    example: 'Jalan Darmo No. 123, Surabaya',
    minLength: 5,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MinLength(5)
  @MaxLength(500)
  address: string;

  /**
   * GPS latitude coordinate (-90 to 90).
   *
   * @example -7.254883
   */
  @ApiProperty({
    description: 'GPS latitude coordinate',
    example: -7.254883,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Latitude is required' })
  @Min(-90)
  @Max(90)
  lat: number;

  /**
   * GPS longitude coordinate (-180 to 180).
   *
   * @example 112.748899
   */
  @ApiProperty({
    description: 'GPS longitude coordinate',
    example: 112.748899,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Longitude is required' })
  @Min(-180)
  @Max(180)
  lng: number;

  /**
   * Array of S3 object keys for photos (min 3, max 5).
   *
   * Photos are uploaded via the existing media flow and referenced by their S3 keys.
   *
   * @example ['pruning-requests/20260427-abc123-1.jpg', 'pruning-requests/20260427-abc123-2.jpg', 'pruning-requests/20260427-abc123-3.jpg']
   */
  @ApiProperty({
    description: 'S3 object keys for photos (min 3, max 5)',
    example: [
      'pruning-requests/20260427-abc123-1.jpg',
      'pruning-requests/20260427-abc123-2.jpg',
      'pruning-requests/20260427-abc123-3.jpg',
    ],
    type: [String],
    minItems: 3,
    maxItems: 5,
  })
  @IsArray()
  @IsNotEmpty({ message: 'Photo keys are required' })
  @ArrayMinSize(3, { message: 'At least 3 photos are required' })
  @ArrayMaxSize(5, { message: 'Maximum 5 photos allowed' })
  @IsString({ each: true })
  photo_keys: string[];

  /**
   * Expected date for the pruning work (ISO date string, today or future).
   *
   * @example '2026-04-28'
   */
  @ApiProperty({
    description: 'Expected date for pruning work (today or future)',
    example: '2026-04-28',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Detail date is required' })
  detail_date: string;

  /**
   * Estimated number of plants to be pruned (≥ 1).
   *
   * @example 15
   */
  @ApiProperty({
    description: 'Estimated number of plants to prune',
    example: 15,
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Target plant count is required' })
  @Min(1)
  target_count: number;

  /**
   * Optional notes or additional details.
   *
   * @example 'Urgent: trees blocking the street'
   */
  @ApiPropertyOptional({
    description: 'Additional notes',
    example: 'Urgent: trees blocking the street',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  /**
   * Optional rayon ID. If not provided, the rayon will be resolved by GPS-to-area lookup.
   * For now, recommend providing this explicitly to avoid complex geo-resolution logic.
   *
   * @example '11111111-1111-1111-1111-111111111101'
   */
  @ApiPropertyOptional({
    description: 'Rayon ID (optional; auto-resolved by GPS if not provided)',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;
}
