import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { MonitoringConfig } from '../entities/monitoring-config.entity';
import { MonitoringCacheService } from './monitoring-cache.service';
import { SystemConfigService } from '../../settings/services/system-config.service';

/**
 * Threshold + geofencing config moved to SystemConfigService (ADR-049 unify) —
 * editing these via the monitoring-config surface is rejected; use /settings.
 */
const MOVED_TO_SETTINGS = new Set(['status_thresholds', 'geofencing']);

const statusThresholdsSchema = z.object({
  // The single surviving boundary: past this a clocked-in worker is OFFLINE.
  // `inactive_threshold_seconds` + `missing_threshold_seconds` were retired with
  // the 5→3 status collapse — with idle and missing both folding into offline,
  // nothing could ever read them.
  active_max_age_seconds: z.number().int().min(60).max(600),
  location_ping_interval_seconds: z.number().int().min(30).max(300),
});

const geofencingSchema = z.object({
  tolerance_meters: z.number().min(0).max(500),
  outside_area_grace_seconds: z.number().int().min(0).max(600),
});

const mapDefaultsSchema = z.object({
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  zoom: z.number().int().min(1).max(20),
  cluster_zoom_threshold: z.number().int().min(1).max(20),
  cluster_threshold: z.number().int().min(10).max(100),
});

const alertsSchema = z.object({
  missing_user_notify: z.boolean(),
  understaffed_notify: z.boolean(),
  low_battery_threshold: z.number().int().min(0).max(100),
});

const locationPingSchema = z.object({
  interval_seconds: z.number().int().min(10).max(600),
  batch_size: z.number().int().min(1).max(100),
});

const SCHEMAS: Record<string, z.ZodSchema> = {
  status_thresholds: statusThresholdsSchema,
  geofencing: geofencingSchema,
  map_defaults: mapDefaultsSchema,
  alerts: alertsSchema,
  location_ping: locationPingSchema,
};

@Injectable()
export class MonitoringConfigService {
  private readonly logger = new Logger(MonitoringConfigService.name);

  constructor(
    @InjectRepository(MonitoringConfig)
    private readonly configRepository: Repository<MonitoringConfig>,
    private readonly cacheService: MonitoringCacheService,
    private readonly systemConfig: SystemConfigService,
  ) {
    // Thresholds + geofencing now resolve from SystemConfigService (DB → env →
    // default), so operator overrides in /settings drive status calculation.
    this.cacheService.setLoaders({
      thresholds: () =>
        Promise.resolve({
          active_max_age_seconds: this.systemConfig.getNumber('monitoring.active_max_age_sec', 300),
          location_ping_interval_seconds: this.systemConfig.getNumber(
            'monitoring.location_ping_interval_sec',
            60,
          ),
        }),
      geofencing: () =>
        Promise.resolve({
          tolerance_meters: this.systemConfig.getNumber('geofence.tolerance_m', 50),
          outside_area_grace_seconds: this.systemConfig.getNumber(
            'geofence.outside_area_grace_sec',
            120,
          ),
        }),
      boundary: (locationId: string) => this.loadAreaBoundary(locationId),
    });
  }

  async findAll(): Promise<MonitoringConfig[]> {
    // Hide the sections that moved to /settings (status_thresholds/geofencing).
    const rows = await this.configRepository.find({ order: { key: 'ASC' } });
    return rows.filter((c) => !MOVED_TO_SETTINGS.has(c.key));
  }

  async findByKey(key: string): Promise<MonitoringConfig> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Config key '${key}' not found`);
    }
    return config;
  }

  async updateByKey(key: string, value: Record<string, any>): Promise<MonitoringConfig> {
    if (MOVED_TO_SETTINGS.has(key)) {
      throw new BadRequestException(
        `'${key}' is now managed in System Settings (Pengaturan → Sistem), not here.`,
      );
    }
    const schema = SCHEMAS[key];
    if (schema) {
      const result = schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException(`Invalid config value for '${key}': ${result.error.message}`);
      }
    }

    const config = await this.findByKey(key);
    config.value = value;
    const saved = await this.configRepository.save(config);

    this.logger.log(`Updated monitoring config: ${key}`);
    return saved;
  }

  private async loadAreaBoundary(locationId: string): Promise<number[][][] | null> {
    const area = await this.configRepository.manager.query(
      'SELECT boundary_polygon FROM locations WHERE id = $1',
      [locationId],
    );
    return area?.[0]?.boundary_polygon?.coordinates || null;
  }
}
