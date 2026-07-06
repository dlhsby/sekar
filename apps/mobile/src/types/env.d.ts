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

  // Support hotline (ForgotPasswordScreen) — shown pre-login so users can
  // request a temporary password. Optional; the screen falls back to the
  // DLH Surabaya default numbers when unset.
  export const SUPPORT_HOTLINE_WHATSAPP: string;
  export const SUPPORT_HOTLINE_PHONE: string;

  // Crash reporting (Phase 4-1 B4) — empty disables Sentry (default in dev)
  export const SENTRY_DSN_MOBILE: string;
  export const SENTRY_RELEASE: string;
  export const SENTRY_ENVIRONMENT: string;
  export const SENTRY_TRACES_SAMPLE_RATE: string;
}
