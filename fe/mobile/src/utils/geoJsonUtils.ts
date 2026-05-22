/**
 * GeoJSON helpers shared across map overlays.
 *
 * Some KMZ-sourced areas (e.g. Taman Buk Tong, Jl. Menur RSJ Sisi Barat) are
 * stored as `MultiPolygon` because their original source had multiple
 * disjoint shapes. The earlier `polygonToCoords()` helpers in each overlay
 * read only `coordinates[0]` and silently fell back to drawing a circle,
 * which is why those areas showed up as overlapping circles on the map.
 *
 * This module exposes one helper, `geometryToRings()`, that handles both
 * Polygon and MultiPolygon and returns one outer-ring coordinate array per
 * member polygon. Callers render one `<Polygon>` per ring.
 */

import type {
  GeoJsonGeometry,
  GeoJsonPolygon,
  GeoJsonMultiPolygon,
} from '../types/models.types';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Convert a single GeoJSON ring `[[lng, lat], ...]` to react-native-maps
 *  LatLng[]. Returns [] if the ring has fewer than 3 vertices. */
function ringToLatLng(ring: [number, number][]): LatLng[] {
  if (!ring || ring.length < 3) return [];
  return ring.map(([lng, lat]) => ({
    latitude: Number(lat),
    longitude: Number(lng),
  }));
}

/**
 * Convert any GeoJSON Polygon or MultiPolygon to one or more LatLng rings.
 *
 * - Polygon       → 1 ring (the outer ring at coordinates[0]).
 * - MultiPolygon  → N rings (the outer ring of each member polygon).
 *
 * Inner rings (holes) are not rendered — react-native-maps `<Polygon holes>`
 * is supported but none of the current SEKAR datasets ship with holes, so we
 * keep the helper minimal. Add hole handling here if a future dataset needs it.
 */
export function geometryToRings(
  geometry: GeoJsonGeometry | null | undefined,
): LatLng[][] {
  if (!geometry) return [];

  if (geometry.type === 'Polygon') {
    const ring = ringToLatLng((geometry as GeoJsonPolygon).coordinates[0]);
    return ring.length > 0 ? [ring] : [];
  }

  if (geometry.type === 'MultiPolygon') {
    const multi = geometry as GeoJsonMultiPolygon;
    return multi.coordinates
      .map((poly) => ringToLatLng(poly[0]))
      .filter((r) => r.length > 0);
  }

  return [];
}

/**
 * Backend-mirroring boundary check. Returns true if (lat,lng) sits inside
 * ANY outer ring of the supplied geometry. Inner rings (holes) are not
 * considered — see `geometryToRings()` for the rationale.
 */
export function isPointInGeometry(
  lat: number,
  lng: number,
  geometry: GeoJsonGeometry | null | undefined,
): boolean {
  if (!geometry) return false;
  const rings: [number, number][][] =
    geometry.type === 'Polygon'
      ? [(geometry as GeoJsonPolygon).coordinates[0]]
      : (geometry as GeoJsonMultiPolygon).coordinates.map((p) => p[0]);
  for (const ring of rings) {
    if (ring && ring.length >= 3 && pointInRing(lat, lng, ring)) return true;
  }
  return false;
}

/** Ray-casting algorithm, ring vertices stored as [lng, lat]. */
function pointInRing(lat: number, lng: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
