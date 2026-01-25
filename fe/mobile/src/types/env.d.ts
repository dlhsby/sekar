declare module '@env' {
  // API Configuration
  export const API_BASE_URL: string;
  export const API_VERSION: string;
  export const GOOGLE_MAPS_API_KEY: string;
  export const APP_ENV: string;

  // Location Tracking Configuration
  export const LOCATION_MIN_INTERVAL_SECONDS: string;
  export const LOCATION_MAX_INTERVAL_SECONDS: string;
  export const LOCATION_DISTANCE_FILTER_METERS: string;
  export const LOCATION_BATCH_UPLOAD_SIZE: string;
  export const LOCATION_MAX_BUFFER_SIZE: string;
  export const GPS_TIMEOUT_SECONDS: string;

  // Sync Configuration
  export const SYNC_INTERVAL_SECONDS: string;
  export const MAP_REFRESH_INTERVAL_SECONDS: string;

  // Media Configuration
  export const MAX_IMAGE_WIDTH: string;
  export const MAX_VIDEO_SIZE_MB: string;
  export const MAX_VIDEO_DURATION_SECONDS: string;
}
