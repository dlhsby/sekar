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
}
