// API Configuration
export const API_BASE_URL = 'http://localhost:3000';
export const API_VERSION = 'v1';
export const GOOGLE_MAPS_API_KEY = 'mock-api-key';
export const APP_ENV = 'test';

// Location Tracking Configuration (in seconds for env, converted to ms in config)
export const LOCATION_MIN_INTERVAL_SECONDS = '10';
export const LOCATION_MAX_INTERVAL_SECONDS = '60';
export const LOCATION_DISTANCE_FILTER_METERS = '0';
export const LOCATION_BATCH_UPLOAD_SIZE = '20';
export const LOCATION_MAX_BUFFER_SIZE = '100';
export const GPS_TIMEOUT_SECONDS = '10';

// Sync Configuration
export const SYNC_INTERVAL_SECONDS = '300';
export const MAP_REFRESH_INTERVAL_SECONDS = '120';

// Media Configuration
export const MAX_IMAGE_WIDTH = '800';
export const MAX_VIDEO_SIZE_MB = '50';
export const MAX_VIDEO_DURATION_SECONDS = '30';

// Crash reporting (Phase 4-1 B4) — empty disables Sentry by default
export const SENTRY_DSN_MOBILE = '';
export const SENTRY_RELEASE = '';
export const SENTRY_ENVIRONMENT = '';
export const SENTRY_TRACES_SAMPLE_RATE = '0.1';

// Support hotline (ForgotPasswordScreen)
export const SUPPORT_HOTLINE_WHATSAPP = '081200000000';
export const SUPPORT_HOTLINE_PHONE = '0317788990';
