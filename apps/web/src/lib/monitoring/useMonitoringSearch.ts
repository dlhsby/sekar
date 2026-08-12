'use client';

/**
 * useMonitoringSearch — client-side search across the monitoring map's entity
 * types (petugas / lokasi / kawasan / rayon), grouped into sections with
 * coordinates for click-to-locate. Ported from the mobile hook so web + mobile
 * search behave identically: case-insensitive name match, grouped sections.
 *
 * Geography comes from {@link useGeoIndex}, NOT from the map's scope-bound
 * boundaries query. Reading the latter meant that at city scope — the default
 * view — `.areas[]` was empty and no lokasi could be found at all, while kawasan
 * had no result type and was unfindable everywhere.
 */
import { useMemo } from 'react';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { GeoIndexEntry } from './useGeoIndex';
import type { UserRole } from '@/types/models';

export type SearchResultType = 'petugas' | 'area' | 'region' | 'district';

export interface MonitoringSearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  /** role · lokasi (petugas) · parent name (geography). */
  subtitle?: string;
  latitude: number;
  longitude: number;
  /** Petugas only — the raw role value. */
  role?: string;
  /** Parent ids, so picking a result can drill straight to it. */
  districtId?: string | null;
  regionId?: string | null;
}

export interface SearchSection {
  title: string;
  type: SearchResultType;
  data: MonitoringSearchResult[];
}

export interface MonitoringSearchResults {
  petugas: MonitoringSearchResult[];
  area: MonitoringSearchResult[];
  region: MonitoringSearchResult[];
  district: MonitoringSearchResult[];
  /** Grouped by type (non-empty sections only). */
  sections: SearchSection[];
  total: number;
}

export interface SearchLabels {
  petugas: string;
  area: string;
  region: string;
  district: string;
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

/** Geo tier → result type. `location` is called `area` in the search UI. */
const TIER_TO_TYPE: Record<GeoIndexEntry['tier'], SearchResultType> = {
  district: 'district',
  region: 'region',
  location: 'area',
};

export function useMonitoringSearch(
  workers: SnapshotWorker[],
  geo: GeoIndexEntry[] | undefined,
  query: string,
  labels: SearchLabels
): MonitoringSearchResults {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const empty: MonitoringSearchResults = {
      petugas: [],
      area: [],
      region: [],
      district: [],
      sections: [],
      total: 0,
    };
    if (!q) return empty;

    const matches = (s?: string | null): boolean => !!s && s.toLowerCase().includes(q);

    const petugas: MonitoringSearchResult[] = workers
      .filter((w) => matches(w.full_name) && w.lat != null && w.lng != null)
      .map((w) => ({
        id: w.user_id,
        type: 'petugas' as const,
        name: w.full_name,
        subtitle: [roleLabel(w.role), w.location_name].filter(Boolean).join(' · '),
        latitude: w.lat,
        longitude: w.lng,
        role: w.role,
        districtId: w.district_id,
        regionId: w.region_id,
      }));

    const area: MonitoringSearchResult[] = [];
    const region: MonitoringSearchResult[] = [];
    const district: MonitoringSearchResult[] = [];
    const bucket = { area, region, district } as Record<string, MonitoringSearchResult[]>;

    for (const g of geo ?? []) {
      if (!matches(g.name)) continue;
      const type = TIER_TO_TYPE[g.tier];
      bucket[type].push({
        id: g.id,
        type,
        name: g.name,
        // A lokasi/kawasan reads best as "which rayon"; a rayon has no parent, so
        // it reports its size instead — the same subtitle the old search showed.
        subtitle:
          g.parentName ??
          (g.childCount != null ? `${g.childCount} ${labels.area.toLowerCase()}` : undefined),
        latitude: g.latitude,
        longitude: g.longitude,
        districtId: g.districtId,
        regionId: g.regionId,
      });
    }

    // Petugas first (the most common intent), then geography narrowest-out:
    // a lokasi name is more specific than the kawasan or rayon containing it.
    const sections: SearchSection[] = [
      { title: labels.petugas, type: 'petugas' as const, data: petugas },
      { title: labels.area, type: 'area' as const, data: area },
      { title: labels.region, type: 'region' as const, data: region },
      { title: labels.district, type: 'district' as const, data: district },
    ].filter((s) => s.data.length > 0);

    return {
      petugas,
      area,
      region,
      district,
      sections,
      total: petugas.length + area.length + region.length + district.length,
    };
  }, [workers, geo, query, labels]);
}
