/**
 * useMonitoringSearch — client-side search across the monitoring map's three
 * entity types (petugas / location / district), all already in the store.
 *
 * Returns each type's matches plus a `semua` grouping (type sections) for the
 * "Semua" tab. Case-insensitive name match (+ location/district name for context).
 */

import { useMemo } from 'react';
import i18n from '../i18n/config';
import { ROLE_LABELS } from '../constants/roles';
import type { LiveUser, DistrictBoundary, UserRole } from '../types/models.types';

export type SearchResultType = 'petugas' | 'location' | 'district';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  /** Secondary line — role · location for petugas, parent district for location, location count for district. */
  subtitle?: string;
  latitude: number;
  longitude: number;
  /** Petugas only — the raw role value. */
  role?: string;
}

export interface SearchSection {
  title: string;
  type: SearchResultType;
  data: SearchResult[];
}

export interface MonitoringSearchResults {
  petugas: SearchResult[];
  location: SearchResult[];
  district: SearchResult[];
  /** Grouped by type (non-empty sections only) — for the "Semua" tab. */
  semua: SearchSection[];
  total: number;
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function useMonitoringSearch(
  liveUsers: LiveUser[],
  districts: DistrictBoundary[] | undefined,
  query: string,
  labels?: { petugas: string; area: string; district: string },
  /**
   * When true, `liveUsers` is already the server's scope-filtered search result
   * (matched on worker name OR lokasi OR team) — so DON'T re-filter petugas by name
   * client-side, which would drop workers the server matched on lokasi/team.
   */
  petugasPreMatched = false,
): MonitoringSearchResults {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (s?: string | null): boolean => !!s && s.toLowerCase().includes(q);

    if (!q) {
      return { petugas: [], location: [], district: [], semua: [], total: 0 };
    }

    const petugas: SearchResult[] = liveUsers
      .filter((u) => petugasPreMatched || matches(u.full_name))
      .map((u) => ({
        id: u.id,
        type: 'petugas' as const,
        name: u.full_name,
        subtitle: [roleLabel(u.role), u.location_name].filter(Boolean).join(' · '),
        latitude: u.latitude,
        longitude: u.longitude,
        role: u.role,
      }));

    const location: SearchResult[] = [];
    const district: SearchResult[] = [];
    for (const r of districts ?? []) {
      if (matches(r.name)) {
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
          location.push({
            id: a.id,
            type: 'location',
            name: a.name,
            subtitle: a.district_name,
            latitude: Number(a.center_lat),
            longitude: Number(a.center_lng),
          });
        }
      }
    }

    const semua: SearchSection[] = [
      { title: labels?.petugas ?? i18n.t('monitoring:search.personnelLabel'), type: 'petugas' as const, data: petugas },
      { title: labels?.area ?? 'Area', type: 'location' as const, data: location },
      { title: labels?.district ?? 'Rayon', type: 'district' as const, data: district },
    ].filter((s) => s.data.length > 0);

    return { petugas, location, district, semua, total: petugas.length + location.length + district.length };
  }, [liveUsers, districts, query, labels]);
}
