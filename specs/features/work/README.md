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
- 2026-07-21 — **Scope-aware tasks & activities (ADR-046, backend).** Tasks and activities now carry a geographic **`scope`** (`city|district|region|location|none`, the shared `AssignmentScope` enum) that **follows the schedule assigned**, mirroring the monitoring drill tiers. **Task** gains `scope` + `region_id` (already had `location_id`/`district_id`): scope is **hybrid** — the creator may override it (`scope` + the matching id, validated) else it is **derived from the assignee's schedule occurrence** on the task date, else `none`. **Activity** gains `scope` + `district_id` + `region_id` + a `task_id` on the create DTO: an activity submitted **against a task** inherits that task's scope; otherwise it derives from the **active shift's** schedule occurrence; an unscheduled worker falls back to the shift's `location_id` (or `none`). **No-schedule workers are never blocked** — assignment, taking, and submission all succeed with `scope=none`. A **started (in-progress) task extends where its assignee renders on the monitoring map** (`display_scope`, deepest-wins). New `ScheduleScopeResolverService` (lean `ScheduleScopeModule`) is the write-side sibling of monitoring's `scheduleScopesForCurrentShift`. Dev uses TypeORM auto-sync; a prod migration for the new columns is a follow-up. Web/mobile form + display follow-ups tracked. Verify: be tsc/lint + full jest green (enum + resolver + task/activity derivation specs).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
