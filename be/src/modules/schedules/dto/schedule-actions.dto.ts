import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Generate (or regenerate) the roster for a WIB day. */
export class GenerateRosterDto {
  @ApiProperty({ description: 'WIB day to generate (YYYY-MM-DD)', example: '2026-06-30' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date: string;
}

/** Mark a roster row as sick or annual leave. */
export class SetLeaveDto {
  @ApiProperty({ enum: ['sick', 'annual'] })
  @IsIn(['sick', 'annual'])
  leave_type: 'sick' | 'annual';

  @ApiProperty({ required: false, description: 'Reason / note' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Replace the rostered worker with another for the day. */
export class ReplaceWorkerDto {
  @ApiProperty({ description: 'Covering worker user id' })
  @IsUUID()
  replacement_user_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Set the areas for the day (0..N). */
export class UpdateRosterAreasDto {
  @ApiProperty({ type: [String], description: 'Area ids for the day (may be empty)' })
  @IsArray()
  @IsUUID('4', { each: true })
  area_ids: string[];
}

/** Set (or clear) the shift for the day. */
export class UpdateRosterShiftDto {
  @ApiProperty({ required: false, nullable: true, description: 'Shift id, or null to clear' })
  @IsOptional()
  @IsUUID()
  shift_definition_id?: string | null;
}
