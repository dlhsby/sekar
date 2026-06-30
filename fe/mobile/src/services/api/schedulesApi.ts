/**
 * Schedules API Service
 * The worker's roster assignment (which shift they're scheduled for).
 * Phase 3: Added daily-roster endpoint for day-scoped roster rows.
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { Schedule, DailySchedule } from '../../types/shift.types';

/**
 * Get the authenticated user's currently active schedule (or null if none).
 * Carries `shift_definition` (the assigned shift window) for the attendance UI.
 */
export async function getMySchedule(): Promise<ApiResponse<Schedule | null>> {
  return get<Schedule | null>('/schedules/my');
}

/**
 * Get every schedule assigned to the given user (past, active and upcoming),
 * newest effective_date first. Used by the worker's "My Schedule" screen so
 * they can see their full roster, not just the currently-active assignment.
 */
export async function getMySchedules(userId: string): Promise<ApiResponse<Schedule[]>> {
  return get<Schedule[]>('/schedules', { userId });
}

/**
 * Get the authenticated user's daily roster for a specific date (or today, WIB).
 * Returns a day-scoped roster row with status, shift, areas, and rayon.
 * Phase 3: New endpoint for roster monitoring.
 */
export async function getMyRoster(date?: string): Promise<ApiResponse<DailySchedule | null>> {
  const params: Record<string, string> = {};
  if (date) {
    params.date = date;
  }
  return get<DailySchedule | null>('/daily-schedules/my', params);
}

export default { getMySchedule, getMySchedules, getMyRoster };
