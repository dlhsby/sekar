import { ApiProperty } from '@nestjs/swagger';
import { PunchLabel } from '../enums/punch-label.enum';

/** One immutable punch in the log (ADR-055) — for the mobile Detail timeline. */
export class PunchDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: PunchLabel }) label: PunchLabel;
  @ApiProperty({ description: 'When the punch happened (ISO 8601)' }) punched_at: string;
  @ApiProperty({ nullable: true }) gps_lat: number | null;
  @ApiProperty({ nullable: true }) gps_lng: number | null;
  @ApiProperty({ nullable: true }) accuracy_m: number | null;
  @ApiProperty({ description: 'Whether the worker was outside the area boundary' })
  outside_boundary: boolean;
  @ApiProperty({ nullable: true }) photo_url: string | null;
}

/** A derived session for a day: first-in / last-out + its ordered punches. */
export class PunchSessionDto {
  @ApiProperty({ nullable: true }) shift_definition_id: string | null;
  @ApiProperty() is_overtime: boolean;
  @ApiProperty({ description: 'Jam Masuk — first clock-in (ISO), null if none', nullable: true })
  jam_masuk: string | null;
  @ApiProperty({
    description: 'Jam Keluar — last clock-out (ISO), null while open',
    nullable: true,
  })
  jam_keluar: string | null;
  @ApiProperty({ description: 'Worked minutes = Σ paired segments (breaks excluded)' })
  worked_minutes: number;
  @ApiProperty({ description: 'Open ⟺ the last punch is a clock-in' })
  is_open: boolean;
  @ApiProperty({ type: () => [PunchDto] })
  punches: PunchDto[];
}

/**
 * The punch timeline for one WIB service-day (ADR-055 Phase 4) — the raw log
 * behind a day's attendance, grouped into sessions. Powers the mobile
 * "Detail Pencatatan Waktu" screen.
 */
export class PunchLogDayDto {
  @ApiProperty({ description: 'WIB service-day (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ type: () => [PunchSessionDto] })
  sessions: PunchSessionDto[];
}
