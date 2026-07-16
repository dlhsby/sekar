# Monitoring

**Status:** ✅ Active · **Backend:** `monitoring`, `location`, `gateways` · **Key ADRs:** ADR-011→029 (event-sourced status), ADR-016 (Redis scaling), ADR-006 (location partitioning)

## Overview
Real-time supervisor dashboard: live worker positions, five-status tracking, and an aggregate-first drill-down (Surabaya → rayon → location → workers) over Google Maps, with Socket.IO push. Scope is authorized by role (city / rayon / location). Backed by the `monitoring` module (services + cron under `apps/be/src/modules/monitoring`) and the `location` module (ingest + history). **Under revamp** post-UAT (a top UAT-feedback area).

## Key decisions
- **Event-sourced status via Redis Streams** (ADR-029, supersedes ADR-011) — status is derived from a location/event stream, not a materialized column; `monitoring/cron` recomputes aggregates.
- **Redis for WebSocket scaling** (ADR-016) — Socket.IO adapter + notification retry.
- **Location log partitioning** (ADR-006) — monthly partitions for query performance.
- **Aggregate-first drill-down** — bubbles show active-inside-location / scheduled ratios; markers standardized web + mobile.
- ⚠️ The legacy `supervisor` module is **deprecated** — superseded by this feature; do not extend it.

## Revamp notes (post-UAT) — target model (ADR-046)
> **Status: deferred (Phase 5).** Rollout tracking + the remaining checklist live in
> [`../../REVAMP-STATUS.md`](../../REVAMP-STATUS.md). Understaffing on the map must use the polymorphic
> staffing subject (region/location/rayon/city) from the Phase-4 consolidation, not location-only.
- **Subject model** — *monitorable* (anyone clocked-in: satgas, linmas, korlap, kepala_rayon, admin_rayon) vs *scheduled/staffing-counted* (**only satgas + linmas**). Non-scheduled clock-ins surface only via daftar petugas / search.
- **Supervisor visibility** (hierarchical, server-enforced) — management → all Surabaya; kepala_rayon/admin_rayon → their rayon; korlap → their region (+ optional location) incl. team members; satgas/linmas → none.
- **Static vs mobile** — static geofenced to their location; mobile (e.g. penyiraman) geofenced to their region, same tolerance as locations ([ADR-045](../../architecture/decisions/ADR-045-four-level-location-hierarchy.md)). Drill visibility: rayon = all; region = mobile-of-region + static-in-its-locations; location = static-of-location.
- **Drill** — **remove the Surabaya bubble**; draw all rayon boundaries on first load with per-rayon bubbles; no workers at top level. Drill: Rayon → Region → Location → workers.
- **Bubble** = marker + active-count with status-tinted ring; **hover** = `total / active / by_shift{s1,s2,s3} / by_role / understaffed` at that scope. **Teams** render as one group bubble (member count + team name) that expands to members ([teams](../teams/README.md)).
- **Understaffing** counts only satgas+linmas vs `LocationStaffRequirement`.
- **Search** — server-backed, scope-filtered; matches worker name / location / team keyword; returns anyone clocked-in with a location fix in the last 24h (incl. non-scheduled). Status color rings unchanged.
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
- 2026-07-16 — **Phase 5.3 — status model collapsed 5 → 3** (`active` · `offline` · `absent`), amending ADR-046's *"no new status code"*. **`offline` inverted meaning**: it meant *not clocked in*, it now means *clocked in but unreachable*; the old `offline` becomes **`absent`** (*tidak hadir* where a schedule exists). `inactive`/`idle` and `missing` both fold into `offline`, and **`outside_area` stops being a status** — it is now an axis (`is_within_area`) shown *alongside* active/offline, per the request that both states still report inside/outside. The inversion drove two decisions worth recording. **(1) The migration remaps in ONE `CASE` pass, never a sequence** — `missing→offline` followed by `offline→absent` would re-migrate the rows the first statement had just written, silently converting unreachable workers into absent ones; verified against the live DB with a planted mixed fixture (`missing=2, offline=41` → `offline=2, absent=41`, not `absent=43`), plus constraint rejection and a round-trip through `down()` (which is lossy by construction: the old vocabulary returns, the old distinctions cannot). **(2) `outside_area` now OVERLAPS the statuses instead of partitioning them**, so every site that summed it was audited — `is_fully_staffed` and `assembleNode` would have double-counted anyone outside their boundary and reported a short-staffed park as fully staffed. Two meanings of "online" were made explicit rather than left to collide: the **display** pair partitions clocked-in workers into reachable/unreachable, while **staffing counts whoever clocked in** (`active + offline`) — a park is no less staffed because a phone lost GPS; `countableOnlineByGroup` now just filters `shift_id IS NOT NULL`, since clocking in *is* the test. Retires `monitoring.inactive_threshold_sec` + `missing_threshold_sec` (catalog, envKeys, schema, cache, seed, and the stale `MISSING_THRESHOLD_SECONDS` in `.env.local`) — once idle and missing both fold into offline, nothing could reach them; **`active_max_age_sec` (300 s) is the single surviving boundary**. i18n `status:tracking.*` was **re-copied, not just re-keyed** on both platforms: "Offline"/"Offline" previously labelled *not clocked in* and now labels its opposite — `i18n:check` enforces key parity and cannot see that. **Two follow-ups flagged, not silently absorbed:** the unreachable-worker alert used to fire on `missing` (1 h of silence) and now rides `offline` (5 min), so it triggers **12× sooner** and wants a dwell timer or retirement; and the stale sweeper's 5-min interval now *equals* the threshold it enforces (was 12× shorter), leaving up to ~10 min of backstop lag.
- 2026-07-16 — **Phase 5.0 — staffing correctness (a live regression, backend only).** Two defects, both invisible to a green suite because no fixture ever crossed a supervisor with a requirement, or put a requirement anywhere but a lokasi. (1) **`requiredCountByGroup` dropped 76% of the city's target.** Requirements are polymorphic (Phase 4 / ADR-045) — exactly one of `location_id`/`region_id`/`rayon_id` is set per the rayon's `staffing_level` — but the rayon rollup did `innerJoin('req.area')` and grouped by `area.rayon_id`, so **every row with a NULL `location_id` vanished**. Once Phase 4 (#231) moved the workbook targets to the **kawasan** tier, monitoring summed **245 of 1033** required and reported `required: 0` for **8 of 9 rayons** — their bubbles could never read understaffed. Now LEFT JOINs all three tiers and groups on `COALESCE(loc.rayon_id, reg.rayon_id, req.rayon_id)`. **Live-verified: all 8 rayons now resolve** (Barat 1 = 95, Pusat = 190, Taman Aktif = 245 …) where only Taman Aktif did before. (2) **Supervisors counted as staff.** `is_understaffed` compared *every* monitorable role's online count against a satgas+linmas requirement, so a korlap standing in a park masked a real shortfall. New **`STAFFING_COUNTED_ROLES`** (satgas+linmas) beside the existing `CLOCKABLE_ROLES` — which is already ADR-046's *monitorable* set under an older name — mirroring the web day board's `COUNTABLE_ROLES` so the board and the map report **one number for one place**. `counts_by_status` deliberately stays all-roles (it is what the bubble *displays*); only the comparison narrows, via a new `countable_online` figure. **`area`-tier grouping stays location-keyed on purpose**: a lokasi under a kawasan-scoped rayon genuinely has no target of its own — the kawasan owns it, exactly as the day board renders it. The kawasan's own bubble is the region tier (5.5). Every new test was confirmed to **fail against the old code** before being kept. Verified: be 148 suites/**2406** (+3), tsc/eslint clean.

- 2026-07-12 — **Area→Location terminology sweep.** Renamed drill hierarchy, active-inside-location, LocationStaffRequirement; keep monitoring WS room prefixes (`area:{id}`).
- 2026-07-10 — Revamp target set: subject model, static/mobile, drop Surabaya bubble, team bubbles, region tier, search (ADR-046).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
