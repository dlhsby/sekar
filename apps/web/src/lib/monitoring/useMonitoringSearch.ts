'use client';

/**
 * useMonitoringSearch — client-side search across the monitoring map's three
 * entity types (petugas / area / district), all already loaded on the page. Ported
 * from the mobile hook so web + mobile search behave identically: case-insensitive
 * name match, grouped result sections, and coordinates for click-to-locate.
 */
import { useMemo } from 'react';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { DistrictBoundary } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

export type SearchResultType = 'petugas' | 'area' | 'district';

export interface MonitoringSearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  /** role · area (petugas) · parent district (area) · area count (district). */
  subtitle?: string;
  latitude: number;
  longitude: number;
  /** Petugas only — the raw role value + parent district id for drill. */
  role?: string;
  districtId?: string | null;
}

export interface SearchSection {
  title: string;
  type: SearchResultType;
  data: MonitoringSearchResult[];
}

export interface MonitoringSearchResults {
  petugas: MonitoringSearchResult[];
  area: MonitoringSearchResult[];
  district: MonitoringSearchResult[];
  /** Grouped by type (non-empty sections only). */
  sections: SearchSection[];
  total: number;
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function useMonitoringSearch(
  workers: SnapshotWorker[],
  districts: DistrictBoundary[] | undefined,
  query: string,
  labels: { petugas: string; area: string; district: string }
): MonitoringSearchResults {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (s?: string | null): boolean => !!s && s.toLowerCase().includes(q);
    const empty: MonitoringSearchResults = {
      petugas: [],
      area: [],
      district: [],
      sections: [],
      total: 0,
    };
    if (!q) return empty;

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
      }));

    const area: MonitoringSearchResult[] = [];
    const district: MonitoringSearchResult[] = [];
    for (const r of districts ?? []) {
      if (matches(r.name) && r.center_lat != null && r.center_lng != null) {
        district.push({
          id: r.id,
          type: 'district',
          name: r.name,
          subtitle: `${r.area_count} area`,
          latitude: Number(r.center_lat),
          longitude: Number(r.center_lng),
        });
      }
      for (const a of r.areas) {
        if (matches(a.name)) {
          area.push({
            id: a.id,
            type: 'area',
            name: a.name,
            subtitle: a.district_name,
            latitude: Number(a.center_lat),
            longitude: Number(a.center_lng),
            districtId: a.district_id,
          });
        }
      }
    }

    const sections: SearchSection[] = [
      { title: labels.petugas, type: 'petugas' as const, data: petugas },
      { title: labels.area, type: 'area' as const, data: area },
      { title: labels.district, type: 'district' as const, data: district },
    ].filter((s) => s.data.length > 0);

    return { petugas, area, district, sections, total: petugas.length + area.length + district.length };
  }, [workers, districts, query, labels]);
}
