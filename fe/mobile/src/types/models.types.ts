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
  assigned_user?: User;
  created_by: string;
  creator?: User;
  completion_photo_url?: string;
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

// Live User (was LiveWorker) — matches backend LiveUserDto
export interface LiveUser {
  id: string;
  full_name: string;
  role: UserRole;
  area_id: string;
  area_name: string;
  shift_id: string;
  clock_in_time: string;
  latitude: number;
  longitude: number;
  last_update: string;
  battery_level?: number;
  outside_boundary?: boolean;
}
