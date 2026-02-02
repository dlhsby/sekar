/**
 * Shifts API Error Handling Tests
 * Tests for network errors, validation errors, and edge cases
 */

import * as shiftsApi from '../shiftsApi';
import * as apiClient from '../apiClient';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock API client
jest.mock('../apiClient');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('shiftsApi - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clockIn - Error Cases', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockApiClient.post.mockRejectedValue(networkError);

      await expect(
        shiftsApi.clockIn('area-id-123', 10.5, 20.3, 'data:image/jpeg;base64,abc123')
      ).rejects.toThrow('Network Error');
    });

    it('should handle validation errors', async () => {
      const validationError = {
        success: false,
        error: {
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Invalid GPS coordinates',
        },
      };
      mockApiClient.post.mockResolvedValue(validationError);

      const result = await shiftsApi.clockIn('area-id-123', 200, 300, 'data:image/jpeg;base64,abc123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should handle shift already active error', async () => {
      const shiftActiveError = {
        success: false,
        error: {
          status: 400,
          code: 'SHIFT_ALREADY_ACTIVE',
          message: 'Already clocked in',
        },
      };
      mockApiClient.post.mockResolvedValue(shiftActiveError);

      const result = await shiftsApi.clockIn('area-id-123', 10.5, 20.3, 'data:image/jpeg;base64,abc123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SHIFT_ALREADY_ACTIVE');
    });

    it('should handle unauthorized error', async () => {
      const unauthorizedError = {
        success: false,
        error: {
          status: 401,
          code: 'AUTH_UNAUTHORIZED',
          message: 'Unauthorized',
        },
      };
      mockApiClient.post.mockResolvedValue(unauthorizedError);

      const result = await shiftsApi.clockIn('area-id-123', 10.5, 20.3, 'data:image/jpeg;base64,abc123');

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(401);
    });

    it('should handle empty area ID', async () => {
      mockApiClient.post.mockResolvedValue({ success: true, data: { id: '123' } });

      const result = await shiftsApi.clockIn('', 10.5, 20.3, 'data:image/jpeg;base64,abc123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        area_id: '',
        gps_lat: 10.5,
        gps_lng: 20.3,
        selfie_photo: 'data:image/jpeg;base64,abc123',
      });
    });
  });

  describe('clockOut - Error Cases', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockApiClient.post.mockRejectedValue(networkError);

      await expect(shiftsApi.clockOut(10.5, 20.3)).rejects.toThrow('Network timeout');
    });

    it('should handle no active shift error', async () => {
      const noShiftError = {
        success: false,
        error: {
          status: 400,
          code: 'SHIFT_NOT_FOUND',
          message: 'No active shift',
        },
      };
      mockApiClient.post.mockResolvedValue(noShiftError);

      const result = await shiftsApi.clockOut(10.5, 20.3);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SHIFT_NOT_FOUND');
    });

    it('should handle GPS validation error', async () => {
      const gpsError = {
        success: false,
        error: {
          status: 400,
          code: 'GPS_OUT_OF_RANGE',
          message: 'GPS coordinates out of range',
        },
      };
      mockApiClient.post.mockResolvedValue(gpsError);

      const result = await shiftsApi.clockOut(-200, 400);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('GPS_OUT_OF_RANGE');
    });

    it('should handle minimum duration error', async () => {
      const durationError = {
        success: false,
        error: {
          status: 400,
          code: 'SHIFT_DURATION_TOO_SHORT',
          message: 'Shift duration too short',
        },
      };
      mockApiClient.post.mockResolvedValue(durationError);

      const result = await shiftsApi.clockOut(10.5, 20.3);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SHIFT_DURATION_TOO_SHORT');
    });
  });

  describe('getCurrentShift - Error Cases', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Connection refused');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(shiftsApi.getCurrentShift()).rejects.toThrow('Connection refused');
    });

    it('should handle no active shift (null response)', async () => {
      mockApiClient.get.mockResolvedValue({ success: true, data: null });

      const result = await shiftsApi.getCurrentShift();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle unauthorized access', async () => {
      const unauthorizedError = {
        success: false,
        error: {
          status: 401,
          code: 'AUTH_UNAUTHORIZED',
          message: 'Token expired',
        },
      };
      mockApiClient.get.mockResolvedValue(unauthorizedError);

      const result = await shiftsApi.getCurrentShift();

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(401);
    });

    it('should handle server errors', async () => {
      const serverError = {
        success: false,
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        },
      };
      mockApiClient.get.mockResolvedValue(serverError);

      const result = await shiftsApi.getCurrentShift();

      expect(result.success).toBe(false);
      expect(result.error?.status).toBe(500);
    });
  });

  describe('getMyShifts - Error Cases', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Request timeout');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(shiftsApi.getMyShifts()).rejects.toThrow('Request timeout');
    });

    it('should handle empty shift history', async () => {
      mockApiClient.get.mockResolvedValue({ success: true, data: [] });

      const result = await shiftsApi.getMyShifts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle unauthorized access', async () => {
      const unauthorizedError = {
        success: false,
        error: {
          status: 401,
          code: 'AUTH_UNAUTHORIZED',
          message: 'Invalid token',
        },
      };
      mockApiClient.get.mockResolvedValue(unauthorizedError);

      const result = await shiftsApi.getMyShifts();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should handle malformed response data', async () => {
      mockApiClient.get.mockResolvedValue({ success: true, data: null });

      const result = await shiftsApi.getMyShifts();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = {
        success: false,
        error: {
          status: 500,
          code: 'DATABASE_ERROR',
          message: 'Query failed',
        },
      };
      mockApiClient.get.mockResolvedValue(dbError);

      const result = await shiftsApi.getMyShifts();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme GPS coordinates', async () => {
      mockApiClient.post.mockResolvedValue({ success: true, data: { id: '123' } });

      await shiftsApi.clockIn('area-id', -90, -180, 'data:image/jpeg;base64,abc');

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        area_id: 'area-id',
        gps_lat: -90,
        gps_lng: -180,
        selfie_photo: 'data:image/jpeg;base64,abc',
      });
    });

    it('should handle very long base64 selfie data', async () => {
      const longBase64 = 'data:image/jpeg;base64,' + 'a'.repeat(10000);
      mockApiClient.post.mockResolvedValue({ success: true, data: { id: '123' } });

      await shiftsApi.clockIn('area-id', 10.5, 20.3, longBase64);

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        area_id: 'area-id',
        gps_lat: 10.5,
        gps_lng: 20.3,
        selfie_photo: longBase64,
      });
    });

    it('should handle concurrent clock-in attempts', async () => {
      mockApiClient.post.mockResolvedValue({ success: true, data: { id: '123' } });

      const promise1 = shiftsApi.clockIn('area1', 10, 20, 'photo1');
      const promise2 = shiftsApi.clockIn('area2', 11, 21, 'photo2');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });
});
