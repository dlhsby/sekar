# Phase 4: Production Readiness — Running Progress Log

Chronological changelog for Phase 4 work. Mirrors the Phase 3 STATUS.md pattern: most recent entry first, dated, prefixed by sub-phase. **Implementation entries land here as work happens** — this file is the canonical "what shipped when" trail for Phase 4, separate from the static `STATUS.md` grid.

---

## May 22, 2026 (late) — In-app inbox + offline-screen matrix follow-ups

Same-session follow-up after the re-baseline below. Two user-requested additions:

1. **In-app notification list, Instagram/Twitter/Facebook-style** — bell icon with badge in every authenticated header (mobile + web), inbox on tap, deep-link to entity on row tap. Stays in sync with FCM push (every push writes to the `notifications` table; foreground push is suppressed at the OS level so only the in-app NBToast + badge surface). Detailed visual + behavior specs added to [`mobile.md § B6/B7/B8`](./mobile.md#b6-in-app-notification-bell--badge-instagram--twitter--facebook-pattern) and [`web.md § D3/D4/D5`](./web.md#d3-bell-visual-spec-token-compliant). Backend gains `A5 backend-writes-every-push` + `A6 unread-count endpoint`; mobile gains `B2 NotificationBell + B3 deepLinkRouter + B4 FCM foreground-suppression`; web gains `C1 web bell + C2 BroadcastChannel cross-tab sync`. **All tokens come from v2.1** (no hex literals — badge uses `--danger`, primary active state uses `--primary`, etc.).

2. **Offline / server-unreachable improved differentiation** — ConnectivityBanner restyled to v2.1 tokens (was using hex literals; now uses `--warning-bg/-fg` and `--danger-bg/-fg`). New [`mobile.md § A5 Offline behavior matrix`](./mobile.md#a5-offline-behavior-matrix--per-screen-behavior-by-connectivity-state) enumerates every mobile screen with one of three verdicts (Works offline / Read-only offline / Unavailable), each with explicit NO_INTERNET and SERVER_UNREACHABLE behavior. Same matrix mirrored at [`web.md § D-OFFLINE`](./web.md#d-offline-web-offline-behavior-matrix). New shared `OfflineScreen` component (illo-offline illustration + "Anda offline" + retry + status-specific subtitle) replaces generic error fallbacks on the "Unavailable" screens.

**Effort bump:** 4-2 (Offline) 4-5 → **4-6 d**; 4-3 (Push) 3-4 → **3-5 d**. Total Phase 4 revised from 67-85 d to **67-87 d**. Sub-phase count unchanged at 13.

**ADR impact:** ADR-019 (Two-Tier Offline Connectivity Model, Accepted Mar 12) gains a `§ Per-Screen Offline Matrix` appendix referencing `mobile.md § A5` — the ADR's decision stands; the matrix is implementation detail. No new ADR needed for the bell + badge (it's a UX pattern, not an architectural decision).

---

## May 22, 2026 — Phase 4 re-baseline + rebrand spec

**Trigger:** User iterated a complete SEKAR rebrand on Claude Design and vendored the 224 KB handoff bundle to `design/`. Spec needed a refresh because (a) the new Design System v2.1 changes the primary palette (yellow → sage green `#7FBC8C`) and (b) Phase 3 quietly shipped large chunks of the original March-12 Phase 4 scope (FCM activation, Redis adapter, web PWA, generated tokens, NB primitives).

**What landed in this spec pass (no app code changes):**

1. **Design bundle vendored** to `design/` — `README.md`, 4 chat transcripts (where intent lives, per bundle README), and 10 project files (`design-system.html`, `hifi-mobile.html` with 39 screens, `hifi-web.html` with 11 frames, `illustrations.html`, `hifi-shared.css` canonical token export, wireframes, etc.). Embedded spec copies inside the bundle were dropped (`design/project/sekar`, `design/project/specs`) — the canonical specs live at `specs/`.
2. **README.md fully rewritten.** Added Phase-3 reality-check table (FCM live, Redis adapter live, PWA shipped, generated tokens live), new sub-phase grid (4-0 / 4-R / 4-V → 13 sub-phases total), revised effort **67-85 d** (was 52-68 d; first pass mistakenly stated 63-79 d before re-summing per-sub-phase numbers — corrected May 22 in same session).
3. **STATUS.md expanded** with the three new sub-phases — task tables for 4-0 (12 tasks) and 4-V (5 tasks); 4-R sign-off lives in `status_reviews.md`.
4. **status_progress.md** created (this file) — Phase 3 parity.
5. **ui-ux.md replaced** with a hi-fi-driven revamp doc: per-screen revamp matrix (39 mobile + 11 web), brand & illustrations section pointing at `design/project/illustrations.html`, token diff against v2.0, accessibility floor per role-color (WCAG 2.1 AA contrast on every status / role pill).
6. **mobile.md extended** with §UI/UX Revamp — the screen matrix maps every hi-fi ID (WL-1…NOTIF-1) to a current code file with `NEW` / `Revamp` / `Token-only` action. 7 NEW screens identified (WelcomeCarouselScreen, ForgotPasswordScreen, ChangePasswordScreen, OnboardingWelcomeScreen, OnboardingPermissionsScreen, OnboardingAreaPreviewScreen, NotificationsScreen).
7. **web.md extended** with §UI/UX Revamp — 11 hi-fi frames mapped to 13 existing routes; new `(auth)/forgot-password` informational page + `(dashboard)/notifications` page.
8. **backend.md extended** — `password_must_change` boolean column on `users` (drives AS-5 forced change flow); BullMQ on existing Redis for FCM retry / async exports; trimmed FCM-activation tasks (already live).
9. **infrastructure.md extended** — BullMQ on existing Redis (no new infra), Sentry release tag pegged to rebrand version.
10. **testing.md extended** — Maestro flows for WL-1…WL-5 carousel, AS-1…AS-5 auth + forgot-password, OB-1…OB-3 onboarding + permissions.
11. **status_reviews.md extended** — Gap Audit template (Gaps 1-4 = offline / push / background-location / broker) + Revamp Acceptance Checklist (50-row screen-by-screen sign-off).
12. **status_deployment_checklist.md extended** — rebrand cutover items: app-store icon resubmission, splash assets verified, PWA manifest theme color, Sentry release tag pegged to brand version.
13. **manual-testing.md extended** — hi-fi-driven per-screen manual test cases (entry-flow walkthrough, role-aware home walks, monitoring tools FAB).
14. **4 new ADRs drafted** as Proposed: ADR-040 (Design System v2.1), ADR-041 (Forgot-password contact-admin), ADR-042 (Onboarding flow), ADR-043 (Production gap-closure).
15. **Cross-spec sync edits:** `specs/COMPLETION_STATUS.md`, `specs/ui-ux/design-tokens.md`, `specs/phases/README.md`, `specs/phases/DEPENDENCY_MATRIX.md`, `specs/architecture/decisions/README.md` updated.

**Reality-check findings (drove the trim):**

- `FCM_ENABLED=true` is already in `be/.env` and `be/.env.example` — FCM is live in production (May 16-17 commits confirmed via `git log`: `fix(fcm)`, `fba6d5b review(notifications)`). Original spec assumption stale.
- `@socket.io/redis-adapter` already wired in `be/src/gateways/events.gateway.ts:93` — Redis adapter shipped in Phase 3.
- `fe/web/src/app/offline/page.tsx` and `install-help/page.tsx` exist — PWA shipped in Phase 3 sub-phase 3-R4.
- `fe/mobile/src/services/sync/offlineQueue.ts` + `syncManager.ts` present — queue-type inventory deferred to 4-V Gap 1 audit.
- `fe/mobile/src/services/location/locationTracker.ts` present — Android foreground service + iOS background mode wiring is the unverified bit (4-V Gap 3).
- `ioredis` + `@socket.io/redis-adapter` are the only broker-shaped deps. No BullMQ, no AMQP, no Kafka. "Message broker" question reframed in 4-V Gap 4: do we need a job queue (BullMQ on existing Redis) for FCM retries, exports, cron-driven aggregations?

**Spec-only pass — no app code, no migrations, no token regen.** Those land in 4-0 / 4-R / 4-V when Phase 4 executes.

---

## March 12, 2026 — Initial Phase 4 specification

Original specification authored by System Architect / DB Engineer / Backend Developer. 60 review findings (9 CRITICAL / 15 HIGH / 20 MEDIUM / 16 LOW) addressed; full record in `status_reviews.md § Pre-Implementation Specification Review (Mar 12, 2026)`.

Original effort estimate 44-57 d, revised to 52-68 d after review. Re-revised to **67-85 d** in May 22 pass (this file) after adding 4-0 / 4-R / 4-V and re-summing per-sub-phase numbers.
