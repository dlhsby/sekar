import {
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

/**
 * Query DTO for listing pruning requests (admin view).
 *
 * Used by admin_data, kepala_rayon, top_management, admin_system, or superadmin
 * to list and filter pruning requests.
 */
export class ListPruningRequestsQueryDto {
  /**
   * Filter by request status.
   *
   * @example 'submitted'
   */
  @ApiPropertyOptional({
    description: 'Filter by request status',
    enum: [
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'converted',
      'in_progress',
      'done',
      'cancelled',
    ],
    example: 'submitted',
  })
  @IsString()
  @IsOptional()
  @IsIn([
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'converted',
    'in_progress',
    'done',
    'cancelled',
  ])
  status?: string;

  /**
   * Filter by rayon ID. Auto-forced for admin_data users to match their rayon.
   *
   * @example '22222222-2222-2222-2222-222222222201'
   */
  @ApiPropertyOptional({
    description: 'Filter by rayon ID',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @IsUUID()
  @IsOptional()
  rayonId?: string;

  /**
   * Filter by creation date (inclusive, ISO 8601).
   *
   * @example '2026-04-01'
   */
  @ApiPropertyOptional({
    description: 'Filter requests created on or after this date (ISO 8601)',
    example: '2026-04-01',
  })
  @IsDateString()
  @IsOptional()
  from?: string;

  /**
   * Filter by creation date (inclusive, ISO 8601).
   *
   * @example '2026-04-30'
   */
  @ApiPropertyOptional({
    description: 'Filter requests created on or before this date (ISO 8601)',
    example: '2026-04-30',
  })
  @IsDateString()
  @IsOptional()
  to?: string;

  /**
   * Page number for pagination (1-indexed, default 1).
   *
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  /**
   * Number of results per page (min 1, max 100, default 20).
   *
   * @example 20
   */
  @ApiPropertyOptional({
    description: 'Results per page (max 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number = 20;

  /**
   * If true, return only the caller's own submissions (used by staff_kecamatan
   * and any submitter inspecting their own queue). Falsy = admin list view.
   *
   * @example true
   */
  @ApiPropertyOptional({
    description:
      "If true, return only the caller's own submissions (submitter view).",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  mine?: boolean;

  /**
   * Offset for non-page-based pagination (used together with `mine=true`).
   *
   * @example 0
   */
  @ApiPropertyOptional({
    description: 'Offset for offset-based pagination (used with mine=true).',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Offset must be 0 or greater' })
  offset?: number;

  /**
   * Substring search on the request reference code (case-insensitive).
   * Useful when staff kecamatan calls with a code-only reference. Added May 2026.
   *
   * @example 'PR-2026'
   */
  @ApiPropertyOptional({
    description: 'Substring search on reference_code (case-insensitive)',
    example: 'PR-2026',
  })
  @IsOptional()
  @IsString()
  referenceCode?: string;

  /**
   * Substring search on the requester (pemohon) name (case-insensitive). Added May 2026.
   *
   * @example 'Budi'
   */
  @ApiPropertyOptional({
    description: 'Substring search on requester_name (case-insensitive)',
    example: 'Budi',
  })
  @IsOptional()
  @IsString()
  requesterName?: string;
}
