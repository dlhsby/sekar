/**
 * THE presence colour standard (ADR-050) — one mapping, used by every surface
 * that shows a worker's state: the schedule board bullets, attendance lists and
 * the monitoring map/roster.
 *
 * Before this the dots were decorative: the same worker could be green on the
 * board, grey in a list and orange on the map, and none of it meant anything.
 * The rule is the presence model itself — lifecycle first, then the
 * inside/outside axis, then the flags that override the reading.
 *
 * | State                        | Tone       |
 * |------------------------------|------------|
 * | planned / not started        | grey       |
 * | bertugas, inside area        | green      |
 * | bertugas, outside area       | amber      |
 * | terlambat                    | orange     |
 * | belum_hadir (past grace)     | yellow     |
 * | tidak_hadir                  | red        |
 * | on leave (cuti/sakit/izin)   | blue       |
 * | pulang                       | dark grey  |
 * | ad-hoc / luar jadwal         | purple     |
 */

export type PresenceTone =
  | 'grey'
  | 'green'
  | 'amber'
  | 'orange'
  | 'yellow'
  | 'red'
  | 'blue'
  | 'darkGrey'
  | 'purple';

/** Tailwind classes per tone — `bg` for the bullet, `text`/`border` for chips. */
export const PRESENCE_TONE_CLASS: Record<PresenceTone, { bg: string; text: string; border: string }> =
  {
    // Mapped onto the EXISTING token palette — no new colours are invented here
    // (tokens are generated; see specs/design-system/design-tokens.md). `amber`
    // and `yellow` share the warning family and are separated by weight, and
    // `purple` uses navy, the only remaining distinct hue.
    grey: { bg: 'bg-nb-gray-400', text: 'text-nb-gray-600', border: 'border-nb-gray-400' },
    green: { bg: 'bg-nb-success', text: 'text-nb-success', border: 'border-nb-success' },
    amber: { bg: 'bg-nb-warning', text: 'text-nb-warning', border: 'border-nb-warning' },
    orange: { bg: 'bg-nb-danger-light', text: 'text-nb-danger-dark', border: 'border-nb-danger-light' },
    yellow: { bg: 'bg-nb-warning-light', text: 'text-nb-gray-700', border: 'border-nb-warning-light' },
    red: { bg: 'bg-nb-danger', text: 'text-nb-danger', border: 'border-nb-danger' },
    blue: { bg: 'bg-nb-info', text: 'text-nb-info', border: 'border-nb-info' },
    darkGrey: { bg: 'bg-nb-gray-700', text: 'text-nb-gray-700', border: 'border-nb-gray-700' },
    purple: { bg: 'bg-nb-navy', text: 'text-nb-navy', border: 'border-nb-navy' },
  };

export interface PresenceFacts {
  /** ADR-050 lifecycle state, when known. */
  lifecycleState?: string | null;
  /** Roster status — the fallback when no lifecycle has been derived yet. */
  scheduleStatus?: string | null;
  /** Approved leave reason; wins over lifecycle for the colour. */
  leaveReason?: 'cuti' | 'sakit' | 'izin' | 'libur' | null;
  /** Live location axis — only meaningful while `bertugas`. */
  isWithinArea?: boolean | null;
  /** Clocked in with no schedule (`ad_hoc` / `is_scheduled === false`). */
  isAdHoc?: boolean;
}

/**
 * Resolve the canonical tone. Order matters: an ad-hoc worker reads as
 * "luar jadwal" whatever else is true, leave outranks the lifecycle (an excused
 * absence must never look like a no-show), and only then does the lifecycle —
 * refined by inside/outside while on duty — decide.
 */
export function presenceTone(facts: PresenceFacts): PresenceTone {
  if (facts.isAdHoc) return 'purple';
  if (facts.leaveReason && facts.leaveReason !== 'libur') return 'blue';

  switch (facts.lifecycleState ?? facts.scheduleStatus) {
    case 'bertugas':
    case 'present':
      return facts.isWithinArea === false ? 'amber' : 'green';
    case 'terlambat':
      return 'orange';
    case 'belum_hadir':
      return 'yellow';
    case 'tidak_hadir':
    case 'absent':
      return 'red';
    case 'pulang':
      return 'darkGrey';
    case 'leave_sick':
    case 'leave_annual':
    case 'leave_permit':
      return 'blue';
    // `planned`, `off`, `tidak_bertugas`, `replaced`, or nothing derived yet:
    // rostered but not started is the neutral state.
    default:
      return 'grey';
  }
}
