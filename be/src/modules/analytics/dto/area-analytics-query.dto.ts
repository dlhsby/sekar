import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsISO8601 } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AreaAnalyticsQueryDto extends PaginationDto {
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
    description: 'Filter by rayon ID',
    example: 'rayon-1',
  })
  @IsOptional()
  @IsUUID()
  rayon_id?: string;

  @ApiPropertyOptional({
    description: 'Search by area name',
    example: 'Taman Utara',
  })
  @IsOptional()
  search?: string;
}
