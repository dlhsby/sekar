/**
 * System-settings catalog (ADR-049) — the single source of truth for every
 * settable key: its group, sub-group, value type, secret flag, env mapping,
 * label, default, and (for selects) options. Drives backend resolution
 * (DB → env → default) and the UI.
 *
 * Bootstrap/infra secrets (JWT, DB, AWS, dotenvx keys) are deliberately NOT here
 * — they stay in the encrypted env pipeline. Only allow-listed operational knobs
 * are runtime-overridable.
 *
 * NOTE (wiring gap): overrides are persisted + resolvable via SystemConfigService,
 * but most runtime consumers still read `process.env` directly. Wiring each
 * consumer to `resolve()` is a documented follow-up; a setting only takes effect
 * at runtime once its consumer is migrated.
 */

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'select';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SettingsCatalogEntry {
  key: string;
  group: string;
  /** Optional sub-section within a group. */
  subgroup?: string;
  valueType: ConfigValueType;
  isSecret: boolean;
  /** process.env name this key overrides (resolution falls back to it). */
  envKey: string;
  label: string;
  help?: string;
  /** Code default when neither DB override nor env is set. */
  default?: string | number | boolean;
  /** Inclusive bounds for `number` values — enforced on write so operators
   * cannot set security-critical knobs (rate limits, thresholds) to
   * nonsensical/disabling values. */
  min?: number;
  max?: number;
  /** Allowed options for `select` value types. */
  options?: SelectOption[];
}

export const SETTINGS_CATALOG: SettingsCatalogEntry[] = [
  // ── Pemantauan & Geofence (monitoring) ────────────────────────────────────
  // Canonical monitoring thresholds — the single source of truth for status
  // calculation (was the monitoring_config `status_thresholds`/`geofencing`
  // JSON, now unified here; the cache loaders read these).
  {
    key: 'monitoring.active_max_age_sec',
    group: 'monitoring',
    subgroup: 'thresholds',
    valueType: 'number',
    isSecret: false,
    envKey: 'MONITORING_ACTIVE_MAX_AGE_SEC',
    label: 'Usia maksimum status aktif (detik)',
    help: 'Usia lokasi terakhir agar petugas masih dihitung aktif',
    default: 300,
    min: 10,
    max: 86400,
  },
  {
    key: 'monitoring.inactive_threshold_sec',
    group: 'monitoring',
    subgroup: 'thresholds',
    valueType: 'number',
    isSecret: false,
    envKey: 'MONITORING_INACTIVE_THRESHOLD_SEC',
    label: 'Ambang batas tidak aktif (detik)',
    help: 'Usia lokasi terakhir sebelum status berubah aktif → tidak aktif',
    default: 900,
    min: 10,
    max: 86400,
  },
  {
    key: 'monitoring.missing_threshold_sec',
    group: 'monitoring',
    subgroup: 'thresholds',
    valueType: 'number',
    isSecret: false,
    // Fresh envKey (not the sweeper's legacy MISSING_THRESHOLD_SECONDS) so the
    // unified default is the status-calc's 3600, not the sweeper's old 900.
    envKey: 'MONITORING_MISSING_THRESHOLD_SEC',
    label: 'Ambang batas hilang (detik)',
    help: 'Usia lokasi terakhir sebelum status berubah menjadi hilang (dipakai kalkulator status + penyapu latar)',
    default: 3600,
    min: 60,
    max: 604800,
  },
  {
    key: 'monitoring.location_ping_interval_sec',
    group: 'monitoring',
    subgroup: 'thresholds',
    valueType: 'number',
    isSecret: false,
    envKey: 'MONITORING_LOCATION_PING_INTERVAL_SEC',
    label: 'Interval ping lokasi (detik)',
    default: 60,
    min: 5,
    max: 3600,
  },
  {
    key: 'monitoring.staffing_debounce_sec',
    group: 'monitoring',
    subgroup: 'thresholds',
    valueType: 'number',
    isSecret: false,
    envKey: 'STAFFING_DEBOUNCE_SECONDS',
    label: 'Debounce peringatan understaffed (detik)',
    help: 'Jeda tenang sebelum peringatan kekurangan petugas dikirim',
    default: 30,
    min: 0,
    max: 3600,
  },
  {
    key: 'geofence.tolerance_m',
    group: 'monitoring',
    subgroup: 'geofence',
    valueType: 'number',
    isSecret: false,
    envKey: 'GEOFENCE_TOLERANCE_M',
    label: 'Toleransi batas geofence (meter)',
    default: 50,
    min: 0,
    max: 10000,
  },
  {
    key: 'geofence.outside_area_grace_sec',
    group: 'monitoring',
    subgroup: 'geofence',
    valueType: 'number',
    isSecret: false,
    envKey: 'GEOFENCE_OUTSIDE_AREA_GRACE_SEC',
    label: 'Tenggang di luar area (detik)',
    help: 'Berapa lama petugas boleh di luar batas sebelum ditandai keluar area',
    default: 120,
    min: 0,
    max: 86400,
  },

  // ── Penjadwalan (scheduling) ──────────────────────────────────────────────
  {
    key: 'schedule.materialization_days',
    group: 'scheduling',
    subgroup: 'roster',
    valueType: 'number',
    isSecret: false,
    envKey: 'SCHEDULE_MATERIALIZATION_DAYS',
    label: 'Horizon materialisasi jadwal (hari)',
    help: 'Berapa hari ke depan jadwal berulang dibuat (ADR-047)',
    default: 30,
    min: 1,
    max: 90,
  },
  {
    key: 'schedule.min_shift_duration_min',
    group: 'scheduling',
    subgroup: 'roster',
    valueType: 'number',
    isSecret: false,
    envKey: 'MINIMUM_SHIFT_DURATION_MINUTES',
    label: 'Durasi shift minimum (menit)',
    default: 5,
    min: 1,
    max: 1440,
  },

  // ── Integrasi (integrations) ──────────────────────────────────────────────
  {
    key: 'fcm.enabled',
    group: 'integrations',
    subgroup: 'push',
    valueType: 'boolean',
    isSecret: false,
    envKey: 'FCM_ENABLED',
    label: 'Aktifkan push notification (FCM)',
    default: false,
  },
  {
    key: 'maps.browser_key',
    group: 'integrations',
    subgroup: 'maps',
    valueType: 'string',
    isSecret: true,
    envKey: 'GOOGLE_MAPS_API_KEY',
    label: 'Google Maps browser key',
    help: 'Kunci Maps untuk web; disimpan terenkripsi',
  },
  {
    key: 'maps.map_id',
    group: 'integrations',
    subgroup: 'maps',
    valueType: 'string',
    isSecret: false,
    envKey: 'GOOGLE_MAPS_MAP_ID',
    label: 'Google Maps Map ID',
    help: 'Map ID (vektor) dari Google Cloud — wajib untuk Advanced Markers',
  },

  // ── Keamanan & Batas (limits) ─────────────────────────────────────────────
  {
    key: 'ratelimit.global_per_min',
    group: 'limits',
    subgroup: 'ratelimit',
    valueType: 'number',
    isSecret: false,
    envKey: 'RATE_LIMIT_GLOBAL_PER_MIN',
    label: 'Batas permintaan global / menit',
    default: 100,
    min: 1,
    max: 100000,
  },
  {
    key: 'ratelimit.login_per_min',
    group: 'limits',
    subgroup: 'ratelimit',
    valueType: 'number',
    isSecret: false,
    envKey: 'RATE_LIMIT_LOGIN_PER_MIN',
    label: 'Batas percobaan login / menit',
    default: 5,
    min: 1,
    max: 1000,
  },
  {
    key: 'auth.change_password_throttle_max',
    group: 'limits',
    subgroup: 'ratelimit',
    valueType: 'number',
    isSecret: false,
    envKey: 'AUTH_CHANGE_PASSWORD_THROTTLE_LIMIT',
    label: 'Batas percobaan ganti sandi',
    default: 3,
    min: 1,
    max: 100,
  },
  {
    key: 'auth.change_password_throttle_ttl_ms',
    group: 'limits',
    subgroup: 'ratelimit',
    valueType: 'number',
    isSecret: false,
    envKey: 'AUTH_CHANGE_PASSWORD_THROTTLE_TTL',
    label: 'Jendela throttle ganti sandi (ms)',
    default: 60000,
    min: 1000,
    max: 86400000,
  },

  // ── Umum (general) ────────────────────────────────────────────────────────
  {
    key: 'app.default_locale',
    group: 'general',
    subgroup: 'app',
    valueType: 'select',
    isSecret: false,
    envKey: 'DEFAULT_LOCALE',
    label: 'Bahasa default aplikasi',
    default: 'id',
    options: [
      { value: 'id', label: 'Indonesia' },
      { value: 'en', label: 'English' },
    ],
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
    // Number('') and Number('   ') are 0 — reject blanks explicitly.
    if (raw.trim() === '') throw new Error(`Expected a number, got an empty value`);
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`Expected a number, got '${raw}'`);
    return n;
  }
  // string | select → passthrough (select membership is validated against options
  // in SystemConfigService.set, which has the catalog entry).
  return raw;
}
