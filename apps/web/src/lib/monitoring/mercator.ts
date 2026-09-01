/**
 * Web Mercator projection — lat/lng to the pixel plane Google Maps draws on.
 *
 * Marker collision is a SCREEN-space question. Two kawasan 200 m apart overlap
 * completely at zoom 11 and sit half a screen apart at zoom 16, so "do these
 * two pins fight for the same spot" cannot be answered in degrees. Everything
 * in `declutter.ts` reasons in the pixels this produces.
 *
 * Deliberately a pure function rather than `map.getProjection()`:
 *  - it runs during render, before any map instance is guaranteed to exist;
 *  - it is unit-testable with no Google Maps stub;
 *  - it never triggers a layout read, so it cannot cause a reflow in a hot path.
 *
 * The formulas are Google's own documented world-coordinate definition, so the
 * output matches what the map actually does with the same inputs.
 */

/** Google's world is one 256×256 tile at zoom 0; each level doubles it. */
export const TILE_SIZE = 256;

/**
 * Latitude clamp. The Mercator y term is `ln((1+sin φ)/(1−sin φ))`, which
 * diverges at the poles — unclamped, ±90° yields ±Infinity and every grid cell
 * downstream becomes NaN. This is Mercator's standard cutoff (the square world).
 */
const MAX_LATITUDE = 85.05112878;

export interface PixelPoint {
  x: number;
  y: number;
}

const clamp = (n: number, min: number, max: number): number => Math.min(Math.max(n, min), max);

/**
 * Project a coordinate to absolute pixels at `zoom`.
 *
 * The result is world-absolute, not screen-relative: only DIFFERENCES between
 * two projected points are meaningful, which is all the collision grid needs.
 */
export function projectToPixel(lat: number, lng: number, zoom: number): PixelPoint {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const clampedLat = clamp(lat, -MAX_LATITUDE, MAX_LATITUDE);
  const sinY = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: scale * (0.5 + lng / 360),
    y: scale * (0.5 - Math.log((1 + sinY) / (1 - sinY)) / (4 * Math.PI)),
  };
}

/** Euclidean pixel separation. */
export function pixelDistance(a: PixelPoint, b: PixelPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
