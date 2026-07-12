import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SystemConfig } from '../entities/system-config.entity';
import { AuditLogService } from '../../audit/audit.service';
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
  /** Optional sub-section within a group. */
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
  /** Inclusive bounds for `number` values (from the catalog). */
  min?: number;
  max?: number;
}

/** Event emitted after a system-setting write/clear so dependent caches
 * (e.g. monitoring thresholds) can invalidate immediately instead of waiting
 * out their TTL. */
export const SETTINGS_CHANGED_EVENT = 'settings.changed';

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
    private readonly events: EventEmitter2,
    private readonly auditLog: AuditLogService,
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
        min: entry.min,
        max: entry.max,
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
    let typedValue: string | number | boolean;
    try {
      typedValue = coerceValue(rawValue, entry.valueType);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    // Numeric bounds from the catalog — security-critical knobs (rate limits,
    // thresholds) must never be settable to disabling/nonsensical values.
    if (entry.valueType === 'number' && typeof typedValue === 'number') {
      if (entry.min !== undefined && typedValue < entry.min) {
        throw new BadRequestException(`${key} must be at least ${entry.min}`);
      }
      if (entry.max !== undefined && typedValue > entry.max) {
        throw new BadRequestException(`${key} must be at most ${entry.max}`);
      }
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

    const previous = this.cache.get(key);
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
    this.events.emit(SETTINGS_CHANGED_EVENT, { key, group: entry.group });
    await this.recordAudit('update', key, this.cache.get(key)?.id, actorId, {
      // Never persist secret material in the audit trail — mask both sides.
      old_value: previous ? { value: entry.isSecret ? '***' : previous.value } : null,
      new_value: { value: entry.isSecret ? '***' : rawValue },
    });
    return this.describeAll().find((d) => d.key === key)!;
  }

  async clear(key: string, actorId?: string): Promise<SettingDescription> {
    const entry = getCatalogEntry(key);
    if (!entry) throw new NotFoundException(`Unknown setting: ${key}`);
    const previous = this.cache.get(key);
    await this.repo.delete({ key });
    await this.reloadCache();
    this.events.emit(SETTINGS_CHANGED_EVENT, { key, group: entry.group });
    if (previous) {
      await this.recordAudit('delete', key, previous.id, actorId, {
        old_value: { value: entry.isSecret ? '***' : previous.value },
        new_value: null,
      });
    }
    return this.describeAll().find((d) => d.key === key)!;
  }

  /** Best-effort change audit (ADR-015). audit_logs.entity_id is a uuid, so the
   * config row's id anchors the entry and the human-readable key travels in
   * metadata. */
  private async recordAudit(
    action: 'update' | 'delete',
    key: string,
    rowId: string | undefined,
    actorId: string | undefined,
    values: {
      old_value: Record<string, unknown> | null;
      new_value: Record<string, unknown> | null;
    },
  ): Promise<void> {
    if (!actorId) return; // audit_logs.actor_id is a required FK
    if (!rowId) return; // no row to anchor to (shouldn't happen post-write)
    try {
      await this.auditLog.log({
        entity_type: 'system_config',
        entity_id: rowId,
        action,
        actor_id: actorId,
        old_value: values.old_value,
        new_value: values.new_value,
        metadata: { key },
      });
    } catch {
      // Non-fatal: the mutation already succeeded.
    }
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
