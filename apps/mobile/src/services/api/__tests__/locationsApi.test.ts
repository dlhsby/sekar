/**
 * Areas API Service Tests
 */

import * as locationsApi from '../locationsApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('locationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAreas', () => {
    it('gets all areas without filter', async () => {
      const mockResponse = {
        data: [
          {
            id: 'area-1',
            name: 'Taman Bungkul',
            area_type_id: 'type-1',
            district_id: 'district-1',
            gps_lat: -7.250445,
            gps_lng: 112.768845,
            radius_meters: 100,
            address: 'Jl. Raya Darmo',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await locationsApi.getAreas();

      expect(mockGet).toHaveBeenCalledWith('/areas', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('gets areas with area type filter', async () => {
      const mockResponse = {
        data: [
          {
            id: 'area-2',
            name: 'Taman Surya',
            area_type_id: 'RTH',
            district_id: 'district-2',
            gps_lat: -7.260000,
            gps_lng: 112.750000,
            radius_meters: 150,
            address: 'Jl. Pahlawan',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await locationsApi.getAreas('RTH');

      expect(mockGet).toHaveBeenCalledWith('/areas', { area_type: 'RTH' });
      expect(result).toEqual(mockResponse);
    });

    it('passes undefined params when no area type provided', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await locationsApi.getAreas();

      expect(mockGet).toHaveBeenCalledWith('/areas', undefined);
    });

    it('passes area_type param when area type is provided', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await locationsApi.getAreas('TAMAN');

      expect(mockGet).toHaveBeenCalledWith('/areas', { area_type: 'TAMAN' });
    });

    it('handles empty response', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await locationsApi.getAreas();

      expect(result).toEqual({ data: [] });
    });

    it('propagates API errors', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      await expect(locationsApi.getAreas()).rejects.toThrow('Network error');
    });
  });

  describe('getAreaById', () => {
    it('gets area by ID', async () => {
      const areaId = 'area-123';
      const mockResponse = {
        data: {
          id: areaId,
          name: 'Taman Bungkul',
          area_type_id: 'type-1',
          district_id: 'district-1',
          gps_lat: -7.250445,
          gps_lng: 112.768845,
          radius_meters: 100,
          address: 'Jl. Raya Darmo',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await locationsApi.getAreaById(areaId);

      expect(mockGet).toHaveBeenCalledWith(`/areas/${areaId}`);
      expect(result).toEqual(mockResponse);
    });

    it('calls correct endpoint with area ID interpolated', async () => {
      const areaId = 'area-xyz-789';
      const mockResponse = { data: { id: areaId, name: 'Test Area' } };
      mockGet.mockResolvedValue(mockResponse);

      await locationsApi.getAreaById(areaId);

      expect(mockGet).toHaveBeenCalledWith('/areas/area-xyz-789');
    });

    it('propagates API errors', async () => {
      const error = new Error('Not found');
      mockGet.mockRejectedValue(error);

      await expect(locationsApi.getAreaById('nonexistent')).rejects.toThrow('Not found');
    });

    it('returns single area data', async () => {
      const mockResponse = {
        data: {
          id: 'area-1',
          name: 'Taman Bungkul',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await locationsApi.getAreaById('area-1');

      expect(result.data).toEqual(mockResponse.data);
    });
  });
});
