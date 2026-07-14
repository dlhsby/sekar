import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

export interface LocationCapacity {
  id: string;
  location_id: string;
  shift_definition_id: string;
  target_count: number;
}

export interface CapacityItem {
  shift_definition_id: string;
  target_count: number;
}

export const locationCapacityKeys = {
  all: ['location-capacity'] as const,
  location: (id: string) => ['location-capacity', id] as const,
};

/** All location capacity rows (bulk) — for the schedule board's understaffing. */
export function useLocationCapacities(enabled = true) {
  return useQuery({
    queryKey: locationCapacityKeys.all,
    queryFn: async () => (await apiClient.get<LocationCapacity[]>('/locations/capacity')).data,
    enabled,
    staleTime: 60_000,
  });
}

/** Per-shift capacity targets for one location (detail page). */
export function useLocationCapacity(locationId: string, enabled = true) {
  return useQuery({
    queryKey: locationCapacityKeys.location(locationId),
    queryFn: async () =>
      (await apiClient.get<LocationCapacity[]>(`/locations/${locationId}/capacity`)).data,
    enabled: enabled && !!locationId,
  });
}

export function useSetLocationCapacity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ locationId, items }: { locationId: string; items: CapacityItem[] }) =>
      (await apiClient.put<LocationCapacity[]>(`/locations/${locationId}/capacity`, { items }))
        .data,
    onSuccess: (_data, { locationId }) => {
      qc.invalidateQueries({ queryKey: locationCapacityKeys.all });
      qc.invalidateQueries({ queryKey: locationCapacityKeys.location(locationId) });
    },
  });
}

/** Build a `${location_id}:${shift_definition_id}` → target lookup. */
export function capacityMap(rows: LocationCapacity[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(`${r.location_id}:${r.shift_definition_id}`, r.target_count);
  return m;
}
