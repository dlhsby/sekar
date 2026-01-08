/**
 * GPS Utilities
 * Helper functions for GPS calculations and validations
 */

import type { Coordinates } from '../types/models.types';
import config from '../constants/config';

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
 * @param radiusMeters - Area radius (optional, uses config default)
 * @returns True if within boundary
 */
export function isWithinBoundary(
  currentLat: number,
  currentLng: number,
  areaLat: number,
  areaLng: number,
  radiusMeters: number = config.GPS_BOUNDARY_RADIUS,
): boolean {
  const distance = calculateDistance(currentLat, currentLng, areaLat, areaLng);
  return distance <= radiusMeters;
}

/**
 * Format coordinates for display
 * @param coordinates - GPS coordinates
 * @returns Formatted string
 */
export function formatCoordinates(coordinates: Coordinates): string {
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
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
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Check if GPS accuracy is acceptable
 * @param accuracy - GPS accuracy in meters
 * @param threshold - Maximum acceptable accuracy (default: 50m)
 * @returns True if accuracy is acceptable
 */
export function isAccuracyAcceptable(
  accuracy: number,
  threshold: number = 50,
): boolean {
  return accuracy <= threshold;
}

/**
 * Get status message for GPS accuracy
 * @param accuracy - GPS accuracy in meters
 * @returns Status message
 */
export function getAccuracyStatus(accuracy: number): {
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
} {
  if (accuracy <= 10) {
    return {status: 'excellent', message: 'GPS signal excellent'};
  }
  if (accuracy <= 30) {
    return {status: 'good', message: 'GPS signal good'};
  }
  if (accuracy <= 50) {
    return {status: 'fair', message: 'GPS signal fair'};
  }
  return {status: 'poor', message: 'GPS signal poor'};
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

