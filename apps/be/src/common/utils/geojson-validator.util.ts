/**
 * GeoJSON Polygon validation utility
 *
 * Validates GeoJSON Polygon structures for area boundaries.
 * Coordinates follow GeoJSON convention: [longitude, latitude].
 * Surabaya bounding box enforced for all coordinates.
 */

export interface GeoJsonPolygon {
  type: string;
  coordinates: number[][][];
}

const SURABAYA_BOUNDS = {
  minLng: 112.5,
  maxLng: 113.0,
  minLat: -7.5,
  maxLat: -7.0,
} as const;

export class GeoJsonValidator {
  static validatePolygon(polygon: GeoJsonPolygon): string[] {
    const errors: string[] = [];

    if (!polygon || typeof polygon !== 'object') {
      return ['Polygon must be a non-null object'];
    }

    if (polygon.type !== 'Polygon') {
      errors.push(`Type must be 'Polygon', got '${polygon.type}'`);
    }

    if (!Array.isArray(polygon.coordinates)) {
      errors.push('Coordinates must be an array');
      return errors;
    }

    if (polygon.coordinates.length === 0) {
      errors.push('Coordinates must have at least one ring (outer ring)');
      return errors;
    }

    const outerRing = polygon.coordinates[0];

    if (!Array.isArray(outerRing)) {
      errors.push('Outer ring must be an array of coordinate pairs');
      return errors;
    }

    if (outerRing.length < 4) {
      errors.push(
        `Outer ring must have >= 4 points (3 vertices + closing), got ${outerRing.length}`,
      );
    }

    if (!this.isClosedRing(outerRing)) {
      errors.push('Outer ring must be closed (first point === last point)');
    }

    if (!this.isWithinSurabayaBounds(outerRing)) {
      errors.push(
        'All coordinates must be within Surabaya bounds (lng: 112.5-113.0, lat: -7.5 to -7.0)',
      );
    }

    for (let i = 0; i < outerRing.length; i++) {
      const point = outerRing[i];
      if (!Array.isArray(point) || point.length < 2) {
        errors.push(`Point at index ${i} must be [longitude, latitude]`);
        continue;
      }
      if (typeof point[0] !== 'number' || typeof point[1] !== 'number') {
        errors.push(`Point at index ${i} must contain numeric values`);
      }
    }

    return errors;
  }

  static isClosedRing(ring: number[][]): boolean {
    if (!ring || ring.length < 2) return false;

    const first = ring[0];
    const last = ring[ring.length - 1];

    if (!first || !last) return false;

    return first[0] === last[0] && first[1] === last[1];
  }

  static isWithinSurabayaBounds(coordinates: number[][]): boolean {
    if (!coordinates || coordinates.length === 0) return false;

    return coordinates.every((point) => {
      if (!Array.isArray(point) || point.length < 2) return false;
      const [lng, lat] = point;
      return (
        lng >= SURABAYA_BOUNDS.minLng &&
        lng <= SURABAYA_BOUNDS.maxLng &&
        lat >= SURABAYA_BOUNDS.minLat &&
        lat <= SURABAYA_BOUNDS.maxLat
      );
    });
  }

  /**
   * Compute area in square meters using Shoelace formula
   * with latitude correction for metric approximation.
   *
   * Coordinates: [longitude, latitude] pairs.
   */
  static computeAreaSqMeters(ring: number[][]): number {
    if (!ring || ring.length < 4) return 0;

    const metersPerDegreeLat = 111_320;
    const avgLat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
    const metersPerDegreeLng = metersPerDegreeLat * Math.cos((avgLat * Math.PI) / 180);

    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const x1 = ring[i][0] * metersPerDegreeLng;
      const y1 = ring[i][1] * metersPerDegreeLat;
      const x2 = ring[i + 1][0] * metersPerDegreeLng;
      const y2 = ring[i + 1][1] * metersPerDegreeLat;
      area += x1 * y2 - x2 * y1;
    }

    return Math.abs(area) / 2;
  }
}
