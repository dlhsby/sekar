# Overtime

**Status:** ✅ Active · **Backend:** `overtime` · **Key ADRs:** ADR-014 (overtime clock flow)

## Overview
Overtime request submission by field workers with a clock-in/clock-out flow, routed through a 3-level approval hierarchy.

## Key decisions
- **Overtime clock-in/out flow** (ADR-014) — overtime is a distinct shift flow, not a task.
- 3-level approval hierarchy (korlap → kepala_rayon → management, scoped by location/rayon).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Overtime list, submit, approve — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Overtime list, submit, detail (no approval) — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [work](../work/README.md)
- [scheduling](../scheduling/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
