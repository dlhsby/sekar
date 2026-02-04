import { IsNotEmpty, IsUUID, IsInt, Min, Max, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayType, StaffRole } from '../entities/area-staff-requirement.entity';

/**
 * Data Transfer Object for creating a new area staff requirement.
 *
 * Validates incoming request data for area staff requirement creation endpoint.
 */
export class CreateAreaStaffRequirementDto {
  /**
   * Area ID for which the requirement applies.
   *
   * @example 'c3d4e5f6-a7b8-9012-cdef-123456789012'
   */
  @ApiProperty({
    description: 'Area ID (UUID)',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID('4', { message: 'Area ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Area ID is required' })
  area_id: string;

  /**
   * Shift definition ID for which the requirement applies.
   *
   * @example '22222222-2222-2222-2222-222222222201'
   */
  @ApiProperty({
    description: 'Shift definition ID (UUID)',
    example: '22222222-2222-2222-2222-222222222201',
  })
  @IsUUID('4', { message: 'Shift definition ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Shift definition ID is required' })
  shift_definition_id: string;

  /**
   * Role for which the requirement applies.
   *
   * @example 'worker'
   */
  @ApiProperty({
    description: 'Staff role (worker or linmas)',
    enum: StaffRole,
    example: StaffRole.WORKER,
  })
  @IsEnum(StaffRole, { message: 'Role must be either "worker" or "linmas"' })
  @IsNotEmpty({ message: 'Role is required' })
  role: StaffRole;

  /**
   * Required number of staff for this combination.
   *
   * @example 6
   */
  @ApiProperty({
    description: 'Required number of staff (1-100)',
    example: 6,
    minimum: 0,
    maximum: 100,
  })
  @IsInt({ message: 'Required count must be an integer' })
  @Min(0, { message: 'Required count cannot be negative' })
  @Max(100, { message: 'Required count cannot exceed 100' })
  required_count: number;

  /**
   * Day type for which the requirement applies.
   * Defaults to WEEKDAY if not specified.
   *
   * @example 'WEEKDAY'
   */
  @ApiPropertyOptional({
    description: 'Day type (WEEKDAY, WEEKEND, HOLIDAY)',
    enum: DayType,
    example: DayType.WEEKDAY,
    default: DayType.WEEKDAY,
  })
  @IsEnum(DayType, { message: 'Day type must be WEEKDAY, WEEKEND, or HOLIDAY' })
  @IsOptional()
  day_type?: DayType;
}
