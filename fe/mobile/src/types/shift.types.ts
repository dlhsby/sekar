/**
 * Shifts, shift definitions, schedules and staffing requirements.
 */
import type { Area, User, UserRole } from './user.types';

// Day type for scheduling
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

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
  is_overtime?: boolean; // Phase 2E: true when shift is an overtime shift
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
