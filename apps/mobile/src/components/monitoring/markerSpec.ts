/**
 * markerSpec — shared visual spec for monitoring map markers, so worker pins,
 * district/area nodes and the Surabaya summary read as one consistent system and
 * stay in sync with the web (`apps/web/src/lib/monitoring/markers.ts`).
 *
 * Worker pins already encode role via icon (UserMarker + getRoleIcon) and live
 * status via fill color; this module owns the node/summary staffing-health
 * colors and the attendance-ratio helpers.
 */
import { nbColors } from '../../constants/nbTokens';
import { presenceTone } from '../../utils/statusHelpers';
import type { AggregateRosterCounts, PresenceActivity } from '../../types/models.types';

/**
 * Worker fill color in the 2-activity presence model: aktif (fresh ping) is
 * green; everything else collapses to tidak-aktif amber.
 *
 * Kept for the node/summary helpers below. Worker PINS use
 * `presenceMarkerColor`, which reads the full presence model instead of this
 * single axis — see its note.
 */
export function workerActivityColor(activity: PresenceActivity): string {
  return activity === 'aktif' ? nbColors.statusActive : nbColors.statusIdle;
}

/**
 * Worker pin fill, from THE presence colour standard (`presenceTone`).
 *
 * Pins used to be coloured by the activity axis alone — green for a fresh ping,
 * amber for anything else — with ad-hoc forced grey. That contradicted every
 * other surface: the same worker could be amber on the map while their schedule
 * card and roster pill said `terlambat` (orange) or `tidak_hadir` (red), because
 * those read the lifecycle and the map did not. One worker, one colour, wherever
 * you look.
 *
 * The mobile palette has five tones to the standard's nine, so amber/orange/
 * yellow share `warn`; the label beside the pin disambiguates.
 */
export function presenceMarkerColor(user: {
  lifecycle_state?: string | null;
  leave_reason?: 'cuti' | 'sakit' | 'izin' | 'libur' | null;
  is_within_area?: boolean | null;
  is_scheduled?: boolean;
}): string {
  switch (
    presenceTone({
      lifecycleState: user.lifecycle_state,
      leaveReason: user.leave_reason,
      isWithinArea: user.is_within_area,
      isAdHoc: user.is_scheduled === false,
    })
  ) {
    case 'ok':
      return nbColors.statusActive;
    case 'warn':
      return nbColors.statusIdle;
    case 'bad':
      return nbColors.dangerDark;
    case 'info':
      return nbColors.navy;
    default:
      return nbColors.gray500;
  }
}

export type HealthLevel = 'ok' | 'short' | 'none' | 'empty';

/** Staffing-health color for a node's attendance ratio (paired with the ratio text). */
export function healthColor(level: HealthLevel): string {
  switch (level) {
    case 'ok':
      return nbColors.statusActive;
    case 'short':
      return nbColors.warning;
    case 'none':
      return nbColors.dangerDark;
    default:
      return nbColors.gray500;
  }
}

/** Pick a health level from the roster trio. */
export function rosterHealth(scheduled: number, clockedIn: number): HealthLevel {
  if (scheduled <= 0) return 'empty';
  if (clockedIn >= scheduled) return 'ok';
  if (clockedIn <= 0) return 'none';
  return 'short';
}

/** `hadir/terjadwal` ratio text. */
export function ratioText(counts: Pick<AggregateRosterCounts, 'scheduled' | 'clocked_in'>): string {
  return `${counts.clocked_in}/${counts.scheduled}`;
}
