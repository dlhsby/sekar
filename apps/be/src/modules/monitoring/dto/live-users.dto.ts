import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsString } from 'class-validator';
import { CLOCKABLE_ROLES } from '../../users/constants/role-groups';
import {
  TrackingStatus,
  ActivityStatus,
  LocationStatus,
} from '../entities/user-tracking-status.entity';
import type { LifecycleState, LifecycleFlag } from '../lib/presence-lifecycle';

export class LiveUserDto {
  @ApiProperty({ example: 'user-uuid' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @ApiProperty({ example: '08123456789', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiPropertyOptional({
    description:
      "The role's configured marker icon (null → use the client default glyph for the role)",
    example: 'shield',
    nullable: true,
  })
  role_marker_icon: string | null;

  @ApiProperty({ example: 'area-uuid', nullable: true })
  location_id: string | null;

  @ApiProperty({ example: 'Taman Bungkul' })
  area_name: string;

  @ApiProperty({ example: 'rayon-uuid' })
  rayon_id: string | null;

  @ApiProperty({ example: 'Rayon Selatan' })
  rayon_name: string | null;

  @ApiProperty({ example: 'region-uuid', nullable: true })
  region_id: string | null;

  @ApiProperty({ example: 'Kawasan Bungkul', nullable: true })
  region_name: string | null;

  @ApiProperty({ example: -7.2575 })
  latitude: number;

  @ApiProperty({ example: 112.7521 })
  longitude: number;

  @ApiProperty({ example: 15.5, description: 'GPS accuracy in meters' })
  accuracy: number | null;

  @ApiProperty({ example: 85, description: 'Battery level percentage' })
  battery_level: number | null;

  @ApiProperty({ example: '2024-01-24T10:25:00Z' })
  last_update: Date;

  @ApiProperty({ enum: TrackingStatus, example: 'active' })
  status: TrackingStatus;

  @ApiProperty({ example: 'aktif', description: 'Activity axis: aktif|offline|absent' })
  activity: ActivityStatus;

  @ApiProperty({
    example: 'dalam_area',
    description: 'Location axis: dalam_area|luar_area|unknown',
  })
  location: LocationStatus;

  @ApiProperty({ example: true })
  is_within_area: boolean;

  @ApiProperty({
    example: 'bertugas',
    description: 'Attendance lifecycle (ADR-050). Live workers are always bertugas.',
  })
  lifecycle_state: LifecycleState;

  @ApiProperty({ example: false, description: 'Clocked in after the shift start + grace' })
  is_late: boolean;

  @ApiProperty({
    example: [],
    description: 'Lifecycle flags: is_late | ad_hoc | lupa_clock_out | lembur | early | excused',
    type: [String],
  })
  lifecycle_flags: LifecycleFlag[];

  @ApiProperty({
    example: true,
    description: 'True if on the current shift roster; false = ad-hoc / off-schedule',
  })
  is_scheduled: boolean;

  @ApiProperty({ example: false, description: 'Whether user clocked in outside area boundary' })
  outside_boundary: boolean;

  @ApiProperty({ example: 'shift-uuid' })
  shift_id: string;

  @ApiProperty({ example: 'shift-def-uuid', nullable: true })
  shift_definition_id: string | null;

  @ApiProperty({ example: 'Shift 1' })
  shift_name: string;

  @ApiProperty({ example: '2024-01-24T06:00:00Z' })
  clock_in_time: Date;

  @ApiProperty({ example: 'in_progress' })
  current_task_status: string | null;

  @ApiProperty({ example: 'Clean fountain area' })
  current_task_title: string | null;

  @ApiPropertyOptional({ example: 'team-or-event-uuid', nullable: true })
  team_id: string | null;

  @ApiPropertyOptional({ example: 'Penyiraman', nullable: true })
  team_name: string | null;

  @ApiPropertyOptional({ example: '#22C55E', nullable: true })
  team_color: string | null;
}

export class LiveUsersFilterDto {
  @ApiPropertyOptional({ description: 'Filter by rayon ID' })
  @IsUUID()
  @IsOptional()
  rayon_id?: string;

  @ApiPropertyOptional({ description: 'Filter by area ID' })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Filter by role', enum: CLOCKABLE_ROLES })
  @IsEnum(CLOCKABLE_ROLES)
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by tracking status', enum: TrackingStatus })
  @IsEnum(TrackingStatus)
  @IsOptional()
  status?: TrackingStatus;

  @ApiPropertyOptional({
    description:
      'Server-side search (5.7a): matches worker name or lokasi name among workers clocked in ' +
      'with a location fix in the last 24h — including monitorable-but-unscheduled clock-ins.',
  })
  @IsString()
  @IsOptional()
  q?: string;
}

/**
 * A worker expected on today's roster who has not clocked in (and is not on
 * leave). Surfaced so supervisors see "who's missing from the plan", not just
 * live pins.
 */
export class AbsentUserDto {
  @ApiProperty({ example: 'user-uuid' })
  user_id: string;

  @ApiProperty({ example: 'John Doe' })
  full_name: string;

  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiProperty({ example: 'rayon-uuid', nullable: true })
  rayon_id: string | null;

  @ApiProperty({ example: 'shift-def-uuid', nullable: true })
  shift_definition_id: string | null;

  @ApiProperty({ example: 'Shift 1', nullable: true })
  shift_name: string | null;
}

export class LiveUsersResponseDto {
  @ApiProperty({ example: 30, description: 'Clocked in, location fresher than the threshold' })
  total_active: number;

  @ApiProperty({ example: 10, description: 'Clocked in but unreachable past the threshold' })
  total_offline: number;

  @ApiProperty({
    example: 5,
    description: 'Not clocked in. Reads as "tidak hadir" only where a schedule exists',
  })
  total_absent: number;

  @ApiProperty({
    example: 3,
    description:
      'Axis, NOT a status: how many of the above are outside their boundary. Overlaps active/offline, so these four do not sum to a headcount',
  })
  total_outside_area: number;

  @ApiProperty({ example: 30, description: 'Deprecated alias for total_active', deprecated: true })
  total_online: number;

  @ApiProperty({ type: [LiveUserDto] })
  users: LiveUserDto[];

  // ── Roster-derived "expected vs actual" (ADR-013). Counts compare today's
  // materialized roster to who has actually clocked in. Rayon-scoped when a
  // rayon_id filter is supplied; otherwise global.
  @ApiProperty({ example: 40, description: 'Workers expected on the roster today (have a shift)' })
  expected_count: number;

  @ApiProperty({ example: 30, description: 'Expected workers who have clocked in' })
  present_count: number;

  @ApiProperty({ example: 8, description: 'Expected workers who have not clocked in' })
  absent_count: number;

  @ApiProperty({ example: 2, description: 'Workers on sick/annual leave today' })
  on_leave_count: number;

  @ApiProperty({ example: 5, description: 'Active workers with no shift scheduled today' })
  off_schedule_count: number;

  @ApiProperty({ type: [AbsentUserDto] })
  absent_users: AbsentUserDto[];

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
