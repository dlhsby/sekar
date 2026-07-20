/**
 * useMapAutoFocus Hook
 * Phase 2D Gap #3: Auto-focus map when filters change.
 * Area selected -> zoom to area center
 * Rayon selected -> fit to district bbox
 * Search match -> zoom to user
 * Reset -> city view
 */

import { useEffect, useRef } from 'react';
import type MapView from 'react-native-maps';
import { SURABAYA_CITY_REGION } from '../utils/mapUtils';
import type { MonitoringFilters } from '../types/api.types';
import type { BoundariesResponse, LiveUser } from '../types/models.types';

export function useMapAutoFocus(
  mapRef: React.RefObject<MapView | null>,
  filters: MonitoringFilters,
  boundaries: BoundariesResponse | null,
  liveUsers: LiveUser[],
): void {
  const prevFiltersRef = useRef<MonitoringFilters>({});

  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = filters;

    if (!mapRef.current) return;

    // Area selected -> animate to area center, zoom 15-16
    if (filters.location_id && filters.location_id !== prev.location_id && boundaries) {
      for (const district of boundaries.districts) {
        const area = district.areas.find(a => a.id === filters.location_id);
        if (area) {
          mapRef.current.animateToRegion(
            {
              latitude: area.center_lat,
              longitude: area.center_lng,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            },
            1000,
          );
          return;
        }
      }
    }

    // Rayon selected (no area) -> fit to district bbox
    if (
      filters.district_id &&
      !filters.location_id &&
      filters.district_id !== prev.district_id &&
      boundaries
    ) {
      const district = boundaries.districts.find(r => r.id === filters.district_id);
      if (district && district.areas.length > 0) {
        const coords = district.areas.map(a => ({
          latitude: a.center_lat,
          longitude: a.center_lng,
        }));
        if (coords.length === 0) return;
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
        return;
      }
    }

    // Search match -> zoom to user
    if (filters.search && filters.search !== prev.search) {
      const searchLower = filters.search.toLowerCase();
      const match = liveUsers.find(u =>
        u.full_name.toLowerCase().includes(searchLower),
      );
      if (match) {
        mapRef.current.animateToRegion(
          {
            latitude: match.latitude,
            longitude: match.longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          },
          1000,
        );
        return;
      }
    }

    // All filters cleared -> reset to city view
    const hasFilters =
      filters.location_id || filters.district_id || filters.search || filters.role;
    const hadFilters =
      prev.location_id || prev.district_id || prev.search || prev.role;
    if (!hasFilters && hadFilters) {
      mapRef.current.animateToRegion(SURABAYA_CITY_REGION, 1000);
    }
  }, [filters, boundaries, liveUsers, mapRef]);
}
