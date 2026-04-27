import {
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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
}
