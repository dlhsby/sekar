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
  @ArrayMinSize(1, { message: 'At least 1 photo is required' })
  @ArrayMaxSize(5, { message: 'Maximum 5 photos allowed' })
  @IsString({ each: true })
  photo_keys: string[];

  /**
   * Expected date for the pruning work (ISO date string, today or future).
   *
   * **Deprecated as of 2026-05-01 (ADR-035 amendment + ADR-038).** New mobile
   * builds send `expected_year` + `expected_iso_week` and let `admin_data`
   * pick the concrete day at convert-to-task. Kept accepted for one release
   * so older builds continue to work; when present, the service derives
   * `(expected_year, expected_iso_week)` from this date.
   *
   * @example '2026-04-28'
   */
  @ApiPropertyOptional({
    description:
      '[DEPRECATED] Single-day preference (legacy). New clients should send expected_year + expected_iso_week.',
    example: '2026-04-28',
    deprecated: true,
  })
  @IsDateString()
  @IsOptional()
  detail_date?: string;

  /**
   * Calendar year of the ISO week the submitter prefers.
   *
   * Pairs with `expected_iso_week`. ADR-035 amendment 2026-05-01: kecamatan
   * picks a week, server (or admin_data) picks the concrete day inside it.
   *
   * @example 2026
   */
  @ApiPropertyOptional({
    description: 'ISO calendar year of the preferred week (paired with expected_iso_week)',
    example: 2026,
    minimum: 2024,
    maximum: 2100,
  })
  @IsNumber()
  @IsOptional()
  @Min(2024)
  @Max(2100)
  expected_year?: number;

  /**
   * ISO 8601 week number (1..53) the submitter prefers.
   *
   * @example 19
   */
  @ApiPropertyOptional({
    description: 'ISO 8601 week number 1..53 (paired with expected_year)',
    example: 19,
    minimum: 1,
    maximum: 53,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(53)
  expected_iso_week?: number;

  /**
   * Estimated number of plants to be pruned. Optional — replaced by `tree_count`
   * in the Phase 3 redesigned mobile form, but kept here for backwards
   * compatibility with existing API clients.
   *
   * @example 15
   */
  @ApiPropertyOptional({
    description: 'Estimated number of plants to prune (legacy alias of tree_count)',
    example: 15,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  target_count?: number;

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
    description: 'Rayon ID (optional; auto-resolved from submitter profile if not provided)',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  /**
   * Optional kecamatan name. If not provided, server falls back to the
   * submitter's profile `kecamatan_name`, then `full_name` as a last resort.
   * Lets staff_kecamatan submit on behalf of a neighboring kecamatan.
   *
   * @example 'Tegalsari'
   */
  @ApiPropertyOptional({
    description: 'Kecamatan name override (auto-derived from profile if absent)',
    example: 'Tegalsari',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  kecamatan_name?: string;

  // ── Phase 3 Apr 27 — staff_kecamatan redesign fields ───────────────────────
  // Tree details (free text estimates from the field — exact ranges accepted)

  @ApiPropertyOptional({
    description: 'Number of trees to prune at this location',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  tree_count?: number;

  @ApiPropertyOptional({
    description: 'Free-text estimate of tree height (e.g., "5-7 meter")',
    example: '5-7 meter',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  tree_height_estimate?: string;

  @ApiPropertyOptional({
    description: 'Free-text estimate of trunk diameter (e.g., "30-50 cm")',
    example: '30-50 cm',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  tree_diameter_estimate?: string;

  // Contact person — pemohon (the requester themselves, may differ from logged-in user)

  @ApiPropertyOptional({
    description: 'Requester contact name',
    example: 'Budi Santoso',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  requester_name?: string;

  @ApiPropertyOptional({
    description: 'Requester contact phone',
    example: '081234567890',
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  requester_phone?: string;

  // Contact person — ketua RT (the local RT/RW leader)

  @ApiPropertyOptional({
    description: 'RT (neighborhood) leader contact name',
    example: 'Pak Joko',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  rt_leader_name?: string;

  @ApiPropertyOptional({
    description: 'RT (neighborhood) leader contact phone',
    example: '081298765432',
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  rt_leader_phone?: string;
}
