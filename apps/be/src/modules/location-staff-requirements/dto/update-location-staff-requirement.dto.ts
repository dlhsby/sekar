import { IsInt, Min, Max, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DayType, StaffRole } from '../entities/location-staff-requirement.entity';

/**
 * Data Transfer Object for updating an existing area staff requirement.
 *
 * All fields are optional. Only provided fields will be updated.
 * Note: location_id and shift_definition_id cannot be updated. Delete and recreate instead.
 */
export class UpdateLocationStaffRequirementDto {
  /**
   * Updated role for the requirement.
   *
   * @example 'linmas'
   */
  @ApiPropertyOptional({
    description: 'Staff role (satgas or linmas)',
    enum: StaffRole,
    example: StaffRole.LINMAS,
  })
  @IsEnum(StaffRole, { message: 'Role must be either "satgas" or "linmas"' })
  @IsOptional()
  role?: StaffRole;

  /**
   * Updated required count.
   *
   * @example 8
   */
  @ApiPropertyOptional({
    description: 'Required number of staff (1-100)',
    example: 8,
    minimum: 0,
    maximum: 100,
  })
  @IsInt({ message: 'Required count must be an integer' })
  @Min(0, { message: 'Required count cannot be negative' })
  @Max(100, { message: 'Required count cannot exceed 100' })
  @IsOptional()
  required_count?: number;

  /**
   * Updated day type for the requirement.
   *
   * @example 'WEEKEND'
   */
  @ApiPropertyOptional({
    description: 'Day type (WEEKDAY, WEEKEND, HOLIDAY)',
    enum: DayType,
    example: DayType.WEEKEND,
  })
  @IsEnum(DayType, { message: 'Day type must be WEEKDAY, WEEKEND, or HOLIDAY' })
  @IsOptional()
  day_type?: DayType;
}
