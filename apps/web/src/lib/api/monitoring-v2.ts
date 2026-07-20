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
  /** The role's configured marker icon (null → the client default glyph for the role). */
  role_marker_icon?: string | null;
  lat: number;
  lng: number;
  status: TrackingStatus;
  /** The worker's location (lokasi) id — the backend field is `location_id`. */
  location_id: string | null;
  location_name: string | null;
  district_id: string | null;
  district_name: string | null;
  /** The worker's kawasan (region) id + name, for the Kawasan filter. */
  region_id?: string | null;
  region_name?: string | null;
  /** The drill level this worker belongs to — the SCOPE of their current-shift
   *  schedule (`location`/`region`/`district`/`city`); ad-hoc falls back to live
   *  position. The worker is shown only at the matching drill level. */
  display_scope?: 'city' | 'district' | 'region' | 'location';
  /** Scope entity id (district/region/location); null at city scope. */
  display_scope_id?: string | null;
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
  /** Team membership for grouping into team bubbles (ADR-048). team_id = schedule_event_id ?? team_category_id. */
  team_id?: string | null;
  /** Team name (from team_category.name). */
  team_name?: string | null;
  /** Marker color in hex format (from team_category.marker_color). */
  team_color?: string | null;
  team_icon?: string | null;
}

export interface SnapshotAreaSummary {
  location_id: string;
  location_name: string;
  district_id: string;
  district_name: string;
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

/**
 * Roster attendance breakdown for a node (or the whole scope), for today.
 * `scheduled = clocked_in + belum_hadir + tidak_hadir`. Not-clocked-in is split
 * by the shift window: `belum_hadir` = shift not started yet (not-yet-due),
 * `tidak_hadir` = shift started, still no clock-in (no-show).
 */
export interface AggregateRosterCounts {
  scheduled: number;
  clocked_in: number;
  belum_hadir: number;
  tidak_hadir: number;
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

export interface AggregateNodeMarker {
  /** Named marker glyph configured for the area (e.g. "trees"). */
  marker_icon?: string | null;
  /** The area's fill_color — fills the marker pin. */
  fill_color?: string | null;
  /** The area's fill_opacity 0–1. */
  fill_opacity?: number | null;
}

export interface AggregateNode extends AggregateNodeMarker {
  id: string;
  name: string;
  type: 'district' | 'location' | 'region';
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
  district_id?: string | null;
  region_id?: string | null;
}

export interface AggregateResponse {
  scope: 'city' | 'district' | 'region';
  scope_id: string | null;
  nodes: AggregateNode[];
  totals: AggregateStatusCounts;
  roster_totals: AggregateRosterCounts;
  presence_totals: PresenceBreakdown;
  /** Ad-hoc workers: clocked in but off the current-shift roster (Luar jadwal). */
  off_schedule_count?: number;
  generated_at: string;
}

export const aggregateKeys = {
  all: ['monitoring', 'aggregate'] as const,
  byScope: (scope: string, id?: string) =>
    [...aggregateKeys.all, scope, id] as const,
};

/**
 * useMonitoringAggregate — district rollups (city scope), region rollups (district scope),
 * or area rollups (region scope) for the map's "Ringkasan" bubbles. No worker coordinates,
 * so it stays light even city-wide. WS staffing events invalidate it; a slow poll is the
 * safety net.
 */
export function useMonitoringAggregate(
  scope: 'city' | 'district' | 'region',
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
  scope: 'city' | 'district' | 'location' = 'city',
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
