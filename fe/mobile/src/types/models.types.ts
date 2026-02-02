/**
 * Data Models
 * TypeScript interfaces for all data models used in the app
 */

// User roles - matches backend UserRole enum exactly (lowercase)
export type UserRole =
  | 'worker'
  | 'supervisor'
  | 'admin'
  | 'top_management'
  | 'kepala_rayon'
  | 'koordinator_lapangan'
  | 'linmas';

// Area types
export type AreaTypeCode = 'park' | 'pedestrian' | 'mini_garden' | 'street';

// Work report conditions
export type ReportCondition = 'Baik' | 'Cukup' | 'Buruk';

// Media types
export type MediaType = 'photo' | 'video';

// Task status (Phase 2)
export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined';

// Task priority (Phase 2)
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// Day type for scheduling
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

// Area type category (Phase 2)
export type AreaTypeCategory = 'ACTIVE' | 'PASSIVE';

// User
export interface User {
  id: string; // UUID (updated to match backend)
  username: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Area Type
export interface AreaType {
  id: string; // UUID (updated to match backend)
  code: AreaTypeCode;
  name: string;
  description: string;
  created_at: string;
}

// Area
export interface Area {
  id: string; // UUID
  name: string;
  area_type_id: string; // UUID (updated to match backend)
  area_type?: AreaType;
  gps_lat: number;
  gps_lng: number;
  radius_meters: number;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Worker Assignment
export interface WorkerAssignment {
  id: string; // UUID (updated to match backend)
  worker_id: string; // UUID (updated to match backend)
  area_id: string; // UUID (updated to match backend)
  area?: Area;
  assigned_at: string;
}

// Shift
export interface Shift {
  id: string; // UUID (updated to match backend)
  worker_id: string; // UUID (updated to match backend)
  area_id: string; // UUID (updated to match backend)
  area?: Area;
  clock_in_time: string;
  clock_in_gps_lat: number;
  clock_in_gps_lng: number;
  clock_in_photo_url?: string;
  clock_out_time?: string;
  clock_out_gps_lat?: number;
  clock_out_gps_lng?: number;
  created_at: string;
  updated_at: string;
}

// Work Report
export interface WorkReport {
  id: string; // UUID
  shift_id: string; // UUID
  worker_id: string; // UUID
  area_id: string; // UUID
  worker?: User;
  area?: Area;
  report_time?: string;
  report_type?: string; // Backend field
  gps_lat: number | null;
  gps_lng: number | null;
  notes?: string; // Legacy field
  description?: string; // Backend field (same as notes)
  condition?: ReportCondition;
  asset_id?: number;
  reviewed?: boolean; // Legacy field
  is_reviewed?: boolean; // Backend field
  reviewed_by?: string; // UUID
  reviewed_at?: string;
  media?: ReportMedia[]; // Array format
  photo_url?: string; // Backend field (single URL)
  created_at: string;
  updated_at: string;
}

// Report Media
export interface ReportMedia {
  id: string; // UUID
  report_id: string; // UUID
  media_type: MediaType;
  media_url: string;
  thumbnail_url?: string;
  file_size_kb: number;
  created_at: string;
}

// Location Ping (LocationLog in backend)
export interface LocationPing {
  id?: string; // UUID (updated to match backend)
  worker_id?: string; // UUID (updated to match backend)
  shift_id?: string; // UUID (updated to match backend)
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

// Active Worker (for supervisor map)
export interface ActiveWorker {
  worker_id: string; // UUID (updated to match backend)
  full_name: string;
  area_name: string;
  area_type: string;
  current_gps_lat: number;
  current_gps_lng: number;
  clock_in_time: string;
  last_ping_time: string;
}

// Attendance Record (for supervisor)
export interface AttendanceRecord {
  worker_id: string; // UUID (updated to match backend)
  full_name: string;
  area_name: string;
  area_type: string;
  clock_in_time?: string;
  clock_out_time?: string;
  hours_worked: number;
  reports_count: number;
}

// Dashboard Summary (for worker)
export interface WorkerDashboard {
  current_shift?: Shift;
  today_reports_count: number;
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

// Worker Schedule
export interface WorkerSchedule {
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

// Task (Phase 2)
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  area_id: string;
  area?: Area;
  activity_type_id: string;
  activity_type?: ActivityType;
  assigned_to?: string;
  assigned_user?: User;
  created_by: string;
  creator?: User;
  completion_photo_url?: string;
  completion_notes?: string;
  completed_at?: string;
  gps_lat?: number;
  gps_lng?: number;
  decline_reason?: string;
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
  data?: Record<string, any>;
  read: boolean;
  read_at?: string;
  created_at: string;
}

// Monitoring Stats
export interface MonitoringStats {
  total_workers: number;
  online_workers: number;
  offline_workers: number;
  total_areas: number;
  staffed_areas: number;
  understaffed_areas: number;
  tasks_pending: number;
  tasks_completed_today: number;
  reports_submitted_today: number;
}

// Live Worker (for real-time monitoring)
export interface LiveWorker {
  id: string;
  user_id: string;
  full_name: string;
  role: UserRole;
  area_id: string;
  area_name: string;
  shift_id: string;
  clock_in_time: string;
  gps_lat: number;
  gps_lng: number;
  last_location_at: string;
  battery_level?: number;
}

