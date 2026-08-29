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
import type { LiveUser, UserRole } from '../types/models.types';
import type { GeoIndexEntry } from './useGeoIndex';

/**
 * `region` (kawasan) was missing entirely: the search loop read districts and
 * their areas and never touched `regions`, so a whole geographic tier was
 * unfindable in every mode.
 */
export type SearchResultType = 'petugas' | 'location' | 'district' | 'region';

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
  region: SearchResult[];
  /** Grouped by type (non-empty sections only) — for the "Semua" tab. */
  semua: SearchSection[];
  total: number;
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function useMonitoringSearch(
  liveUsers: LiveUser[],
  /**
   * The geography to search. Prefer the complete index from `useGeoIndex` —
   * searching the MAP's boundaries couples "what can I find" to "what am I
   * looking at", and in viewport mode those actively differ.
   */
  geo: GeoIndexEntry[] | undefined,
  query: string,
  labels?: { petugas: string; area: string; district: string; region: string },
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
      return { petugas: [], location: [], district: [], region: [], semua: [], total: 0 };
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
    const region: SearchResult[] = [];
    for (const e of geo ?? []) {
      if (!matches(e.name)) continue;
      const row: SearchResult = {
        id: e.id,
        type: e.type,
        name: e.name,
        // A rayon has no parent to name, so it shows its size instead — which
        // is also how you tell two similarly-named rayon apart.
        subtitle:
          e.type === 'district'
            ? `${e.areaCount ?? 0} ${labels?.area ?? 'area'}`
            : (e.parentName ?? ''),
        latitude: e.latitude,
        longitude: e.longitude,
      };
      if (e.type === 'district') district.push(row);
      else if (e.type === 'region') region.push(row);
      else location.push(row);
    }

    const semua: SearchSection[] = [
      { title: labels?.petugas ?? i18n.t('monitoring:search.personnelLabel'), type: 'petugas' as const, data: petugas },
      { title: labels?.area ?? 'Area', type: 'location' as const, data: location },
      { title: labels?.region ?? 'Kawasan', type: 'region' as const, data: region },
      { title: labels?.district ?? 'Rayon', type: 'district' as const, data: district },
    ].filter((s) => s.data.length > 0);

    return {
      petugas,
      location,
      district,
      region,
      semua,
      total: petugas.length + location.length + district.length + region.length,
    };
  }, [liveUsers, geo, query, labels]);
}
