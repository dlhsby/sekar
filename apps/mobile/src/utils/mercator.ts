/**
 * Web Mercator projection, plus the bridge from this platform's camera model.
 *
 * Marker collision is a SCREEN-space question: two kawasan 200 m apart overlap
 * completely when the camera spans the city and sit far apart when it spans a
 * street. So ranking needs pixels — and on mobile, getting to pixels needs one
 * step that web does not, because `react-native-maps` reports a coordinate SPAN
 * (`latitudeDelta` / `longitudeDelta`) where Google's web SDK reports a zoom
 * level. {@link deltaToZoom} is that step; everything after it is identical to
 * web's `lib/monitoring/mercator.ts`, deliberately, so the two cannot drift.
 *
 * Pure by design: no map instance, no layout read, no native call. It runs
 * during render and is unit-testable without a map.
 */

/** Google's world is one 256×256 tile at zoom 0; each level doubles it. */
export const TILE_SIZE = 256;

/**
 * Latitude clamp. The Mercator y term is `ln((1+sin φ)/(1−sin φ))`, which
 * diverges at the poles — unclamped, ±90° yields ±Infinity and every collision
 * test downstream becomes NaN. This is Mercator's standard cutoff.
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
 * two projected points are meaningful, which is all the collision test needs.
 */
export function projectToPixel(lat: number, lng: number, zoom: number): PixelPoint {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const sinY = Math.sin((clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180);

  return {
    x: scale * (0.5 + lng / 360),
    y: scale * (0.5 - Math.log((1 + sinY) / (1 - sinY)) / (4 * Math.PI)),
  };
}

/**
 * Camera span → zoom level. The mobile-only half of this module.
 *
 * At zoom `z` the world is `TILE_SIZE · 2^z` pixels wide and spans 360°, so a
 * viewport `viewportWidthPx` wide showing `longitudeDelta` degrees satisfies
 *
 *     viewportWidthPx / (TILE_SIZE · 2^z) = longitudeDelta / 360
 *
 * Degenerate spans — zero, negative, absent — arrive on the first frame before
 * the camera has reported one. They floor at 0 ("zoomed all the way out")
 * rather than producing a NaN that would poison every collision test and blank
 * the map.
 */
export function deltaToZoom(longitudeDelta: number, viewportWidthPx: number): number {
  const span = Math.abs(longitudeDelta);
  if (!Number.isFinite(span) || span <= 0) return 0;
  const z = Math.log2((360 * viewportWidthPx) / (TILE_SIZE * span));
  return Number.isFinite(z) ? Math.max(0, z) : 0;
}

/** Euclidean pixel separation. */
export function pixelDistance(a: PixelPoint, b: PixelPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
