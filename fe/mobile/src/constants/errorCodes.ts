/**
 * Backend API Error Codes
 *
 * Must match be/src/common/enums/api-error-codes.enum.ts
 * These constants enable programmatic error handling in the mobile app.
 *
 * Usage:
 * ```typescript
 * catch (error) {
 *   const apiError = error as ApiError;
 *   if (apiError.code === ApiErrorCode.SHIFT_ALREADY_ACTIVE) {
 *     // Handle already clocked in
 *   }
 * }
 * ```
 */

import i18n from '../i18n/config';

export const ApiErrorCode = {
  // ==================== Authentication Errors ====================
  /**
   * Invalid username or password provided during login
   * HTTP Status: 401
   */
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  /**
   * JWT token has expired and needs to be refreshed
   * HTTP Status: 401
   */
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',

  /**
   * JWT token is malformed, invalid, or tampered with
   * HTTP Status: 401
   */
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',

  /**
   * User account has been deactivated by admin
   * HTTP Status: 401
   */
  AUTH_ACCOUNT_INACTIVE: 'AUTH_ACCOUNT_INACTIVE',

  /**
   * User not found or has been deleted
   * HTTP Status: 401
   */
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',

  // ==================== Shift Errors ====================
  /**
   * Worker already has an active shift and cannot clock in again
   * HTTP Status: 400
   */
  SHIFT_ALREADY_ACTIVE: 'SHIFT_ALREADY_ACTIVE',

  /**
   * Shift with given ID not found
   * HTTP Status: 404
   */
  SHIFT_NOT_FOUND: 'SHIFT_NOT_FOUND',

  /**
   * No active shift found for clock-out operation
   * HTTP Status: 400
   */
  SHIFT_NOT_ACTIVE: 'SHIFT_NOT_ACTIVE',

  /**
   * GPS coordinates are outside the allowed area boundary
   * HTTP Status: 400
   */
  SHIFT_GPS_OUT_OF_BOUNDS: 'SHIFT_GPS_OUT_OF_BOUNDS',

  /**
   * Worker is not assigned to any area or the requested area
   * HTTP Status: 400
   */
  SHIFT_NOT_ASSIGNED: 'SHIFT_NOT_ASSIGNED',

  /**
   * Failed to upload clock-in/out selfie photo
   * HTTP Status: 400
   */
  SHIFT_PHOTO_UPLOAD_FAILED: 'SHIFT_PHOTO_UPLOAD_FAILED',

  /**
   * Shift duration is below the minimum required duration (15 minutes)
   * HTTP Status: 400
   */
  SHIFT_DURATION_TOO_SHORT: 'SHIFT_DURATION_TOO_SHORT',

  // ==================== Report Errors ====================
  /**
   * Report must be created during an active shift
   * HTTP Status: 400
   */
  REPORT_SHIFT_REQUIRED: 'REPORT_SHIFT_REQUIRED',

  /**
   * Shift not found or doesn't belong to worker
   * HTTP Status: 404
   */
  REPORT_SHIFT_NOT_FOUND: 'REPORT_SHIFT_NOT_FOUND',

  /**
   * Reports can only be edited within 1 hour of creation
   * HTTP Status: 403
   */
  REPORT_EDIT_WINDOW_CLOSED: 'REPORT_EDIT_WINDOW_CLOSED',

  /**
   * Report requires a photo attachment
   * HTTP Status: 400
   */
  REPORT_PHOTO_REQUIRED: 'REPORT_PHOTO_REQUIRED',

  /**
   * Report not found
   * HTTP Status: 404
   */
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',

  /**
   * Worker can only access their own reports
   * HTTP Status: 403
   */
  REPORT_ACCESS_DENIED: 'REPORT_ACCESS_DENIED',

  /**
   * Failed to upload report photo
   * HTTP Status: 400
   */
  REPORT_PHOTO_UPLOAD_FAILED: 'REPORT_PHOTO_UPLOAD_FAILED',

  // ==================== Sync Errors ====================
  /**
   * Data conflict detected during sync operation
   * HTTP Status: 409
   */
  SYNC_CONFLICT: 'SYNC_CONFLICT',

  /**
   * Client data is outdated and needs refresh
   * HTTP Status: 412
   */
  SYNC_STALE_DATA: 'SYNC_STALE_DATA',

  /**
   * Some items in batch operation failed
   * HTTP Status: 207
   */
  SYNC_PARTIAL_FAILURE: 'SYNC_PARTIAL_FAILURE',

  // ==================== Area Errors ====================
  /**
   * Area not found
   * HTTP Status: 404
   */
  AREA_NOT_FOUND: 'AREA_NOT_FOUND',

  /**
   * Area code already exists
   * HTTP Status: 409
   */
  AREA_CODE_DUPLICATE: 'AREA_CODE_DUPLICATE',

  // ==================== Worker Assignment Errors ====================
  /**
   * Worker is not assigned to any area
   * HTTP Status: 400
   */
  ASSIGNMENT_NOT_FOUND: 'ASSIGNMENT_NOT_FOUND',

  /**
   * Worker already assigned to an area
   * HTTP Status: 409
   */
  ASSIGNMENT_ALREADY_EXISTS: 'ASSIGNMENT_ALREADY_EXISTS',

  // ==================== General Errors ====================
  /**
   * Request validation failed (DTO validation)
   * HTTP Status: 400
   */
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  /**
   * Resource not found
   * HTTP Status: 404
   */
  NOT_FOUND: 'NOT_FOUND',

  /**
   * User doesn't have permission to perform action
   * HTTP Status: 403
   */
  FORBIDDEN: 'FORBIDDEN',

  /**
   * Unexpected server error
   * HTTP Status: 500
   */
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  /**
   * Invalid request parameters
   * HTTP Status: 400
   */
  BAD_REQUEST: 'BAD_REQUEST',

  // ==================== Client-side Errors ====================
  /**
   * Network connection error (no response from server)
   * HTTP Status: 0
   */
  NETWORK_ERROR: 'NETWORK_ERROR',

  /**
   * Unknown error occurred (fallback)
   * HTTP Status: -1
   */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCodeType = typeof ApiErrorCode[keyof typeof ApiErrorCode];

/**
 * Legacy Indonesian error copy, kept only as a fallback for any code not present
 * in the i18n `errors` namespace (e.g. deprecated REPORT_* codes). New copy lives
 * in `src/i18n/locales/<lng>/errors.json`; `getErrorMessage` prefers i18next.
 * @deprecated Prefer the i18n `errors` namespace.
 */
export const ErrorMessages: Record<string, string> = {
  // Authentication Errors
  [ApiErrorCode.AUTH_INVALID_CREDENTIALS]: 'Username atau password salah',
  [ApiErrorCode.AUTH_TOKEN_EXPIRED]: 'Sesi telah berakhir. Silakan login kembali',
  [ApiErrorCode.AUTH_TOKEN_INVALID]: 'Token tidak valid. Silakan login kembali',
  [ApiErrorCode.AUTH_ACCOUNT_INACTIVE]: 'Akun tidak aktif. Hubungi administrator',
  [ApiErrorCode.AUTH_USER_NOT_FOUND]: 'Pengguna tidak ditemukan',

  // Shift Errors
  [ApiErrorCode.SHIFT_ALREADY_ACTIVE]: 'Anda sudah clock-in. Selesaikan shift terlebih dahulu',
  [ApiErrorCode.SHIFT_NOT_FOUND]: 'Shift tidak ditemukan',
  [ApiErrorCode.SHIFT_NOT_ACTIVE]: 'Tidak ada shift aktif. Clock-in terlebih dahulu',
  [ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS]: 'Anda di luar area kerja. Mendekat ke area yang ditugaskan',
  [ApiErrorCode.SHIFT_NOT_ASSIGNED]: 'Anda belum ditugaskan ke area manapun. Hubungi supervisor',
  [ApiErrorCode.SHIFT_PHOTO_UPLOAD_FAILED]: 'Gagal mengunggah foto. Periksa koneksi internet',
  [ApiErrorCode.SHIFT_DURATION_TOO_SHORT]: 'Durasi shift terlalu singkat (minimal 15 menit)',

  // Report Errors
  [ApiErrorCode.REPORT_SHIFT_REQUIRED]: 'Harap clock-in terlebih dahulu untuk membuat laporan',
  [ApiErrorCode.REPORT_SHIFT_NOT_FOUND]: 'Shift tidak ditemukan',
  [ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED]: 'Waktu edit laporan telah habis (maks 1 jam)',
  [ApiErrorCode.REPORT_PHOTO_REQUIRED]: 'Laporan harus menyertakan foto',
  [ApiErrorCode.REPORT_NOT_FOUND]: 'Laporan tidak ditemukan',
  [ApiErrorCode.REPORT_ACCESS_DENIED]: 'Anda tidak memiliki akses ke laporan ini',
  [ApiErrorCode.REPORT_PHOTO_UPLOAD_FAILED]: 'Gagal mengunggah foto laporan. Periksa koneksi internet',

  // Sync Errors
  [ApiErrorCode.SYNC_CONFLICT]: 'Konflik data. Data telah diubah oleh pengguna lain',
  [ApiErrorCode.SYNC_STALE_DATA]: 'Data sudah kadaluarsa. Memuat ulang data terbaru',
  [ApiErrorCode.SYNC_PARTIAL_FAILURE]: 'Beberapa data gagal disinkronkan. Akan dicoba lagi',

  // Area Errors
  [ApiErrorCode.AREA_NOT_FOUND]: 'Area tidak ditemukan',
  [ApiErrorCode.AREA_CODE_DUPLICATE]: 'Kode area sudah digunakan',

  // Assignment Errors
  [ApiErrorCode.ASSIGNMENT_NOT_FOUND]: 'Anda belum ditugaskan ke area manapun',
  [ApiErrorCode.ASSIGNMENT_ALREADY_EXISTS]: 'Anda sudah ditugaskan ke area ini',

  // General Errors
  [ApiErrorCode.VALIDATION_ERROR]: 'Data tidak valid. Periksa kembali form Anda',
  [ApiErrorCode.NOT_FOUND]: 'Data tidak ditemukan',
  [ApiErrorCode.FORBIDDEN]: 'Anda tidak memiliki izin untuk melakukan tindakan ini',
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: 'Terjadi kesalahan server. Coba lagi nanti',
  [ApiErrorCode.BAD_REQUEST]: 'Permintaan tidak valid',

  // Client-side Errors
  [ApiErrorCode.NETWORK_ERROR]: 'Tidak ada koneksi internet. Periksa koneksi Anda',
  [ApiErrorCode.UNKNOWN_ERROR]: 'Terjadi kesalahan yang tidak diketahui',
};

/**
 * Resolve an API error code to a user-facing message in the active language.
 *
 * Resolution order: i18n `errors` namespace → legacy `ErrorMessages` fallback
 * (deprecated codes) → caller default → generic. The backend `code` is the
 * shared contract; copy is owned entirely by the frontends.
 *
 * @param code - Error code from API
 * @param defaultMessage - Fallback message if the code is unmapped
 */
export function getErrorMessage(code: string, defaultMessage?: string): string {
  if (code && i18n.exists(`errors:${code}`)) {
    return i18n.t(`errors:${code}`);
  }
   
  return ErrorMessages[code] || defaultMessage || i18n.t('errors:GENERIC');
}
