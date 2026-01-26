/**
 * Shift Definitions API Service Tests
 */

import * as shiftDefinitionsApi from '../shiftDefinitionsApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('shiftDefinitionsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getShiftDefinitions', () => {
    it('gets all shift definitions', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: '1',
              name: 'Shift 1',
              code: 'SHIFT1',
              start_time: '06:00',
              end_time: '15:00',
              crosses_midnight: false,
              is_active: true,
            },
            {
              id: '2',
              name: 'Shift 2',
              code: 'SHIFT2',
              start_time: '15:00',
              end_time: '23:00',
              crosses_midnight: false,
              is_active: true,
            },
            {
              id: '3',
              name: 'Shift 3',
              code: 'SHIFT3',
              start_time: '21:00',
              end_time: '05:00',
              crosses_midnight: true,
              is_active: true,
            },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await shiftDefinitionsApi.getShiftDefinitions();

      expect(mockGet).toHaveBeenCalledWith('/shift-definitions');
      expect(result).toEqual(mockResponse);
    });

    it('returns 3 fixed shifts', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: '1', code: 'SHIFT1' },
            { id: '2', code: 'SHIFT2' },
            { id: '3', code: 'SHIFT3' },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await shiftDefinitionsApi.getShiftDefinitions();

      expect(result.data?.data).toHaveLength(3);
    });
  });

  describe('getShiftDefinitionById', () => {
    it('gets shift definition by ID', async () => {
      const shiftId = 'shift-123';
      const mockResponse = {
        data: {
          id: shiftId,
          name: 'Shift 1',
          code: 'SHIFT1',
          start_time: '06:00',
          end_time: '15:00',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await shiftDefinitionsApi.getShiftDefinitionById(shiftId);

      expect(mockGet).toHaveBeenCalledWith(`/shift-definitions/${shiftId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCurrentShiftDefinition', () => {
    it('gets current shift based on time', async () => {
      const mockResponse = {
        data: {
          id: '1',
          name: 'Shift 1',
          code: 'SHIFT1',
          start_time: '06:00',
          end_time: '15:00',
          is_current: true,
          time_remaining_minutes: 120,
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await shiftDefinitionsApi.getCurrentShiftDefinition();

      expect(mockGet).toHaveBeenCalledWith('/shift-definitions/current');
      expect(result).toEqual(mockResponse);
    });

    it('indicates current shift with time remaining', async () => {
      const mockResponse = {
        data: {
          id: '2',
          name: 'Shift 2',
          code: 'SHIFT2',
          is_current: true,
          time_remaining_minutes: 60,
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await shiftDefinitionsApi.getCurrentShiftDefinition();

      expect(result.data?.is_current).toBe(true);
      expect(result.data?.time_remaining_minutes).toBe(60);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = shiftDefinitionsApi.default;
      expect(defaultExport.getShiftDefinitions).toBeDefined();
      expect(defaultExport.getShiftDefinitionById).toBeDefined();
      expect(defaultExport.getCurrentShiftDefinition).toBeDefined();
    });
  });
});
