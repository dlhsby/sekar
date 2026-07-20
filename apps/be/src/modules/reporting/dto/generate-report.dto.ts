import { IsEnum, IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportFormat } from '../enums/report.enums';

/**
 * Report Parameters DTO
 *
 * Dynamic parameters for report generation, depends on report type.
 * Supports filters like date_range, location_id, district_id, etc.
 */
export class ReportParametersDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Location ID (UUID)' })
  @IsOptional()
  @IsString()
  location_id?: string;

  @ApiPropertyOptional({ description: 'District ID (UUID)' })
  @IsOptional()
  @IsString()
  district_id?: string;

  @ApiPropertyOptional({ description: 'Worker ID (UUID)' })
  @IsOptional()
  @IsString()
  worker_id?: string;
}

/**
 * Generate Report Request DTO
 *
 * Used to request generation of a report from a template.
 */
export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, description: 'Report type to generate' })
  @IsEnum(ReportType)
  report_type: ReportType;

  @ApiPropertyOptional({ description: 'Template slug (if not using report_type)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ enum: ReportFormat, description: 'Output format (pdf, csv, xlsx)' })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiPropertyOptional({ type: ReportParametersDto })
  @IsOptional()
  @Type(() => ReportParametersDto)
  @ValidateNested()
  parameters?: ReportParametersDto;
}
