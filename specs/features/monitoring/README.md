# Monitoring

**Status:** ✅ Active · **Backend:** `monitoring`, `location`, `gateways` · **Key ADRs:** ADR-011→029 (event-sourced status), ADR-016 (Redis scaling), ADR-006 (location partitioning)

## Overview
Real-time supervisor dashboard: live worker positions, five-status tracking, and an aggregate-first drill-down (Surabaya → rayon → location → workers) over Google Maps, with Socket.IO push. Scope is authorized by role (city / rayon / location). Backed by the `monitoring` module (services + cron under `apps/be/src/modules/monitoring`) and the `location` module (ingest + history). **Under revamp** post-UAT (a top UAT-feedback area).

## Key decisions
- **Every tier counts only LIVE sessions.** All fourteen `user_tracking_status` reads — city, rayon, kawasan, lokasi, the staffing roll-ups and the off-schedule count — share one `LIVE_SESSION_SQL` predicate, because a guard applied at one tier and not the others is the same bug wearing a different number.
- **A worker renders at their own drill tier, and only there.** `display_scope` comes from the scope of their current-shift schedule occurrence: a lokasi-scheduled worker shows at that lokasi, a kawasan-scheduled worker at that kawasan, never at the levels above. An **unscheduled (ad-hoc) clock-in is pinned to CITY** with `is_scheduled: false` and the `ad_hoc` flag, rendered as a distinct "Luar Jadwal" marker — deliberately flat rather than scattered across tiers by a static assignment that may not reflect where they actually are. Web (`monitoring/page.tsx` `scopeMatches`) is the canon; `apps/mobile/src/utils/monitoringScope.ts` mirrors it.
- **A tracking row is released when its session ends, not when the day turns.** `user_tracking_status.shift_id` is cleared on clock-out, so a worker who never clocks out would otherwise render as on duty forever — 15 reads gate on `shift_id IS NOT NULL`, and on the staging clone that meant **302 workers on the live map with 0 genuinely on duty**. `MonitoringSchedulerService.endStaleSessions()` (5-min cron) restores the invariant, using ADR-055's window-plus-grace rule rather than a calendar date — a date check would evict a Shift-3 worker at midnight, mid-shift. The reads keep a `clock_out_time IS NULL` guard for the gap between sweeps.
- **Both platforms implement the same model.** Web and mobile share the drill/zoom fork (`scopeMatches` / `subtreeMatches`), the same per-tier layer **facets** (Batas / Isian / Marker / Nama as independent checkboxes, with Semua/Sembunyikan as shortcuts over the set) and the same per-tier label placement (rayon below · kawasan left · lokasi right · people above, all wrapping) and the same Petugas/Tim pair, and the same lifecycle pills — mobile's `utils/layerVisibility` + `statusHelpers` twin web's `lib/monitoring/layers` + `lifecyclePills`. Mobile draws the **kawasan** tier as of 2026-08-12; before that its client type had no `regions[]` field and the geometry was discarded on arrival.
- **Two map modes, one set of numbers.** Tap-to-drill (the canon above) is the default; **zoom mode** draws every tier and every worker inside the current subtree at once, per client request. Only what is *drawn* differs — no count is re-derived. `GET /monitoring/aggregate?scope=all` serves it by composing the existing per-tier builders verbatim (each district's children built with that district's own clocked-in set), so a node reads the same whichever mode asked. Totals come from the rayon tier alone, because summing tiers would count a worker three times.
- **Event-sourced status via Redis Streams** (ADR-029, supersedes ADR-011) — status is derived from a location/event stream, not a materialized column; `monitoring/cron` recomputes aggregates.
- **Redis for WebSocket scaling** (ADR-016) — Socket.IO adapter + notification retry.
- **Location log partitioning** (ADR-006) — monthly partitions for query performance.
- **Aggregate-first drill-down** — bubbles show active-inside-location / scheduled ratios; markers standardized web + mobile.
- ⚠️ The legacy `supervisor` module is **deprecated** — superseded by this feature; do not extend it.

## Revamp notes (post-UAT) — target model (ADR-046)
> **Status: delivered — web merged to `main`** (see the Changelog for the full set). The target model
> below is implemented: aggregate drill Rayon→Kawasan→Lokasi→workers (no Surabaya bubble), the 3-axis
> presence model (Aktif/Tidak Aktif/Tidak Hadir + inside/outside axis + Luar Jadwal), scope-narrowing
> drill, per-entity glyph markers + boundary border/fill colors, team glyph markers with a click-to-open
> member list, worker trail + area-detail on marker click, breadcrumb with inline stats, and the
> Individu/Tim filter. Understaffing uses the polymorphic staffing subject (satgas+linmas only).
> **Verified** end-to-end after a clean reseed (Playwright, all levels + desktop/mobile); be 371 + web 321
> monitoring specs green. **Remaining:** mobile-app (React Native) parity + a browser-perf pass on
> AdvancedMarkers; **not deployed to staging** (deliberate `main`→`staging` cutover). Rollout tracking:
> [`../../REVAMP-STATUS.md`](../../REVAMP-STATUS.md).
- **Subject model** — *monitorable* (anyone clocked-in: satgas, linmas, korlap, kepala_rayon, admin_rayon) vs *scheduled/staffing-counted* (**only satgas + linmas**). Non-scheduled clock-ins surface only via daftar petugas / search.
- **Presence & attendance model** ([ADR-050](../../architecture/decisions/ADR-050-presence-attendance-model.md), supersedes 046's status enum) — three **derived** axes, no stored lifecycle status: **attendance lifecycle** (`tidak_bertugas` · `belum_hadir` · `terlambat` · `bertugas` · `pulang` · `tidak_hadir`, one/worker/service-day — only `bertugas` renders live), **live presence** (`aktif`/`offline` + `dalam_area`/`luar_area`/unknown + one position field: current when aktif, last-known when offline), and **counting** (staffing = `bertugas` ∧ scheduled-for-subject ∧ satgas/linmas; ad-hoc & monitorable roles show but don't count). Policy locked: per-shift grace (late 15 min / no-show at end); forgotten clock-out **never auto-closed** (`lupa_clock_out` flag, corrected by supervisor; lembur is explicit only); excused reasons cuti/sakit/izin/libur set by admin_rayon/korlap; offline threshold 10 min configurable, korlap paged at threshold within shift window only. All resolved against the shift's **service day** (cross-midnight safe for shift 3).
- **Supervisor visibility** (hierarchical, server-enforced) — management → all Surabaya; kepala_rayon/admin_rayon → their rayon; korlap → their region (+ optional location) incl. team members; satgas/linmas → none.
- **Static vs mobile** — static geofenced to their location; mobile (e.g. penyiraman) geofenced to their region, same tolerance as locations ([ADR-045](../../architecture/decisions/ADR-045-four-level-location-hierarchy.md)). Drill visibility: rayon = all; region = mobile-of-region + static-in-its-locations; location = static-of-location.
- **Drill** — **remove the Surabaya bubble**; draw all rayon boundaries on first load with per-rayon bubbles; no workers at top level. Drill: Rayon → Region → Location → workers.
- **Bubble** = marker + active-count with status-tinted ring; **hover** = `total / active / by_shift{s1,s2,s3} / by_role / understaffed` at that scope. **Teams** render as one group bubble (member count + team name) that expands to members ([teams](../teams/README.md)).
- **Understaffing** counts only satgas+linmas vs `LocationStaffRequirement`.
- **Search** — server-backed, scope-filtered; matches worker name / location / team keyword; returns anyone clocked-in with a location fix in the last 24h (incl. non-scheduled). Status rings follow the presence model above ([ADR-050](../../architecture/decisions/ADR-050-presence-attendance-model.md)).
- **Perf** — keep event-sourced Redis streams (ADR-029) + in-place snapshot patching (no map remounts); server-computed bubble aggregates; rooms `monitoring:rayon|region|area:{id}`.
- **Web first**, then mobile parity after client/PM design ack.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Monitoring page (map + drill-down + roster) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** Map Dashboard — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [geography](../geography/README.md)
- [attendance](../attendance/README.md)
- [notifications](../notifications/README.md)
- [scheduling](../scheduling/README.md)
- [teams](../teams/README.md)

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
