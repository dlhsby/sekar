/**
 * Runtime client config API.
 * Fetches maps API keys served by the backend (GET /config/maps) so keys are
 * not baked into the web build. Google Maps powers the master-data coordinate
 * picker + display modal; Mapbox stays for the monitoring map.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export interface MapsConfig {
  /** Google Maps JS API key (browser/referer-restricted) — null when unset. */
  googleMapsApiKey: string | null;
  /** Mapbox token — null when unset (web normally uses its own build-time token). */
  mapboxToken: string | null;
}

async function fetchMapsConfig(): Promise<MapsConfig> {
  const response = await apiClient.get<MapsConfig>('/config/maps');
  return response.data;
}

/**
 * Hook to fetch the maps configuration once per session.
 * Keys rarely change, so cache aggressively and avoid refetch churn.
 */
export function useMapsConfig() {
  return useQuery({
    queryKey: ['config', 'maps'],
    queryFn: fetchMapsConfig,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
