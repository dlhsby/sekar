/**
 * Schedules API Service
 *
 * The worker's daily roster — the single schedule concept (ADR-013). A standing
 * shift+rayon+area assignment lives on the user; the roster materializes it into
 * one editable row per WIB day. The legacy schedule-template endpoints were
 * removed; `/schedules/my` returns the day-scoped roster row.
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { Schedule } from '../../types/shift.types';

/**
 * Get the authenticated user's roster for a specific date (or today, WIB).
 * Returns a day-scoped row with status, shift, areas, and rayon (or null).
 */
export async function getMyRoster(date?: string): Promise<ApiResponse<Schedule | null>> {
  const params: Record<string, string> = {};
  if (date) {
    params.date = date;
  }
  return get<Schedule | null>('/schedules/my', params);
}

export default { getMyRoster };
