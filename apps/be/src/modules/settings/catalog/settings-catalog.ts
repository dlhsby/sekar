/**
 * System-settings catalog (ADR-049) — the single source of truth for every
 * settable key: its group, value type, secret flag, env mapping, label, default,
 * and validation. Drives backend resolution (DB → env → default) and the UI.
 *
 * Bootstrap/infra secrets (JWT, DB, AWS, dotenvx keys) are deliberately NOT here
 * — they stay in the encrypted env pipeline. Only allow-listed operational knobs
 * are runtime-overridable.
 */

export type ConfigValueType = 'string' | 'number' | 'boolean';

export interface SettingsCatalogEntry {
  key: string;
  group: string;
  valueType: ConfigValueType;
  isSecret: boolean;
  /** process.env name this key overrides (resolution falls back to it). */
  envKey: string;
  label: string;
  help?: string;
  /** Code default when neither DB override nor env is set. */
  default?: string | number | boolean;
}

export const SETTINGS_CATALOG: SettingsCatalogEntry[] = [
  {
    key: 'monitoring.idle_threshold_min',
    group: 'monitoring',
    valueType: 'number',
    isSecret: false,
    envKey: 'MONITORING_IDLE_THRESHOLD_MIN',
    label: 'Ambang batas idle (menit)',
    help: 'Waktu tanpa lokasi sebelum status berubah aktif → tidak aktif',
    default: 5,
  },
  {
    key: 'monitoring.offline_threshold_min',
    group: 'monitoring',
    valueType: 'number',
    isSecret: false,
    envKey: 'MONITORING_OFFLINE_THRESHOLD_MIN',
    label: 'Ambang batas offline (menit)',
    default: 15,
  },
  {
    key: 'schedule.materialization_days',
    group: 'monitoring',
    valueType: 'number',
    isSecret: false,
    envKey: 'SCHEDULE_MATERIALIZATION_DAYS',
    label: 'Horizon materialisasi jadwal (hari)',
    help: 'Berapa hari ke depan jadwal berulang dibuat (ADR-047)',
    default: 30,
  },
  {
    key: 'geofence.default_radius_m',
    group: 'geofence',
    valueType: 'number',
    isSecret: false,
    envKey: 'GEOFENCE_DEFAULT_RADIUS_M',
    label: 'Radius geofence default (meter)',
    default: 100,
  },
  {
    key: 'geofence.tolerance_m',
    group: 'geofence',
    valueType: 'number',
    isSecret: false,
    envKey: 'GEOFENCE_TOLERANCE_M',
    label: 'Toleransi batas geofence (meter)',
    default: 100,
  },
  {
    key: 'fcm.enabled',
    group: 'integrations',
    valueType: 'boolean',
    isSecret: false,
    envKey: 'FCM_ENABLED',
    label: 'Aktifkan push notification (FCM)',
    default: false,
  },
  {
    key: 'maps.browser_key',
    group: 'integrations',
    valueType: 'string',
    isSecret: true,
    envKey: 'GOOGLE_MAPS_API_KEY',
    label: 'Google Maps browser key',
    help: 'Kunci Maps untuk web; disimpan terenkripsi',
  },
  {
    key: 'ratelimit.global_per_min',
    group: 'limits',
    valueType: 'number',
    isSecret: false,
    envKey: 'RATE_LIMIT_GLOBAL_PER_MIN',
    label: 'Batas permintaan global / menit',
    default: 100,
  },
  {
    key: 'ratelimit.login_per_min',
    group: 'limits',
    valueType: 'number',
    isSecret: false,
    envKey: 'RATE_LIMIT_LOGIN_PER_MIN',
    label: 'Batas percobaan login / menit',
    default: 5,
  },
  {
    key: 'app.default_locale',
    group: 'general',
    valueType: 'string',
    isSecret: false,
    envKey: 'DEFAULT_LOCALE',
    label: 'Bahasa default aplikasi',
    default: 'id',
  },
];

const BY_KEY = new Map<string, SettingsCatalogEntry>(SETTINGS_CATALOG.map((e) => [e.key, e]));

export function getCatalogEntry(key: string): SettingsCatalogEntry | undefined {
  return BY_KEY.get(key);
}

/** Coerce a raw string to its typed value; throws on invalid input. */
export function coerceValue(raw: string, type: ConfigValueType): string | number | boolean {
  if (type === 'boolean') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    throw new Error(`Expected 'true' or 'false', got '${raw}'`);
  }
  if (type === 'number') {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`Expected a number, got '${raw}'`);
    return n;
  }
  return raw;
}
