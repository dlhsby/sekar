# Attendance

**Status:** ✅ Active · **Backend:** `activities` (clock events) · **Key ADRs:** ADR-002 (offline-first), ADR-005→010 (polygon geofencing), ADR-014 (overtime clock flow)

## Overview
Clock-in / clock-out with mandatory photo evidence and GPS validation against the assigned location's polygon. Works offline and syncs when connectivity returns.

## Key decisions
- **Soft polygon geofencing** (ADR-005→010) — replaced the hard 100 m radius; inside/near/outside is advisory, not blocking.
- **Offline-first** (ADR-002) — clock events queue locally (AsyncStorage) and sync.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** attendance/activity log views — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Clock In/Out, Attendance list & detail — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [scheduling](../scheduling/README.md)
- [monitoring](../monitoring/README.md)
- [work](../work/README.md)

## Changelog
- 2026-07-12 — **Area→Location terminology sweep.** Renamed "assigned location's polygon".
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
