import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsEnum, Matches } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReportType } from '../entities/report.entity';

/**
 * Reports Filter DTO
 *
 * Extends PaginationDto to include all filter parameters for reports endpoint.
 * This prevents forbidNonWhitelisted validation errors.
 */
export class ReportsFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by worker ID (UUID)',
    example: 'worker-uuid',
  })
  @IsOptional()
  @IsUUID()
  worker_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by shift ID (UUID)',
    example: 'shift-uuid',
  })
  @IsOptional()
  @IsUUID()
  shift_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by report type',
    enum: ReportType,
  })
  @IsOptional()
  @IsEnum(ReportType)
  report_type?: ReportType;

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
