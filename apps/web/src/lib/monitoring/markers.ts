/**
 * Monitoring map marker builders — the single source of truth for how every
 * marker on the web monitoring map looks, so workers, rayon/area nodes and the
 * Surabaya summary read as one consistent, distinguishable system (mirrors the
 * mobile `markerSpec`).
 *
 * Markers are drawn as inline SVG data-URI icons on plain Google `Marker`s: this
 * keeps the existing `@react-google-maps/api` + supercluster setup (no `mapId` /
 * AdvancedMarker requirement) and renders identically across browsers.
 *
 * Worker pins: teardrop shape, fill = live status color, a white role glyph
 * inside (satgas=hard-hat, linmas=shield, korlap=clipboard). Node markers show
 * the attendance ratio `hadir/terjadwal` colored by staffing health.
 */
import { ROLE_MARKER_ICONS } from '@/lib/constants/monitoring';

/* eslint-disable sekar-design/no-inline-hex-colors -- SVG icon fills for Google overlays, not rendered style tokens */
const BLACK = '#1C1917';
const WHITE = '#FFFFFF';

// Two-activity model colors (kept in sync with mobile markerSpec / tokens).
const ACTIVITY_COLORS = {
  aktif: '#15803D', // fresh ping (status.active)
  tidak_aktif: '#92400E', // offline or stale ping (status.idle)
} as const;
const OUTSIDE_RING = '#9333EA'; // luar area (status.outside)
const ADHOC = '#57534E'; // ad-hoc / off-schedule (gray-600)

/** Map the 5-status tracking model onto the 2-activity presence model. */
export function statusToActivity(status: string): 'aktif' | 'tidak_aktif' {
  return status === 'active' || status === 'outside_area' ? 'aktif' : 'tidak_aktif';
}

/** Staffing-health colors (kept in sync with mobile markerSpec.healthColor). */
export const HEALTH_COLORS = {
  ok: '#15803D', // hadir >= terjadwal   (nbColors.statusActive)
  short: '#E3A018', // some absent         (nbColors.warning)
  none: '#991B1B', // nobody clocked in    (nbColors.dangerDark)
  empty: '#78716C', // nothing scheduled   (nbColors.gray500)
} as const;
/* eslint-enable sekar-design/no-inline-hex-colors */

/* eslint-disable sekar-design/no-inline-hex-colors -- SVG icon fills for Google overlays */
// Team bubble default border when a team has no color (gray-500).
const TEAM_DEFAULT = '#78716C';

export type HealthLevel = keyof typeof HEALTH_COLORS;

/** Pick a health level from the roster trio. */
export function rosterHealth(scheduled: number, clockedIn: number): HealthLevel {
  if (scheduled <= 0) return 'empty';
  if (clockedIn >= scheduled) return 'ok';
  if (clockedIn <= 0) return 'none';
  return 'short';
}

// White role glyphs, drawn as stroked paths inside a 24×24 box centered at (12,12).
// Keyed by role CODE — the built-in look for the three field roles that keep a
// bespoke glyph (hard-hat / shield / clipboard) unless a role overrides its icon.
const ROLE_GLYPHS: Record<string, string> = {
  satgas:
    '<path d="M4 17h16"/><path d="M6 17v-2a6 6 0 0 1 12 0v2"/><path d="M10 6.5V4h4v2.5"/>',
  linmas: '<path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z"/>',
  korlap:
    '<rect x="6" y="5" width="12" height="15" rx="1.5"/><path d="M9 5V4a3 3 0 0 1 6 0v1"/><path d="M9 11h6"/><path d="M9 14h6"/>',
};

// Named marker glyphs (a role's configured `marker_icon`, e.g. "shield"/"crown"),
// so a custom role or an overridden icon renders its own glyph on the worker pin.
// Covers the seeded role marker names (ROLE_MARKER_ICONS); unknown names fall back.
const ICON_GLYPHS: Record<string, string> = {
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  shield: '<path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.6-5 4.3 1.5 6.4L12 16.9 6 19.8l1.5-6.4-5-4.3 6.6-.6z"/>',
  database:
    '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  crown: '<path d="M2 18h20l-2-9-5 4-3-7-3 7-5-4z"/>',
  building:
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l7-7 2 2-2 2 2 2-2 2-2-2-2 2"/>',
  droplets: '<path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z"/>',
};
const FALLBACK_GLYPH = '<circle cx="12" cy="9" r="3.2"/><path d="M6 19a6 6 0 0 1 12 0"/>';

/**
 * The glyph a worker pin draws, in priority order:
 *  1. the role's explicitly-configured `marker_icon` (custom role / override),
 *  2. the built-in bespoke glyph for satgas/linmas/korlap,
 *  3. the seeded default icon for the role code (crown, building, …),
 *  4. a generic person.
 */
function resolveWorkerGlyph(role: string, markerIcon?: string | null): string {
  if (markerIcon && ICON_GLYPHS[markerIcon]) return ICON_GLYPHS[markerIcon];
  if (ROLE_GLYPHS[role]) return ROLE_GLYPHS[role];
  const named = ROLE_MARKER_ICONS[role];
  if (named && ICON_GLYPHS[named]) return ICON_GLYPHS[named];
  return FALLBACK_GLYPH;
}

function svgUrl(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * A worker pin: a circle with a white role glyph + arrow tail (mirrors mobile
 * UserMarker). Fill = activity (aktif green / tidak-aktif amber); a purple ring
 * marks luar area. Ad-hoc (off-schedule) workers render hollow/gray so they're
 * visibly distinct from the scheduled roster and read as "uncounted".
 */
export function workerPinIcon(
  role: string,
  opts: {
    activity: 'aktif' | 'tidak_aktif';
    outside?: boolean;
    adHoc?: boolean;
    selected?: boolean;
    /** The role's configured marker icon; overrides the built-in role glyph. */
    markerIcon?: string | null;
  }
): google.maps.Icon {
  const glyph = resolveWorkerGlyph(role, opts.markerIcon);
  const solid = ACTIVITY_COLORS[opts.activity];
  // Ad-hoc: white fill + gray outline + gray glyph (hollow). Scheduled: colored
  // fill + white glyph (solid).
  const fill = opts.adHoc ? WHITE : solid;
  const glyphColor = opts.adHoc ? ADHOC : WHITE;
  const border = opts.adHoc ? ADHOC : WHITE;
  const ring = opts.outside
    ? `<circle cx="20" cy="20" r="18" fill="${WHITE}" stroke="${OUTSIDE_RING}" stroke-width="2"/>`
    : '';
  const dash = opts.adHoc ? ' stroke-dasharray="3 2"' : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">` +
    ring +
    `<path d="M14 33 L20 41 L26 33 Z" fill="${opts.adHoc ? ADHOC : solid}"/>` +
    `<circle cx="20" cy="20" r="14" fill="${fill}" stroke="${border}" stroke-width="${opts.selected ? 3 : 2}"${dash}/>` +
    `<g transform="translate(20 20) scale(0.8) translate(-12 -12)" fill="none" stroke="${glyphColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`;
  const size = opts.selected ? 62 : 48;
  const h = Math.round(size * 1.2);
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(size, h),
    anchor: new google.maps.Point(size / 2, size * 0.5),
  };
}

/**
 * A compact node marker (rayon / region / lokasi): a white dot with a
 * status-tinted ring and the **active worker count** — ADR-046's replacement for
 * the disliked attendance-ratio bubble. Empty nodes (nothing scheduled, nobody
 * active) render as a small muted dot so a rayon's many idle lokasi don't clutter
 * the map. The ring color comes from the roster (clocked_in vs scheduled), so a
 * fully-attended node reads green even when a worker's signal has gone stale.
 */
// Named marker glyphs (an area's configured `marker_icon`), drawn as stroked
// white-on-color paths in a 24×24 box. Extend as settings expose more icons.
const NODE_GLYPHS: Record<string, string> = {
  trees:
    '<path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"/><path d="M12 19v3"/>',
  tree: '<path d="M12 3l5 7h-3v5h-4v-5H7z"/><path d="M12 15v6"/>',
  building:
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
};

/**
 * System-default glyph per node kind (ADR-046 "bawaan sistem" marker), mirroring
 * the default pin images (rayon → orange building, kawasan/lokasi → green tree).
 * Used when an area has no explicit `marker_icon`, so every node carries a
 * kind-appropriate marker instead of a bare dot.
 */
export const KIND_DEFAULT_GLYPH: Record<'rayon' | 'area' | 'region' | 'surabaya', string> = {
  rayon: 'building',
  region: 'trees',
  area: 'trees',
  surabaya: 'building',
};

export function nodeCountIcon(
  variant: 'rayon' | 'area' | 'region' | 'surabaya',
  active: number,
  health: HealthLevel,
  opts?: { icon?: string | null }
): google.maps.Icon {
  const color = HEALTH_COLORS[health];
  const glyph = opts?.icon ? (NODE_GLYPHS[opts.icon] ?? null) : null;
  // Nothing scheduled + nobody active + no configured icon → a small muted dot
  // (dense rayons stay legible). A configured icon always renders.
  if (health === 'empty' && active <= 0 && !glyph) {
    const s = 12;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">` +
      `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 1}" fill="${WHITE}" stroke="${color}" stroke-width="2"/>` +
      `</svg>`;
    return {
      url: svgUrl(svg),
      scaledSize: new google.maps.Size(s, s),
      anchor: new google.maps.Point(s / 2, s / 2),
      labelOrigin: new google.maps.Point(s / 2, s + 8),
    };
  }
  // Kawasan/rayon a touch larger than lokasi so tiers read at a glance.
  const big = variant === 'rayon' || variant === 'region';
  const d = big ? 40 : 30;
  const r = d / 2 - 2;
  const fs = big ? 16 : 13;
  // Configured marker: the glyph fills the pin; the active count rides a small
  // health-colored badge at the top-right so status still reads at a glance.
  const center = glyph
    ? `<g transform="translate(${d / 2} ${d / 2}) scale(${(d * 0.55) / 24}) translate(-12 -12)" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
      (active > 0
        ? `<circle cx="${d - 8}" cy="8" r="8" fill="${color}"/>` +
          `<text x="${d - 8}" y="${8 + fs / 3}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="800" fill="${WHITE}">${active}</text>`
        : '')
    : `<text x="${d / 2}" y="${d / 2 + fs / 3}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="${fs}" font-weight="800" fill="${color}">${active}</text>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}">` +
    `<circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
    center +
    `</svg>`;
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(d, d),
    anchor: new google.maps.Point(d / 2, d / 2),
    labelOrigin: new google.maps.Point(d / 2, d + 9),
  };
}

/**
 * A custom-uploaded area marker image (penanda peta) rendered literally as the
 * pin — a square-boxed icon anchored at centre with the name label below. Legacy
 * markers can't composite the count badge + status ring onto an external image
 * (that needs Advanced/DOM markers), so the count/status stays in the status bar.
 */
export function nodeImageIcon(
  url: string,
  variant: 'rayon' | 'area' | 'region' | 'surabaya'
): google.maps.Icon {
  const d = variant === 'rayon' || variant === 'region' ? 42 : 34;
  return {
    url,
    scaledSize: new google.maps.Size(d, d),
    anchor: new google.maps.Point(d / 2, d / 2),
    labelOrigin: new google.maps.Point(d / 2, d + 9),
  };
}

/**
 * A node marker showing the attendance ratio `hadir/terjadwal`, colored by
 * staffing health — a white rounded bubble with a health-colored border, exactly
 * matching the mobile node bubbles. Surabaya is a wider bubble with a label.
 * Region markers use the same 76×44 size as rayon/area.
 */
export function nodeRatioIcon(
  variant: 'rayon' | 'area' | 'region' | 'surabaya',
  scheduled: number,
  clockedIn: number
): google.maps.Icon {
  const color = HEALTH_COLORS[rosterHealth(scheduled, clockedIn)];
  const ratio = `${clockedIn}/${scheduled}`;

  if (variant === 'surabaya') {
    const w = 152;
    const h = 72;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="16" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
      `<text x="${w / 2}" y="30" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="17" font-weight="800" fill="${BLACK}" letter-spacing="1">SURABAYA</text>` +
      `<text x="${w / 2}" y="56" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="800" fill="${color}">${ratio}</text>` +
      `</svg>`;
    return {
      url: svgUrl(svg),
      scaledSize: new google.maps.Size(w, h),
      anchor: new google.maps.Point(w / 2, h / 2),
    };
  }

  // rayon + area — one consistent rounded ratio bubble (matches mobile).
  const w = 76;
  const h = 44;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="12" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
    `<text x="${w / 2}" y="${h / 2 + 6}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="18" font-weight="800" fill="${color}">${ratio}</text>` +
    `</svg>`;
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h / 2),
  };
}

/* eslint-disable sekar-design/no-inline-hex-colors -- SVG icon fills for Google overlays */
// The CURRENT-node icon markers (mirrors mobile's rayon office / area pin). These
// are the detail-openers for the node you're inside — icon only, no ratio (the
// ratio lives on the child bubbles). Distinct from the drill bubbles above.
const NODE_DETAIL: Record<'rayon' | 'area', { color: string; glyph: string }> = {
  rayon: {
    color: '#2563EB',
    glyph:
      '<path d="M3 21h18"/><path d="M5 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16"/>' +
      '<path d="M14 21V9h4a1 1 0 0 1 1 1v11"/><path d="M8 7h2M8 11h2M8 15h2"/>',
  },
  area: {
    color: '#D97706',
    glyph: '<path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  },
};
/* eslint-enable sekar-design/no-inline-hex-colors */

/**
 * The current node's geographic pin (selected rayon at rayon scope, selected area
 * at area scope). A colored circle with a white glyph; clicking it opens the
 * node's detail — it does NOT drill, so it carries no ratio.
 */
export function nodeDetailIcon(variant: 'rayon' | 'area'): google.maps.Icon {
  const { color, glyph } = NODE_DETAIL[variant];
  const s = 48;
  const c = s / 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">` +
    `<circle cx="${c}" cy="${c}" r="20" fill="${color}" stroke="${WHITE}" stroke-width="3"/>` +
    `<g transform="translate(${c} ${c}) scale(0.92) translate(-12 -12)" fill="none" stroke="${WHITE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`;
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(s, s),
    anchor: new google.maps.Point(c, c),
  };
}

/**
 * A team bubble — a rounded white bubble with a team-colored border, displaying
 * the member count prominently and the team name as a smaller label.
 *
 * Dimensions: 90×46 px (landscape-friendly for readability).
 */
export function teamBubbleIcon(
  teamColor: string | null,
  memberCount: number,
  teamName: string
): google.maps.Icon {
  const color = teamColor ?? TEAM_DEFAULT;
  const w = 90;
  const h = 46;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="12" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
    `<text x="50%" y="18" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800" fill="${color}" letter-spacing="0.5">${memberCount}</text>` +
    `<text x="50%" y="40" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="600" fill="${BLACK}">${teamName}</text>` +
    `</svg>`;

  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h / 2),
  };
}
 
