/**
 * Service Capacity API Hooks (Phase 3-R4)
 * Weekly capacity calendar for districts.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// ---------------------------------------------------------------------------
// Types — mirror the backend ServiceCapacity entity
// ---------------------------------------------------------------------------

export interface CapacityRow {
  id: string;
  districtId: string;
  year: number;
  isoWeek: number;
  serviceType: string;
  capacityUnits: number;
  bookedUnits: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const capacityKeys = {
  calendar: (districtId: string, year: number, fromWeek?: number, toWeek?: number, serviceType?: string) =>
    ['capacity', districtId, year, fromWeek, toWeek, serviceType] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch capacity calendar for a district over a date range.
 * Fills missing weeks with placeholders (0 capacity, 0 booked).
 */
export function useCapacityCalendar(
  districtId: string | null | undefined,
  options?: {
    year?: number;
    fromWeek?: number;
    toWeek?: number;
    serviceType?: string;
  },
) {
  const { year = new Date().getFullYear(), fromWeek, toWeek, serviceType } = options ?? {};

  return useQuery({
    queryKey: districtId
      ? capacityKeys.calendar(districtId, year, fromWeek, toWeek, serviceType)
      : ['capacity', 'null'],
    queryFn: async (): Promise<CapacityRow[]> => {
      const params: Record<string, string | number> = { year };
      if (fromWeek) params.fromWeek = fromWeek;
      if (toWeek) params.toWeek = toWeek;
      if (serviceType) params.serviceType = serviceType;

      const { data } = await apiClient.get(`/districts/${districtId}/capacity`, { params });
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: !!districtId,
    staleTime: 30_000,
  });
}

/**
 * Mutation to upsert a single capacity record (PUT /districts/:districtId/capacity).
 * Invalidates the calendar query after success.
 */
export function useUpsertCapacity(districtId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      year: number;
      isoWeek: number;
      serviceType: string;
      capacityUnits: number;
    }): Promise<CapacityRow> => {
      const { data } = await apiClient.put(`/districts/${districtId}/capacity`, dto);
      return data;
    },
    onSuccess: () => {
      // Invalidate all capacity queries for this district
      queryClient.invalidateQueries({
        queryKey: ['capacity', districtId],
      });
    },
  });
}
