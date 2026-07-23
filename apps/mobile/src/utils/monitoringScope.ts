/**
 * monitoringScope — pure helpers for the unified monitoring drill-down (PR2.5).
 *
 * Two concerns, both pure (no React, no Redux) so they unit-test in isolation:
 *  1. `snapshotWorkerToLiveUser` adapts the `/monitoring/snapshot` worker shape
 *     (`user_id` / `lat` / `lng`) into the `LiveUser` shape the map markers,
 *     clustering, and detail sheets already consume (`id` / `latitude` /
 *     `longitude`). The snapshot is the only source that carries `display_scope`,
 *     so the map switches to it to render workers at their own drill tier.
 *  2. `scopeMatches` decides whether a worker renders at the current drill scope,
 *     mirroring the web canon (`monitoring/page.tsx` `scopeMatches`): a worker shows
 *     only where its `display_scope` equals the current scope AND its
 *     `display_scope_id` equals the drilled node id (city has no id). Unscheduled
 *     ad-hoc clock-ins carry `display_scope: 'city'` ("Luar Jadwal") so they surface
 *     at city scope and are never hidden above location.
 */

import type { LiveUser } from '../types/monitoring.types';

/** The subset of the snapshot worker payload we read (see MonitoringSnapshot DTO). */
export interface SnapshotWorker {
  user_id: string;
  full_name: string;
  role: string;
  status: LiveUser['status'];
  lat: number;
  lng: number;
  location_id: string | null;
  location_name?: string | null;
  district_id?: string | null;
  district_name?: string | null;
  region_id?: string | null;
  region_name?: string | null;
  display_scope?: LiveUser['display_scope'];
  display_scope_id?: string | null;
  is_within_area?: boolean;
  is_scheduled?: boolean;
  is_late?: boolean;
  lifecycle_state?: LiveUser['lifecycle_state'];
  lifecycle_flags?: string[];
  battery_level?: number | null;
  last_update?: string | null;
  shift_id?: string | null;
  shift_name?: string | null;
  shift_definition_id?: string | null;
  clock_in_time?: string | null;
  current_task_status?: string | null;
  current_task_title?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  team_color?: string | null;
  team_opacity?: number | null;
  team_icon?: string | null;
  role_marker_icon?: string | null;
  phone?: string | null;
  accuracy?: number | null;
}

/**
 * Adapt one snapshot worker into the `LiveUser` shape. Renames `user_id`→`id` and
 * `lat`/`lng`→`latitude`/`longitude`; derives `outside_boundary` from `is_within_area`;
 * fills the fields the snapshot omits with safe, non-throwing defaults so downstream
 * markers/clustering never read `undefined` coordinates.
 */
export function snapshotWorkerToLiveUser(w: SnapshotWorker): LiveUser {
  const isWithin = w.is_within_area ?? true;
  return {
    id: w.user_id,
    full_name: w.full_name,
    role: w.role,
    phone: w.phone ?? null,
    status: w.status,
    location_id: w.location_id ?? null,
    location_name: w.location_name ?? '',
    district_id: w.district_id ?? null,
    district_name: w.district_name ?? null,
    region_id: w.region_id ?? null,
    region_name: w.region_name ?? null,
    display_scope: w.display_scope,
    display_scope_id: w.display_scope_id ?? null,
    latitude: w.lat,
    longitude: w.lng,
    accuracy: w.accuracy ?? null,
    battery_level: w.battery_level ?? null,
    last_update: w.last_update ?? '',
    is_within_area: isWithin,
    lifecycle_state: w.lifecycle_state,
    is_late: w.is_late,
    lifecycle_flags: w.lifecycle_flags,
    is_scheduled: w.is_scheduled,
    outside_boundary: !isWithin,
    shift_id: w.shift_id ?? '',
    shift_name: w.shift_name ?? '',
    shift_definition_id: w.shift_definition_id ?? null,
    clock_in_time: w.clock_in_time ?? '',
    current_task_status: w.current_task_status ?? null,
    current_task_title: w.current_task_title ?? null,
    team_id: w.team_id ?? null,
    team_name: w.team_name ?? null,
    team_color: w.team_color ?? null,
    team_opacity: w.team_opacity ?? null,
    team_icon: w.team_icon ?? null,
    role_marker_icon: w.role_marker_icon ?? null,
  };
}

export type DrillScope = 'city' | 'district' | 'region' | 'location';

/** The fields `scopeMatches` reads — a structural subset of LiveUser. */
export interface ScopedWorker {
  display_scope?: LiveUser['display_scope'];
  display_scope_id?: string | null;
}

/**
 * True when `worker` should render at the current drill `scope`. Mirrors the web
 * canon: a worker's occurrence `display_scope` must equal the scope, and (below
 * city) its `display_scope_id` must equal the drilled node `viewId`. A worker with
 * no `display_scope` is treated as `location` (the pre-ADR-046 default) so partial
 * rollouts don't hide everyone. City scope ignores the id (it is always null there).
 */
export function scopeMatches(
  worker: ScopedWorker,
  scope: DrillScope,
  viewId: string | null,
): boolean {
  const s = worker.display_scope ?? 'location';
  if (scope === 'city') return s === 'city';
  if (scope === 'district') return s === 'district' && worker.display_scope_id === viewId;
  if (scope === 'region') return s === 'region' && worker.display_scope_id === viewId;
  // location
  return s === 'location' && worker.display_scope_id === viewId;
}
