import { IsNotEmpty, IsUUID, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a new schedule.
 *
 * Validates incoming request data for schedule creation endpoint.
 */
export class CreateScheduleDto {
  /**
   * User ID (Satgas/Linmas) to assign.
   *
   * @example 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'User ID (Satgas/Linmas) to assign',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  @IsNotEmpty({ message: 'User ID is required' })
  user_id: string;

  /**
   * Area ID where the user will be assigned.
   *
   * @example 'c3d4e5f6-a7b8-9012-cdef-123456789012'
   */
  @ApiProperty({
    description: 'Area ID where the user will be assigned',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID('4', { message: 'Area ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Area ID is required' })
  area_id: string;

  /**
   * Shift definition ID for this schedule.
   *
   * @example '22222222-2222-2222-2222-222222222201'
   */
  @ApiProperty({
    description: 'Shift definition ID',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @IsUUID('4', { message: 'Shift definition ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Shift definition ID is required' })
  shift_definition_id: string;

  /**
   * Date when this schedule becomes effective.
   *
   * @example '2026-01-20'
   */
  @ApiProperty({
    description: 'Date when this schedule becomes effective (YYYY-MM-DD)',
    example: '2026-01-20',
  })
  @IsDateString({}, { message: 'Effective date must be a valid date (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Effective date is required' })
  effective_date: string;

  /**
   * Optional end date for the schedule.
   * If null, the schedule is ongoing.
   *
   * @example '2026-12-31'
   */
  @ApiPropertyOptional({
    description: 'Optional end date (YYYY-MM-DD). Null means ongoing.',
    example: '2026-12-31',
  })
  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD)' })
  @IsOptional()
  end_date?: string;
}
