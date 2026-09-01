import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayType, StaffRole } from '../entities/location-staff-requirement.entity';

export class StaffRequirementItemDto {
  @ApiProperty()
  @IsUUID()
  shift_definition_id: string;

  @ApiProperty({ enum: StaffRole })
  @IsEnum(StaffRole)
  role: StaffRole;

  @ApiProperty({ enum: DayType, default: DayType.WEEKDAY })
  @IsEnum(DayType)
  day_type: DayType;

  @ApiProperty({ description: 'Required headcount for this shift/role/day-type', example: 6 })
  @IsInt()
  @Min(0)
  @Max(1000)
  required_count: number;
}

/** Bulk upsert of a location's staffing requirements. */
export class SetStaffRequirementsDto {
  @ApiProperty({ type: [StaffRequirementItemDto] })
  @IsArray()
  @ArrayMaxSize(60)
  @ValidateNested({ each: true })
  @Type(() => StaffRequirementItemDto)
  items: StaffRequirementItemDto[];
}
