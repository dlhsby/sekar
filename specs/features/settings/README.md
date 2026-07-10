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
- 2026-07-10 — Spec created for UAT settings revamp (ADR-049). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
