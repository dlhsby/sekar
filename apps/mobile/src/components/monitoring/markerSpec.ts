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
import { KIND_DEFAULT_GLYPH, NODE_GLYPH_PATHS } from './nodeGlyphs';

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

/* ─── The unified node pin (ADR-051) ──────────────────────────────────────── */

/**
 * The teardrop path + ink, ported from web's `pinSvg`
 * (`apps/web/src/lib/monitoring/markers.ts`). The two builders are ONE design:
 * change the geometry here and change it there, or the platforms drift.
 *
 * Web renders this markup as inline DOM inside an AdvancedMarkerElement; mobile
 * renders the identical string through `react-native-svg`'s `SvgXml`. Sharing
 * the markup rather than the renderer is what keeps a hand-ported teardrop out
 * of this codebase.
 */
const PIN_PATH = 'M24 2C12.4 2 3 11.4 3 23c0 15 21 34 21 34s21-19 21-34C45 11.4 35.6 2 24 2z';

/** Neutral outline. The entity's own colour never rides the ring — identity is
 *  carried by the glyph and the boundary polygon, colour on a pin means STATUS. */
export const MARKER_NEUTRAL_OUTLINE = nbColors.black;

export interface NodePinOpts {
  /** Ring/outline stroke colour (neutral for node pins). */
  outline: string;
  /** Active worker count. The badge is drawn only when this is above zero. */
  count?: number;
  /** Badge colour — the staffing-health colour, so the ring stays neutral but
   *  the signal still shows. Defaults to `outline`. */
  badgeColor?: string;
  /** District and kawasan pins are drawn larger; a lokasi is a leaf. */
  big?: boolean;
}

/**
 * Resolve the glyph path for a node: its configured `marker_icon` when that
 * names a glyph we can draw, otherwise the tier's system default.
 */
export function nodeGlyphFor(
  variant: 'district' | 'region' | 'location' | 'surabaya',
  markerIcon?: string | null,
): string | null {
  if (markerIcon && NODE_GLYPH_PATHS[markerIcon]) return NODE_GLYPH_PATHS[markerIcon];
  return NODE_GLYPH_PATHS[KIND_DEFAULT_GLYPH[variant]] ?? null;
}

/**
 * Build the pin as an SVG string plus its rendered size.
 *
 * The size is returned rather than fixed because `react-native-maps` anchors a
 * custom marker by a fraction of the rendered view, so the caller needs the box
 * to place the pin's TIP on the coordinate.
 */
export function nodePinSvg(
  glyphPath: string | null,
  opts: NodePinOpts,
): { svg: string; w: number; h: number } {
  const { outline } = opts;
  const count = opts.count ?? 0;
  const w = opts.big ? 46 : 38;
  const h = Math.round(w * 1.25);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 48 60">` +
    `<path d="${PIN_PATH}" fill="${nbColors.white}" stroke="${outline}" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<circle cx="24" cy="22" r="13" fill="${nbColors.white}"/>` +
    (glyphPath
      ? `<g transform="translate(24 22) scale(0.92) translate(-12 -12)" fill="none" stroke="${nbColors.black}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyphPath}</g>`
      : '') +
    (count > 0
      ? `<circle cx="39" cy="10" r="9" fill="${opts.badgeColor ?? outline}" stroke="${nbColors.white}" stroke-width="1.5"/>` +
        `<text x="39" y="14" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="800" fill="${nbColors.white}">${count}</text>`
      : '') +
    `</svg>`;
  return { svg, w, h };
}
