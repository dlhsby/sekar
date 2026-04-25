# Phase 3 — Implementation Progress

**Last Updated:** 2026-04-25
**Status:** 🟡 In Progress — M1-R Redesign Foundation complete (3-R1…3-R5); 3-1 + 3-2 next

This document mirrors the Phase 2D `status_progress.md` pattern: a sub-phase-by-sub-phase journal that's updated in-flight and finalized on phase completion. `STATUS.md` is the live task-level tracker; this file is the narrative log.

---

## Overall Progress

| Milestone | Sub-Phase | Progress | Status | Lead agent / skill | Notes |
|-----------|-----------|----------|--------|--------------------|-------|
| **M1-R** | 3-R1 Token pipeline + CI + ESLint | 100 % | ✅ Complete | web-developer + mobile-developer | Generator + CI gate + lint rules — landed 2026-04-25 |
| **M1-R** | 3-R2 Token value migration + brand fonts | 100 % | ✅ Complete | web-developer + mobile-developer | Drift fixes + font bundling — landed 2026-04-25 |
| **M1-R** | 3-R3 NB primitives + NBModal/NBToast/NBText + visreg | 100 % | ✅ Complete | mobile-developer | NBText/NBModal/NBToast + canary screens + nbBorders compat fix — landed 2026-04-25 |
| **M1-R** | 3-R4 Web PWA shell + responsive scaffolding | 100 % | ✅ Complete | web-developer | Manifest/SW/icons + ResponsiveShell + (kecamatan) layout — landed 2026-04-25 |
| **M1-R** | 3-R5 Full redesign sweep on non-rewritten screens | 100 % | ✅ Complete | mobile-developer | All non-monitoring screens swept; monitoring palette + Mapbox specs documented in hex-allowlist.txt — landed 2026-04-25 |
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

**Overall Phase 3 completion: ~24 %** — M1-R Redesign Foundation fully complete (5/5 sub-phases); ADR work under 3-1 (~80 %).

---

## Sub-Phase 3-R1: Token pipeline + CI + ESLint — ✅ Complete (2026-04-25)

**Planned duration:** 3 days · **Actual:** 1 day
**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md)

| Task | Status | Notes |
|------|--------|-------|
| `scripts/build-tokens.ts` emitter (~310 lines hand-rolled, deterministic) | ✅ | Validates `tokens.json` against schema with `ajv`; emits sorted, LF-only output. `--verify` mode diffs against on-disk and exits 1 on drift. |
| Wire `npm run tokens:build` + `tokens:verify` | ✅ | New root `package.json` with `npm workspaces` (`be`, `fe/web`, `fe/mobile`, `tools/eslint-plugin-sekar-design`). |
| CI schema validation + generator drift check | ✅ | `.github/workflows/tokens-verify.yml` runs both `tokens:verify` and `test:tokens` on PRs touching tokens, schema, generator, plugin, or `generated/`. |
| ESLint rules (`no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`) | ✅ | Local plugin `tools/eslint-plugin-sekar-design/` (CommonJS for direct ESLint loading). Web config wires all 3; mobile wires `no-inline-hex-colors`. |
| Mobile RN custom rule banning `shadowRadius > 0` | ✅ | `rn-no-shadow-radius` rule live in `fe/mobile/eslint.config.js` at `error`. |
| Generator + rule unit tests (40 tests passing) | ✅ | `scripts/build-tokens.test.ts` (12) + 4 `RuleTester` test files (28). Run via `npm run test:tokens` (Jest + ts-jest at root). |
| Seed `generated/` artifacts | ✅ | Generator is fully functional: `generated/tokens.css` (web) and `generated/tokens.ts` (mobile) contain real token output. Consumer wiring (`@import` in `globals.css`, re-export in `nbTokens.ts`) deferred to 3-R2 by design — separates "plumbing live" from "consumer cutover". |
| Schema fix (deferred discovery) | ✅ | First `tokens:verify` run caught a real schema bug: `typeMap.additionalProperties` rejected the `_note` documentation string in `tokens.json`. Schema now accepts `{ typeEntry } ∪ { string }` for inline notes. |
| Transitional inline-hex allowlist | ✅ | 12 web files + 17 mobile files exempted via per-file ESLint overrides, explicitly tagged "remove in 3-R5". Existing `npm run lint` runs stay green during the M1-R window. |

**Acceptance criteria — all verified locally:**
- ✅ `npm run tokens:build && git diff --exit-code` clean (idempotent)
- ✅ `npm run tokens:verify` succeeds; tampering with `generated/tokens.css` causes `tokens-verify drift: ... exit=1`
- ✅ ESLint flags inline hex (smoke fixture `'#FF6B6B'` → 1 error from `sekar-design/no-inline-hex-colors`)
- ✅ 40/40 unit tests pass

**New files:**
- `package.json` (root, workspaces)
- `scripts/build-tokens.ts`, `scripts/build-tokens.test.ts`, `scripts/tsconfig.json`, `scripts/jest.config.cjs`
- `tools/eslint-plugin-sekar-design/{package.json, index.js, rules/*.js, rules/*.test.ts}` (4 rules + 4 test files)
- `fe/web/src/app/generated/tokens.css`
- `fe/mobile/src/constants/generated/tokens.ts`
- `.github/workflows/tokens-verify.yml`

**Modified files:**
- `fe/web/eslint.config.mjs` — registers plugin + 3 rules + transitional allowlist
- `fe/mobile/eslint.config.js` — registers plugin + 2 rules + ignores `src/constants/generated/**` + transitional allowlist
- `specs/ui-ux/tokens.schema.json` — `typeMap` accepts `_note` strings

**Deferred to 3-R2:**
- Consumer cutover: rewrite `globals.css` to `@import './generated/tokens.css'`; re-export from `generated/tokens.ts` in `nbTokens.ts`
- Brand-font bundling (Space Grotesk / Inter / JetBrains Mono on both platforms)
- Drift fixes in `nbTokens.ts` (`primaryDark`, `secondary`, etc.) — they live until consumer cutover
- Deprecation banners on `specs/mobile/design-tokens.md` + `color-palette-standardization.md`

**Engineering notes:**
- ESLint plugin is plain CommonJS so Node's resolver loads it without a build step. Tests stay TS via `ts-jest`.
- Allowlist is in-config, not in `scripts/hex-allowlist.txt` (the spec's 3-R5 file is for permanent exceptions like `bg.overlay` rgba and embedded SVGs).
- Generator output is deterministic by design: keys sorted alphabetically (`localeCompare`), `\n` line endings, trailing newline. Re-running over identical input yields byte-identical output.

---

## Sub-Phase 3-R2: Token value migration + brand-font bundling — ✅ Complete (2026-04-25)

**Planned duration:** 3 days · **Actual:** 1 day
**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md)

| Task | Status | Notes |
|------|--------|-------|
| Strip Layer-1 from `nbTokens.ts`, re-export from generated | ✅ | Selective re-exports (not `export *` — avoids naming conflicts). Augmented `nbColors` adds nested `gray` wrapper (`gray['200']` etc.) for 351 Phase 2 call sites. `nbBorderRadius` / `nbAnimation` alias exports added. |
| Rewrite `globals.css` → `@import './generated/tokens.css'` | ✅ | `@theme inline {}` approach: all hex eliminated from source; Tailwind utilities point to `var()` refs. Aliases added: `--color-nb-background: var(--color-bg-canvas)`, `--color-nb-sidebar: var(--color-nb-sidebar-bg)`. |
| Bundle OFL fonts (Space Grotesk, Inter, JetBrains Mono) on mobile | ✅ | Variable fonts for Inter (`Inter.ttf`, opsz+wght axes) and Space Grotesk (`SpaceGrotesk.ttf`, wght axis). Static weight TTFs for JetBrains Mono (Regular/Medium/SemiBold). All OFL license files included. |
| `react-native.config.js` font linking | ✅ | `fe/mobile/react-native.config.js` — `assets: ['./assets/fonts']` for `npx react-native-asset`. |
| Web `next/font/google` loaders in root layout | ✅ | `fe/web/src/app/layout.tsx` — Inter (`--font-body`), Space_Grotesk (`--font-display`), JetBrains_Mono (`--font-mono`); `display: 'swap'`, `latin+latin-ext` subsets. |
| Drift fixes: primary.hover, secondary, success, info, type h1/h2/h3, opaque shadows, focus ring | ✅ | All baked into `tokens.json` → regenerated on both platforms. Hard-edge shadows locked by 13 nbTokens unit tests (`shadowOpacity: 1`, `shadowRadius: 0`). Web focus ring → `3px solid var(--color-nb-primary)`. |
| Append CHANGELOG v2.1.1 entry | ✅ | `specs/ui-ux/CHANGELOG.md` — v2.1.1 shipped 2026-04-25: drift fixes, font bundling, `@theme inline` approach, CSS var naming. |
| Deprecation banners on `specs/mobile/design-tokens.md` + `color-palette-standardization.md` | ✅ | Both files redirect to `tokens.json` + `design-tokens.md` as canonical; banner added at top of each. |

**Acceptance criteria — all verified locally:**
- ✅ `git grep -nE '#[0-9a-fA-F]{6}' fe/mobile/src fe/web/src | grep -v '/generated/'` — returns only allowlist-controlled files (no new hex leaks)
- ✅ 13/13 nbTokens unit tests pass (Phase 3 canonical shadow values + backward-compat gray shape)
- ✅ `npm run tokens:verify` — `tokens-verify: OK (no drift)` (generator output matches on-disk generated files)
- ✅ 40/40 token pipeline tests pass (unchanged from 3-R1)

**New files:**
- `fe/mobile/react-native.config.js`
- `fe/mobile/assets/fonts/Inter.ttf` (variable, 876 KB)
- `fe/mobile/assets/fonts/SpaceGrotesk.ttf` (variable, 136 KB)
- `fe/mobile/assets/fonts/JetBrainsMono-Regular.ttf`, `-Medium.ttf`, `-SemiBold.ttf` (~270 KB each)
- `fe/mobile/assets/fonts/OFL-Inter.txt`, `OFL-SpaceGrotesk.txt`, `OFL-JetBrainsMono.txt`

**Modified files:**
- `fe/mobile/src/constants/nbTokens.ts` — complete rewrite; Layer-1 hex removed; generated consumer with backward-compat shims
- `fe/mobile/src/constants/__tests__/nbTokens.test.ts` — updated to Phase 3 canonical values (opaque shadows, `widthThin`/`widthBase` naming, nested gray shape)
- `fe/web/src/app/globals.css` — complete rewrite; `@import` + `@theme inline` + hard-edge shadows + updated focus ring
- `fe/web/src/app/layout.tsx` — three `next/font/google` loaders, CSS variable names updated
- `fe/mobile/src/components/common/CountdownTimer.tsx` — inline comment hex codes removed (acceptance check)
- `fe/mobile/src/screens/auth/LoginScreen.tsx` — inline comment hex codes removed (acceptance check)
- `specs/ui-ux/CHANGELOG.md` — v2.1.1 section filled in
- `specs/mobile/design-tokens.md` — deprecation banner added
- `specs/mobile/color-palette-standardization.md` — deprecation banner added

**Engineering notes:**
- `@theme inline {}` vs `@theme {}`: Tailwind v4 inline mode generates utilities using `var()` refs without creating new CSS vars in `:root` — no circular references. Non-inline `@theme {}` reserved for tokens not in `generated/` (e.g. `--radius-nb-xl: 16px`, animation durations, sizing constants).
- Variable fonts work on RN 0.83+ (Android 8+, iOS 14+). Static weight fallbacks not needed for Inter/SpaceGrotesk on the supported OS range.
- nbTokens backward-compat shims (`gray`, `nbBorderRadius`, `nbAnimation`) are tagged for Phase 3-R5 sweep removal via ESLint transitional allowlist entries.

---

## Sub-Phase 3-R3: NB primitives + NBModal/NBToast/NBText + visreg — ✅ Complete (2026-04-25)

**Planned duration:** 3 days · **Actual:** 1 day

| Task | Status | Notes |
|------|--------|-------|
| Migrate web primitives to `shadow-nb-*` + `.nb-focus-ring` | ✅ | Web components already on `shadow-nb-*` from Phase 2. `LocationTimeline.tsx` stray `shadow-sm` fixed → `shadow-nb-xs`. |
| Migrate mobile primitives to generated shadow helper | ✅ | Backward-compat `nbBorders.base/thin/thick/extra` aliases added to `nbTokens.ts` — critical gap from 3-R2 that broke borders across NBButton, NBCard, NBTab, screens. Also added `nbColors.background` alias for `bgCanvas`. |
| Build `NBModal.tsx` (`@gorhom/bottom-sheet` + RN `<Modal>`) | ✅ | `fe/mobile/src/components/nb/NBModal.tsx` — 2 variants: sheet (BottomSheet, NB title bar, grabber, snapPoints) + fullscreen (RN Modal, slide animation, back button). |
| Build `NBToast.tsx` (`react-native-toast-message` wrapper) | ✅ | `fe/mobile/src/components/nb/NBToast.tsx` — `react-native-toast-message@^2.3.3` installed. `NBToast.show({level, title, body, durationMs, action})` static API. Custom `nbToastConfig` renderer with NB chrome. |
| Build `NBText.tsx` typography component | ✅ | `fe/mobile/src/components/nb/NBText.tsx` — 10 variants. `rnFontFamily()` strips CSS stack to RN-compatible name. `NBHeading1/2/3` convenience exports. |
| Web Playwright `toHaveScreenshot` baseline | ⏳ DEFERRED | Phase 4 (unit-only scope for Phase 3). |
| Mobile Jest snapshots over every primitive | ⏳ DEFERRED | Phase 4. |
| CI jobs `web-visreg` + `mobile-snapshots` | ⏳ DEFERRED | Phase 4. |
| `specs/ui-ux/design-tokens.md §Component Parity Matrix` marks Modal/Toast/Text shipped | ✅ | Updated with ✅ on NBText, NBModal, NBToast rows. |
| Cross-link + component-library.md stubs | ✅ | Specs already had stubs; implementation follows them. |

**Acceptance criteria:**
- ✅ NBText, NBModal, NBToast each consumed by ≥1 canary screen: LoginScreen (NBText h1/body-sm + NBToast replaces Alert), ProfileScreen (NBModal "About" sheet)
- ✅ 478/478 unit tests pass (nb/__tests__ + constants/__tests__ + LoginScreen)
- ✅ `npm run tokens:verify` — OK (no drift)
- ✅ `git grep -nE '#[0-9a-fA-F]{6}' fe/mobile/src fe/web/src | grep -v '/generated/'` — allowlist-only

**New files:**
- `fe/mobile/src/components/nb/NBText.tsx`
- `fe/mobile/src/components/nb/NBModal.tsx`
- `fe/mobile/src/components/nb/NBToast.tsx`
- `fe/mobile/src/components/nb/__tests__/NBText.test.tsx` (17 tests)
- `fe/mobile/src/components/nb/__tests__/NBModal.test.tsx` (12 tests)
- `fe/mobile/src/components/nb/__tests__/NBToast.test.tsx` (11 tests)

**Modified files:**
- `fe/mobile/src/components/nb/index.ts` — exports for NBText/NBModal/NBToast
- `fe/mobile/src/constants/nbTokens.ts` — backward-compat `nbBorders` override (base/thin/thick/extra aliases) + `nbColors.background` alias
- `fe/mobile/src/constants/__tests__/nbTokens.test.ts` — 15 tests (added 2 for new compat shims)
- `fe/mobile/src/screens/auth/LoginScreen.tsx` — NBText + NBToast canary (Alert → NBToast)
- `fe/mobile/src/screens/auth/__tests__/LoginScreen.test.tsx` — mocks updated for NBToast
- `fe/mobile/src/screens/common/ProfileScreen.tsx` — NBModal canary (About sheet)
- `fe/mobile/jest.config.js` — `react-native-toast-message` added to transformIgnorePatterns
- `fe/web/src/components/monitoring/LocationTimeline.tsx` — shadow-sm → shadow-nb-xs
- `specs/ui-ux/design-tokens.md` — parity matrix updated

**Engineering notes:**
- `nbBorders.base` backward-compat bug: generated tokens renamed `base/thin/thick` → `widthBase/widthThin/widthThick`. Phase 2 code (NBButton, NBTab, NBDatePicker, 15+ screens) used old names. Fix adds overriding `nbBorders` export in `nbTokens.ts` wrapper — not the spec's "remove in 3-R5" shim pattern, but a critical gap fix.
- `react-native-toast-message` static methods (`Toast.show`, `Toast.hide`) are on the default export. The `NBToast` wrapper is named exports + a static namespace, tested with a mock that intercepts at the module level.
- Visual regression (Playwright + mobile Jest snapshots) deferred to Phase 4 per user-confirmed unit-only scope.

---

## Sub-Phase 3-R4: Web PWA shell + mobile-web responsive scaffolding — ✅ Complete (2026-04-25)

**Planned duration:** 2 days · **Actual:** 1 day
**Related ADRs:** [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md)

| Task | Status | Notes |
|------|--------|-------|
| `manifest.webmanifest` + icon set (192/512/512-maskable SVG + ImageResponse) | ✅ | display: standalone, bg #F5F0EB, theme #1A4D2E, 2 shortcuts |
| Service worker (`fe/web/src/sw/sw.ts` → `public/sw.js`) | ✅ | Shell precache, SWR 30s for snapshot, network-first 2s for pruning-requests, network-only for mutations |
| `InstallBanner`, `OfflineBanner`, `UpdateToast` | ✅ | NB chrome; 14-day dismiss; Sonner toast with SKIP_WAITING |
| `MobileInstallPush` (role-gated <768px login banner) | ✅ | satgas/linmas/korlap → Play Store / App Store links; session-dismissed |
| `usePushSubscription` hook | ✅ | Admin roles → VAPID subscribe → `POST /api/push/register` |
| `/install-help` page (iOS Safari fallback) | ✅ | Static 3-step walkthrough |
| `/offline` fallback page | ✅ | Precached; shown on navigation miss when offline |
| `ResponsiveShell` component | ✅ | Desktop (256px sidebar) / tablet (64px icon rail) / mobile (<768px ☰ drawer) |
| `(kecamatan)` layout scaffold | ✅ | Minimal top-bar shell; populated by 3-10 |
| Manifest registration + theme-color + viewport-fit + safe-area | ✅ | `app/layout.tsx` — themeColor + apple-touch-icon; `OfflineBanner` + `UpdateToast` |
| `next.config.ts`: SW headers + `NEXT_PUBLIC_FEATURE_PWA` flag | ✅ | `Service-Worker-Allowed: /`, `Cache-Control: no-store`; SW registration feature-flagged |
| `sw:build` esbuild script | ✅ | `fe/web/package.json` — chrome90 target, 5.7 kB output |

**Acceptance criteria:** Lighthouse PWA ≥ 90 on `/monitoring` (manual); install prompt on Android Chrome; iOS `/install-help` renders; offline shell renders; ResponsiveShell at 375/768/1280 px; satgas login shows install banner.

**Test results:**
- 28/28 unit tests passing (InstallBanner, OfflineBanner, UpdateToast, MobileInstallPush, usePushSubscription, ResponsiveShell)
- TypeScript: 0 errors on 3-R4 files

**New files (10):**
- `fe/web/public/manifest.webmanifest`
- `fe/web/public/icons/icon.svg`, `icon-maskable.svg`
- `fe/web/src/sw/sw.ts`, `fe/web/public/sw.js`
- `fe/web/src/components/pwa/InstallBanner.tsx`, `OfflineBanner.tsx`, `UpdateToast.tsx`, `MobileInstallPush.tsx`
- `fe/web/src/hooks/usePushSubscription.ts`
- `fe/web/src/components/layout/ResponsiveShell.tsx`
- `fe/web/src/app/(kecamatan)/layout.tsx`
- `fe/web/src/app/install-help/page.tsx`, `offline/page.tsx`
- `fe/web/src/app/icon.tsx`, `apple-icon.tsx`

**Modified files (4):**
- `fe/web/src/app/layout.tsx`
- `fe/web/src/app/providers.tsx`
- `fe/web/next.config.ts`
- `fe/web/package.json`

**Engineering notes:**
- Hand-rolled service worker (no Workbox) per ADR-037 §Decision lock — esbuild compiles to single `public/sw.js` (chrome90 target).
- SW registration is feature-flagged (`NEXT_PUBLIC_FEATURE_PWA=true`) so local dev doesn't cache stale assets.
- `ResponsiveShell` uses CSS breakpoints + `window.innerWidth` at mount (no SSR mismatch) for the `data-mobile` attribute.
- `(kecamatan)` route group layout is a minimal stub — full content and guards land in 3-10 when `PruningRequestService` is implemented.
- `usePushSubscription` sends VAPID subscription to `/api/push/register` — the actual backend endpoint will be wired in 3-9; the hook is safe to mount before that (the request 404s silently in dev).

---

## Sub-Phase 3-R5: Full redesign sweep on non-rewritten screens — ✅ Complete (2026-04-25)

**Planned duration:** 3 days · **Actual:** 1 day
**Related ADRs:** [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md)

| Task | Status | Notes |
|------|--------|-------|
| Sweep mobile auth + onboarding | ✅ | LoginScreen done in 3-R3; LoadingScreen, OB screens swept in 3-R5 |
| Sweep mobile worker + supervisor stack (OvertimeSubmitScreen, TaskCreateScreen, ActivitySubmissionScreen) | ✅ | `#FFF5F5` / `#FEF2F2` error-bg → `withAlpha(nbColors.danger, 0.05/0.06)` |
| Sweep mobile monitoring components (StaffingSummarySection, BoundaryOverlay) | ✅ | `#D97706` → `nbColors.warning`; `#D97706` (BoundaryOverlay areaCenterMarker) → `nbColors.warning` |
| Sweep mobile shared components (ErrorBanner, ImagePreviewModal, LocationStatusCard, BoundaryDetailModal, LocationMapModal) | ✅ | Done by mobile-developer agent |
| Sweep web pages + non-monitoring components | ✅ | Already clean; `InstallBanner.tsx` CSS var fallback fixed (`--color-nb-accent-yellow` → `--color-bg-accent-yellow`) |
| Monitoring components (mobile: LocationTrail, BoundaryOverlay partial; web: StaffingSummaryCard, MonitoringMap, etc.) | ⏳ DEFERRED | Status palette `#9333EA` etc. have no NB token; will be resolved when status tokens are added in 3-3/3-4 |
| Update visual regression snapshots | ⏳ DEFERRED | Phase 4 per unit-only scope |
| Create `scripts/hex-allowlist.txt` | ✅ | 18 entries; covers Mapbox GL specs, monitoring palette, ImageResponse SVG, Next.js metadata, legacy theme |
| `fe/mobile/eslint.config.js` transitional → permanent allowlist | ✅ | Reduced from ~30 → 7 entries with rationale |
| `fe/web/eslint.config.mjs` transitional → permanent allowlist | ✅ | Updated with inline category comments |
| Update `StaffingSummarySection.test.tsx` assertions for new token value | ✅ | `#D97706` → `#E3A018` in test mock + assertions; 27/27 pass |

**Acceptance criteria:**
- ✅ All swept files pass `sekar-design/no-inline-hex-colors` with zero errors
- ✅ `scripts/hex-allowlist.txt` created and covers all remaining allowlist entries
- ✅ Mobile ESLint allowlist reduced to 7 permanent entries; web to 19 permanent entries
- ✅ 27/27 StaffingSummarySection unit tests pass; overall test suite continues passing
- ⏳ Visual regression deferred to Phase 4

**Modified files:**
- `fe/mobile/src/components/monitoring/StaffingSummarySection.tsx` — `#D97706` → `nbColors.warning` (×2)
- `fe/mobile/src/components/monitoring/BoundaryOverlay.tsx` — `#D97706` → `nbColors.warning`
- `fe/mobile/src/screens/overtime/OvertimeSubmitScreen.tsx` — added `withAlpha` import; `#FFF5F5` → `withAlpha(nbColors.danger, 0.05)`
- `fe/mobile/src/screens/taskActivity/TaskCreateScreen.tsx` — `#FEF2F2` → `withAlpha(nbColors.danger, 0.06)`
- `fe/mobile/src/screens/field/ActivitySubmissionScreen.tsx` — `#FEF2F2` → `withAlpha(nbColors.danger, 0.06)`
- `fe/mobile/src/components/monitoring/__tests__/StaffingSummarySection.test.tsx` — mock + assertions updated for new token value
- `fe/mobile/eslint.config.js` — transitional allowlist → permanent (30 → 7 entries)
- `fe/web/src/components/pwa/InstallBanner.tsx` — CSS var corrected (`--color-bg-accent-yellow`, no fallback)
- `fe/web/eslint.config.mjs` — transitional → permanent allowlist with category annotations

**New files:**
- `scripts/hex-allowlist.txt` — 18-entry permanent exception registry

**Engineering notes:**
- The monitoring status palette (`#9333EA` outside_area purple, `#D97706` amber-600, `#DC2626` red-600, `#6B7280` cool-gray) is deliberately outside the NB warm-stone token set. These colors are tuned for map contrast and accessibility at small marker sizes. Adding them as semantic status tokens is the right fix — planned for 3-3/3-4 monitoring rebuild.
- Mobile `theme.ts` (legacy Phase 2 common component palette) is still imported by 8 `components/common/` files (Button, Card, Input, EmptyState, SkeletonLoader, TextInput, SyncStatusIndicator, LoadingSpinner). Those components predate the NB system and will be migrated in Phase 4 / 3-R5 continuation.
- Mapbox GL layer paint properties and static map URL builders must use literal hex — CSS vars and `var()` are not supported in GL style expressions.
- `ImageResponse` server-side icon generation runs outside the browser; CSS vars cannot be resolved there.

---

## M1-R Post-Review Bugfixes (2026-04-25)

Two mobile bugs found during user's manual M1-R review; fixed same session. No spec scope change.

| Fix | Files | Notes |
|-----|-------|-------|
| LoginScreen: removed duplicate Redux error box | `LoginScreen.tsx`, `NBToast.tsx` | API-level errors now shown only via persistent bottom toast (user taps ✕); field-validation errors (identifierError/passwordError under each input) unchanged; added `persistent?: boolean` to `NBToastOptions` |
| NBModal: standardized content + footer padding; button visual parity | `NBModal.tsx`, `ChangePasswordModal.tsx`, `ActivityFilterModal.tsx`, `OvertimeFilterModal.tsx`, `TaskFilterModal.tsx`, `SortModal.tsx`, `ProfileScreen.tsx` | Added `noPadding?: boolean` prop; non-scrollable content gets `padding: md, paddingBottom: sm` by default; `footerWrap` gets `paddingHorizontal: md, paddingVertical: sm+2`; `SortModal` opts out with `noPadding`; `ProfileScreen` drops manual `aboutContent` wrapper; filter modals drop redundant padding from `actionButtons`; `ChangePasswordModal` footer migrated from `NBButton` to `TouchableOpacity` matching filter-modal button style |

**Web M1-R clarification:** Web didn't need a separate hex-sweep in 3-R5 because Phase 2 web was already CSS-variable-driven. The M1-R web deliverables spread across sub-phases: ESLint rules (3-R1), `generated/tokens.css` + `@theme inline` wiring (3-R2), fonts + PWA shell (3-R4). The 3-R5 "web sweep" was a verification pass (zero ESLint violations confirmed + one CSS var name fix in `InstallBanner.tsx`). STATUS.md row updated to make this explicit.

**Test results:** 77/77 tests pass (`NBToast`, `LoginScreen`, `ChangePasswordModal`, `ActivityFilterModal`, `SortModal`, `ProfileScreen` suites).

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
