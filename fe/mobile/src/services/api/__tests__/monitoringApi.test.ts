/**
 * Monitoring API Service Tests
 */

import * as monitoringApi from '../monitoringApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

describe('monitoringApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCityMonitoring', () => {
    it('gets city monitoring stats without filters', async () => {
      const mockResponse = {
        data: {
          total_workers: 100,
          online_workers: 80,
          offline_workers: 20,
          total_areas: 10,
          staffed_areas: 8,
          understaffed_areas: 2,
          rayons: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getCityMonitoring();

      expect(mockGet).toHaveBeenCalledWith('/monitoring/city', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('gets city monitoring stats with date filter', async () => {
      const filters = { date: '2026-01-25' };
      const mockResponse = { data: { total_workers: 100 } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getCityMonitoring(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/city', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getRayonMonitoring', () => {
    it('gets rayon monitoring stats', async () => {
      const rayonId = 'rayon-123';
      const mockResponse = {
        data: {
          rayon_id: rayonId,
          rayon_name: 'Rayon Selatan',
          total_workers: 50,
          areas: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getRayonMonitoring(rayonId);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/rayon/${rayonId}`,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets rayon monitoring stats with filters', async () => {
      const rayonId = 'rayon-123';
      const filters = { date: '2026-01-25' };
      const mockResponse = { data: { rayon_id: rayonId } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getRayonMonitoring(rayonId, filters);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/rayon/${rayonId}`,
        filters,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAreaMonitoring', () => {
    it('gets area monitoring stats', async () => {
      const areaId = 'area-123';
      const mockResponse = {
        data: {
          area_id: areaId,
          area_name: 'Taman Bungkul',
          staffing_status: 'adequate',
          workers: [],
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAreaMonitoring(areaId);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/area/${areaId}`,
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets area monitoring stats with filters', async () => {
      const areaId = 'area-123';
      const filters = { date: '2026-01-25' };
      const mockResponse = { data: { area_id: areaId } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getAreaMonitoring(areaId, filters);

      expect(mockGet).toHaveBeenCalledWith(
        `/monitoring/area/${areaId}`,
        filters,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLiveWorkers', () => {
    it('gets live workers without filters', async () => {
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, last_updated: '2026-01-25T10:00:00Z' },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getLiveWorkers();

      expect(mockGet).toHaveBeenCalledWith(
        '/monitoring/live-workers',
        undefined,
      );
      expect(result).toEqual(mockResponse);
    });

    it('gets live workers with area filter', async () => {
      const filters = { area_id: 'area-123' };
      const mockResponse = {
        data: {
          data: [
            { id: '1', user_id: 'user-1', full_name: 'Worker 1' },
          ],
          meta: { total: 1, last_updated: '2026-01-25T10:00:00Z' },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getLiveWorkers(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/live-workers', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets live workers with rayon filter', async () => {
      const filters = { rayon_id: 'rayon-123' };
      const mockResponse = {
        data: {
          data: [],
          meta: { total: 0, last_updated: '2026-01-25T10:00:00Z' },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await monitoringApi.getLiveWorkers(filters);

      expect(mockGet).toHaveBeenCalledWith('/monitoring/live-workers', filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = monitoringApi.default;
      expect(defaultExport.getCityMonitoring).toBeDefined();
      expect(defaultExport.getRayonMonitoring).toBeDefined();
      expect(defaultExport.getAreaMonitoring).toBeDefined();
      expect(defaultExport.getLiveWorkers).toBeDefined();
    });
  });
});
