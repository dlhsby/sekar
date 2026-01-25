/**
 * Application Configuration
 * Centralized configuration for the SEKAR mobile app
 */

import {
  API_BASE_URL,
  API_VERSION,
  GOOGLE_MAPS_API_KEY,
  APP_ENV,
  LOCATION_MIN_INTERVAL_SECONDS,
  LOCATION_MAX_INTERVAL_SECONDS,
  LOCATION_DISTANCE_FILTER_METERS,
  LOCATION_BATCH_UPLOAD_SIZE,
  LOCATION_MAX_BUFFER_SIZE,
  GPS_TIMEOUT_SECONDS,
  SYNC_INTERVAL_SECONDS,
  MAP_REFRESH_INTERVAL_SECONDS,
  MAX_IMAGE_WIDTH,
  MAX_VIDEO_SIZE_MB,
  MAX_VIDEO_DURATION_SECONDS,
} from '@env';

/** Default API version if not specified in .env */
const DEFAULT_API_VERSION = 'v1';

/**
 * Parse numeric env var with fallback
 */
const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

interface Config {
  API_BASE_URL: string;
  API_VERSION: string;
  GOOGLE_MAPS_API_KEY: string;
  APP_ENV: 'development' | 'staging' | 'production';
  IS_DEV: boolean;
  IS_PRODUCTION: boolean;

  // Location tracking
  LOCATION_MIN_INTERVAL_MS: number;
  LOCATION_MAX_INTERVAL_MS: number;
  LOCATION_DISTANCE_FILTER: number;
  LOCATION_BATCH_SIZE: number;
  LOCATION_MAX_BUFFER_SIZE: number;
  GPS_TIMEOUT_MS: number;
  GPS_MAXIMUM_AGE_MS: number;

  // Legacy aliases (for backward compatibility)
  LOCATION_TRACKING_INTERVAL: number;

  // GPS validation
  GPS_BOUNDARY_RADIUS: number;
  GPS_ACCURACY_THRESHOLD: number;

  // Media
  MAX_IMAGE_WIDTH: number;
  MAX_VIDEO_SIZE: number;
  MAX_VIDEO_DURATION: number;

  // Sync
  SYNC_INTERVAL: number;
  MAP_REFRESH_INTERVAL: number;

  // Storage
  MIN_FREE_STORAGE_MB: number;

  // Offline queue
  MAX_RETRY_COUNT: number;
  RETRY_DELAYS_MS: number[];
}

/**
 * Get the API version from environment or use default
 */
const getApiVersion = (): string => {
  return API_VERSION || DEFAULT_API_VERSION;
};

/**
 * Get the API Base URL based on environment
 * Uses Host URL + API_VERSION to construct the full API URL
 */
const getApiBaseUrl = (): string => {
  const version = getApiVersion();

  if (API_BASE_URL) {
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    return `${baseUrl}/api/${version}`;
  }

  if (__DEV__) {
    return `http://10.0.2.2:3000/api/${version}`;
  }

  return `https://api.sekar.dlhsurabaya.go.id/api/${version}`;
};

const appEnv = (APP_ENV as Config['APP_ENV']) || (__DEV__ ? 'development' : 'production');

// Parse location tracking values from env (in seconds) to milliseconds
const locationMinIntervalMs = parseEnvNumber(LOCATION_MIN_INTERVAL_SECONDS, 10) * 1000;
const locationMaxIntervalMs = parseEnvNumber(LOCATION_MAX_INTERVAL_SECONDS, 60) * 1000;
const gpsTimeoutMs = parseEnvNumber(GPS_TIMEOUT_SECONDS, 10) * 1000;
const syncIntervalMs = parseEnvNumber(SYNC_INTERVAL_SECONDS, 300) * 1000;
const mapRefreshIntervalMs = parseEnvNumber(MAP_REFRESH_INTERVAL_SECONDS, 120) * 1000;

const config: Config = {
  API_BASE_URL: getApiBaseUrl(),
  API_VERSION: getApiVersion(),
  GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY || '',
  APP_ENV: appEnv,
  IS_DEV: appEnv === 'development' || __DEV__,
  IS_PRODUCTION: appEnv === 'production' && !__DEV__,

  // Location tracking (from env or defaults)
  LOCATION_MIN_INTERVAL_MS: locationMinIntervalMs,
  LOCATION_MAX_INTERVAL_MS: locationMaxIntervalMs,
  LOCATION_DISTANCE_FILTER: parseEnvNumber(LOCATION_DISTANCE_FILTER_METERS, 0),
  LOCATION_BATCH_SIZE: parseEnvNumber(LOCATION_BATCH_UPLOAD_SIZE, 20),
  LOCATION_MAX_BUFFER_SIZE: parseEnvNumber(LOCATION_MAX_BUFFER_SIZE, 100),
  GPS_TIMEOUT_MS: gpsTimeoutMs,
  GPS_MAXIMUM_AGE_MS: 5000, // 5 seconds - not configurable

  // Legacy alias for backward compatibility
  LOCATION_TRACKING_INTERVAL: locationMaxIntervalMs,

  // GPS boundary validation: ±100 meters
  GPS_BOUNDARY_RADIUS: 100,

  // GPS accuracy threshold: warn if accuracy > 50 meters
  GPS_ACCURACY_THRESHOLD: 50,

  // Media settings (from env or defaults)
  MAX_IMAGE_WIDTH: parseEnvNumber(MAX_IMAGE_WIDTH, 800),
  MAX_VIDEO_SIZE: parseEnvNumber(MAX_VIDEO_SIZE_MB, 50),
  MAX_VIDEO_DURATION: parseEnvNumber(MAX_VIDEO_DURATION_SECONDS, 30),

  // Sync intervals (from env or defaults)
  SYNC_INTERVAL: syncIntervalMs,
  MAP_REFRESH_INTERVAL: mapRefreshIntervalMs,

  // Minimum free storage: 100MB required for media operations
  MIN_FREE_STORAGE_MB: 100,

  // Offline queue retry limits
  MAX_RETRY_COUNT: 5,
  RETRY_DELAYS_MS: [1000, 2000, 4000, 8000, 16000],
};

// Log configuration on app start (development only)
if (__DEV__) {
  console.log('📱 SEKAR Configuration:', {
    API_BASE_URL: config.API_BASE_URL,
    APP_ENV: config.APP_ENV,
    IS_DEV: config.IS_DEV,
    LOCATION_INTERVAL: `${config.LOCATION_MIN_INTERVAL_MS / 1000}s - ${config.LOCATION_MAX_INTERVAL_MS / 1000}s`,
    LOCATION_DISTANCE_FILTER: `${config.LOCATION_DISTANCE_FILTER}m`,
    LOCATION_BATCH_SIZE: config.LOCATION_BATCH_SIZE,
    GPS_TIMEOUT: `${config.GPS_TIMEOUT_MS / 1000}s`,
    SYNC_INTERVAL: `${config.SYNC_INTERVAL / 1000}s`,
  });
}

export default config;
