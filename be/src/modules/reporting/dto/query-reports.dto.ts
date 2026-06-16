import { PaginationDto } from '../../../common/dto/pagination.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReportType } from '../enums/report.enums';

/**
 * Query Generated Reports DTO
 *
 * Extends pagination for listing generated reports with optional filters.
 */
export class QueryReportsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ReportType, description: 'Filter by report type' })
  @IsOptional()
  @IsEnum(ReportType)
  report_type?: ReportType;

  @ApiPropertyOptional({ description: 'Filter by template slug' })
  @IsOptional()
  @IsString()
  template_slug?: string;

  @ApiPropertyOptional({ description: 'Search by title' })
  @IsOptional()
  @IsString()
  search?: string;
}
