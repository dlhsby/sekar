/**
 * Districts API Service Tests
 */

import * as districtsApi from '../districtsApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('districtsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDistricts', () => {
    it('gets all districts', async () => {
      const mockResponse = {
        data: [
          {
            id: 'district-1',
            name: 'Rayon Utara',
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'district-2',
            name: 'Rayon Selatan',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getDistricts();

      expect(mockGet).toHaveBeenCalledWith('/districts');
      expect(result).toEqual(mockResponse);
    });

    it('returns empty array when no districts', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getDistricts();

      expect(mockGet).toHaveBeenCalledWith('/districts');
      expect(result).toEqual({ data: [] });
    });

    it('propagates API errors', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      await expect(districtsApi.getDistricts()).rejects.toThrow('Network error');
    });

    it('calls the correct endpoint', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await districtsApi.getDistricts();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/districts');
    });
  });

  describe('getDistrictById', () => {
    it('gets district by ID', async () => {
      const districtId = 'district-123';
      const mockResponse = {
        data: {
          id: districtId,
          name: 'Rayon Tengah',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getDistrictById(districtId);

      expect(mockGet).toHaveBeenCalledWith(`/districts/${districtId}`);
      expect(result).toEqual(mockResponse);
    });

    it('calls correct endpoint with district ID interpolated', async () => {
      const districtId = 'district-abc-456';
      const mockResponse = { data: { id: districtId, name: 'Test Rayon' } };
      mockGet.mockResolvedValue(mockResponse);

      await districtsApi.getDistrictById(districtId);

      expect(mockGet).toHaveBeenCalledWith('/districts/district-abc-456');
    });

    it('propagates API errors', async () => {
      const error = new Error('Not found');
      mockGet.mockRejectedValue(error);

      await expect(districtsApi.getDistrictById('nonexistent')).rejects.toThrow('Not found');
    });

    it('returns single district data', async () => {
      const mockResponse = {
        data: {
          id: 'district-1',
          name: 'Rayon Utara',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getDistrictById('district-1');

      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('getAreasByDistrictId', () => {
    it('gets all areas for a given district ID', async () => {
      const districtId = 'district-1';
      const mockResponse = {
        data: [
          {
            id: 'area-1',
            name: 'Taman Bungkul',
            district_id: districtId,
          },
          {
            id: 'area-2',
            name: 'Taman Surya',
            district_id: districtId,
          },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getAreasByDistrictId(districtId);

      expect(mockGet).toHaveBeenCalledWith(`/districts/${districtId}/areas`);
      expect(result).toEqual(mockResponse);
    });

    it('calls correct nested endpoint', async () => {
      const districtId = 'district-xyz';
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await districtsApi.getAreasByDistrictId(districtId);

      expect(mockGet).toHaveBeenCalledWith('/districts/district-xyz/areas');
    });

    it('returns empty array when no areas in district', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getAreasByDistrictId('district-empty');

      expect(result).toEqual({ data: [] });
    });

    it('propagates API errors', async () => {
      const error = new Error('Server error');
      mockGet.mockRejectedValue(error);

      await expect(districtsApi.getAreasByDistrictId('district-1')).rejects.toThrow('Server error');
    });

    it('returns area list data', async () => {
      const mockResponse = {
        data: [{ id: 'area-1', name: 'Taman A' }],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await districtsApi.getAreasByDistrictId('district-1');

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
