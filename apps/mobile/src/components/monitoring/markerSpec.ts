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
import type { AggregateRosterCounts, PresenceActivity } from '../../types/models.types';

/**
 * Worker fill color in the 2-activity presence model: aktif (fresh ping) is
 * green; everything else (idle / missing / offline) collapses to tidak-aktif
 * amber. Ad-hoc styling (hollow/gray) is applied by the marker, not here.
 */
export function workerActivityColor(activity: PresenceActivity): string {
  return activity === 'aktif' ? nbColors.statusActive : nbColors.statusIdle;
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
