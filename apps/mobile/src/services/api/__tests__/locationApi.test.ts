/**
 * Location API Tests
 * Unit tests for location API service
 */

import { uploadLocationBatch, convertPingsToLocations } from '../locationApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  post: jest.fn(),
}));

describe('locationApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadLocationBatch', () => {
    it('should call post with correct endpoint and payload', async () => {
      const shiftId = 'shift-123';
      const mockLocations = [
        {
          gps_lat: -7.25,
          gps_lng: 112.75,
          accuracy_meters: 10,
          logged_at: '2026-01-19T10:00:00Z',
        },
        {
          gps_lat: -7.251,
          gps_lng: 112.751,
          accuracy_meters: 12,
          logged_at: '2026-01-19T10:05:00Z',
        },
      ];
      const mockResponse = {
        data: {
          inserted_count: 2,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await uploadLocationBatch(shiftId, mockLocations);

      expect(apiClient.post).toHaveBeenCalledWith('/location/batch', {
        shift_id: shiftId,
        locations: mockLocations,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty locations array', async () => {
      const shiftId = 'shift-123';
      const mockResponse = {
        data: {
          inserted_count: 0,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await uploadLocationBatch(shiftId, []);

      expect(apiClient.post).toHaveBeenCalledWith('/location/batch', {
        shift_id: shiftId,
        locations: [],
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return error when upload fails', async () => {
      const mockError = { error: 'Failed to upload location batch' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await uploadLocationBatch('shift-123', [
        {
          gps_lat: -7.25,
          gps_lng: 112.75,
          accuracy_meters: 10,
          logged_at: '2026-01-19T10:00:00Z',
        },
      ]);

      expect(result).toEqual(mockError);
    });

    it('should handle large batch of locations', async () => {
      const shiftId = 'shift-123';
      const mockLocations = Array.from({ length: 20 }, (_, i) => ({
        gps_lat: -7.25 + i * 0.001,
        gps_lng: 112.75 + i * 0.001,
        accuracy_meters: 10,
        logged_at: new Date(Date.now() + i * 300000).toISOString(),
      }));
      const mockResponse = {
        data: {
          inserted_count: 20,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await uploadLocationBatch(shiftId, mockLocations);

      expect(apiClient.post).toHaveBeenCalledWith('/location/batch', {
        shift_id: shiftId,
        locations: mockLocations,
      });
      expect(result.data?.inserted_count).toBe(20);
    });

    it('should handle network error', async () => {
      const mockError = { error: 'Network error. Please check your connection.' };
      (apiClient.post as jest.Mock).mockResolvedValue(mockError);

      const result = await uploadLocationBatch('shift-123', [
        {
          gps_lat: -7.25,
          gps_lng: 112.75,
          accuracy_meters: 10,
          logged_at: '2026-01-19T10:00:00Z',
        },
      ]);

      expect(result).toEqual(mockError);
    });
  });

  describe('convertPingsToLocations', () => {
    it('should convert tracker pings to location points', () => {
      const pings = [
        {
          latitude: -7.25,
          longitude: 112.75,
          accuracy: 10,
          timestamp: '2026-01-19T10:00:00Z',
          shift_id: 'shift-123',
        },
        {
          latitude: -7.251,
          longitude: 112.751,
          accuracy: 12,
          timestamp: '2026-01-19T10:05:00Z',
          shift_id: 'shift-123',
        },
      ];

      const result = convertPingsToLocations(pings);

      expect(result).toEqual([
        {
          gps_lat: -7.25,
          gps_lng: 112.75,
          accuracy_meters: 10,
          logged_at: '2026-01-19T10:00:00Z',
          battery_level: undefined,
          // Pings from a build predating the mock check report `false`, not
          // absent — the server must distinguish "checked, clean" from "unknown".
          is_mocked: false,
        },
        {
          gps_lat: -7.251,
          gps_lng: 112.751,
          accuracy_meters: 12,
          logged_at: '2026-01-19T10:05:00Z',
          battery_level: undefined,
          is_mocked: false,
        },
      ]);
    });

    it('should forward a mocked ping so the server can flag it', () => {
      const result = convertPingsToLocations([
        {
          latitude: -7.25,
          longitude: 112.75,
          accuracy: 10,
          timestamp: '2026-01-19T10:00:00Z',
          shift_id: 'shift-123',
          mocked: true,
        },
      ]);

      expect(result[0].is_mocked).toBe(true);
    });

    it('should handle empty array', () => {
      const result = convertPingsToLocations([]);
      expect(result).toEqual([]);
    });

    it('should handle pings without accuracy', () => {
      const pings = [
        {
          latitude: -7.25,
          longitude: 112.75,
          accuracy: 0,
          timestamp: '2026-01-19T10:00:00Z',
          shift_id: 'shift-123',
        },
      ];

      const result = convertPingsToLocations(pings);

      expect(result).toEqual([
        {
          gps_lat: -7.25,
          gps_lng: 112.75,
          accuracy_meters: 0,
          battery_level: undefined,
          is_mocked: false,
          logged_at: '2026-01-19T10:00:00Z',
        },
      ]);
    });
  });
});
