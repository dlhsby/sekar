import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
} from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Generate (or regenerate) the roster for a WIB day. */
export class GenerateRosterDto {
  @ApiProperty({ description: 'WIB day to generate (YYYY-MM-DD)', example: '2026-06-30' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date: string;
}

/**
 * Mark a roster row's absence (Ketidakhadiran). `sakit`→leave_sick,
 * `cuti`→leave_annual, `izin`→leave_permit (excused, counts as on-leave),
 * `libur`→off (a deliberate day off; not counted as absent/expected).
 */
export class SetLeaveDto {
  @ApiProperty({ enum: ['sick', 'annual', 'permit', 'off'] })
  @IsIn(['sick', 'annual', 'permit', 'off'])
  leave_type: 'sick' | 'annual' | 'permit' | 'off';

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

/** Set the place for the day — at most one lokasi (ADR-053). */
export class UpdateRosterAreasDto {
  @ApiProperty({
    type: [String],
    description:
      'Location id for the day, as a 0- or 1-element array (kept an array for wire ' +
      'compatibility). ADR-053: one row = one place, so more than one id is rejected ' +
      'with 400 — create one row per lokasi.',
    maxItems: 1,
  })
  @IsArray()
  @ArrayMaxSize(1, {
    message: 'A schedule row covers exactly one place (ADR-053) — send at most one location id.',
  })
  // Location ids are deterministic UUID v5 (minted from district:name), so accept any
  // version — 'v4' wrongly rejects every seeded area id (the "Ubah Location" 400).
  @IsUUID('all', { each: true })
  area_ids: string[];

  @ApiPropertyOptional({
    description:
      'Rayon the occurrence is scoped to, or null for a city-wide assignment. ' +
      'Omit to leave unchanged.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('all')
  district_id?: string | null;

  @ApiPropertyOptional({
    description:
      'Kawasan the occurrence is scoped to, or null. At most one (ADR-053). ' +
      'Omit to leave unchanged.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('all')
  region_id?: string | null;
}

/**
 * Add a single worker to a day's roster (e.g. a worker who joined mid-day or was
 * missed by generate). One row per worker per day is enforced server-side.
 */
export class AddScheduleDto {
  @ApiProperty({ description: 'Worker to schedule' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ description: 'WIB day (YYYY-MM-DD)', example: '2026-06-30' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Shift id; omit to use the worker's default",
  })
  @IsOptional()
  @IsUUID()
  shift_definition_id?: string | null;

  @ApiProperty({
    type: [String],
    required: false,
    description: "Location ids for the day; omit to use the worker's permanent areas",
  })
  @IsOptional()
  @IsArray()
  // Location ids are deterministic UUID v5 — accept any version ('v4' rejects them).
  @IsUUID('all', { each: true })
  area_ids?: string[];
}

/** Set (or clear) the shift for the day. */
export class UpdateRosterShiftDto {
  @ApiProperty({ required: false, nullable: true, description: 'Shift id, or null to clear' })
  @IsOptional()
  @IsUUID()
  shift_definition_id?: string | null;
}
