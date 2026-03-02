/**
 * Rayons API Service Tests
 */

import * as rayonsApi from '../rayonsApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('rayonsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRayons', () => {
    it('gets all rayons', async () => {
      const mockResponse = {
        data: [
          {
            id: 'rayon-1',
            name: 'Rayon Utara',
            code: 'RU',
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'rayon-2',
            name: 'Rayon Selatan',
            code: 'RS',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getRayons();

      expect(mockGet).toHaveBeenCalledWith('/rayons');
      expect(result).toEqual(mockResponse);
    });

    it('returns empty array when no rayons', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getRayons();

      expect(mockGet).toHaveBeenCalledWith('/rayons');
      expect(result).toEqual({ data: [] });
    });

    it('propagates API errors', async () => {
      const error = new Error('Network error');
      mockGet.mockRejectedValue(error);

      await expect(rayonsApi.getRayons()).rejects.toThrow('Network error');
    });

    it('calls the correct endpoint', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await rayonsApi.getRayons();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith('/rayons');
    });
  });

  describe('getRayonById', () => {
    it('gets rayon by ID', async () => {
      const rayonId = 'rayon-123';
      const mockResponse = {
        data: {
          id: rayonId,
          name: 'Rayon Tengah',
          code: 'RT',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getRayonById(rayonId);

      expect(mockGet).toHaveBeenCalledWith(`/rayons/${rayonId}`);
      expect(result).toEqual(mockResponse);
    });

    it('calls correct endpoint with rayon ID interpolated', async () => {
      const rayonId = 'rayon-abc-456';
      const mockResponse = { data: { id: rayonId, name: 'Test Rayon' } };
      mockGet.mockResolvedValue(mockResponse);

      await rayonsApi.getRayonById(rayonId);

      expect(mockGet).toHaveBeenCalledWith('/rayons/rayon-abc-456');
    });

    it('propagates API errors', async () => {
      const error = new Error('Not found');
      mockGet.mockRejectedValue(error);

      await expect(rayonsApi.getRayonById('nonexistent')).rejects.toThrow('Not found');
    });

    it('returns single rayon data', async () => {
      const mockResponse = {
        data: {
          id: 'rayon-1',
          name: 'Rayon Utara',
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getRayonById('rayon-1');

      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('getAreasByRayonId', () => {
    it('gets all areas for a given rayon ID', async () => {
      const rayonId = 'rayon-1';
      const mockResponse = {
        data: [
          {
            id: 'area-1',
            name: 'Taman Bungkul',
            rayon_id: rayonId,
          },
          {
            id: 'area-2',
            name: 'Taman Surya',
            rayon_id: rayonId,
          },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getAreasByRayonId(rayonId);

      expect(mockGet).toHaveBeenCalledWith(`/rayons/${rayonId}/areas`);
      expect(result).toEqual(mockResponse);
    });

    it('calls correct nested endpoint', async () => {
      const rayonId = 'rayon-xyz';
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await rayonsApi.getAreasByRayonId(rayonId);

      expect(mockGet).toHaveBeenCalledWith('/rayons/rayon-xyz/areas');
    });

    it('returns empty array when no areas in rayon', async () => {
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getAreasByRayonId('rayon-empty');

      expect(result).toEqual({ data: [] });
    });

    it('propagates API errors', async () => {
      const error = new Error('Server error');
      mockGet.mockRejectedValue(error);

      await expect(rayonsApi.getAreasByRayonId('rayon-1')).rejects.toThrow('Server error');
    });

    it('returns area list data', async () => {
      const mockResponse = {
        data: [{ id: 'area-1', name: 'Taman A' }],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await rayonsApi.getAreasByRayonId('rayon-1');

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
