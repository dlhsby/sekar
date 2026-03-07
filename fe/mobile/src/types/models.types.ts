/**
 * Data Models
 * TypeScript interfaces for all data models used in the app
 * Phase 2C: ADR-009 (8-role system), ADR-010 (terminology cleanup)
 */

// User roles - 8 roles matching backend UserRole enum (lowercase)
export type UserRole =
  | 'satgas'
  | 'linmas'
  | 'korlap'
  | 'admin_data'
  | 'kepala_rayon'
  | 'top_management'
  | 'admin_system'
  | 'superadmin';

// Area types
export type AreaTypeCode = 'park' | 'pedestrian' | 'mini_garden' | 'street';

// Media types
export type MediaType = 'photo' | 'video';

// Task status - 8 values (Phase 2C: accept/decline + verify/revision)
export type TaskStatus = 'pending' | 'assigned' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'verified' | 'revision_needed';

// Task priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Overtime status
export type OvertimeStatus = 'pending' | 'approved' | 'rejected';

// Activity approval status
export type ActivityStatus = 'pending' | 'approved' | 'rejected';

// Day type for scheduling
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

// Area type category
export type AreaTypeCategory = 'ACTIVE' | 'PASSIVE';

// User
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  rayon_id?: string;
  rayon?: Rayon;
  area_id?: string;
  area?: Area;
  created_at: string;
  updated_at: string;
}

// Area Type
export interface AreaType {
  id: string;
  code: AreaTypeCode;
  name: string;
  description: string;
  created_at: string;
}

// Area
export interface Area {
  id: string;
  name: string;
  area_type_id: string;
  area_type?: AreaType;
  rayon_id?: string;
  rayon?: Rayon;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  boundary_polygon?: [number, number][];
  address?: string;
  created_at: string;
  updated_at: string;
}

// Shift
export interface Shift {
  id: string;
  user_id: string;
  area_id: string | null; // Phase 2C: nullable, auto-detected
  area?: Area;
  user?: User;
  clock_in_time: string;
  clock_in_gps_lat: number;
  clock_in_gps_lng: number;
  clock_in_photo_url?: string;
  clock_in_outside_boundary?: boolean;
  clock_out_time?: string;
  clock_out_gps_lat?: number;
  clock_out_gps_lng?: number;
  clock_out_outside_boundary?: boolean;
  created_at: string;
  updated_at: string;
}

// Activity (was WorkReport)
export interface Activity {
  id: string;
  user_id: string;
  shift_id: string;
  area_id?: string;
  area?: Area;
  task_id?: string;
  activity_type_id: string;
  activityType?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  user?: User;
  // Activity approval fields
  status?: ActivityStatus;
  reviewed_by?: string;
  reviewer?: User;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// Location Ping (LocationLog in backend)
export interface LocationPing {
  id?: string;
  user_id?: string;
  shift_id?: string;
  timestamp: string;
  gps_lat: number;
  gps_lng: number;
  accuracy_meters: number;
  created_at?: string;
}

// GPS Coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// Active User (for supervisor map, was ActiveWorker)
export interface ActiveUser {
  user_id: string;
  full_name: string;
  role: UserRole;
  area_name: string;
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
  area_name: string;
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

// =====================
// Phase 2 Models
// =====================

// Rayon (Sector)
export interface Rayon {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Shift Definition (fixed shifts)
export interface ShiftDefinition {
  id: string;
  name: string;
  code: string;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  crosses_midnight: boolean;
  is_active: boolean;
  created_at: string;
}

// Activity Type
export interface ActivityType {
  id: string;
  name: string;
  code: string;
  description?: string;
  applicable_roles: UserRole[];
  is_active: boolean;
  created_at: string;
}

// Area Staff Requirements
export interface AreaStaffRequirement {
  id: string;
  area_id: string;
  area?: Area;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  role: UserRole;
  required_count: number;
  day_type: DayType;
  created_at: string;
  updated_at: string;
}

// Schedule (was WorkerSchedule)
export interface Schedule {
  id: string;
  user_id: string;
  user?: User;
  area_id: string;
  area?: Area;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  effective_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Task Tag (Phase 2C)
export interface TaskTag {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  created_at: string;
}

// Task (Phase 2C: accept/decline + verify/revision support, optional area_id, rayon support)
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  area_id?: string;
  area?: Area;
  rayon_id?: string;
  rayon?: Rayon;
  assigned_to?: string;
  assignee?: User;
  created_by: string;
  creator?: User;
  completion_photo_urls?: string[];
  completion_notes?: string;
  completed_at?: string;
  started_at?: string;
  assigned_at?: string;
  accepted_at?: string;
  declined_at?: string;
  decline_reason?: string;
  verified_by?: string;
  verifier?: User;
  verified_at?: string;
  revision_reason?: string;
  tags?: TaskTag[];
  created_at: string;
  updated_at: string;
}

// Overtime (Phase 2C: flat structure, datetime-based, overnight support)
export interface Overtime {
  id: string;
  user_id: string;
  user?: User;
  area_id?: string;
  area?: Area;
  start_datetime: string; // ISO 8601 e.g. "2026-02-14T17:00:00+07:00"
  end_datetime: string;   // ISO 8601 — may cross midnight
  status: OvertimeStatus;
  activity_type_id: string;
  activityType?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  approved_by?: string;
  approved_at?: string;
  approver?: User;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

// Notification
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

// Tracking status — Phase 2D: server-computed five-status model
export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';

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
  shift_id: string;
  shift_name: string;
  shift_definition_id: string | null;
  clock_in_time: string;
  current_task_status: string | null;
  current_task_title: string | null;
}

// Live Users Response — Phase 2D
export interface LiveUsersResponse {
  total_active: number;
  total_inactive: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  /** @deprecated Use total_active */
  total_online: number;
  users: LiveUser[];
  generated_at: string;
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

// Staffing Summary Item — Phase 2D
export interface StaffingSummaryItem {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  roles: {
    role: string;
    active: number;
    idle: number;
    outside_area: number;
    missing: number;
    offline: number;
    total_assigned: number;
    total_required: number;
  }[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

// WebSocket event types — Phase 2D
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
