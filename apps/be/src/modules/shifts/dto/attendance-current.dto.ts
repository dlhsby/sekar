import { ApiProperty } from '@nestjs/swagger';
import { AttributionPhase } from '../services/shift-attribution.service';

/**
 * One shift the worker can clock into right now (ADR-055 attribution window),
 * for the mobile shift picker. `phase` says whether the shift is upcoming
 * (`early`), running (`covering`) or just ended (`grace`); the list is best-first.
 */
export class ShiftOptionDto {
  @ApiProperty() shift_definition_id: string;
  @ApiProperty({ nullable: true }) shift_name?: string;
  @ApiProperty({ description: 'WIB service-day this option belongs to (YYYY-MM-DD)' })
  service_day: string;
  @ApiProperty({ enum: ['early', 'covering', 'grace'] }) phase: AttributionPhase;
  @ApiProperty({ description: 'Minutes from now to the shift start (negative = already started)' })
  minutes_to_start: number;
  @ApiProperty({ description: 'Suggested default option (the best-ranked match)' })
  is_default: boolean;
}

/** The worker's currently-open session, if any (Jam Masuk + context). */
export class OpenSessionDto {
  @ApiProperty() id: string;
  @ApiProperty() service_day: string | null;
  @ApiProperty({ nullable: true }) shift_definition_id: string | null;
  @ApiProperty({ description: 'Jam Masuk (first clock-in) ISO instant' })
  clock_in_time: string;
  @ApiProperty({ nullable: true }) location_id: string | null;
  @ApiProperty() is_overtime: boolean;
}

/**
 * `GET /shifts/current` — the worker's live attendance state (ADR-055): the open
 * session (or null), and the shift options a clock-in could target now. Drives
 * the mobile "Rekam Waktu" screen: it disables Clock Out when nothing is open,
 * and offers the shift picker near midnight / for a dangling shift.
 */
export class AttendanceCurrentDto {
  @ApiProperty({ type: OpenSessionDto, nullable: true })
  open_session: OpenSessionDto | null;

  @ApiProperty({ type: [ShiftOptionDto] })
  options: ShiftOptionDto[];
}
