/**
 * Per-rayon boundary colors for the monitoring map.
 *
 * Each rayon gets a distinct, *stable* color so the 7 Rayon polygons are
 * visually separable and never change between loads. The assignment is
 * deterministic — rayons are sorted by id and mapped to a fixed palette — so a
 * given rayon always renders the same color across reloads and devices, without
 * any backend/DB round-trip. (If admin-configurable colors are needed later,
 * swap `buildRayonColorMap` for a `rayon.color` field read from the API.)
 *
 * Lives in its own module (like trailColors.ts) so the palette can be unit
 * tested without dragging in react-native-maps via BoundaryOverlay.
 */

import { nbColors, withAlpha } from '../../constants/nbTokens';

export interface RayonColor {
  stroke: string;
  fill: string;
}

// A categorical palette of distinct, accessible hues — reused from the role
// token set (the only ready-made group of N distinct brand colors). Order is
// fixed. Near-black / gray role tokens are intentionally excluded: at a
// translucent polygon fill they read as "no color" against the map.
export const RAYON_PALETTE: string[] = [
  nbColors.roleSatgas, // green
  nbColors.roleLinmas, // blue
  nbColors.roleKorlap, // amber
  nbColors.roleAdminData, // purple
  nbColors.roleKepala, // coral
  nbColors.roleTop, // dark green
  nbColors.roleKecamatan, // pale yellow
];

/** Alpha applied to the stroke color to derive the translucent polygon fill. */
const FILL_ALPHA = 0.14;

/**
 * Builds a stable `rayonId → {stroke, fill}` map. De-duping + sorting the ids
 * makes the assignment deterministic regardless of the order the API returns
 * rayons in, so every rayon keeps its color across loads.
 */
export function buildRayonColorMap(rayonIds: string[]): Map<string, RayonColor> {
  const sorted = Array.from(new Set(rayonIds)).sort();
  const map = new Map<string, RayonColor>();
  sorted.forEach((id, i) => {
    const base = RAYON_PALETTE[i % RAYON_PALETTE.length];
    map.set(id, { stroke: base, fill: withAlpha(base, FILL_ALPHA) });
  });
  return map;
}

/** Color for a rayon id missing from the map (defensive; shouldn't happen). */
export const RAYON_FALLBACK: RayonColor = {
  stroke: nbColors.requestUnderReview,
  fill: withAlpha(nbColors.requestUnderReview, 0.08),
};

/** Convenience: resolve one rayon's color from a prebuilt map. */
export function rayonColor(
  map: Map<string, RayonColor>,
  rayonId: string,
): RayonColor {
  return map.get(rayonId) ?? RAYON_FALLBACK;
}
