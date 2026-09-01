# Attendance

**Status:** ✅ Active · **Backend:** `activities` (clock events) · **Key ADRs:** ADR-002 (offline-first), ADR-005→010 (polygon geofencing), ADR-014 (overtime clock flow), **ADR-055 (punch-log model — planned)**, ADR-059 (location integrity)

## Overview
Clock-in / clock-out with **optional** photo evidence and GPS validation against the assigned location's polygon. Works offline and syncs when connectivity returns.

## Key decisions
- **Soft polygon geofencing** (ADR-005→010) — replaced the hard 100 m radius; inside/near/outside is advisory, not blocking.
- **Missing and forged location ARE blocked; out-of-area never is** ([ADR-059](../../architecture/decisions/ADR-059-location-integrity.md)). A punch is refused only for `(0,0)` (the shape a missing fix actually takes), a mock-provider report, or an implied speed no vehicle could reach — each with its own error code so the app can name the remedy. Poor accuracy is flagged, never rejected: it is the tree-canopy case, and rejecting it would hand a spoofer the perfect excuse. The client's `is_mocked` is treated as sufficient evidence to refuse but never as evidence to trust, so the geometric checks run whatever it claims. A dev override (`ALLOW_MOCK_LOCATION` on mobile, `ALLOW_MOCKED_LOCATION` on the backend) keeps an emulator usable — both fail closed and the backend's is ignored in production. Setup: [local-development.md](../../deployment/local-development.md#mobile-app-react-native).
- **"Open" is not "live."** A session with no clock-out stays open for a supervisor to resolve, but stops answering *"am I on duty?"* once its shift window plus `cutoff_grace_min` has passed (`isShiftWindowClosed`, shared with the absence sweep and the monitoring session sweep). Conflating the two put yesterday's Jam Masuk on today's card, defaulted the hub to Clock Out on a 25-hour session, and left 302 forgotten clock-outs rendering as live workers on the monitoring map.
- **Pre-punch confirmation, never a gate** — since nothing blocks a punch and there is no approval step, the worker is *told* what is about to be recorded: one dialog listing every applicable reason (outside area · terlambat · shift window closed · pulang cepat · tanpa jadwal → not counted in monitoring), then "Kehadiran tetap dicatat". Rules are pure in `apps/mobile/src/utils/punchWarnings.ts`; copy lives in `attendance:punchConfirm.*`. Cancelling abandons the punch — it never submits silently.
- **Offline-first** (ADR-002) — clock events queue locally (AsyncStorage) and sync.
- **Punch-log model — Phase 1 landed (backend)** ([ADR-055](../../architecture/decisions/ADR-055-punch-attendance-model.md)). Attendance re-bases from one open/closed `shifts` row to an **immutable log of punches** (`attendance_punches`); a shift's session (Jam Masuk = first-in, Jam Keluar = last-out, hours = paired segments, open? = last punch is a clock-in) is **derived**, never stored. Unblocks unlimited clock-in, multi-shift, back-to-back, past-midnight, dangling, and ad-hoc from one rule, and preserves the ADR-050 presence contract (only `bertugas`'s source moves). A near-midnight **attribution window** (`early_window`/`cutoff_grace` = 1 h, per-shift) decides which shift a punch belongs to *(Phase 2)*. **v1 is approval-free**, and **Koreksi Kehadiran is dropped** (2026-07-28) — an approval-gated correction has no assignable approver, so it is out of scope rather than pending. A punch is immutable and a forgotten clock-out is never auto-closed; it stops being *live* past the shift's `cutoff_grace_min` instead (reads `pulang`, keeps the `lupa_clock_out` flag), so it cannot inflate monitoring. **Migration (revised after the Phase-0 audit):** `shifts` stays a **real table** maintained as a session-projection of the punches — one row per `(user, service_day, shift_definition, overtime)` with a stable `id` — because four tables FK `shifts.id`; a pure view would have forced re-pointing them. Phase 1 = clock-in/out write punches + project the row (done); Phases 2–5 migrate presence/monitoring/mobile/readers, then drop `shifts` last.

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
