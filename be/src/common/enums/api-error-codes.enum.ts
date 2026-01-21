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
  /**
   * Invalid username or password provided during login
   * HTTP Status: 401
   */
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',

  /**
   * JWT token has expired and needs to be refreshed
   * HTTP Status: 401
   */
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',

  /**
   * JWT token is malformed, invalid, or tampered with
   * HTTP Status: 401
   */
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',

  /**
   * User account has been deactivated by admin
   * HTTP Status: 401
   */
  AUTH_ACCOUNT_INACTIVE = 'AUTH_ACCOUNT_INACTIVE',

  /**
   * User not found or has been deleted
   * HTTP Status: 401
   */
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',

  // ==================== Shift Errors ====================
  /**
   * Worker already has an active shift and cannot clock in again
   * HTTP Status: 400
   */
  SHIFT_ALREADY_ACTIVE = 'SHIFT_ALREADY_ACTIVE',

  /**
   * Shift with given ID not found
   * HTTP Status: 404
   */
  SHIFT_NOT_FOUND = 'SHIFT_NOT_FOUND',

  /**
   * No active shift found for clock-out operation
   * HTTP Status: 400
   */
  SHIFT_NOT_ACTIVE = 'SHIFT_NOT_ACTIVE',

  /**
   * GPS coordinates are outside the allowed area boundary
   * HTTP Status: 400
   */
  SHIFT_GPS_OUT_OF_BOUNDS = 'SHIFT_GPS_OUT_OF_BOUNDS',

  /**
   * Worker is not assigned to any area or the requested area
   * HTTP Status: 400
   */
  SHIFT_NOT_ASSIGNED = 'SHIFT_NOT_ASSIGNED',

  /**
   * Failed to upload clock-in/out selfie photo
   * HTTP Status: 400
   */
  SHIFT_PHOTO_UPLOAD_FAILED = 'SHIFT_PHOTO_UPLOAD_FAILED',

  /**
   * Shift duration is below the minimum required duration (15 minutes)
   * HTTP Status: 400
   */
  SHIFT_DURATION_TOO_SHORT = 'SHIFT_DURATION_TOO_SHORT',

  // ==================== Report Errors ====================
  /**
   * Report must be created during an active shift
   * HTTP Status: 400
   */
  REPORT_SHIFT_REQUIRED = 'REPORT_SHIFT_REQUIRED',

  /**
   * Shift not found or doesn't belong to worker
   * HTTP Status: 404
   */
  REPORT_SHIFT_NOT_FOUND = 'REPORT_SHIFT_NOT_FOUND',

  /**
   * Reports can only be edited within 1 hour of creation
   * HTTP Status: 403
   */
  REPORT_EDIT_WINDOW_CLOSED = 'REPORT_EDIT_WINDOW_CLOSED',

  /**
   * Report requires a photo attachment
   * HTTP Status: 400
   */
  REPORT_PHOTO_REQUIRED = 'REPORT_PHOTO_REQUIRED',

  /**
   * Report not found
   * HTTP Status: 404
   */
  REPORT_NOT_FOUND = 'REPORT_NOT_FOUND',

  /**
   * Worker can only access their own reports
   * HTTP Status: 403
   */
  REPORT_ACCESS_DENIED = 'REPORT_ACCESS_DENIED',

  /**
   * Failed to upload report photo
   * HTTP Status: 400
   */
  REPORT_PHOTO_UPLOAD_FAILED = 'REPORT_PHOTO_UPLOAD_FAILED',

  // ==================== Sync Errors ====================
  /**
   * Data conflict detected during sync operation
   * HTTP Status: 409
   */
  SYNC_CONFLICT = 'SYNC_CONFLICT',

  /**
   * Client data is outdated and needs refresh
   * HTTP Status: 412
   */
  SYNC_STALE_DATA = 'SYNC_STALE_DATA',

  /**
   * Some items in batch operation failed
   * HTTP Status: 207
   */
  SYNC_PARTIAL_FAILURE = 'SYNC_PARTIAL_FAILURE',

  // ==================== Area Errors ====================
  /**
   * Area not found
   * HTTP Status: 404
   */
  AREA_NOT_FOUND = 'AREA_NOT_FOUND',

  /**
   * Area code already exists
   * HTTP Status: 409
   */
  AREA_CODE_DUPLICATE = 'AREA_CODE_DUPLICATE',

  // ==================== Worker Assignment Errors ====================
  /**
   * Worker is not assigned to any area
   * HTTP Status: 400
   */
  ASSIGNMENT_NOT_FOUND = 'ASSIGNMENT_NOT_FOUND',

  /**
   * Worker already assigned to an area
   * HTTP Status: 409
   */
  ASSIGNMENT_ALREADY_EXISTS = 'ASSIGNMENT_ALREADY_EXISTS',

  // ==================== General Errors ====================
  /**
   * Request validation failed (DTO validation)
   * HTTP Status: 400
   */
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  /**
   * Resource not found
   * HTTP Status: 404
   */
  NOT_FOUND = 'NOT_FOUND',

  /**
   * User doesn't have permission to perform action
   * HTTP Status: 403
   */
  FORBIDDEN = 'FORBIDDEN',

  /**
   * Unexpected server error
   * HTTP Status: 500
   */
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  /**
   * Invalid request parameters
   * HTTP Status: 400
   */
  BAD_REQUEST = 'BAD_REQUEST',
}
