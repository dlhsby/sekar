# Phase 3: Plants Management, Monitoring Rebuild & Public Intake — Status

**Status:** 🟡 In Progress
**Date:** 2026-04-27 (M2 deploy executed — backend on prod with Phase 3 schema + reference data; Apr 27 polish pass landed: collapsible selfie cards, mobile coverage threshold lock, seeders unified for cold-start + UAT; next: 3-6 task typing)
**Overall Progress:** ~48 % (10 / 21 sub-phases complete — M1-R 5/5 + 3-1 + 3-2 + 3-3 + 3-4 + 3-5)
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

## ✅ M1-R → M2 Checkpoint Review (Apr 26, 2026)

This checkpoint covers all work from sub-phase 3-R1 through 3-5 (M1-R foundation + M2 monitoring rebuild). All items are code-complete, all tests green. This is the recommended point for a developer review before starting M3 (task typing, plants).

### What to review

| Area | Entry point | Key things to check |
|------|-------------|---------------------|
| **Token pipeline** | `scripts/build-tokens.ts`, `specs/ui-ux/tokens.json` | Generator produces identical output; `tokens:verify` CI job gates PRs |
| **NB 2.0 shadows + colors** | `fe/mobile/src/constants/nbTokens.ts`, `fe/mobile/src/constants/generated/tokens.ts` | Opaque hard-edge shadows (`shadowOpacity:1, shadowRadius:0, elevation:0`); `nbColors.gray` backward-compat shim |
| **NBModal / NBToast / NBText** | `fe/mobile/src/components/nb/` | Sheet vs. fullscreen modal variants; title uppercased; toast NB chrome; NBText 10 variants |
| **Web PWA shell** | `fe/web/src/app/layout.tsx`, `fe/web/next.config.ts`, `fe/web/src/app/(kecamatan)/layout.tsx` | Manifest, service worker, `ResponsiveShell` at 375/768/1280 px; `staff_kecamatan` minimal layout |
| **Redis + Socket.IO adapter** | `be/src/common/services/redis.service.ts`, `be/src/gateways/events.gateway.ts` | Graceful fallback (no Redis = in-process); `@Optional()` injection |
| **Status pipeline** | `be/src/modules/monitoring/services/` (projector, debouncer, sweeper) | Redis Stream consumer group; debounce prevents broadcast thrash; cron sweep marks stale |
| **Snapshot endpoint** | `be/src/modules/monitoring/monitoring.controller.ts:197` | Scope enforcement (rayon/city gate); response shape for web + mobile consumers |
| **Web monitoring page** | `fe/web/src/app/(dashboard)/monitoring/page.tsx` | `status:v2` WS patch wiring; `ClusterLayer`; `WorkerListVirtual`; `HierarchyFilterPanel`; `AreaDetailDrawer` |
| **Mobile cluster markers** | `fe/mobile/src/components/monitoring/ClusteredUserMarkers.tsx`, `ClusterMarker.tsx` | `featureFlags.clusterMarkersV2=false` (off by default); ESLint ban on `tracksViewChanges={true}` |
| **Mobile monitoringV2Slice** | `fe/mobile/src/store/slices/monitoringV2Slice.ts` | `visibleLayers`, `clusterZoomThreshold`, `snapshot` shape |
| **Mobile toggle sheet + area overlay** | `fe/mobile/src/components/monitoring/MonitoringToggleSheet.tsx`, `AreaStatusOverlay.tsx` | Layer toggle dispatches; `useFocusEffect` boundary fetch |
| **Test suite health** | Run `cd fe/mobile && npm test` | 159 suites, 3,836 total, 3,829 passing, 7 skipped — should be zero failures |

### Known deferred items (not blocking M2 review)

- `PlantOverlayLayer` — stub only; full implementation in plant sub-phases (3-8 onwards)
- Visual regression snapshots (Jest/Playwright) — deferred to Phase 4
- k6 load test (`3-14`) — deferred until full M3 plant + task endpoints are in
- `GET /monitoring/snapshot` scope caching — no Redis-level caching yet; each request hits DB

---

## Overall Progress

| Sub-Phase | Milestone | Name | Est. days | Status | Progress |
|-----------|-----------|------|-----------|--------|----------|
| **3-R1** | M1-R | Token pipeline + CI + ESLint plumbing | 3 | ✅ Complete | 100 % |
| **3-R2** | M1-R | Token value migration + brand-font bundling | 3 | ✅ Complete | 100 % |
| **3-R3** | M1-R | NB primitives + NBModal/NBToast/NBText + visual regression | 3 | ✅ Complete | 100 % |
| **3-R4** | M1-R | Web PWA shell + mobile-web responsive scaffolding | 2 | ✅ Complete | 100 % |
| **3-R5** | M1-R | Full redesign sweep on non-rewritten screens | 3 | ✅ Complete | 100 % |
| 3-1 | M1-S | Spec sync + ADRs 029–037 finalization + obsolete-info cleanup | 2 | ✅ Complete | 100 % |
| 3-2 | M1-S | Schema + role extension | 4 | ✅ Complete | 100 % |
| 3-3 | M2 | Monitoring v2 backend | 7 | ✅ Complete | 100 % |
| 3-4 | M2 | Monitoring v2 web (depends on M1-R) | 6 | ✅ Complete | 100 % |
| 3-5 | M2 | Monitoring v2 mobile (depends on M1-R) | 5 | ✅ Complete | 100 % |
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

## Sub-Phase 3-R1: Token pipeline + CI + ESLint plumbing ✅

| Task | Status | Notes |
|------|--------|-------|
| Author `scripts/build-tokens.ts` (JSON → CSS + TS emitter) | ✅ | Hand-rolled per ADR-036 (no Style Dictionary). Reads `tokens.json`, validates against schema with `ajv`, deterministic output (sorted keys, LF, trailing newline). |
| Wire `npm run tokens:build` and `npm run tokens:verify` | ✅ | New root `package.json` with `npm workspaces` (be, fe/web, fe/mobile, tools/eslint-plugin-sekar-design). |
| CI: schema validate + generator drift check | ✅ | `.github/workflows/tokens-verify.yml` runs `tokens:verify` + `test:tokens` on PR; verified locally that tampering exits 1. |
| ESLint: `no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility` | ✅ | Local plugin at `tools/eslint-plugin-sekar-design/`. Web config wired with all 3 rules at `error` level. |
| Mobile RN custom rule: ban `shadowRadius: > 0` | ✅ | `rn-no-shadow-radius` rule live in `fe/mobile/eslint.config.js` at `error`. |
| Generator snapshot test fixture | ✅ | `scripts/build-tokens.test.ts` (12 generator assertions) + 4 ESLint `RuleTester` test files (28 rule assertions). 40 unit tests pass. |
| Commit `generated/` artifacts seed | ✅ | `fe/web/src/app/generated/tokens.css` and `fe/mobile/src/constants/generated/tokens.ts` are real output (consumer cutover deferred to 3-R2). |
| Schema fix (deferred discovery) | ✅ | `tokens.schema.json` `typeMap` now allows `_note` documentation strings (caught by ajv during first run). |
| Transitional file allowlist for inline-hex rule | ✅ | 12 web files + 17 mobile files exempted via per-file ESLint overrides; explicitly tagged "remove in 3-R5". Existing `npm run lint` in both workspaces stays green. |

**Acceptance criteria:** ✅ all met
- `npm run tokens:build && git diff --exit-code` clean — verified
- CI fails on a deliberately-drifted PR — verified locally (`tokens-verify drift: ... exit=1`)
- ESLint blocks inline hex — verified (smoke test fixture flagged with `sekar-design/no-inline-hex-colors` error)

**Files added/modified:**
- `package.json` (new — root, workspaces declared)
- `scripts/build-tokens.ts`, `scripts/build-tokens.test.ts`, `scripts/tsconfig.json`, `scripts/jest.config.cjs`
- `tools/eslint-plugin-sekar-design/{package.json, index.js, rules/*.js, rules/*.test.ts}` (4 rules + 4 test files)
- `fe/web/eslint.config.mjs`, `fe/mobile/eslint.config.js` (plugin wired)
- `fe/web/src/app/generated/tokens.css` (new)
- `fe/mobile/src/constants/generated/tokens.ts` (new)
- `.github/workflows/tokens-verify.yml` (new)
- `specs/ui-ux/tokens.schema.json` (typeMap accepts `_note` strings)

**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md).
**Completed:** 2026-04-25.

---

## Sub-Phase 3-R2: Token value migration + brand-font bundling ✅

| Task | Status | Notes |
|------|--------|-------|
| Strip Layer-1 from `nbTokens.ts`; re-export from generated; keep helpers | ✅ | `fe/mobile/src/constants/nbTokens.ts` — selective re-exports + augmented `nbColors` with nested `gray` backward-compat shim |
| Rewrite `globals.css` to `@import './generated/tokens.css'`; keep utilities | ✅ | `fe/web/src/app/globals.css` — `@theme inline {}` with `var()` refs; aliases `--color-nb-background` + `--color-nb-sidebar` added |
| Bundle OFL fonts on mobile (Space Grotesk, Inter, JetBrains Mono) + license files | ✅ | `fe/mobile/assets/fonts/` — Inter variable TTF (opsz,wght), SpaceGrotesk variable TTF (wght), JetBrainsMono-Regular/Medium/SemiBold static TTFs |
| Configure `react-native.config.js` with assets path | ✅ | `fe/mobile/react-native.config.js` — `assets: ['./assets/fonts']` for `npx react-native-asset` |
| Load fonts on web via `next/font/google` (display: swap, latin+latin-ext) | ✅ | `fe/web/src/app/layout.tsx` — Inter (`--font-body`), Space_Grotesk (`--font-display`), JetBrains_Mono (`--font-mono`) |
| Drift fixes: primary.hover #6BA87A, primary.active #5A9468, secondary #8B7355, secondary.hover #725E45, success #7FBC8C, info #69D2E7 | ✅ | baked into `tokens.json` → regenerated in `generated/tokens.css` + `generated/tokens.ts` |
| Drift fixes: type h1=28/1.2, h2=22/1.3, h3=18/1.35 | ✅ | type scale in `tokens.json` → both platforms converge via generated output |
| Drift fixes: shadows opaque #1C1917, zero blur/radius | ✅ | NB stamp: `shadowOpacity: 1`, `shadowRadius: 0`, `elevation: 0`; 13 nbTokens unit tests lock the invariant |
| Web focus ring → 3px solid primary + 2px offset | ✅ | `globals.css` — `outline: 3px solid var(--color-nb-primary); outline-offset: 2px` |
| `specs/ui-ux/CHANGELOG.md` v2.1.1 entry | ✅ | v2.1.1 shipped 2026-04-25 — drift fixes, font bundling, CSS var approach documented |
| Deprecation banners on `specs/mobile/design-tokens.md` + `color-palette-standardization.md` | ✅ | Both files redirect to `tokens.json` + `design-tokens.md` as canonical source |

**Acceptance criteria:** `git grep -nE '#[0-9a-fA-F]{6}' fe/{mobile,web}/src | grep -v generated` returns zero/allowlist-only; Space Grotesk renders on `<NBText variant="h1">`; web body uses Inter.

---

## Sub-Phase 3-R3: NB primitives + NBModal/NBToast/NBText + visual regression ✅

| Task | Status | Notes |
|------|--------|-------|
| Migrate web primitives (Button/Card/Badge/Input/Textarea/Select/Dialog/...) to `shadow-nb-*` + `.nb-focus-ring` | ✅ | `fe/web/src/components/ui/*` — already on `shadow-nb-*` from Phase 2; `LocationTimeline.tsx` stray `shadow-sm` → `shadow-nb-xs` fixed |
| Migrate mobile primitives to generated shadow helper | ✅ | Phase 2 NB components import `nbShadows` from `nbTokens` which re-exports generated; Phase 3 opaque values flow automatically. Backward-compat `nbBorders.base/thin/thick/extra` aliases added to fix broken border widths. |
| Build `NBModal.tsx` (`@gorhom/bottom-sheet` + RN `<Modal>`) | ✅ | `fe/mobile/src/components/nb/NBModal.tsx` — sheet (BottomSheet, NB title bar, grabber, close btn) + fullscreen (RN Modal, back btn, uppercase title, sticky footer) |
| Build `NBToast.tsx` (`react-native-toast-message` wrapper) | ✅ | `fe/mobile/src/components/nb/NBToast.tsx` — `NBToast.show()` static API, 4 levels, NB chrome (2px border, hard shadow, uppercase title, `MaterialCommunityIcons`), `NBToastProvider` |
| Build `NBText.tsx` typography component | ✅ | `fe/mobile/src/components/nb/NBText.tsx` — 10 variants (`display-xl` … `mono-sm`), `rnFontFamily()` extracts font name from CSS stack, `NBHeading1/2/3` conveniences |
| Visual regression web: Playwright `toHaveScreenshot` 375/768/1280 px | ⏳ DEFERRED | Deferred to Phase 4 per user-confirmed unit-only test scope for Phase 3 |
| Visual regression mobile: Jest snapshots over every NB primitive | ⏳ DEFERRED | Deferred to Phase 4 per unit-only scope |
| Add CI jobs `web-visreg` + `mobile-snapshots` | ⏳ DEFERRED | Deferred to Phase 4 |
| `specs/mobile/component-library.md` updated with NBModal/NBToast/NBText | ✅ | `specs/ui-ux/design-tokens.md §Component Parity Matrix` updated; component-library.md already had spec stubs |
| Cross-link from `specs/mobile/neo-brutalism-modal-guidelines.md` | ✅ | Spec already cross-linked; modal guidelines followed in implementation |
| `specs/ui-ux/design-tokens.md §Component Parity Matrix` marks Modal/Toast/Text as shipped | ✅ | Parity matrix rows updated with ✅ |

**Acceptance criteria (adjusted for unit-only scope):** NBModal/NBToast/NBText each consumed by ≥1 canary screen ✅ (LoginScreen + ProfileScreen); backward-compat `nbBorders` aliases land; 478 unit tests passing; ESLint zero violations; `tokens-verify: OK`.

---

## Sub-Phase 3-R4: Web PWA shell + mobile-web responsive scaffolding ✅

| Task | Status | Notes |
|------|--------|-------|
| PWA manifest (`fe/web/public/manifest.webmanifest`) | ✅ | bg #F5F0EB, theme #1A4D2E, 2 shortcuts (Monitoring + Tugas), display: standalone |
| Icon set (192/512/512-maskable SVG + `icon.tsx` / `apple-icon.tsx` ImageResponse) | ✅ | SEKAR "S" glyph on #1A4D2E background; maskable safe-zone inset; `apple-icon.tsx` 180×180 |
| Service worker (`fe/web/src/sw/sw.ts` → `public/sw.js`) | ✅ | Shell precache, SWR 30s for `/monitoring/snapshot`, network-first 2s for pruning-requests, network-only for auth/mutations, 5 MB asset limit |
| Build `InstallBanner` | ✅ | `beforeinstallprompt` capture, 14-day localStorage suppression (`sekar_install_dismissed`), standalone mode check, NB accentYellow callout |
| Build `OfflineBanner` | ✅ | `navigator.onLine` listener, `role="status"`, shows last-sync time from `sekar_last_sync` |
| Build `UpdateToast` | ✅ | Monitors `registration.waiting`, Sonner toast with "Muat ulang" → `SKIP_WAITING` message |
| Build `MobileInstallPush` | ✅ | <768px, role-gated (satgas/linmas/korlap), session-dismissed, Play Store + App Store links |
| Build `usePushSubscription` hook | ✅ | Admin roles only; VAPID subscribe → `POST /api/push/register`; cleanup on unmount |
| `/install-help` page (iOS Safari fallback) | ✅ | Static 3-step walkthrough; linked from `InstallBanner` on iOS UA |
| `/offline` fallback page | ✅ | Precached by SW; shown on navigation miss |
| Build `ResponsiveShell` | ✅ | Desktop (256px sidebar), tablet (64px icon rail), mobile (<768px ☰ drawer); `data-mobile="true"` on root |
| Scaffold `(kecamatan)` layout | ✅ | Minimal top-bar shell at `fe/web/src/app/(kecamatan)/layout.tsx`; populated by 3-10 |
| Register manifest + theme-color + viewport-fit + safe-area in root layout | ✅ | `fe/web/src/app/layout.tsx` — themeColor `#1A4D2E`, apple-touch-icon, `OfflineBanner` + `UpdateToast` |
| `next.config.ts`: SW headers + `NEXT_PUBLIC_FEATURE_PWA` flag | ✅ | `Service-Worker-Allowed: /` + `Cache-Control: no-store` headers for `/sw.js`; SW registration feature-flagged in `providers.tsx` |
| `sw:build` script | ✅ | `fe/web/package.json` — `npx esbuild src/sw/sw.ts --bundle --outfile=public/sw.js --platform=browser --target=chrome90` |

**Acceptance criteria:** Lighthouse PWA ≥ 90 on `/monitoring`; install prompt on Android Chrome; iOS `/install-help` renders; offline shell renders at `navigator.onLine = false`; mobile-web at 375 px renders sample dashboard via `ResponsiveShell`; satgas mobile-web login shows install-push banner.
**Related ADRs:** [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md).

**Files added:**
- `fe/web/public/manifest.webmanifest`
- `fe/web/public/icons/icon.svg`, `icon-maskable.svg`
- `fe/web/src/sw/sw.ts`, `fe/web/public/sw.js`
- `fe/web/src/components/pwa/InstallBanner.tsx`, `OfflineBanner.tsx`, `UpdateToast.tsx`, `MobileInstallPush.tsx`
- `fe/web/src/hooks/usePushSubscription.ts`
- `fe/web/src/components/layout/ResponsiveShell.tsx`
- `fe/web/src/app/(kecamatan)/layout.tsx`
- `fe/web/src/app/install-help/page.tsx`, `offline/page.tsx`
- `fe/web/src/app/icon.tsx`, `apple-icon.tsx`

**Files modified:**
- `fe/web/src/app/layout.tsx` — manifest, theme-color, apple-touch-icon, `OfflineBanner` + `UpdateToast` in body
- `fe/web/src/app/providers.tsx` — SW registration in `useEffect` (feature-flagged)
- `fe/web/next.config.ts` — SW response headers
- `fe/web/package.json` — `sw:build` script

**Completed:** 2026-04-25.

---

## Sub-Phase 3-R5: Full redesign sweep on non-rewritten screens ✅

| Task | Status | Notes |
|------|--------|-------|
| Sweep mobile auth + onboarding (LoginScreen, LoadingScreen, OB-1/2/3) | ✅ | tokens + fonts + shadows; LoginScreen already done in 3-R3 |
| Sweep mobile worker stack (Home/ClockIn/ClockOut/LocationTracking/Tasks/ActivityForm/Overtime/Profile/EditProfile/Settings/Notifications) | ✅ | NBText + token utilities; OvertimeSubmitScreen, TaskCreateScreen, ActivitySubmissionScreen swept in 3-R5 |
| Sweep mobile supervisor stack (KorlapHome/UsersList/Reports/Schedules) | ✅ | NBText + token utilities |
| Sweep mobile shared (error/empty/skeleton/splash) | ✅ | ErrorBanner, ImagePreviewModal, LocationStatusCard, BoundaryDetailModal, LocationMapModal swept |
| Sweep web auth + non-monitoring pages | ✅ | Web required no separate hex-sweep (CSS variables were already in use from Phase 2). The M1-R web deliverables landed across 3-R1–3-R4: ESLint rules enforced (3-R1), `generated/tokens.css` populated + `globals.css @theme inline` wired (3-R2), fonts loaded via `next/font/google` (3-R4), full PWA shell (3-R4). 3-R5 was a verification pass that confirmed zero ESLint violations + fixed one CSS var name in `InstallBanner.tsx`. |
| Sweep web monitoring components onto NB tokens | ⏳ DEFERRED | Monitoring components retain status palette (#9333EA purple etc.) — addressed in 3-3/3-4 monitoring v2 rebuild; 8 files documented in `scripts/hex-allowlist.txt` |
| Migrate role-aware shells (mobile WorkerTabs/KorlapTabs/etc.; web 9-role Sidebar) | ✅ | tokens-only pass done |
| Update visual regression snapshots for every swept screen | ⏳ DEFERRED | Visual regression deferred to Phase 4 per unit-only scope |
| Create `scripts/hex-allowlist.txt` for documented exceptions | ✅ | `scripts/hex-allowlist.txt` — 18 entries covering Mapbox layer specs, status palette, ImageResponse SVG, Next.js metadata |
| Update `fe/mobile/eslint.config.js` transitional allowlist → permanent | ✅ | Reduced from ~30 entries to 7 permanent exceptions with rationale comments |
| Update `fe/web/eslint.config.mjs` transitional allowlist → permanent | ✅ | Updated with inline comments per category |
| Update root `CLAUDE.md` Phase 3 section to reflect full-sweep completion | ✅ | M1-R marked complete in header |

**Acceptance criteria (adjusted):**
- ✅ `grep -rE "'#[0-9a-fA-F]{3,8}'" fe/mobile/src` returns zero hits outside `generated/` + permanent allowlist (7 entries, all documented)
- ✅ `grep -rE "#[0-9a-fA-F]{3,8}" fe/web/src` — all hits are in the permanent allowlist (monitoring palette, Mapbox specs, ImageResponse, metadata)
- ✅ `scripts/hex-allowlist.txt` created with full rationale for every entry
- ✅ ESLint zero violations on all swept files (both platforms)
- ⏳ Visual regression deferred to Phase 4 per unit-only scope
- ⏳ Monitoring status palette tokens (to eliminate monitoring allowlist entries) deferred to 3-3/3-4

**Post-review bugfixes (2026-04-25):**
- `NBToast.tsx` — added `persistent?: boolean` option; `persistent: true` sets `visibilityTime: Number.MAX_SAFE_INTEGER` (toast stays until user taps ✕)
- `LoginScreen.tsx` — removed duplicate `dispatch(setError(...))` + inline Redux error box; all API-level errors now show as a single persistent toast; field-level validation errors (identifierError/passwordError) unchanged
- `NBModal.tsx` — added `paddingTop: nbSpacing.md` + `paddingBottom: nbSpacing.xl` to `sheetContent` style (fixes cramped "Tentang Aplikasi" layout)
- `ProfileScreen.tsx` — `snapPoints` for about sheet: `['35%']` → `['45%']`

**Completed:** 2026-04-25 (post-review bugfixes 2026-04-25).

---

## Sub-Phase 3-1: Spec deferral + ADRs + CLAUDE.md sync ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| Rename `phase-3-polishing/` → `phase-4-production-readiness/` | ✅ Done | git mv preserves history |
| Rename `phase-4-finishing/` → `phase-5-finishing-ios/` | ✅ Done | git mv preserves history |
| Update cross-refs inside renamed folders | ✅ Done | |
| Create `phase-3-plants-monitoring-rebuild/` folder | ✅ Done | folder + 11 docs already on disk (Apr 24-25) |
| Write ADR-029 (monitoring v2 Redis) | ✅ Done | Accepted; on disk |
| Write ADR-030 (area-aggregate plants) | ✅ Done | Accepted |
| Write ADR-031 (task typing) | ✅ Done | Accepted |
| Write ADR-032 (admin_data disposition extension) | ✅ Done | Accepted |
| Write ADR-033 (staff_kecamatan role) | ✅ Done | Accepted |
| Write ADR-034 (pruning cycle prediction) | ✅ Done | Accepted |
| Write ADR-035 (service_capacity model) | ✅ Done | Accepted |
| Write ADR-036 (design tokens single source) | ✅ Done | Accepted; consumed by 3-R1 |
| Write ADR-037 (web PWA) | ✅ Done | Accepted; consumed by 3-R4 |
| Sync `specs/README.md`, `phases/README.md`, `DEPENDENCY_MATRIX.md`, `COMPLETION_STATUS.md`, root `CLAUDE.md` | ✅ Done | COMPLETION_STATUS.md + CLAUDE.md updated Apr 26 to reflect M1-R complete (5/5) + 3-1 done (6/21). Final deep-sync of all secondary spec files deferred to 3-15 per plan. |

---

## Sub-Phase 3-2: Schema + role extension ✅

| Task | Status | Notes |
|------|--------|-------|
| Write `17460000000000-Phase3Schema.ts` migration | ✅ | 8 new tables (plant_species, area_plants, notable_plants, pruning_requests, activity_plant_items, service_capacity, plant_seeds, seed_transactions) + 5 altered (activities +6 cols, tasks +5 cols, users.role enum +`staff_kecamatan`, user_tracking_status +2 indexes). Plus `17460001000000-Phase3BackfillIndexes.ts` for 3 `CREATE INDEX CONCURRENTLY` on `location_logs`. Both applied to prod Apr 27. |
| Add `staff_kecamatan` to `UserRole` enum | ✅ | `be/src/modules/users/enums/role.enum.ts` — DB enum extended via migration; verified live in prod `enum_range(NULL::user_role)`. |
| Add `PRUNING_REQUEST_REVIEWERS = [admin_data]` group | ✅ | `be/src/modules/users/constants/role-groups.ts` (per ADR-032). |
| Add new `monitoring_configs` rows seed | ✅ | 4 Phase 3 keys: `plants_forecast`, `service_capacity_defaults`, `pruning_request_workflow`, `seed_inventory`. Idempotent (`ON CONFLICT (key) DO NOTHING`). |
| Seed `plant_species` (128 rows) | ✅ | `be/src/database/seeds/seed-phase3.ts` — 128 species (final dedupe). Idempotent on `name_id`. Note: original spec called for 131; CSV dedupe yielded 128. |
| Sweep every `@Roles(...)` decorator | ✅ | All controllers reviewed Apr 26 during 3-3/3-4 work; `staff_kecamatan` only granted access to its own pruning-submit + my-requests routes (post 3-9/3-10). |
| Add `@Unique` decorators on Phase 3 entities | ✅ | Added Apr 27: `AreaPlant['areaId','speciesId']`, `PlantSeed['nameId']`, `ServiceCapacity['rayonId','year','isoWeek','serviceType']` — fixes auto-sync drift in dev. Migration patched (`874b13e`) to include `uq_plant_seeds_name_id`. |
| Confirm CSV acronym meanings with client | ✅ | Resolved Apr 25 (commit `5a64fd6` — "client answers to all 5 open questions"). GT/PT/PS/PK/PD documented in spec. |
| Role-matrix integration test covering every endpoint | ⏳ deferred | Belongs to 3-9/3-10 when pruning endpoints land — no `staff_kecamatan`-accessible routes exist yet to test. |

---

## Sub-Phase 3-3: Monitoring v2 backend ✅

| Task | Status | Notes |
|------|--------|-------|
| Install Redis 7 service in docker-compose | ✅ | `infra/docker-compose.yml` — redis:7-alpine, AOF, 256 MB allkeys-lru, health-check |
| `RedisService` with connection pool + health check | ✅ | `be/src/common/services/redis.service.ts` — graceful fallback to in-process pub/sub; 13 tests |
| Socket.IO Redis adapter wiring | ✅ | `be/src/gateways/events.gateway.ts` — `createAdapter(@socket.io/redis-adapter)`; `@Optional()` so dev works without Redis |
| `StatusProjectorService` reading Redis Streams | ✅ | `be/src/modules/monitoring/services/status-projector.service.ts` — consumer group `monitoring-projector`; 6 tests |
| `StaffingDebouncerService` | ✅ | `be/src/modules/monitoring/services/staffing-debouncer.service.ts` — `STAFFING_DEBOUNCE_SECONDS=30`; 9 tests |
| `StaleStatusSweeperService` `@Cron('*/5 * * * *')` | ✅ | `be/src/modules/monitoring/services/stale-status-sweeper.service.ts` — 6 tests |
| Rewrite `onLocationPing` (eager-load once, queue to stream) | ✅ | `be/src/modules/locations/location.service.ts` — scope-enforcement fix; single eager load |
| Fix batch-ingest iteration (location.service.ts:92-103) | ✅ | Off-by-one corrected; iteration now consistent with stream queueing |
| `location_logs` composite indexes (3) | ✅ | In `17460001000000-Phase3BackfillIndexes.ts` via `CREATE INDEX CONCURRENTLY` |
| `user_tracking_status` indexes (2) | ✅ | In `17460000000000-Phase3Schema.ts` — `idx_user_tracking_area_updated`, `idx_user_tracking_within_area` |
| `GET /monitoring/snapshot` unified endpoint | ✅ | `be/src/modules/monitoring/monitoring.controller.ts:197` — scope-gated; city scope requires city-level role |
| Unit tests ≥ 85 % per new service | ✅ | All new services have dedicated spec files; backend overall 94.51 % stmts |

---

## Sub-Phase 3-4: Monitoring v2 web ✅

| Task | Status | Notes |
|------|--------|-------|
| `ClusterLayer` (supercluster) | ✅ | `fe/web/src/components/monitoring/ClusterLayer.tsx` — supercluster integration, zoom-threshold switch |
| Incremental WS patch handling in React Query | ✅ | `fe/web/src/app/(dashboard)/monitoring/page.tsx` — `status:v2` socket event patches `queryClient` cache directly; 1 dedicated test |
| `WorkerListVirtual` (TanStack virtual) | ✅ | `fe/web/src/components/monitoring/WorkerListVirtual.tsx` — `@tanstack/react-virtual` row virtualizer |
| `HierarchyFilterPanel` | ✅ | `fe/web/src/components/monitoring/HierarchyFilterPanel.tsx` — rayon/area/shift multi-select |
| `PlantOverlayLayer` (web) | ⏳ deferred | Out of M2 scope. Per the deployment guide and ADR-030, full plant overlay (per-area inventory + notable trees) is delivered in **3-7/3-8** (plants management sub-phases). Web has no stub yet — mobile has the stub from 3-5. |
| `AreaStatusOverlay` (web) | ⏳ deferred | Mobile-only by design; not in the web component list. Web shows area health via `AreaDetailDrawer` instead. |
| `AreaDetailDrawer` | ✅ | `fe/web/src/components/monitoring/AreaDetailDrawer.tsx` — slide-in drawer with area stats |
| Role-aware sidebar covers 9 roles | ✅ | `fe/web/src/lib/navigation.ts` — `staff_kecamatan` minimal nav added (ADR-033); `(kecamatan)` layout shell |

**Tests:** 10 new tests in `MonitoringPage.test.tsx` covering snapshot load, virtualized list rendering, `status:v2` cache patch, `staff_kecamatan` redirect.

---

## Sub-Phase 3-5: Monitoring v2 mobile ✅

| Task | Status | Notes |
|------|--------|-------|
| `ClusterMarker` parallel component | ✅ | `fe/mobile/src/components/monitoring/ClusterMarker.tsx` — `tracksViewChanges={false}`, `zoomBucket` key for bitmap reuse; 11 tests |
| `ClusteredUserMarkers` zoom-based switch | ✅ | `fe/mobile/src/components/monitoring/ClusteredUserMarkers.tsx` — O(n²) distance-group; switches at `clusterZoomThreshold`; `LabelMode` enum key from Apr 24 bugfix preserved; 9 tests |
| `featureFlags.clusterMarkersV2` A/B flag | ✅ | `fe/mobile/src/utils/featureFlags.ts:13` — `clusterMarkersV2: false` (off by default); `MapDashboardScreen` reads flag at line 481 |
| ESLint rule forbidding `tracksViewChanges={true}` | ✅ | `fe/mobile/eslint.config.js:90-102` — custom inline rule; errors in `components/monitoring/` scope |
| `MonitoringToggleSheet` overlay controls | ✅ | `fe/mobile/src/components/monitoring/MonitoringToggleSheet.tsx` — dispatches `monitoringV2Slice.toggleLayer`; 10 tests |
| `AreaStatusOverlay` area fills | ✅ | `fe/mobile/src/components/monitoring/AreaStatusOverlay.tsx` — `useFocusEffect` boundary fetch; mocked in MapDashboard test |
| `PlantOverlayLayer` | ✅ stub | `fe/mobile/src/components/monitoring/PlantOverlayLayer.tsx` — stub; full impl deferred to plant sub-phases |
| `monitoringV2Slice` Redux slice | ✅ | `fe/mobile/src/store/slices/monitoringV2Slice.ts` — `visibleLayers`, `clusterZoomThreshold`, `snapshot`; 31 tests |
| Preserve `LocationTrail` mount guard | ✅ | `requestAnimationFrame` guard from Apr 24 bugfix untouched; `LocationTrail.test.tsx` all green |
| Mobile test suite green after M1-R + M2 | ✅ | All 159 suites / 3,836 tests pass (3,829 passing, 7 skipped) — Apr 26 test-fix session resolved 7 failing suites |

**New 3-5 tests:** `monitoringV2Slice.test.ts` (31) + `ClusterMarker.test.tsx` (11) + `ClusteredUserMarkers.test.tsx` (9) + `MonitoringToggleSheet.test.tsx` (10) + `MapDashboardScreen.test.tsx` (9, updated) = **70 tests**.

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
