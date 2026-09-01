/**
 * Per-district boundary colors for the monitoring map.
 *
 * Each district gets a distinct, *stable* color so the 7 Rayon polygons are
 * visually separable and never change between loads. The assignment is
 * deterministic — districts are sorted by id and mapped to a fixed palette — so a
 * given district always renders the same color across reloads and devices, without
 * any backend/DB round-trip. (If admin-configurable colors are needed later,
 * swap `buildDistrictColorMap` for a `district.color` field read from the API.)
 *
 * Lives in its own module (like trailColors.ts) so the palette can be unit
 * tested without dragging in react-native-maps via BoundaryOverlay.
 */

import { nbColors, withAlpha } from '../../constants/nbTokens';

export interface DistrictColor {
  stroke: string;
  fill: string;
}

// A categorical palette of distinct, accessible hues — reused from the role
// token set (the only ready-made group of N distinct brand colors). Order is
// fixed. Near-black / gray role tokens are intentionally excluded: at a
// translucent polygon fill they read as "no color" against the map.
export const DISTRICT_PALETTE: string[] = [
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
 * Builds a stable `districtId → {stroke, fill}` map. De-duping + sorting the ids
 * makes the assignment deterministic regardless of the order the API returns
 * districts in, so every district keeps its color across loads.
 */
export function buildDistrictColorMap(districtIds: string[]): Map<string, DistrictColor> {
  const sorted = Array.from(new Set(districtIds)).sort();
  const map = new Map<string, DistrictColor>();
  sorted.forEach((id, i) => {
    const base = DISTRICT_PALETTE[i % DISTRICT_PALETTE.length];
    map.set(id, { stroke: base, fill: withAlpha(base, FILL_ALPHA) });
  });
  return map;
}

/** Color for a district id missing from the map (defensive; shouldn't happen). */
export const DISTRICT_FALLBACK: DistrictColor = {
  stroke: nbColors.requestUnderReview,
  fill: withAlpha(nbColors.requestUnderReview, 0.08),
};

/** Convenience: resolve one district's color from a prebuilt map. */
export function districtColor(
  map: Map<string, DistrictColor>,
  districtId: string,
): DistrictColor {
  return map.get(districtId) ?? DISTRICT_FALLBACK;
}
