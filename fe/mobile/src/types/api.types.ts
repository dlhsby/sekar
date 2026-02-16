/**
 * API Types
 * TypeScript interfaces for API requests and responses
 * Phase 2C: ADR-009 (8-role system), ADR-010 (terminology cleanup)
 */

import type {
  User,
  Area,
  AreaType,
  Shift,
  Activity,
  LocationPing,
  ActiveUser,
  AttendanceRecord,
  Task,
  TaskStatus,
  TaskPriority,
  ActivityType,
  ShiftDefinition,
  Notification,
  MonitoringStats,
  LiveUser,
  UserRole,
  Overtime,
} from './models.types';

// Auth API
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface MeResponse extends User {
  assigned_area?: Area;
}

// Users API
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Shifts API
export interface ClockInRequest {
  area_id?: string; // Phase 2C: optional, auto-detected from schedule
  gps_lat: number;
  gps_lng: number;
  selfie_photo: string; // base64 encoded with data URI prefix
}

export interface ClockInResponse {
  shift_id: string;
  clock_in_time: string;
}

export interface ClockOutRequest {
  gps_lat: number;
  gps_lng: number;
}

export interface ClockOutResponse {
  shift_id: string;
  clock_out_time: string;
  total_hours: number;
}

export interface CurrentShiftResponse extends Shift {
  area_name: string;
  area_type: string;
  hours_worked: number;
}

// Activities API (was Reports)
export interface CreateActivityRequest {
  activity_type_id: string;
  description: string;
  photo_urls: string[]; // 1-3 S3 URLs
  gps_lat?: number;
  gps_lng?: number;
}

export interface CreateActivityResponse {
  id: string;
  created_at: string;
}

export interface ActivitiesFilter {
  date?: string; // YYYY-MM-DD
  area_id?: string;
  user_id?: string;
}

// Location API
export interface LocationPoint {
  gps_lat: number;
  gps_lng: number;
  accuracy_meters?: number;
  battery_level?: number;
  logged_at: string; // ISO 8601 timestamp
}

export interface LocationBatchRequest {
  shift_id: string;
  locations: LocationPoint[];
}

export interface LegacyLocationBatchRequest {
  pings: LocationPing[];
}

export interface LocationBatchResponse {
  inserted_count: number;
}

// Supervisor API
export interface ActiveUserLocation {
  gps_lat: number;
  gps_lng: number;
  logged_at: string;
}

export interface ActiveUserArea {
  id: string;
  name: string;
}

export interface ActiveUserShift {
  id: string;
  clock_in_time: string;
  area: ActiveUserArea;
}

export interface ActiveUserData {
  id: string;
  username: string;
  full_name: string;
  role?: UserRole;
  shift: ActiveUserShift;
  latest_location: ActiveUserLocation | null;
}

export interface PaginatedActiveUsersResponse {
  users: ActiveUserData[];
}

export interface AttendanceFilter {
  date?: string;
  area_id?: string;
  area_type?: string;
}

export interface AttendanceResponse {
  date: string;
  total_workers: number;
  clocked_in_count: number;
  not_clocked_in: NotClockedInUser[];
}

export interface NotClockedInUser {
  id: string;
  username: string;
  full_name: string;
  area?: {
    id: string;
    name: string;
  } | null;
}

// Master Data API
export interface AreasResponse {
  areas: Area[];
}

export interface AreaTypesResponse {
  area_types: AreaType[];
}

// Generic API Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Generic API Error
export interface ApiError {
  status: number;
  code: string;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
  details?: unknown;
  errors?: Record<string, string[]>;
}

// =====================
// Phase 2 API Types
// =====================

// Tasks API
export interface TasksFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  area_id?: string;
  assigned_to?: string;
  created_by?: string;
  from_date?: string;
  to_date?: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline?: string;
  area_id?: string; // Phase 2C: optional
  rayon_id?: string; // Phase 2C: rayon-scoped tasks
  assigned_to?: string;
  tagged_user_ids?: string[]; // Phase 2C: task tagging
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  assigned_to?: string;
}

export interface AssignTaskRequest {
  assigned_to: string;
}

export interface CompleteTaskRequest {
  description: string; // Phase 2C: required
  completion_photo_url: string; // Phase 2C: required, S3 URL
}

export interface TagTaskRequest {
  user_ids: string[];
}

export interface TasksListResponse {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Overtime API (Phase 2C: new)
export interface CreateOvertimeRequest {
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  activity_type_id: string;
  description: string;
  photo_urls: string[]; // 1-3 S3 URLs
  gps_lat?: number;
  gps_lng?: number;
  notes?: string;
}

export interface RejectOvertimeRequest {
  reason: string;
}

export interface OvertimeListResponse {
  data: Overtime[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Activity Types API
export interface ActivityTypesFilter {
  role?: UserRole;
  is_active?: boolean;
}

export interface ActivityTypesListResponse {
  data: ActivityType[];
}

// Shift Definitions API
export interface ShiftDefinitionsListResponse {
  data: ShiftDefinition[];
}

export interface CurrentShiftDefinitionResponse extends ShiftDefinition {
  is_current: boolean;
  time_remaining_minutes?: number;
}

// Notifications API
export interface RegisterDeviceRequest {
  fcm_token: string;
  platform: 'android' | 'ios';
  device_id?: string;
  device_name?: string;
  device_model?: string;
  app_version?: string;
}

export interface NotificationsFilter {
  read?: boolean;
  type?: string;
  from_date?: string;
  to_date?: string;
}

export interface NotificationsListResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unread_count: number;
  };
}

export interface BroadcastNotificationRequest {
  title: string;
  body: string;
  target_roles?: UserRole[];
  target_area_id?: string;
  target_rayon_id?: string;
  data?: Record<string, unknown>;
}

// Monitoring API
export interface MonitoringFilter {
  rayon_id?: string;
  area_id?: string;
  date?: string;
}

export interface CityMonitoringResponse extends MonitoringStats {
  rayons: {
    id: string;
    name: string;
    stats: MonitoringStats;
  }[];
}

export interface RayonMonitoringResponse extends MonitoringStats {
  rayon_id: string;
  rayon_name: string;
  areas: {
    id: string;
    name: string;
    stats: MonitoringStats;
    staffing_status: 'adequate' | 'understaffed' | 'overstaffed';
  }[];
}

export interface AreaMonitoringResponse extends MonitoringStats {
  area_id: string;
  area_name: string;
  staffing_status: 'adequate' | 'understaffed' | 'overstaffed';
  required_users: number;
  actual_users: number;
  users: LiveUser[];
}

export interface LiveUsersFilter {
  area_id?: string;
  rayon_id?: string;
  shift_definition_id?: string;
}

export interface LiveUsersResponse {
  total_online: number;
  total_offline: number;
  users: LiveUser[];
  generated_at: string;
}
