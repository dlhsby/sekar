'use client';

/**
 * useGeoIndex — every rayon, kawasan and lokasi by name, independent of where
 * the map is currently drilled.
 *
 * Search used to read the map's own `boundaries` query, which is scope-bound:
 * at CITY scope the page asks for `level='district'`, so `.regions[]` and
 * `.areas[]` come back empty and **no kawasan or lokasi was findable from the
 * default view** — the one place a supervisor is most likely to search from.
 * Kawasan was worse: the search hook had no `region` result type at all, so it
 * was unfindable at every scope.
 *
 * This hook asks for the full hierarchy once and keeps only what search needs —
 * id, name, tier, centre, parent ids — so the geometry (much the larger half of
 * that payload) is dropped after indexing rather than held per result.
 *
 * The request deliberately reuses `useBoundaries(enabled, 'area')` with no
 * district id: in zoom mode the map already issues exactly that call, so the two
 * share a cache entry instead of fetching twice.
 */
import { useMemo } from 'react';
import { useBoundaries } from '@/lib/api/monitoring';

export type GeoTier = 'district' | 'region' | 'location';

export interface GeoIndexEntry {
  id: string;
  name: string;
  tier: GeoTier;
  latitude: number;
  longitude: number;
  /** Human context for the result row — the parent's name. */
  parentName?: string | null;
  /** Rayon/kawasan only: how many lokasi sit under it (shown instead of a parent). */
  childCount?: number | null;
  districtId?: string | null;
  regionId?: string | null;
}

type LocatedArea = { center_lat?: unknown; center_lng?: unknown; region_id?: string | null };

/**
 * The middle of each kawasan's own lokasi, keyed by kawasan id.
 *
 * Kawasan often have no stored centre — every one on staging (131 of 131)
 * arrives with `center_lat: null` and no polygon — so the index skipped them
 * all and search could not find a single kawasan from anywhere. Their lokasi do
 * carry centres and name their kawasan through `region_id`, which places the
 * kawasan where its sites actually are. Lokasi without a centre are ignored
 * rather than counted, so one unplaced site cannot drag the result toward 0,0.
 */
function kawasanCentroids(areas: readonly LocatedArea[]): Map<string, { lat: number; lng: number }> {
  const sums = new Map<string, { lat: number; lng: number; n: number }>();
  for (const a of areas) {
    if (!a.region_id || a.center_lat == null || a.center_lng == null) continue;
    const prev = sums.get(a.region_id) ?? { lat: 0, lng: 0, n: 0 };
    sums.set(a.region_id, {
      lat: prev.lat + Number(a.center_lat),
      lng: prev.lng + Number(a.center_lng),
      n: prev.n + 1,
    });
  }
  return new Map([...sums].map(([id, s]) => [id, { lat: s.lat / s.n, lng: s.lng / s.n }]));
}

/** Flat, searchable list of every geography the user may drill to. */
export function useGeoIndex(enabled = true): GeoIndexEntry[] {
  const { data } = useBoundaries(enabled, 'area');

  return useMemo(() => {
    const out: GeoIndexEntry[] = [];
    for (const d of data?.districts ?? []) {
      if (d.center_lat != null && d.center_lng != null) {
        out.push({
          id: d.id,
          name: d.name,
          tier: 'district',
          latitude: Number(d.center_lat),
          longitude: Number(d.center_lng),
          childCount: d.area_count,
          districtId: d.id,
        });
      }
      const derived = kawasanCentroids((d.areas ?? []) as readonly LocatedArea[]);
      for (const r of d.regions ?? []) {
        // A stored centre wins; otherwise place the kawasan among its lokasi.
        // Still skipped if neither exists — a result you cannot fly to is not a
        // result.
        const stored =
          r.center_lat != null && r.center_lng != null
            ? { lat: Number(r.center_lat), lng: Number(r.center_lng) }
            : null;
        const centre = stored ?? derived.get(r.id);
        if (!centre) continue;
        out.push({
          id: r.id,
          name: r.name,
          tier: 'region',
          latitude: centre.lat,
          longitude: centre.lng,
          parentName: d.name,
          districtId: d.id,
        });
      }
      for (const a of d.areas ?? []) {
        if (a.center_lat == null || a.center_lng == null) continue;
        out.push({
          id: a.id,
          name: a.name,
          tier: 'location',
          latitude: Number(a.center_lat),
          longitude: Number(a.center_lng),
          parentName: a.district_name ?? d.name,
          districtId: a.district_id ?? d.id,
          regionId: (a as { region_id?: string | null }).region_id ?? null,
        });
      }
    }
    return out;
  }, [data]);
}
