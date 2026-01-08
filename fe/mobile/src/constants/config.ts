/**
 * Application Configuration
 * Centralized configuration for the SEKAR mobile app
 */

interface Config {
  API_BASE_URL: string;
  GOOGLE_MAPS_API_KEY: string;
  APP_ENV: 'development' | 'staging' | 'production';
  LOCATION_TRACKING_INTERVAL: number; // in milliseconds
  LOCATION_BATCH_SIZE: number;
  GPS_BOUNDARY_RADIUS: number; // in meters
  MAX_IMAGE_WIDTH: number; // in pixels
  MAX_VIDEO_SIZE: number; // in MB
  MAX_VIDEO_DURATION: number; // in seconds
  SYNC_INTERVAL: number; // in milliseconds
  MAP_REFRESH_INTERVAL: number; // in milliseconds
}

// TODO: Replace with actual environment variables or react-native-config
const config: Config = {
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  APP_ENV: (process.env.APP_ENV as Config['APP_ENV']) || 'development',
  
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

export default config;

