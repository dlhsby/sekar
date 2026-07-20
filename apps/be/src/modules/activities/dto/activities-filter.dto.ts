import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ActivityStatus } from '../entities/activity.entity';

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

  @ApiPropertyOptional({
    description: 'Filter by area ID (UUID)',
    example: 'area-uuid',
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by district ID (UUID)',
    example: 'district-uuid',
  })
  @IsOptional()
  @IsUUID()
  district_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by activity type ID (UUID)',
    example: 'type-uuid',
  })
  @IsOptional()
  @IsUUID()
  activity_type_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by approval status',
    enum: ActivityStatus,
    example: ActivityStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['created_at'],
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(['created_at'])
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_dir?: string;

  /**
   * ADR-038 (May 2026) — when true, return activities where the current user
   * is the owner OR appears in `activity_tags`. Overrides the default
   * role-based scope so tagged satgas/linmas see activities filed for them
   * by korlap/admin_rayon/kepala_rayon even outside their own area.
   */
  @ApiPropertyOptional({
    description:
      'Return activities where the current user is the owner OR appears in activity_tags (ADR-038).',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  involving_me?: boolean;
}
