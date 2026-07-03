# Phase 4: Production Readiness, Rebrand & UI/UX Revamp

**Date:** May 22, 2026 (revamp pass — supersedes the March 12, 2026 baseline)
**Status:** 🟡 Not Started — spec freshly re-baselined against Phase 3 reality + new Design System v2.1 bundle
**Priority:** **High — pre-production hardening + rebrand + release-gate**
**Duration:** **67-87 developer-days estimated (10-12 weeks)** — up from 52-68 d to absorb the Design System v2.1 sweep and the production-gap audit; trimmed against work already shipped in Phase 3 (FCM activation, Redis adapter, web PWA, generated tokens, monitoring v2). Sum verifies: 4-0 (3-4) + 4-R (15-18) + 4-V (4-5) + 4-1 (2-3) + 4-2 (4-6) + 4-3 (3-5) + 4-4 (3-4) + 4-5 (5-7) + 4-6 (4-5) + 4-7 (12-15) + 4-8 (3-4) + 4-9 (7-8) + 4-10 (2-3) = **67 low / 87 high**.
**Depends On:** Phase 3 (substantially complete — finishing tail tracked separately; Phase 4 inherits Redis 7, generated-token pipeline, web PWA shell, NB design system migration, mobile-web responsive layouts, FCM live, Socket.IO Redis adapter active).
**Related ADRs:** [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-017](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md), [ADR-018](../../architecture/decisions/ADR-018-export-format-strategy.md), [ADR-019](../../architecture/decisions/ADR-019-offline-connectivity-model.md), inherits [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md), [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md), **NEW** [ADR-040](../../architecture/decisions/ADR-040-design-system-v2.1.md), [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md), [ADR-042](../../architecture/decisions/ADR-042-onboarding-flow.md), [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md)

---

## 0. Why this revamp pass

Two things changed since the March-12 Phase 4 spec was written:

1. **Phase 3 actually shipped a lot of what Phase 4 had planned.** FCM is live (`FCM_ENABLED=true` in `be/.env`); the Socket.IO Redis adapter is wired (`be/src/gateways/events.gateway.ts:93`); the web is an installable PWA (`fe/web/src/app/offline/page.tsx`, `install-help/page.tsx`); generated tokens pipeline is running; monitoring v2 with Redis Streams + supercluster is in production. The old README's "FCM_ENABLED=false → set to true" claim is stale and has been removed.

2. **The user iterated a complete SEKAR rebrand on Claude Design.** A 224 KB handoff bundle is now vendored at `design/` (see `design/README.md` for the bundle's own instructions). It contains a **locked Design System v2.1** (`design/project/design-system.html`), full mobile hi-fi (`design/project/hifi-mobile.html` — **39 screens across 12 sections**), full web hi-fi (`design/project/hifi-web.html` — **11 frames across 13 routes**), brand identity (`design/project/illustrations.html` — pinwheel mark, app icons, splash, 6 empty states, onboarding scenes, brand iconography, map markers, 5 patterns), and 4 chat transcripts (`design/chats/`) where the design intent lives.

**Headline visual changes** locked by v2.1 (see [ADR-040](../../architecture/decisions/ADR-040-design-system-v2.1.md)):

- Primary moves **yellow → sage green `#7FBC8C`** (yellow demoted to accent/highlight role).
- Canvas moves **off-white → warm stone `#F5F0EB`** for outdoor legibility.
- Shadows become **hard-edge offset** (no blur, neo-brutalist offset shadows `2px 2px 0`, `4px 4px 0`, `10px 10px 0`).
- Status palette codified at **5 monitoring states** with paired -fg/-bg tokens.
- Role accents codified for **9 roles** (incl. `staff_kecamatan`).
- Logo locks: **pinwheel with 8 petals** = 8 rayons, yellow center = DLH Surabaya.

**Outcome:** Phase 4 now has three headline themes — **(a) UI/UX revamp + rebrand**, **(b) production-readiness gap closure**, **(c) the original infrastructure/refactor/E2E hardening**, in that priority order.

---

## 1. Phase 3 reality check — what's already shipped (no longer in Phase 4 scope)

| Item | Old Phase 4 status | **Current reality (May 22, 2026)** |
|------|---------------------|-----------------------------------|
| FCM activation | Wire 8 triggers, flip `FCM_ENABLED=true` | ✅ **Live** — `FCM_ENABLED=true` in `be/.env`, 8 triggers wired, May 16-17 commits `fix(fcm)` + `fba6d5b review(notifications)` polished the stack. Remaining: retry queue + preferences (Sub-Phase 4-3). |
| Socket.IO Redis adapter | Add `@socket.io/redis-adapter` | ✅ **Live** — `be/src/gateways/events.gateway.ts:93` calls `createAdapter(pub, sub)`. Redis 7 instance in Docker Compose. |
| Redis 7 infrastructure | Adopt, configure | ✅ **Live** — `ioredis` + `@socket.io/redis-adapter` in `be/package.json`. Used by monitoring projector + WebSocket adapter. |
| Web PWA (manifest, service worker, install prompt, offline shell, push subscription) | Implement | ✅ **Shipped in Phase 3 sub-phase 3-R4** — see `fe/web/src/app/offline/page.tsx`, `install-help/page.tsx`. Phase 4 → polish only (Lighthouse audit, OG/SEO, bundle analysis). |
| Design-token generator pipeline | Build | ✅ **Live** — Phase 3 sub-phase 3-R1; root `npm run tokens:build` regenerates `fe/web/src/app/generated/tokens.css` + `fe/mobile/src/constants/generated/tokens.ts`. |
| NB primitives migration | Rebuild NBModal/NBToast/NBText | ✅ **Shipped in Phase 3 sub-phase 3-R3**. |
| Mobile responsive at 375/768/1280 | Implement | ✅ **Shipped in Phase 3 sub-phase 3-R4 + 3-R5**. |
| Brand-font bundling (Space Grotesk + Inter + JetBrains Mono) | Bundle | ✅ **Shipped in Phase 3 sub-phase 3-R2**. |

**Net effect:** When Phase 4 starts, the infrastructure spine is already in place. Phase 4 focuses on (a) **adopting v2.1 tokens + rebrand assets**, (b) **revamping every screen against the new hi-fi**, (c) **building the screens that don't exist yet** (pre-login carousel, forgot-password, onboarding, NotificationsScreen), (d) **closing the four production-readiness gaps the user is uncertain about**, (e) finishing the original hardening work (exports, refactor, E2E, security).

---

## 2. Sub-phase grid

| Sub-Phase | Name | Effort | Status | Theme |
|-----------|------|--------|--------|-------|
| **4-0** | Design Bundle Adoption + Token Re-baseline | **3-4 d** | ⏳ NEW | Rebrand |
| **4-R** | UI/UX Revamp Sweep (mobile + web, per hi-fi) | **15-18 d** | ⏳ NEW | Rebrand |
| **4-V** | Production-Readiness Gap Audit | **4-5 d** | ⏳ NEW | Release-gate |
| 4-1 | Infrastructure & Evaluation (trimmed) | 2-3 d | ⏳ | Hardening |
| 4-2 | Offline Sync Completion + Offline-Screen Matrix | 4-6 d | ⏳ | Hardening |
| 4-3 | Push Notification + In-App Inbox (bell + badge + deep-link router) | 3-5 d | ⏳ | Hardening |
| 4-4 | Worker Reassignment Workflow | 3-4 d | ⏳ | Hardening |
| 4-5 | Export & Import Data | 5-7 d | ⏳ | Hardening |
| 4-6 | Real Data Seeder & Data Management | 4-5 d | ⏳ | Hardening |
| 4-7 | Refactor, Optimization & Security | 12-15 d | ⏳ | Hardening |
| 4-8 | Mobile & Web Production Hardening (non-UI) | 3-4 d | ⏳ | Hardening |
| 4-9 | E2E Testing | 7-8 d | ⏳ | Hardening |
| 4-10 | Documentation Sync | 2-3 d | ⏳ | Closeout |

**Total revised: 67-87 developer-days** (was 52-68 d). Delta: rebrand sweep (4-0 + 4-R + 4-V = +22-27 d) + in-app inbox & offline-screen matrix additions (4-2 + 4-3 +0-2 d) net of trimming (4-1 + 4-3 + 4-8 shed Phase 3-delivered work = -7-10 d).

### Parallelization opportunities

```
Week 1:    4-0 (Token re-baseline) ──── 3-4 d (BLOCKS 4-R)
Week 1-2:  4-V (Gap audit) ──── 4-5 d (independent; informs 4-2 / 4-3)
Week 2-4:  4-R (UI/UX revamp) ───────────── 15-18 d (can start once 4-0 lands)
           4-1 (Infra trim) ──── 2-3 d
           4-5 (Export/Import) ──── 5-7 d (independent)
Week 3-5:  4-2 (Offline sync) ←── 4-V findings
           4-3 (Push hardening) ←── 4-V findings + 4-1 health endpoint
           4-4 (Reassignment) ←── 4-2 offlineQueue
           4-6 (Data mgmt) ←── 4-5
Week 5-8:  4-7 (Refactor/security) ←── 4-1
           4-8 (Mobile/web prod hardening) — parallel
Week 8-10: 4-9 (E2E) ←── 4-2…4-8
Week 10-11:4-10 (Doc sync) ←── all
```

### Sub-phase dependency notes

- **4-0 blocks 4-R.** Tokens must regenerate before screen-level revamp; otherwise screens drift twice.
- **4-V runs early and independently.** It must complete before 4-2 (offline) and 4-3 (FCM) commit to deliver-or-defer plans. Its output is [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md).
- **4-4 (Reassignment) soft-depends on 4-2.** Both touch `offlineQueue.ts`; serialize unless merged.
- **4-7 finishes the Redis-adapter emit refactor** (`emitToUser()` → room-based emit) that Phase 3 deferred. Hard dependency per ADR-016.

---

## 3. Requirements coverage (19 + 4 new)

The original 19 user/additional requirements remain. Four new requirements drive this revamp pass:

| # | Requirement | Source | Sub-Phase |
|---|-------------|--------|-----------|
| 1-19 | (See original table further down — unchanged in intent, refined in scope) | — | various |
| **20** | **Adopt Design System v2.1 (sage primary, warm stone canvas, hard shadows)** | User (May 22) | 4-0 |
| **21** | **Rebrand to SEKAR pinwheel + ship app icon / splash / illustrations** | User (May 22) | 4-0, 4-R |
| **22** | **Implement missing entry-flow screens (carousel WL-1…5, forgot-password AS-4/5, onboarding OB-1…3, notifications NOTIF-1)** | User (May 22, design hi-fi) | 4-R |
| **23** | **Production-readiness gap audit (offline / push / background location / broker) — deliver-or-defer decision per gap** | User (May 22) | 4-V |

### Original 19-item requirements table

| # | Requirement | Source | Sub-Phase |
|---|-------------|--------|-----------|
| 1 | Offline sync for all features (differentiate no-internet vs server-unreachable) | User | 4-2 |
| 2 | Push notification (FCM full activation) | User | 4-3 *(FCM already live; sub-phase now = hardening + UX)* |
| 3 | Refactor (SOLID, five-lines, reusable components) | User | 4-7 |
| 4 | Optimization on all features | User | 4-7 |
| 5 | WebSocket evaluation | User | 4-1, 4-V |
| 6 | Message broker (if needed) | User | 4-V → 4-3 (BullMQ on existing Redis if accepted) |
| 7 | Worker reassignment (multi-area with default area) | User | 4-4 |
| 8 | Real data seeder and import | User | 4-6 |
| 9 | Import KMZ from web | User | 4-5 |
| 10 | Export and importable data for all | User | 4-5 |
| 11 | Update and sync documentation | User | 4-10 |
| 12 | UI/UX polish for all (mobile and web) | User | **4-R** (was 4-8) |
| 13 | Security hardening (rate limiting, JWT refresh, CORS, Helmet.js) | Additional | 4-7 |
| 14 | Observability & logging (structured logging, Sentry, request tracing) | Additional | 4-1 |
| 15 | Data management (retention policy, soft-delete cleanup, index audit) | Additional | 4-6 |
| 16 | Mobile production readiness (ProGuard, crash reporting, deep linking) | Additional | 4-8 |
| 17 | Web production readiness (SEO, PWA polish, bundle analysis) | Additional | 4-8 |
| 18 | Timezone & localization (WIB consistency, DD/MM/YYYY format) | Additional | 4-2, 4-7 |
| 19 | Background jobs & audit (cron jobs, audit trail completeness) | Additional | 4-3, 4-4 |

---

## 4. The three new sub-phases

### 4-0 · Design Bundle Adoption + Token Re-baseline (3-4 days)

**Requirements:** #20 v2.1 adoption, #21 rebrand assets

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Vendor design bundle to repo | Already done (May 22); confirm `design/` carries 39 mobile + 11 web hi-fi + illustrations + chats | `design/` |
| A2. Regenerate `specs/ui-ux/tokens.json` from `design/project/hifi-shared.css` | Script-assisted port — sage primary, warm stone canvas, status palette, role accents, hard-edge shadow scale, radius scale, brand-yellow as accent only | `specs/ui-ux/tokens.json` |
| A3. Update `specs/ui-ux/design-tokens.md` v2.1 note | Document the diff (yellow→green primary, role accents added, status palette codified, shadow scale, radius scale, spacing scale unchanged) | `specs/ui-ux/design-tokens.md` |
| A4. Run `npm run tokens:build` | Regenerates `fe/web/src/app/generated/tokens.css` + `fe/mobile/src/constants/generated/tokens.ts` | (generated) |
| A5. Visual diff snapshot | Story-driven screenshot diff of key NB primitives (Button, Card, Pill, Toast, Input) — record before/after for stakeholder sign-off | `design/regression-snapshots/` |
| B1. Extract pinwheel logo to SVG assets | `fe/mobile/src/assets/brand/sekar-mark.svg` + `fe/web/public/brand/sekar-mark.svg` (from `design/project/illustrations.html` `#sekar-mark`) | brand assets |
| B2. Replace app icon (iOS + Android) | iOS Images.xcassets/AppIcon, Android `mipmap-*/ic_launcher` + adaptive `ic_launcher_foreground/background` | mobile native assets |
| B3. Replace splash screen (light/dark/green variants) | iOS `LaunchScreen.storyboard`, Android `splash_*.xml` + `AndroidManifest.xml` themes | mobile native assets |
| B4. Ship empty-state SVG illustrations | 6 illustrations (illo-reports, illo-shifts, illo-offline, illo-location, illo-search, illo-personnel) to `fe/mobile/src/assets/empty/` + `fe/web/public/empty/`; wire through existing `NBEmptyState` | shared assets |
| B5. Ship onboarding scene SVGs | 3 scenes (onb-clockin, onb-photo, onb-monitor) for OB-1…OB-3 | mobile assets |
| B6. PWA manifest theme/icon update | `fe/web/public/manifest.webmanifest` — `theme_color: #7FBC8C`, maskable icon = pinwheel | web PWA |
| C1. Token-compliance ESLint sweep | Re-run `eslint-plugin-sekar-design` repo-wide; expect 50-150 violations (literal hex / borderWidth / padding consumed direct) — fix all | repo-wide |

**Deliverables:** `tokens.json` v2.1, regenerated tokens.css + tokens.ts, brand assets shipped, ESLint clean, ADR-040 written.

### 4-R · UI/UX Revamp Sweep (15-18 days)

**Requirements:** #12 UI/UX polish, #22 missing screens

Authoritative source: `design/project/hifi-mobile.html` (39 screens) + `design/project/hifi-web.html` (11 frames).

**Mobile screen matrix** — see [`mobile.md` § UI/UX Revamp](./mobile.md#ui-ux-revamp). Pre-login + auth (10 screens, 7 NEW), onboarding (3 NEW), post-login revamp (~20 screens).

**Web screen matrix** — see [`web.md` § UI/UX Revamp](./web.md#ui-ux-revamp). 11 hi-fi frames mapped to 13 existing routes + new `(dashboard)/notifications` page + new informational `(auth)/forgot-password` page.

**Brand & illustrations** — see [`ui-ux.md` § Brand & Illustrations](./ui-ux.md#brand-illustrations).

**Acceptance gate:** Every hi-fi screen ID (WL-1…NOTIF-1, LOG-1…KEC-1) marked ✅ in [`status_reviews.md` § Revamp Acceptance Checklist](./status_reviews.md#revamp-acceptance-checklist).

### 4-V · Production-Readiness Gap Audit (4-5 days)

**Requirements:** #23 (new), #5 WebSocket eval, #6 broker decision

| Task | Scope | Output |
|------|-------|--------|
| G1. Offline sync — staging field-test | Build queue type inventory; run airplane-mode flow (clock-in, activity, overtime, task-completion, reassignment); reconnect; verify single submission + no duplicate, timestamps preserved (Asia/Jakarta) | Gap 1 report in `status_reviews.md` |
| G2. Push notifications — end-to-end on staging | Production-shape FCM project; verify token registration on login + deregister on logout; trigger all 8 backend points (task-assigned, activity-approved, etc.); verify foreground/background/quit handling; measure delivery latency p50/p99; identify retry-queue need | Gap 2 report |
| G3. Background location — platform audit | Android `AndroidManifest.xml` — `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` declared? Foreground service notification implemented? iOS `Info.plist` — `UIBackgroundModes` includes `location`? Battery audit: report current tracking interval + battery drain over a 4-h test shift | Gap 3 report |
| G4. Broker decision | Workloads inventory (FCM retry, exports >5k rows, CSV import, KMZ parse, cron aggregations); decide BullMQ-on-existing-Redis vs no-broker vs new infra; write [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md) | Gap 4 report + ADR-043 |
| G5. Cross-gap synthesis | Mark each gap **Deliver in 4-x** / **Already-good for MVP** / **Defer to Phase 5** | Final decision matrix in `status_reviews.md` |

**Deliverables:** `status_reviews.md § Gap Audit` populated with real numbers, [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md) Proposed, sub-phases 4-2 / 4-3 / 4-8 scoped to the audit's verdict.

---

## 5. Trimmed sub-phases (4-1, 4-3, 4-8 — work already done in Phase 3)

### 4-1: Infrastructure & Evaluation — **trimmed to 2-3 d**

**Already shipped in Phase 3:** Redis 7 adoption, Socket.IO Redis adapter, Docker Compose Redis service.

**Remaining work:**

| Task | Scope | Key Files |
|------|-------|-----------|
| B1. Structured logging | `@nestjs/common Logger` JSON format in production | `be/src/main.ts`, `be/src/common/interceptors/logging.interceptor.ts` |
| B2. Request tracing middleware | X-Request-ID generation + propagation | New: `be/src/common/middleware/request-id.middleware.ts` |
| B3. Sentry backend | Error capture, transaction tracing, source maps | `be/src/main.ts`, `be/src/common/filters/` |
| B4. Sentry mobile | Crash reporting, breadcrumbs, navigation tracing (release tag = SEKAR v1.0 rebrand) | `fe/mobile/src/App.tsx`, `fe/mobile/android/app/build.gradle` |
| B5. Slow query interceptor | Log queries >500ms with plan | New: `be/src/common/interceptors/slow-query.interceptor.ts` |
| C1. Health module | `GET /health` (light, no auth, no DB), `GET /health/full` (DB+Redis check, admin-only) | New: `be/src/modules/health/` |

### 4-3: Push Notification — **renamed & extended (3-5 d)**

**Already shipped in Phase 3:** `FCM_ENABLED=true`, 8 trigger points wired, mobile token registration on login/logout, foreground/background handling.

**Remaining work — push + in-app inbox parity:** The user wants an Instagram/Twitter/Facebook-style **in-app notification surface** that stays in sync with push. Bell icon in the header with unread badge on every authenticated screen, tap → inbox, tap-on-row → deep-link to the entity. Every push notification ALSO writes to the in-app inbox, so the two surfaces never disagree. Detailed specs at [`mobile.md § B6/B7/B8`](./mobile.md#b6-in-app-notification-bell--badge-instagram--twitter--facebook-pattern) and [`web.md § D3/D4/D5`](./web.md#d3-bell-visual-spec-token-compliant).

| Task | Scope | Key Files |
|------|-------|-----------|
| A1. Retry queue (BullMQ on existing Redis, per ADR-043) | Failed FCM sends queued for retry with exponential backoff | New: `be/src/modules/notifications/queue/fcm-retry.queue.ts` |
| A2. Notification preferences entity + CRUD | Per-user opt-out by type | New: `be/src/modules/notifications/entities/notification-preference.entity.ts` |
| A3. Shift reminder cron | @Cron 15 min before shift start → FCM | New: `be/src/modules/notifications/cron/shift-reminder.cron.ts` |
| A4. Stale status cleanup cron | Remove stale `user_tracking_status` entries | New: `be/src/modules/monitoring/cron/stale-status.cron.ts` |
| A5. Backend writes every push to `notifications` table | Single source of truth — `sendToUser()` always persists the notification record before / alongside the FCM dispatch, so the in-app inbox is authoritative even if FCM fails | `be/src/modules/notifications/notifications.service.ts` |
| A6. `GET /notifications/unread-count` endpoint | Lightweight count used by mobile + web on foreground / cross-tab sync | `be/src/modules/notifications/notifications.controller.ts` |
| B1. Mobile NotificationsScreen (NOTIF-1) | List, filter, mark-read, deep-link on tap | New: `fe/mobile/src/screens/notifications/NotificationsScreen.tsx` |
| B2. **Mobile NotificationBell** (header bell + badge) | Visible on every authenticated screen; Instagram-style badge; FCM foreground handler increments count + shows NBToast | New: `fe/mobile/src/components/common/NotificationBell.tsx` |
| B3. **Mobile deep-link router** | `deepLinkRouter.ts` — single source of truth for `notification.type → screen` mapping; used by FCM tap, bell row tap, in-app toast tap | New: `fe/mobile/src/services/notifications/deepLinkRouter.ts` |
| B4. FCM foreground-suppression | Configure FCM SDK to suppress OS-tray notification when app is foreground (mobile + web) — single visual surface | `fe/mobile/src/services/fcm/fcmService.ts`, `fe/web/public/firebase-messaging-sw.js` |
| C1. Web notification bell + page | Hi-fi popover (last 5 unread) + full page; same deep-link router | New: `fe/web/src/components/nb/NotificationBell.tsx`, `fe/web/src/app/(dashboard)/notifications/page.tsx`, `fe/web/src/services/notifications/deepLinkRouter.ts` |
| C2. Web cross-tab sync | `BroadcastChannel('notifications')` so mark-read on one tab updates other open tabs | `fe/web/src/hooks/useNotifications.ts` |

### 4-8: Mobile & Web Production Hardening — **trimmed to 3-4 d (non-UI only)**

**Moved to 4-R:** NB compliance audit, empty states, skeletons, animations, accessibility gaps (all done as part of the hi-fi sweep, screen-by-screen).

**Remaining work:**

| Task | Scope | Key Files |
|------|-------|-----------|
| E1. ProGuard rules | Custom rules for RN 0.83 release builds (preserve Reanimated, Geolocation, FCM, Sentry) | `fe/mobile/android/app/proguard-rules.pro` |
| E2. Sentry mobile init | Already in 4-1 B4 (cross-listed for completeness) | — |
| E3. Deep linking | Android App Links + iOS Universal Links — handle FCM payload deep-routing into specific screens (task-detail, activity-detail, perantingan-detail) | `fe/mobile/android/app/src/main/AndroidManifest.xml`, `fe/mobile/ios/sekar/Info.plist`, `fe/mobile/src/navigation/linking.ts` |
| F1. Web SEO | Per-page `<head>` (title, description, OG), structured data on public landing | `fe/web/src/app/(public)/layout.tsx` |
| F2. Web Lighthouse audit (PWA already shipped) | Target ≥90 Performance / ≥95 Accessibility / ≥95 Best Practices / ≥90 SEO; remediate findings | (audit output) |
| F3. Bundle analysis | `@next/bundle-analyzer` web, Metro analyzer mobile; identify >100 kB dependencies; lazy-load Google Maps + heavy modules | `fe/web/next.config.ts`, `fe/mobile/metro.config.js` |

---

## 6. Risk assessment (updated)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Token re-baseline breaks visual regressions** | High | Medium | Story-driven snapshot diff in 4-0; ESLint plugin catches direct-value drift; staged screen-by-screen rollout in 4-R |
| **Rebrand needs app-store submission round-trip** | Certain | Medium | Bundle 4-R completion + app icon + splash + bundle ID stays same → resubmission only, no new app listing; plan 2-week store-review buffer before launch |
| **Gap audit reveals background-location is broken** | Medium | **High** | 4-V runs early; if Android foreground service / iOS background-mode missing, escalate as blocker; ADR-043 records mitigation (likely: ship 4-V-discovered fixes inside 4-2) |
| **FCM retry queue requires BullMQ — new dep** | Medium | Low | BullMQ rides existing Redis 7; documented in ADR-043; ~1 d to integrate |
| Maestro flaky on CI | High | Medium | Retry mechanism in CI; critical flows only |
| Async exports of large datasets block server | Medium | High | Async export_jobs with streaming; rate-limit export endpoint |
| FCM preference changes spam users | Low | High | NotificationPreferences opt-out; batch throttling via BullMQ |
| SOLID refactoring introduces regressions | Medium | High | >80% test coverage gates each extraction; full suite after each |
| JWT refresh breaks old mobile clients | Medium | High | Deploy refresh-token support on mobile BEFORE shortening JWT expiry (7d→15m); staged rollout |
| ProGuard breaks RN production build | Medium | Medium | Incremental rules; test release build on CI |

---

## 7. Implementation phases (full table — original 4-1…4-10 plus new 4-0/4-R/4-V)

The detailed task breakdown for each sub-phase lives in domain files:

- **Backend tasks:** [`backend.md`](./backend.md) — sub-phases 4-1, 4-3, 4-5, 4-6, 4-7
- **Mobile tasks:** [`mobile.md`](./mobile.md) — sub-phases 4-2, 4-3, 4-4, 4-7, 4-8 + **4-R revamp matrix**
- **Web tasks:** [`web.md`](./web.md) — sub-phases 4-5, 4-8, 4-9 + **4-R revamp matrix**
- **Database tasks:** [`database.md`](./database.md) — schema changes, migrations, indexes
- **Infrastructure tasks:** [`infrastructure.md`](./infrastructure.md) — Sentry, BullMQ on Redis, CI/CD
- **Testing:** [`testing.md`](./testing.md) — Maestro + Playwright (including WL/AS/OB flows)
- **UI/UX:** [`ui-ux.md`](./ui-ux.md) — **NB audit (now hi-fi-driven), brand & illustrations, screen matrix**

---

## 8. What gets added

| Addition | Description |
|----------|-------------|
| `design/` (vendored) | Frozen handoff bundle from Claude Design — chats, hi-fi, illustrations |
| `specs/ui-ux/tokens.json` (regenerated) | v2.1 — sage primary, warm stone canvas, hard shadows |
| `fe/mobile/src/assets/brand/`, `fe/mobile/src/assets/empty/` | Pinwheel logo, splash, 6 empty-state illustrations, 3 onboarding scenes |
| `fe/web/public/brand/`, `fe/web/public/empty/` | Web counterparts |
| Mobile screens **NEW** | `WelcomeCarouselScreen` (WL-1…5), `ForgotPasswordScreen` (AS-4), `ChangePasswordScreen` (AS-5), `OnboardingWelcomeScreen` (OB-1), `OnboardingPermissionsScreen` (OB-2 — replaces modal), `OnboardingAreaPreviewScreen` (OB-3), `NotificationsScreen` (NOTIF-1) |
| Web pages **NEW** | `(auth)/forgot-password/page.tsx` (informational), `(dashboard)/notifications/page.tsx`, `(dashboard)/import/page.tsx`, `(dashboard)/export/page.tsx` |
| Backend modules **NEW** | `export/`, `health/` |
| Backend services **NEW** | `BoundaryCheckService`, `UserValidationService`, `RoomJoinService` (extracted) |
| Backend queue **NEW** | BullMQ FCM retry queue on existing Redis |
| Backend entity **NEW** | `notification_preferences`, `export_jobs` |
| Backend flag **NEW** | `users.password_must_change` (boolean, default false) — drives AS-5 forced change flow |
| Cron jobs **NEW** | Shift reminder, stale status, location retention, soft-delete cleanup, daily summary |
| Infrastructure **NEW** | BullMQ (on existing Redis 7 — no new infra), Sentry (backend + mobile), structured logging |
| `fe/mobile/.maestro/` | Maestro E2E flows (15+) |
| ADRs **NEW** | ADR-040 (Design System v2.1), ADR-041 (Forgot-password contact-admin), ADR-042 (Onboarding flow), ADR-043 (Production gap-closure decisions) |

## 9. What gets changed

| Current Code | Change |
|--------------|--------|
| `tokens.json` v2.0 (yellow primary) | v2.1 (sage primary, warm stone, hard shadows) |
| Mobile pinwheel-less branding | Pinwheel mark, app icon, splash |
| Every screen referencing old palette | Re-rendered against v2.1 (most pickups automatic via generated tokens; layout-level revamp in 4-R) |
| `PermissionsModal` (post-login) | Replaced by `OnboardingPermissionsScreen` (pre-app, per-permission justification) |
| LoginScreen using native Alert on auth-fail | Uses NBToast (AS-3 spec) |
| No forgot-password UX | Informational "contact admin" screen (AS-4) + forced change after admin reset (AS-5) |
| `EventsGateway.emitToUser()` (in-memory) | Refactored to room-based emit (Redis adapter fan-out) |
| `MonitoringCacheService` in-memory loader | Redis-cached with TTL |
| `ShiftsService` (>400 lines) | Extract `BoundaryCheckService` |
| `UsersService.create()` (3 concerns) | Extract `UserValidationService` |
| `EventsGateway.handleConnection()` (80+ lines) | Extract `RoomJoinService` |
| `syncManager.ts` (4 action types) | Expand to 7+ action types (overtime-start/end, task-completion, reassignment) |
| Global rate limit (100 req/min) only | Per-endpoint limits (file upload 10/min, export 5/min) |
| JWT 7-day expiry, no refresh | Refresh-token rotation with Redis blacklist |
| `console.log` throughout | Replaced with structured Logger |

---

## 10. File references

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview (this file) | [View](./README.md) |
| **STATUS.md** | Implementation tracking | [View](./STATUS.md) |
| **status_progress.md** | Running changelog (NEW — Phase 3 parity) | [View](./status_progress.md) |
| **status_reviews.md** | Expert review + gap audit + revamp acceptance | [View](./status_reviews.md) |
| **status_deployment_checklist.md** | Deployment + rebrand cutover | [View](./status_deployment_checklist.md) |
| **backend.md** | Backend endpoints, services, cron, BullMQ | [View](./backend.md) |
| **mobile.md** | Mobile screens, **revamp matrix**, sync, FCM | [View](./mobile.md) |
| **web.md** | Web pages, **revamp matrix**, PWA polish | [View](./web.md) |
| **database.md** | Schema changes, migrations, indexes | [View](./database.md) |
| **infrastructure.md** | Sentry, BullMQ on Redis, CI/CD | [View](./infrastructure.md) |
| **testing.md** | Maestro + Playwright (incl. WL/AS/OB) | [View](./testing.md) |
| **ui-ux.md** | Hi-fi screen matrix, **brand & illustrations** | [View](./ui-ux.md) |
| **manual-testing.md** | Per-screen manual checklist (incl. hi-fi pass) | [View](./manual-testing.md) |
| **Design bundle** | Hi-fi + chats + illustrations | [`design/`](../../../design/) |
| **ADR-016** | Redis for WebSocket scaling | [View](../../architecture/decisions/ADR-016-redis-websocket-scaling.md) |
| **ADR-017** | Maestro mobile E2E | [View](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md) |
| **ADR-018** | Export format strategy | [View](../../architecture/decisions/ADR-018-export-format-strategy.md) |
| **ADR-019** | Offline connectivity model | [View](../../architecture/decisions/ADR-019-offline-connectivity-model.md) |
| **ADR-040** *(NEW)* | Design System v2.1 — sage primary | [View](../../architecture/decisions/ADR-040-design-system-v2.1.md) |
| **ADR-041** *(NEW)* | Forgot-password = contact admin | [View](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md) |
| **ADR-042** *(NEW)* | Onboarding flow (carousel + permissions + area preview) | [View](../../architecture/decisions/ADR-042-onboarding-flow.md) |
| **ADR-043** *(NEW)* | Production gap-closure decisions | [View](../../architecture/decisions/ADR-043-production-gap-closure.md) |

---

**Last Updated:** 2026-05-22
