# Plants

**Status:** ✅ Active · **Backend:** `plants`, `plant-seeds` · **Key ADRs:** ADR-030 (area-aggregate inventory), ADR-034 (pruning-cycle prediction)

## Overview
Per-area plant inventory kept as an area aggregate (counts + notable species), feeding pruning-cycle prediction. Plant **seeds** inventory exists but its web UI is parked.

## Key decisions
- **Area-aggregate plant inventory** (ADR-030) — plants tracked as per-area aggregates with notable-plant records, not per-individual.
- **Pruning-cycle prediction** (ADR-034) — species × area_type lookup (no ML, manual override).
- 🅿️ `plant-seeds` web UI is **parked** (nav hidden) — see [_archived](../_archived/README.md).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Plants catalog per area (seeds page hidden) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** plant context; seeds screen — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [pruning](../pruning/README.md)
- [geography](../geography/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
