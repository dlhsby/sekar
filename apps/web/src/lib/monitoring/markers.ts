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
  'hard-hat': '<path d="M4 17h16"/><path d="M6 17v-2a6 6 0 0 1 12 0v2"/><path d="M10 6.5V4h4v2.5"/>',
  clipboard:
    '<rect x="6" y="5" width="12" height="15" rx="1.5"/><path d="M9 5V4a3 3 0 0 1 6 0v1"/><path d="M9 11h6"/><path d="M9 14h6"/>',
  briefcase:
    '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
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
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  sprout:
    '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  flower:
    '<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  wrench:
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  truck:
    '<path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'map-pin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  warehouse:
    '<path d="M22 8.35V20a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/>',
  camera:
    '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
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
 * A worker pin — the SAME unified white teardrop as areas (ADR-051 revised): the
 * **role glyph** identifies who it is, and live status rides the **outline ring**
 * (green aktif / amber tidak-aktif; **grey = ad-hoc/uncounted**). A **dashed**
 * outline marks a worker outside their area (luar area). Fill stays white so the
 * status color reads cleanly and workers match the area markers.
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
  const glyphPath = resolveWorkerGlyph(role, opts.markerIcon);
  const outline = opts.adHoc ? ADHOC : ACTIVITY_COLORS[opts.activity];
  return pinMarkerFromPath(glyphPath, {
    outline,
    dashed: opts.outside,
    big: opts.selected,
  });
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
// Per-kind default glyph. Kawasan (trees = a grove) and lokasi (tree = a single
// site) are deliberately DISTINCT so the two tiers read apart at a glance.
export const KIND_DEFAULT_GLYPH: Record<'rayon' | 'area' | 'region' | 'surabaya', string> = {
  rayon: 'building',
  region: 'trees', // kawasan = a grove of trees
  area: 'leaf', // lokasi = a single leaf (visually distinct from the kawasan grove)
  surabaya: 'building',
};

/* eslint-disable sekar-design/no-inline-hex-colors -- SVG icon fills for Google overlays */
// Every glyph name the unified pin can draw (role glyphs + area glyphs).
const ALL_GLYPHS: Record<string, string> = { ...ICON_GLYPHS, ...NODE_GLYPHS };
// The pin-*.svg teardrop, so a code-drawn marker matches the old preset shape.
const PIN_PATH = 'M24 2C12.4 2 3 11.4 3 23c0 15 21 34 21 34s21-19 21-34C45 11.4 35.6 2 24 2z';
const PIN_INK = '#1C1917';
/** Neutral outline for static previews (no live status to show). */
export const MARKER_NEUTRAL_OUTLINE = PIN_INK;
/** Team fill when a team has no color set (teams are the one color-differentiated kind). */
export const DEFAULT_MARKER_COLOR = '#78716C';
/* eslint-enable sekar-design/no-inline-hex-colors */

/**
 * The unified marker (ADR-051, revised): one code-drawn teardrop pin. **Fill is
 * white** for every kind (rayon/kawasan/lokasi/worker) so the marker never
 * competes with the base map — the **glyph alone identifies the type/role**.
 * ALL live status rides the **outline ring + the count number** (`opts.outline`
 * = staffing health for areas / activity for workers; `opts.count` = the
 * badge). Teams are the sole exception: they pass a `fill` = their team color.
 * `opts.dashed` marks a worker outside its area.
 */
export function pinMarker(
  glyph: string | null,
  opts: { outline: string; fill?: string; fillOpacity?: number; count?: number; big?: boolean; dashed?: boolean }
): google.maps.Icon {
  return pinMarkerFromPath(glyph ? (ALL_GLYPHS[glyph] ?? null) : null, opts);
}

/** Core pin builder taking a raw glyph PATH (worker pins already resolve to a path). */
function pinMarkerFromPath(
  glyphPath: string | null,
  opts: { outline: string; fill?: string; fillOpacity?: number; count?: number; big?: boolean; dashed?: boolean }
): google.maps.Icon {
  const fill = opts.fill ?? WHITE;
  const fillOpacity = opts.fillOpacity ?? 1;
  const { outline } = opts;
  const count = opts.count ?? 0;
  const dash = opts.dashed ? ' stroke-dasharray="5 3"' : '';
  const w = opts.big ? 46 : 38;
  const h = Math.round(w * 1.25);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 48 60">` +
    `<path d="${PIN_PATH}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${outline}" stroke-width="3.5" stroke-linejoin="round"${dash}/>` +
    `<circle cx="24" cy="22" r="13" fill="${WHITE}" fill-opacity="${fillOpacity < 1 ? 0.85 : 1}"/>` +
    (glyphPath
      ? `<g transform="translate(24 22) scale(0.92) translate(-12 -12)" fill="none" stroke="${PIN_INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyphPath}</g>`
      : '') +
    (count > 0
      ? `<circle cx="39" cy="10" r="9" fill="${outline}" stroke="${WHITE}" stroke-width="1.5"/>` +
        `<text x="39" y="14" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="800" fill="${WHITE}">${count}</text>`
      : '') +
    `</svg>`;
  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, Math.round(h * 0.95)),
    labelOrigin: new google.maps.Point(w / 2, h + 2),
  };
}

/** System-default glyph per marker-entity kind (rayon → building, kawasan → trees, lokasi → leaf, team → droplets). */
export function entityDefaultGlyph(kind: 'rayon' | 'region' | 'area' | 'team'): string {
  if (kind === 'rayon') return 'building';
  if (kind === 'team') return 'droplets';
  if (kind === 'area') return 'leaf';
  return 'trees';
}

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
/**
 * A team's map marker — the unified glyph pin (ADR-051) in the team's color:
 * teardrop filled with the team color, the team glyph in the centre, and the
 * member count as the badge. Replaces the old landscape bubble so a collapsed
 * team reads like every other marker.
 */
export function teamMarkerIcon(
  teamColor: string | null,
  memberCount: number,
  glyph?: string | null
): google.maps.Icon {
  const color = teamColor ?? TEAM_DEFAULT;
  return pinMarker(glyph ?? entityDefaultGlyph('team'), {
    outline: color,
    fill: color,
    fillOpacity: 0.9,
    count: memberCount,
    big: true,
  });
}

/** @deprecated Use {@link teamMarkerIcon} — teams now render as a glyph pin, not a bubble. */
export function teamBubbleIcon(
  teamColor: string | null,
  memberCount: number,
  teamName: string,
  glyph?: string | null
): google.maps.Icon {
  const color = teamColor ?? TEAM_DEFAULT;
  const w = 90;
  const h = 46;
  const glyphPath = glyph ? ALL_GLYPHS[glyph] ?? null : null;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="12" fill="${WHITE}" stroke="${color}" stroke-width="3"/>` +
    // Team glyph (left, in the team color) when configured — identifies the crew type.
    (glyphPath
      ? `<g transform="translate(16 16) scale(0.7) translate(-12 -12)" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${glyphPath}</g>`
      : '') +
    `<text x="${glyphPath ? '58%' : '50%'}" y="18" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800" fill="${color}" letter-spacing="0.5">${memberCount}</text>` +
    `<text x="50%" y="40" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="600" fill="${BLACK}">${teamName}</text>` +
    `</svg>`;

  return {
    url: svgUrl(svg),
    scaledSize: new google.maps.Size(w, h),
    anchor: new google.maps.Point(w / 2, h / 2),
  };
}
 
