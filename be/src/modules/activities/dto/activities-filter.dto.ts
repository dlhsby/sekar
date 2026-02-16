import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Activities Filter DTO
 *
 * Extends PaginationDto to include all filter parameters for activities endpoint.
 * This prevents forbidNonWhitelisted validation errors.
 *
 * Phase 2C: Removed report_type filter (no longer exists)
 */
export class ActivitiesFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID (UUID)',
    example: 'user-uuid',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by shift ID (UUID)',
    example: 'shift-uuid',
  })
  @IsOptional()
  @IsUUID()
  shift_id?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from_date must be in YYYY-MM-DD format',
  })
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to_date must be in YYYY-MM-DD format',
  })
  to_date?: string;
}
