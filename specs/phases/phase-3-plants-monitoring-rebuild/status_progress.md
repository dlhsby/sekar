# Phase 3 — Implementation Progress

**Last Updated:** 2026-04-25
**Status:** ⏳ Not Started — skeleton only; fill in as sub-phases ship

This document mirrors the Phase 2D `status_progress.md` pattern: a sub-phase-by-sub-phase journal that's updated in-flight and finalized on phase completion. `STATUS.md` is the live task-level tracker; this file is the narrative log.

---

## Overall Progress

| Milestone | Sub-Phase | Progress | Status | Lead agent / skill | Notes |
|-----------|-----------|----------|--------|--------------------|-------|
| **M1-R** | 3-R1 Token pipeline + CI + ESLint | 0 % | ⏳ Not Started | web-developer + mobile-developer | Generator + CI gate + lint rules |
| **M1-R** | 3-R2 Token value migration + brand fonts | 0 % | ⏳ Not Started | web-developer + mobile-developer | Drift fixes + font bundling |
| **M1-R** | 3-R3 NB primitives + NBModal/NBToast/NBText + visreg | 0 % | ⏳ Not Started | web-developer + mobile-developer | Primitives migration + 3 new mobile components |
| **M1-R** | 3-R4 Web PWA shell + responsive scaffolding | 0 % | ⏳ Not Started | web-developer | Manifest/SW/icons + ResponsiveShell + (kecamatan) layout |
| **M1-R** | 3-R5 Full redesign sweep on non-rewritten screens | 0 % | ⏳ Not Started | web-developer + mobile-developer | Promoted from prior Phase 4 backlog |
| **M1-S** | 3-1 Spec sync + ADRs 029–037 + obsolete-info cleanup | ~80 % | 🟡 In Progress | docs pass | Most spec + ADR work done Apr 24–25; final sweep + M1-R reflection after redesign lands |
| **M1-S** | 3-2 Schema + role extension | 0 % | ⏳ Not Started | database-engineer + backend-developer | Migration + `staff_kecamatan` + seed |
| **M2** | 3-3 Monitoring v2 backend | 0 % | ⏳ Not Started | backend-developer | Redis + Streams + projector + debouncer + sweeper |
| **M2** | 3-4 Monitoring v2 web | 0 % | ⏳ Not Started | web-developer | Supercluster + incremental WS + virtualization |
| **M2** | 3-5 Monitoring v2 mobile | 0 % | ⏳ Not Started | mobile-developer | Parallel `ClusterMarker` behind flag |
| **M2** | 3-14 Load test + regression | 0 % | ⏳ Not Started | devops-engineer + backend-developer | k6 harness, 500-worker scenario |
| **M3** | 3-6 Task typing + custom fields API | 0 % | ⏳ Not Started | backend-developer | `task_type` enum + Zod registry + lineage |
| **M3** | 3-7 Pruning task UX | 0 % | ⏳ Not Started | mobile-developer + web-developer | Form + partial complete + resume |
| **M3** | 3-8 Due-date forecast + alerts | 0 % | ⏳ Not Started | backend-developer | Daily cron + FCM `area_plant_overdue` |
| **M3** | 3-13 CSV backfill seeder | 0 % | ⏳ Not Started | backend-developer | 5 008 rows, idempotent on `reference_code` |
| **M4** | 3-9 Pruning-requests backend | 0 % | ⏳ Not Started | backend-developer | State machine + ADR-032 guards |
| **M4** | 3-10 Pruning-requests frontends | 0 % | ⏳ Not Started | mobile-developer + web-developer | Kecamatan submit; admin review |
| **M4** | 3-11 Service capacity calendar | 0 % | ⏳ Not Started | backend-developer + web-developer | Week grid editor, implicit booking |
| **M4** | 3-12 Plant-seed inventory | 0 % | ⏳ Not Started | backend-developer + mobile-developer | `plant_seeds` + `seed_transactions` |
| **M5** | 3-15 Documentation final sync | 0 % | ⏳ Not Started | docs pass | Specs + STATUS + CLAUDE.md sweep |
| **M5** | Rollout | 0 % | ⏳ Not Started | devops-engineer | Pilot Selatan → all rayons |

**Overall Phase 3 completion: ~5 %** (spec deferral + ADR work under 3-1 is most of what's done today).

---

## Sub-Phase 3-R1: Token pipeline + CI + ESLint — ⏳

**Planned duration:** 3 days
**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md)

| Task | Status | Notes |
|------|--------|-------|
| `scripts/build-tokens.ts` emitter (~100 lines hand-rolled) | ⏳ | |
| Wire `npm run tokens:build` + `tokens:verify` | ⏳ | root `package.json` |
| CI schema validation + generator drift check | ⏳ | `tokens-verify` job |
| ESLint rules (`no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`) | ⏳ | both web + mobile |
| Mobile RN custom rule banning `shadowRadius > 0` | ⏳ | |
| Generator snapshot fixture | ⏳ | `scripts/build-tokens.test.ts` |
| Commit empty `generated/` artifacts | ⏳ | |

---

## Sub-Phase 3-R2: Token value migration + brand-font bundling — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| Strip Layer-1 from `nbTokens.ts`, re-export from generated | ⏳ | |
| Rewrite `globals.css` → `@import './generated/tokens.css'` | ⏳ | |
| Bundle OFL fonts (Space Grotesk, Inter, JetBrains Mono) on mobile | ⏳ | `fe/mobile/assets/fonts/` |
| `react-native.config.js` font linking | ⏳ | |
| Web `next/font/google` loaders in root layout | ⏳ | |
| Drift fixes: primary.hover, secondary, success, info, type h1/h2/h3, opaque shadows, focus ring | ⏳ | see README §3-R2 drift table |
| Append CHANGELOG v2.1.1 entry | ⏳ | `specs/ui-ux/CHANGELOG.md` |
| Deprecation banners on `specs/mobile/design-tokens.md` + `color-palette-standardization.md` | ⏳ | |

---

## Sub-Phase 3-R3: NB primitives + NBModal/NBToast/NBText + visreg — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| Migrate web primitives to `shadow-nb-*` + `.nb-focus-ring` | ⏳ | `fe/web/src/components/ui/*` |
| Migrate mobile primitives to generated shadow helper + `useNBPress` | ⏳ | `fe/mobile/src/components/nb/*` |
| Build `NBModal.tsx` (`@gorhom/bottom-sheet` + RN `<Modal>`) | ⏳ | sheet ≤50% / fullscreen complex |
| Build `NBToast.tsx` (`react-native-toast-message` wrapper) | ⏳ | |
| Build `NBText.tsx` typography component | ⏳ | 8 variants |
| Web Playwright `toHaveScreenshot` baseline at 375/768/1280 px | ⏳ | tolerance 0.1% |
| Mobile Jest snapshots over every primitive | ⏳ | |
| CI jobs `web-visreg` + `mobile-snapshots` | ⏳ | merge gate |
| `specs/mobile/component-library.md` updated with NBModal/NBToast/NBText | ⏳ | |
| `specs/ui-ux/design-tokens.md §Component Parity Matrix` marks Modal/Toast/Text shipped | ⏳ | |

---

## Sub-Phase 3-R4: Web PWA shell + mobile-web responsive scaffolding — ⏳

**Planned duration:** 2 days
**Related ADRs:** [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md)

| Task | Status | Notes |
|------|--------|-------|
| `manifest.webmanifest` + icon set (192/512/512-maskable/180) | ⏳ | |
| Service worker (`fe/web/src/sw/sw.ts` → `public/sw.js`) | ⏳ | shell precache + runtime caching per spec |
| `InstallBanner`, `OfflineBanner`, `UpdateToast` | ⏳ | NB chrome |
| `MobileInstallPush` (role-gated <768px login banner) | ⏳ | satgas/linmas/korlap → native app |
| `usePushSubscription` hook | ⏳ | admin roles → `POST /api/push/register` |
| `/install-help` page (iOS Safari fallback) | ⏳ | static walkthrough |
| `ResponsiveShell` component | ⏳ | sidebar / icon rail / ☰ drawer |
| `(kecamatan)` layout scaffold | ⏳ | populated by 3-10 |
| Manifest registration + theme-color + viewport-fit + safe-area | ⏳ | `app/layout.tsx` |
| `next.config.ts`: PWA build pipeline + `NEXT_PUBLIC_FEATURE_PWA` flag | ⏳ | |

---

## Sub-Phase 3-R5: Full redesign sweep on non-rewritten screens — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| Sweep mobile auth + onboarding | ⏳ | LoginScreen, LoadingScreen, OB-1/2/3 |
| Sweep mobile worker stack (12 screens) | ⏳ | Home, ClockIn/Out, LocationTracking, Tasks*, ActivityForm, Overtime, Profile, EditProfile, Settings, Notifications |
| Sweep mobile supervisor stack (4 screens) | ⏳ | KorlapHome, UsersList, Reports, Schedules |
| Sweep mobile shared (error/empty/skeleton/splash) | ⏳ | |
| Sweep web `(auth)/login` at 3 breakpoints | ⏳ | |
| Sweep web dashboard pages (10) at 3 breakpoints | ⏳ | home, Users, Areas, Rayons-index, Overtime, Schedules, Reports, Profile, Settings, Audit Logs |
| Migrate role-aware shells (mobile tabs + web 9-role Sidebar) | ⏳ | |
| Update visual regression snapshots | ⏳ | every swept screen |
| Create `scripts/hex-allowlist.txt` | ⏳ | document exceptions |
| Update `specs/ui-ux/design-tokens.md §Migration plan` (remove Phase 4 row) | ⏳ | |
| Update root `CLAUDE.md` Phase 3 reflection | ⏳ | |

---

## Sub-Phase 3-1: Spec deferral + ADRs + CLAUDE.md sync — 🟡 In Progress

**Planned duration:** 2 days
**Progress:** ~80 %
**Started:** 2026-04-24
**Most work done in Apr 24–25 spec pass; final sweep pending post-code-landing.**

| Task | Status | Notes |
|------|--------|-------|
| Rename `phase-3-polishing/` → `phase-4-production-readiness/`; `phase-4-finishing/` → `phase-5-finishing-ios/` | ✅ Complete | Apr 24 (git mv preserves history) |
| Update cross-references inside renamed folders | ✅ Complete | Apr 24 (sed pass on `Phase 3` / `Phase 4` self-refs) |
| Write ADRs 029–035 | ✅ Complete | Apr 24 (7 ADRs, `specs/architecture/decisions/`) |
| Write ADRs 036, 037 | ✅ Complete | Apr 25 (tokens single-source + web PWA) |
| Sync `specs/README.md`, `specs/phases/README.md`, `DEPENDENCY_MATRIX.md`, `COMPLETION_STATUS.md` | ✅ Complete | Apr 24 (top-level specs agent pass) |
| Sync root + module-level CLAUDE.md files | ✅ Complete | Apr 24–25 (root, be/, fe/web/, be/src/modules/activities/, be/src/database/migrations/) |
| Reconcile `tokens.json` type scale with `design-tokens.html` prototype | ✅ Complete | Apr 25 (h1 32→28, h2 24→22, h3 20→18, caption weight 600→500) |
| Obsolete content sweep (drifted shadows, `#FDFD96` as canvas, `primaryDark` drift) | ✅ Complete | Apr 25 (6 files surgically updated) |
| Break Phase 3 into M1–M5 milestones | ✅ Complete | Apr 25 (README §Milestone Plan) |
| Mine `mobile-wireframes.html` into phase-3/mobile.md | ✅ Complete | Apr 25 (13 flows appended) |
| Final sweep (delta between planned vs implemented after code lands) | ⏳ | Run at end of M5 |

---

## Sub-Phase 3-2: Schema + role extension — ⏳

**Planned duration:** 4 days

| Task | Status | Notes |
|------|--------|-------|
| Migration `17460000000000-Phase3Schema.ts` | ⏳ | 8 new tables + 5 altered |
| Seed `plant_species` (131 rows from CSV col 6, deduped) | ⏳ | |
| Seed `monitoring_configs` additions (`staffing_debounce_seconds`, `stale_status_sweep_cron`, `cluster_zoom_threshold`, `redis_stream_max_len`) | ⏳ | |
| Add `staff_kecamatan` to `UserRole` enum + `constants/role-groups.ts` (`PRUNING_REQUEST_REVIEWERS = [admin_data]`) | ⏳ | |
| Sweep every `@Roles(...)` decorator to cover new role | ⏳ | Integration test `role-matrix.e2e-spec.ts` |

---

## Sub-Phase 3-3: Monitoring v2 backend — ⏳

**Planned duration:** 7 days

| Task | Status | Notes |
|------|--------|-------|
| `RedisService` (connection pool, `/health`, in-process fallback) | ⏳ | |
| Socket.IO Redis adapter | ⏳ | |
| Redis Streams location→status pipeline (producer + consumer group) | ⏳ | |
| `StatusProjectorService` (eager-load once, write `user_tracking_status`, emit events) | ⏳ | |
| `StaffingDebouncerService` (30-s window) | ⏳ | |
| `StaleStatusSweeperService` (5-min cron) | ⏳ | |
| Rewrite `onLocationPing` — single eager load + stream producer | ⏳ | `status-calculator.service.ts:186-263` |
| Fix batch-ingest bug (iterate / sample, not latest-only) | ⏳ | `location.service.ts:92-103` |
| Missing indexes on `location_logs` + `user_tracking_status` | ⏳ | |
| `GET /monitoring/snapshot` unified payload | ⏳ | |

---

## Sub-Phase 3-4: Monitoring v2 web — ⏳

**Planned duration:** 6 days

| Task | Status | Notes |
|------|--------|-------|
| `ClusterLayer` supercluster | ⏳ | |
| Incremental WS patch handler | ⏳ | React Query `setQueryData` |
| `WorkerListVirtual` (react-virtual) | ⏳ | |
| `HierarchyFilterPanel` (rayon/area/worker) | ⏳ | |
| `PlantOverlayLayer` + `AreaStatusOverlay` | ⏳ | |
| `AreaDetailDrawer` | ⏳ | |

---

## Sub-Phase 3-5: Monitoring v2 mobile — ⏳

**Planned duration:** 5 days

| Task | Status | Notes |
|------|--------|-------|
| `ClusterMarker` parallel component (preserves Apr 24 fixes) | ⏳ | |
| `ClusteredUserMarkers` switcher by zoom | ⏳ | |
| Feature flag `clusterMarkersV2` | ⏳ | |
| ESLint rule forbidding `tracksViewChanges={true}` in `components/monitoring/` | ⏳ | |
| `MonitoringToggleSheet` | ⏳ | |
| `AreaStatusOverlay` (plant status fill) | ⏳ | |

---

## Sub-Phase 3-6: Task typing + custom fields API — ⏳

**Planned duration:** 4 days

| Task | Status | Notes |
|------|--------|-------|
| `Task` entity: `task_type`, `custom_fields`, `parent_task_id`, `target_plant_count`, `completed_plant_count` | ⏳ | |
| `TaskTypeRegistry` service + Zod schemas | ⏳ | |
| `POST /tasks/:id/partial-complete` | ⏳ | Spawns child if not fully complete |
| `POST /tasks/:id/resume` | ⏳ | Explicit resume |
| `GET /tasks/:id/lineage` | ⏳ | |
| `Activity` entity extensions + `activity_plant_items` relation | ⏳ | |

---

## Sub-Phase 3-7: Pruning task UX — ⏳

**Planned duration:** 5 days

| Task | Status | Notes |
|------|--------|-------|
| `PruningTaskForm` mobile (species autocomplete, quantity, maintenance type) | ⏳ | |
| "Lanjutkan Besok" CTA | ⏳ | |
| Web dynamic form per `task_type` at `/tasks/new` | ⏳ | |
| Offline queue scaffolds `activity.submit`, `activity.partial` | ⏳ | Full polish is Phase 4 |

---

## Sub-Phase 3-8: Due-date forecast + overdue alerts — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| `PlantDueDateService` (species × area_type lookup + override) | ⏳ | |
| Daily cron `PlantDueDateRecalculator` | ⏳ | |
| Top-management digest alerts (`area_plant_overdue` FCM) | ⏳ | |

---

## Sub-Phase 3-9: Pruning-requests backend — ⏳

**Planned duration:** 4 days

| Task | Status | Notes |
|------|--------|-------|
| `PruningRequestService` | ⏳ | State machine |
| `PRUNING_REQUEST_REVIEWERS` role group | ⏳ | |
| Rayon scoping via `users.rayon_id` | ⏳ | |
| FCM notification on status change | ⏳ | |

---

## Sub-Phase 3-10: Pruning-requests frontends — ⏳

**Planned duration:** 5 days

| Task | Status | Notes |
|------|--------|-------|
| Mobile `SubmitScreen` (kecamatan 5-step) | ⏳ | |
| Mobile `MyRequestsScreen` + `RequestDetailScreen` | ⏳ | |
| Mobile `ReviewQueueScreen` (admin_data) | ⏳ | |
| Web `/pruning-requests/` queue + `[id]/` detail | ⏳ | |

---

## Sub-Phase 3-11: Service capacity calendar — ⏳

**Planned duration:** 4 days

| Task | Status | Notes |
|------|--------|-------|
| `CapacityService` | ⏳ | Implicit booking on convert |
| `GET/PUT /rayons/:id/capacity` | ⏳ | |
| Web week-grid editor | ⏳ | |
| Mobile read-only view in `ReviewQueueScreen` | ⏳ | |

---

## Sub-Phase 3-12: Plant-seed inventory — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| `plant_seeds` + `seed_transactions` entities | ⏳ | |
| Web seeds list + ledger | ⏳ | |
| Mobile `SeedsListScreen` + `SeedDetailScreen` + `AddTransactionScreen` | ⏳ | |

---

## Sub-Phase 3-13: CSV backfill seeder — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| CSV parser + dedupe | ⏳ | Discard cols 18/19 + `#VALUE!` col 22 |
| Photo rehosting Drive → S3 (background job) | ⏳ | |
| Idempotent on `activities.reference_code` | ⏳ | |
| Populate `area_plants.last_pruned_at` derived from import | ⏳ | |

---

## Sub-Phase 3-14: Load test + regression fixes — ⏳

**Planned duration:** 3 days

| Task | Status | Notes |
|------|--------|-------|
| k6 harness at `infra/loadtest/` | ⏳ | |
| 500-worker × 12-s ping × 30-min scenario | ⏳ | |
| Pass: p95 ingest < 200 ms, broadcast < 500 ms, pool < 70 %, Redis lag < 5 s | ⏳ | |
| Regression fixes from run findings | ⏳ | |

---

## Sub-Phase 3-15: Documentation final sync — ⏳

**Planned duration:** 2 days

| Task | Status | Notes |
|------|--------|-------|
| `COMPLETION_STATUS.md` reflects Phase 3 complete | ⏳ | |
| Every phase STATUS.md updated | ⏳ | |
| Every module CLAUDE.md updated | ⏳ | Backend modules (tasks, activities, monitoring, users, database); web `(dashboard)/monitoring`, `(dashboard)/tasks`; mobile `screens/monitoring`, `components/monitoring`, `store/slices` |
| Grep confirms no "Phase 3 planned" or "WIP" strings remain | ⏳ | |

---

## Rollout (M5)

| Task | Status | Notes |
|------|--------|-------|
| Deploy with `PHASE3_FEATURES_ENABLED=false` | ⏳ | |
| Flip flag for pilot Rayon Selatan | ⏳ | 48-h observation window |
| Graduate to all rayons | ⏳ | After pilot passes |
| Watch Sentry + CloudWatch | ⏳ | |

---

**Finalization trigger:** When all sub-phases above reach ✅ Complete, rewrite the header status to `✅ COMPLETE — All Sub-Phases Done` and set `Overall Phase 3 completion: 100 %`, matching the Phase 2D convention.
