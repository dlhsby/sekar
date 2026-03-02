/**
 * GPS Utility Functions
 *
 * Provides GPS-related calculations including distance measurement
 * using the Haversine formula for great-circle distances on Earth.
 */

import { EARTH_RADIUS_METERS } from '../constants/gps.constants';

/**
 * Calculate the great-circle distance between two GPS coordinates
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of first point in degrees (-90 to 90)
 * @param lng1 - Longitude of first point in degrees (-180 to 180)
 * @param lat2 - Latitude of second point in degrees (-90 to 90)
 * @param lng2 - Longitude of second point in degrees (-180 to 180)
 * @returns Distance between the two points in meters
 *
 * @example
 * // Calculate distance between two points in Surabaya
 * const distance = GpsUtil.calculateDistance(-7.2905, 112.7398, -7.2844, 112.7915);
 * console.log(distance); // ~615 meters
 */
export class GpsUtil {
  /**
   * Convert degrees to radians
   * @param degrees - Angle in degrees
   * @returns Angle in radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   *
   * The Haversine formula determines the great-circle distance between two
   * points on a sphere given their longitudes and latitudes.
   *
   * Formula:
   * a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
   * c = 2 × atan2(√a, √(1−a))
   * d = R × c
   *
   * where:
   * - φ = latitude
   * - λ = longitude
   * - R = Earth's radius (6,371,000 m)
   *
   * @param lat1 - Latitude of first point in degrees
   * @param lng1 - Longitude of first point in degrees
   * @param lat2 - Latitude of second point in degrees
   * @param lng2 - Longitude of second point in degrees
   * @returns Distance in meters
   */
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Convert coordinates to radians
    const lat1Rad = this.toRadians(lat1);
    const lng1Rad = this.toRadians(lng1);
    const lat2Rad = this.toRadians(lat2);
    const lng2Rad = this.toRadians(lng2);

    // Calculate differences
    const dLat = lat2Rad - lat1Rad;
    const dLng = lng2Rad - lng1Rad;

    // Haversine formula
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Calculate distance
    const distance = EARTH_RADIUS_METERS * c;

    return distance;
  }

  /**
   * Check if a GPS coordinate is within a circular boundary
   *
   * @param lat1 - Latitude of point to check
   * @param lng1 - Longitude of point to check
   * @param centerLat - Latitude of boundary center
   * @param centerLng - Longitude of boundary center
   * @param radiusMeters - Boundary radius in meters
   * @returns true if point is within boundary, false otherwise
   *
   * @example
   * // Check if worker is within 100m of Taman Bungkul
   * const isWithin = GpsUtil.isWithinBoundary(
   *   -7.2905, 112.7398,  // Worker location
   *   -7.2900, 112.7398,  // Area center
   *   100                  // 100m radius
   * );
   * console.log(isWithin); // true or false
   */
  static isWithinBoundary(
    lat1: number,
    lng1: number,
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
  ): boolean {
    const distance = this.calculateDistance(lat1, lng1, centerLat, centerLng);
    return distance <= radiusMeters;
  }

  /**
   * Ray casting algorithm — checks if a point is inside a polygon.
   *
   * Casts a horizontal ray from the point to the right and counts
   * how many polygon edges it crosses. An odd count means inside.
   *
   * @param lat Latitude of the point
   * @param lng Longitude of the point
   * @param polygon Array of [lng, lat] coordinate pairs (GeoJSON convention).
   *               The ring should be closed (first === last) but the method
   *               handles open rings too.
   * @returns true if the point is inside the polygon
   */
  static isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      // GeoJSON: [lng, lat]
      const yi = polygon[i][1];
      const xi = polygon[i][0];
      const yj = polygon[j][1];
      const xj = polygon[j][0];

      const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Check if a point is within an area boundary.
   *
   * Strategy: polygon-first, radius fallback.
   * - If the area has a `boundary_polygon` (GeoJSON Polygon), use ray casting.
   * - Otherwise fall back to radius-based check using gps_lat/gps_lng/radius_meters.
   * - If neither is available, returns true (no boundary defined).
   *
   * @param lat Latitude of the point
   * @param lng Longitude of the point
   * @param area Area with optional boundary_polygon, gps_lat, gps_lng, radius_meters
   * @returns true if within boundary (or no boundary defined), false if outside
   */
  static isWithinAreaBoundary(
    lat: number,
    lng: number,
    area: {
      boundary_polygon?: { type?: string; coordinates?: number[][][] };
      gps_lat?: number;
      gps_lng?: number;
      radius_meters?: number;
    },
  ): boolean {
    // 1. Polygon check (preferred)
    if (area.boundary_polygon?.coordinates && area.boundary_polygon.coordinates.length > 0) {
      const outerRing = area.boundary_polygon.coordinates[0];
      if (outerRing && outerRing.length >= 3) {
        return this.isPointInPolygon(lat, lng, outerRing);
      }
    }

    // 2. Radius fallback
    if (
      area.gps_lat != null &&
      area.gps_lng != null &&
      area.radius_meters != null &&
      area.radius_meters > 0
    ) {
      return this.isWithinBoundary(
        lat,
        lng,
        Number(area.gps_lat),
        Number(area.gps_lng),
        Number(area.radius_meters),
      );
    }

    // 3. No boundary defined — allow
    return true;
  }
}
