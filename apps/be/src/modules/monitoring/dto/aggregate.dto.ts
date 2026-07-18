import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Per-status worker counts for an aggregate node (rayon or area).
 * Mirrors the five-status model (ADR-011).
 */
/**
 * Per-status headcount for a bubble. Three values (ADR-046 amendment):
 * `inactive` / `missing` folded into **offline**, and `outside_area` is no longer
 * a status at all — inside/outside is an independent axis (`outside_area` below
 * counts it *alongside* active/offline rather than instead of them).
 *
 * ⚠️ `offline` changed meaning: it was *not clocked in* (now `absent`), it is now
 * *clocked in but unreachable*.
 */
export class AggregateStatusCountsDto {
  @ApiProperty({ example: 12, description: 'Clocked in, fix newer than the threshold' })
  active: number;

  @ApiProperty({ example: 4, description: 'Clocked in, no fix or stale beyond the threshold' })
  offline: number;

  @ApiProperty({ example: 2, description: 'Not clocked in (tidak hadir where a schedule exists)' })
  absent: number;

  @ApiProperty({
    example: 1,
    description:
      'Of the active+offline above, how many are outside their area — an AXIS, not a status',
  })
  outside_area: number;
}

/**
 * Roster attendance trio for an aggregate node (or the whole response).
 * Mirrors the snapshot's expected/present/absent so `not_clocked_in` is always
 * `scheduled - clocked_in` clamped at 0 (a person can't be absent and present).
 * - `scheduled`      — distinct workers rostered today (status planned/present)
 * - `clocked_in`     — of those, how many have an active shift (clocked in)
 * - `not_clocked_in` — scheduled workers who have not clocked in
 */
export class AggregateRosterCountsDto {
  @ApiProperty({ example: 30 })
  scheduled: number;

  @ApiProperty({ example: 24 })
  clocked_in: number;

  @ApiProperty({ example: 6 })
  not_clocked_in: number;
}

/** Dalam/luar (inside/outside area) split for one activity bucket. */
export class PresenceLocationCountsDto {
  @ApiProperty({ example: 4 })
  dalam: number;

  @ApiProperty({ example: 1 })
  luar: number;
}

/**
 * Presence breakdown of the HADIR (scheduled + clocked-in) workers only —
 * ad-hoc/unscheduled clock-ins are excluded. `aktif` = fresh GPS ping;
 * `tidak_aktif` = offline or last ping older than the idle threshold. Each is
 * split dalam/luar area.
 */
export class PresenceBreakdownDto {
  @ApiProperty({ type: PresenceLocationCountsDto })
  aktif: PresenceLocationCountsDto;

  @ApiProperty({ type: PresenceLocationCountsDto })
  tidak_aktif: PresenceLocationCountsDto;
}

/**
 * One aggregate node — a rayon (city scope) or an area (rayon scope).
 * Carries only a center point + counts, never individual worker coordinates,
 * so the map can render lightweight summary bubbles that drill down on tap.
 */
export class AggregateNodeDto {
  @ApiProperty({ example: 'rayon-uuid' })
  id: string;

  @ApiProperty({ example: 'Rayon Selatan' })
  name: string;

  @ApiProperty({ enum: ['rayon', 'area', 'region'], example: 'rayon' })
  type: 'rayon' | 'area' | 'region';

  @ApiPropertyOptional({ example: -7.2575, nullable: true })
  center_lat: number | null;

  @ApiPropertyOptional({ example: 112.7521, nullable: true })
  center_lng: number | null;

  @ApiProperty({ type: AggregateStatusCountsDto })
  counts_by_status: AggregateStatusCountsDto;

  @ApiProperty({
    description: 'Worker counts keyed by role (satgas, linmas, korlap, …)',
    example: { satgas: 8, linmas: 2 },
  })
  counts_by_role: Record<string, number>;

  @ApiProperty({ description: 'Total tracked workers (with an active shift)', example: 22 })
  worker_count: number;

  @ApiProperty({ description: 'Online = active + inactive + outside_area', example: 16 })
  online_count: number;

  @ApiProperty({ description: 'Required workers for the current shift + day type', example: 18 })
  required: number;

  @ApiProperty({ example: true })
  is_understaffed: boolean;

  @ApiProperty({
    type: AggregateRosterCountsDto,
    description: 'Roster attendance trio (scheduled / clocked-in=hadir / not clocked-in) for today',
  })
  roster: AggregateRosterCountsDto;

  @ApiProperty({
    type: PresenceBreakdownDto,
    description: 'Activity×location breakdown of the hadir (scheduled+clocked-in) workers',
  })
  presence: PresenceBreakdownDto;

  @ApiPropertyOptional({ description: 'Number of areas (rayon nodes only)', example: 15 })
  area_count?: number;

  @ApiPropertyOptional({ description: 'Number of locations (region nodes only)', example: 8 })
  location_count?: number;

  @ApiPropertyOptional({ description: 'Rayon id (area nodes only)', example: 'rayon-uuid' })
  rayon_id?: string | null;

  @ApiPropertyOptional({ description: 'Region id (area nodes only)', example: 'region-uuid' })
  region_id?: string | null;

  @ApiPropertyOptional({
    description: 'Named marker glyph configured for the area',
    example: 'trees',
  })
  marker_icon?: string | null;

  @ApiPropertyOptional({
    description: "The area's identity color (border_color) — fills the marker pin",
    example: '#1b6f1c',
    nullable: true,
  })
  marker_color?: string | null;
}

/**
 * Lightweight aggregate response for the monitoring map's "Ringkasan" mode.
 * `nodes` are rayons when `scope=city`, or areas when `scope=rayon`.
 */
export class AggregateResponseDto {
  @ApiProperty({ enum: ['city', 'rayon', 'region'], example: 'city' })
  scope: 'city' | 'rayon' | 'region';

  @ApiPropertyOptional({ example: 'rayon-uuid', nullable: true })
  scope_id: string | null;

  @ApiProperty({ type: [AggregateNodeDto] })
  nodes: AggregateNodeDto[];

  @ApiProperty({ type: AggregateStatusCountsDto })
  totals: AggregateStatusCountsDto;

  @ApiProperty({
    type: AggregateRosterCountsDto,
    description: 'Roster attendance trio for the whole scope (distinct workers)',
  })
  roster_totals: AggregateRosterCountsDto;

  @ApiProperty({
    type: PresenceBreakdownDto,
    description: 'Activity×location breakdown of hadir workers across the whole scope',
  })
  presence_totals: PresenceBreakdownDto;

  @ApiProperty({
    example: 1,
    description: 'Ad-hoc workers: clocked in but not on the current shift roster (Luar jadwal).',
  })
  off_schedule_count: number;

  @ApiProperty({ example: '2026-07-04T10:30:00Z' })
  generated_at: Date;
}
