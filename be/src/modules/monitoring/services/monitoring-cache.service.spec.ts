import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringCacheService } from './monitoring-cache.service';

describe('MonitoringCacheService', () => {
  let service: MonitoringCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringCacheService],
    }).compile();

    service = module.get<MonitoringCacheService>(MonitoringCacheService);
  });

  describe('getThresholds', () => {
    it('should return defaults when no loader set', async () => {
      const result = await service.getThresholds();
      expect(result.active_max_age_seconds).toBe(300);
      expect(result.inactive_threshold_seconds).toBe(900);
      expect(result.missing_threshold_seconds).toBe(3600);
    });

    it('should use loader when set', async () => {
      const custom = {
        active_max_age_seconds: 120,
        inactive_threshold_seconds: 600,
        missing_threshold_seconds: 1800,
      };
      service.setLoaders({
        thresholds: async () => custom,
        geofencing: async () => ({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        boundary: async () => null,
      });

      const result = await service.getThresholds();
      expect(result).toEqual(custom);
    });

    it('should cache thresholds on second call', async () => {
      const loader = jest.fn().mockResolvedValue({
        active_max_age_seconds: 120,
        inactive_threshold_seconds: 600,
        missing_threshold_seconds: 1800,
      });
      service.setLoaders({
        thresholds: loader,
        geofencing: async () => ({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        boundary: async () => null,
      });

      await service.getThresholds();
      await service.getThresholds();

      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should return defaults when loader throws', async () => {
      service.setLoaders({
        thresholds: async () => { throw new Error('DB down'); },
        geofencing: async () => ({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        boundary: async () => null,
      });

      const result = await service.getThresholds();
      expect(result.active_max_age_seconds).toBe(300);
    });
  });

  describe('getGeofencing', () => {
    it('should return defaults when no loader set', async () => {
      const result = await service.getGeofencing();
      expect(result.tolerance_meters).toBe(50);
      expect(result.outside_area_grace_seconds).toBe(120);
    });
  });

  describe('getAreaBoundary', () => {
    it('should return null when no loader set', async () => {
      const result = await service.getAreaBoundary('area-1');
      expect(result).toBeNull();
    });

    it('should cache boundary per area', async () => {
      const loader = jest.fn().mockResolvedValue([[[0, 0], [1, 0], [1, 1], [0, 0]]]);
      service.setLoaders({
        thresholds: async () => ({ active_max_age_seconds: 300, inactive_threshold_seconds: 900, missing_threshold_seconds: 3600 }),
        geofencing: async () => ({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        boundary: loader,
      });

      await service.getAreaBoundary('area-1');
      await service.getAreaBoundary('area-1');

      expect(loader).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidation', () => {
    it('should invalidate thresholds cache', async () => {
      const loader = jest.fn().mockResolvedValue({
        active_max_age_seconds: 120,
        inactive_threshold_seconds: 600,
        missing_threshold_seconds: 1800,
      });
      service.setLoaders({
        thresholds: loader,
        geofencing: async () => ({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        boundary: async () => null,
      });

      await service.getThresholds();
      service.invalidateThresholds();
      await service.getThresholds();

      expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should invalidate specific area boundary', async () => {
      const loader = jest.fn().mockResolvedValue([[[0, 0], [1, 0], [1, 1], [0, 0]]]);
      service.setLoaders({
        thresholds: async () => ({ active_max_age_seconds: 300, inactive_threshold_seconds: 900, missing_threshold_seconds: 3600 }),
        geofencing: async () => ({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        boundary: loader,
      });

      await service.getAreaBoundary('area-1');
      service.invalidateAreaBoundary('area-1');
      await service.getAreaBoundary('area-1');

      expect(loader).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all caches', async () => {
      service.invalidateAll();
      // Should not throw
    });
  });
});
