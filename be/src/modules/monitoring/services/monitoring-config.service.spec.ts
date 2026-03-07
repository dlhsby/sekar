import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MonitoringConfigService } from './monitoring-config.service';
import { MonitoringConfig } from '../entities/monitoring-config.entity';
import { MonitoringCacheService } from './monitoring-cache.service';

describe('MonitoringConfigService', () => {
  let service: MonitoringConfigService;
  let repository: any;
  let cacheService: any;

  beforeEach(async () => {
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      manager: { query: jest.fn() },
    };

    cacheService = {
      setLoaders: jest.fn(),
      invalidateThresholds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringConfigService,
        { provide: getRepositoryToken(MonitoringConfig), useValue: repository },
        { provide: MonitoringCacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<MonitoringConfigService>(MonitoringConfigService);
  });

  describe('findAll', () => {
    it('should return all configs ordered by key', async () => {
      const configs = [
        { id: '1', key: 'alerts', value: {}, description: '' },
        { id: '2', key: 'status_thresholds', value: {}, description: '' },
      ];
      repository.find.mockResolvedValue(configs);

      const result = await service.findAll();
      expect(result).toEqual(configs);
      expect(repository.find).toHaveBeenCalledWith({ order: { key: 'ASC' } });
    });
  });

  describe('findByKey', () => {
    it('should return config by key', async () => {
      const config = { id: '1', key: 'alerts', value: { notify_on_missing: true } };
      repository.findOne.mockResolvedValue(config);

      const result = await service.findByKey('alerts');
      expect(result).toEqual(config);
    });

    it('should throw NotFoundException when key not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findByKey('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateByKey', () => {
    it('should validate and update status_thresholds', async () => {
      const existing = {
        id: '1',
        key: 'status_thresholds',
        value: {
          active_max_age_seconds: 300,
          inactive_threshold_seconds: 900,
          missing_threshold_seconds: 3600,
        },
      };
      repository.findOne.mockResolvedValue(existing);

      const newValue = {
        active_max_age_seconds: 120,
        inactive_threshold_seconds: 600,
        missing_threshold_seconds: 1800,
        location_ping_interval_seconds: 60,
      };

      const result = await service.updateByKey('status_thresholds', newValue);
      expect(result.value).toEqual(newValue);
      expect(cacheService.invalidateThresholds).toHaveBeenCalled();
    });

    it('should reject invalid status_thresholds', async () => {
      const existing = { id: '1', key: 'status_thresholds', value: {} };
      repository.findOne.mockResolvedValue(existing);

      const invalid = { active_max_age_seconds: -1 };
      await expect(service.updateByKey('status_thresholds', invalid as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow unknown keys without validation', async () => {
      const existing = { id: '1', key: 'custom_key', value: {} };
      repository.findOne.mockResolvedValue(existing);

      const result = await service.updateByKey('custom_key', { foo: 'bar' });
      expect(result.value).toEqual({ foo: 'bar' });
    });

    it('should invalidate cache on geofencing update', async () => {
      const existing = {
        id: '1',
        key: 'geofencing',
        value: { tolerance_meters: 50, outside_area_grace_seconds: 120 },
      };
      repository.findOne.mockResolvedValue(existing);

      await service.updateByKey('geofencing', {
        tolerance_meters: 100,
        outside_area_grace_seconds: 60,
      });

      expect(cacheService.invalidateThresholds).toHaveBeenCalled();
    });

    it('should not invalidate cache for non-threshold keys', async () => {
      const existing = { id: '1', key: 'alerts', value: {} };
      repository.findOne.mockResolvedValue(existing);

      await service.updateByKey('alerts', {
        missing_user_notify: true,
        understaffed_notify: false,
        low_battery_threshold: 20,
      });

      expect(cacheService.invalidateThresholds).not.toHaveBeenCalled();
    });
  });

  describe('cache loaders (via constructor)', () => {
    it('should register cache loaders with thresholds, geofencing, and boundary', () => {
      expect(cacheService.setLoaders).toHaveBeenCalledWith({
        thresholds: expect.any(Function),
        geofencing: expect.any(Function),
        boundary: expect.any(Function),
      });
    });

    it('thresholds loader should call getTypedConfig for status_thresholds', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      const config = { id: '1', key: 'status_thresholds', value: { active_max_age_seconds: 300 } };
      repository.findOne.mockResolvedValue(config);

      const result = await loaders.thresholds();
      expect(result).toEqual(config.value);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { key: 'status_thresholds' } });
    });

    it('thresholds loader should throw if config not found', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      repository.findOne.mockResolvedValue(null);

      await expect(loaders.thresholds()).rejects.toThrow(NotFoundException);
    });

    it('boundary loader should return polygon coordinates', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      const coords = [
        [
          [112.7, -7.2],
          [112.8, -7.2],
          [112.8, -7.3],
        ],
      ];
      repository.manager.query.mockResolvedValue([{ boundary_polygon: { coordinates: coords } }]);

      const result = await loaders.boundary('area-1');
      expect(result).toEqual(coords);
    });

    it('boundary loader should return null when area has no polygon', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      repository.manager.query.mockResolvedValue([{ boundary_polygon: null }]);

      const result = await loaders.boundary('area-1');
      expect(result).toBeNull();
    });

    it('boundary loader should return null when area not found', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      repository.manager.query.mockResolvedValue([]);

      const result = await loaders.boundary('nonexistent');
      expect(result).toBeNull();
    });
  });
});
