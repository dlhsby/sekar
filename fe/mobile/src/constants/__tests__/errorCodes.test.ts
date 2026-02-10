/**
 * Error Codes Tests
 * Tests for API error code constants and error message mapping
 */

import { ApiErrorCode, ErrorMessages, getErrorMessage } from '../errorCodes';

describe('ApiErrorCode', () => {
  it('should define all authentication error codes', () => {
    expect(ApiErrorCode.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS');
    expect(ApiErrorCode.AUTH_TOKEN_EXPIRED).toBe('AUTH_TOKEN_EXPIRED');
    expect(ApiErrorCode.AUTH_TOKEN_INVALID).toBe('AUTH_TOKEN_INVALID');
    expect(ApiErrorCode.AUTH_ACCOUNT_INACTIVE).toBe('AUTH_ACCOUNT_INACTIVE');
    expect(ApiErrorCode.AUTH_USER_NOT_FOUND).toBe('AUTH_USER_NOT_FOUND');
  });

  it('should define all shift error codes', () => {
    expect(ApiErrorCode.SHIFT_ALREADY_ACTIVE).toBe('SHIFT_ALREADY_ACTIVE');
    expect(ApiErrorCode.SHIFT_NOT_FOUND).toBe('SHIFT_NOT_FOUND');
    expect(ApiErrorCode.SHIFT_NOT_ACTIVE).toBe('SHIFT_NOT_ACTIVE');
    expect(ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS).toBe('SHIFT_GPS_OUT_OF_BOUNDS');
    expect(ApiErrorCode.SHIFT_NOT_ASSIGNED).toBe('SHIFT_NOT_ASSIGNED');
    expect(ApiErrorCode.SHIFT_PHOTO_UPLOAD_FAILED).toBe('SHIFT_PHOTO_UPLOAD_FAILED');
    expect(ApiErrorCode.SHIFT_DURATION_TOO_SHORT).toBe('SHIFT_DURATION_TOO_SHORT');
  });

  it('should define all report error codes', () => {
    expect(ApiErrorCode.REPORT_SHIFT_REQUIRED).toBe('REPORT_SHIFT_REQUIRED');
    expect(ApiErrorCode.REPORT_SHIFT_NOT_FOUND).toBe('REPORT_SHIFT_NOT_FOUND');
    expect(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED).toBe('REPORT_EDIT_WINDOW_CLOSED');
    expect(ApiErrorCode.REPORT_PHOTO_REQUIRED).toBe('REPORT_PHOTO_REQUIRED');
    expect(ApiErrorCode.REPORT_NOT_FOUND).toBe('REPORT_NOT_FOUND');
    expect(ApiErrorCode.REPORT_ACCESS_DENIED).toBe('REPORT_ACCESS_DENIED');
    expect(ApiErrorCode.REPORT_PHOTO_UPLOAD_FAILED).toBe('REPORT_PHOTO_UPLOAD_FAILED');
  });

  it('should define all sync error codes', () => {
    expect(ApiErrorCode.SYNC_CONFLICT).toBe('SYNC_CONFLICT');
    expect(ApiErrorCode.SYNC_STALE_DATA).toBe('SYNC_STALE_DATA');
    expect(ApiErrorCode.SYNC_PARTIAL_FAILURE).toBe('SYNC_PARTIAL_FAILURE');
  });

  it('should define all area error codes', () => {
    expect(ApiErrorCode.AREA_NOT_FOUND).toBe('AREA_NOT_FOUND');
    expect(ApiErrorCode.AREA_CODE_DUPLICATE).toBe('AREA_CODE_DUPLICATE');
  });

  it('should define all assignment error codes', () => {
    expect(ApiErrorCode.ASSIGNMENT_NOT_FOUND).toBe('ASSIGNMENT_NOT_FOUND');
    expect(ApiErrorCode.ASSIGNMENT_ALREADY_EXISTS).toBe('ASSIGNMENT_ALREADY_EXISTS');
  });

  it('should define all general error codes', () => {
    expect(ApiErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ApiErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ApiErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ApiErrorCode.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
    expect(ApiErrorCode.BAD_REQUEST).toBe('BAD_REQUEST');
  });

  it('should define all client-side error codes', () => {
    expect(ApiErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
    expect(ApiErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
  });

  it('should have consistent naming pattern', () => {
    // All error codes should be uppercase with underscores
    Object.values(ApiErrorCode).forEach(code => {
      expect(code).toMatch(/^[A-Z_]+$/);
    });
  });

  it('should have no duplicate error codes', () => {
    const codes = Object.values(ApiErrorCode);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should have all error codes defined in error messages', () => {
    Object.values(ApiErrorCode).forEach(code => {
      expect(ErrorMessages[code]).toBeDefined();
      expect(typeof ErrorMessages[code]).toBe('string');
      expect(ErrorMessages[code].length).toBeGreaterThan(0);
    });
  });
});

describe('ErrorMessages', () => {
  describe('authentication error messages', () => {
    it('should have Indonesian message for AUTH_INVALID_CREDENTIALS', () => {
      expect(ErrorMessages[ApiErrorCode.AUTH_INVALID_CREDENTIALS]).toBe(
        'Username atau password salah'
      );
    });

    it('should have Indonesian message for AUTH_TOKEN_EXPIRED', () => {
      expect(ErrorMessages[ApiErrorCode.AUTH_TOKEN_EXPIRED]).toBe(
        'Sesi telah berakhir. Silakan login kembali'
      );
    });

    it('should have Indonesian message for AUTH_TOKEN_INVALID', () => {
      expect(ErrorMessages[ApiErrorCode.AUTH_TOKEN_INVALID]).toBe(
        'Token tidak valid. Silakan login kembali'
      );
    });

    it('should have Indonesian message for AUTH_ACCOUNT_INACTIVE', () => {
      expect(ErrorMessages[ApiErrorCode.AUTH_ACCOUNT_INACTIVE]).toBe(
        'Akun tidak aktif. Hubungi administrator'
      );
    });

    it('should have Indonesian message for AUTH_USER_NOT_FOUND', () => {
      expect(ErrorMessages[ApiErrorCode.AUTH_USER_NOT_FOUND]).toBe(
        'Pengguna tidak ditemukan'
      );
    });
  });

  describe('shift error messages', () => {
    it('should have Indonesian message for SHIFT_ALREADY_ACTIVE', () => {
      expect(ErrorMessages[ApiErrorCode.SHIFT_ALREADY_ACTIVE]).toBe(
        'Anda sudah clock-in. Selesaikan shift terlebih dahulu'
      );
    });

    it('should have Indonesian message for SHIFT_NOT_ACTIVE', () => {
      expect(ErrorMessages[ApiErrorCode.SHIFT_NOT_ACTIVE]).toBe(
        'Tidak ada shift aktif. Clock-in terlebih dahulu'
      );
    });

    it('should have Indonesian message for SHIFT_GPS_OUT_OF_BOUNDS', () => {
      expect(ErrorMessages[ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS]).toBe(
        'Anda di luar area kerja. Mohon mendekat ke dalam area yang ditugaskan'
      );
    });

    it('should have Indonesian message for SHIFT_NOT_ASSIGNED', () => {
      expect(ErrorMessages[ApiErrorCode.SHIFT_NOT_ASSIGNED]).toBe(
        'Anda belum ditugaskan ke area manapun. Hubungi supervisor'
      );
    });

    it('should have Indonesian message for SHIFT_DURATION_TOO_SHORT', () => {
      expect(ErrorMessages[ApiErrorCode.SHIFT_DURATION_TOO_SHORT]).toBe(
        'Durasi shift terlalu singkat (minimal 15 menit)'
      );
    });
  });

  describe('report error messages', () => {
    it('should have Indonesian message for REPORT_SHIFT_REQUIRED', () => {
      expect(ErrorMessages[ApiErrorCode.REPORT_SHIFT_REQUIRED]).toBe(
        'Harap clock-in terlebih dahulu untuk membuat laporan'
      );
    });

    it('should have Indonesian message for REPORT_EDIT_WINDOW_CLOSED', () => {
      expect(ErrorMessages[ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED]).toBe(
        'Waktu edit laporan telah habis (maks 1 jam)'
      );
    });

    it('should have Indonesian message for REPORT_PHOTO_REQUIRED', () => {
      expect(ErrorMessages[ApiErrorCode.REPORT_PHOTO_REQUIRED]).toBe(
        'Laporan harus menyertakan foto'
      );
    });

    it('should have Indonesian message for REPORT_ACCESS_DENIED', () => {
      expect(ErrorMessages[ApiErrorCode.REPORT_ACCESS_DENIED]).toBe(
        'Anda tidak memiliki akses ke laporan ini'
      );
    });
  });

  describe('sync error messages', () => {
    it('should have Indonesian message for SYNC_CONFLICT', () => {
      expect(ErrorMessages[ApiErrorCode.SYNC_CONFLICT]).toBe(
        'Konflik data. Data telah diubah oleh pengguna lain'
      );
    });

    it('should have Indonesian message for SYNC_STALE_DATA', () => {
      expect(ErrorMessages[ApiErrorCode.SYNC_STALE_DATA]).toBe(
        'Data sudah kadaluarsa. Memuat ulang data terbaru'
      );
    });

    it('should have Indonesian message for SYNC_PARTIAL_FAILURE', () => {
      expect(ErrorMessages[ApiErrorCode.SYNC_PARTIAL_FAILURE]).toBe(
        'Beberapa data gagal disinkronkan. Akan dicoba lagi'
      );
    });
  });

  describe('general error messages', () => {
    it('should have Indonesian message for VALIDATION_ERROR', () => {
      expect(ErrorMessages[ApiErrorCode.VALIDATION_ERROR]).toBe(
        'Data tidak valid. Periksa kembali form Anda'
      );
    });

    it('should have Indonesian message for FORBIDDEN', () => {
      expect(ErrorMessages[ApiErrorCode.FORBIDDEN]).toBe(
        'Anda tidak memiliki izin untuk melakukan tindakan ini'
      );
    });

    it('should have Indonesian message for INTERNAL_SERVER_ERROR', () => {
      expect(ErrorMessages[ApiErrorCode.INTERNAL_SERVER_ERROR]).toBe(
        'Terjadi kesalahan server. Coba lagi nanti'
      );
    });
  });

  describe('client error messages', () => {
    it('should have Indonesian message for NETWORK_ERROR', () => {
      expect(ErrorMessages[ApiErrorCode.NETWORK_ERROR]).toBe(
        'Tidak ada koneksi internet. Periksa koneksi Anda'
      );
    });

    it('should have Indonesian message for UNKNOWN_ERROR', () => {
      expect(ErrorMessages[ApiErrorCode.UNKNOWN_ERROR]).toBe(
        'Terjadi kesalahan yang tidak diketahui'
      );
    });
  });

  it('should have all messages in Indonesian', () => {
    // Check that messages don't contain common English error words
    const englishErrorWords = ['error', 'failed', 'invalid', 'unauthorized', 'forbidden'];

    Object.values(ErrorMessages).forEach(message => {
      const lowerMessage = message.toLowerCase();
      englishErrorWords.forEach(word => {
        expect(lowerMessage).not.toContain(word);
      });
    });
  });

  it('should have non-empty messages', () => {
    Object.values(ErrorMessages).forEach(message => {
      expect(message.length).toBeGreaterThan(0);
    });
  });

  it('should have user-friendly messages', () => {
    // Messages should not contain technical jargon
    const technicalTerms = ['HTTP', 'API', '401', '403', '404', '500'];

    Object.values(ErrorMessages).forEach(message => {
      technicalTerms.forEach(term => {
        expect(message).not.toContain(term);
      });
    });
  });
});

describe('getErrorMessage', () => {
  it('should return mapped error message for valid code', () => {
    const message = getErrorMessage(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
    expect(message).toBe('Username atau password salah');
  });

  it('should return default message for unknown code', () => {
    const message = getErrorMessage('UNKNOWN_CODE');
    expect(message).toBe('Terjadi kesalahan');
  });

  it('should return custom default message when provided', () => {
    const customDefault = 'Custom error message';
    const message = getErrorMessage('UNKNOWN_CODE', customDefault);
    expect(message).toBe(customDefault);
  });

  it('should prioritize mapped message over default message', () => {
    const message = getErrorMessage(
      ApiErrorCode.NETWORK_ERROR,
      'This should not be returned'
    );
    expect(message).toBe('Tidak ada koneksi internet. Periksa koneksi Anda');
  });

  it('should handle all shift error codes', () => {
    expect(getErrorMessage(ApiErrorCode.SHIFT_ALREADY_ACTIVE)).toContain('clock-in');
    expect(getErrorMessage(ApiErrorCode.SHIFT_NOT_ACTIVE)).toContain('shift');
    expect(getErrorMessage(ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS)).toContain('area');
  });

  it('should handle all report error codes', () => {
    expect(getErrorMessage(ApiErrorCode.REPORT_SHIFT_REQUIRED)).toContain('clock-in');
    expect(getErrorMessage(ApiErrorCode.REPORT_PHOTO_REQUIRED)).toContain('foto');
    expect(getErrorMessage(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED)).toContain('jam');
  });

  it('should handle all authentication error codes', () => {
    expect(getErrorMessage(ApiErrorCode.AUTH_INVALID_CREDENTIALS)).toContain('password');
    expect(getErrorMessage(ApiErrorCode.AUTH_TOKEN_EXPIRED)).toContain('login');
    expect(getErrorMessage(ApiErrorCode.AUTH_ACCOUNT_INACTIVE)).toContain('administrator');
  });

  it('should return actionable messages for user errors', () => {
    // Clock-in required errors
    expect(getErrorMessage(ApiErrorCode.SHIFT_NOT_ACTIVE)).toContain('Clock-in');
    expect(getErrorMessage(ApiErrorCode.REPORT_SHIFT_REQUIRED)).toContain('clock-in');

    // Permission errors
    expect(getErrorMessage(ApiErrorCode.SHIFT_NOT_ASSIGNED)).toContain('supervisor');

    // Network errors
    expect(getErrorMessage(ApiErrorCode.NETWORK_ERROR)).toContain('koneksi');
  });

  it('should handle empty string code', () => {
    const message = getErrorMessage('');
    expect(message).toBe('Terjadi kesalahan');
  });

  it('should handle undefined default message', () => {
    const message = getErrorMessage('UNKNOWN_CODE', undefined);
    expect(message).toBe('Terjadi kesalahan');
  });

  it('should handle empty string default message', () => {
    const message = getErrorMessage('UNKNOWN_CODE', '');
    expect(message).toBe('Terjadi kesalahan');
  });
});

describe('Error code to backend sync', () => {
  it('should match all 33 backend error codes', () => {
    // Count of error codes should match backend (33 codes including SHIFT_DURATION_TOO_SHORT)
    const errorCodeCount = Object.keys(ApiErrorCode).length;
    expect(errorCodeCount).toBe(33);
  });

  it('should have error messages for all 33 error codes', () => {
    const errorMessageCount = Object.keys(ErrorMessages).length;
    expect(errorMessageCount).toBeGreaterThanOrEqual(33);
  });

  it('should use consistent error code format', () => {
    // All codes should follow CATEGORY_SPECIFIC_DESCRIPTION pattern or be single word (FORBIDDEN)
    Object.values(ApiErrorCode).forEach(code => {
      expect(code).toMatch(/^[A-Z]+(_[A-Z_]+)?$/);
    });
  });

  it('should have unique error codes', () => {
    const codes = Object.values(ApiErrorCode);
    const uniqueCodes = Array.from(new Set(codes));
    expect(codes).toEqual(uniqueCodes);
  });
});
