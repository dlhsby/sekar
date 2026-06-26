/**
 * Domain Models for SEKAR Web Application
 * Type definitions that match backend entities (Phase 2C - ADR-009, ADR-010)
 */

/**
 * User Role Type - 8 roles (Phase 2C)
 * Must match backend UserRole enum
 */
export type UserRole =
  | 'satgas'
  | 'linmas'
  | 'korlap'
  | 'admin_data'
  | 'kepala_rayon'
  | 'top_management'
  | 'admin_system'
  | 'superadmin'
  /** Phase 3 ADR-033 — external sub-district staff; no dashboard access */
  | 'staff_kecamatan';

/**
 * User Interface
 * Matches backend User entity (Phase 2C)
 */
export interface User extends Record<string, unknown> {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  profile_picture_url?: string;
  rayon_id?: string;
  rayon?: Rayon;
  area_id?: string;
  area?: Area;
  shift_definition_id?: string;
  password_must_change?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Rayon Interface
 */
export interface Rayon {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Rayon Statistics Interface
 */
export interface RayonStats {
  rayon_id: string;
  total_areas: number;
  total_users: number;
  active_users: number;
  total_coverage_area: number;
}

/**
 * User Filter Options
 */
export interface UserFilters {
  search?: string;
  role?: UserRole;
  page?: number;
  limit?: number;
}

/**
 * Create User DTO
 */
export interface CreateUserDto {
  username: string;
  full_name: string;
  /** Omit → backend auto-generates a one-time temp password (returned once). */
  password?: string;
  role: UserRole;
  phone_number?: string;
  rayon_id?: string;
  /** Permanent area assignments (multi); first becomes the primary area. */
  area_ids?: string[];
  shift_definition_id?: string;
}

/** A created user plus the one-time temp password (only present on create). */
export interface CreatedUser extends User {
  temp_password?: string;
}

/**
 * Update User DTO (no password — use reset-password)
 */
export interface UpdateUserDto {
  username?: string;
  full_name?: string;
  role?: UserRole;
  phone_number?: string;
  rayon_id?: string;
  area_ids?: string[];
  shift_definition_id?: string;
  is_active?: boolean;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Area Type Interface
 */
export interface AreaType {
  id: string;
  name: string;
  code: string;
  category: 'ACTIVE' | 'PASSIVE';
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Area Interface
 */
export interface Area extends Record<string, unknown> {
  id: string;
  name: string;
  code: string;
  rayon_id: string;
  rayon?: Rayon;
  area_type_id: string;
  area_type?: AreaType;
  center_latitude: number;
  center_longitude: number;
  radius_meters?: number;
  boundary_polygon?: GeoJSON.Polygon;
  coverage_area?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Area Filter Options
 */
export interface AreaFilters {
  search?: string;
  rayon_id?: string;
  area_type_id?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Area DTO
 */
export interface CreateAreaDto {
  name: string;
  code: string;
  rayon_id: string;
  area_type_id: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters?: number;
  boundary_polygon?: GeoJSON.Polygon;
  description?: string;
}

/**
 * Update Area DTO
 */
export interface UpdateAreaDto {
  name?: string;
  code?: string;
  rayon_id?: string;
  area_type_id?: string;
  center_latitude?: number;
  center_longitude?: number;
  radius_meters?: number;
  boundary_polygon?: GeoJSON.Polygon;
  description?: string;
}

/**
 * Shift Definition Interface
 */
export interface ShiftDefinition {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  crosses_midnight: boolean;
  is_active: boolean;
  created_at: string;
}

/**
 * Schedule Interface (renamed from WorkerSchedule per ADR-010)
 */
export interface Schedule extends Record<string, unknown> {
  id: string;
  user_id: string;
  user?: User;
  area_id: string;
  area?: Area;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  effective_date: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use Schedule instead */
export type WorkerSchedule = Schedule;

/**
 * Schedule Filter Options
 */
export interface ScheduleFilters {
  search?: string;
  area_id?: string;
  shift_definition_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

/**
 * Create Schedule DTO
 */
export interface CreateScheduleDto {
  user_id: string;
  area_id: string;
  shift_definition_id: string;
  effective_date: string;
  end_date?: string;
}

/**
 * Update Schedule DTO
 */
export interface UpdateScheduleDto {
  user_id?: string;
  area_id?: string;
  shift_definition_id?: string;
  effective_date?: string;
  end_date?: string;
}

/**
 * Activity Type Interface (Phase 2C)
 */
export interface ActivityType {
  id: string;
  code: string;
  name: string;
  description?: string;
  applicable_roles: UserRole[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Activity Status (Phase 2C - approval workflow)
 */
export type ActivityStatus = 'pending' | 'approved' | 'rejected';

/**
 * Activity Interface (Phase 2C - replaces WorkReport)
 */
export interface Activity extends Record<string, unknown> {
  id: string;
  user_id: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    role: UserRole;
  };
  shift_id: string;
  area_id: string;
  area?: {
    id: string;
    name: string;
  };
  activity_type_id: string;
  activity_type?: {
    id: string;
    code: string;
    name: string;
  };
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  status: ActivityStatus;
  reviewed_by?: string;
  reviewer?: { id: string; full_name: string };
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

/**
 * Activity Filter Options
 */
export interface ActivityFilters {
  activity_type_id?: string;
  area_id?: string;
  user_id?: string;
  status?: ActivityStatus;
  rayon_id?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Overtime Status
 */
export type OvertimeStatus = 'pending' | 'approved' | 'rejected';

/**
 * Overtime Interface (Phase 2C - flat schema)
 */
export interface Overtime extends Record<string, unknown> {
  id: string;
  user_id: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    role: UserRole;
  };
  area_id: string;
  area?: {
    id: string;
    name: string;
  };
  start_datetime: string;
  end_datetime: string;
  status: OvertimeStatus;
  activity_type_id?: string;
  activity_type?: {
    id: string;
    code: string;
    name: string;
  };
  description?: string;
  photo_urls?: string[];
  gps_lat?: number;
  gps_lng?: number;
  approved_by?: string;
  approver?: {
    id: string;
    full_name: string;
  };
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
}

/**
 * Overtime Filter Options
 */
export interface OvertimeFilters {
  status?: OvertimeStatus;
  area_id?: string;
  rayon_id?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: 'created_at' | 'start_datetime';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Task Tag Interface (Phase 2C)
 */
export interface TaskTag {
  id: string;
  task_id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
  };
  created_at: string;
}
