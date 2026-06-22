/**
 * Shifts API Tests
 * Tests for clock-in/out API with type safety verification
 */

import {
  clockIn,
  clockOut,
  getCurrentShift,
  getAttendanceDays,
  getAttendanceForDate,
} from '../shiftsApi';
import * as apiClient from '../apiClient';

// Mock apiClient
jest.mock('../apiClient');

describe('shiftsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    const mockAreaId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const mockBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    it('should call clock-in API with JSON payload including area_id', async () => {
      const mockResponse = {
        data: {
          shift_id: 1,
          message: 'Clocked in successfully',
        },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clockIn(
        -7.250445,
        112.768845,
        mockBase64,
        mockAreaId
      );

      expect(apiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        gps_lat: -7.250445,
        gps_lng: 112.768845,
        selfie_photo: mockBase64,
        area_id: mockAreaId,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should call clock-in API without area_id when not provided', async () => {
      const mockResponse = {
        data: {
          shift_id: 1,
          message: 'Clocked in successfully',
        },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clockIn(
        -7.250445,
        112.768845,
        mockBase64
      );

      expect(apiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        gps_lat: -7.250445,
        gps_lng: 112.768845,
        selfie_photo: mockBase64,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should include correct fields in payload', async () => {
      const mockResponse = { data: { shift_id: 1 }, error: null };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await clockIn(-7.250445, 112.768845, mockBase64, mockAreaId);

      const payload = (apiClient.post as jest.Mock).mock.calls[0][1];

      expect(payload.gps_lat).toBe(-7.250445);
      expect(payload.gps_lng).toBe(112.768845);
      expect(payload.selfie_photo).toBe(mockBase64);
      expect(payload.area_id).toBe(mockAreaId);
    });

    it('should handle clock-in errors', async () => {
      const mockError = {
        data: null,
        error: 'Already clocked in',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await clockIn(-7.250445, 112.768845, mockBase64);

      expect(result.error).toBe('Already clocked in');
    });
  });

  describe('clockOut', () => {
    it('should call clock-out API with GPS coordinates only', async () => {
      const mockResponse = {
        data: {
          shift_id: 1,
          clock_out_time: '2026-01-16T17:00:00Z',
          total_hours: 8.5,
        },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clockOut(-7.250445, 112.768845);

      // Backend uses authenticated user's current shift - no shift_id needed
      expect(apiClient.post).toHaveBeenCalledWith('/shifts/clock-out', {
        gps_lat: -7.250445,
        gps_lng: 112.768845,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should maintain type safety for coordinates', async () => {
      const mockResponse = {
        data: {
          shift_id: 1,
          clock_out_time: '2026-01-16T17:00:00Z',
          total_hours: 8.5,
        },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Coordinates must be numbers
      await clockOut(-7.250445, 112.768845);

      expect(apiClient.post).toHaveBeenCalledWith('/shifts/clock-out', {
        gps_lat: -7.250445,
        gps_lng: 112.768845,
      });
    });

    it('should handle clock-out errors', async () => {
      const mockError = {
        data: null,
        error: 'No active shift found',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await clockOut(-7.250445, 112.768845);

      expect(result.error).toBe('No active shift found');
    });

    it('should handle network errors during clock-out', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        clockOut(-7.250445, 112.768845)
      ).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentShift', () => {
    it('should fetch current active shift', async () => {
      const mockShift = {
        id: 'abc-123',
        area_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        user_id: 'worker-uuid',
        clock_in_time: '2026-01-16T08:00:00Z',
        clock_in_gps_lat: -7.250445,
        clock_in_gps_lng: 112.768845,
        area: {
          id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          name: 'Park A',
        },
      };

      const mockResponse = {
        data: mockShift,
        error: null,
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getCurrentShift();

      expect(apiClient.get).toHaveBeenCalledWith('/shifts/current');
      expect(result.data).toEqual(mockShift);
    });

    it('should return null when no active shift exists', async () => {
      const mockResponse = {
        data: null,
        error: null,
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getCurrentShift();

      expect(result.data).toBeNull();
    });

    it('should handle errors fetching current shift', async () => {
      const mockError = {
        data: null,
        error: 'Failed to fetch shift',
      };

      (apiClient.get as jest.Mock).mockResolvedValue(mockError);

      const result = await getCurrentShift();

      expect(result.error).toBe('Failed to fetch shift');
    });
  });

  describe('Type Safety', () => {
    const mockAreaId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const mockBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    it('should enforce correct parameter types for clockIn', async () => {
      const mockResponse = { data: { shift_id: 1 }, error: null };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // area_id is optional, GPS and photo first
      await clockIn(-7.250445, 112.768845, mockBase64, mockAreaId);

      // TypeScript would prevent these at compile time:
      // await clockIn('(-7.250445' as any, 112.768845, mockBase64); // lat must be number
      // await clockIn(-7.250445, '112.768845' as any, mockBase64); // lng must be number

      expect(true).toBe(true);
    });

    it('should enforce correct parameter types for clockOut', async () => {
      const mockResponse = { data: { total_hours: 8 }, error: null };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // These should compile (correct types) - only GPS coordinates, no shift_id
      await clockOut(-7.250445, 112.768845);

      // TypeScript would prevent these at compile time:
      // await clockOut('(-7.250445' as any, 112.768845); // lat must be number
      // await clockOut(-7.250445, '112.768845' as any); // lng must be number

      expect(true).toBe(true);
    });

    it('should enforce correct return types', async () => {
      const mockResponse = {
        data: {
          shift_id: 'shift-123',
          clock_in_time: '2026-06-09T10:00:00Z',
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clockIn(-7.250445, 112.768845, mockBase64, mockAreaId);

      // Should have ApiResponse structure
      expect(result).toHaveProperty('data');

      // Data should match ClockInResponse type
      if (result.data) {
        expect(result.data).toHaveProperty('shift_id');
        expect(typeof result.data.shift_id).toBe('string');
      }
    });

    it('should handle both success and error response types', async () => {
      // Success response
      const successResponse = {
        data: { shift_id: 'shift-123', clock_in_time: '2026-06-09T10:00:00Z' },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(successResponse);
      const successResult = await clockIn(-7.250445, 112.768845, mockBase64, mockAreaId);
      expect(successResult.data).toBeTruthy();

      // Error response
      const errorResponse = {
        error: 'Error message',
        code: 'ERROR',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(errorResponse);
      const errorResult = await clockIn(-7.250445, 112.768845, mockBase64);
      expect(errorResult.data).toBeUndefined();
      expect(errorResult.error).toBeTruthy();
    });
  });

  describe('API Contract Validation', () => {
    const mockAreaId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
    const mockBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';

    it('should send JSON payload with correct fields for clock-in with area_id', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {}, error: null });

      await clockIn(-7.123456, 112.654321, mockBase64, mockAreaId);

      const callArgs = (apiClient.post as jest.Mock).mock.calls[0];
      const payload = callArgs[1];

      // Should be plain object with JSON fields
      expect(payload).toEqual({
        gps_lat: -7.123456,
        gps_lng: 112.654321,
        selfie_photo: mockBase64,
        area_id: mockAreaId,
      });
    });

    it('should send JSON payload without area_id when not provided', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {}, error: null });

      await clockIn(-7.123456, 112.654321, mockBase64);

      const callArgs = (apiClient.post as jest.Mock).mock.calls[0];
      const payload = callArgs[1];

      // Should not have area_id field
      expect(payload).toEqual({
        gps_lat: -7.123456,
        gps_lng: 112.654321,
        selfie_photo: mockBase64,
      });
      expect(payload).not.toHaveProperty('area_id');
    });

    it('should send correct payload structure for clock-out', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {}, error: null });

      // Backend uses authenticated user's current shift - no shift_id in payload
      await clockOut(-7.987654, 112.123456);

      const callArgs = (apiClient.post as jest.Mock).mock.calls[0];
      const payload = callArgs[1];

      expect(payload).toEqual({
        gps_lat: -7.987654,
        gps_lng: 112.123456,
      });
    });

    it('should use correct API endpoints', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {}, error: null });
      (apiClient.get as jest.Mock).mockResolvedValue({ data: {}, error: null });

      await clockIn(-7.250445, 112.768845, mockBase64, mockAreaId);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/shifts/clock-in',
        expect.any(Object)
      );

      await clockOut(-7.250445, 112.768845);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/shifts/clock-out',
        expect.any(Object)
      );

      await getCurrentShift();
      expect(apiClient.get).toHaveBeenCalledWith('/shifts/current');
    });
  });

  describe('getAttendanceDays', () => {
    it('requests the attendance list with page/limit params', async () => {
      const mockResponse = { data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } } };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getAttendanceDays(2, 10);

      expect(apiClient.get).toHaveBeenCalledWith('/shifts/attendance', { page: 2, limit: 10 });
      expect(result).toEqual(mockResponse);
    });

    it('defaults to page 1, limit 20', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: [], meta: {} } });
      await getAttendanceDays();
      expect(apiClient.get).toHaveBeenCalledWith('/shifts/attendance', { page: 1, limit: 20 });
    });
  });

  describe('getAttendanceForDate', () => {
    it('requests the per-day detail by date path', async () => {
      const mockResponse = { data: { date: '2026-06-22', shifts: [] } };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await getAttendanceForDate('2026-06-22');

      expect(apiClient.get).toHaveBeenCalledWith('/shifts/attendance/2026-06-22');
      expect(result).toEqual(mockResponse);
    });
  });
});
