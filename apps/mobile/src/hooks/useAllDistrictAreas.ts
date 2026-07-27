/**
 * useAllDistrictAreas
 *
 * Loads every rayon (district) boundary so a CITY-scope worker can be geofenced
 * against the whole city without a dedicated Surabaya polygon: the 7 rayons tile
 * the city, so "inside the city" = "inside ANY rayon". Used by the clock-in
 * screen and the home hero for `scheduleScope.scope === 'city'`.
 *
 * `GET /districts` is open to any authenticated user (unlike `/monitoring/*`,
 * which a satgas can't call), and returns the boundary polygons + centers.
 *
 * Gated by `enabled` so the common lokasi/rayon/kawasan worker never triggers the
 * fetch. The result is cached module-wide (rayon boundaries change rarely), so
 * the two hooks share one request. Fail-open: on error the list stays empty and
 * the caller falls back to its neutral "scope" state (attendance still recorded).
 */
import { useEffect, useState } from 'react';
import { getDistricts } from '../services/api/districtsApi';
import type { District } from '../types/models.types';
import type { GeoJsonGeometry } from '../types/geo.types';

export interface GeofenceArea {
  name?: string;
  boundary_polygon?: GeoJsonGeometry | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
}

/** Pure: map districts → geofence areas, keeping only those with a polygon. */
export function districtsToAreas(districts: District[] | null | undefined): GeofenceArea[] {
  return (Array.isArray(districts) ? districts : [])
    .filter((d) => !!d?.boundary_polygon)
    .map((d) => ({
      name: d.name,
      boundary_polygon: d.boundary_polygon ?? null,
      gps_lat: d.center_lat ?? null,
      gps_lng: d.center_lng ?? null,
    }));
}

let cache: GeofenceArea[] | null = null;
// Stable reference so a disabled hook doesn't hand consumers a fresh [] every
// render (that churns downstream memos/effects into an infinite re-render loop).
const EMPTY: GeofenceArea[] = [];

/** Test-only: reset the module cache between runs. */
export function __resetDistrictAreasCache(): void {
  cache = null;
}

export function useAllDistrictAreas(enabled: boolean): GeofenceArea[] {
  const [areas, setAreas] = useState<GeofenceArea[]>(cache ?? []);

  useEffect(() => {
    if (!enabled) return;
    if (cache) {
      setAreas(cache);
      return;
    }
    let active = true;
    getDistricts()
      .then((res) => {
        const mapped = districtsToAreas(res.data ?? []);
        cache = mapped;
        if (active) setAreas(mapped);
      })
      .catch(() => {
        // Fail-open — caller keeps its neutral scope state.
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return enabled ? areas : EMPTY;
}
