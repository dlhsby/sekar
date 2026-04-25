# Phase 3: Plants Management, Monitoring Rebuild & Public Intake — Status

**Status:** ⏳ Not Started
**Date:** 2026-04-24 (updated 2026-04-25 — M1-R redesign milestone added)
**Overall Progress:** 0 % (0 / 21 sub-phases complete — 5 new redesign sub-phases 3-R1…3-R5 prepended)
**Branch:** main (no feature branch yet)
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md), [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md), [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md), [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md), [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md)

---

## Document Structure

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview, requirements, role matrix, **milestone plan (M1-M5 with exit criteria + demo scripts)**, sub-phase detail | [View](./README.md) |
| **database.md** | SQL DDL, TypeORM entities, indexes, seeds, migrations | [View](./database.md) |
| **backend.md** | Modules, services, endpoints, guards, WS events | [View](./backend.md) |
| **mobile.md** | Screens, components, Redux slices, offline-queue actions | [View](./mobile.md) |
| **web.md** | Pages, components, React Query keys, WS patch semantics | [View](./web.md) |
| **infrastructure.md** | Redis, Socket.IO adapter, cron, k6 harness, env vars | [View](./infrastructure.md) |
| **testing.md** | Coverage targets, unit/integration/E2E/load tests, **manual QA walkthrough** with seeded test accounts | [View](./testing.md) |
| **ui-ux.md** | NB patterns, supercluster styling, overdue colors | [View](./ui-ux.md) |
| **status_deployment_checklist.md** | Pre-deploy verification and rollback | [View](./status_deployment_checklist.md) |
| **status_progress.md** | Implementation journal — per-sub-phase task log; finalized on phase completion (mirrors Phase 2D) | [View](./status_progress.md) |
| **status_reviews.md** | Post-implementation code-review findings + remediations (mirrors Phase 2D) | [View](./status_reviews.md) |
| **STATUS.md** | This file — live progress tracker | — |

---

## Overall Progress

| Sub-Phase | Milestone | Name | Est. days | Status | Progress |
|-----------|-----------|------|-----------|--------|----------|
| **3-R1** | M1-R | Token pipeline + CI + ESLint plumbing | 3 | ⏳ Not Started | 0 % |
| **3-R2** | M1-R | Token value migration + brand-font bundling | 3 | ⏳ Not Started | 0 % |
| **3-R3** | M1-R | NB primitives + NBModal/NBToast/NBText + visual regression | 3 | ⏳ Not Started | 0 % |
| **3-R4** | M1-R | Web PWA shell + mobile-web responsive scaffolding | 2 | ⏳ Not Started | 0 % |
| **3-R5** | M1-R | Full redesign sweep on non-rewritten screens | 3 | ⏳ Not Started | 0 % |
| 3-1 | M1-S | Spec sync + ADRs 029–037 finalization + obsolete-info cleanup | 2 | ⏳ Not Started | 0 % |
| 3-2 | M1-S | Schema + role extension | 4 | ⏳ Not Started | 0 % |
| 3-3 | M2 | Monitoring v2 backend | 7 | ⏳ Not Started | 0 % |
| 3-4 | M2 | Monitoring v2 web (depends on M1-R) | 6 | ⏳ Not Started | 0 % |
| 3-5 | M2 | Monitoring v2 mobile (depends on M1-R) | 5 | ⏳ Not Started | 0 % |
| 3-6 | M3 | Task typing + partial-complete API | 4 | ⏳ Not Started | 0 % |
| 3-7 | M3 | Pruning task UX (depends on M1-R) | 5 | ⏳ Not Started | 0 % |
| 3-8 | M3 | Due-date forecast + overdue alerts | 3 | ⏳ Not Started | 0 % |
| 3-9 | M4 | Pruning-requests backend (+ push endpoints) | 4 | ⏳ Not Started | 0 % |
| 3-10 | M4 | Pruning-requests frontends (depends on M1-R) | 5 | ⏳ Not Started | 0 % |
| 3-11 | M4 | Service capacity calendar (depends on M1-R) | 4 | ⏳ Not Started | 0 % |
| 3-12 | M4 | Plant-seed inventory (depends on M1-R) | 3 | ⏳ Not Started | 0 % |
| 3-13 | M3 | CSV backfill seeder | 3 | ⏳ Not Started | 0 % |
| 3-14 | M2 | Load test + regression fixes | 3 | ⏳ Not Started | 0 % |
| 3-15 | M5 | Documentation final sync | 2 | ⏳ Not Started | 0 % |

**Total:** 73 dev-days single-threaded. M1-R = 14 d (3-R1+3-R2+3-R3+3-R4+3-R5), M1-S = 6 d, M2 = 21 d, M3 = 15 d, M4 = 16 d, M5 = 2 d + rollout.

**Legend:** ⏳ Not Started · 🟡 In Progress · ✅ Complete · 🚫 Blocked

---

## Sub-Phase 3-R1: Token pipeline + CI + ESLint plumbing ⏳

| Task | Status | Notes |
|------|--------|-------|
| Author `scripts/build-tokens.ts` (JSON → CSS + TS emitter) | ⏳ | ~100-line hand-rolled TS per ADR-036 |
| Wire `npm run tokens:build` and `npm run tokens:verify` | ⏳ | root `package.json` |
| CI: schema validate + generator drift check | ⏳ | `.github/workflows/ci.yml` `tokens-verify` job |
| ESLint: `no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility` | ⏳ | `fe/web/eslint.config.mjs` + `fe/mobile/eslint.config.js` |
| Mobile RN custom rule: ban `shadowRadius: > 0` | ⏳ | hard-edge invariant |
| Generator snapshot test fixture | ⏳ | `scripts/build-tokens.test.ts` |
| Commit empty `generated/` artifacts seed | ⏳ | values arrive in 3-R2 |

**Acceptance criteria:** `npm run tokens:build && git diff --exit-code` clean; CI fails on deliberately-drifted test PR; ESLint blocks inline hex.
**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md).

---

## Sub-Phase 3-R2: Token value migration + brand-font bundling ⏳

| Task | Status | Notes |
|------|--------|-------|
| Strip Layer-1 from `nbTokens.ts`; re-export from generated; keep helpers | ⏳ | `fe/mobile/src/constants/nbTokens.ts` |
| Rewrite `globals.css` to `@import './generated/tokens.css'`; keep utilities | ⏳ | `fe/web/src/app/globals.css` |
| Bundle OFL fonts on mobile (Space Grotesk, Inter, JetBrains Mono) + license files | ⏳ | `fe/mobile/assets/fonts/` |
| Configure `react-native.config.js` with assets path | ⏳ | font linking |
| Load fonts on web via `next/font/google` (display: swap, latin+latin-ext) | ⏳ | `fe/web/src/app/layout.tsx` |
| Drift fixes: primary.hover #6BA87A, primary.active #5A9468, secondary #8B7355, secondary.hover #725E45, success #7FBC8C, info #69D2E7 | ⏳ | both platforms converge |
| Drift fixes: type h1=28/1.2, h2=22/1.3, h3=18/1.35 | ⏳ | mobile catches up to web canonical |
| Drift fixes: shadows opaque #1C1917, zero blur/radius | ⏳ | NB stamp restored on both |
| Web focus ring → 3px solid primary + 2px offset | ⏳ | replaces 4px rgba |
| `specs/ui-ux/CHANGELOG.md` v2.1.1 entry | ⏳ | execution log |
| Deprecation banners on `specs/mobile/design-tokens.md` + `color-palette-standardization.md` | ⏳ | redirect to canonical |

**Acceptance criteria:** `git grep -nE '#[0-9a-fA-F]{6}' fe/{mobile,web}/src | grep -v generated` returns zero/allowlist-only; Space Grotesk renders on `<NBText variant="h1">`; web body uses Inter.

---

## Sub-Phase 3-R3: NB primitives + NBModal/NBToast/NBText + visual regression ⏳

| Task | Status | Notes |
|------|--------|-------|
| Migrate web primitives (Button/Card/Badge/Input/Textarea/Select/Dialog/...) to `shadow-nb-*` + `.nb-focus-ring` | ⏳ | `fe/web/src/components/ui/*` |
| Migrate mobile primitives to generated shadow helper + `useNBPress()` | ⏳ | `fe/mobile/src/components/nb/*` |
| Build `NBModal.tsx` (`@gorhom/bottom-sheet` + RN `<Modal>`) | ⏳ | sheet for ≤50% / fullscreen for complex forms |
| Build `NBToast.tsx` (`react-native-toast-message` wrapper) | ⏳ | NB chrome + Lucide icon pair + bottom + 4s |
| Build `NBText.tsx` typography component | ⏳ | variants h1/h2/h3/body-lg/body/body-sm/caption/mono-sm |
| Visual regression web: Playwright `toHaveScreenshot` 375/768/1280 px, tolerance 0.1% | ⏳ | `fe/web/e2e/visual-regression.spec.ts` |
| Visual regression mobile: extend Jest snapshots over every NB primitive | ⏳ | `fe/mobile/__tests__/nb/*.test.tsx` |
| Add CI jobs `web-visreg` + `mobile-snapshots` | ⏳ | merge gate |
| `specs/mobile/component-library.md` updated with NBModal/NBToast/NBText | ⏳ | full props/variants/accessibility entries |
| Cross-link from `specs/mobile/neo-brutalism-modal-guidelines.md` | ⏳ | implementation pointer |
| `specs/ui-ux/design-tokens.md §Component Parity Matrix` marks Modal/Toast/Text as shipped | ⏳ | parity tracker |

**Acceptance criteria:** Visual regression baselines committed and CI-green; NBModal/NBToast/NBText each consumed by ≥1 canary screen; ESLint zero violations across components.

---

## Sub-Phase 3-R4: Web PWA shell + mobile-web responsive scaffolding ⏳

| Task | Status | Notes |
|------|--------|-------|
| PWA manifest (`fe/web/public/manifest.webmanifest`) | ⏳ | bg #F5F0EB, theme #1A4D2E, 2 shortcuts |
| Icon set (192/512/512-maskable/180 apple-touch) | ⏳ | SEKAR "S" glyph |
| Service worker (`fe/web/src/sw/sw.ts` → `public/sw.js`) | ⏳ | shell precache + runtime caching per spec |
| Build `InstallBanner` | ⏳ | `beforeinstallprompt` capture, 14d localStorage suppression |
| Build `OfflineBanner` | ⏳ | `role="status"`, last-snapshot copy |
| Build `UpdateToast` | ⏳ | `registration.waiting` → "Muat ulang" |
| Build `MobileInstallPush` | ⏳ | <768px login banner for satgas/linmas/korlap |
| Build `usePushSubscription` hook | ⏳ | admin roles → POST `/api/push/register` |
| `/install-help` page (iOS Safari fallback) | ⏳ | static walkthrough |
| Build `ResponsiveShell` | ⏳ | sidebar/icon-rail/☰-drawer breakpoint logic |
| Scaffold `(kecamatan)` layout | ⏳ | minimal top-bar shell; populated by 3-10 |
| Register manifest + theme-color + viewport + safe-area in root layout | ⏳ | `fe/web/src/app/layout.tsx` |
| `next.config.ts`: PWA build pipeline + `NEXT_PUBLIC_FEATURE_PWA` flag | ⏳ | production-only SW registration |

**Acceptance criteria:** Lighthouse PWA ≥ 90 on `/monitoring`; install prompt on Android Chrome; iOS `/install-help` renders; offline shell renders at `navigator.onLine = false`; mobile-web at 375 px renders sample dashboard via `ResponsiveShell`; satgas mobile-web login shows install-push banner.
**Related ADRs:** [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md).

---

## Sub-Phase 3-R5: Full redesign sweep on non-rewritten screens ⏳

| Task | Status | Notes |
|------|--------|-------|
| Sweep mobile auth + onboarding (LoginScreen, LoadingScreen, OB-1/2/3) | ⏳ | tokens + fonts + shadows |
| Sweep mobile worker stack (Home/ClockIn/ClockOut/LocationTracking/Tasks/ActivityForm/Overtime/Profile/EditProfile/Settings/Notifications) | ⏳ | NBText + token utilities |
| Sweep mobile supervisor stack (KorlapHome/UsersList/Reports/Schedules) | ⏳ | NBText + token utilities |
| Sweep mobile shared (error/empty/skeleton/splash) | ⏳ | NBSkeleton + NBEmptyState |
| Sweep web auth (`(auth)/login`) at 3 breakpoints | ⏳ | wrapped in `ResponsiveShell` |
| Sweep web `(dashboard)/` home + Users + Areas + Rayons-index + Overtime + Schedules + Reports + Profile + Settings + Audit Logs at 3 breakpoints | ⏳ | mobile-web bottom-sheet filters / vertical cards / full-screen edit dialogs |
| Migrate role-aware shells (mobile WorkerTabs/KorlapTabs/etc.; web 9-role Sidebar) | ⏳ | tokens-only |
| Update visual regression snapshots for every swept screen | ⏳ | CI must stay green |
| Create `scripts/hex-allowlist.txt` for documented exceptions | ⏳ | `bg.overlay` rgba and embedded SVGs |
| Update `specs/ui-ux/design-tokens.md §Migration plan` to remove "Phase 4 backlog" row | ⏳ | sweep complete |
| Update root `CLAUDE.md` Phase 3 section to reflect full-sweep completion | ⏳ | docs match reality |

**Acceptance criteria:** `git grep -nE '#[0-9a-fA-F]{6}' fe/{mobile,web}/src` returns zero hits outside `generated/` + allowlist; every web page renders correctly at 375/768/1280 px (visreg green); zero "deferred to Phase 4" rows remain in the migration table.

---

## Sub-Phase 3-1: Spec deferral + ADRs + CLAUDE.md sync ⏳

| Task | Status | Notes |
|------|--------|-------|
| Rename `phase-3-polishing/` → `phase-4-production-readiness/` | ✅ Done | git mv preserves history |
| Rename `phase-4-finishing/` → `phase-5-finishing-ios/` | ✅ Done | git mv preserves history |
| Update cross-refs inside renamed folders | ✅ Done | |
| Create `phase-3-plants-monitoring-rebuild/` folder | ⏳ | |
| Write ADR-029 (monitoring v2 Redis) | ⏳ | |
| Write ADR-030 (area-aggregate plants) | ⏳ | |
| Write ADR-031 (task typing) | ⏳ | |
| Write ADR-032 (admin_data disposition extension) | ⏳ | |
| Write ADR-033 (staff_kecamatan role) | ⏳ | |
| Write ADR-034 (pruning cycle prediction) | ⏳ | |
| Write ADR-035 (service_capacity model) | ⏳ | |
| Sync `specs/README.md`, `phases/README.md`, `DEPENDENCY_MATRIX.md`, `COMPLETION_STATUS.md`, root `CLAUDE.md` | ⏳ | |

---

## Sub-Phase 3-2: Schema + role extension ⏳

| Task | Status | Notes |
|------|--------|-------|
| Write `17460000000000-Phase3Schema.ts` migration | ⏳ | 8 new tables + 5 altered |
| Add `staff_kecamatan` to `UserRole` enum | ⏳ | `be/src/modules/users/enums/role.enum.ts` |
| Add `PRUNING_REQUEST_REVIEWERS = [admin_data]` group | ⏳ | `constants/role-groups.ts` |
| Add new `monitoring_configs` rows seed | ⏳ | debounce, sweep cron, cluster zoom, stream max len |
| Seed `plant_species` (131 rows) | ⏳ | dedupe CSV col 6 |
| Role-matrix integration test covering every endpoint | ⏳ | |
| Sweep every `@Roles(...)` decorator | ⏳ | compatibility with `staff_kecamatan` |
| Confirm CSV acronym meanings with client | ⏳ | GT/PT/PS/PK/PD |

---

## Sub-Phase 3-3: Monitoring v2 backend ⏳

| Task | Status | Notes |
|------|--------|-------|
| Install Redis 7 service in docker-compose | ⏳ | |
| `RedisService` with connection pool + health check | ⏳ | fallback to in-process pub/sub |
| Socket.IO Redis adapter wiring | ⏳ | |
| `StatusProjectorService` reading Redis Streams | ⏳ | consumer group `monitoring-projector` |
| `StaffingDebouncerService` | ⏳ | default `STAFFING_DEBOUNCE_SECONDS=30` |
| `StaleStatusSweeperService` `@Cron('*/5 * * * *')` | ⏳ | |
| Rewrite `onLocationPing` (eager-load once, queue to stream) | ⏳ | |
| Fix batch-ingest iteration (location.service.ts:92-103) | ⏳ | |
| `location_logs` composite indexes (3) | ⏳ | |
| `user_tracking_status` indexes (2) | ⏳ | |
| `GET /monitoring/snapshot` unified endpoint | ⏳ | |
| Unit tests ≥ 85 % per new service | ⏳ | |

---

## Sub-Phase 3-4: Monitoring v2 web ⏳

| Task | Status | Notes |
|------|--------|-------|
| `ClusterLayer` (supercluster) | ⏳ | |
| Incremental WS patch handling in React Query | ⏳ | |
| `WorkerListVirtual` (TanStack virtual) | ⏳ | |
| `HierarchyFilterPanel` | ⏳ | |
| `PlantOverlayLayer` + `AreaStatusOverlay` | ⏳ | |
| `AreaDetailDrawer` | ⏳ | |
| Role-aware sidebar covers 9 roles | ⏳ | |

---

## Sub-Phase 3-5: Monitoring v2 mobile ⏳

| Task | Status | Notes |
|------|--------|-------|
| `ClusterMarker` parallel component | ⏳ | keep `UserMarker` intact |
| `ClusteredUserMarkers` zoom-based switch | ⏳ | preserves `tracksViewChanges={false}`, `LabelMode` enum in key |
| `featureFlags.clusterMarkersV2` A/B flag | ⏳ | |
| ESLint rule forbidding `tracksViewChanges={true}` | ⏳ | `components/monitoring/` scope |
| `MonitoringToggleSheet` overlay controls | ⏳ | |
| `AreaStatusOverlay` area fills | ⏳ | |
| Preserve `LocationTrail` mount guard | ⏳ | reference only; do not modify |

---

## Sub-Phase 3-6: Task typing + partial-complete API ⏳

| Task | Status | Notes |
|------|--------|-------|
| Task entity additions (`task_type`, `custom_fields`, `parent_task_id`, `target_plant_count`, `completed_plant_count`) | ⏳ | |
| `TaskTypeRegistry` with per-type Zod schemas | ⏳ | |
| `POST /tasks/:id/partial-complete` | ⏳ | spawns child if incomplete |
| `POST /tasks/:id/resume` | ⏳ | parent_task_id linkage |
| `GET /tasks/:id/lineage` | ⏳ | |
| Activity entity additions (`custom_fields`, `reference_code`, `pruning_request_id`, photos) | ⏳ | |
| `activity_plant_items` entity + CRUD | ⏳ | |

---

## Sub-Phase 3-7: Pruning task UX ⏳

| Task | Status | Notes |
|------|--------|-------|
| `PruningTaskForm` mobile component | ⏳ | 131-species autocomplete |
| "Lanjutkan Besok" CTA wired to `/tasks/:id/resume` | ⏳ | |
| Web dynamic task form by `task_type` | ⏳ | |
| Offline queue scaffold (`activity.submit`, `activity.partial`) | ⏳ | full polish deferred to Phase 4 |

---

## Sub-Phase 3-8: Due-date forecast + overdue alerts ⏳

| Task | Status | Notes |
|------|--------|-------|
| `PlantDueDateService` (species × area_type lookup) | ⏳ | |
| Manual override column | ⏳ | |
| `PlantDueDateRecalculator` daily cron | ⏳ | |
| Overdue digest to top_management | ⏳ | |

---

## Sub-Phase 3-9: Pruning-requests backend ⏳

| Task | Status | Notes |
|------|--------|-------|
| `pruning_requests` entity + migration | ⏳ | |
| `PruningRequestService` submit/list/review/convert/outcome | ⏳ | |
| Guard wired to `PRUNING_REQUEST_REVIEWERS` | ⏳ | |
| Rayon scoping via `users.rayon_id` | ⏳ | |
| FCM notifications on status change | ⏳ | |

---

## Sub-Phase 3-10: Pruning-requests frontends ⏳

| Task | Status | Notes |
|------|--------|-------|
| Mobile `SubmitScreen` (kecamatan) | ⏳ | |
| Mobile `MyRequestsScreen` + `RequestDetailScreen` | ⏳ | |
| Mobile `ReviewQueueScreen` (admin_data) | ⏳ | |
| Web `/pruning-requests/` queue + `[id]/` detail | ⏳ | |
| Top-management read-only filter | ⏳ | |

---

## Sub-Phase 3-11: Service capacity calendar ⏳

| Task | Status | Notes |
|------|--------|-------|
| `CapacityService` | ⏳ | |
| `GET/PUT /rayons/:id/capacity` | ⏳ | |
| `POST /rayons/:id/capacity/book` | ⏳ | |
| Implicit booking on `/pruning-requests/:id/convert-to-task` | ⏳ | |
| Web capacity calendar page | ⏳ | |

---

## Sub-Phase 3-12: Plant-seed inventory ⏳

| Task | Status | Notes |
|------|--------|-------|
| `plant_seeds` + `seed_transactions` entities | ⏳ | |
| CRUD endpoints (`/plant-seeds`, `/seed-transactions`) | ⏳ | |
| Web seeds pages + ledger view | ⏳ | |
| Mobile seeds screens | ⏳ | |

---

## Sub-Phase 3-13: CSV backfill seeder ⏳

| Task | Status | Notes |
|------|--------|-------|
| Parser for 5,008-row CSV | ⏳ | |
| Idempotent on `activities.reference_code` | ⏳ | |
| Photo rehost job (Drive → S3) | ⏳ | |
| Dry-run mode | ⏳ | |

---

## Sub-Phase 3-14: Load test + regression fixes ⏳

| Task | Status | Notes |
|------|--------|-------|
| k6 harness at `infra/loadtest/monitoring-500w.js` | ⏳ | |
| 500-worker / 12-s ping / 30-min run | ⏳ | |
| Pass criteria report (p95 ingest, broadcast, pool, Redis lag, missed transitions) | ⏳ | |
| Regression fixes backlog | ⏳ | |

---

## Sub-Phase 3-15: Documentation final sync ⏳

| Task | Status | Notes |
|------|--------|-------|
| Sync `specs/COMPLETION_STATUS.md` | ⏳ | |
| Sync `specs/api/contracts.md` with +~35 endpoints | ⏳ | |
| Sync `specs/database/schema.md` + `erd.md` | ⏳ | |
| Sync `specs/architecture/security.md` (admin_data rationale, Redis trust boundary) | ⏳ | |
| Sync `specs/mobile/screens.md`, `web/pages.md` | ⏳ | |
| Sync `specs/testing/strategy.md` (load test policy) | ⏳ | |
| Sync `specs/deployment/infrastructure.md` (+Redis) | ⏳ | |
| Sync root + module-level CLAUDE.md files | ⏳ | |

---

**Last Updated:** 2026-04-24
