/**
 * Shared readers for API payloads.
 *
 * Scenarios assert about SHAPES, not raw JSON — so a DTO rename breaks one
 * helper here rather than every scenario that touched the field.
 */

export interface PunchView {
  label: string;
  punched_at: string;
  outside_boundary?: boolean;
}

export interface SessionView {
  jam_masuk: string | null;
  jam_keluar: string | null;
  worked_minutes: number;
  is_open: boolean;
  punches?: PunchView[];
}

/** Unwrap the `{ success, data }` envelope the API wraps responses in. */
function unwrap(body: unknown): Record<string, unknown> {
  const b = body as Record<string, unknown>;
  const inner = b?.data;
  return (inner && typeof inner === 'object' ? inner : b) as Record<string, unknown>;
}

export function sessionsFor(body: unknown): SessionView[] {
  const d = unwrap(body);
  const s = d?.sessions;
  return Array.isArray(s) ? (s as SessionView[]) : [];
}

export function firstSession(body: unknown): SessionView | null {
  return sessionsFor(body)[0] ?? null;
}

export function punchCount(body: unknown): number {
  return sessionsFor(body).reduce((n, s) => n + (s.punches?.length ?? 0), 0);
}

export function hasOpenSession(body: unknown): boolean {
  const d = unwrap(body);
  return d?.open_session != null;
}

/** Workers in a `/monitoring/snapshot` payload. */
export interface SnapshotWorkerView {
  user_id: string;
  full_name: string;
  display_scope: string;
  is_scheduled: boolean;
  lifecycle_state?: string;
  lifecycle_flags?: string[];
}

export function snapshotWorkers(body: unknown): SnapshotWorkerView[] {
  const d = unwrap(body);
  const w = d?.workers;
  return Array.isArray(w) ? (w as SnapshotWorkerView[]) : [];
}

export function workerById(body: unknown, userId: string): SnapshotWorkerView | undefined {
  return snapshotWorkers(body).find((w) => w.user_id === userId);
}

/** Roster rows in a `/schedules/date/:date` payload. */
export interface RosterRowView {
  user_id: string;
  status: string;
  shift_definition_id: string | null;
  location_id: string | null;
  region_id: string | null;
  district_id: string | null;
}

export function rosterRows(body: unknown): RosterRowView[] {
  const d = unwrap(body);
  if (Array.isArray(d)) return d as RosterRowView[];
  const rows = d?.data;
  return Array.isArray(rows) ? (rows as RosterRowView[]) : [];
}

export function rosterRowsFor(body: unknown, userId: string): RosterRowView[] {
  return rosterRows(body).filter((r) => r.user_id === userId);
}
