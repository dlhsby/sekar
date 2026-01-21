/**
 * GPS Utilities
 * Helper functions for GPS calculations and validations
 */

import type { Coordinates } from '../types/models.types';
import config from '../constants/config';

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

