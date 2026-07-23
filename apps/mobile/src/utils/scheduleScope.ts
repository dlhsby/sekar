/**
 * The scope a roster row assigns a worker to, and a human label for it.
 *
 * A schedule does not have to name a lokasi: it can be scoped to the whole city,
 * to a rayon, or to a kawasan (ADR-046). The clock-in and home screens used to
 * read "no lokasi" as "not assigned at all" and told a city-scope worker
 * "Anda belum ditugaskan ke area manapun" while they were, in fact, assigned
 * city-wide. Only a worker with NO roster row today is genuinely unassigned.
 */
import type { Schedule } from '../types/shift.types';

export type ScheduleScope = 'city' | 'district' | 'region' | 'location' | 'none';

export interface ScheduleScopeInfo {
  scope: ScheduleScope;
  /** Name of the scoped entity — null for city (the caller supplies the city label). */
  name: string | null;
}

/** Most specific wins: lokasi → kawasan → rayon → city. */
export function resolveScheduleScope(roster: Schedule | null): ScheduleScopeInfo {
  if (!roster) return { scope: 'none', name: null };

  if (roster.location_id) {
    return { scope: 'location', name: roster.location?.name ?? null };
  }
  if (roster.region_id) {
    return { scope: 'region', name: roster.region?.name ?? null };
  }
  if (roster.district_id || roster.district) {
    return { scope: 'district', name: roster.district?.name ?? null };
  }
  return { scope: 'city', name: null };
}
