/**
 * Data Models
 * TypeScript interfaces for all data models used in the app
 */

// User roles
export type UserRole = 'worker' | 'supervisor';

// Area types
export type AreaTypeCode = 'park' | 'pedestrian' | 'mini_garden' | 'street';

// Work report conditions
export type ReportCondition = 'Baik' | 'Cukup' | 'Buruk';

// Media types
export type MediaType = 'photo' | 'video';

// Task status
export type TaskStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'declined';

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
  report_time: string;
  gps_lat: number | null;
  gps_lng: number | null;
  notes?: string;
  condition?: ReportCondition;
  asset_id?: number;
  reviewed: boolean;
  reviewed_by?: string; // UUID
  reviewed_at?: string;
  media?: ReportMedia[];
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

