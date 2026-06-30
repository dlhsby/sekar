/**
 * Monitoring Domain Types (Phase 2D)
 * All interfaces matching backend DTOs for the monitoring module
 */

import type { UserRole } from '@/types/models';

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';

// ---------------------------------------------------------------------------
// City / Rayon / Area Stats (Phase 2C - unchanged)
// ---------------------------------------------------------------------------

export interface CityStats {
  total_rayons: number;
  total_areas: number;
  total_workers: number;
  workers_online: number;
  workers_offline: number;
  active_shifts: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
  generated_at: string;
}

export interface RayonMonitoringStats {
  id: string;
  name: string;
  code: string;
  total_areas: number;
  total_workers: number;
  workers_online: number;
  workers_offline: number;
  active_shifts: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
  alerts: string[];
  generated_at: string;
}

export interface AreaMonitoringStats {
  id: string;
  name: string;
  area_type: string;
  rayon_id: string;
  rayon_name: string;
  coverage_area: number | null;
  total_users_assigned: number;
  users_online: number;
  users_offline: number;
  is_fully_staffed: boolean;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_completed_today: number;
  activities_submitted_today: number;
  alerts: string[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Live Users (Phase 2D - enhanced with status + phone + task)
// ---------------------------------------------------------------------------

export interface LiveUser {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  outside_boundary: boolean;
  shift_id: string;
  shift_name: string;
  clock_in_time: string;
  current_task_status: string | null;
  current_task_title: string | null;
}

/** A rostered worker expected today who has not clocked in (ADR-013). */
export interface AbsentUser {
  user_id: string;
  full_name: string;
  role: string;
  rayon_id: string | null;
  shift_definition_id: string | null;
  shift_name: string | null;
}

export interface LiveUsersResponse {
  total_active: number;
  total_inactive: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  users: LiveUser[];
  // Roster-derived "expected vs actual" for today (optional — present once the
  // daily roster is generated; defaults to 0 otherwise).
  expected_count?: number;
  present_count?: number;
  absent_count?: number;
  on_leave_count?: number;
  off_schedule_count?: number;
  absent_users?: AbsentUser[];
  generated_at: string;
}

export interface LiveUsersFilters {
  rayon_id?: string;
  area_id?: string;
  role?: string;
  status?: TrackingStatus;
  search?: string;
}

// ---------------------------------------------------------------------------
// User Day Summary (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface UserDaySummary {
  user_id: string;
  full_name: string;
  username: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string | null;
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
  whatsapp_links: { chat: string; call: string } | null;
}

// ---------------------------------------------------------------------------
// Location History (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  logged_at: string;
  is_within_area: boolean;
}

export interface LocationHistory {
  user_id: string;
  user_name: string;
  role: string;
  date: string;
  shift_id: string | null;
  shift_name: string | null;
  area_id: string | null;
  area_name: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  points: LocationHistoryPoint[];
  total_points: number;
  total_distance_meters: number;
  time_inside_area_minutes: number;
  time_outside_area_minutes: number;
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Staffing Summary (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface StaffingRoleBreakdown {
  role: string;
  active: number;
  idle: number;
  outside_area: number;
  missing: number;
  offline: number;
  total_assigned: number;
  total_required: number;
}

export interface StaffingSummaryItem {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  roles: StaffingRoleBreakdown[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

export interface StaffingSummaryResponse {
  items: StaffingSummaryItem[];
  generated_at: string;
}

export interface StaffingFilters {
  rayon_id?: string;
  area_id?: string;
}

// ---------------------------------------------------------------------------
// Monitoring Config (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface MonitoringConfigItem {
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
}

export interface MonitoringConfigResponse {
  configs: MonitoringConfigItem[];
}

// ---------------------------------------------------------------------------
// WebSocket Event Types (Phase 2D - new)
// ---------------------------------------------------------------------------

export interface UserStatusChangedEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  previous_status: TrackingStatus;
  new_status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface UserAreaEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Boundaries (Phase 2D-10 Gap Fix #2)
// ---------------------------------------------------------------------------

export interface RoleStaffingItem {
  role: string;
  required: number;
  active: number;
}

export interface AreaBoundary {
  id: string;
  name: string;
  boundary_polygon: GeoJSON.Geometry | null;
  center_lat: number;
  center_lng: number;
  rayon_id: string | null;
  rayon_name: string;
  radius_meters: number | null;
  assigned_count: number;
  is_understaffed: boolean;
  staffing_summary: RoleStaffingItem[];
}

export interface RayonBoundary {
  id: string;
  name: string;
  code: string;
  boundary_polygon: GeoJSON.Geometry | null;
  center_lat: number | null;
  center_lng: number | null;
  area_count: number;
  is_understaffed: boolean;
  understaffed_area_count: number;
  areas: AreaBoundary[];
}

export interface BoundariesResponse {
  rayons: RayonBoundary[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Reassign Worker (Phase 2D-10 Gap Fix #5)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Day Type (Phase 2D-10 Gap Fix #7)
// ---------------------------------------------------------------------------

export type DayType = 'weekday' | 'weekend' | 'holiday';
