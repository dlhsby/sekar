/**
 * A complete, scope-independent index of every rayon, kawasan and lokasi — for
 * search.
 *
 * Search used to read `state.boundaries`, the same geometry the MAP is drawing.
 * That couples "what can I find" to "what am I looking at", and in viewport mode
 * the two are actively different: the bbox fetch REPLACES the stored boundaries
 * with only what intersects the camera, so searching for a lokasi on the other
 * side of the city returned nothing. A search that can only find what is already
 * visible is not a search.
 *
 * So this fetches once, with no `district_id` and no `bbox`, and keeps only what
 * a result row needs. It never refetches on drill or pan: the geography does not
 * change while an operator is looking at it, and re-fetching would reintroduce
 * exactly the coupling this exists to break.
 *
 * Mirrors web's `lib/monitoring/useGeoIndex.ts`.
 */
import { useEffect, useMemo, useState } from 'react';
import { getBoundaries } from '../services/api/monitoringApi';
import type { BoundariesResponse } from '../types/monitoring.types';

export type GeoIndexType = 'district' | 'region' | 'location';

export interface GeoIndexEntry {
  id: string;
  name: string;
  type: GeoIndexType;
  latitude: number;
  longitude: number;
  /** Parent rayon name, shown as the result's subtitle so two similar names are distinguishable. */
  parentName: string | null;
  /** Lokasi count — a rayon has no parent to show, so it shows its size instead. */
  areaCount?: number;
}

/**
 * Coerce a coordinate, treating "absent" as unusable rather than as zero.
 *
 * `Number(null)` is 0, not NaN — so a node with no centre would sail through a
 * plain `Number.isFinite` guard and be indexed at (0, 0), which is in the
 * Atlantic. Tapping it would fly the map off Surabaya entirely.
 */
const num = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

/** Flatten a boundaries payload into search rows, dropping anything unplaceable. */
export function buildGeoIndex(boundaries: BoundariesResponse | null): GeoIndexEntry[] {
  const out: GeoIndexEntry[] = [];
  for (const d of boundaries?.districts ?? []) {
    out.push({
      id: d.id,
      name: d.name,
      type: 'district',
      latitude: num(d.center_lat),
      longitude: num(d.center_lng),
      parentName: null,
      areaCount: d.area_count ?? (d.areas ?? []).length,
    });
    for (const r of d.regions ?? []) {
      out.push({
        id: r.id,
        name: r.name,
        type: 'region',
        latitude: num(r.center_lat),
        longitude: num(r.center_lng),
        parentName: d.name,
      });
    }
    for (const a of d.areas ?? []) {
      out.push({
        id: a.id,
        name: a.name,
        type: 'location',
        latitude: num(a.center_lat),
        longitude: num(a.center_lng),
        parentName: a.district_name ?? d.name,
      });
    }
  }
  // A node with no centre cannot be focused on the map, so a result row for it
  // would be a dead end.
  return out.filter(e => Number.isFinite(e.latitude) && Number.isFinite(e.longitude));
}

export interface GeoIndex {
  entries: GeoIndexEntry[];
  isLoading: boolean;
}

export function useGeoIndex(enabled = true): GeoIndex {
  const [boundaries, setBoundaries] = useState<BoundariesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || boundaries) return;
    let active = true;
    setIsLoading(true);
    // No district id, no bbox: the whole geography, once.
    void getBoundaries()
      .then(res => {
        if (active) setBoundaries(res.data ?? null);
      })
      .catch(() => {
        // Search falls back to whatever the map has loaded; it degrades to the
        // old behaviour rather than breaking.
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, boundaries]);

  const entries = useMemo(() => buildGeoIndex(boundaries), [boundaries]);
  return { entries, isLoading };
}
