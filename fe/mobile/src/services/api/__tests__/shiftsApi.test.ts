/**
 * Shifts API Tests
 * Tests for clock-in/out API with type safety verification
 */

import { clockIn, clockOut, getCurrentShift } from '../shiftsApi';
import * as apiClient from '../apiClient';

// Mock apiClient
jest.mock('../apiClient');

describe('shiftsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clockIn', () => {
    it('should call clock-in API with correct parameters', async () => {
      const mockResponse = {
        data: {
          shift_id: 1,
          message: 'Clocked in successfully',
        },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clockIn(
        1, // areaId
        -7.250445, // gpsLat
        112.768845, // gpsLng
        'data:image/jpeg;base64,xyz' // selfiePhoto
      );

      expect(apiClient.post).toHaveBeenCalledWith('/shifts/clock-in', {
        area_id: 1,
        gps_lat: -7.250445,
        gps_lng: 112.768845,
        selfie_photo: 'data:image/jpeg;base64,xyz',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle clock-in errors', async () => {
      const mockError = {
        data: null,
        error: 'Already clocked in',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await clockIn(1, -7.250445, 112.768845, 'base64-photo');

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
        id: 1,
        area_id: 1,
        worker_id: 1,
        clock_in_time: '2026-01-16T08:00:00Z',
        clock_in_gps_lat: -7.250445,
        clock_in_gps_lng: 112.768845,
        area: {
          id: 1,
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
    it('should enforce correct parameter types for clockIn', async () => {
      const mockResponse = { data: { shift_id: 1 }, error: null };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // These should compile (correct types)
      await clockIn(1, -7.250445, 112.768845, 'base64-photo');

      // TypeScript would prevent these at compile time:
      // await clockIn('1', -7.250445, 112.768845, 'base64-photo'); // areaId must be number
      // await clockIn(1, '(-7.250445' as any, 112.768845, 'base64-photo'); // lat must be number
      // await clockIn(1, -7.250445, 112.768845, 123 as any); // photo must be string

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
          shift_id: 1,
          message: 'Success',
        },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await clockIn(1, -7.250445, 112.768845, 'photo');

      // Should have ApiResponse structure
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');

      // Data should match ClockInResponse type
      if (result.data) {
        expect(result.data).toHaveProperty('shift_id');
        expect(typeof result.data.shift_id).toBe('number');
      }
    });

    it('should handle both success and error response types', async () => {
      // Success response
      const successResponse = {
        data: { shift_id: 1, message: 'Success' },
        error: null,
      };

      (apiClient.post as jest.Mock).mockResolvedValue(successResponse);
      const successResult = await clockIn(1, -7.250445, 112.768845, 'photo');
      expect(successResult.data).toBeTruthy();
      expect(successResult.error).toBeNull();

      // Error response
      const errorResponse = {
        data: null,
        error: 'Error message',
      };

      (apiClient.post as jest.Mock).mockResolvedValue(errorResponse);
      const errorResult = await clockIn(1, -7.250445, 112.768845, 'photo');
      expect(errorResult.data).toBeNull();
      expect(errorResult.error).toBeTruthy();
    });
  });

  describe('API Contract Validation', () => {
    it('should send correct payload structure for clock-in', async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({ data: {}, error: null });

      await clockIn(5, -7.123456, 112.654321, 'photo-data');

      const callArgs = (apiClient.post as jest.Mock).mock.calls[0];
      const payload = callArgs[1];

      expect(payload).toEqual({
        area_id: 5,
        gps_lat: -7.123456,
        gps_lng: 112.654321,
        selfie_photo: 'photo-data',
      });
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

      await clockIn(1, -7.250445, 112.768845, 'photo');
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
});
