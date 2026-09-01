/**
 * Service Capacity API Tests
 * API client for district capacity calendars
 * Phase 3 sub-phase 3-10
 */

import * as serviceCapacityApi from '../serviceCapacityApi';
import * as apiClient from '../apiClient';

jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const mockCapacityRow = {
  year: 2026,
  week: 18,
  capacity_units: 10,
  booked_units: 5,
};

describe('serviceCapacityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCapacityCalendar', () => {
    it('returns capacity calendar data on success', async () => {
      const mockResponse = {
        data: [mockCapacityRow],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {
        year: 2026,
        fromWeek: 18,
        toWeek: 18,
        serviceType: 'pruning',
      });

      expect(result).toEqual(mockResponse);
      expect(result.data).toEqual([mockCapacityRow]);
    });

    it('calls API with correct district ID', async () => {
      mockGet.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        year: 2026,
        fromWeek: 18,
        toWeek: 18,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        {
          year: 2026,
          fromWeek: 18,
          toWeek: 18,
        },
      );
    });

    it('includes all query parameters', async () => {
      mockGet.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        year: 2026,
        fromWeek: 18,
        toWeek: 20,
        serviceType: 'pruning',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        expect.objectContaining({
          year: 2026,
          fromWeek: 18,
          toWeek: 20,
          serviceType: 'pruning',
        }),
      );
    });

    it('handles optional parameters', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        expect.any(Object),
      );
    });

    it('returns error object on API error', async () => {
      const mockErrorResponse = {
        error: 'API Error',
        code: 'ERR_API',
        data: null,
      };

      mockGet.mockResolvedValue(mockErrorResponse);

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.error).toBe('API Error');
      expect(result.code).toBe('ERR_API');
    });

    it('returns empty array when data is null', async () => {
      mockGet.mockResolvedValue({
        data: null,
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.data).toBeNull();
    });

    it('handles network error', async () => {
      mockGet.mockResolvedValue({
        error: 'Network error',
        code: 'NETWORK_ERROR',
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.error).toBeDefined();
    });

    it('handles timeout error', async () => {
      mockGet.mockResolvedValue({
        error: 'Timeout',
        code: 'ECONNABORTED',
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.error).toBeDefined();
      expect(result.code).toBe('ECONNABORTED');
    });

    it('returns multiple weeks of data', async () => {
      const multiWeekData = [
        mockCapacityRow,
        { ...mockCapacityRow, week: 19 },
        { ...mockCapacityRow, week: 20 },
      ];

      mockGet.mockResolvedValue({
        data: multiWeekData,
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {
        fromWeek: 18,
        toWeek: 20,
      });

      expect(result.data).toEqual(multiWeekData);
      expect(result.data?.length).toBe(3);
    });

    it('correctly formats query parameters as URL params', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        year: 2026,
        fromWeek: 18,
        toWeek: 20,
        serviceType: 'pruning',
      });

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs[0]).toBe('/districts/r1/capacity');
      expect(callArgs[1]).toEqual({
        year: 2026,
        fromWeek: 18,
        toWeek: 20,
        serviceType: 'pruning',
      });
    });

    it('supports different districts', async () => {
      mockGet.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await serviceCapacityApi.getCapacityCalendar('r2', {});

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r2/capacity',
        expect.any(Object),
      );
    });

    it('handles capacity fields correctly', async () => {
      const customCapacity = {
        year: 2026,
        week: 18,
        capacity_units: 100,
        booked_units: 75,
      };

      mockGet.mockResolvedValue({
        data: [customCapacity],
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.data?.[0].capacity_units).toBe(100);
      expect(result.data?.[0].booked_units).toBe(75);
    });

    it('preserves response structure', async () => {
      const mockResponse = {
        data: [mockCapacityRow],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Service Type Parameter', () => {
    it('passes pruning as serviceType', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        serviceType: 'pruning',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        expect.objectContaining({
          serviceType: 'pruning',
        }),
      );
    });

    it('passes other as serviceType', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        serviceType: 'other',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        expect.objectContaining({
          serviceType: 'other',
        }),
      );
    });

    it('omits serviceType when not provided', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        year: 2026,
      });

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing mock call args
      const params = (callArgs as any)?.[1];
      expect(params.serviceType).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('returns error with code when available', async () => {
      mockGet.mockResolvedValue({
        error: 'Custom error',
        code: 'ERR_CUSTOM',
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.error).toBeDefined();
    });

    it('handles unknown error types', async () => {
      mockGet.mockResolvedValue({
        error: 'Unknown error',
        code: 'UNKNOWN_ERROR',
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.error).toBeDefined();
    });

    it('returns error with message from Error object', async () => {
      mockGet.mockResolvedValue({
        error: 'Specific error message',
        code: 'UNKNOWN_ERROR',
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result.error).toContain('Specific error message');
    });
  });

  describe('Return Type Validation', () => {
    it('returns ApiResponse<CapacityRow[]>', async () => {
      mockGet.mockResolvedValue({
        data: [mockCapacityRow],
      });

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result).toHaveProperty('data');
    });

    it('returns error property in response', async () => {
      const errorResponse = {
        error: 'Not found',
        code: 'ERR_NOT_FOUND',
        data: null,
      };

      mockGet.mockResolvedValue(errorResponse);

      const result = await serviceCapacityApi.getCapacityCalendar('r1', {});

      expect(result).toHaveProperty('error');
    });
  });

  describe('Year and Week Parameters', () => {
    it('passes year parameter', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        year: 2027,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        expect.objectContaining({ year: 2027 }),
      );
    });

    it('passes fromWeek and toWeek parameters', async () => {
      mockGet.mockResolvedValue({
        data: [],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        fromWeek: 10,
        toWeek: 15,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/districts/r1/capacity',
        expect.objectContaining({
          fromWeek: 10,
          toWeek: 15,
        }),
      );
    });

    it('handles single week query', async () => {
      mockGet.mockResolvedValue({
        data: [mockCapacityRow],
      });

      await serviceCapacityApi.getCapacityCalendar('r1', {
        fromWeek: 18,
        toWeek: 18,
      });

      const callArgs = mockGet.mock.calls[0];
      expect(callArgs).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing mock call args
      const params = (callArgs as any)?.[1];
      expect(params.fromWeek).toBe(18);
      expect(params.toWeek).toBe(18);
    });
  });
});
