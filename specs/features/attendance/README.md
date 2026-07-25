# Attendance

**Status:** ✅ Active · **Backend:** `activities` (clock events) · **Key ADRs:** ADR-002 (offline-first), ADR-005→010 (polygon geofencing), ADR-014 (overtime clock flow), **ADR-055 (punch-log model — planned)**

## Overview
Clock-in / clock-out with mandatory photo evidence and GPS validation against the assigned location's polygon. Works offline and syncs when connectivity returns.

## Key decisions
- **Soft polygon geofencing** (ADR-005→010) — replaced the hard 100 m radius; inside/near/outside is advisory, not blocking.
- **Offline-first** (ADR-002) — clock events queue locally (AsyncStorage) and sync.
- **Punch-log model — planned** ([ADR-055](../../architecture/decisions/ADR-055-punch-attendance-model.md), design locked, not started). Attendance re-bases from one open/closed `shifts` row to an **immutable log of punches**; a shift's session (Jam Masuk = first-in, Jam Keluar = last-out, hours = paired segments, open? = last punch is a clock-in) is **derived**, never stored. Unblocks unlimited clock-in, multi-shift, back-to-back, past-midnight, dangling, and ad-hoc from one rule, and preserves the ADR-050 presence contract (only `bertugas`'s source moves). A near-midnight **attribution window** (`early_window`/`cutoff_grace` = 1 h, per-shift) decides which shift a punch belongs to. **v1 is approval-free**; **Koreksi Kehadiran** (approval-gated correction) is deferred until correction-approver routing is resolved (needs schedule-derived rayon; satgas/linmas/korlap carry no `users.rayon_id`). Migration keeps `shifts` as a derived view during a reader-by-reader cutover.

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

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
