import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { MonitoringScope } from '../enums/monitoring-scope.enum';
import { RedisService } from '../../../common/services/redis.service';

const CACHE_PREFIX = 'rbac:role:';
const CACHE_SUFFIX = ':permissions';
const CACHE_TTL_SECONDS = 300;

/**
 * Resolves a role's granted permission keys (including wildcards) with Redis
 * caching (ADR-044). Fail-open: any Redis error falls back to a DB query, so
 * auth never breaks when the cache is unavailable.
 */
@Injectable()
export class RolePermissionsService {
  private readonly logger = new Logger(RolePermissionsService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly redis: RedisService,
  ) {}

  private cacheKey(roleCode: string): string {
    return `${CACHE_PREFIX}${roleCode}${CACHE_SUFFIX}`;
  }

  /** Granted permission keys for a role code (cached). Empty if role unknown. */
  async getRolePermissionKeys(roleCode: string): Promise<string[]> {
    if (!roleCode) return [];

    const cached = await this.readCache(roleCode);
    if (cached) return cached;

    const role = await this.roleRepo.findOne({
      where: { code: roleCode },
      relations: ['permissions'],
    });
    const keys = role?.permissions?.map((p) => p.key) ?? [];

    await this.writeCache(roleCode, keys);
    return keys;
  }

  /**
   * The role's `monitoring_scope` (city|district|region|location|none), which drives
   * where a caller lands + what they may view on the monitoring map (ADR-044/046).
   * Defaults to `NONE` for an unknown role. Not cached (unlike the permission keys):
   * it is read at most once per `/me`, so a cache round-trip would cost more than the
   * single indexed lookup it saves.
   */
  async getMonitoringScope(roleCode: string): Promise<MonitoringScope> {
    if (!roleCode) return MonitoringScope.NONE;
    const role = await this.roleRepo.findOne({ where: { code: roleCode } });
    return role?.monitoring_scope ?? MonitoringScope.NONE;
  }

  /** Drop the cached permission set for a role (call after editing its perms). */
  async invalidateRole(roleCode: string): Promise<void> {
    try {
      await this.redis.getClient().del(this.cacheKey(roleCode));
    } catch (err) {
      this.logger.warn(`invalidateRole(${roleCode}) failed: ${(err as Error).message}`);
    }
  }

  private async readCache(roleCode: string): Promise<string[] | null> {
    try {
      const raw = await this.redis.getClient().get(this.cacheKey(roleCode));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : null;
    } catch (err) {
      this.logger.warn(`readCache(${roleCode}) failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async writeCache(roleCode: string, keys: string[]): Promise<void> {
    try {
      await this.redis
        .getClient()
        .set(this.cacheKey(roleCode), JSON.stringify(keys), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`writeCache(${roleCode}) failed: ${(err as Error).message}`);
    }
  }
}
