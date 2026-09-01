/**
 * Pure reducers that apply incremental WebSocket patches to a monitoring
 * snapshot in place. Used by useMonitoringSocket to update the React Query
 * cache without refetching or remounting every marker.
 *
 * Every function is pure (no mutation of inputs) so it is trivially testable and
 * safe to call inside queryClient.setQueryData.
 */
import type { MonitoringSnapshotData, SnapshotWorker } from '../api/monitoring-v2';
import type { TrackingStatus } from '../api/monitoring-types';

/** Fields a live event may carry for a single worker. */
export interface WorkerPatch {
  user_id: string;
  full_name?: string;
  role?: string;
  status?: TrackingStatus;
  lat?: number;
  lng?: number;
  location_id?: string | null;
  location_name?: string | null;
  district_id?: string | null;
  district_name?: string | null;
  is_within_area?: boolean;
  battery_level?: number | null;
  last_update?: string;
}

const STATUS_KEYS: TrackingStatus[] = [
  'active',
  'offline',
  'absent',
];

/** Recompute the status totals from the current worker list. */
export function recomputeTotals(
  workers: SnapshotWorker[]
): Pick<
  MonitoringSnapshotData,
  | 'total_active'
  | 'total_offline'
  | 'total_absent'
  | 'total_outside_area'
> {
  const counts: Record<TrackingStatus, number> = {
    active: 0,
    offline: 0,
    absent: 0,
  };
  // `outside_area` is an AXIS, not a status, so it comes from `is_within_area`
  // rather than the status column. It OVERLAPS active/offline — a worker outside
  // their boundary is counted under their status AND here — so these four totals
  // must never be summed into a headcount.
  let outsideArea = 0;
  for (const w of workers) {
    if (STATUS_KEYS.includes(w.status)) counts[w.status] += 1;
    // Skip ABSENT: their `is_within_area` is a leftover from whenever they last
    // reported, so counting it would report people at home as outside their area.
    if (w.is_within_area === false && w.status !== 'absent') outsideArea += 1;
  }
  return {
    total_active: counts.active,
    total_offline: counts.offline,
    total_absent: counts.absent,
    total_outside_area: outsideArea,
  };
}

/** Copy only the defined fields of a patch onto a worker (never overwrite with undefined). */
function mergeDefined(worker: SnapshotWorker, patch: WorkerPatch): SnapshotWorker {
  const next: SnapshotWorker = { ...worker };
  if (patch.full_name !== undefined) next.full_name = patch.full_name;
  if (patch.role !== undefined) next.role = patch.role;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.lat !== undefined) next.lat = patch.lat;
  if (patch.lng !== undefined) next.lng = patch.lng;
  if (patch.location_id !== undefined) next.location_id = patch.location_id;
  if (patch.location_name !== undefined) next.location_name = patch.location_name;
  if (patch.district_id !== undefined) next.district_id = patch.district_id;
  if (patch.district_name !== undefined) next.district_name = patch.district_name;
  if (patch.is_within_area !== undefined) next.is_within_area = patch.is_within_area;
  if (patch.battery_level !== undefined) next.battery_level = patch.battery_level;
  if (patch.last_update !== undefined) next.last_update = patch.last_update;
  return next;
}

/**
 * Apply a per-worker patch. Updates an existing worker in place; inserts a new
 * one only when the patch carries coordinates (so the map can place it). Returns
 * the same reference when nothing could change (unknown worker, no coords).
 */
export function applyWorkerPatch(
  data: MonitoringSnapshotData,
  patch: WorkerPatch
): MonitoringSnapshotData {
  const idx = data.workers.findIndex((w) => w.user_id === patch.user_id);

  let workers: SnapshotWorker[];
  if (idx === -1) {
    if (patch.lat === undefined || patch.lng === undefined || patch.status === undefined) {
      return data; // not enough to render a new marker
    }
    const created: SnapshotWorker = {
      user_id: patch.user_id,
      full_name: patch.full_name ?? '',
      role: patch.role ?? '',
      lat: patch.lat,
      lng: patch.lng,
      status: patch.status,
      location_id: patch.location_id ?? null,
      location_name: patch.location_name ?? null,
      district_id: patch.district_id ?? null,
      district_name: patch.district_name ?? null,
      last_update: patch.last_update ?? new Date(0).toISOString(),
      is_within_area: patch.is_within_area ?? true,
      battery_level: patch.battery_level ?? null,
    };
    workers = [...data.workers, created];
  } else {
    workers = data.workers.map((w, i) => (i === idx ? mergeDefined(w, patch) : w));
  }

  return { ...data, workers, ...recomputeTotals(workers) };
}

/** Remove a worker (e.g. on clock-out) and refresh the totals. */
export function applyWorkerRemoved(
  data: MonitoringSnapshotData,
  userId: string
): MonitoringSnapshotData {
  if (!data.workers.some((w) => w.user_id === userId)) return data;
  const workers = data.workers.filter((w) => w.user_id !== userId);
  return { ...data, workers, ...recomputeTotals(workers) };
}
