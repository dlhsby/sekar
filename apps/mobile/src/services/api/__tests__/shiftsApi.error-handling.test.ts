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
        shiftsApi.clockIn(10.5, 20.3, 'data:image/jpeg;base64,abc123', 'area-id-123')
      ).rejects.toThrow('Network Error');
    });

    it('should handle validation errors', async () => {
      const validationError = {
        error: 'Invalid GPS coordinates',
        code: 'VALIDATION_ERROR',
        message: 'Invalid GPS coordinates',
      };
      mockApiClient.post.mockResolvedValue(validationError);

      const result = await shiftsApi.clockIn(200, 300, 'data:image/jpeg;base64,abc123');

      expect(result.error).toBe('Invalid GPS coordinates');
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should handle shift already active error', async () => {
      const shiftActiveError = {
        error: 'Already clocked in',
        code: 'SHIFT_ALREADY_ACTIVE',
        message: 'Already clocked in',
      };
      mockApiClient.post.mockResolvedValue(shiftActiveError);

      const result = await shiftsApi.clockIn(10.5, 20.3, 'data:image/jpeg;base64,abc123');

      expect(result.error).toBe('Already clocked in');
      expect(result.code).toBe('SHIFT_ALREADY_ACTIVE');
    });

    it('should handle unauthorized error', async () => {
      const unauthorizedError = {
        error: 'Unauthorized',
        code: 'AUTH_UNAUTHORIZED',
        message: 'Unauthorized',
      };
      mockApiClient.post.mockResolvedValue(unauthorizedError);

      const result = await shiftsApi.clockIn(10.5, 20.3, 'data:image/jpeg;base64,abc123', 'area-id-123');

      expect(result.error).toBe('Unauthorized');
      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should handle optional area ID', async () => {
      mockApiClient.post.mockResolvedValue({ data: { shift_id: '123', clock_in_time: '2026-06-09T10:00:00Z' } });

      const result = await shiftsApi.clockIn(10.5, 20.3, 'data:image/jpeg;base64,abc123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        gps_lat: 10.5,
        gps_lng: 20.3,
        selfie_photo: 'data:image/jpeg;base64,abc123',
      });
    });

    it('should include area ID when provided', async () => {
      mockApiClient.post.mockResolvedValue({ data: { shift_id: '123', clock_in_time: '2026-06-09T10:00:00Z' } });

      const result = await shiftsApi.clockIn(10.5, 20.3, 'data:image/jpeg;base64,abc123', 'area-456');

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        gps_lat: 10.5,
        gps_lng: 20.3,
        selfie_photo: 'data:image/jpeg;base64,abc123',
        location_id: 'area-456',
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
        error: 'No active shift',
        code: 'SHIFT_NOT_FOUND',
        message: 'No active shift',
      };
      mockApiClient.post.mockResolvedValue(noShiftError);

      const result = await shiftsApi.clockOut(10.5, 20.3);

      expect(result.error).toBe('No active shift');
      expect(result.code).toBe('SHIFT_NOT_FOUND');
    });

    it('should handle GPS validation error', async () => {
      const gpsError = {
        error: 'GPS coordinates out of range',
        code: 'GPS_OUT_OF_RANGE',
        message: 'GPS coordinates out of range',
      };
      mockApiClient.post.mockResolvedValue(gpsError);

      const result = await shiftsApi.clockOut(-200, 400);

      expect(result.error).toBe('GPS coordinates out of range');
      expect(result.code).toBe('GPS_OUT_OF_RANGE');
    });

    it('should handle minimum duration error', async () => {
      const durationError = {
        error: 'Shift duration too short',
        code: 'SHIFT_DURATION_TOO_SHORT',
        message: 'Shift duration too short',
      };
      mockApiClient.post.mockResolvedValue(durationError);

      const result = await shiftsApi.clockOut(10.5, 20.3);

      expect(result.error).toBe('Shift duration too short');
      expect(result.code).toBe('SHIFT_DURATION_TOO_SHORT');
    });
  });

  describe('getCurrentShift - Error Cases', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Connection refused');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(shiftsApi.getCurrentShift()).rejects.toThrow('Connection refused');
    });

    it('should handle no active shift (null response)', async () => {
      mockApiClient.get.mockResolvedValue({ data: null });

      const result = await shiftsApi.getCurrentShift();

      expect(result.data).toBeNull();
    });

    it('should handle unauthorized access', async () => {
      const unauthorizedError = {
        error: 'Token expired',
        code: 'AUTH_UNAUTHORIZED',
        message: 'Token expired',
      };
      mockApiClient.get.mockResolvedValue(unauthorizedError);

      const result = await shiftsApi.getCurrentShift();

      expect(result.error).toBe('Token expired');
      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should handle server errors', async () => {
      const serverError = {
        error: 'Database connection failed',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection failed',
      };
      mockApiClient.get.mockResolvedValue(serverError);

      const result = await shiftsApi.getCurrentShift();

      expect(result.error).toBe('Database connection failed');
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('getMyShifts - Error Cases', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Request timeout');
      mockApiClient.get.mockRejectedValue(networkError);

      await expect(shiftsApi.getMyShifts()).rejects.toThrow('Request timeout');
    });

    it('should handle empty shift history', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      const result = await shiftsApi.getMyShifts();

      expect(result.data).toEqual([]);
    });

    it('should handle unauthorized access', async () => {
      const unauthorizedError = {
        error: 'Invalid token',
        code: 'AUTH_UNAUTHORIZED',
        message: 'Invalid token',
      };
      mockApiClient.get.mockResolvedValue(unauthorizedError);

      const result = await shiftsApi.getMyShifts();

      expect(result.error).toBe('Invalid token');
      expect(result.code).toBe('AUTH_UNAUTHORIZED');
    });

    it('should handle malformed response data', async () => {
      mockApiClient.get.mockResolvedValue({ data: null });

      const result = await shiftsApi.getMyShifts();

      expect(result.data).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = {
        error: 'Query failed',
        code: 'DATABASE_ERROR',
        message: 'Query failed',
      };
      mockApiClient.get.mockResolvedValue(dbError);

      const result = await shiftsApi.getMyShifts();

      expect(result.error).toBe('Query failed');
      expect(result.code).toBe('DATABASE_ERROR');
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme GPS coordinates', async () => {
      mockApiClient.post.mockResolvedValue({ data: { shift_id: '123', clock_in_time: '2026-06-09T10:00:00Z' } });

      await shiftsApi.clockIn(-90, -180, 'data:image/jpeg;base64,abc', 'area-id');

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        gps_lat: -90,
        gps_lng: -180,
        selfie_photo: 'data:image/jpeg;base64,abc',
        location_id: 'area-id',
      });
    });

    it('should handle very long base64 selfie data', async () => {
      const longBase64 = 'data:image/jpeg;base64,' + 'a'.repeat(10000);
      mockApiClient.post.mockResolvedValue({ data: { shift_id: '123', clock_in_time: '2026-06-09T10:00:00Z' } });

      await shiftsApi.clockIn(10.5, 20.3, longBase64, 'area-id');

      expect(mockApiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        gps_lat: 10.5,
        gps_lng: 20.3,
        selfie_photo: longBase64,
        location_id: 'area-id',
      });
    });

    it('should handle concurrent clock-in attempts', async () => {
      mockApiClient.post.mockResolvedValue({ data: { shift_id: '123', clock_in_time: '2026-06-09T10:00:00Z' } });

      const promise1 = shiftsApi.clockIn(10, 20, 'photo1', 'area1');
      const promise2 = shiftsApi.clockIn(11, 21, 'photo2', 'area2');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.data).toBeTruthy();
      expect(result2.data).toBeTruthy();
      expect(mockApiClient.post).toHaveBeenCalledTimes(2);
    });
  });
});
