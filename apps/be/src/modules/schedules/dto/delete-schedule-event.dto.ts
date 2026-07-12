import { IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EditScope } from '../enums/edit-scope.enum';

/**
 * Query parameters for DELETE /schedule-events/:id
 * Scope: 'this'|'this_and_future'|'series'
 * For 'this' or 'this_and_future', `date` is required (YYYY-MM-DD).
 */
export class DeleteScheduleEventDto {
  @ApiPropertyOptional({
    enum: EditScope,
    description: 'Delete scope: this|this_and_future|series',
    default: EditScope.SERIES,
  })
  @IsOptional()
  @IsEnum(EditScope)
  scope?: EditScope;

  @ApiPropertyOptional({
    description: 'Date for this/this_and_future scope (YYYY-MM-DD)',
    example: '2026-07-15',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
