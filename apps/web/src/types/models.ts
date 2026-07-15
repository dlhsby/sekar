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
  | 'admin_rayon'
  | 'kepala_rayon'
  | 'management'
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
  region_id?: string;
  location_id?: string;
  location?: Location;
  shift_definition_id?: string;
  shift_definition?: ShiftDefinition;
  user_locations?: Array<{ id: string; location_id: string; location: Location }>;
  /** Count of permanent location assignments (from the users-list query) — grid Location column. */
  assigned_location_count?: number;
  /** IDs of permanent location assignments (from the users-list query) — grid Location column filter. */
  assigned_location_ids?: string[];
  password_must_change?: boolean;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  /** Actor audit — ids of the users who created/updated/soft-deleted the row. */
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
}

/**
 * Rayon Interface
 */
/** The tier a rayon's staffing requirements attach to (region = kawasan). */
export type StaffingLevel = 'region' | 'location' | 'rayon';

export interface Rayon {
  id: string;
  name: string;
  description?: string | null;
  center_lat?: number | string | null;
  center_lng?: number | string | null;
  /** Official KMZ "Batas Wilayah Kerja Rayon" outline (Polygon or MultiPolygon). */
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  // Per-level map styling (ADR-045).
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
  marker_icon?: string | null;
  marker_image_url?: string | null;
  /** Tier its staffing requirements attach to (defaults to region = kawasan). */
  staffing_level?: StaffingLevel;
  /** Reversible soft-retire: hidden from pickers/filters, kept and reactivatable. */
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Actor audit — ids of the users who created/updated/soft-deleted the row. */
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
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
  /** Filter to any of these role codes (server-side, comma-joined). */
  roles?: string[];
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
  /** Role code — any code from the data-driven roles catalog (ADR-044). */
  role: string;
  phone_number?: string;
  /** `null` explicitly clears the field (roles without a rayon scope). */
  rayon_id?: string | null;
  /** Region (Kawasan) for region-scoped roles (korlap). `null` clears it. */
  region_id?: string | null;
  /** Permanent location assignments (multi); first becomes the primary location. */
  location_ids?: string[];
  /** `null` explicitly clears the field (roles without a shift scope). */
  shift_definition_id?: string | null;
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
  role?: string;
  phone_number?: string;
  /** `null` explicitly clears the field (roles without a rayon scope). */
  rayon_id?: string | null;
  /** Region (Kawasan) for region-scoped roles (korlap). `null` clears it. */
  region_id?: string | null;
  location_ids?: string[];
  /** `null` explicitly clears the field (roles without a shift scope). */
  shift_definition_id?: string | null;
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
 * Location Type Interface
 */
export interface LocationType {
  id: string;
  name: string;
  code: string;
  category: 'ACTIVE' | 'PASSIVE';
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Location Interface
 */
export interface Location extends Record<string, unknown> {
  id: string;
  name: string;
  rayon_id: string;
  rayon?: Rayon;
  location_type_id: string;
  locationType?: LocationType;
  gps_lat?: number | string;
  gps_lng?: number | string;
  radius_meters?: number;
  // Stored boundaries can be Polygon OR MultiPolygon (KMZ/shapefile imports).
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  coverage_area?: number;
  address?: string | null;
  is_active?: boolean;
  // Region (Kawasan) parent + per-level map styling (ADR-045).
  region_id?: string | null;
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
  marker_icon?: string | null;
  marker_image_url?: string | null;
  created_at: string;
  updated_at: string;
  /** Actor audit — ids of the users who created/updated/soft-deleted the row. */
  created_by?: string;
  updated_by?: string;
  deleted_by?: string;
}

/** Per-level map styling fields (ADR-045), shared by area/rayon DTOs. */
export interface MapStyleFieldsDto {
  border_color?: string | null;
  fill_color?: string | null;
  border_opacity?: number | null;
  fill_opacity?: number | null;
  marker_icon?: string | null;
  marker_image_url?: string | null;
}

/**
 * Location Filter Options
 */
export interface LocationFilters {
  search?: string;
  rayon_id?: string;
  location_type_id?: string;
  page?: number;
  limit?: number;
  /** Also return deactivated locations — admin grid + name-resolution maps that
   *  must still resolve a since-deactivated location's name. */
  include_inactive?: boolean;
}

/**
 * Create Location DTO
 */
export interface CreateLocationDto extends MapStyleFieldsDto {
  name: string;
  rayon_id: string;
  location_type_id: string;
  gps_lat?: number;
  gps_lng?: number;
  radius_meters?: number;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  address?: string | null;
  region_id?: string | null;
}

/**
 * Update Location DTO
 */
export interface UpdateLocationDto extends MapStyleFieldsDto {
  name?: string;
  rayon_id?: string;
  location_type_id?: string;
  gps_lat?: number;
  gps_lng?: number;
  radius_meters?: number;
  boundary_polygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  address?: string | null;
  region_id?: string | null;
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
  location_id: string;
  location?: Location;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  effective_date: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Schedule Filter Options
 */
export interface ScheduleFilters {
  search?: string;
  location_id?: string;
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
  location_id: string;
  shift_definition_id: string;
  effective_date: string;
  end_date?: string;
}

/**
 * Update Schedule DTO
 */
export interface UpdateScheduleDto {
  user_id?: string;
  location_id?: string;
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
 * Create Activity DTO
 */
export interface CreateActivityDto {
  activity_type_id: string;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
}

/**
 * Update Activity DTO
 */
export interface UpdateActivityDto {
  description?: string;
  photo_urls?: string[];
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
