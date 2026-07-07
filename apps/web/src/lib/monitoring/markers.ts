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

export type HealthLevel = keyof typeof HEALTH_COLORS;

/** Pick a health level from the roster trio. */
export function rosterHealth(scheduled: number, clockedIn: number): HealthLevel {
  if (scheduled <= 0) return 'empty';
  if (clockedIn >= scheduled) return 'ok';
  if (clockedIn <= 0) return 'none';
  return 'short';
}

// White role glyphs, drawn as stroked paths inside a 24×24 box centered at (12,12).
const ROLE_GLYPHS: Record<string, string> = {
  satgas:
    '<path d="M4 17h16"/><path d="M6 17v-2a6 6 0 0 1 12 0v2"/><path d="M10 6.5V4h4v2.5"/>',
  linmas: '<path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z"/>',
  korlap:
    '<rect x="6" y="5" width="12" height="15" rx="1.5"/><path d="M9 5V4a3 3 0 0 1 6 0v1"/><path d="M9 11h6"/><path d="M9 14h6"/>',
};
const FALLBACK_GLYPH = '<circle cx="12" cy="9" r="3.2"/><path d="M6 19a6 6 0 0 1 12 0"/>';

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
  }
): google.maps.Icon {
  const glyph = ROLE_GLYPHS[role] ?? FALLBACK_GLYPH;
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
  const size = opts.selected ? 52 : 40;
  const h = Math.round(size * 1.2);
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(size, h),
    anchor: new google.maps.Point(size / 2, size * 0.5),
  };
}

/**
 * A node marker showing the attendance ratio `hadir/terjadwal`, colored by
 * staffing health — a white rounded bubble with a health-colored border, exactly
 * matching the mobile node bubbles. Surabaya is a wider bubble with a label.
 */
export function nodeRatioIcon(
  variant: 'rayon' | 'area' | 'surabaya',
  scheduled: number,
  clockedIn: number
): google.maps.Icon {
  const color = HEALTH_COLORS[rosterHealth(scheduled, clockedIn)];
  const ratio = `${clockedIn}/${scheduled}`;

  if (variant === 'surabaya') {
    const w = 128;
    const h = 60;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="14" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
      `<text x="${w / 2}" y="24" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="800" fill="${BLACK}" letter-spacing="1">SURABAYA</text>` +
      `<text x="${w / 2}" y="46" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800" fill="${color}">${ratio}</text>` +
      `</svg>`;
    return {
      url: svgUrl(svg),
      scaledSize: new google.maps.Size(w, h),
      anchor: new google.maps.Point(w / 2, h / 2),
    };
  }

  // rayon + area — one consistent rounded ratio bubble (matches mobile).
  const w = 60;
  const h = 34;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="10" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
    `<text x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="800" fill="${color}">${ratio}</text>` +
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
  const s = 34;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">` +
    `<circle cx="17" cy="17" r="14" fill="${color}" stroke="${WHITE}" stroke-width="2"/>` +
    `<g transform="translate(17 17) scale(0.66) translate(-12 -12)" fill="none" stroke="${WHITE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`;
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(s, s),
    anchor: new google.maps.Point(s / 2, s / 2),
  };
}
