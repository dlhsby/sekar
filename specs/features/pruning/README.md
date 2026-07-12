# Pruning Requests

**Status:** ✅ Active · **Backend:** `pruning-requests` · **Key ADRs:** ADR-032 (admin_rayon disposition), ADR-033 (staff_kecamatan role), ADR-034 (cycle prediction), ADR-035 (service capacity), ADR-038 (workflow entry points)

## Overview
Perantingan (tree-pruning) intake and disposition. External `staff_kecamatan` users submit requests; `admin_rayon` disposes of them scoped by rayon. Requests tie into activities and service-capacity planning.

## Key decisions
- **External intake role** (ADR-033) — `staff_kecamatan` is non-clockable; submits pruning requests only.
- **Scoped disposition** (ADR-032) — `admin_rayon` gains narrow pruning-request disposition scoped by `users.rayon_id`; no `admin_rayon` role.
- **Workflow entry points & activity tagging** (ADR-038); **cycle prediction** (ADR-034); **capacity** (ADR-035).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Pruning review queue (admin), pruning-submit (kecamatan) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Submit, Review Queue, Perantingan list — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [plants](../plants/README.md)
- [work](../work/README.md)
- [auth](../auth/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
