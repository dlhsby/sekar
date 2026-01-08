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
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Area Type
export interface AreaType {
  id: number;
  code: AreaTypeCode;
  name: string;
  description: string;
  created_at: string;
}

// Area
export interface Area {
  id: number;
  name: string;
  area_type_id: number;
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
  id: number;
  worker_id: number;
  area_id: number;
  area?: Area;
  assigned_at: string;
}

// Shift
export interface Shift {
  id: number;
  worker_id: number;
  area_id: number;
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
  id: number;
  shift_id: number;
  worker_id: number;
  area_id: number;
  worker?: User;
  area?: Area;
  report_time: string;
  gps_lat: number;
  gps_lng: number;
  notes?: string;
  condition?: ReportCondition;
  asset_id?: number;
  reviewed: boolean;
  reviewed_by?: number;
  reviewed_at?: string;
  media?: ReportMedia[];
  created_at: string;
  updated_at: string;
}

// Report Media
export interface ReportMedia {
  id: number;
  report_id: number;
  media_type: MediaType;
  media_url: string;
  thumbnail_url?: string;
  file_size_kb: number;
  created_at: string;
}

// Location Ping
export interface LocationPing {
  id?: number;
  worker_id?: number;
  shift_id?: number;
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
  worker_id: number;
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
  worker_id: number;
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

