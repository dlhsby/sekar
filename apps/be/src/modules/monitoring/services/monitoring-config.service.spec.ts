import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MonitoringConfigService } from './monitoring-config.service';
import { MonitoringConfig } from '../entities/monitoring-config.entity';
import { MonitoringCacheService } from './monitoring-cache.service';
import { SystemConfigService } from '../../settings/services/system-config.service';

// Canonical monitoring values now live in SystemConfigService (ADR-049 unify).
const SYSTEM_VALUES: Record<string, number> = {
  'monitoring.active_max_age_sec': 300,
  'monitoring.location_ping_interval_sec': 60,
  'geofence.tolerance_m': 50,
  'geofence.outside_area_grace_sec': 120,
};

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

    const systemConfig = {
      getNumber: jest.fn((key: string, def?: number) => SYSTEM_VALUES[key] ?? def ?? 0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringConfigService,
        { provide: getRepositoryToken(MonitoringConfig), useValue: repository },
        { provide: MonitoringCacheService, useValue: cacheService },
        { provide: SystemConfigService, useValue: systemConfig },
      ],
    }).compile();

    service = module.get<MonitoringConfigService>(MonitoringConfigService);
  });

  describe('findAll', () => {
    it('hides the sections moved to System Settings (thresholds/geofencing)', async () => {
      const configs = [
        { id: '1', key: 'alerts', value: {}, description: '' },
        { id: '2', key: 'status_thresholds', value: {}, description: '' },
        { id: '3', key: 'geofencing', value: {}, description: '' },
        { id: '4', key: 'map_defaults', value: {}, description: '' },
      ];
      repository.find.mockResolvedValue(configs);

      const result = await service.findAll();
      expect(result.map((c) => c.key)).toEqual(['alerts', 'map_defaults']);
      expect(repository.find).toHaveBeenCalledWith({ order: { key: 'ASC' } });
    });
  });

  describe('findByKey', () => {
    it('should return config by key', async () => {
      const config = { id: '1', key: 'alerts', value: { notify_on_missing: true } };
      repository.findOne.mockResolvedValue(config);
      expect(await service.findByKey('alerts')).toEqual(config);
    });

    it('should throw NotFoundException when key not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findByKey('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateByKey', () => {
    it('rejects the moved keys (status_thresholds/geofencing) — edit in Settings', async () => {
      await expect(
        service.updateByKey('status_thresholds', { active_max_age_seconds: 120 }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.updateByKey('geofencing', { tolerance_meters: 100 })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('validates + updates a schema-backed key (alerts)', async () => {
      const existing = { id: '1', key: 'alerts', value: {} };
      repository.findOne.mockResolvedValue(existing);
      const result = await service.updateByKey('alerts', {
        missing_user_notify: true,
        understaffed_notify: false,
        low_battery_threshold: 20,
      });
      expect(result.value).toEqual({
        missing_user_notify: true,
        understaffed_notify: false,
        low_battery_threshold: 20,
      });
    });

    it('should allow unknown keys without validation', async () => {
      const existing = { id: '1', key: 'custom_key', value: {} };
      repository.findOne.mockResolvedValue(existing);
      const result = await service.updateByKey('custom_key', { foo: 'bar' });
      expect(result.value).toEqual({ foo: 'bar' });
    });
  });

  describe('cache loaders (via constructor)', () => {
    it('registers thresholds, geofencing, and boundary loaders', () => {
      expect(cacheService.setLoaders).toHaveBeenCalledWith({
        thresholds: expect.any(Function),
        geofencing: expect.any(Function),
        boundary: expect.any(Function),
      });
    });

    it('thresholds loader resolves from SystemConfigService', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      expect(await loaders.thresholds()).toEqual({
        active_max_age_seconds: 300,
        location_ping_interval_seconds: 60,
        late_grace_seconds: 900,
      });
    });

    it('geofencing loader resolves from SystemConfigService', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      expect(await loaders.geofencing()).toEqual({
        tolerance_meters: 50,
        outside_area_grace_seconds: 120,
      });
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
      expect(await loaders.boundary('area-1')).toEqual(coords);
    });

    it('boundary loader should return null when area has no polygon', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      repository.manager.query.mockResolvedValue([{ boundary_polygon: null }]);
      expect(await loaders.boundary('area-1')).toBeNull();
    });

    it('boundary loader should return null when area not found', async () => {
      const loaders = cacheService.setLoaders.mock.calls[0][0];
      repository.manager.query.mockResolvedValue([]);
      expect(await loaders.boundary('nonexistent')).toBeNull();
    });
  });
});
