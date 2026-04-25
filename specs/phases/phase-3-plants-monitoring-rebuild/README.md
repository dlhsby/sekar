# Phase 3: Plants Management, Monitoring Rebuild & Public Intake

**Date:** April 24, 2026 (updated April 25, 2026 — redesign milestone added)
**Status:** Not Started
**Priority:** High — Monitoring rebuild unblocks production-scale operation; plants + public intake are client-approved flagship features for this phase; full redesign adoption (NB 2.0 tokens + responsive PWA) precedes feature work.
**Duration:** ~73 developer-days estimated (5–7 weeks wall-clock with parallel backend/web/mobile developers)
**Depends On:** Phase 2E (Complete)
**Design foundation:** [specs/ui-ux/design-tokens.md](../../ui-ux/design-tokens.md) — source of truth for every color, shadow, radius, and type token used by Phase 3 surfaces. M1-R (sub-phases 3-R1…3-R5) is the **redesign-first foundation** that rewires both `fe/mobile` and `fe/web` onto the canonical tokens, bundles brand fonts, ships the web PWA shell, and migrates every screen onto the new visual language **before** any feature work begins.
**Related ADRs:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md), [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md), [ADR-011](../../architecture/decisions/ADR-011-phase2d-monitoring-status-model.md) (superseded by ADR-029), [ADR-013](../../architecture/decisions/ADR-013-multi-area-korlap-assignments.md), [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md) (promoted from Phase 4), [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md), [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md), [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md), [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md), [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md)

---

## Overview

Phase 3 delivers **four interlocking streams of work**. The first (M1-R Redesign Foundation) is a hard prerequisite for the other three — every UI PR after sub-phase 3-R1 must consume tokens from `generated/` or CI blocks the merge. Streams 2–4 were triggered by client feedback in April 2026 after a production walk-through with the mayor's office; stream 1 was triggered by the claude.ai/design handoff (Apr 25, 2026) reconciling drifted mobile/web token values, locking the canonical NB 2.0 visual language, and promoting the prior Phase 4 design-system migration into Phase 3 so no screen lingers on old tokens.

1. **Redesign Foundation (M1-R, the gate-keeper).** Mobile + web design tokens currently drift: mobile shadows use `shadowRadius: 1–4` with semi-transparent rgba (NB hard-edge stamp lost ~70%), `primary.hover` differs by 2 hex digits, mobile h1/h2/h3 are 30/24/20 vs web 28/22/18, no brand fonts are loaded on either platform, web has no PWA, and 11 mobile screens + 11 web pages aren't migrated to the canonical token system. M1-R ships a hand-rolled `scripts/build-tokens.ts` JSON→(CSS,TS) generator with CI drift detection, fixes every drifted color/shadow/type value, bundles Space Grotesk + Inter + JetBrains Mono on both platforms, migrates all NB primitives + adds new `NBModal` / `NBToast` / `NBText` mobile components, installs the web PWA shell (manifest + service worker + offline shell + push subscription + install banner) with a `ResponsiveShell` driving mobile-web (<768 px) / tablet (768–1279 px) / desktop (≥1280 px) layouts on every Phase-3 page, and sweeps every existing non-rewritten screen onto the new tokens. After M1-R, mobile native + mobile web + desktop web share **one visual spine** — same hex codes, same shadow geometry, same type scale. ADR-036 + ADR-037.

2. **Monitoring v2 (full rewrite).** The Phase 2D monitoring implementation is not production-scale: `StatusCalculatorService.onLocationPing` issues 6+ database queries per ping (saturates the 15-connection pool at 500 workers); only the last location in a batch triggers a status calc; `location_logs` is missing every composite index except the PK; and `AREA_STAFFING_CHANGED` emits on every GPS flap without debounce. This phase decouples ingest from projection via Redis Streams, adds a Socket.IO Redis adapter for horizontal scale, installs a staffing debouncer + stale-status sweep cron, and rebuilds map UX with supercluster everywhere — all while **preserving** the Apr 24 marker/trail bug fixes (`tracksViewChanges={false}`, `LabelMode` enum in marker `key`, `requestAnimationFrame` mount guard, `useFocusEffect`-driven boundary re-fetch).

3. **Plants management + task typing.** The mayor asked DLH to stop running pruning reactively. Phase 3 introduces `plant_species` (131 rows from the CSV historical log), `area_plants` aggregate inventory per area×species with `last_pruned_at` / `next_due_at` / `status` (ok / due / overdue), optional `notable_plants` for heritage records, a `task_type` enum + JSONB `custom_fields` schema registry, partial-complete and resume-tomorrow parent/child task lineage, and a deterministic species×area_type due-date forecaster ([ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md)). Top-management dashboards surface overdue areas; the 5,008-row CSV is backfilled into `activities` + `activity_plant_items`.

4. **Public intake + capacity + seed ledger.** A new external role `staff_kecamatan` lets sub-district staff submit pruning requests that currently arrive as paper letters. `admin_data` (already rayon-scoped via [ADR-013](../../architecture/decisions/ADR-013-multi-area-korlap-assignments.md)) gains disposition authority over these requests ([ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md)) — a narrow capability extension, **not** a new role. Converted requests book `service_capacity` (rayon × ISO-week × service_type; reusable for future DLH services) and link back to the originating request so kecamatan can see completion photos. Plant-seed inventory gets a unified `plant_seeds` + `seed_transactions` ledger usable by `admin_data` at Rayon Taman Aktif and `top_management`.

### Why M1-R must come first (execution gate)

- **Visual parity is one-way.** Once feature work in M2/M3/M4 lands on generated tokens, retrofitting earlier screens later forces a second sweep with disruptive PRs across the whole app. Doing the sweep first means every Phase-3 PR is born on the new tokens.
- **CI gates depend on it.** ESLint rules (`no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`, RN `shadowRadius > 0` ban) and the `tokens-verify` CI job land in 3-R1. After 3-R1, no UI PR can introduce drift; before 3-R1, drift creeps in unchecked.
- **NBModal / NBToast / NBText are dependencies of feature work.** Pruning task form (3-7), species autocomplete (3-7), partial-complete sheet (3-7), convert-to-task (3-10), seed transaction form (3-12), and the monitoring overlay sheets (3-5) all need `NBModal` shipped in 3-R3.
- **`ResponsiveShell` is a dependency of every Phase-3 web page.** Web monitoring (3-4), pruning request queue (3-10), capacity calendar (3-11), seeds (3-12) all consume the shell built in 3-R4 — without it, mobile-web layouts have to be retrofitted page-by-page.

### Requirements Summary

| # | Requirement | Source | Sub-Phase |
|---|-------------|--------|-----------|
| 1 | Rewrite monitoring pipeline: Redis Streams projector, Socket.IO Redis adapter, debounced staffing events, stale-status sweep, eager-loaded `onLocationPing` | Client (production-scale bugs) | 3-3 |
| 2 | Add missing `location_logs` indexes; add `user_tracking_status (area_id, updated_at DESC)` and `(is_within_area, area_id)` | Evidence (`be/src/modules/monitoring/services/status-calculator.service.ts:186-263`) | 3-3 |
| 3 | Web monitoring: supercluster, incremental WS patches, virtualized worker list, hierarchy toggles (rayon/area/worker), plant + overdue overlays | Client | 3-4 |
| 4 | Mobile monitoring: cluster markers (parallel `ClusterMarker`, keep `UserMarker` intact behind feature flag), overlay toggle sheet, area fill by plant status | Client (preserve Apr 24 fixes) | 3-5 |
| 5 | `plant_species` catalog + `area_plants` aggregate inventory + optional `notable_plants` | Client (mayor directive) | 3-2, 3-8 |
| 6 | Task typing (`task_type` enum + JSONB `custom_fields` schema registry) + parent/child lineage + partial-complete (`target_plant_count` / `completed_plant_count`) + species line items (`activity_plant_items`) | Client | 3-6 |
| 7 | Pruning task mobile form with 131-species autocomplete, resume-tomorrow CTA | Client | 3-7 |
| 8 | Deterministic species × area_type due-date forecast with manual override; overdue alerts to `top_management` | Client | 3-8 |
| 9 | `staff_kecamatan` role + `pruning_requests` entity + submission/review/convert-to-task workflow | Client | 3-9 |
| 10 | Extend `admin_data` with pruning_requests disposition (rayon-scoped) — amends [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md) | Client | 3-2, 3-9 |
| 11 | Pruning request frontends: mobile submit/review; web queue/detail; kecamatan outcome visibility | Client | 3-10 |
| 12 | `service_capacity` weekly grid per rayon × `service_type` (reusable) with implicit booking on convert-to-task | Client | 3-11 |
| 13 | `plant_seeds` + `seed_transactions` unified ledger (purchase / distribution / adjustment) | Client | 3-12 |
| 14 | CSV backfill seeder (5,008 rows → `activities` + `activity_plant_items` + `area_plants`; rehost Drive photos on S3; idempotent on `reference_code`) | Client (historical data) | 3-13 |
| 15 | k6 load test harness: 500-worker, 12-second-ping, 30-minute simulation; pass criteria p95 ingest < 200 ms, broadcast < 500 ms, pool < 70 %, Redis lag < 5 s, zero missed transitions | Client | 3-14 |
| 16 | Documentation final sync: specs, COMPLETION_STATUS, root + module-level CLAUDE.md | Housekeeping | 3-15 |
| 17 | Unified design-token pipeline: hand-rolled `scripts/build-tokens.ts` JSON→(CSS,TS) generator + `tokens-verify` CI gate + ESLint rules (`no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`, RN `shadowRadius > 0` ban) | Design systems (ADR-036) | **3-R1** |
| 18 | Token value migration (drift fixes locked: `primary.hover #6BA87A`, `secondary #8B7355`, `success #7FBC8C`, `info #69D2E7`, type h1/h2/h3 = 28/22/18, opaque hard-edge shadows, focus ring 3px solid + 2px offset) + brand-font bundling (Space Grotesk / Inter / JetBrains Mono `.ttf` on mobile via `react-native.config.js`; `next/font/google` on web) | Design systems (ADR-036) | **3-R2** |
| 19 | NB primitive migration to generated tokens + new mobile `NBModal` (`@gorhom/bottom-sheet` + RN `<Modal>`) + `NBToast` (`react-native-toast-message` wrapper) + `NBText` (semantic typography variants) + Playwright `toHaveScreenshot` web visreg + Jest snapshot mobile visreg with 0.1% tolerance on baselines committed at 375/768/1280 px | Design systems (ADR-036) + Client (NB 2.0 polish) | **3-R3** |
| 20 | Web installable PWA: manifest, service worker (shell precache + SWR snapshot), install banner, offline shell, push subscription scaffold (`POST /api/push/register`), `MobileInstallPush` banner directing satgas/linmas/korlap on phone browsers to native app, `ResponsiveShell` (sidebar / icon rail / ☰ drawer at 1280/768/375 px), `(kecamatan)` minimal layout for `staff_kecamatan` role | Client (field supervisors on phones) + ADR-037 | **3-R4** |
| 21 | Full redesign sweep: every existing non-rewritten screen migrates onto generated tokens with mobile-web responsive layouts. Mobile (16 screens): auth + onboarding, worker stack (Home/ClockIn/Out/LocationTracking/Tasks/ActivityForm/Overtime/Profile/EditProfile/Settings/Notifications), supervisor stack (KorlapHome/UsersList/Reports/Schedules), error/empty/skeleton, role-aware tab shells. Web (11 pages): `(auth)/login`, dashboard home, Users, Areas, Rayons-index, Overtime, Schedules, Reports, Profile, Settings, Audit Logs — each at 3 breakpoints. Promoted from prior Phase 4 backlog. | Design systems + Client | **3-R5** |

---

## Current Codebase Facts (Verified April 24, 2026)

| Fact | Current State | Target State |
|------|---------------|--------------|
| Backend modules | 18 modules, ~130 endpoints | 22 modules (+plants, +pruning-requests, +service-capacity, +plant-seeds), ~165 endpoints |
| Backend tests | 1,264 tests (94.51 % stmts, 83.49 % branches) | >1,500 tests; ≥85 % stmts per new module |
| Database tables | 22 tables, 8 migrations | 30 tables; 8 new + 5 altered; migrations prefixed `17460000*` |
| Roles | 8 roles (ADR-009) | 9 roles: +`staff_kecamatan`. `admin_data` gains disposition over `pruning_requests` only (ADR-032) — no new `admin_rayon` |
| Mobile screens | 22 screens | 27 screens (+monitoring v2 overlays, +PruningTaskForm, +SubmitPruningRequest, +MyRequests, +ReviewQueue, +Seeds) |
| Web pages | 21 pages | 28 pages (+plants/, +pruning-requests/, +seeds/, +rayons/[id]/capacity/) |
| Monitoring pipeline | 6+ DB queries per ping; latest-in-batch only; no debounce; no stale sweep; in-process Socket.IO | Redis Streams consumer group + projector; per-ping eager-load once; debounced staffing events; 5-min stale sweep cron; Redis Socket.IO adapter |
| `location_logs` indexes | PK only | +`(user_id, logged_at DESC)`, `(shift_id, logged_at)`, `(user_id, shift_id, logged_at)` |
| Infrastructure | PostgreSQL + Adminer + LocalStack S3 | +Redis 7 (docker-compose and `REDIS_URL` env) |
| Mobile marker rendering | Per-user `UserMarker`, Apr 24 fixes in place | Parallel `ClusterMarker` + `UserMarker`, A/B feature flag; lint rule forbids re-enabling `tracksViewChanges=true` |
| Tasks | No `task_type`, no `parent_task_id`, no partial-completion columns, 8 statuses | +`task_type`, +`custom_fields` JSONB, +`parent_task_id`, +`target_plant_count`, +`completed_plant_count`. Status simplification (8→4) remains a **Phase 4 backlog item** |
| Activities | No custom_fields, no plant line items, no reference_code | +`custom_fields` JSONB, +`activity_plant_items` relation, +`reference_code` (preserves CSV IDs), +`photo_before_url` / `photo_after_url`, +`pruning_request_id` |
| Public intake | Nothing (paper letters) | Full submit → review → convert → outcome loop |
| Design token source | Hand-maintained: `fe/web/src/app/globals.css` `:root` block + `fe/mobile/src/constants/nbTokens.ts` literals; drift between platforms (primary.hover, secondary, success, info, type scale) | Generated: `scripts/build-tokens.ts` reads `specs/ui-ux/tokens.json` → `fe/web/src/app/generated/tokens.css` + `fe/mobile/src/constants/generated/tokens.ts`; CI `tokens-verify` blocks drift |
| Shadow rendering | Mobile `shadowRadius: 1–4` + `shadowOpacity: 0.15–0.22` (soft blur); web `box-shadow: Xpx Ypx Bpx rgba(28,25,23,.15–.22)` (1–6 px blur) — NB stamp 70 % lost | Both platforms: opaque `#1C1917`, zero blur/radius (mobile `shadowRadius: 0, shadowOpacity: 1`; web `box-shadow: Xpx Ypx 0 #1C1917`); ESLint rule blocks regression |
| Brand fonts | Not bundled / not loaded — system fallbacks render on both platforms | Mobile: `.ttf` files in `fe/mobile/assets/fonts/` (Space Grotesk 500/600/700/800, Inter 400/500/600/700, JetBrains Mono 400/500/600), linked via `react-native.config.js`. Web: `next/font/google` with `display: swap`, subsets `latin + latin-ext`, CSS vars `--font-display|body|mono` |
| Mobile NB primitives | 13 components (NBButton/Card/Badge/TextInput/PasswordInput/CardTextInput/Select/DatePicker/Skeleton/Tab/Alert/EmptyState/BackgroundPattern); no Modal/Toast/Text wrappers | + `NBModal.tsx` (`@gorhom/bottom-sheet` + RN `<Modal>`), `NBToast.tsx` (NB-chromed `react-native-toast-message`), `NBText.tsx` (semantic variants) |
| Web PWA | None — no manifest, no service worker, no icons, no install path | Installable: `public/manifest.webmanifest`, `public/sw.js` (compiled from `src/sw/sw.ts`), 192/512/512-maskable/180 apple-touch icons, `InstallBanner` / `OfflineBanner` / `UpdateToast` / `MobileInstallPush` / `usePushSubscription` / `/install-help` route, `(kecamatan)` minimal layout, `ResponsiveShell` driving 375/768/1280 px breakpoints |
| Web responsive | Desktop-only (≥1280 px); mobile/tablet broken or unstyled on most pages | Three layouts on every Phase-3 page: mobile web (<768 px) full-width stacked + ☰ drawer + bottom-sheet filters; tablet (768–1279 px) icon rail + 1-col primary; desktop (≥1280 px) 220 px sidebar + multi-column |
| ESLint design-system rules | None | `no-inline-hex-colors` (allow `generated/**`), `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`; RN custom rule banning `shadowRadius > 0` literal |
| Visual regression | None | Playwright `toHaveScreenshot` baselines committed at 375 / 768 / 1280 px; Jest `react-test-renderer` snapshots for every NB primitive; CI gate `web-visreg` + `mobile-snapshots` required green for merge |

---

## Role Access Matrix

**Legend:** `Y` = full access; `Y (scope)` = scoped; `-` = no access; `Ext` = capability extension of existing role per ADR-032.

| Feature | satgas | linmas | korlap | admin_data | kepala_rayon | top_management | admin_system | superadmin | staff_kecamatan |
|---------|--------|--------|--------|------------|--------------|----------------|--------------|------------|-----------------|
| Monitoring map v2 (view) | - | - | Y (own area) | Y (own rayon) | Y (own rayon) | Y (all) | Y (all) | Y (all) | - |
| Cluster/overlay toggles | - | - | Y | Y | Y | Y | Y | Y | - |
| Plant overlay + overdue colors | - | - | Y (own area) | Y (own rayon) | Y (own rayon) | Y (all) | Y (all) | Y (all) | - |
| Plant species catalog (read) | Y | Y | Y | Y | Y | Y | Y | Y | Y (own submissions) |
| Plant species catalog (write) | - | - | - | - | - | - | Y | Y | - |
| Area plants inventory (view) | Y (own area) | Y (own area) | Y (own area) | Y (own rayon) | Y (own rayon) | Y (all) | Y (all) | Y (all) | - |
| Area plants inventory (bulk upsert) | - | - | - | Y (own rayon) | Y (own rayon) | - | Y | Y | - |
| Notable plants CRUD | - | - | Y (own area) | Y (own rayon) | Y (own rayon) | Y (all) | Y | Y | - |
| Create typed task (pruning/watering/planting) | - | - | Y (own area) | Y (own rayon) | Y (own rayon) | - | Y | Y | - |
| Pruning task partial-complete / resume | Y (assigned) | - | Y (own area) | - | - | - | - | - | - |
| Task lineage tree | - | - | Y (own area) | Y (own rayon) | Y (own rayon) | Y | Y | Y | - |
| Submit pruning request | - | - | - | - | - | - | - | - | Y |
| List own pruning requests | - | - | - | - | - | - | - | - | Y (own submissions) |
| Pruning request review queue | - | - | - | Y (own rayon, Ext per ADR-032) | - | Y (read-only all) | Y | Y | - |
| Approve / reject / convert-to-task | - | - | - | Y (own rayon, Ext) | - | - | Y | Y | - |
| See outcome (task + activities + photos) | - | - | Y (if assigned) | Y (own rayon) | Y (own rayon) | Y | Y | Y | Y (own submissions) |
| Service capacity (view) | - | - | Y (own rayon) | Y (own rayon) | Y (own rayon) | Y (all) | Y | Y | - |
| Service capacity (edit) | - | - | - | Y (own rayon) | - | Y (all) | Y | Y | - |
| Plant seed inventory (view) | - | - | - | Y (Taman Aktif) | - | Y | Y | Y | - |
| Plant seed transactions (record) | - | - | - | Y (Taman Aktif) | - | Y | Y | Y | - |
| Overdue alerts dashboard | - | - | - | Y (own rayon digest) | Y (own rayon digest) | Y (all) | Y | Y | - |

---

## Monitoring Hierarchy (v2)

Unchanged from Phase 2D at the org-model level; the pipeline underneath changes radically. `staff_kecamatan` is outside the monitoring hierarchy entirely.

```
top_management / admin_system / superadmin
    |-- All 7 rayons
    |       |-- All areas (polygon + plant overlay)
    |       |       |-- All workers (supercluster rendering)

kepala_rayon
    |-- OWN rayon
            |-- All areas within own rayon
                    |-- All korlap + satgas/linmas + activities

admin_data (extended per ADR-032)
    |-- OWN rayon (rayon_id column)
            |-- monitoring read + pruning_request disposition

korlap
    |-- OWN area(s) (ADR-013 multi-area)
            |-- Subordinate satgas/linmas + tasks

staff_kecamatan  (out of hierarchy)
    |-- Own pruning_requests only
            |-- Outcome visibility (converted task + activities)
```

---

## Milestone Plan

Phase 3 is broken into **6 demo-able milestones** (M1-R, M1-S, M2, M3, M4, M5) so the client can sign off incrementally and each future development session picks up a self-contained slice of work. **M1-R is the redesign-first foundation** — sub-phases 3-R1…3-R5 ship the unified token pipeline, fix every drifted color/shadow/font on both platforms, install the web PWA shell, and migrate every existing screen onto the new visual language **before** any feature work begins. After M1-R, mobile native + mobile web + desktop web share a single visual spine.

### Summary

| Milestone | Name | Sub-phases | Effort | Demo-able output | Client sign-off gate |
|-----------|------|------------|--------|------------------|----------------------|
| **M1-R** | Redesign Foundation | 3-R1, 3-R2, 3-R3, 3-R4, 3-R5 | 14 d | Token pipeline live on CI; both platforms render hard-edge shadows + brand fonts; NBModal/NBToast/NBText shipped; web installable PWA + offline shell + mobile-web responsive; full sweep complete (no screen on old tokens) | CI `tokens:verify` green; ESLint rejects inline hex; Lighthouse PWA ≥ 90 on `/monitoring`; visual regression baseline locked at 375/768/1280 px; `git grep '#[0-9a-fA-F]{6}' fe/{web,mobile}/src` returns only allowlisted exceptions |
| **M1-S** | Schema + Spec Sync | 3-1, 3-2 | 6 d | DB migrations + new roles applied; obsolete docs reconciled; ADR-029…037 all "Accepted" | `staff_kecamatan` login works; `plant_species` returns 131 rows; root + module CLAUDE.md accurate |
| **M2** | Monitoring v2 | 3-3, 3-4, 3-5, 3-14 | 21 d | Supercluster + plant overlays + incremental WS patches on web + mobile; k6 load test passes at 500 workers | p95 ingest <200 ms, p95 broadcast <500 ms, no marker redraw storms |
| **M3** | Plants & Typed Tasks | 3-6, 3-7, 3-8, 3-13 | 15 d | Pruning task form (mobile + web); resume-tomorrow lineage; CSV backfill visible on map; overdue alerts fire | Korlap → satgas complete a pruning task end-to-end; overdue area flips red → green |
| **M4** | Public Intake + Capacity + Seeds | 3-9, 3-10, 3-11, 3-12 | 16 d | Kecamatan submits → admin_data reviews → convert-to-task → outcome visible; capacity calendar; seed ledger | Full loop happy-path with photos; capacity chip blocks overbook; seed balance = Σ transactions |
| **M5** | Documentation + Deploy | 3-15 + rollout | 2 d + rollout | Specs, COMPLETION_STATUS, CLAUDE.md files synced; pilot in Selatan behind flag → graduated to all rayons | `PHASE3_FEATURES_ENABLED` on in all rayons; 48-h pilot had no P1 bugs |

**Total:** 73 dev-days single-threaded. With 3 parallel engineers (backend, web, mobile), wall-clock ≈ 5–7 weeks.

The +10 days vs. the prior 63-day plan come from:
- **+5 days** to slice the old monolithic 3-0 sub-phase into 5 shippable checkpoints (3-R1…3-R5) for cleaner reviews.
- **+5 days** for 3-R5, the **full redesign sweep** across non-rewritten screens (login, attendance, overtime, profile, settings, users, reports, etc.) — promoted into Phase 3 from the prior Phase 4 backlog so the entire codebase sits on the new tokens by end of M1-R.

### Cross-milestone dependencies

```
M1-R Redesign Foundation ───────────────────────┐
                                                 │
M1-S Schema + Spec Sync ────────────────────────┤
                                                 │
                  ┌────────── M2 Monitoring v2 ──┤
M1-R + M1-S ──────┼────────── M3 Plants & Tasks ─┤
                  │                               │
                  └─ M4 Public Intake (3-10 depends on M3's 3-6 task_type)
                                                 │
M2 + M3 + M4 ────────────── M5 Deploy ──────────┘
```

M2 / M3 / M4 run in parallel after M1-R + M1-S land. **Every UI PR in M2/M3/M4 must import tokens from `generated/`**; CI blocks otherwise. M4's pruning-request → task conversion depends on M3's `task_type` landing. M5 waits on everything.

### M1-R — Redesign Foundation (14 d, gate-keeper milestone)

**Goal:** Land the unified token system on both platforms, install the responsive web PWA, and sweep every existing screen onto the new visual language. After this milestone, the entire repo lives on `tokens.json` — there is no second source.

**Sub-phases:**
- **3-R1** (3 d) — Token pipeline + CI + ESLint plumbing (zero user-visible change)
- **3-R2** (3 d) — Token value migration (drifted hover/secondary/success/info corrected) + brand-font bundling on both platforms
- **3-R3** (3 d) — NB primitive migration + `NBModal` / `NBToast` / `NBText` (new) + visual regression harness
- **3-R4** (2 d) — Web PWA shell (manifest + SW + icons + install banner + offline shell + push) + mobile-web responsive scaffolding (`ResponsiveShell`, `(kecamatan)` layout)
- **3-R5** (3 d) — Full redesign sweep on non-rewritten screens: every mobile screen and web page not being rewritten in M2/M3/M4 migrates onto generated tokens with mobile-web responsive layout

**Exit criteria:**
- [ ] `npm run tokens:build` idempotent; `tokens:verify` CI green; deliberately-drifted test PR fails
- [ ] Both platforms consume tokens exclusively from `generated/`; `nbTokens.ts` and `globals.css` are wrappers, not sources
- [ ] Hard-edge shadows visible on both platforms (opacity 1, opaque `#1C1917`, zero blur/radius)
- [ ] Space Grotesk / Inter / JetBrains Mono loaded on mobile (.ttf bundled) and web (`next/font/google`)
- [ ] `NBModal`, `NBToast`, `NBText` shipped on mobile and consumed by ≥1 canary screen each
- [ ] Web Lighthouse PWA ≥ 90; install banner visible on Android Chrome; iOS `/install-help` renders
- [ ] Offline shell renders on `navigator.onLine = false` with last-good snapshot + yellow banner
- [ ] Mobile-web at 375 px renders every Phase-3 page correctly via `ResponsiveShell`
- [ ] Mobile-web login banner appears for satgas/linmas/korlap users redirecting to native app install
- [ ] Visual regression baseline captured at 375 / 768 / 1280 px; CI gate active
- [ ] ESLint rules active: `no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`, RN `shadowRadius > 0` ban
- [ ] `git grep -nE '#[0-9a-fA-F]{6}' fe/{mobile,web}/src` returns zero hits outside `generated/` and a documented allowlist
- [ ] `specs/ui-ux/design-tokens.md §Migration plan` table has zero "deferred to Phase 4" rows

**Demo (15 min):**

1. Open mobile native build + Chrome DevTools at 375 px (mobile web) + desktop browser at 1280 px on the same dashboard page → Button / Card / Badge / Text are pixel-siblings.
2. Edit `tokens.json` (change `color.primary`) → `npm run tokens:build` → commit the generated diff → CI passes; both platforms hot-reload to the new color.
3. Install web PWA on Android Chrome → launch standalone → disconnect wifi → reload → offline banner + last snapshot rendered.
4. Open `LoginScreen` on mobile + `/login` on desktop web + `/login` on Chrome DevTools 375 px → all three render the new NB 2.0 visual language.
5. Tap an `NBModal` (e.g. species autocomplete preview) on mobile → bottom sheet snaps to 45 % with hard-edge shadow + uppercase title.

**Risks:**
- **Mobile shadow regeneration looks "heavier" at opacity 1** → designer-locked target; tunable via single generator param if field feedback demands.
- **3-R5 scope creep on edge-case hexes** → `scripts/hex-allowlist.txt` documents exceptions; CI checks against allowlist only.
- **PWA scope leaks across dev/prod causing stale SW** → SW registered in production builds only; `/install-help` documents "Clear site data" recipe.
- **Visual regression flaky on sub-pixel rendering** → 0.1 % tolerance; pinned headless browser version in CI.

### M1-S — Schema + Spec Sync (6 d)

**Goal:** Database schema + role extension live; every spec document reflects the M1-R outcome; ADR-029…037 are all "Accepted".

**Sub-phases:** 3-1 (specs + ADRs + obsolete-info cleanup) · 3-2 (schema + roles)

**Exit criteria:**
- [ ] Migration round-trip OK; 8 new tables + 5 altered tables present
- [ ] `plant_species` returns 131 rows
- [ ] `staff_kecamatan` user can log in and hit the dedicated `(kecamatan)` web shell + minimal mobile shell
- [ ] All 9 ADRs (029–037) marked "Accepted"
- [ ] Every CLAUDE.md (root + module + spec) accurate for post-M1 state
- [ ] `grep -rE "deferred to Phase 4.*(migrat|sweep|redesign|token)" specs/` returns zero hits
- [ ] `grep -r "32 / 1.2" specs/ fe/{web,mobile}/CLAUDE.md` returns zero hits (obsolete h1 size cleared)
- [ ] `grep -r "shadowRadius: [1-9]" specs/` returns zero hits (obsolete shadow refs cleared)

**Demo:** Adminer shows 8 new tables; log in as `staff_kecamatan` → minimal shell on both platforms.

### M2 — Monitoring v2 (21 d, biggest milestone)

**Goal:** Replace the laggy, leaky Phase 2D monitoring with an event-sourced pipeline that provably scales to 500 concurrent workers.

**Sub-phases:** 3-3 (backend) · 3-4 (web) · 3-5 (mobile) · 3-14 (load test)

**Exit criteria:**
- [ ] k6 passes: p95 ingest < 200 ms, p95 status broadcast < 500 ms, Postgres pool < 70 %, Redis stream lag < 5 s, zero missed transitions sampled
- [ ] Mobile zoom in/out on a 500-marker map produces **zero** `_requestLayout` redraw storms (spy assertion)
- [ ] Web filter change applies in < 100 ms (no network round-trip)
- [ ] Plant overlay toggles on/off without re-mounting the map
- [ ] Stale-sweep cron flips `ACTIVE → MISSING` within 6 min of last ping (5-min sweep + margin)
- [ ] WS patches are idempotent (replay-safe) — verified by integration test

**Demo (15 min):**

1. Load web `/monitoring` → see clustered workers, filter by role, toggle plant overlay → observe real-time status flips without a refresh.
2. Open mobile `MapDashboard` → same overlays; tap cluster → zooms in; tap worker → UserDetailSheet with current status.
3. Kill a worker's GPS for 10 minutes → status flips to MISSING with no user action.
4. k6 dashboard: show throughput graph during a 500-user burst.

**Risks:**
- **Cluster regression re-introduces marker jank** → lint rule forbids `tracksViewChanges={true}`; `ClusterMarker` behind `featureFlags.clusterMarkersV2`.
- **Redis outage regresses UX** → fallback to in-process pub/sub; `/health` surfaces `redis: unavailable`.
- **Snapshot payload still too large** → if > 200 kB, add `fields=` query param to trim; measure during k6.

### M3 — Plants & Typed Tasks (15 d)

**Goal:** Pruning becomes a first-class task type. Forecast overdue areas. Seed the app with CSV history for demo richness.

**Sub-phases:** 3-6 (task typing API) · 3-7 (pruning UX) · 3-8 (due-date forecast) · 3-13 (CSV backfill)

**Exit criteria:**
- [ ] End-to-end demo: korlap creates pruning task (2 sono + 8 trembesi) → satgas submits partial (5 trembesi done) → resume-tomorrow → next day satgas finishes → parent marked complete
- [ ] Overdue-alert fires when a due date passes without activity (integration test)
- [ ] CSV backfill imports 5,008 rows in < 15 min; re-running is a no-op (idempotent on `reference_code`)
- [ ] `area_plants` status colors (green / yellow / red) visible on both web and mobile map after backfill
- [ ] `task_type` enum constrains valid values (schema validation on POST)

**Demo (20 min):**

1. Web `/tasks/new` → select Pruning → picks area Jalan Darmo S1 R → species multi-select (trembesi × 8, sono × 2) → assigns to korlap.
2. Mobile: korlap opens task → fills form → "Lanjutkan Besok" → child task created.
3. `GET /tasks/:id/lineage` inspected (Adminer / web).
4. Fast-forward scenario (edit `area_plants.next_due_at` to yesterday) → daily cron triggered manually → `area_plant_overdue` push lands on `top_management` device.
5. Monitoring map: Jalan Darmo S1 R turns red (overdue). After completion, flips green.

**Risks:**
- **CSV species names too dirty** → accept best-effort mapping; log unmatched; client confirms next phase.
- **JSONB `custom_fields` grows unchecked** → Zod registry rejects unknown fields; PR review requires a schema entry for any new `task_type`.

### M4 — Public Intake + Capacity + Seeds (16 d)

**Goal:** Replace paper-letter pruning requests with a kecamatan-driven workflow; visualize DLH capacity; give `admin_data` @ Taman Aktif a seed ledger.

**Sub-phases:** 3-9 (backend requests + workflow) · 3-10 (request frontends) · 3-11 (service capacity) · 3-12 (plant-seed inventory)

**Exit criteria:**
- [ ] End-to-end happy path: kecamatan submits → admin_data approves → converts to task (capacity checked) → korlap assigns → satgas submits activity → kecamatan sees outcome with photos
- [ ] Capacity overbook produces 409 with suggested-week payload; admin can still force override
- [ ] Seed-ledger balance matches sum of transactions (integration test)
- [ ] `staff_kecamatan` cannot see monitoring / tasks / admin routes (role-guard coverage test)

**Demo (25 min):**

1. Mobile as `staff_kecamatan`: submit a request with 3 photos + GPS capture.
2. Mobile as `admin_data` (Rayon Selatan): review queue → open request → convert-to-task (capacity chip shows Week 19 has 2 slots left) → select area + assign to korlap.
3. Mobile as korlap: task appears in list → submits pruning with partial-complete.
4. Mobile as original kecamatan user: request status shows "Done" with before/after photos.
5. Web as `top_management`: capacity calendar for Rayon Selatan — Week 19 shows 6 booked / 10 capacity.
6. Mobile as `admin_data` @ Taman Aktif: record seed purchase (100 bibit trembesi @ Rp 5k) → record distribution (20 to Rayon Selatan) → balance shows 80.

**Risks:**
- **Capacity race** on concurrent conversions → database-level `SELECT FOR UPDATE` on the capacity row; integration test.
- **Photo rehosting from kecamatan's 3G** → chunk upload; progress indicator; offline queue `pruning_request.submit` scaffolded (full polish is Phase 4).

### M5 — Documentation + Deploy (2 d + rollout)

**Goal:** Every spec reflects production reality; flip the feature flag.

**Sub-phases:** 3-15 (final documentation sync) + rollout

**Exit criteria:**
- [ ] Grep for "Phase 3 planned" or "Phase 3 WIP" in specs returns zero results
- [ ] All 9 roles × key screens × happy-path manual QA walkthrough (in [testing.md](./testing.md)) passes
- [ ] 48-h pilot at Rayon Selatan: no P1 bugs, CPU/memory within envelope, zero unhandled errors above noise floor
- [ ] All rayons enabled; `staff_kecamatan` cohort onboarded

**Demo:** product team + client review call — live pilot dashboard; client signs off against the M1 → M5 exit-criteria matrix; retrospective on what shifts to Phase 4 backlog.

---

## What is NOT in Phase 3 (tracked to Phase 4)

| Item | Why deferred |
|------|-------------|
| Full offline-write polish (retry, conflict, duplicate-guard) | Phase 3 scaffolds queue items; polish is Phase 4 (ADR-019) |
| FCM full activation (all 8 trigger points) | Phase 3 ships 3 triggers (`pruning_request_submitted`, `task_overdue`, `area_plant_overdue`); rest Phase 4 |
| Exports (CSV / Excel) | Phase 4 (unchanged from prior plan) |
| JWT refresh tokens + per-endpoint rate limiting | Phase 4 (unchanged) |
| Reporting / Analytics / Assets / iOS | Phase 5 (unchanged) |
| Task-status simplification (8 → 4 per ADR-009) | Phase 4 backlog — surfaced in M1 docs sync |

---

## How to Start Phase 3 (execution kickoff)

For a new session picking up Phase 3 from scratch, do this in order:

1. **Read `STATUS.md` first** ([./STATUS.md](./STATUS.md)) — it has the live task tracker per sub-phase. The first ⏳ row is your work item.
2. **Open the Day-0 sub-phase: 3-R1** (token pipeline + CI + ESLint plumbing). It's a 3-day plumbing-only checkpoint with **zero user-visible changes** — perfect for verifying the workflow without touching UI. Detail in [§3-R1 below](#3-r1-token-pipeline--ci--eslint-plumbing-3-days).
3. **Run the Day-0 acceptance check** before moving on:
   - `npm run tokens:build && git diff --exit-code` clean (idempotent)
   - CI `tokens-verify` job green on a deliberately-drifted test PR
   - ESLint blocks an inline-hex commit
4. **In parallel**, start M1-S sub-phase 3-1 (spec + ADR sync + obsolete-info cleanup) — it's a 2-day docs pass that runs alongside M1-R without sharing files. See [§3-1 below](#3-1-spec-deferral--adrs--claudemd-sync-2-days).
5. **Then proceed sequentially through M1-R**: 3-R1 → 3-R2 → 3-R3 → 3-R4 → 3-R5. Each is a self-contained PR with its own exit criteria; do not skip ahead.
6. **Only after M1-R + M1-S land** start M2 / M3 / M4 in parallel. Every UI PR after 3-R1 must import tokens from `generated/`; CI blocks otherwise.

**Critical resources before you write a single line of code:**

| Need | File |
|------|------|
| Canonical token values (don't memorize, look them up) | [`specs/ui-ux/tokens.json`](../../ui-ux/tokens.json) + [`specs/ui-ux/design-tokens.md`](../../ui-ux/design-tokens.md) |
| Component parity matrix (what differs intentionally vs. what must match) | [`specs/ui-ux/design-tokens.md` §Component Parity Matrix](../../ui-ux/design-tokens.md) |
| Mobile NBModal sheet vs. fullscreen decision matrix | [`specs/mobile/neo-brutalism-modal-guidelines.md`](../../mobile/neo-brutalism-modal-guidelines.md) |
| Apr 24 monitoring fixes that MUST be preserved | [`mobile.md` §Apr 24 Marker/Trail Fixes — MUST PRESERVE](./mobile.md) |
| Cross-platform parity rules (mobile native ↔ mobile web ↔ desktop web) | [`ui-ux.md` §Cross-Platform Parity Matrix](./ui-ux.md) |
| Per-screen wireframe references | [`mobile.md` §Per-Flow Wireframe Reference](./mobile.md) (35 mobile screens), [`web.md`](./web.md) (28 web pages) |
| Visual regression harness setup | [`testing.md` §Visual Regression Harness](./testing.md) |
| Database schema (8 new tables, 5 altered) | [`database.md`](./database.md) |
| Backend module structure | [`backend.md`](./backend.md) |
| Infrastructure (Redis 7, CI jobs, PWA build) | [`infrastructure.md`](./infrastructure.md) |

**Hard "do NOT" list (these break Phase 3):**

- ❌ Do NOT write inline hex literals in component code from 3-R1 onward — ESLint blocks; use generated tokens.
- ❌ Do NOT set `shadowRadius > 0` anywhere on mobile — RN custom lint rule blocks; the NB stamp is hard-edge.
- ❌ Do NOT re-enable `tracksViewChanges={true}` on `components/monitoring/*` — Apr 24 fix; ESLint blocks.
- ❌ Do NOT hand-edit `fe/web/src/app/generated/tokens.css` or `fe/mobile/src/constants/generated/tokens.ts` — they regenerate; CI rejects drift.
- ❌ Do NOT start UI feature work in M2/M3/M4 before M1-R lands — `NBModal`, `NBText`, `ResponsiveShell` are hard dependencies.
- ❌ Do NOT bypass the visual regression CI gate (`web-visreg`, `mobile-snapshots`) — baseline updates require explicit `[visreg-update]` commit tag + reviewer approval.

---

## Sub-Phase Detail (by milestone)

### Sub-Phase Table

| Sub-Phase | Milestone | Name | Est. days | Depends on |
|-----------|-----------|------|-----------|-----------|
| **3-R1** | M1-R | Token pipeline + CI + ESLint plumbing ([ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md)) | 3 | — |
| **3-R2** | M1-R | Token value migration (drift fixes) + brand-font bundling on both platforms | 3 | 3-R1 |
| **3-R3** | M1-R | NB primitive migration + `NBModal` / `NBToast` / `NBText` (new) + visual regression harness | 3 | 3-R2 |
| **3-R4** | M1-R | Web PWA shell + mobile-web responsive scaffolding (`ResponsiveShell`, `(kecamatan)` layout) ([ADR-037](../../architecture/decisions/ADR-037-web-pwa.md)) | 2 | 3-R2 |
| **3-R5** | M1-R | Full redesign sweep: every non-rewritten screen on both platforms migrates onto generated tokens with mobile-web responsive layouts | 3 | 3-R3, 3-R4 |
| **3-1** | M1-S | Spec deferral (Phase 3→4, Phase 4→5), ADRs 029–037 finalization, CLAUDE.md sync, obsolete-info cleanup | 2 | — (parallel with M1-R) |
| **3-2** | M1-S | Schema + role extension (new tables, `activities`/`tasks` additions, `staff_kecamatan`, `admin_data` policy extension) | 4 | 3-1 |
| **3-3** | M2 | Monitoring v2 backend: Redis, Streams, projector, debouncer, stale sweep, index migrations, eager loads | 7 | 3-2 |
| **3-4** | M2 | Monitoring v2 web: supercluster, incremental WS, virtualized list, hierarchy toggles, overlays, mobile-web layout | 6 | 3-3, **M1-R** |
| **3-5** | M2 | Monitoring v2 mobile: cluster markers (preserving Apr 24 fixes), overlay toggles, area fills | 5 | 3-3, **M1-R** |
| **3-6** | M3 | Task typing + custom fields + parent/child + partial-complete API | 4 | 3-2 |
| **3-7** | M3 | Pruning task UX (mobile form + resume flow; web assignment) | 5 | 3-6, **M1-R** |
| **3-8** | M3 | Plant due-date forecast + overdue alerts to `top_management` | 3 | 3-6 |
| **3-13** | M3 | CSV backfill seeder (5,008 rows, photo rehosting, idempotent) | 3 | 3-6 |
| **3-9** | M4 | Pruning-requests module (backend entity + workflow + extended `admin_data` guards + notifications + push endpoints) | 4 | 3-2 |
| **3-10** | M4 | Pruning-requests frontends (mobile kecamatan + review; web queues + detail; mobile-web responsive) | 5 | 3-9, 3-6, **M1-R** |
| **3-11** | M4 | Service capacity calendar (backend + web responsive week grid + mobile lookup) | 4 | 3-9, **M1-R** |
| **3-12** | M4 | Plant-seed inventory (backend + mobile + web) | 3 | 3-2, **M1-R** |
| **3-14** | M2 | Load test (k6 500-worker simulation) + regression fixes | 3 | 3-3…3-8 |
| **3-15** | M5 | Documentation final sync (specs, COMPLETION_STATUS, all CLAUDE.md) | 2 | all |

**Total:** 73 dev-days single-threaded.

### Parallelization Diagram

```
Week 1:   3-R1 (token pipeline + CI + ESLint) ──┐
          (parallel) 3-1 (spec sync)            │
                                                 │
Week 2:   3-R2 (token values + fonts) ←─ 3-R1   │
          3-R3 (NB primitives + visreg) ←─ 3-R2 │
          3-R4 (PWA shell + responsive) ←─ 3-R2 │
          (parallel) 3-2 (schema + roles) ←─ 3-1│
                                                 │
Week 3:   3-R5 (full redesign sweep) ←─ 3-R3 + 3-R4
                                                 │
Week 3-4: 3-3 (monitoring backend) ─────────────────────────────┐
          3-6 (task typing API)     ─────────────────┐          │
          3-9 (pruning_requests BE) ─────────┐       │          │
          3-12 (seed ledger)        ─────────┤       │          │
                                             │       │          │
Week 4-5: 3-4 (web monitoring)  ←─── 3-3 + M1-R                 │
          3-5 (mobile monitoring)←── 3-3 + M1-R                 │
          3-7 (pruning task UX)  ←── 3-6 + M1-R                 │
          3-8 (due-date forecast)←── 3-6                        │
          3-10 (pruning FE)      ←── 3-9 + 3-6 + M1-R           │
          3-11 (capacity cal.)   ←── 3-9 + M1-R                 │
          3-13 (CSV backfill)    ←── 3-6                        │
                                                                │
Week 6:   3-14 (k6 load test) ←──── 3-3…3-8                     │
Week 6-7: 3-15 (doc sync) ←──────── all ────────────────────────┘
```

### Sub-Phase Detail

#### 3-R1: Token pipeline + CI + ESLint plumbing (3 days)

**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md). Full design reference: [specs/ui-ux/design-tokens.md](../../ui-ux/design-tokens.md).

Plumbing only — zero user-visible change. After this, no PR can land inline hex colors or soft-blur shadows.

| Task | Scope | Key files |
|------|-------|-----------|
| Add `scripts/build-tokens.ts` — JSON → (CSS, TS) emitter | hand-rolled ~100-line TS script per ADR-036; reads `specs/ui-ux/tokens.json`; emits `fe/web/src/app/generated/tokens.css` and `fe/mobile/src/constants/generated/tokens.ts` | `scripts/build-tokens.ts` |
| Wire `npm run tokens:build` and `npm run tokens:verify` into root `package.json` | verify = rerun generator + diff against committed output | `package.json` |
| Add CI step: validate `tokens.json` against `tokens.schema.json`, then run `tokens:verify` | fails build on schema violation or drift | `.github/workflows/ci.yml` |
| Add ESLint rules: `no-inline-hex-colors` (exclude `generated/**`), `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility` | enforcement from 3-R1 onward | `fe/web/eslint.config.mjs`, `fe/mobile/eslint.config.js` |
| Mobile RN custom rule: ban `shadowRadius: > 0` literal | maintains hard-edge invariant | `fe/mobile/eslint.config.js` |
| Generator snapshot test fixture | pins generator output; protects against accidental emitter changes | `scripts/build-tokens.test.ts` |
| Commit initial empty `generated/` artifacts | values arrive in 3-R2 | `fe/web/src/app/generated/`, `fe/mobile/src/constants/generated/` |

**Deliverables:**
- Generator + CI + lint rules live; CI fails on a deliberately-drifted test PR.
- ADR-036 status flipped Draft → Accepted; generator choice (hand-rolled, not Style Dictionary) recorded.

**Exit criteria:**
- [ ] `npm run tokens:build && git diff --exit-code` clean (idempotent).
- [ ] CI `tokens-verify` job green.
- [ ] ESLint blocks a PR with hex literal in non-`generated/` file.

---

#### 3-R2: Token value migration + brand-font bundling (3 days)

**Goal:** Both platforms consume tokens exclusively from `generated/`. Every drifted color/shadow/type value is corrected. Brand fonts load.

| Task | Scope | Key files |
|------|-------|-----------|
| Strip Layer-1 values from `nbTokens.ts`; re-export from `./generated/tokens`; keep platform helpers (`useNBPress`, `pressStyle`) | mobile token source becomes a thin wrapper | `fe/mobile/src/constants/nbTokens.ts` |
| Rewrite `globals.css` to `@import './generated/tokens.css'` at top; delete Layer-1 from `@theme`; keep utility classes | web token source becomes a thin wrapper | `fe/web/src/app/globals.css` |
| Bundle OFL fonts on mobile: Space Grotesk (500/600/700/800), Inter (400/500/600/700), JetBrains Mono (400/500/600); add OFL.txt per family; configure `react-native.config.js` `assets` | establishes brand identity on mobile | `fe/mobile/assets/fonts/`, `fe/mobile/react-native.config.js` |
| Load fonts on web via `next/font/google` with `display: swap`, `subsets: ['latin','latin-ext']`, CSS variables `--font-display|body|mono` | establishes brand identity on web | `fe/web/src/app/layout.tsx` |
| Token value drift fixes (mobile + web must converge) | see drift table below | (tokens.json + regenerate) |

**Drift fixes locked in 3-R2:**

| Token | Mobile before | Web before | After (both) |
|-------|---------------|------------|--------------|
| `color.primary.hover` | `#5A9B6F` | `#5A9468` | `#6BA87A` |
| `color.primary.active` | (absent) | — | `#5A9468` |
| `color.secondary` | `#6B4423` | `#8B7355` | `#8B7355` |
| `color.secondary.hover` | `#8B5E3C` | — | `#725E45` |
| `color.success` | `#90EE90` | `#7FBC8C` | `#7FBC8C` |
| `color.info` | `#A7DBD8` | `#A7DBD8` | `#69D2E7` |
| `type.h1` | 30 / 1.2 | 28 / 1.2 | 28 / 1.2 |
| `type.h2` | 24 / 1.3 | 22 / 1.3 | 22 / 1.3 |
| `type.h3` | 20 / 1.35 | 18 / 1.35 | 18 / 1.35 |
| `shadow.*` radius | 1–4 | 1–4 (blur) | 0 |
| `shadow.*` opacity | 0.15–0.22 | rgba(.15–.22) | 1.0 (opaque `#1C1917`) |
| Web focus ring | — | 4 px rgba 0.4 | 3 px solid `#7FBC8C` + 2 px offset |

**Deliverables:**
- Both platforms consume tokens only from `generated/`.
- Hard-edge shadows visible (opaque `#1C1917`, zero blur/radius).
- Mobile inspector shows Space Grotesk on `<NBText variant="h1">`; web DevTools shows Inter on body.
- Side-by-side device screenshot (pre vs post) shows visibly sharper NB stamp.

**Exit criteria:**
- [ ] `git grep -nE '#[0-9a-fA-F]{6}' fe/{mobile,web}/src | grep -v generated` returns zero hits (or allowlist-only).
- [ ] CHANGELOG v2.1.1 appended documenting the value migration.
- [ ] Obsolete-info banners landed in `specs/mobile/design-tokens.md` + `color-palette-standardization.md`.

---

#### 3-R3: NB primitive migration + NBModal/NBToast/NBText + visual regression (3 days)

**Goal:** All shared NB components consume only generated tokens. Three new mobile components ship. Visual regression baseline locks the look.

| Task | Scope | Key files |
|------|-------|-----------|
| Migrate web NB primitives to `shadow-nb-*` utilities + `.nb-focus-ring`; audit for inline hex | parity with mobile per `design-tokens.md §Component Parity Matrix` | `fe/web/src/components/ui/*` |
| Migrate mobile NB primitives to generated shadow helper + `useNBPress()` | hard-edge press animation; 100ms timing | `fe/mobile/src/components/nb/*` |
| Build `NBModal.tsx` | wraps `@gorhom/bottom-sheet` for ≤50% viewport content; wraps RN `<Modal>` for full-screen forms (species autocomplete, partial-complete, convert-to-task, seed transaction, photo picker) | `fe/mobile/src/components/nb/NBModal.tsx` |
| Build `NBToast.tsx` | wraps `react-native-toast-message` with NB chrome (border, hard-edge shadow, uppercase title, Lucide icon pair, bottom position, 4s default) | `fe/mobile/src/components/nb/NBToast.tsx` |
| Build `NBText.tsx` | typography component; `variant="h1|h2|h3|body-lg|body|body-sm|caption|mono-sm"`; reads from generated `type.*` | `fe/mobile/src/components/nb/NBText.tsx` |
| Visual regression harness (web): Playwright `toHaveScreenshot` over NB primitives + login + dashboard at 375/768/1280 px; tolerance 0.1% | gates subsequent PRs | `fe/web/e2e/visual-regression.spec.ts`, `fe/web/e2e/__snapshots__/` |
| Visual regression harness (mobile): extend Jest `react-test-renderer` snapshots to cover every NB primitive incl. new three | gates mobile PRs | `fe/mobile/__tests__/nb/*.test.tsx` |
| Add CI jobs `web-visreg` + `mobile-snapshots` | green-required for merge | `.github/workflows/ci.yml` |

**Deliverables:**
- Every NB primitive passes parity-matrix inspection (mobile app + desktop web side-by-side).
- NBModal / NBToast / NBText each consumed by ≥1 canary screen.
- Visual regression baselines committed and CI-gated.
- `specs/mobile/component-library.md` updated with NBModal/NBToast/NBText entries.
- `specs/ui-ux/design-tokens.md §Component Parity Matrix` shows Modal/Toast/Text rows as "shipped in 3-R3".

**Exit criteria:**
- [ ] `web-visreg` + `mobile-snapshots` green.
- [ ] ESLint zero `no-inline-hex-colors` violations across `fe/{web,mobile}/src/components/`.

---

#### 3-R4: Web PWA shell + mobile-web responsive scaffolding (2 days)

**Goal:** Web is installable AND mobile-web-usable. Every Phase-3 page that 3-4 / 3-10 / 3-11 / 3-12 will build sits on a `ResponsiveShell` that handles the three-breakpoint navigation.

**Related ADRs:** [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md).

| Task | Scope | Key files |
|------|-------|-----------|
| Add PWA manifest | `background: #F5F0EB`, `theme: #1A4D2E`, 192/512/512-maskable icons, 2 shortcuts | `fe/web/public/manifest.webmanifest` |
| Generate icon set | SEKAR "S" glyph (Space Grotesk 800 on `#7FBC8C`, 2px `#1C1917` border, 4px shadow) at 192/512/512-maskable (20% safe-zone)/180 apple-touch | `fe/web/public/icons/` |
| Service worker | shell pre-cache (HTML, generated tokens.css, JS bundle, fonts, icons); runtime caching per spec; POST/PUT/DELETE = network-only | `fe/web/src/sw/sw.ts` → `public/sw.js` |
| Build `InstallBanner` | NB callout (yellow `#FDFD96` bg, 2px border, 4px shadow, `role="dialog"`); `beforeinstallprompt` capture; 14-day localStorage suppression | `fe/web/src/components/pwa/InstallBanner.tsx` |
| Build `OfflineBanner` | `role="status"` strip when `navigator.onLine === false`; copy "Mode offline — menampilkan data terakhir <X> menit lalu" | `fe/web/src/components/pwa/OfflineBanner.tsx` |
| Build `UpdateToast` | shown on `registration.waiting`; CTA "Muat ulang" | `fe/web/src/components/pwa/UpdateToast.tsx` |
| Build `MobileInstallPush` | role-gated <768px login banner for satgas/linmas/korlap directing to native app install | `fe/web/src/components/pwa/MobileInstallPush.tsx` |
| Build `usePushSubscription` hook | subscribes admin roles on login; POST `/api/push/register` (backend stub specced) | `fe/web/src/hooks/usePushSubscription.ts` |
| `/install-help` page | static iOS Safari install walkthrough | `fe/web/src/app/install-help/page.tsx` |
| Build `ResponsiveShell` | sidebar (≥1280) / icon rail (768–1279) / ☰ drawer (<768); every Phase-3 page composes through it | `fe/web/src/components/layout/ResponsiveShell.tsx` |
| `(kecamatan)` layout scaffold | minimal top-bar shell for `staff_kecamatan`; populated by 3-10 | `fe/web/src/app/(kecamatan)/layout.tsx` |
| Register manifest + theme-color meta + viewport-fit + safe-area insets in root layout | SW registration in production builds only | `fe/web/src/app/layout.tsx`, `next.config.ts` |

**Deliverables:**
- Lighthouse PWA ≥ 90 on `/monitoring`.
- Install banner visible on Android Chrome; iOS `/install-help` renders.
- Offline shell renders on `navigator.onLine = false` with last-good snapshot + yellow banner.
- Mobile-web at 375 px renders sample dashboard correctly via `ResponsiveShell`.
- Mobile-web login at 375 px as `satgas` shows install-push banner.
- ADR-037 status flipped Draft → Accepted; SW library choice locked.

**Rollback:** feature flag `NEXT_PUBLIC_FEATURE_PWA` gates SW registration.

---

#### 3-R5: Full redesign sweep on non-rewritten screens (3 days)

**Goal:** No screen left on old tokens. Mobile native + mobile web + desktop web share one visual language across the entire app, not just Phase-3 new pages.

**Mobile screens swept (token + shadow + font + focus-ring audit; no functional change):**
- Auth: `LoginScreen`, `LoadingScreen`, onboarding (OB-1/2/3)
- Worker: `HomeScreen`, `ClockInScreen`, `ClockOutScreen`, `LocationTrackingScreen`, `TasksListScreen`, `TaskDetailScreen`, `ActivityFormScreen`, `OvertimeScreen`, `ProfileScreen`, `EditProfileScreen`, `SettingsScreen`, `NotificationsScreen`
- Supervisor: `KorlapHomeScreen`, `UsersListScreen`, `ReportsScreen`, `SchedulesScreen`
- Shared: error / empty / skeleton fallbacks, splash

**Web pages swept (with mobile-web + tablet + desktop layouts each):**
- `(auth)/login`
- `(dashboard)/` (home), Users, Areas, Rayons (index), Overtime, Schedules, Reports, Profile, Settings, Audit Logs
- Every page wraps in `ResponsiveShell` from 3-R4

**Explicitly NOT in 3-R5** (these ship green-field on tokens in their own sub-phase):
- Mobile: MapDashboard (3-5), PruningTaskForm (3-7), SubmitScreen/MyRequests/ReviewQueue/Seeds (3-10/3-12)
- Web: `/monitoring` (3-4), `/plants/*` (3-8), `/tasks/*` (3-7), `/pruning-requests/*` (3-10), `/rayons/[id]/capacity` (3-11), `/seeds/*` (3-12)

**Sweep checklist (per file):**
1. Replace `#[0-9a-fA-F]{6}` and `rgba(...)` with token import or `text-nb-*`/`bg-nb-*`/`shadow-nb-*` utilities.
2. Replace `shadowRadius` and `blur-*` with generated shadow tokens.
3. Replace hand-computed font sizes with `<NBText variant="...">` (mobile) or `text-nb-*` utilities (web).
4. Confirm focus ring uses `.nb-focus-ring` (web) / `NBTextInput` flash (mobile).
5. Verify every status uses `icon + text` (no color-only signalling — WCAG).
6. Web pages: wrap in `ResponsiveShell`; add mobile-web layout (vertical cards / bottom-sheet filters / full-screen-dialog edit).
7. Update visual regression snapshot.

**Role-aware shells migrated:**
- Mobile: `WorkerTabs`, `KorlapTabs`, `KepalaRayonTabs`, `AdminDataTabs`, `StaffKecamatanTabs`
- Web: `Sidebar` 9-role gating

**Deliverables:**
- `git grep -nE '#[0-9a-fA-F]{6}' fe/{mobile,web}/src` returns zero hits outside `generated/` and `scripts/hex-allowlist.txt` exceptions.
- Every migrated screen has updated visual regression snapshot.
- Every web page renders correctly at 375 / 768 / 1280 px.
- `specs/ui-ux/design-tokens.md §Migration plan` table has zero "Phase 4 backlog" rows.
- `CLAUDE.md` (root) reflects full-sweep completion.

---

#### 3-1: Spec deferral + ADRs + CLAUDE.md sync (2 days)

| Task | Scope |
|------|-------|
| Rename `phase-3-polishing/` → `phase-4-production-readiness/`; `phase-4-finishing/` → `phase-5-finishing-ios/` | git-tracked moves |
| Update cross-references in renamed folders | content sync only |
| Write ADR-029…035 (see spec ADRs index) | 7 ADRs |
| Sync `specs/README.md`, `specs/phases/README.md`, `specs/phases/DEPENDENCY_MATRIX.md`, `specs/COMPLETION_STATUS.md`, root `CLAUDE.md` | housekeeping |

**Deliverables:** 7 ADRs, renamed folders, updated phase index.

#### 3-2: Schema + role extension (4 days)

| Task | Scope | Key Files |
|------|-------|-----------|
| Migration `17460000000000-Phase3Schema.ts` | new tables + altered tables + role-enum extension | `be/src/database/migrations/` |
| Seed `plant_species` (131 rows) | dedupe CSV column 6 | `be/src/database/seeds/seed-plant-species.ts` |
| Seed `monitoring_configs` additions | staffing_debounce_seconds, stale_status_sweep_cron, cluster_zoom_threshold, redis_stream_max_len | `seed-monitoring-configs.ts` |
| Add `staff_kecamatan` to `UserRole` enum + `constants/role-groups.ts` | new group `PRUNING_REQUEST_REVIEWERS = [admin_data]` | `be/src/modules/users/enums/role.enum.ts`, `constants/role-groups.ts` |
| Sweep every `@Roles(...)` decorator | verify `staff_kecamatan` denied where appropriate | `be/src/modules/**/*.controller.ts` |

**Deliverables:** 8 new tables, 5 altered tables, enum extension, `PRUNING_REQUEST_REVIEWERS` permission group.

#### 3-3: Monitoring v2 backend (7 days)

| Task | Scope | Key Files |
|------|-------|-----------|
| Redis service + health check + fallback to in-process pub/sub | `REDIS_URL` env, connection-pool with graceful shutdown | `be/src/common/services/redis.service.ts` |
| Socket.IO Redis adapter wiring | `@socket.io/redis-adapter` on `EventsGateway` | `be/src/gateways/events.gateway.ts` |
| Redis Streams location→status pipeline | producer on `onLocationPing`, consumer group `monitoring-projector` | new `StatusProjectorService` |
| `StatusProjectorService` | reads stream, eager-loads user context once, writes `user_tracking_status`, emits events | new service |
| `StaffingDebouncerService` | collapses bursts within `STAFFING_DEBOUNCE_SECONDS` (default 30) | new service |
| `StaleStatusSweeperService` | `@Cron('*/5 * * * *')`, flips ACTIVE without recent ping → MISSING | new service |
| Rewrite `onLocationPing` | single user-context eager-load; queue to Redis stream instead of 6+ DB queries | `be/src/modules/monitoring/services/status-calculator.service.ts:186-263` |
| Fix batch-ingest bug | iterate batch (or sample), not just latest | `be/src/modules/location/location.service.ts:92-103` |
| Index migrations | `location_logs` + `user_tracking_status` (see database.md) | `Phase3Schema.ts` |
| `GET /monitoring/snapshot` unified payload | replaces multiple round-trips; keyed React Query cache | `monitoring.controller.ts` |

**Deliverables:** Redis + Socket.IO adapter + Streams projector + debouncer + sweeper + rewritten `onLocationPing` + snapshot endpoint + all indexes.

#### 3-4: Monitoring v2 web (6 days)

| Task | Scope | Key Files |
|------|-------|-----------|
| Supercluster layer | Mapbox GL JS + `supercluster` npm | `fe/web/src/components/monitoring/ClusterLayer.tsx` |
| Incremental WS patch handling | React Query cache key `monitoring:snapshot:<scope>:<id>`; apply patches on message | `fe/web/src/app/(dashboard)/monitoring/page.tsx:100-216` |
| Virtualized worker list | `@tanstack/react-virtual` | `WorkerListVirtual.tsx` |
| Hierarchy filter panel | rayon / area / worker cascading toggles | `HierarchyFilterPanel.tsx` |
| Plant overlay + overdue color layer | green/yellow/red area fill by `area_plants.status` | `PlantOverlayLayer.tsx`, `AreaStatusOverlay.tsx` |
| Area detail drawer | shift info + activities + plants summary | `AreaDetailDrawer.tsx` |

**Deliverables:** Supercluster rendering, incremental WS, virtualized list, role-aware sidebar covering 9 roles.

#### 3-5: Monitoring v2 mobile (5 days)

| Task | Scope | Key Files |
|------|-------|-----------|
| `ClusterMarker` parallel component | leaves existing `UserMarker` intact | `fe/mobile/src/components/monitoring/ClusterMarker.tsx` |
| Cluster-vs-markers switch by zoom | preserves `tracksViewChanges={false}` + `LabelMode` enum in key | `ClusteredUserMarkers.tsx` |
| A/B feature flag | `featureFlags.clusterMarkersV2` | `fe/mobile/src/config/featureFlags.ts` |
| Lint rule | forbid re-enabling `tracksViewChanges={true}` anywhere in `components/monitoring/` | `.eslintrc` custom rule |
| Overlay toggle sheet | NB bottom sheet, workers/plants/overdue toggles | `MonitoringToggleSheet.tsx` |
| Area status fill | color by `area_plants.status` | `AreaStatusOverlay.tsx` |
| Preserve `LocationTrail` `requestAnimationFrame` mount guard | reference pattern; do not modify file | `components/monitoring/LocationTrail.tsx` |

**Deliverables:** Parallel cluster path behind flag, overlay sheet, area status fill, preserved Apr 24 fixes.

#### 3-6: Task typing + partial-complete API (4 days)

| Task | Scope |
|------|-------|
| Extend `Task` entity | `task_type`, `custom_fields`, `parent_task_id`, `target_plant_count`, `completed_plant_count` |
| `TaskTypeRegistry` service | per-type Zod schema for `custom_fields` validation |
| `POST /tasks` extensions | accept `task_type`, `custom_fields`, `target_plant_count` |
| `POST /tasks/:id/partial-complete` | body includes progress + plant_items; spawns child if `completed_plant_count < target_plant_count` |
| `POST /tasks/:id/resume` | creates child task linked via `parent_task_id` |
| `GET /tasks/:id/lineage` | tree of parent/children |
| Extend `Activity` entity | `custom_fields`, `reference_code`, `pruning_request_id`, `photo_before_url`, `photo_after_url` |
| `activity_plant_items` relation | species × count line items |

**Deliverables:** Typed tasks API, activity extensions, `TaskTypeRegistry`.

#### 3-7: Pruning task UX (5 days)

| Task | Scope |
|------|-------|
| `PruningTaskForm` component | species autocomplete (131 entries), quantity, maintenance type (PC/PM/PB), partial-complete action |
| Task detail "Lanjutkan Besok" CTA | calls `/tasks/:id/resume` |
| Web task create: dynamic form per `task_type` | species multi-select with quantities |
| Mobile offline queue scaffold | `activity.submit`, `activity.partial` (full offline polish deferred to Phase 4 / ADR-019) |

#### 3-8: Due-date forecast + overdue alerts (3 days)

| Task | Scope |
|------|-------|
| `PlantDueDateService` | species × area_type lookup; manual override column |
| `@Cron('0 2 * * *')` `PlantDueDateRecalculator` | daily recomputation of `area_plants.next_due_at` / `status` |
| Top-management alerts digest | daily email/FCM on overdue areas |

#### 3-9: Pruning-requests backend (4 days)

| Task | Scope |
|------|-------|
| `PruningRequestService` | submit / list / review / convert / outcome |
| Guard extension for `admin_data` via `PRUNING_REQUEST_REVIEWERS` | new role-group constant |
| Rayon scoping via `users.rayon_id` | reject if request rayon ≠ reviewer rayon |
| Notifications on status change | FCM to submitter; toast on web |

#### 3-10: Pruning-requests frontends (5 days)

| Task | Scope |
|------|-------|
| Mobile `SubmitScreen` (kecamatan) | GPS capture, photo upload, expected_date |
| Mobile `MyRequestsScreen` + `RequestDetailScreen` | outcome visibility with task + activity photos |
| Mobile `ReviewQueueScreen` (admin_data) | approve/reject/convert-to-task |
| Web `/pruning-requests/` queue + `[id]/` detail | filter by status, rayon (for top_management read-only) |

#### 3-11: Service capacity calendar (4 days)

| Task | Scope |
|------|-------|
| `CapacityService` | weekly grid per rayon × ISO-week × service_type; implicit booking on convert-to-task |
| `GET/PUT /rayons/:id/capacity?service_type=&year=&from_week=&to_week=` | admin_data (own rayon) / top_management |
| `POST /rayons/:id/capacity/book` | manual adjustment |
| Web capacity calendar page | week grid with editable capacity + booked bar |
| Mobile read-only view in `ReviewQueueScreen` | shows available slot before convert |

#### 3-12: Plant-seed inventory (3 days)

Unified `plant_seeds` + `seed_transactions` ledger. CRUD on web + mobile for `admin_data` at Rayon Taman Aktif and `top_management`.

#### 3-13: CSV backfill seeder (3 days)

One-off importer. Idempotent on `activities.reference_code`. Rehosts Google Drive photos to S3 via background job. Discards blank columns 18/19 and the `#VALUE!` header in column 22.

#### 3-14: Load test + regression fixes (3 days)

k6 harness simulating 500 workers pinging every 12 s for 30 min. Pass criteria:
- p95 ingest < 200 ms
- p95 status broadcast < 500 ms
- Postgres pool utilization < 70 %
- Redis stream consumer lag < 5 s
- Zero missed status transitions (sampled from event log)

#### 3-15: Documentation final sync (2 days)

Update `specs/COMPLETION_STATUS.md`, all phase STATUS files, and every module-level `CLAUDE.md` touched by this phase.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Amending ADR-009 surprises stakeholders | Medium | Medium | ADR-032 documents scope narrowly (pruning_requests only, rayon-scoped); no overtime or user-mgmt rights added |
| Unknown CSV acronyms (GT / PT / PS / PK / PD) | Medium | Low | Store raw codes + `display_label` lookup so labels change without migration; confirm with client in 3-2 |
| 131-species taxonomy is messy | Medium | Low | Keep raw `name_id`; build clean lookup iteratively; do not block on perfect taxonomy |
| Mobile cluster regression re-introduces Apr 24 marker jank | Medium | High | Keep `UserMarker` intact; `ClusterMarker` is parallel; A/B feature flag + lint rule forbidding `tracksViewChanges={true}` |
| Redis outage breaks monitoring | Low | High | In-process pub/sub fallback; surface Redis state on `/health`; degraded mode is explicit |
| k6 reveals unknown bottlenecks | Medium | Medium | 3-14 reserves 3 days with regression-fix budget |
| `staff_kecamatan` breaks existing `@Roles(...)` guards | Medium | Medium | Systematic grep in 3-2; role-matrix integration test covering every endpoint |
| ADR-009 task-status debt (8 vs 4) lingers | High | Low | Explicitly deferred; logged in Phase 4 backlog |

---

## Open Questions (to confirm with client early in 3-2)

- Handling-status codes GT / PT / PS / PK / PD — human-readable meanings
- Plant-seed inventory visibility: `kepala_rayon` too, or strictly `admin_data` @ Taman Aktif + `top_management`?
- Capacity calendar granularity: weekly (planned) or daily?
- Notable-plants visibility to field workers, or admin-only?
- Plant species catalog editable by `admin_data`, or `admin_system` only?

---

## What Gets Deprecated / Superseded

| Current Code | Status | Replacement |
|-------------|--------|-------------|
| In-process `EventEmitter` for Socket.IO | Replaced | Redis adapter (ADR-029) |
| `StatusCalculatorService.onLocationPing` 6+ query path | Rewritten | Eager-loaded context + Redis Streams producer |
| `location.service.ts:92-103` latest-only batch logic | Rewritten | Iterate batch (or reservoir sample) |
| Un-debounced `AREA_STAFFING_CHANGED` | Replaced | `StaffingDebouncerService` |
| ADR-011 monitoring status model (single-source) | Superseded | ADR-029 (event-sourced, decoupled projector) |
| Phase 4 Redis adoption (ADR-016) | Promoted earlier | Installed in this phase; Phase 4 inherits |
| `report` entity mentions in legacy docs | Already dropped in ADR-010 | No change |

---

## Related Documents

- [Backend Requirements](./backend.md)
- [Database Schema](./database.md)
- [Mobile Requirements](./mobile.md)
- [Web Requirements](./web.md)
- [Infrastructure](./infrastructure.md)
- [Testing Plan](./testing.md)
- [UI/UX Design](./ui-ux.md)
- [Implementation Journal](./status_progress.md)
- [Implementation Reviews](./status_reviews.md)
- [Deployment Checklist](./status_deployment_checklist.md)
- [Progress Tracker](./STATUS.md)

---

**Last Updated:** 2026-04-24
