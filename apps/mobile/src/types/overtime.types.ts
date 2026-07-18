/**
 * Overtime (Phase 2C: flat structure, datetime-based, overnight support).
 */
import type { Area, User } from './user.types';
import type { ActivityType } from './activity.types';

// Overtime status — Phase 2E adds 'in_progress' for clock-in/out redesign
export type OvertimeStatus = 'pending' | 'approved' | 'rejected' | 'in_progress';

// Overtime (Phase 2C: flat structure, datetime-based, overnight support)
// Phase 2E: adds shift_id for clock-in/out flow redesign; end_datetime optional for in_progress
export interface Overtime {
  id: string;
  user_id: string;
  user?: User;
  location_id?: string;
  area?: Area;
  shift_id?: string | null; // Phase 2E: linked shift when using clock-in/out flow
  shift?: {
    // Phase 2E: shift relation for selfie photo URLs
    id: string;
    clock_in_photo_url?: string | null;
    clock_out_photo_url?: string | null;
  } | null;
  start_datetime: string; // ISO 8601 e.g. "2026-02-14T17:00:00+07:00"
  end_datetime?: string; // Phase 2E: optional — null while in_progress
  reason?: string; // Phase 2E: why the user is doing overtime (start form)
  status: OvertimeStatus;
  activity_type_id?: string; // Phase 2E: optional — set on end
  activityType?: ActivityType;
  description?: string; // Phase 2E: optional — set on end
  photo_urls?: string[]; // Phase 2E: optional — set on end
  gps_lat?: number;
  gps_lng?: number;
  approved_by?: string;
  approved_at?: string;
  approver?: User;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}
