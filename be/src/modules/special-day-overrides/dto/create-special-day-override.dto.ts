import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SpecialDayType } from '../entities/special-day-override.entity';

/**
 * Data Transfer Object for creating a new special day override.
 *
 * Validates incoming request data for special day override creation endpoint.
 * Special day overrides define dates that should be treated differently
 * for staffing requirements (weekends, holidays, special events).
 */
export class CreateSpecialDayOverrideDto {
  /**
   * The date for this override.
   * Must be in ISO 8601 format (YYYY-MM-DD).
   *
   * @example '2026-08-17'
   */
  @ApiProperty({
    description: 'The date for this override (ISO 8601 format)',
    example: '2026-08-17',
    format: 'date',
  })
  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  /**
   * Type of special day.
   * Determines how staffing requirements should be calculated.
   *
   * @example 'HOLIDAY'
   */
  @ApiProperty({
    description: 'Type of special day (WEEKEND, HOLIDAY, SPECIAL)',
    enum: SpecialDayType,
    example: SpecialDayType.HOLIDAY,
  })
  @IsEnum(SpecialDayType, {
    message: 'Day type must be one of: WEEKEND, HOLIDAY, SPECIAL',
  })
  @IsNotEmpty({ message: 'Day type is required' })
  day_type: SpecialDayType;

  /**
   * Optional name/description of the special day.
   *
   * @example 'Hari Kemerdekaan'
   */
  @ApiPropertyOptional({
    description: 'Name/description of the special day',
    example: 'Hari Kemerdekaan',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;
}
