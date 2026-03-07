import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { MonitoringConfig } from '../entities/monitoring-config.entity';
import {
  MonitoringCacheService,
  StatusThresholds,
  GeofencingConfig,
} from './monitoring-cache.service';

const statusThresholdsSchema = z.object({
  active_max_age_seconds: z.number().int().min(60).max(600),
  inactive_threshold_seconds: z.number().int().min(300).max(3600),
  missing_threshold_seconds: z.number().int().min(1800).max(7200),
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
  ) {
    this.cacheService.setLoaders({
      thresholds: () => this.getTypedConfig<StatusThresholds>('status_thresholds'),
      geofencing: () => this.getTypedConfig<GeofencingConfig>('geofencing'),
      boundary: (areaId: string) => this.loadAreaBoundary(areaId),
    });
  }

  async findAll(): Promise<MonitoringConfig[]> {
    return this.configRepository.find({ order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<MonitoringConfig> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Config key '${key}' not found`);
    }
    return config;
  }

  async updateByKey(key: string, value: Record<string, any>): Promise<MonitoringConfig> {
    const schema = SCHEMAS[key];
    if (schema) {
      const result = schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException(
          `Invalid config value for '${key}': ${result.error.message}`,
        );
      }
    }

    const config = await this.findByKey(key);
    config.value = value;
    const saved = await this.configRepository.save(config);

    if (key === 'status_thresholds' || key === 'geofencing') {
      this.cacheService.invalidateThresholds();
    }

    this.logger.log(`Updated monitoring config: ${key}`);
    return saved;
  }

  private async getTypedConfig<T>(key: string): Promise<T> {
    const config = await this.configRepository.findOne({ where: { key } });
    if (!config) {
      throw new NotFoundException(`Config '${key}' not found`);
    }
    return config.value as T;
  }

  private async loadAreaBoundary(areaId: string): Promise<number[][][] | null> {
    const area = await this.configRepository.manager.query(
      'SELECT boundary_polygon FROM areas WHERE id = $1',
      [areaId],
    );
    return area?.[0]?.boundary_polygon?.coordinates || null;
  }
}
