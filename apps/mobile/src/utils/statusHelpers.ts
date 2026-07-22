/**
 * Status Helpers
 * Shared status color/label utilities for overtime, activities, and tasks
 */

import type { OvertimeStatus, ActivityStatus, TaskStatus, PruningRequestStatus, TrackingStatus, PresenceActivity, PresenceLocation } from '../types/models.types';
import type { StatusTone } from '../components/home/StatusPill';
import i18n from '../i18n/config';

/**
 * BCP-47 locale for `toLocale*String` date formatting, driven by the active UI
 * language. Timezone stays WIB (the app serves Surabaya) — only month names /
 * ordering localize.
 */
const dateLocale = (): string => (i18n.language?.startsWith('en') ? 'en-US' : 'id-ID');

// Overtime status helpers
export function getOvertimeStatusColor(status: OvertimeStatus): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'warning';
  }
}

export function getOvertimeStatusLabel(status: OvertimeStatus): string {
  switch (status) {
    case 'approved':
      return i18n.t('status:approved');
    case 'pending':
      return i18n.t('status:pending');
    case 'rejected':
      return i18n.t('status:rejected');
    default:
      return status;
  }
}

// Activity status helpers
export function getActivityStatusColor(status: ActivityStatus): 'success' | 'warning' | 'danger' | 'gray' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'gray';
  }
}

export function getActivityStatusLabel(status: ActivityStatus): string {
  switch (status) {
    case 'approved':
      return i18n.t('status:approved');
    case 'pending':
      return i18n.t('status:pending_approval');
    case 'rejected':
      return i18n.t('status:rejected');
    default:
      return status;
  }
}

// Task status helpers
export function getTaskStatusColor(
  status: TaskStatus,
): 'success' | 'warning' | 'danger' | 'primary' | 'gray' {
  switch (status) {
    case 'verified':
    case 'accepted':
      return 'success';
    case 'completed':
    case 'in_progress':
      return 'primary';
    case 'assigned':
    case 'revision_needed':
    case 'pending':
      return 'warning';
    case 'declined':
      return 'danger';
    default:
      return 'gray';
  }
}

export function getTaskStatusLabel(status: string): string {
  return i18n.exists(`status:task.${status}`) ? i18n.t(`status:task.${status}`) : status;
}

export function formatDate(isoString: string): string {
  if (!isoString) { return '-'; }
  const d = new Date(isoString);
  return d.toLocaleDateString(dateLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(isoString: string): string {
  if (!isoString) { return '-'; }
  const d = new Date(isoString);
  return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
}

// Shared date formatter
export function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return date.toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const WIB_TZ = 'Asia/Jakarta';

// Format ISO 8601 datetime to Indonesian short form: "14 Feb 2026 17:00" (WIB)
export function formatDateTimeIndonesian(isoString: string): string {
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: WIB_TZ,
  });
  const timePart = date.toLocaleTimeString(dateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: WIB_TZ,
  });
  return `${datePart} ${timePart}`;
}

// Format duration between two ISO datetimes: "3j" or "8j (lintas tengah malam)"
export function formatDurationHours(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const diffMs = endMs - startMs;
  if (diffMs <= 0) { return '-'; }
  const totalHours = diffMs / (1000 * 60 * 60);
  // Use WIB date to correctly detect midnight crossings in Indonesia
  const startDateWIB = new Date(start).toLocaleDateString(dateLocale(), { timeZone: WIB_TZ });
  const endDateWIB = new Date(end).toLocaleDateString(dateLocale(), { timeZone: WIB_TZ });
  const crossesMidnight = startDateWIB !== endDateWIB;
  const h = Number.isInteger(totalHours)
    ? totalHours.toString()
    : totalHours.toFixed(1);
  if (crossesMidnight) {
    return i18n.t('common:time.durationCrossesMidnight', { duration: h });
  }
  return i18n.language?.startsWith('en') ? `${h}h` : `${h}j`;
}

// ─── StatusPill tone mappers (shared list card) ──────────────────────────────
// Map Activity / Overtime statuses to a StatusPill tone + Indonesian label, the
// same shape as `taskPill` (utils/taskStatus.ts), so the shared ListItemCard can
// render a consistent dotted status pill across Tugas / Aktivitas / Lembur.

export function activityPill(status?: ActivityStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'approved': return { tone: 'ok', label: i18n.t('status:approved') };
    case 'pending': return { tone: 'warn', label: i18n.t('status:pending') };
    case 'rejected': return { tone: 'bad', label: i18n.t('status:rejected') };
    default: return { tone: 'neutral', label: i18n.t('status:recorded') };
  }
}

export function overtimePill(status: OvertimeStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'approved': return { tone: 'ok', label: i18n.t('status:approved') };
    case 'rejected': return { tone: 'bad', label: i18n.t('status:rejected') };
    default: return { tone: 'warn', label: i18n.t('status:pending') };
  }
}

// Maps the 3 TrackingStatus values to the StatusPill tone + shortened pill
// vocabulary used across Monitoring (MON-1/2 pill surfaces). Labels stay aligned
// with the canonical status vocab; the pill versions are trimmed to fit the chip.
export function presencePill(status: TrackingStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'active':   return { tone: 'ok', label: i18n.t('status:tracking.active') };
    case 'offline':  return { tone: 'neutral', label: i18n.t('status:tracking.offline') };
    case 'absent':   return { tone: 'bad', label: i18n.t('status:tracking.absent') };
  }
}

// ─── Two-axis presence (CP6) ────────────────────────────────────────────────

// Mapper: derive the activity + location axes from the three-state `status` +
// `is_within_area`. Fresh GPS → `aktif`; clocked in but unreachable → `offline`;
// not clocked in → `absent`.
//
// BOTH aktif and offline report inside/outside — for offline it is the LAST KNOWN
// fix, which is exactly what a supervisor needs ("unreachable, and last we saw they
// were outside their park"). Dropping it would make offline indistinguishable from
// absent on the one axis still carrying information. Must mirror the backend's
// `calculateAxes`; `unknown` is only for someone who never reported.
export function deriveAxes(
  status: TrackingStatus,
  isWithinArea: boolean,
): { activity: PresenceActivity; location: PresenceLocation } {
  switch (status) {
    // Active = clocked in + fresh GPS (≤5min).
    case 'active':
      return { activity: 'aktif', location: isWithinArea ? 'dalam_area' : 'luar_area' };
    // Offline = clocked in but no recent GPS (>5min) — last known position stands.
    case 'offline':
      return { activity: 'offline', location: isWithinArea ? 'dalam_area' : 'luar_area' };
    // Absent = not clocked in. Location unknown.
    case 'absent':
      return { activity: 'absent', location: 'unknown' };
    // Defensive: runtime data can carry an unexpected/missing status; never
    // return undefined (callers destructure the result).
    default:
      return { activity: 'absent', location: 'unknown' };
  }
}

// Read the two axes off a live user — prefer the explicit backend fields, fall
// back to `deriveAxes` while the backend rolls out. The single accessor all
// CP6 mobile surfaces should use.
export function userAxes(user: {
  status: TrackingStatus;
  activity?: PresenceActivity;
  location?: PresenceLocation;
  is_within_area: boolean;
}): { activity: PresenceActivity; location: PresenceLocation } {
  if (user.activity && user.location) {
    return { activity: user.activity, location: user.location };
  }
  return deriveAxes(user.status, user.is_within_area);
}

// Activity axis → StatusPill tone + label (maps three-state activity model).
// Named presence* to avoid the existing activityPill (activity-submission status).
export function presenceActivityPill(activity: PresenceActivity): { tone: StatusTone; label: string } {
  switch (activity) {
    case 'aktif':   return { tone: 'ok', label: i18n.t('status:tracking.active') };
    case 'offline': return { tone: 'neutral', label: i18n.t('status:tracking.offline') };
    case 'absent':  return { tone: 'bad', label: i18n.t('status:tracking.absent') };
  }
}

/**
 * The lifecycle axis (ADR-050) as StatusPill descriptors — the third axis beside
 * activity (aktif/tidak-aktif) and location (dalam/luar area) in the worker detail.
 * Reads the explicit `lifecycle_flags` set plus the `is_late`/`is_scheduled`
 * booleans (either source is honoured during rollout). Returns [] for a plain
 * on-time scheduled worker (no extra pill). Order: late → luar jadwal → lembur →
 * lupa clock-out.
 */
export function lifecycleFlagPills(user: {
  is_late?: boolean;
  is_scheduled?: boolean;
  lifecycle_flags?: string[];
}): { tone: StatusTone; label: string }[] {
  const flags = new Set(user.lifecycle_flags ?? []);
  const pills: { tone: StatusTone; label: string }[] = [];
  if (user.is_late || flags.has('is_late')) {
    pills.push({ tone: 'warn', label: i18n.t('monitoring:lifecycle.late') });
  }
  if (user.is_scheduled === false || flags.has('ad_hoc')) {
    pills.push({ tone: 'info', label: i18n.t('monitoring:lifecycle.luarJadwal') });
  }
  if (flags.has('lembur')) {
    pills.push({ tone: 'info', label: i18n.t('monitoring:lifecycle.lembur') });
  }
  if (flags.has('lupa_clock_out')) {
    pills.push({ tone: 'bad', label: i18n.t('monitoring:lifecycle.lupaClockOut') });
  }
  return pills;
}

export function locationLabel(location: PresenceLocation): string {
  switch (location) {
    case 'dalam_area': return i18n.t('status:location.dalam_area');
    case 'luar_area':  return i18n.t('status:location.luar_area');
    case 'unknown':    return i18n.t('status:location.unknown');
  }
}

// ─── Pruning Request status (Phase 3) ───────────────────────────────────────
//
// Maps the 8 pruning_request statuses onto the 6-color NBBadge palette
// so the visuals match the OvertimeBadge / TaskBadge styling.

export function getPruningRequestStatusColor(
  status: PruningRequestStatus,
): 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'navy' {
  switch (status) {
    case 'submitted':    return 'warning';
    case 'under_review': return 'navy';
    case 'approved':     return 'success';
    case 'rejected':     return 'danger';
    case 'assigned':    return 'primary';
    case 'in_progress':  return 'primary';
    case 'done':         return 'success';
    case 'cancelled':    return 'gray';
    default:             return 'gray';
  }
}

export function getPruningRequestStatusLabel(status: PruningRequestStatus): string {
  return i18n.exists(`status:pruning.${status}`) ? i18n.t(`status:pruning.${status}`) : status;
}

// StatusPill tone mapper for the shared ListItemCard — same shape as taskPill /
// activityPill / overtimePill so PerantinganRequestCard renders an identical
// dotted status pill. The 3 in-flight states (under_review / assigned /
// in_progress) map to `info` (mint) to read as "in the pipeline", distinct from
// the warn (awaiting) / ok (resolved-good) / bad (rejected) / neutral semantics.
export function pruningPill(status: PruningRequestStatus): { tone: StatusTone; label: string } {
  const label = getPruningRequestStatusLabel(status);
  switch (status) {
    case 'submitted':    return { tone: 'warn',    label };
    case 'under_review': return { tone: 'info',    label };
    case 'approved':     return { tone: 'ok',      label };
    case 'rejected':     return { tone: 'bad',     label };
    case 'assigned':     return { tone: 'info',    label };
    case 'in_progress':  return { tone: 'info',    label };
    case 'done':         return { tone: 'ok',      label };
    case 'cancelled':    return { tone: 'neutral', label };
    default:             return { tone: 'neutral', label };
  }
}

// ─── Task status helpers (adapter for screen hooks compatibility) ────────────

/**
 * Get color variant for task status (compatible with TaskHeader / field screens)
 * Fixes bug where taskHelpers.getStatusVariant missed 'pending' case
 */
export function getStatusVariant(status: TaskStatus): 'success' | 'primary' | 'warning' | 'gray' | 'danger' {
  return getTaskStatusColor(status) as 'success' | 'primary' | 'warning' | 'gray' | 'danger';
}

/**
 * Get label for task status (compatible with TaskHeader / field screens)
 */
export function getStatusLabel(status: TaskStatus): string {
  return getTaskStatusLabel(status);
}

/**
 * Get color variant for task priority (compatible with TaskHeader / field screens)
 */
export function getPriorityVariant(priority: string): 'danger' | 'warning' | 'primary' | 'gray' {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'primary';
    default: return 'gray';
  }
}

/**
 * Get label for task priority (compatible with TaskHeader / field screens)
 */
export function getPriorityLabel(priority: string): string {
  return i18n.exists(`status:priority.${priority}`) ? i18n.t(`status:priority.${priority}`) : priority;
}

// ─── Leave Reason Pill (ADR-050: on-leave workers) ──────────────────────────

/**
 * Maps leave reason to StatusPill tone + localized label.
 * Used in the "Berhalangan" (on-leave) section of the monitoring status sheet.
 */
export function leaveReasonPill(
  reason: 'cuti' | 'sakit' | 'izin' | 'libur' | null | undefined,
): { tone: StatusTone; label: string } {
  switch (reason) {
    case 'sakit':
      return { tone: 'warn', label: i18n.t('status:leave.sakit') };
    case 'cuti':
      return { tone: 'info', label: i18n.t('status:leave.cuti') };
    case 'izin':
      return { tone: 'neutral', label: i18n.t('status:leave.izin') };
    case 'libur':
      return { tone: 'neutral', label: i18n.t('status:leave.libur') };
    default:
      return { tone: 'neutral', label: i18n.t('status:leave.unknown') };
  }
}
