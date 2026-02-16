import { IsUUID, IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for updating an existing schedule.
 *
 * All fields are optional. Only provided fields will be updated.
 * Note: user_id cannot be updated. Delete and recreate instead.
 */
export class UpdateScheduleDto {
  /**
   * Updated area ID for the schedule.
   *
   * @example 'd4e5f6a7-b8c9-0123-def0-234567890123'
   */
  @ApiPropertyOptional({
    description: 'Updated area ID',
    example: 'd4e5f6a7-b8c9-0123-def0-234567890123',
  })
  @IsUUID('4', { message: 'Area ID must be a valid UUID' })
  @IsOptional()
  area_id?: string;

  /**
   * Updated shift definition ID for the schedule.
   *
   * @example '22222222-2222-2222-2222-222222222202'
   */
  @ApiPropertyOptional({
    description: 'Updated shift definition ID',
    example: '22222222-2222-2222-2222-222222222202',
  })
  @IsUUID('4', { message: 'Shift definition ID must be a valid UUID' })
  @IsOptional()
  shift_definition_id?: string;

  /**
   * Updated effective date for the schedule.
   *
   * @example '2026-02-01'
   */
  @ApiPropertyOptional({
    description: 'Updated effective date (YYYY-MM-DD)',
    example: '2026-02-01',
  })
  @IsDateString({}, { message: 'Effective date must be a valid date (YYYY-MM-DD)' })
  @IsOptional()
  effective_date?: string;

  /**
   * Updated end date for the schedule.
   * Set to null to make the schedule ongoing.
   *
   * @example '2026-12-31'
   */
  @ApiPropertyOptional({
    description: 'Updated end date (YYYY-MM-DD). Set to null for ongoing.',
    example: '2026-12-31',
  })
  @IsDateString({}, { message: 'End date must be a valid date (YYYY-MM-DD)' })
  @IsOptional()
  end_date?: string | null;
}
