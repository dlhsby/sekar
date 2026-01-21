/**
 * GPS Configuration Constants
 *
 * Centralized GPS-related configuration values used across the application.
 * These constants ensure consistency in GPS validation and tracking behavior.
 */

/**
 * Default GPS tolerance radius in meters
 *
 * Used when validating if a worker is within an area boundary during clock-in.
 * This is the default value; actual tolerance is stored per-area in the database.
 *
 * Business Rule: Workers must be within this distance from the area center to clock in.
 * Rationale: 100m provides balance between GPS accuracy limitations and security needs.
 */
export const DEFAULT_GPS_TOLERANCE_METERS = 100;

/**
 * Minimum acceptable GPS accuracy in meters
 *
 * GPS readings with accuracy worse than this value should be flagged or rejected.
 * Note: This is for future implementation of GPS accuracy validation.
 */
export const MIN_GPS_ACCURACY_METERS = 50;

/**
 * Location tracking interval in milliseconds
 *
 * How frequently background location updates are sent during an active shift.
 * Business Rule: 5-minute intervals balance battery life with tracking accuracy.
 */
export const LOCATION_TRACKING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Location tracking interval in minutes (for documentation/display)
 */
export const LOCATION_TRACKING_INTERVAL_MINUTES = 5;

/**
 * Maximum age of GPS reading in milliseconds
 *
 * GPS readings older than this are considered stale and should be rejected.
 * Used to ensure workers provide recent location data during clock-in.
 */
export const MAX_GPS_AGE_MS = 30 * 1000; // 30 seconds

/**
 * Earth's radius in meters (for Haversine formula calculations)
 *
 * Used in distance calculations between GPS coordinates.
 * Average radius value provides sufficient accuracy for our use case.
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * GPS coordinate precision (decimal places)
 *
 * Standard precision for storing GPS coordinates:
 * - 6 decimal places = ~0.11 meter accuracy
 * - Sufficient for park/area tracking needs
 */
export const GPS_COORDINATE_PRECISION = 6;
