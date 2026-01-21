/**
 * API Types
 * TypeScript interfaces for API requests and responses
 */

import type {
  User,
  Area,
  AreaType,
  Shift,
  WorkReport,
  LocationPing,
  ActiveWorker,
  AttendanceRecord,
} from './models.types';

// Auth API
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface MeResponse extends User {
  assigned_area?: Area;
}

// Shifts API
export interface ClockInRequest {
  area_id: number;
  gps_lat: number;
  gps_lng: number;
  selfie_photo: string; // base64 encoded
}

export interface ClockInResponse {
  shift_id: number;
  clock_in_time: string;
}

export interface ClockOutRequest {
  gps_lat: number;
  gps_lng: number;
}

export interface ClockOutResponse {
  shift_id: number;
  clock_out_time: string;
  total_hours: number;
}

export interface CurrentShiftResponse extends Shift {
  area_name: string;
  area_type: string;
  hours_worked: number;
}

// Reports API
export interface CreateReportRequest {
  shift_id: number;
  description: string;
  report_type: 'cleaning' | 'planting' | 'maintenance' | 'inspection';
  gps_lat: number;
  gps_lng: number;
  photos: string[]; // base64 encoded
}

export interface CreateReportResponse {
  report_id: number;
  report_time: string;
}

export interface UploadMediaResponse {
  media_id: number;
  media_url: string;
  thumbnail_url?: string;
}

export interface MyReportsResponse extends WorkReport {
  media_urls: string[];
}

// Location API
// Single location point for batch upload (matches backend LocationPointDto)
export interface LocationPoint {
  gps_lat: number;
  gps_lng: number;
  accuracy_meters?: number;
  battery_level?: number;
  logged_at: string; // ISO 8601 timestamp
}

// Backend expects shift_id + locations array (matches CreateLocationBatchDto)
export interface LocationBatchRequest {
  shift_id: string;
  locations: LocationPoint[];
}

// Legacy format for migration - kept for offline queue compatibility
export interface LegacyLocationBatchRequest {
  pings: LocationPing[];
}

export interface LocationBatchResponse {
  inserted_count: number;
}

// Supervisor API
export interface ActiveWorkerLocation {
  gps_lat: number;
  gps_lng: number;
  logged_at: string;
}

export interface ActiveWorkerArea {
  id: number;
  name: string;
}

export interface ActiveWorkerShift {
  id: number;
  clock_in_time: string;
  area: ActiveWorkerArea;
}

export interface ActiveWorkerData {
  id: number;
  username: string;
  full_name: string;
  shift: ActiveWorkerShift;
  latest_location: ActiveWorkerLocation | null;
}

// Backend returns paginated response
export interface PaginatedActiveWorkersResponse {
  data: ActiveWorkerData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ReportsFilter {
  date?: string; // YYYY-MM-DD
  worker_id?: number;
  area_id?: number;
  area_type?: string;
}

export interface ReportsListResponse extends WorkReport {
  worker_name: string;
  area_name: string;
  area_type: string;
  media_urls: string[];
  thumbnail_url?: string;
}

export interface ReviewReportRequest {
  reviewed: boolean;
}

export interface ReviewReportResponse {
  success: boolean;
}

export interface AttendanceFilter {
  date?: string; // YYYY-MM-DD
  area_id?: number;
  area_type?: string;
}

export interface AttendanceResponse {
  date: string;
  total_workers: number;
  clocked_in_count: number;
  not_clocked_in: NotClockedInWorker[];
}

export interface NotClockedInWorker {
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
  status: number; // Maps to statusCode from backend
  code: string; // Error code enum value (e.g., 'SHIFT_ALREADY_ACTIVE')
  message: string; // Human-readable error message
  error?: string; // Error name (e.g., 'Bad Request', 'Unauthorized')
  timestamp?: string; // ISO 8601 timestamp when error occurred
  path?: string; // Request path that caused the error
  details?: any; // Additional error context (e.g., activeShiftId)
  errors?: Record<string, string[]>; // Validation errors (legacy, keep for compatibility)
}

