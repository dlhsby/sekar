/**
 * useMonitoringSearch — client-side search across the monitoring map's three
 * entity types (petugas / area / rayon), all already in the store.
 *
 * Returns each type's matches plus a `semua` grouping (type sections) for the
 * "Semua" tab. Case-insensitive name match (+ area/rayon name for context).
 */

import { useMemo } from 'react';
import i18n from '../i18n/config';
import { ROLE_LABELS } from '../constants/roles';
import type { LiveUser, RayonBoundary, UserRole } from '../types/models.types';

export type SearchResultType = 'petugas' | 'area' | 'rayon';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  /** Secondary line — role · area for petugas, parent rayon for area, area count for rayon. */
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
  area: SearchResult[];
  rayon: SearchResult[];
  /** Grouped by type (non-empty sections only) — for the "Semua" tab. */
  semua: SearchSection[];
  total: number;
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function useMonitoringSearch(
  liveUsers: LiveUser[],
  rayons: RayonBoundary[] | undefined,
  query: string,
  labels?: { petugas: string; area: string; rayon: string },
): MonitoringSearchResults {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (s?: string | null): boolean => !!s && s.toLowerCase().includes(q);

    if (!q) {
      return { petugas: [], area: [], rayon: [], semua: [], total: 0 };
    }

    const petugas: SearchResult[] = liveUsers
      .filter((u) => matches(u.full_name))
      .map((u) => ({
        id: u.id,
        type: 'petugas' as const,
        name: u.full_name,
        subtitle: [roleLabel(u.role), u.location_name].filter(Boolean).join(' · '),
        latitude: u.latitude,
        longitude: u.longitude,
        role: u.role,
      }));

    const area: SearchResult[] = [];
    const rayon: SearchResult[] = [];
    for (const r of rayons ?? []) {
      if (matches(r.name)) {
        rayon.push({
          id: r.id,
          type: 'rayon',
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
            subtitle: a.rayon_name,
            latitude: Number(a.center_lat),
            longitude: Number(a.center_lng),
          });
        }
      }
    }

    const semua: SearchSection[] = [
      { title: labels?.petugas ?? i18n.t('monitoring:search.personnelLabel'), type: 'petugas' as const, data: petugas },
      { title: labels?.area ?? 'Area', type: 'area' as const, data: area },
      { title: labels?.rayon ?? 'Rayon', type: 'rayon' as const, data: rayon },
    ].filter((s) => s.data.length > 0);

    return { petugas, area, rayon, semua, total: petugas.length + area.length + rayon.length };
  }, [liveUsers, rayons, query, labels]);
}
