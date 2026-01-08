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
  token: string;
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
  shift_id: number;
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
  notes?: string;
  condition?: 'Baik' | 'Cukup' | 'Buruk';
  asset_id?: number;
  gps_lat: number;
  gps_lng: number;
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
export interface LocationBatchRequest {
  pings: LocationPing[];
}

export interface LocationBatchResponse {
  inserted_count: number;
}

// Supervisor API
export interface ActiveWorkersResponse {
  workers: ActiveWorker[];
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
  records: AttendanceRecord[];
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
  message: string;
  errors?: Record<string, string[]>;
}

