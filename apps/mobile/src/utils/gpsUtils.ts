/**
 * GPS Utilities
 * Helper functions for GPS calculations and validations
 */

import type { Coordinates } from '../types/models.types';

/**
 * GPS tolerance as per business rules
 */
export const GPS_TOLERANCE_METERS = 100;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a coordinate is within an area boundary
 * @param currentLat - Current latitude
 * @param currentLng - Current longitude
 * @param areaLat - Area center latitude
 * @param areaLng - Area center longitude
 * @param radiusMeters - Area radius (optional, uses 100m tolerance)
 * @returns True if within boundary
 */
export function isWithinBoundary(
  currentLat: number,
  currentLng: number,
  areaLat: number,
  areaLng: number,
  radiusMeters: number = GPS_TOLERANCE_METERS,
): boolean {
  const distance = calculateDistance(currentLat, currentLng, areaLat, areaLng);
  return distance <= radiusMeters;
}

/**
 * Format coordinates for display
 * @param lat - Latitude OR Coordinates object
 * @param lng - Longitude (optional if first param is Coordinates)
 * @param decimals - Number of decimal places (default: 6)
 * @returns Formatted string
 */
export function formatCoordinates(
  lat: number | Coordinates,
  lng?: number,
  decimals: number = 6,
): string {
  if (typeof lat === 'object') {
    return `${lat.latitude.toFixed(decimals)}, ${lat.longitude.toFixed(decimals)}`;
  }
  if (lng === undefined) {
    throw new Error('Longitude is required when latitude is a number');
  }
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted string with appropriate unit
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  // Use .toFixed(1) and remove .0 if whole number
  return km % 1 === 0 ? `${km.toFixed(0)}km` : `${km.toFixed(1)}km`;
}

/**
 * Check if GPS accuracy is acceptable
 * @param accuracy - GPS accuracy in meters (or null)
 * @param threshold - Maximum acceptable accuracy (default: 30m)
 * @returns True if accuracy is acceptable
 */
export function isAccuracyAcceptable(
  accuracy: number | null,
  threshold: number = 30,
): boolean {
  if (accuracy === null) {
    return false;
  }
  return accuracy <= threshold;
}

/**
 * Get status message for GPS accuracy
 * @param accuracy - GPS accuracy in meters (or null)
 * @returns Status message
 */
export function getAccuracyStatus(accuracy: number | null): {
  status: 'unavailable' | 'good' | 'fair' | 'poor';
  message: string;
} {
  if (accuracy === null) {
    return {status: 'unavailable', message: 'GPS accuracy unavailable'};
  }
  if (accuracy <= 10) {
    return {status: 'good', message: 'Excellent GPS accuracy'};
  }
  if (accuracy <= 30) {
    return {status: 'fair', message: 'Acceptable GPS accuracy'};
  }
  return {status: 'poor', message: 'Poor GPS accuracy'};
}

/**
 * Validate clock-in location against area boundary and GPS accuracy
 * @param currentLat - Current latitude
 * @param currentLng - Current longitude
 * @param currentAccuracy - GPS accuracy in meters
 * @param areaLat - Area center latitude
 * @param areaLng - Area center longitude
 * @returns Validation result with error message if invalid
 */
export function validateClockInLocation(
  currentLat: number,
  currentLng: number,
  currentAccuracy: number | null,
  areaLat: number,
  areaLng: number,
): { valid: boolean; error?: string } {
  // Check GPS accuracy first
  if (!isAccuracyAcceptable(currentAccuracy)) {
    return {
      valid: false,
      error: `GPS accuracy too low (${currentAccuracy ? Math.round(currentAccuracy) : 'unknown'}m). Please wait for better signal.`,
    };
  }

  // Check if within boundary (100m tolerance)
  const distance = calculateDistance(currentLat, currentLng, areaLat, areaLng);
  if (distance > GPS_TOLERANCE_METERS) {
    return {
      valid: false,
      error: `You are ${Math.round(distance)}m away from the work area. Must be within ${GPS_TOLERANCE_METERS}m.`,
    };
  }

  return { valid: true };
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * Polygon uses GeoJSON format: [lng, lat] pairs
 * Matches backend GpsUtil.isPointInPolygon exactly
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    // GeoJSON: [lng, lat]
    const yi = polygon[i][1];
    const xi = polygon[i][0];
    const yj = polygon[j][1];
    const xj = polygon[j][0];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Check if a point is within an area boundary (polygon-first, radius fallback)
 * Matches backend GpsUtil.isWithinAreaBoundary strategy
 */
export function isWithinAreaBoundary(
  lat: number,
  lng: number,
  area: {
    boundary_polygon?:
      | { type: 'Polygon'; coordinates: [number, number][][] }
      | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
      | null;
    gps_lat?: number | null;
    gps_lng?: number | null;
  },
): boolean {
  // 1. Polygon / MultiPolygon check (preferred) — check each outer ring.
  // MultiPolygon areas (e.g. Taman Buk Tong, Menur RSJ sisi barat/timur)
  // need every member-polygon's outer ring tested individually.
  //
  // Defensive: only trust the geometry when `coordinates` is an array of the
  // expected depth. Some legacy callers/tests pass a bare ring or `[[lng,lat],
  // ...]` directly; in that case we fail open below.
  const geom = area.boundary_polygon as { type?: string; coordinates?: unknown } | null | undefined;
  if (geom && Array.isArray(geom.coordinates)) {
    let rings: [number, number][][] = [];
    if (geom.type === 'Polygon') {
      const ring = (geom.coordinates as unknown[])[0];
      if (Array.isArray(ring)) rings = [ring as [number, number][]];
    } else if (geom.type === 'MultiPolygon') {
      rings = (geom.coordinates as unknown[])
        .map((p) => Array.isArray(p) ? (p as unknown[])[0] : null)
        .filter((r): r is [number, number][] => Array.isArray(r));
    }
    if (rings.length > 0) {
      for (const ring of rings) {
        if (ring.length >= 3 && isPointInPolygon(lat, lng, ring)) return true;
      }
      if (rings.some((r) => r.length >= 3)) return false;
    }
  }

  // No usable ring — fail OPEN, matching the backend (`GpsUtil.isWithinAreaBoundary`).
  // An un-mapped lokasi must not mark a worker standing in it as outside-area.
  // The radius fallback that used to sit here is retired: `radius_meters` was
  // never data (every row carried a hardcoded 100) and migration
  // 17504000000000 converted the radius-only lokasi into real polygons.
  return true;
}

/**
 * Mock GPS coordinates (for development/testing only)
 * @returns Mock coordinates
 */
export function getMockCoordinates(): Coordinates {
  return {
    latitude: -7.2905,
    longitude: 112.7398,
    accuracy: 10,
  };
}

