/**
 * Application Configuration
 * Centralized configuration for the SEKAR mobile app
 */

import { API_BASE_URL, GOOGLE_MAPS_API_KEY, APP_ENV } from '@env';

interface Config {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  APP_ENV: 'development' | 'staging' | 'production';
  IS_DEV: boolean;
  IS_PRODUCTION: boolean;
  LOCATION_TRACKING_INTERVAL: number; // in milliseconds
  LOCATION_BATCH_SIZE: number;
  GPS_BOUNDARY_RADIUS: number; // in meters
  MAX_IMAGE_WIDTH: number; // in pixels
  MAX_VIDEO_SIZE: number; // in MB
  MAX_VIDEO_DURATION: number; // in seconds
  SYNC_INTERVAL: number; // in milliseconds
  MAP_REFRESH_INTERVAL: number; // in milliseconds
}

/**
 * Get the API Base URL based on environment
 * Priority: .env file > __DEV__ check > production default
 */
const getApiBaseUrl = (): string => {
  // Use .env value if provided
  if (API_BASE_URL) {
    return API_BASE_URL;
  }

  // Fall back based on build type
  if (__DEV__) {
    // Development: Android emulator
    return 'http://10.0.2.2:3000/api/v1';
  }

  // Production: Use production API URL
  return 'https://api.sekar.dlhsurabaya.go.id/api/v1';
};

const appEnv = (APP_ENV as Config['APP_ENV']) || (__DEV__ ? 'development' : 'production');

const config: Config = {
  API_BASE_URL: getApiBaseUrl(),
  GOOGLE_MAPS_API_KEY: GOOGLE_MAPS_API_KEY || '',
  APP_ENV: appEnv,
  IS_DEV: appEnv === 'development' || __DEV__,
  IS_PRODUCTION: appEnv === 'production' && !__DEV__,

  // Location tracking: 10 minutes
  LOCATION_TRACKING_INTERVAL: 10 * 60 * 1000,

  // Batch upload after 50 location pings or 30 minutes
  LOCATION_BATCH_SIZE: 50,

  // GPS boundary validation: ±100 meters
  GPS_BOUNDARY_RADIUS: 100,

  // Image compression: max 800px width
  MAX_IMAGE_WIDTH: 800,

  // Video: max 50MB
  MAX_VIDEO_SIZE: 50,

  // Video: max 30 seconds
  MAX_VIDEO_DURATION: 30,

  // Sync attempt every 5 minutes
  SYNC_INTERVAL: 5 * 60 * 1000,

  // Map refresh every 2 minutes
  MAP_REFRESH_INTERVAL: 2 * 60 * 1000,
};

// Log configuration on app start (development only)
if (__DEV__) {
  console.log('📱 SEKAR Configuration:', {
    API_BASE_URL: config.API_BASE_URL,
    APP_ENV: config.APP_ENV,
    IS_DEV: config.IS_DEV,
    IS_PRODUCTION: config.IS_PRODUCTION,
  });
}

export default config;

