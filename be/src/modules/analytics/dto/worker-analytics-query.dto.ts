import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class WorkerAnalyticsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsISO8601()
  date_from?: string;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2026-06-16',
  })
  @IsOptional()
  @IsISO8601()
  date_to?: string;

  @ApiPropertyOptional({
    description: 'Filter by area ID',
    example: 'area-123',
  })
  @IsOptional()
  @IsUUID()
  area_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by rayon ID',
    example: 'rayon-1',
  })
  @IsOptional()
  @IsUUID()
  rayon_id?: string;

  @ApiPropertyOptional({
    description: 'Search by worker name',
    example: 'Ahmad',
  })
  @IsOptional()
  search?: string;
}
