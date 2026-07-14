import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export type StaffRole = 'satgas' | 'linmas';
export type DayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

export interface StaffRequirement {
  id: string;
  location_id: string;
  shift_definition_id: string;
  role: StaffRole;
  day_type: DayType;
  required_count: number;
}

export interface StaffRequirementItem {
  shift_definition_id: string;
  role: StaffRole;
  day_type: DayType;
  required_count: number;
}

export const staffRequirementKeys = {
  all: ['staff-requirements'] as const,
  location: (id: string) => ['staff-requirements', id] as const,
};

/** WEEKEND on Sat/Sun, else WEEKDAY (holiday detection is a follow-up). */
export function dayTypeOf(isoDate: string): DayType {
  const d = new Date(`${isoDate}T00:00:00`).getDay();
  return d === 0 || d === 6 ? 'WEEKEND' : 'WEEKDAY';
}

/** All staffing requirements (bulk) — feeds the board's understaffing pills. */
export function useStaffRequirements(enabled = true) {
  return useQuery({
    queryKey: staffRequirementKeys.all,
    queryFn: async () => (await apiClient.get<StaffRequirement[]>('/staff-requirements')).data,
    enabled,
    staleTime: 60_000,
  });
}

/** Per-location requirements (for the editor). */
export function useLocationStaffRequirements(locationId: string, enabled = true) {
  return useQuery({
    queryKey: staffRequirementKeys.location(locationId),
    queryFn: async () =>
      (await apiClient.get<StaffRequirement[]>(`/areas/${locationId}/staff-requirements`)).data,
    enabled: enabled && !!locationId,
  });
}

export function useSetStaffRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      locationId,
      items,
    }: {
      locationId: string;
      items: StaffRequirementItem[];
    }) =>
      (
        await apiClient.put<StaffRequirement[]>(`/areas/${locationId}/staff-requirements`, {
          items,
        })
      ).data,
    onSuccess: (_data, { locationId }) => {
      qc.invalidateQueries({ queryKey: staffRequirementKeys.all });
      qc.invalidateQueries({ queryKey: staffRequirementKeys.location(locationId) });
    },
  });
}

/**
 * `${location_id}:${shift_definition_id}` → total required (satgas + linmas) for
 * the given day type — the board's understaffing threshold.
 */
export function requirementTotalMap(
  rows: StaffRequirement[],
  dayType: DayType
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (r.day_type !== dayType) continue;
    const key = `${r.location_id}:${r.shift_definition_id}`;
    m.set(key, (m.get(key) ?? 0) + r.required_count);
  }
  return m;
}
