import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Query params for the attendance day list. Date range filters the WIB calendar
 * day; status filters the per-day summary; sort_dir orders by day.
 */
export class AttendanceFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'From WIB day (YYYY-MM-DD), inclusive',
    example: '2026-06-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from_date must be in YYYY-MM-DD format' })
  from_date?: string;

  @ApiPropertyOptional({
    description: 'To WIB day (YYYY-MM-DD), inclusive',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to_date must be in YYYY-MM-DD format' })
  to_date?: string;

  @ApiPropertyOptional({
    description: 'Filter by day status',
    enum: ['late', 'on_time', 'active'],
  })
  @IsOptional()
  @IsIn(['late', 'on_time', 'active'])
  status?: 'late' | 'on_time' | 'active';

  @ApiPropertyOptional({
    description: 'Sort direction by day',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_dir?: 'asc' | 'desc';
}
