/**
 * Schedules API Service
 *
 * The worker's daily roster — the single schedule concept (ADR-013). A standing
 * shift+district+area assignment lives on the user; the roster materializes it into
 * one editable row per WIB day. The legacy schedule-template endpoints were
 * removed; `/schedules/my` returns the day-scoped roster row.
 */

import { get } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { Schedule } from '../../types/shift.types';

/**
 * ALL of the caller's roster rows for a day.
 *
 * A worker can hold several rows in one shift (ADR-053) — lokasi A, then lokasi
 * B, then a kawasan. `getMyRoster` deliberately returns the single most relevant
 * row (the clock-in screen needs exactly one); anything that LISTS the day must
 * use this or it silently hides assignments.
 */
export async function getMyDay(date?: string): Promise<ApiResponse<Schedule[]>> {
  const params: Record<string, string> = {};
  if (date) {
    params.date = date;
  }
  return get<Schedule[]>('/schedules/my/day', params);
}

/**
 * Get the authenticated user's roster for a specific date (or today, WIB).
 * Returns a day-scoped row with status, shift, areas, and district (or null).
 */
export async function getMyRoster(date?: string): Promise<ApiResponse<Schedule | null>> {
  const params: Record<string, string> = {};
  if (date) {
    params.date = date;
  }
  return get<Schedule | null>('/schedules/my', params);
}

/**
 * The authenticated worker's own roster across a date range [from, to] (WIB
 * days). The backend self-scopes workers to their own rows, so no user id is
 * needed. Powers the week/month personal calendar. Includes virtual projected
 * rows beyond the materialization horizon. Range is capped at 62 days server-side.
 */
export async function getMyRange(
  from: string,
  to: string,
): Promise<ApiResponse<Schedule[]>> {
  return get<Schedule[]>('/schedules/range', { from, to });
}

export default { getMyRoster, getMyDay, getMyRange };
