import type { CellValue, Dataset } from './dataset';
import type { KmlPlacemark } from './kmz.exporter';
import type { User } from '../../users/entities/user.entity';
import type { Area } from '../../areas/entities/area.entity';
import type { Rayon } from '../../rayons/entities/rayon.entity';
import type { Task } from '../../tasks/entities/task.entity';
import type { Activity } from '../../activities/entities/activity.entity';
import type { Overtime } from '../../overtime/entities/overtime.entity';
import type { Schedule } from '../../schedules/entities/schedule.entity';

interface Column<T> {
  header: string;
  value: (row: T) => CellValue;
}

function build<T>(rows: T[], columns: Column<T>[]): Dataset {
  return {
    headers: columns.map((c) => c.header),
    rows: rows.map((row) => columns.map((c) => c.value(row))),
  };
}

const iso = (d?: Date | null): string => (d ? new Date(d).toISOString() : '');

export function usersDataset(rows: User[]): Dataset {
  return build(rows, [
    { header: 'id', value: (u) => u.id },
    { header: 'username', value: (u) => u.username },
    { header: 'full_name', value: (u) => u.full_name },
    { header: 'phone_number', value: (u) => u.phone_number ?? '' },
    { header: 'role', value: (u) => u.role },
    { header: 'rayon_id', value: (u) => u.rayon_id ?? '' },
    { header: 'area_id', value: (u) => u.area_id ?? '' },
    { header: 'is_active', value: (u) => u.is_active },
    { header: 'created_at', value: (u) => iso(u.created_at) },
  ]);
}

export function areasDataset(rows: Area[]): Dataset {
  return build(rows, [
    { header: 'id', value: (a) => a.id },
    { header: 'name', value: (a) => a.name },
    { header: 'area_type_id', value: (a) => a.area_type_id },
    { header: 'rayon_id', value: (a) => a.rayon_id ?? '' },
    { header: 'gps_lat', value: (a) => a.gps_lat },
    { header: 'gps_lng', value: (a) => a.gps_lng },
    { header: 'radius_meters', value: (a) => a.radius_meters },
    { header: 'address', value: (a) => a.address ?? '' },
    { header: 'coverage_area', value: (a) => a.coverage_area ?? '' },
    { header: 'is_active', value: (a) => a.is_active },
  ]);
}

export function rayonsDataset(rows: Rayon[]): Dataset {
  return build(rows, [
    { header: 'id', value: (r) => r.id },
    { header: 'name', value: (r) => r.name },
    { header: 'code', value: (r) => r.code },
    { header: 'description', value: (r) => r.description ?? '' },
    { header: 'center_lat', value: (r) => r.center_lat ?? '' },
    { header: 'center_lng', value: (r) => r.center_lng ?? '' },
    { header: 'created_at', value: (r) => iso(r.created_at) },
  ]);
}

export function tasksDataset(rows: Task[]): Dataset {
  return build(rows, [
    { header: 'id', value: (t) => t.id },
    { header: 'title', value: (t) => t.title },
    { header: 'description', value: (t) => t.description ?? '' },
    { header: 'status', value: (t) => t.status },
    { header: 'priority', value: (t) => t.priority },
    { header: 'task_type', value: (t) => t.taskType },
    { header: 'area_id', value: (t) => t.area_id ?? '' },
    { header: 'rayon_id', value: (t) => t.rayon_id ?? '' },
    { header: 'assigned_to', value: (t) => t.assigned_to ?? '' },
    { header: 'created_by', value: (t) => t.created_by },
    { header: 'deadline', value: (t) => iso(t.deadline) },
    { header: 'completed_at', value: (t) => iso(t.completed_at) },
    { header: 'created_at', value: (t) => iso(t.created_at) },
  ]);
}

export function activitiesDataset(rows: Activity[]): Dataset {
  return build(rows, [
    { header: 'id', value: (a) => a.id },
    { header: 'user_id', value: (a) => a.user_id },
    { header: 'area_id', value: (a) => a.area_id ?? '' },
    { header: 'activity_type_id', value: (a) => a.activity_type_id },
    { header: 'description', value: (a) => a.description },
    { header: 'status', value: (a) => a.status },
    { header: 'gps_lat', value: (a) => a.gps_lat ?? '' },
    { header: 'gps_lng', value: (a) => a.gps_lng ?? '' },
    { header: 'photo_count', value: (a) => a.photo_urls?.length ?? 0 },
    { header: 'created_at', value: (a) => iso(a.created_at) },
  ]);
}

export function overtimeDataset(rows: Overtime[]): Dataset {
  return build(rows, [
    { header: 'id', value: (o) => o.id },
    { header: 'user_id', value: (o) => o.user_id },
    { header: 'area_id', value: (o) => o.area_id ?? '' },
    { header: 'start_datetime', value: (o) => iso(o.start_datetime) },
    { header: 'end_datetime', value: (o) => iso(o.end_datetime) },
    { header: 'status', value: (o) => o.status },
    { header: 'reason', value: (o) => o.reason ?? '' },
    { header: 'approved_by', value: (o) => o.approved_by ?? '' },
    { header: 'created_at', value: (o) => iso(o.created_at) },
  ]);
}

export function schedulesDataset(rows: Schedule[]): Dataset {
  return build(rows, [
    { header: 'id', value: (s) => s.id },
    { header: 'user_id', value: (s) => s.user_id },
    { header: 'area_id', value: (s) => s.area_id },
    { header: 'shift_definition_id', value: (s) => s.shift_definition_id },
    { header: 'effective_date', value: (s) => iso(s.effective_date) },
    { header: 'end_date', value: (s) => iso(s.end_date) },
    { header: 'created_at', value: (s) => iso(s.created_at) },
  ]);
}

/**
 * Extract a boundary ring ([lng,lat] GeoJSON Polygon) into KML placemark
 * coordinates. Defensive against missing/malformed geometry.
 */
function extractRing(boundary: unknown): Array<{ latitude: number; longitude: number }> | null {
  const geo = boundary as { coordinates?: number[][][] } | null | undefined;
  const ring = geo?.coordinates?.[0];
  if (!Array.isArray(ring)) {
    return null;
  }
  const points = ring
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map((p) => ({ longitude: Number(p[0]), latitude: Number(p[1]) }))
    .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));
  return points.length >= 3 ? points : null;
}

export function areasPlacemarks(rows: Area[]): KmlPlacemark[] {
  return rows.map((a) => ({
    name: a.name,
    description: a.address ?? null,
    latitude: Number(a.gps_lat),
    longitude: Number(a.gps_lng),
    polygon: extractRing(a.boundary_polygon),
  }));
}
