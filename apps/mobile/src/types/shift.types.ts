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
  shift_definition_id?: string | null;
  shift_definition?: ShiftDefinition; // scheduled window; start_time drives the late check
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

// Schedule — the daily roster (the single schedule concept, ADR-013). A standing
// shift+rayon+area assignment lives on the user; the roster is one row per WIB day.
export type ScheduleStatus =
  | 'planned' // scheduled to work
  | 'present' // clocked in
  | 'absent' // scheduled but didn't show
  | 'leave_sick' // on sick leave
  | 'leave_annual' // on annual leave
  | 'replaced' // replaced by another worker
  | 'off'; // active worker but no shift today

export interface ScheduleArea {
  id: string;
  area_id: string;
  area: {
    id: string;
    name: string;
  };
}

export interface Schedule {
  id: string;
  user_id: string;
  schedule_date: string; // YYYY-MM-DD
  status: ScheduleStatus;
  // Full definition (the API returns the whole relation) so crosses_midnight is
  // available for the lateness check instead of being defaulted.
  shift_definition: ShiftDefinition | null;
  rayon: {
    id: string;
    name: string;
  } | null;
  schedule_areas: ScheduleArea[];
}
