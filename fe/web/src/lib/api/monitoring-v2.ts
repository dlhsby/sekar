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
  generated_at: string;
}

export interface MonitoringSnapshotResponse {
  success: boolean;
  data: MonitoringSnapshotData;
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
 * Refetches every 30 s; stale after 10 s. Incremental WS patches
 * are applied directly via queryClient.setQueryData in the page component.
 */
export function useMonitoringSnapshot(
  scope: 'city' | 'rayon' | 'area' = 'city',
  id?: string
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
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
