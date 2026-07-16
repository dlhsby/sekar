/**
 * Monitoring v2 API Hooks (Phase 3 sub-phase 3-4)
 * Unified snapshot endpoint + incremental WebSocket patch support
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { TrackingStatus, LiveUsersResponse } from './monitoring-types';

// ---------------------------------------------------------------------------
// Snapshot Types
// ---------------------------------------------------------------------------

export interface SnapshotWorker {
  user_id: string;
  full_name: string;
  role: string;
  lat: number;
  lng: number;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  last_update: string;
  is_within_area: boolean;
  battery_level: number | null;
  /** Attendance lifecycle (ADR-050). A live pin is always `bertugas`. */
  lifecycle_state?: 'tidak_bertugas' | 'belum_hadir' | 'terlambat' | 'bertugas' | 'pulang' | 'tidak_hadir';
  /** Clocked in after start + grace. */
  is_late?: boolean;
  /** Lifecycle flags: is_late | ad_hoc | lupa_clock_out | lembur | early | excused. */
  lifecycle_flags?: string[];
  /** True if on the current shift's roster; false = ad-hoc / off-schedule. */
  is_scheduled?: boolean;
}

export interface SnapshotAreaSummary {
  area_id: string;
  area_name: string;
  rayon_id: string;
  rayon_name: string;
  active_count: number;
  required_count: number;
  is_understaffed: boolean;
}

export interface MonitoringSnapshotData {
  workers: SnapshotWorker[];
  area_summaries: SnapshotAreaSummary[];
  total_active: number;
  total_offline: number;
  total_absent: number;
  total_outside_area: number;
  // Roster-derived "expected vs actual" for today (ADR-013) — optional; 0 until
  // the daily roster is generated.
  expected_count?: number;
  present_count?: number;
  absent_count?: number;
  on_leave_count?: number;
  off_schedule_count?: number;
  generated_at: string;
}

export interface MonitoringSnapshotResponse {
  success: boolean;
  data: MonitoringSnapshotData;
}

// ---------------------------------------------------------------------------
// Aggregate ("Ringkasan") Types — lightweight rollups for the summary bubbles
// ---------------------------------------------------------------------------

export interface AggregateStatusCounts {
  active: number;
  offline: number;
  absent: number;
  outside_area: number;
}

/** Roster attendance trio for a node (or the whole scope), for today. */
export interface AggregateRosterCounts {
  scheduled: number;
  clocked_in: number;
  not_clocked_in: number;
}

/** Dalam/luar (inside/outside area) split for one activity bucket. */
export interface PresenceLocationCounts {
  dalam: number;
  luar: number;
}

/** Activity×location breakdown of the hadir (scheduled+clocked-in) workers. */
export interface PresenceBreakdown {
  aktif: PresenceLocationCounts;
  tidak_aktif: PresenceLocationCounts;
}

export interface AggregateNode {
  id: string;
  name: string;
  type: 'rayon' | 'area' | 'region';
  center_lat: number | null;
  center_lng: number | null;
  counts_by_status: AggregateStatusCounts;
  counts_by_role: Record<string, number>;
  worker_count: number;
  online_count: number;
  required: number;
  is_understaffed: boolean;
  roster: AggregateRosterCounts;
  presence: PresenceBreakdown;
  area_count?: number;
  location_count?: number;
  rayon_id?: string | null;
  region_id?: string | null;
}

export interface AggregateResponse {
  scope: 'city' | 'rayon' | 'region';
  scope_id: string | null;
  nodes: AggregateNode[];
  totals: AggregateStatusCounts;
  roster_totals: AggregateRosterCounts;
  presence_totals: PresenceBreakdown;
  generated_at: string;
}

export const aggregateKeys = {
  all: ['monitoring', 'aggregate'] as const,
  byScope: (scope: string, id?: string) =>
    [...aggregateKeys.all, scope, id] as const,
};

/**
 * useMonitoringAggregate — rayon rollups (city scope), region rollups (rayon scope),
 * or area rollups (region scope) for the map's "Ringkasan" bubbles. No worker coordinates,
 * so it stays light even city-wide. WS staffing events invalidate it; a slow poll is the
 * safety net.
 */
export function useMonitoringAggregate(
  scope: 'city' | 'rayon' | 'region',
  id?: string,
  enabled = true
) {
  return useQuery({
    queryKey: aggregateKeys.byScope(scope, id),
    queryFn: async () => {
      const params: Record<string, string> = { scope };
      if (id) params.id = id;
      const response = await apiClient.get<AggregateResponse>('/monitoring/aggregate', {
        params,
      });
      return response.data;
    },
    refetchInterval: 60_000,
    staleTime: 15_000,
    enabled,
  });
}

// ---------------------------------------------------------------------------
// WebSocket v2 Event Types
// ---------------------------------------------------------------------------

export interface StatusV2Event {
  user_id: string;
  prev: TrackingStatus;
  next: TrackingStatus;
  lat?: number;
  lng?: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Query Key
// ---------------------------------------------------------------------------

export const snapshotKeys = {
  all: ['monitoring', 'snapshot'] as const,
  byScope: (scope: string, id?: string) =>
    [...snapshotKeys.all, scope, id] as const,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useMonitoringSnapshot — fetches the unified monitoring snapshot.
 *
 * Incremental WebSocket patches (via useMonitoringSocket) keep the worker set
 * fresh in place, so this is the initial load + a slow safety-net poll (2 min)
 * rather than the primary freshness mechanism. Previously a 30 s poll that
 * remounted every marker; the WS path removes that flash.
 */
export function useMonitoringSnapshot(
  scope: 'city' | 'rayon' | 'area' = 'city',
  id?: string,
  enabled = true
) {
  return useQuery({
    queryKey: snapshotKeys.byScope(scope, id),
    queryFn: async () => {
      const params: Record<string, string> = { scope };
      if (id) params.id = id;
      const response = await apiClient.get<MonitoringSnapshotResponse>(
        '/monitoring/snapshot',
        { params }
      );
      return response.data;
    },
    refetchInterval: 120_000,
    staleTime: 30_000,
    enabled,
  });
}

// ---------------------------------------------------------------------------
// Search Query
// ---------------------------------------------------------------------------

export const searchKeys = {
  all: ['monitoring', 'search'] as const,
  byTerm: (term: string) => [...searchKeys.all, term] as const,
};

/**
 * useMonitoringSearchQuery — server-side worker search via GET /monitoring/search?q=<term>.
 * Returns clocked-in workers who match the search term (name or area).
 * Debouncing is left to the caller; this hook enables the query only if q.trim().length >= 2.
 */
export function useMonitoringSearchQuery(q: string, enabled = true) {
  return useQuery({
    queryKey: searchKeys.byTerm(q),
    queryFn: async () => {
      const response = await apiClient.get<LiveUsersResponse>('/monitoring/search', {
        params: { q },
      });
      return response.data;
    },
    staleTime: 10_000,
    gcTime: 30_000,
    enabled: enabled && q.trim().length >= 2,
  });
}
