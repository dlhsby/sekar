import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Per-status worker counts for an aggregate node (rayon or area).
 * Mirrors the five-status model (ADR-011).
 */
export class AggregateStatusCountsDto {
  @ApiProperty({ example: 12 })
  active: number;

  @ApiProperty({ example: 3 })
  inactive: number;

  @ApiProperty({ example: 1 })
  outside_area: number;

  @ApiProperty({ example: 2 })
  missing: number;

  @ApiProperty({ example: 4 })
  offline: number;
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

  @ApiProperty({ enum: ['rayon', 'area'], example: 'rayon' })
  type: 'rayon' | 'area';

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

  @ApiPropertyOptional({ description: 'Rayon id (area nodes only)', example: 'rayon-uuid' })
  rayon_id?: string | null;
}

/**
 * Lightweight aggregate response for the monitoring map's "Ringkasan" mode.
 * `nodes` are rayons when `scope=city`, or areas when `scope=rayon`.
 */
export class AggregateResponseDto {
  @ApiProperty({ enum: ['city', 'rayon'], example: 'city' })
  scope: 'city' | 'rayon';

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

  @ApiProperty({ example: '2026-07-04T10:30:00Z' })
  generated_at: Date;
}
