# Settings

**Status:** 🚧 Planned (UAT revamp) · **Backend:** `settings`, `system` · **Key ADRs:** ADR-049 (settings architecture), ADR-044 (permissions)

## Overview
A dedicated Settings surface split into **Personal preferences** (per-user: language, theme, notifications) and **System settings** (global, catalog-driven, grouped: monitoring thresholds, integration knobs, limits, general toggles). Absorbs today's scattered `monitoring/config` + `system/config`. System settings can override env-driven defaults at runtime; bootstrap/infra secrets stay in the dotenvx pipeline.

## Key decisions
- **Personal vs system split** (ADR-049) — personal is self-service (`PATCH /me/preferences`); system is `settings:manage`-gated, `settings:read` to view.
- **Catalog-driven** — one code-side catalog defines each key's group, `value_type`, `is_secret`, env mapping, label, validation; drives backend resolution + UI.
- **Override precedence** — DB override → env var → code default; boot-time preseed copies env → DB; UI shows per-key `source` (db/env/unset) + staged edits with revert/undo, save per group.
- **Secrets** — allow-listed `is_secret` overrides encrypted (AES-256-GCM), masked in API; core secrets (JWT/DB/AWS/dotenvx keys) never in the catalog.
- **Management is read-only** on system settings; `admin_system`/`superadmin` edit them. Redis pub/sub keeps instances coherent; changes audited (ADR-015).

## Implementation
- **API:** `GET/PATCH/DELETE` system settings; `PATCH /me/preferences` — [`../../api/contracts.md`](../../api/contracts.md)
- **Database:** typed key/value (`key`, `value`, `value_type`, `is_secret`, `group`) + user preference columns — [`../../database/schema.md`](../../database/schema.md)
- **Web:** Settings page (Personal + System tabs; grouped master/detail with source badges) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Secrets:** [`../../deployment/encrypted-secrets.md`](../../deployment/encrypted-secrets.md)

## Related features
- [access-control](../access-control/README.md) · [system](../system/README.md) · [monitoring](../monitoring/README.md)

## Changelog
- 2026-07-12 — **Area→Location terminology sweep.** No entity references found in settings feature.
- 2026-07-11 — **Every settings card is titled + fully localized.** Each catalog setting now has a **sub-group** (`thresholds`/`geofence`/`roster`/`push`/`maps`/`ratelimit`/`app`) so System always renders titled sub-group cards (no untitled/empty-title cards; the flat fallback branch removed). Personal cards titled too: Tampilan & Bahasa → **Tampilan** + **Bahasa** cards, Notifikasi → **Preferensi Notifikasi**, Akun & Keamanan → **Profil** + **Keamanan**. **Setting labels + help are now localized on the web** (`settings:system.labels.*` / `settings:system.help.*`, id+en, keyed by setting key, backend catalog string as fallback) — fixes Indonesian labels showing in English mode; all 16 settings have label + help in both locales. **Deep-link:** the profile page's "Ubah di Pengaturan" opens `/settings?section=account` and lands on **Akun & Keamanan**. Reviewed (correctness/completeness/dead-code) + verified live.
- 2026-07-11 — **Settings now take effect at runtime.** `SystemConfigService` gained typed resolvers (`getNumber/getBoolean/getString`) and its consumers were wired to resolve **DB→env→default at use-time**: monitoring **thresholds + geofencing unified** out of the old `monitoring_config` JSON (its cache loaders now read `SystemConfigService`; `/monitoring/config` hides those two sections, kept for map/alerts/ping), plus missing/staffing sweepers + min-shift-duration. **Bootstrap knobs made runtime:** `AppThrottlerGuard` resolves login/change-password/global rate limits per request (route `@Throttle` never clobbered); FCM gains a runtime **kill-switch** at send time (`fcm.enabled`). New settings: active-age/inactive/location-ping thresholds, geofence grace, min-shift, change-password throttle; `app.default_locale` is now a **`select`** (new value type, end-to-end) — fixes the free-text locale input. Sub-group sections + per-group "N setelan" count in the rail.
- 2026-07-11 — **Both tabs standardized**: Save/**Reset** live at the **top** of each panel (header), matching System. Personal groups: **Tampilan & Bahasa** (theme + language select), **Notifikasi**, **Akun & Keamanan**. Profile editing (photo, name, **username**, phone) moved into Akun & Keamanan (`PATCH /users/me` now accepts `username`); the **profile page is read-only** (links to Settings). **Change password** is a **separate modal** and requires the **current password** for the voluntary flow (the admin-forced first-login reset still needs no old password).
- 2026-07-11 — Settings reduced to **two areas**: Personal (identity, appearance, language, notifications) + System. Change-password removed (lives in profile). System settings use a **master/detail** two-column layout (group rail + detail).
- 2026-07-10 — Backend landed (Phase 1): `settings` module — `system_config` table + migration, catalog-driven `SystemConfigService` (DB→env→default, AES-GCM secrets, masking), `GET/PATCH/DELETE /settings` (`settings:read`/`settings:manage`) + `GET/PATCH /me/preferences` (+ `users.preference_theme`). Multi-instance Redis pub/sub coherence + boot preseed deferred (single-instance staging). `SETTINGS_ENCRYPTION_KEY` optional (required only to store secret overrides). Web Settings page pending.
- 2026-07-10 — Spec created for UAT settings revamp (ADR-049). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
