import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Attendance Filter DTO
 *
 * Extends PaginationDto to include date filter for attendance endpoint.
 * This prevents forbidNonWhitelisted validation errors.
 */
export class AttendanceFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Date in YYYY-MM-DD format (defaults to today)',
    example: '2026-01-09',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;
}
