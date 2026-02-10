/**
 * Domain Models for SEKAR Web Application
 * Type definitions that match backend entities
 */

/**
 * User Role Type
 * Must match backend UserRole enum
 * IMPORTANT: Always use lowercase values matching backend
 */
export type UserRole =
  | 'admin'
  | 'top_management'
  | 'kepala_rayon'
  | 'koordinator_lapangan'
  | 'worker'
  | 'linmas';

/**
 * User Interface
 * Matches backend User entity
 */
export interface User extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rayon_id?: string;
  rayon?: Rayon; // Populated relation
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Rayon Interface
 * Matches backend Rayon entity
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
 * Statistics for a specific rayon
 */
export interface RayonStats {
  rayon_id: string;
  total_areas: number;
  total_workers: number;
  active_workers: number;
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
  name: string;
  email: string;
  password?: string; // Optional to make it compatible with form data
  role: UserRole;
  rayon_id?: string;
}

/**
 * Update User DTO
 */
export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  rayon_id?: string;
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
 * Matches backend AreaType entity
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
 * Matches backend Area entity
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
 * Matches backend ShiftDefinition entity
 */
export interface ShiftDefinition {
  id: string;
  name: string;
  code: string;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  crosses_midnight: boolean;
  is_active: boolean;
  created_at: string;
}

/**
 * Worker Schedule Interface
 * Matches backend WorkerSchedule entity
 */
export interface WorkerSchedule extends Record<string, unknown> {
  id: string;
  user_id: string;
  user?: User;
  area_id: string;
  area?: Area;
  shift_definition_id: string;
  shift_definition?: ShiftDefinition;
  effective_date: string; // ISO date
  end_date?: string; // ISO date, null = ongoing
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Schedule Filter Options
 */
export interface ScheduleFilters {
  search?: string; // Worker name search
  area_id?: string;
  shift_definition_id?: string;
  date_from?: string; // ISO date
  date_to?: string; // ISO date
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
  effective_date: string; // ISO date
  end_date?: string; // ISO date, optional
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
