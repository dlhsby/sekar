/**
 * Status Helpers
 * Shared status color/label utilities for overtime, activities, and tasks
 */

import type { OvertimeStatus, ActivityStatus, TaskStatus, PruningRequestStatus, TrackingStatus, PresenceActivity, PresenceLocation } from '../types/models.types';
import type { StatusTone } from '../components/home/StatusPill';

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
      return 'Disetujui';
    case 'pending':
      return 'Menunggu';
    case 'rejected':
      return 'Ditolak';
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
      return 'Disetujui';
    case 'pending':
      return 'Menunggu Persetujuan';
    case 'rejected':
      return 'Ditolak';
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

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  low: 'Rendah', medium: 'Biasa', high: 'Tinggi', urgent: 'Mendesak',
};

export function getTaskStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Menunggu';
    case 'assigned': return 'Ditugaskan';
    case 'accepted': return 'Diterima';
    case 'declined': return 'Ditolak';
    case 'in_progress': return 'Dikerjakan';
    case 'completed': return 'Menunggu Verifikasi';
    case 'verified': return 'Terverifikasi';
    case 'revision_needed': return 'Perlu Revisi';
    default: return status;
  }
}

export function formatDate(isoString: string): string {
  if (!isoString) { return '-'; }
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(isoString: string): string {
  if (!isoString) { return '-'; }
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// Shared date formatter
export function formatDateIndonesian(dateStr: string): string {
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const WIB_TZ = 'Asia/Jakarta';

// Format ISO 8601 datetime to Indonesian short form: "14 Feb 2026 17:00" (WIB)
export function formatDateTimeIndonesian(isoString: string): string {
  const date = new Date(isoString);
  const datePart = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: WIB_TZ,
  });
  const timePart = date.toLocaleTimeString('id-ID', {
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
  const startDateWIB = new Date(start).toLocaleDateString('id-ID', { timeZone: WIB_TZ });
  const endDateWIB = new Date(end).toLocaleDateString('id-ID', { timeZone: WIB_TZ });
  const crossesMidnight = startDateWIB !== endDateWIB;
  const h = Number.isInteger(totalHours)
    ? totalHours.toString()
    : totalHours.toFixed(1);
  return crossesMidnight ? `${h}j (lintas tengah malam)` : `${h}j`;
}

// ─── StatusPill tone mappers (shared list card) ──────────────────────────────
// Map Activity / Overtime statuses to a StatusPill tone + Indonesian label, the
// same shape as `taskPill` (utils/taskStatus.ts), so the shared ListItemCard can
// render a consistent dotted status pill across Tugas / Aktivitas / Lembur.

export function activityPill(status?: ActivityStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'approved': return { tone: 'ok', label: 'Disetujui' };
    case 'pending': return { tone: 'warn', label: 'Menunggu' };
    case 'rejected': return { tone: 'bad', label: 'Ditolak' };
    default: return { tone: 'neutral', label: 'Tercatat' };
  }
}

export function overtimePill(status: OvertimeStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'approved': return { tone: 'ok', label: 'Disetujui' };
    case 'rejected': return { tone: 'bad', label: 'Ditolak' };
    default: return { tone: 'warn', label: 'Menunggu' };
  }
}

// Maps the 5 TrackingStatus values to the StatusPill tone + shortened pill
// vocabulary used across Monitoring (MON-1/2 pill surfaces). Labels stay aligned
// with the canonical `getStatusLabel` vocab in utils/mapUtils.ts (which backs
// markers + overlays); the pill versions are just trimmed to fit the chip.
export function presencePill(status: TrackingStatus): { tone: StatusTone; label: string } {
  switch (status) {
    case 'active':       return { tone: 'ok', label: 'Aktif' };
    case 'inactive':     return { tone: 'warn', label: 'Tidak aktif' };
    case 'outside_area': return { tone: 'bad', label: 'Luar area' };
    case 'missing':      return { tone: 'bad', label: 'Tidak terdeteksi' };
    case 'offline':      return { tone: 'neutral', label: 'Offline' };
  }
}

// ─── Two-axis presence (CP6) ────────────────────────────────────────────────

// Compatibility mapper: derive the activity + location axes from the legacy
// flattened `status` + `is_within_area`, for payloads that predate the backend
// two-axis change. `active`/`outside_area` are both fresh GPS → `aktif`;
// `inactive` → `idle`; `missing`/`offline` have no usable fix → `unknown` location.
export function deriveAxes(
  status: TrackingStatus,
  isWithinArea: boolean,
): { activity: PresenceActivity; location: PresenceLocation } {
  let activity: PresenceActivity;
  switch (status) {
    case 'active':
    case 'outside_area': activity = 'aktif'; break;
    case 'inactive':     activity = 'idle'; break;
    case 'missing':      activity = 'missing'; break;
    case 'offline':      activity = 'offline'; break;
  }
  const location: PresenceLocation =
    activity === 'missing' || activity === 'offline'
      ? 'unknown'
      : isWithinArea ? 'dalam_area' : 'luar_area';
  return { activity, location };
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

// Activity axis → StatusPill tone + label (mirrors presencePill for the 3 shown
// activity states + offline). Named presence* to avoid the existing activityPill
// (activity-submission status) above.
export function presenceActivityPill(activity: PresenceActivity): { tone: StatusTone; label: string } {
  switch (activity) {
    case 'aktif':   return { tone: 'ok', label: 'Aktif' };
    case 'idle':    return { tone: 'warn', label: 'Tidak aktif' };
    case 'missing': return { tone: 'bad', label: 'Tidak terdeteksi' };
    case 'offline': return { tone: 'neutral', label: 'Offline' };
  }
}

export function locationLabel(location: PresenceLocation): string {
  switch (location) {
    case 'dalam_area': return 'Dalam area';
    case 'luar_area':  return 'Luar area';
    case 'unknown':    return '—';
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
  switch (status) {
    case 'submitted':    return 'Menunggu';
    case 'under_review': return 'Direview';
    case 'approved':     return 'Disetujui';
    case 'rejected':     return 'Ditolak';
    case 'assigned':     return 'Ditugaskan';
    case 'in_progress':  return 'Diproses';
    case 'done':         return 'Selesai';
    case 'cancelled':    return 'Dibatalkan';
    default:             return status;
  }
}
