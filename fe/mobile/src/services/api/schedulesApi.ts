/**
 * Schedules API Service
 * The worker's roster assignment (which shift they're scheduled for).
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { Schedule } from '../../types/shift.types';

/**
 * Get the authenticated user's currently active schedule (or null if none).
 * Carries `shift_definition` (the assigned shift window) for the attendance UI.
 */
export async function getMySchedule(): Promise<ApiResponse<Schedule | null>> {
  return get<Schedule | null>('/schedules/my');
}

export default { getMySchedule };
