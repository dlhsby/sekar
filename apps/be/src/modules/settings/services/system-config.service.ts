import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import {
  SETTINGS_CATALOG,
  getCatalogEntry,
  coerceValue,
  ConfigValueType,
  SelectOption,
} from '../catalog/settings-catalog';
import { encryptSecret, decryptSecret, encryptionAvailable } from '../settings-encryption';

export interface SettingDescription {
  key: string;
  group: string;
  /** Optional sub-section within a group (SWAT-style). */
  subgroup?: string;
  valueType: ConfigValueType;
  isSecret: boolean;
  label: string;
  help?: string;
  source: 'db' | 'env' | 'unset';
  isSet: boolean;
  /** Effective value for non-secret keys only; omitted for secrets. */
  value?: string | number | boolean;
  /** Allowed options for `select` value types. */
  options?: SelectOption[];
}

/**
 * Resolves system settings with **DB override → env → code default** precedence
 * (ADR-049). DB overrides are cached in memory and reloaded on every write.
 * Secret values are AES-GCM encrypted at rest and never returned to the UI.
 *
 * Staging runs a single backend instance, so a local cache reloaded on write is
 * coherent. Multi-instance Redis pub/sub invalidation is a documented follow-up.
 */
@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);
  private cache = new Map<string, SystemConfig>();

  constructor(
    @InjectRepository(SystemConfig)
    private readonly repo: Repository<SystemConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reloadCache();
  }

  /** Effective typed value for a key, applying DB → env → default precedence. */
  resolve(key: string): string | number | boolean | undefined {
    const entry = getCatalogEntry(key);
    if (!entry) return undefined;

    const override = this.cache.get(key);
    if (override && override.value != null) {
      const raw = override.is_secret ? decryptSecret(override.value) : override.value;
      return coerceValue(raw, entry.valueType);
    }

    const envRaw = process.env[entry.envKey];
    if (envRaw !== undefined) {
      try {
        return coerceValue(envRaw, entry.valueType);
      } catch {
        this.logger.warn(`Env ${entry.envKey} has an invalid ${entry.valueType} value`);
      }
    }
    return entry.default;
  }

  /** Effective number for a key (DB → env → default); NaN-safe fallback. */
  getNumber(key: string, fallback = 0): number {
    const v = this.resolve(key);
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Effective boolean for a key (DB → env → default). */
  getBoolean(key: string, fallback = false): boolean {
    const v = this.resolve(key);
    if (typeof v === 'boolean') return v;
    if (v === 'true') return true;
    if (v === 'false') return false;
    return fallback;
  }

  /** Effective string for a key (DB → env → default). */
  getString(key: string, fallback?: string): string | undefined {
    const v = this.resolve(key);
    return v == null ? fallback : String(v);
  }

  /** All catalog keys with their source + (non-secret) effective value. */
  describeAll(): SettingDescription[] {
    return SETTINGS_CATALOG.map((entry) => {
      const override = this.cache.get(entry.key);
      const hasEnv = process.env[entry.envKey] !== undefined;
      const source: SettingDescription['source'] = override ? 'db' : hasEnv ? 'env' : 'unset';
      const desc: SettingDescription = {
        key: entry.key,
        group: entry.group,
        subgroup: entry.subgroup,
        valueType: entry.valueType,
        isSecret: entry.isSecret,
        label: entry.label,
        help: entry.help,
        source,
        isSet: source !== 'unset',
        options: entry.options,
      };
      if (!entry.isSecret) {
        desc.value = this.resolve(entry.key);
      }
      return desc;
    });
  }

  async set(key: string, rawValue: string, actorId?: string): Promise<SettingDescription> {
    const entry = getCatalogEntry(key);
    if (!entry) throw new NotFoundException(`Unknown setting: ${key}`);

    // Validate the type before persisting.
    try {
      coerceValue(rawValue, entry.valueType);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    // A select must be one of its declared options.
    if (
      entry.valueType === 'select' &&
      entry.options &&
      !entry.options.some((o) => o.value === rawValue)
    ) {
      throw new BadRequestException(
        `Invalid value '${rawValue}' for ${key}; expected one of: ${entry.options.map((o) => o.value).join(', ')}`,
      );
    }

    let stored = rawValue;
    if (entry.isSecret) {
      if (!encryptionAvailable()) {
        throw new BadRequestException(
          'Cannot store a secret setting: SETTINGS_ENCRYPTION_KEY is not configured',
        );
      }
      stored = encryptSecret(rawValue);
    }

    await this.repo
      .createQueryBuilder()
      .insert()
      .into(SystemConfig)
      .values({
        key,
        value: stored,
        is_secret: entry.isSecret,
        value_type: entry.valueType,
        config_group: entry.group,
        updated_by: actorId,
      })
      .orUpdate(['value', 'is_secret', 'value_type', 'config_group', 'updated_by'], ['key'])
      .execute();

    await this.reloadCache();
    return this.describeAll().find((d) => d.key === key)!;
  }

  async clear(key: string): Promise<SettingDescription> {
    const entry = getCatalogEntry(key);
    if (!entry) throw new NotFoundException(`Unknown setting: ${key}`);
    await this.repo.delete({ key });
    await this.reloadCache();
    return this.describeAll().find((d) => d.key === key)!;
  }

  private async reloadCache(): Promise<void> {
    try {
      const rows = await this.repo.find();
      this.cache = new Map(rows.map((r) => [r.key, r]));
    } catch (err) {
      this.logger.warn(`reloadCache failed: ${(err as Error).message}`);
    }
  }
}
