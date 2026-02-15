/**
 * Activity Types API Service Tests
 */

import * as activityTypesApi from '../activityTypesApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('activityTypesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivityTypes', () => {
    it('gets activity types without filters', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: '1', name: 'Penyiraman', code: 'WATERING' },
            { id: '2', name: 'Pemangkasan', code: 'PRUNING' },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activityTypesApi.getActivityTypes();

      expect(mockGet).toHaveBeenCalledWith('/activity-types', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('gets activity types with role filter', async () => {
      const filters = { role: 'satgas' as const };
      const mockResponse = {
        data: {
          data: [{ id: '1', name: 'Penyiraman', code: 'WATERING' }],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activityTypesApi.getActivityTypes(filters);

      expect(mockGet).toHaveBeenCalledWith('/activity-types', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets activity types with is_active filter', async () => {
      const filters = { is_active: true };
      const mockResponse = {
        data: {
          data: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activityTypesApi.getActivityTypes(filters);

      expect(mockGet).toHaveBeenCalledWith('/activity-types', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyActivityTypes', () => {
    it('gets activity types for current user role', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: '1', name: 'Patroli Keamanan', code: 'SECURITY_PATROL' },
          ],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activityTypesApi.getMyActivityTypes();

      expect(mockGet).toHaveBeenCalledWith('/activity-types/my-types');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getActivityTypeById', () => {
    it('gets activity type by ID', async () => {
      const activityTypeId = 'activity-123';
      const mockResponse = {
        data: { id: activityTypeId, name: 'Penyiraman', code: 'WATERING' },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await activityTypesApi.getActivityTypeById(activityTypeId);

      expect(mockGet).toHaveBeenCalledWith(`/activity-types/${activityTypeId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = activityTypesApi.default;
      expect(defaultExport.getActivityTypes).toBeDefined();
      expect(defaultExport.getMyActivityTypes).toBeDefined();
      expect(defaultExport.getActivityTypeById).toBeDefined();
    });
  });
});
