/**
 * Load Current Shift Utility Tests
 * Tests for loadAndSyncCurrentShift function
 */

import { loadAndSyncCurrentShift } from '../loadCurrentShift';
import * as shiftsApi from '../../api/shiftsApi';
import { setCurrentShift } from '../../../store/slices/shiftSlice';
import type { AppDispatch } from '../../../store/store';

// Mock the APIs
jest.mock('../../api/shiftsApi');

// Mock console.warn to avoid cluttering test output
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('loadAndSyncCurrentShift', () => {
  let mockDispatch: jest.MockedFunction<AppDispatch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch = jest.fn();
  });

  describe('successful shift loading', () => {
    it('should fetch current shift and dispatch setCurrentShift with data', async () => {
      const mockShift = {
        id: 1,
        area_id: 1,
        worker_id: 1,
        clock_in_time: '2026-01-20T08:00:00Z',
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

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should call getCurrentShift API
      expect(shiftsApi.getCurrentShift).toHaveBeenCalledTimes(1);

      // Should dispatch setCurrentShift with the shift data
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(setCurrentShift(mockShift));
    });

    it('should handle response with null data by dispatching null', async () => {
      const mockResponse = {
        data: null,
        error: null,
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should call getCurrentShift API
      expect(shiftsApi.getCurrentShift).toHaveBeenCalledTimes(1);

      // Should dispatch setCurrentShift with null
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(setCurrentShift(null));
    });

    it('should handle response with undefined data by dispatching undefined', async () => {
      const mockResponse = {
        data: undefined,
        error: null,
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should dispatch setCurrentShift with undefined (passes through response.data as-is)
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(setCurrentShift(undefined));
    });
  });

  describe('404 error handling', () => {
    it('should dispatch null when API returns 404 (no active shift)', async () => {
      const error404 = {
        response: {
          status: 404,
          data: { error: 'No active shift found' },
        },
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(error404);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should call getCurrentShift API
      expect(shiftsApi.getCurrentShift).toHaveBeenCalledTimes(1);

      // Should dispatch setCurrentShift with null (404 = no active shift is expected)
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(setCurrentShift(null));

      // Should NOT log warning for 404 (it's an expected state)
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should return early after dispatching null on 404', async () => {
      const error404 = {
        response: {
          status: 404,
        },
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(error404);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should only dispatch once (for setting null)
      expect(mockDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('other error handling', () => {
    it('should log warning for network errors', async () => {
      const networkError = new Error('Network error');

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(networkError);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should call getCurrentShift API
      expect(shiftsApi.getCurrentShift).toHaveBeenCalledTimes(1);

      // Should NOT dispatch (graceful failure)
      expect(mockDispatch).not.toHaveBeenCalled();

      // Should log warning with error message
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load current shift:',
        'Network error'
      );
    });

    it('should log warning for 500 errors', async () => {
      const error500 = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(error500);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should NOT dispatch
      expect(mockDispatch).not.toHaveBeenCalled();

      // Should log warning
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load current shift:',
        expect.anything()
      );
    });

    it('should log warning for 401 unauthorized errors', async () => {
      const error401 = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(error401);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should NOT dispatch
      expect(mockDispatch).not.toHaveBeenCalled();

      // Should log warning
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load current shift:',
        expect.anything()
      );
    });

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TIMEOUT_ERROR';

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(timeoutError);

      await loadAndSyncCurrentShift(mockDispatch);

      // Should NOT dispatch
      expect(mockDispatch).not.toHaveBeenCalled();

      // Should log warning with error message
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to load current shift:',
        'Request timeout'
      );
    });

    it('should not crash the app on any error', async () => {
      const unknownError = { message: 'Unknown error', weird: 'property' };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(unknownError);

      // Should not throw
      await expect(
        loadAndSyncCurrentShift(mockDispatch)
      ).resolves.toBeUndefined();

      // Should log warning
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle API returning response without error property', async () => {
      const mockResponse = {
        data: {
          id: 1,
          area_id: 1,
          worker_id: 1,
          clock_in_time: '2026-01-20T08:00:00Z',
        },
        // No error property
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      await loadAndSyncCurrentShift(mockDispatch);

      expect(mockDispatch).toHaveBeenCalledWith(
        setCurrentShift(mockResponse.data)
      );
    });

    it('should handle shift with all optional fields populated', async () => {
      const fullShift = {
        id: 1,
        area_id: 1,
        worker_id: 1,
        clock_in_time: '2026-01-20T08:00:00Z',
        clock_out_time: '2026-01-20T16:00:00Z',
        clock_in_gps_lat: -7.250445,
        clock_in_gps_lng: 112.768845,
        clock_out_gps_lat: -7.250446,
        clock_out_gps_lng: 112.768846,
        clock_in_selfie_url: 'https://example.com/selfie.jpg',
        total_hours: 8.0,
        area: {
          id: 1,
          name: 'Park A',
          type: 'Park',
        },
      };

      const mockResponse = {
        data: fullShift,
        error: null,
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      await loadAndSyncCurrentShift(mockDispatch);

      expect(mockDispatch).toHaveBeenCalledWith(setCurrentShift(fullShift));
    });

    it('should work with valid dispatch function', async () => {
      const mockResponse = {
        data: { id: 1, worker_id: 1, clock_in_time: '2026-01-20T08:00:00Z' },
        error: null,
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      // Create a real-looking dispatch function
      const realDispatch = jest.fn((action) => action);

      await loadAndSyncCurrentShift(realDispatch);

      expect(realDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('promise resolution', () => {
    it('should resolve promise on success', async () => {
      const mockResponse = {
        data: { id: 1, clock_in_time: '2026-01-20T08:00:00Z' },
        error: null,
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      const result = await loadAndSyncCurrentShift(mockDispatch);

      // Should resolve to undefined (void)
      expect(result).toBeUndefined();
    });

    it('should resolve promise on 404 error', async () => {
      const error404 = {
        response: { status: 404 },
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(error404);

      const result = await loadAndSyncCurrentShift(mockDispatch);

      // Should resolve to undefined (not throw)
      expect(result).toBeUndefined();
    });

    it('should resolve promise on other errors (not throw)', async () => {
      const error500 = {
        response: { status: 500 },
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(error500);

      const result = await loadAndSyncCurrentShift(mockDispatch);

      // Should resolve to undefined (graceful failure)
      expect(result).toBeUndefined();
    });
  });

  describe('concurrent calls', () => {
    it('should handle multiple concurrent calls', async () => {
      const mockResponse = {
        data: { id: 1, clock_in_time: '2026-01-20T08:00:00Z' },
        error: null,
      };

      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue(mockResponse);

      // Call multiple times concurrently
      await Promise.all([
        loadAndSyncCurrentShift(mockDispatch),
        loadAndSyncCurrentShift(mockDispatch),
        loadAndSyncCurrentShift(mockDispatch),
      ]);

      // All calls should succeed
      expect(shiftsApi.getCurrentShift).toHaveBeenCalledTimes(3);
      expect(mockDispatch).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure calls', async () => {
      // First call succeeds
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValueOnce({
        data: { id: 1 },
        error: null,
      });

      // Second call gets 404
      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValueOnce({
        response: { status: 404 },
      });

      // Third call gets network error
      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await Promise.all([
        loadAndSyncCurrentShift(mockDispatch),
        loadAndSyncCurrentShift(mockDispatch),
        loadAndSyncCurrentShift(mockDispatch),
      ]);

      // First and second should dispatch (success and 404)
      // Third should not dispatch (network error)
      expect(mockDispatch).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });
});
