# System

**Status:** ✅ Active · **Backend:** `health`, `audit`, `config`, `app-releases` · **Key ADRs:** ADR-015 (audit trail), ADR-061 (audit trail v2), ADR-027 (iOS build), ADR-028 (staging)

## Overview
Cross-cutting platform services: health/build-identity endpoint, generic entity audit trail, runtime client config, and app-release/versioning registry (in-app update checker + public Android download).

## Key decisions
- **Audit trail** (ADR-015 → ADR-061) — `audit_logs`, one table for everything.
  - **Automatic capture:** master data and accounts (`@Auditable`) are recorded in the same transaction as the change (fail-closed), with actor/role/name snapshots, field diff, IP, user agent, request id and reason.
  - **Explicit domain events:** approve/verify/reassign, `permissions_change`, `locations_change`, login/logout, `export`, `denied_write`.
  - **Tamper-evident:** append-only (guard trigger), with a SHA-256 hash chain sealed every minute. `GET /audit/verify` re-derives it.
  - **API:** `GET /audit` (filters: type, id, action, actor, role, outcome, date range, text), `GET /audit/export.csv`, `GET /audit/types`, `GET /audit/:type/:id`. All need `audit:read`, except operational timelines.
  - **Web UI:** planned (PR7).
- `GET /health/live` returns `{version,gitSha,builtAt}`; `GET /app-releases/latest` drives the mobile update checker.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** build footer (version · sha); download links — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Diagnostik update checker — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [notifications](../notifications/README.md)

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
