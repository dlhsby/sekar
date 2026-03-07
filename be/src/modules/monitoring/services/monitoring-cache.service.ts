import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface StatusThresholds {
  active_max_age_seconds: number;
  inactive_threshold_seconds: number;
  missing_threshold_seconds: number;
  location_ping_interval_seconds: number;
}

export enum DayTypeEnum {
  WEEKDAY = 'WEEKDAY',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
}

export interface GeofencingConfig {
  tolerance_meters: number;
  outside_area_grace_seconds: number;
}

const DEFAULT_THRESHOLDS: StatusThresholds = {
  active_max_age_seconds: 300,
  inactive_threshold_seconds: 900,
  missing_threshold_seconds: 3600,
  location_ping_interval_seconds: 60,
};

const DEFAULT_GEOFENCING: GeofencingConfig = {
  tolerance_meters: 50,
  outside_area_grace_seconds: 120,
};

@Injectable()
export class MonitoringCacheService {
  private readonly logger = new Logger(MonitoringCacheService.name);

  private thresholdsCache: CacheEntry<StatusThresholds> | null = null;
  private geofencingCache: CacheEntry<GeofencingConfig> | null = null;
  private areaBoundaryCache = new Map<string, CacheEntry<number[][][] | null>>();
  private dayTypeCache: CacheEntry<DayTypeEnum> | null = null;

  private readonly THRESHOLDS_TTL_MS = 60_000;
  private readonly BOUNDARY_TTL_MS = 300_000;
  private readonly DAY_TYPE_TTL_MS = 300_000;

  private thresholdsLoader: (() => Promise<StatusThresholds>) | null = null;
  private geofencingLoader: (() => Promise<GeofencingConfig>) | null = null;
  private boundaryLoader: ((areaId: string) => Promise<number[][][] | null>) | null = null;
  private dayTypeLoader: (() => Promise<DayTypeEnum>) | null = null;

  setLoaders(loaders: {
    thresholds?: () => Promise<StatusThresholds>;
    geofencing?: () => Promise<GeofencingConfig>;
    boundary?: (areaId: string) => Promise<number[][][] | null>;
    dayType?: () => Promise<DayTypeEnum>;
  }): void {
    if (loaders.thresholds) this.thresholdsLoader = loaders.thresholds;
    if (loaders.geofencing) this.geofencingLoader = loaders.geofencing;
    if (loaders.boundary) this.boundaryLoader = loaders.boundary;
    if (loaders.dayType) this.dayTypeLoader = loaders.dayType;
  }

  async getThresholds(): Promise<StatusThresholds> {
    const now = Date.now();
    if (this.thresholdsCache && this.thresholdsCache.expiresAt > now) {
      return this.thresholdsCache.data;
    }

    if (this.thresholdsLoader) {
      try {
        const data = await this.thresholdsLoader();
        this.thresholdsCache = { data, expiresAt: now + this.THRESHOLDS_TTL_MS };
        return data;
      } catch (error) {
        this.logger.warn(`Failed to load thresholds, using defaults: ${error.message}`);
      }
    }

    return DEFAULT_THRESHOLDS;
  }

  async getGeofencing(): Promise<GeofencingConfig> {
    const now = Date.now();
    if (this.geofencingCache && this.geofencingCache.expiresAt > now) {
      return this.geofencingCache.data;
    }

    if (this.geofencingLoader) {
      try {
        const data = await this.geofencingLoader();
        this.geofencingCache = { data, expiresAt: now + this.THRESHOLDS_TTL_MS };
        return data;
      } catch (error) {
        this.logger.warn(`Failed to load geofencing config, using defaults: ${error.message}`);
      }
    }

    return DEFAULT_GEOFENCING;
  }

  async getAreaBoundary(areaId: string): Promise<number[][][] | null> {
    const now = Date.now();
    const cached = this.areaBoundaryCache.get(areaId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    if (this.boundaryLoader) {
      try {
        const data = await this.boundaryLoader(areaId);
        this.areaBoundaryCache.set(areaId, { data, expiresAt: now + this.BOUNDARY_TTL_MS });
        return data;
      } catch (error) {
        this.logger.warn(`Failed to load boundary for area ${areaId}: ${error.message}`);
      }
    }

    return null;
  }

  invalidateThresholds(): void {
    this.thresholdsCache = null;
    this.geofencingCache = null;
    this.logger.debug('Invalidated thresholds and geofencing cache');
  }

  invalidateAreaBoundary(areaId?: string): void {
    if (areaId) {
      this.areaBoundaryCache.delete(areaId);
      this.logger.debug(`Invalidated boundary cache for area ${areaId}`);
    } else {
      this.areaBoundaryCache.clear();
      this.logger.debug('Invalidated all boundary caches');
    }
  }

  async getDayType(): Promise<DayTypeEnum> {
    const now = Date.now();
    if (this.dayTypeCache && this.dayTypeCache.expiresAt > now) {
      return this.dayTypeCache.data;
    }

    if (this.dayTypeLoader) {
      try {
        const data = await this.dayTypeLoader();
        this.dayTypeCache = { data, expiresAt: now + this.DAY_TYPE_TTL_MS };
        return data;
      } catch (error) {
        this.logger.warn(`Failed to load day type, using fallback: ${error.message}`);
      }
    }

    const day = new Date().getDay();
    return day === 0 || day === 6 ? DayTypeEnum.WEEKEND : DayTypeEnum.WEEKDAY;
  }

  invalidateDayType(): void {
    this.dayTypeCache = null;
    this.logger.debug('Invalidated day type cache');
  }

  invalidateAll(): void {
    this.thresholdsCache = null;
    this.geofencingCache = null;
    this.areaBoundaryCache.clear();
    this.dayTypeCache = null;
    this.logger.debug('Invalidated all caches');
  }
}
