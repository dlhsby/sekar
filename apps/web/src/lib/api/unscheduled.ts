import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * "Belum Dijadwalkan" (ADR-054) — the complement of the day board.
 *
 * The board shows what IS scheduled, so a worker with no row is invisible by
 * construction: an empty column and a fully-placed rayon look identical. This
 * asks the server for the other half.
 *
 * The filters describe the SLOT being filled — date + shift + rayon + kawasan +
 * lokasi — and the answer is everyone with no schedule matching it, i.e. the
 * people you could place there. An omitted criterion matches everything, so a
 * bare date answers the simple question ("who has no schedule today").
 *
 * The heavy lifting is server-side on purpose. "Scheduled" has to include
 * PROJECTED occurrences (recurring rules beyond the materialization horizon,
 * ADR-047), which only the backend can expand — deriving this list from the
 * board's already-fetched rows would report everyone on a daily rule as
 * unscheduled for every future date.
 */

export type ScheduleWorkerRole = 'satgas' | 'linmas' | 'korlap';

/** Excused-absence statuses that put a worker in `unavailable` rather than the list. */
export type UnavailableStatus = 'off' | 'leave_sick' | 'leave_annual' | 'leave_permit';

export interface UnscheduledWorker {
  id: string;
  full_name: string;
  username: string;
  role: ScheduleWorkerRole;
  district_id: string | null;
  district_name: string | null;
  /**
   * Teams this worker is on TODAY (any shift, any place). A team lives on the
   * schedule rather than on the person, so this is what makes searching
   * "Penyiraman" find that crew.
   */
  teams: string[];
}

export interface UnavailableWorker extends UnscheduledWorker {
  status: UnavailableStatus;
}

export interface UnscheduledResponse {
  date: string;
  shift_definition_id: string | null;
  /** Workers with no occurrence — the actionable list. */
  unscheduled: UnscheduledWorker[];
  /** Accounted for but NOT placeable (cuti/sakit/izin/libur). */
  unavailable: UnavailableWorker[];
  totals: {
    unscheduled: number;
    unavailable: number;
    scheduled: number;
    /** Workers the caller may see, BEFORE the search — the honest denominator. */
    workforce: number;
    /** How many the search matched; equals `workforce` when not searching. */
    matched: number;
  };
}

/** All geography here is the TARGET being filled, not a property of the worker. */
export interface UnscheduledFilters {
  date: string;
  shiftDefinitionId?: string | null;
  districtId?: string | null;
  regionId?: string | null;
  locationId?: string | null;
  role?: ScheduleWorkerRole | null;
  q?: string | null;
}

export const unscheduledKeys = {
  all: ['schedules', 'unscheduled'] as const,
  list: (f: UnscheduledFilters) => [...unscheduledKeys.all, f] as const,
};

async function fetchUnscheduled(f: UnscheduledFilters): Promise<UnscheduledResponse> {
  const params = new URLSearchParams({ date: f.date });
  if (f.shiftDefinitionId) params.set('shiftDefinitionId', f.shiftDefinitionId);
  if (f.districtId) params.set('districtId', f.districtId);
  if (f.regionId) params.set('regionId', f.regionId);
  if (f.locationId) params.set('locationId', f.locationId);
  if (f.role) params.set('role', f.role);
  if (f.q?.trim()) params.set('q', f.q.trim());
  const res = await apiClient.get<UnscheduledResponse>(`/schedules/unscheduled?${params}`);
  return res.data;
}

/**
 * `enabled` gates the fetch on the panel being open — this scans the whole
 * schedulable workforce, so it must not run on every board render.
 */
export function useUnscheduledWorkers(filters: UnscheduledFilters, enabled = true) {
  return useQuery({
    queryKey: unscheduledKeys.list(filters),
    queryFn: () => fetchUnscheduled(filters),
    enabled: enabled && !!filters.date,
  });
}
