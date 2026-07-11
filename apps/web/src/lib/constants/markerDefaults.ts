/**
 * System-default markers (UAT: markers are mandatory — an unset marker falls
 * back to a preseeded default, never empty). Defaults are resolved in code (not
 * written to the DB) so a stored `null` always means "use the current default".
 *
 * Role defaults track each role's seeded marker color/icon; entity defaults
 * track the existing rayon/region/area/team markers.
 */
import { MARKER_PRESETS } from './markerPresets';

export const GENERIC_DEFAULT_MARKER = '/markers/pin-gray.svg';

/** role code → default preset (mirrors the seeded role marker colors/icons). */
export const ROLE_MARKER_DEFAULTS: Record<string, string> = {
  superadmin: '/markers/pin-gray.svg',
  admin_system: '/markers/pin-blue.svg',
  management: '/markers/pin-purple.svg',
  kepala_rayon: '/markers/pin-yellow.svg',
  admin_rayon: '/markers/pin-orange.svg',
  korlap: '/markers/pin-green.svg',
  satgas: '/markers/pin-sage.svg',
  linmas: '/markers/pin-blue.svg', // shield/blue, matching the legacy marker
  staff_kecamatan: '/markers/pin-gray.svg',
};

export type MarkerEntityKind = 'rayon' | 'region' | 'area' | 'team';

/** entity kind → default preset (mirrors the existing geo/team markers). */
export const ENTITY_MARKER_DEFAULTS: Record<MarkerEntityKind, string> = {
  rayon: '/markers/pin-orange.svg', // building
  region: '/markers/pin-yellow.svg',
  area: '/markers/pin-green.svg', // tree
  team: '/markers/pin-teal.svg', // droplet
};

const KNOWN = new Set(MARKER_PRESETS.map((p) => p.url));

/** Default marker for a role code (falls back to the generic default). */
export function roleMarkerDefault(code: string | undefined | null): string {
  const url = (code && ROLE_MARKER_DEFAULTS[code]) || GENERIC_DEFAULT_MARKER;
  return KNOWN.has(url) ? url : GENERIC_DEFAULT_MARKER;
}

/** Default marker for a geo/team entity kind. */
export function entityMarkerDefault(kind: MarkerEntityKind): string {
  return ENTITY_MARKER_DEFAULTS[kind] ?? GENERIC_DEFAULT_MARKER;
}
