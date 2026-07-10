# Work Items (Tasks & Activities)

**Status:** ✅ Active · **Backend:** `tasks`, `activities`, `activity-types` · **Key ADRs:** ADR-010 (activity/schedule terminology), ADR-031 (task typing)

## Overview
Typed **tasks** assigned to workers and **activities** (the canonical work record) logged with media. Activity types classify work; task types carry structured `custom_fields`.

## Key decisions
- **Task typing** (ADR-031) — `task_type` enum + JSONB `custom_fields` for flexible per-type schemas (registry validator is a known gap).
- **Activity as canonical work record** (ADR-010) — replaced the old `Report` entity.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Tasks (list/detail/create), Activities (list/detail) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Tasks, Task create/detail, Activities, Activity submission — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [attendance](../attendance/README.md)
- [pruning](../pruning/README.md)
- [overtime](../overtime/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
