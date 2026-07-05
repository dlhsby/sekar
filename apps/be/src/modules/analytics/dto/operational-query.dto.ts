import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601 } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class OperationalQueryDto extends PaginationDto {
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
}
