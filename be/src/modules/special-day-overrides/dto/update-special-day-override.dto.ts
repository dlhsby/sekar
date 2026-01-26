import { IsString, MaxLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SpecialDayType } from '../entities/special-day-override.entity';

/**
 * Data Transfer Object for updating an existing special day override.
 *
 * All fields are optional. Only provided fields will be updated.
 */
export class UpdateSpecialDayOverrideDto {
  /**
   * Updated date for this override.
   * Must be in ISO 8601 format (YYYY-MM-DD).
   *
   * @example '2026-08-18'
   */
  @ApiPropertyOptional({
    description: 'The date for this override (ISO 8601 format)',
    example: '2026-08-18',
    format: 'date',
  })
  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date string' })
  @IsOptional()
  date?: string;

  /**
   * Updated type of special day.
   *
   * @example 'SPECIAL'
   */
  @ApiPropertyOptional({
    description: 'Type of special day (WEEKEND, HOLIDAY, SPECIAL)',
    enum: SpecialDayType,
    example: SpecialDayType.SPECIAL,
  })
  @IsEnum(SpecialDayType, {
    message: 'Day type must be one of: WEEKEND, HOLIDAY, SPECIAL',
  })
  @IsOptional()
  day_type?: SpecialDayType;

  /**
   * Updated name/description of the special day.
   *
   * @example 'Hari Kemerdekaan Indonesia'
   */
  @ApiPropertyOptional({
    description: 'Name/description of the special day',
    example: 'Hari Kemerdekaan Indonesia',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;
}
