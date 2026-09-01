/**
 * Bounding-box tests for GeoJSON geometry — the server half of the monitoring
 * map's **viewport** mode (ADR-060).
 *
 * Zoom mode asks for every rayon, kawasan and lokasi at once: on the real
 * dataset that is ~1090 nodes and roughly 1.5 MB of polygon geometry, most of it
 * outside whatever the operator is actually looking at. Viewport mode sends the
 * camera's bounds and gets back only what intersects them.
 *
 * Deliberately a **bounding-box** test, not a true polygon intersection:
 *  - it is O(vertices) with no geometry library, and runs on already-loaded rows;
 *  - it errs toward INCLUDING a shape (a polygon whose box overlaps but whose
 *    outline does not is still returned). Over-inclusion costs a few KB;
 *    under-inclusion would blank a boundary the operator is standing inside,
 *    which reads as data loss.
 *
 * The filtering happens after the rows are loaded, so it trims the **payload**
 * and the client's polygon construction — which is where this map's cost is —
 * rather than the database read.
 */

/** `[minLng, minLat, maxLng, maxLat]` — the GeoJSON axis order. */
export type BBox = [number, number, number, number];

/** Parse a `minLng,minLat,maxLng,maxLat` query string. Null if unusable. */
export function parseBBox(raw?: string | null): BBox | null {
  if (!raw) return null;
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  // Normalise a box drawn "backwards" rather than rejecting it: a client that
  // swaps its corners should get the region it meant, not an empty map.
  return [
    Math.min(minLng, maxLng),
    Math.min(minLat, maxLat),
    Math.max(minLng, maxLng),
    Math.max(minLat, maxLat),
  ];
}

/** The bbox of a GeoJSON Polygon / MultiPolygon. Null when there is no geometry. */
export function geometryBBox(geometry: unknown): BBox | null {
  const g = geometry as { type?: string; coordinates?: unknown } | null;
  if (!g || !Array.isArray(g.coordinates)) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  // Walk the nested arrays without caring about the nesting depth: Polygon is
  // ring[]→position[], MultiPolygon is polygon[]→ring[]→position[], and both
  // bottom out at [lng, lat]. One walker covers both.
  const walk = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      const [lng, lat] = node as [number, number];
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const child of node) walk(child);
  };
  walk(g.coordinates);

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return [minLng, minLat, maxLng, maxLat];
}

/** Do two boxes overlap? Touching edges count as overlapping. */
export function bboxIntersects(a: BBox, b: BBox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** Is a point inside the box? */
export function pointInBBox(lat: number | null, lng: number | null, box: BBox): boolean {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lng >= box[0] && lng <= box[2] && lat >= box[1] && lat <= box[3];
}

/**
 * Is this entity visible in `box`?
 *
 * Geometry wins when present — a rayon large enough to fill the screen has its
 * centre off-camera, so a centre-only test would drop the very shape the
 * operator is inside. The centre is the fallback for entities that carry no
 * polygon at all (kawasan often do not).
 */
export function visibleIn(
  box: BBox,
  geometry: unknown,
  centerLat: number | null,
  centerLng: number | null,
): boolean {
  const geo = geometryBBox(geometry);
  if (geo) return bboxIntersects(geo, box);
  return pointInBBox(centerLat, centerLng, box);
}
