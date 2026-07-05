/**
 * Monitoring v2 API Hooks (Phase 3 sub-phase 3-4)
 * Unified snapshot endpoint + incremental WebSocket patch support
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { TrackingStatus } from './monitoring-types';

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
  total_inactive: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
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
  inactive: number;
  outside_area: number;
  missing: number;
  offline: number;
}

export interface AggregateNode {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  center_lat: number | null;
  center_lng: number | null;
  counts_by_status: AggregateStatusCounts;
  counts_by_role: Record<string, number>;
  worker_count: number;
  online_count: number;
  required: number;
  is_understaffed: boolean;
  area_count?: number;
  rayon_id?: string | null;
}

export interface AggregateResponse {
  scope: 'city' | 'rayon';
  scope_id: string | null;
  nodes: AggregateNode[];
  totals: AggregateStatusCounts;
  generated_at: string;
}

export const aggregateKeys = {
  all: ['monitoring', 'aggregate'] as const,
  byScope: (scope: string, id?: string) =>
    [...aggregateKeys.all, scope, id] as const,
};

/**
 * useMonitoringAggregate — rayon rollups (city scope) or area rollups (rayon
 * scope) for the map's "Ringkasan" bubbles. No worker coordinates, so it stays
 * light even city-wide. WS staffing events invalidate it; a slow poll is the
 * safety net.
 */
export function useMonitoringAggregate(
  scope: 'city' | 'rayon',
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
