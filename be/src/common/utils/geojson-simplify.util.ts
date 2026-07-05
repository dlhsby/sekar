/**
 * Lightweight Douglas–Peucker simplification for GeoJSON Polygon / MultiPolygon
 * boundary geometry. Used to shrink the `/monitoring/boundaries` payload — RTH
 * area polygons imported from KMZ can carry hundreds of near-collinear vertices
 * that the map does not need at monitoring zoom levels.
 *
 * Tolerance is in degrees (WGS84). ~1e-4° ≈ 11 m at Surabaya's latitude, which
 * is visually lossless for boundary outlines while cutting vertex counts sharply.
 */

export type Position = [number, number];

/** Perpendicular distance from `pt` to the segment (`a`→`b`) in degree space. */
function perpendicularDistance(pt: Position, a: Position, b: Position): number {
  const [x, y] = pt;
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projX = x1 + clamped * dx;
  const projY = y1 + clamped * dy;
  return Math.hypot(x - projX, y - projY);
}

/** Iterative Douglas–Peucker over an open list of points. */
function douglasPeucker(points: Position[], tolerance: number): Position[] {
  if (points.length <= 2) return points;

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const dist = perpendicularDistance(points[i], points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

/**
 * Simplify a single linear ring, preserving closure. Rings with ≤4 points
 * (a triangle + closing point) are returned untouched. Falls back to the
 * original ring if simplification would collapse it below a valid polygon.
 */
function simplifyRing(ring: Position[], tolerance: number): Position[] {
  if (!Array.isArray(ring) || ring.length <= 4) return ring;

  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];

  const open = closed ? ring.slice(0, -1) : ring;
  const simplifiedOpen = douglasPeucker(open, tolerance);

  // A valid polygon ring needs at least 3 distinct points.
  if (simplifiedOpen.length < 3) return ring;

  return closed ? [...simplifiedOpen, simplifiedOpen[0]] : simplifiedOpen;
}

/**
 * Simplify a GeoJSON Polygon or MultiPolygon geometry. Returns the input
 * unchanged for other geometry types or nullish input.
 */
export function simplifyGeometry<T>(geometry: T, tolerance = 1e-4): T {
  const geom = geometry as unknown as {
    type?: string;
    coordinates?: unknown;
  } | null;
  if (!geom || typeof geom !== 'object' || !geom.type) return geometry;

  if (geom.type === 'Polygon') {
    const coords = geom.coordinates as Position[][];
    return {
      ...geom,
      coordinates: coords.map((ring) => simplifyRing(ring, tolerance)),
    } as unknown as T;
  }

  if (geom.type === 'MultiPolygon') {
    const coords = geom.coordinates as Position[][][];
    return {
      ...geom,
      coordinates: coords.map((polygon) => polygon.map((ring) => simplifyRing(ring, tolerance))),
    } as unknown as T;
  }

  return geometry;
}

/** Count total vertices in a Polygon / MultiPolygon (for logging / tests). */
export function countVertices(geometry: unknown): number {
  const geom = geometry as { type?: string; coordinates?: unknown } | null;
  if (!geom || !geom.type) return 0;
  if (geom.type === 'Polygon') {
    return (geom.coordinates as Position[][]).reduce((sum, ring) => sum + ring.length, 0);
  }
  if (geom.type === 'MultiPolygon') {
    return (geom.coordinates as Position[][][]).reduce(
      (sum, poly) => sum + poly.reduce((s, ring) => s + ring.length, 0),
      0,
    );
  }
  return 0;
}
