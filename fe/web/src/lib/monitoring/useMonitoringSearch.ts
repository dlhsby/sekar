'use client';

/**
 * useMonitoringSearch — client-side search across the monitoring map's three
 * entity types (petugas / area / rayon), all already loaded on the page. Ported
 * from the mobile hook so web + mobile search behave identically: case-insensitive
 * name match, grouped result sections, and coordinates for click-to-locate.
 */
import { useMemo } from 'react';
import { ROLE_LABELS } from '@/lib/constants/roles';
import type { SnapshotWorker } from '@/lib/api/monitoring-v2';
import type { RayonBoundary } from '@/lib/api/monitoring-types';
import type { UserRole } from '@/types/models';

export type SearchResultType = 'petugas' | 'area' | 'rayon';

export interface MonitoringSearchResult {
  id: string;
  type: SearchResultType;
  name: string;
  /** role · area (petugas) · parent rayon (area) · area count (rayon). */
  subtitle?: string;
  latitude: number;
  longitude: number;
  /** Petugas only — the raw role value + parent rayon id for drill. */
  role?: string;
  rayonId?: string | null;
}

export interface SearchSection {
  title: string;
  type: SearchResultType;
  data: MonitoringSearchResult[];
}

export interface MonitoringSearchResults {
  petugas: MonitoringSearchResult[];
  area: MonitoringSearchResult[];
  rayon: MonitoringSearchResult[];
  /** Grouped by type (non-empty sections only). */
  sections: SearchSection[];
  total: number;
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role;
}

export function useMonitoringSearch(
  workers: SnapshotWorker[],
  rayons: RayonBoundary[] | undefined,
  query: string,
  labels: { petugas: string; area: string; rayon: string }
): MonitoringSearchResults {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (s?: string | null): boolean => !!s && s.toLowerCase().includes(q);
    const empty: MonitoringSearchResults = {
      petugas: [],
      area: [],
      rayon: [],
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
        subtitle: [roleLabel(w.role), w.area_name].filter(Boolean).join(' · '),
        latitude: w.lat,
        longitude: w.lng,
        role: w.role,
        rayonId: w.rayon_id,
      }));

    const area: MonitoringSearchResult[] = [];
    const rayon: MonitoringSearchResult[] = [];
    for (const r of rayons ?? []) {
      if (matches(r.name) && r.center_lat != null && r.center_lng != null) {
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
            rayonId: a.rayon_id,
          });
        }
      }
    }

    const sections: SearchSection[] = [
      { title: labels.petugas, type: 'petugas' as const, data: petugas },
      { title: labels.area, type: 'area' as const, data: area },
      { title: labels.rayon, type: 'rayon' as const, data: rayon },
    ].filter((s) => s.data.length > 0);

    return { petugas, area, rayon, sections, total: petugas.length + area.length + rayon.length };
  }, [workers, rayons, query, labels]);
}
