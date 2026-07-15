/**
 * Runtime client config API.
 * Fetches the Google Maps API key served by the backend (GET /config/maps) so
 * the key is not baked into the web build. Google Maps is the sole map provider
 * — boundary/pin editors, display modal, and the live monitoring map.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

/** Build-time Map ID (inlined by Next); overridden at runtime by /config/maps. */
const BUILD_TIME_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || null;

export interface MapsConfig {
  /** Google Maps JS API key (browser/referer-restricted) — null when unset. */
  googleMapsApiKey: string | null;
  /** Vector-map Map ID (required for Advanced Markers) — null when unset. */
  googleMapsMapId: string | null;
}

async function fetchMapsConfig(): Promise<MapsConfig> {
  const response = await apiClient.get<MapsConfig>('/config/maps');
  return response.data;
}

/**
 * Hook to fetch the maps configuration once per session.
 * Keys rarely change, so cache aggressively and avoid refetch churn.
 *
 * `enabled: false` skips the request entirely — used when a build-time
 * `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is present, so we don't make an auth-gated
 * round-trip just to learn a key we already have.
 */
export function useMapsConfig(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['config', 'maps'],
    queryFn: fetchMapsConfig,
    enabled: options?.enabled ?? true,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Resolve the vector-map Map ID (required by Advanced Markers): the build-time
 * `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, else the backend-served value (settings key
 * `maps.map_id`, editable in System Settings), else null. Deduped with
 * `useMapsConfig` via the shared query key.
 */
export function useMapId(): string | null {
  const needConfig = !BUILD_TIME_MAP_ID;
  const { data } = useMapsConfig({ enabled: needConfig });
  return BUILD_TIME_MAP_ID ?? data?.googleMapsMapId ?? null;
}
