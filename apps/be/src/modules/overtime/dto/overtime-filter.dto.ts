import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { OvertimeStatus } from '../entities/overtime.entity';

export class OvertimeFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID (UUID)',
    example: 'user-uuid',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by area ID (UUID)',
    example: 'area-uuid',
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (YYYY-MM-DD) — matches on start_datetime::date',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from_date must be in YYYY-MM-DD format',
  })
  from_date?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (YYYY-MM-DD) — matches on start_datetime::date',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to_date must be in YYYY-MM-DD format',
  })
  to_date?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: OvertimeStatus,
    example: OvertimeStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(OvertimeStatus)
  status?: OvertimeStatus;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['created_at', 'start_datetime'],
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(['created_at', 'start_datetime'])
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_dir?: string;
}
