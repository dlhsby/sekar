/**
 * API Error Codes Enum
 *
 * Standardized error codes for consistent error handling across the API.
 * These codes help mobile clients handle errors programmatically without
 * relying on HTTP status codes or error messages alone.
 *
 * Error Code Format: <DOMAIN>_<ERROR_TYPE>
 * Example: AUTH_INVALID_CREDENTIALS, SHIFT_ALREADY_ACTIVE
 */
export enum ApiErrorCode {
  // ==================== Authentication Errors ====================
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_ACCOUNT_INACTIVE = 'AUTH_ACCOUNT_INACTIVE',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  // Phase 4-7 (M2): refresh-token rotation + blacklist
  AUTH_REFRESH_EXPIRED = 'AUTH_010',
  AUTH_REFRESH_INVALID = 'AUTH_011',
  // Forced password reset: account must change its password before using the API.
  AUTH_PASSWORD_CHANGE_REQUIRED = 'AUTH_PASSWORD_CHANGE_REQUIRED',

  // ==================== Shift Errors ====================
  SHIFT_ALREADY_ACTIVE = 'SHIFT_ALREADY_ACTIVE',
  SHIFT_NOT_FOUND = 'SHIFT_NOT_FOUND',
  SHIFT_NOT_ACTIVE = 'SHIFT_NOT_ACTIVE',
  SHIFT_GPS_OUT_OF_BOUNDS = 'SHIFT_GPS_OUT_OF_BOUNDS',
  SHIFT_NOT_ASSIGNED = 'SHIFT_NOT_ASSIGNED',
  SHIFT_PHOTO_UPLOAD_FAILED = 'SHIFT_PHOTO_UPLOAD_FAILED',
  SHIFT_DURATION_TOO_SHORT = 'SHIFT_DURATION_TOO_SHORT',

  // ==================== Activity Errors (was Report) ====================
  ACTIVITY_SHIFT_REQUIRED = 'ACTIVITY_SHIFT_REQUIRED',
  ACTIVITY_SHIFT_NOT_FOUND = 'ACTIVITY_SHIFT_NOT_FOUND',
  ACTIVITY_EDIT_WINDOW_CLOSED = 'ACTIVITY_EDIT_WINDOW_CLOSED',
  ACTIVITY_PHOTO_REQUIRED = 'ACTIVITY_PHOTO_REQUIRED',
  ACTIVITY_NOT_FOUND = 'ACTIVITY_NOT_FOUND',
  ACTIVITY_ACCESS_DENIED = 'ACTIVITY_ACCESS_DENIED',
  ACTIVITY_PHOTO_UPLOAD_FAILED = 'ACTIVITY_PHOTO_UPLOAD_FAILED',
  /** User must be clocked in to submit an activity */
  ACTIVITY_MUST_CLOCK_IN = 'ACTIVITY_MUST_CLOCK_IN',
  /** Activity type does not match the user's role */
  ACTIVITY_ROLE_MISMATCH = 'ACTIVITY_ROLE_MISMATCH',
  /** Maximum 3 photos per activity */
  ACTIVITY_MAX_PHOTOS = 'ACTIVITY_MAX_PHOTOS',
  /** Minimum 1 photo required */
  ACTIVITY_MIN_PHOTOS = 'ACTIVITY_MIN_PHOTOS',

  // ==================== Overtime Errors ====================
  /** User not authorized to submit overtime */
  OVERTIME_SUBMIT_AUTH = 'OVERTIME_SUBMIT_AUTH',
  /** Overtime record already processed */
  OVERTIME_ALREADY_PROCESSED = 'OVERTIME_ALREADY_PROCESSED',
  /** Korlap can only approve overtime in own area */
  OVERTIME_AREA_SCOPE = 'OVERTIME_AREA_SCOPE',
  /** Overtime record not found */
  OVERTIME_NOT_FOUND = 'OVERTIME_NOT_FOUND',

  // ==================== Task Hierarchy Errors ====================
  /** Role not allowed to assign tasks to target role */
  TASK_HIER_ROLE = 'TASK_HIER_ROLE',
  /** Kepala rayon can only assign within own rayon */
  TASK_HIER_RAYON_SCOPE = 'TASK_HIER_RAYON_SCOPE',
  /** Korlap can only assign within own area */
  TASK_HIER_AREA_SCOPE = 'TASK_HIER_AREA_SCOPE',

  // ==================== Monitoring Errors ====================
  /** Kepala rayon can only view own rayon monitoring */
  MONITOR_RAYON_SCOPE = 'MONITOR_RAYON_SCOPE',
  /** Korlap can only view own area monitoring */
  MONITOR_AREA_SCOPE = 'MONITOR_AREA_SCOPE',

  // ==================== Sync Errors ====================
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_STALE_DATA = 'SYNC_STALE_DATA',
  SYNC_PARTIAL_FAILURE = 'SYNC_PARTIAL_FAILURE',

  // ==================== Area Errors ====================
  AREA_NOT_FOUND = 'AREA_NOT_FOUND',
  AREA_CODE_DUPLICATE = 'AREA_CODE_DUPLICATE',

  // ==================== General Errors ====================
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
}
