/**
 * Monitoring, presence/tracking, staffing and reassignment models (Phase 2D/4).
 */
import type { GeoJsonGeometry } from './geo.types';
import type { Area, UserRole } from './user.types';
import type { Shift } from './shift.types';

// Tracking status — three-state model with is_within_area axis
export type TrackingStatus = 'active' | 'offline' | 'absent';

// Two-axis presence model — independent axes. Named Presence* to avoid clashing
// with the activity-submission `ActivityStatus`.
// - Activity (GPS recency): aktif ≤5min · offline (clocked in but unreachable)
//   · absent (not clocked in)
// - Location (geofence): dalam_area · luar_area · unknown (no usable fix)
export type PresenceActivity = 'aktif' | 'offline' | 'absent';
export type PresenceLocation = 'dalam_area' | 'luar_area' | 'unknown';

// Active User (for supervisor map, was ActiveWorker)
export interface ActiveUser {
  user_id: string;
  full_name: string;
  role: UserRole;
  location_name: string;
  area_type: string;
  current_gps_lat: number;
  current_gps_lng: number;
  clock_in_time: string;
  last_ping_time: string;
}

// Attendance Record
export interface AttendanceRecord {
  user_id: string;
  full_name: string;
  location_name: string;
  area_type: string;
  clock_in_time?: string;
  clock_out_time?: string;
  hours_worked: number;
  activities_count: number;
}

// Dashboard Summary (for field roles, was WorkerDashboard)
export interface FieldDashboard {
  current_shift?: Shift;
  today_activities_count: number;
  today_hours_worked: number;
  assigned_area?: Area;
  pending_sync_count: number;
}

// Monitoring Stats
export interface MonitoringStats {
  total_users: number;
  online_users: number;
  offline_users: number;
  total_areas: number;
  staffed_areas: number;
  understaffed_areas: number;
  tasks_pending: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
}

// Live User (was LiveWorker) — matches backend Phase 2D LiveUserDto
export interface LiveUser {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  // Two-axis presence (CP6). Optional during rollout — derive from `status` +
  // `is_within_area` via `deriveAxes` when the backend payload omits them.
  activity?: PresenceActivity;
  location?: PresenceLocation;
  area_id: string | null;
  location_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  /** Attendance lifecycle (ADR-050). A live pin is always `bertugas`. */
  lifecycle_state?:
    | 'tidak_bertugas'
    | 'belum_hadir'
    | 'terlambat'
    | 'bertugas'
    | 'pulang'
    | 'tidak_hadir';
  /** Clocked in after start + grace. */
  is_late?: boolean;
  /** Lifecycle flags: is_late | ad_hoc | lupa_clock_out | lembur | early | excused. */
  lifecycle_flags?: string[];
  /** True if on the current shift roster; false = ad-hoc / off-schedule. */
  is_scheduled?: boolean;
  outside_boundary: boolean;
  shift_id: string;
  shift_name: string;
  shift_definition_id: string | null;
  clock_in_time: string;
  current_task_status: string | null;
  current_task_title: string | null;
  /** Team membership for grouping into team bubbles (ADR-048). team_id = schedule_event_id ?? team_category_id. */
  team_id?: string | null;
  /** Team name (from team_category.name). */
  team_name?: string | null;
  /** Marker color in hex format (from team_category.marker_color). */
  team_color?: string | null;
}

// Absent User for daily roster monitoring — Phase 3 (roster monitoring)
export interface AbsentUser {
  user_id: string;
  full_name: string;
  role: string;
  rayon_id: string | null;
  shift_definition_id: string | null;
  shift_name: string | null;
}

// Live Users Response — three-state status model with roster monitoring fields
export interface LiveUsersResponse {
  total_active: number;
  total_offline: number;
  total_absent: number;
  total_outside_area: number;
  /** @deprecated Use total_active */
  total_online: number;
  users: LiveUser[];
  generated_at: string;
  // Roster monitoring fields (optional during rollout)
  expected_count?: number;
  present_count?: number;
  absent_count?: number;
  on_leave_count?: number;
  off_schedule_count?: number;
  absent_users?: AbsentUser[];
}

// User Day Summary — Phase 2D
export interface UserDaySummary {
  user_id: string;
  full_name: string;
  username: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  location_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  shift: {
    id: string;
    name: string;
    clock_in_time: string;
    clock_out_time: string | null;
    duration_minutes: number;
    outside_boundary: boolean;
  } | null;
  last_location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    battery_level: number | null;
    logged_at: string;
    is_within_area: boolean;
  } | null;
  activities_today: {
    id: string;
    title: string;
    activity_type: string;
    created_at: string;
    photo_url: string | null;
  }[];
  tasks_today: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  whatsapp_links: {
    chat: string;
    call: string;
  } | null;
}

// Location History Point — Phase 2D
export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  logged_at: string;
  is_within_area: boolean;
}

// Location History — Phase 2D
export interface LocationHistory {
  user_id: string;
  user_name: string;
  role: string;
  date: string;
  shift_id: string | null;
  shift_name: string | null;
  area_id: string | null;
  location_name: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  points: LocationHistoryPoint[];
  total_points: number;
  total_distance_meters: number;
  time_inside_area_minutes: number;
  time_outside_area_minutes: number;
  generated_at: string;
}

// Staffing Summary Item — three-state status model
export interface StaffingSummaryItem {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  roles: {
    role: string;
    active: number;
    offline: number;
    absent: number;
    outside_area: number;
    total_assigned: number;
    total_required: number;
  }[];
  total_active: number;
  total_offline: number;
  total_absent: number;
  total_outside_area: number;
  is_fully_staffed: boolean;
}

// WebSocket event types — Phase 2D
export interface UserStatusChangedEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string | null;
  location_name: string | null;
  rayon_id: string | null;
  previous_status: TrackingStatus;
  new_status: TrackingStatus;
  // Two-axis presence (CP6) — optional during backend rollout.
  activity?: PresenceActivity;
  location?: PresenceLocation;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface UserAreaEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string;
  location_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Phase 2D: WebSocket reassigned event
export interface UserReassignedEvent {
  user_id: string;
  user_name: string;
  role: string;
  previous_area_id: string | null;
  previous_area_name: string | null;
  new_area_id: string;
  new_area_name: string;
  rayon_id: string | null;
  timestamp: string;
}

// Phase 2D: WebSocket area staffing changed event
export interface AreaStaffingChangedEvent {
  area_id: string;
  rayon_id: string | null;
  active_count: number;
  required_count: number;
  is_met: boolean;
  timestamp: string;
}

// Phase 2D: Boundary types for monitoring map
export interface RoleStaffingItem {
  role: string;
  required: number;
  active: number;
}

export interface AreaBoundary {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  boundary_polygon: GeoJsonGeometry | null;
  rayon_id: string;
  rayon_name: string;
  assigned_count: number;
  staffing: RoleStaffingItem[];
  is_understaffed: boolean;
  total_active: number;
  total_required: number;
}

export interface RayonBoundary {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  boundary_polygon: GeoJsonGeometry | null;
  areas: AreaBoundary[];
  area_count: number;
  is_understaffed: boolean;
  understaffed_area_count: number;
  /** DB-driven hex color for the rayon polygon; falls back to a deterministic palette. */
  color?: string | null;
}

export interface BoundariesResponse {
  rayons: RayonBoundary[];
  generated_at: string;
}

// Aggregate ("Ringkasan") rollup — lightweight per-rayon/per-area summary
// bubbles for the monitoring map (no individual worker coordinates).
export interface AggregateStatusCounts {
  active: number;
  offline: number;
  absent: number;
  outside_area: number;
}

/** Roster attendance trio for a node (or the whole scope), for today. */
export interface AggregateRosterCounts {
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
}

/** Dalam/luar (inside/outside area) split for one activity bucket. */
export interface PresenceLocationCounts {
  dalam: number;
  luar: number;
}

/** Activity×location breakdown of the hadir (scheduled+clocked-in) workers. */
export interface PresenceBreakdown {
  aktif: PresenceLocationCounts;
  tidak_aktif: PresenceLocationCounts;
}

export interface AggregateNode {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  center_lat: number | null;
  center_lng: number | null;
  counts_by_status: AggregateStatusCounts;
  counts_by_role: Record<string, number>;
  worker_count: number;
  online_count: number;
  required: number;
  is_understaffed: boolean;
  roster: AggregateRosterCounts;
  presence: PresenceBreakdown;
  area_count?: number;
  rayon_id?: string | null;
}

export interface MonitoringAggregateResponse {
  scope: 'city' | 'rayon';
  scope_id: string | null;
  nodes: AggregateNode[];
  totals: AggregateStatusCounts;
  roster_totals: AggregateRosterCounts;
  presence_totals: PresenceBreakdown;
  generated_at: string;
}

// Phase 2D: Staffing summary response wrapper with day type
export interface StaffingSummaryResponseFull {
  items: StaffingSummaryItem[];
  current_day_type: string;
  current_day_type_label: string;
  generated_at: string;
}

// Phase 2D: Reassign worker types
export interface ReassignWorkerPayload {
  user_id: string;
  target_area_id: string;
  shift_definition_id?: string;
  effective_date?: string;
  end_current_schedule?: boolean;
  reason?: string;
}

export interface ReassignWorkerResponse {
  user_id: string;
  user_name: string;
  previous_area_id: string | null;
  previous_area_name: string | null;
  new_area_id: string;
  new_area_name: string;
  new_schedule_id: string | null;
  effective_date: string;
  reassigned_at: string;
}

// Phase 4-4 A4: Reassignment history audit trail
export interface ReassignmentHistoryEntry {
  id: string;
  previous_area_id: string | null;
  previous_area_name: string | null;
  new_area_id: string;
  new_area_name: string;
  reason: string | null;
  effective_date: string | null;
  actor_id: string;
  actor_name: string;
  created_at: string;
}

export interface ReassignmentHistory {
  user_id: string;
  history: ReassignmentHistoryEntry[];
}
