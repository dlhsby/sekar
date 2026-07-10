# System

**Status:** ✅ Active · **Backend:** `health`, `audit`, `config`, `app-releases` · **Key ADRs:** ADR-015 (audit trail), ADR-027 (iOS build), ADR-028 (staging)

## Overview
Cross-cutting platform services: health/build-identity endpoint, generic entity audit trail, runtime client config, and app-release/versioning registry (in-app update checker + public Android download).

## Key decisions
- **Audit trail** (ADR-015) — generic per-entity change log; **backend-only** (no UI).
- `GET /health/live` returns `{version,gitSha,builtAt}`; `GET /app-releases/latest` drives the mobile update checker.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** build footer (version · sha); download links — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Diagnostik update checker — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [notifications](../notifications/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
