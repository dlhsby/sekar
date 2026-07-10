import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfig } from '../entities/system-config.entity';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let repo: any;
  const savedEnv = { ...process.env };

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    service = new SystemConfigService(repo as unknown as any);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  describe('resolve precedence (DB → env → default)', () => {
    it('returns the code default when no override and no env', async () => {
      delete process.env.MONITORING_IDLE_THRESHOLD_MIN;
      await service.onModuleInit();
      expect(service.resolve('monitoring.idle_threshold_min')).toBe(5);
    });

    it('prefers env over default (coerced to the value type)', async () => {
      process.env.MONITORING_IDLE_THRESHOLD_MIN = '9';
      await service.onModuleInit();
      expect(service.resolve('monitoring.idle_threshold_min')).toBe(9);
    });

    it('prefers a DB override over env', async () => {
      process.env.MONITORING_IDLE_THRESHOLD_MIN = '9';
      repo.find.mockResolvedValue([
        {
          key: 'monitoring.idle_threshold_min',
          value: '12',
          is_secret: false,
          value_type: 'number',
          config_group: 'monitoring',
        } as SystemConfig,
      ]);
      await service.onModuleInit();
      expect(service.resolve('monitoring.idle_threshold_min')).toBe(12);
    });

    it('returns undefined for an unknown key', () => {
      expect(service.resolve('does.not.exist')).toBeUndefined();
    });
  });

  describe('describeAll', () => {
    it('masks secret values (no value field) but reports isSet/source', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'AIzaSyXYZ';
      await service.onModuleInit();
      const all = service.describeAll();
      const maps = all.find((d) => d.key === 'maps.browser_key')!;
      expect(maps.isSecret).toBe(true);
      expect(maps.source).toBe('env');
      expect(maps.isSet).toBe(true);
      expect(maps.value).toBeUndefined();
    });

    it('reports source=unset for keys with neither override nor env', async () => {
      delete process.env.GEOFENCE_TOLERANCE_M;
      await service.onModuleInit();
      const tol = service.describeAll().find((d) => d.key === 'geofence.tolerance_m')!;
      // has a code default but no override/env → source unset, value from default
      expect(tol.source).toBe('unset');
      expect(tol.value).toBe(100);
    });
  });

  describe('set', () => {
    it('rejects an unknown key', async () => {
      await expect(service.set('nope.nope', '1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a value of the wrong type', async () => {
      await expect(service.set('fcm.enabled', 'notabool')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a secret when no encryption key is configured', async () => {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      await expect(service.set('maps.browser_key', 'AIzaSy')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
