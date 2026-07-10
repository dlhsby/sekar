# ADR-049: Settings Architecture — Personal Preferences vs System Settings

## Status

Accepted — **New**

## Date

2026-07-10

## Context

Configuration today is scattered: a `monitoring/config` endpoint (staffing thresholds, notification toggles), a generic `system/config`, and per-user fields like `preferred_language`. There is no coherent Settings surface. UAT wants a **dedicated Settings area split into personal preferences and system settings**, with grouped/sub-grouped sections — including system knobs that behave like environment overrides that operators can edit at runtime.

## Decision

Model Settings as two clearly separated domains, each rendered as grouped sections. System settings are **catalog-driven**: a single code-side catalog is the source of truth for every key's group, value type, secret flag, env mapping, label, help text, and validation — driving both backend resolution and the UI.

### Personal preferences (per user)

Self-service, scoped to the caller: language (`preferred_language`), theme, notification preferences. Backed by user columns; edited via `PATCH /me/preferences`. Every authenticated role may edit their own; `null` = follow system default.

### System settings (global)

Operator-managed, grouped/sub-grouped, e.g. **Monitoring** (staffing thresholds, idle/offline timings, day-type — absorbs `monitoring/config`), **Integrations** (FCM/maps/webhook knobs), **Limits** (rate-limit tuning, geofence defaults), **General** toggles.

Stored as a typed key/value table: `key`, `value`, `value_type` (`string|number|boolean`), `is_secret`, `group`, `updated_by`. Read through a cached settings service; edited with `settings:manage`, viewed with `settings:read` ([ADR-044](./ADR-044-dynamic-rbac.md)). `admin_system`/`superadmin` manage system settings; `top_management` (Management) is **read-only** on them per UAT.

Representative catalog (the full list lives in the code-side catalog; this shows shape + coverage):

| group | key | type | env mapping | secret | note |
|---|---|---|---|---|---|
| monitoring | `monitoring.idle_threshold_min` | number | `MONITORING_IDLE_THRESHOLD_MIN` | no | active→inactive cutoff |
| monitoring | `monitoring.offline_threshold_min` | number | `MONITORING_OFFLINE_THRESHOLD_MIN` | no | inactive→offline cutoff |
| monitoring | `schedule.materialization_days` | number | `SCHEDULE_MATERIALIZATION_DAYS` | no | rolling horizon (ADR-047) |
| geofence | `geofence.default_radius_m` | number | `GEOFENCE_DEFAULT_RADIUS_M` | no | fallback area radius |
| geofence | `geofence.tolerance_m` | number | `GEOFENCE_TOLERANCE_M` | no | soft-boundary tolerance (ADR-010) |
| integrations | `fcm.enabled` | boolean | `FCM_ENABLED` | no | push on/off |
| integrations | `maps.browser_key` | string | `GOOGLE_MAPS_BROWSER_KEY` | **yes** | client Maps key |
| limits | `ratelimit.global_per_min` | number | `RATE_LIMIT_GLOBAL_PER_MIN` | no | global throttle |
| limits | `ratelimit.login_per_min` | number | `RATE_LIMIT_LOGIN_PER_MIN` | no | login throttle |
| general | `app.default_locale` | string | `DEFAULT_LOCALE` | no | id/en default |

### Precedence & env override

Effective value resolves **DB override → env var → code default**. On boot, a one-time idempotent **preseed** copies current env values into the table so a fresh deploy shows its real config in the UI. Clearing a key deletes its row → falls back to env/default. The UI shows each key's `source` (`db` / `env` / `unset`) plus a `staged` state for unsaved edits, with revert-to-env and undo controls; **save is per group**. Staged edits are **client-side only** (form state, no API call until Save); Save issues a `PATCH` per changed key. Concurrency is **last-write-wins** with `updated_by`/`updated_at` recorded and audited (ADR-015) — acceptable for a small operator group; no draft rows or locking.

### Secrets

`is_secret` values (integration keys/tokens that operators may override) are **encrypted at rest** (AES-256-GCM) and never returned to the UI (masked; write-only). **Bootstrap/infra secrets** — `JWT_SECRET`, DB/AWS creds, dotenvx private keys — are **not** part of the settings catalog; they stay in the dotenvx-encrypted env pipeline ([encrypted-secrets](../../deployment/encrypted-secrets.md)). Only an explicitly allow-listed catalog is overridable.

### Cache coherence

The settings service caches DB overrides in memory; writes publish to a Redis channel so all instances reload (with a periodic fallback reload), reusing the existing Redis layer (ADR-016).

## Consequences

### Positive
- One coherent Settings surface; clear personal-vs-system boundary; catalog keeps backend + UI in lockstep.
- Safe runtime env overrides without redeploys; fresh deploys self-document via preseed.
- Multi-instance safe via Redis-published invalidation.

### Negative
- The catalog + precedence + preseed + encryption layer is real machinery to build and maintain.
- An allow-list must be curated so overrides never shadow bootstrap secrets or unsafe env.

### Security
- Bootstrap/infra secrets stay in dotenvx; only allow-listed operational keys are settable.
- `is_secret` values AES-256-GCM encrypted, masked in API responses; all writes audited (ADR-015).
- `settings:*` permission-gated; Management is denied system-setting writes.

## Alternatives Considered
1. **Keep scattered `*/config` endpoints.** Rejected — no coherent UX, no personal/system split.
2. **Store everything (incl. secrets) in the DB settings table.** Rejected — breaks the encrypted-secrets model and widens the secret-leak surface.

## References
- [ADR-044](./ADR-044-dynamic-rbac.md) — `settings:read` / `settings:manage` permissions, Management read-only
- [ADR-015](./ADR-015-audit-trail.md) — settings changes audited
- Encrypted secrets: `../../deployment/encrypted-secrets.md`
- Feature spec: `../../features/settings/README.md`
