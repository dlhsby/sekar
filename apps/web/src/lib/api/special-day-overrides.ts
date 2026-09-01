import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { DayType } from './location-staff-requirements';

/** Matches the backend SpecialDayType enum. */
export type SpecialDayType = 'WEEKEND' | 'HOLIDAY' | 'SPECIAL';

export interface SpecialDayOverride {
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  day_type: SpecialDayType;
  name?: string | null;
}

export interface CreateSpecialDayOverrideInput {
  date: string;
  day_type: SpecialDayType;
  name?: string;
}

export const specialDayKeys = {
  all: ['special-day-overrides'] as const,
  range: (start?: string, end?: string) => ['special-day-overrides', { start, end }] as const,
};

/** Backend returns `date` as a full ISO datetime for `date` columns — take the day. */
function normalize(o: SpecialDayOverride): SpecialDayOverride {
  return { ...o, date: String(o.date).slice(0, 10) };
}

export function useSpecialDayOverrides(startDate?: string, endDate?: string, enabled = true) {
  return useQuery({
    queryKey: specialDayKeys.range(startDate, endDate),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const qs = params.toString();
      const { data } = await apiClient.get<SpecialDayOverride[]>(
        `/special-day-overrides${qs ? `?${qs}` : ''}`
      );
      return (data ?? []).map(normalize);
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateSpecialDayOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSpecialDayOverrideInput) =>
      (await apiClient.post<SpecialDayOverride>('/special-day-overrides', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: specialDayKeys.all }),
  });
}

export function useDeleteSpecialDayOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/special-day-overrides/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: specialDayKeys.all }),
  });
}

/** SpecialDayType → staffing DayType (SPECIAL is staffed like a HOLIDAY). */
function toDayType(special: SpecialDayType): DayType {
  return special === 'WEEKEND' ? 'WEEKEND' : 'HOLIDAY';
}

/**
 * Resolve a date's staffing day type, consulting special-day overrides first
 * (matching the backend's DayTypeService), then falling back to weekday/weekend.
 * `overrides` maps ISO date → its SpecialDayType.
 */
export function resolveDayType(isoDate: string, overrides: Map<string, SpecialDayType>): DayType {
  const override = overrides.get(isoDate);
  if (override) return toDayType(override);
  const dow = new Date(`${isoDate}T00:00:00`).getDay();
  return dow === 0 || dow === 6 ? 'WEEKEND' : 'WEEKDAY';
}
