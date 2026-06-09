# Phase 4: Production Readiness, Rebrand & UI/UX Revamp — Implementation Status

**Status:** 🔵 In Progress — M3a+b entry flow shipped May 24; M1+M2 checkpoint May 25; M3 Home revamp Checkpoint 1 (shared chrome + role-aware dispatcher) shipped May 25, 2026
**Last Updated:** June 9, 2026 (**4-3 Push Notification feature-complete on the backend** — per-type preferences + enforcement, shift-reminder + 24h-offline crons, missing-worker hardening [+kepala_rayon, sweeper notify, dedup], activity-tag, mobile prefs screen; **4-R mobile rebrand residue cleared** — tagline → Kinerja, legacy `theme.ts` removed, `AvailabilityCalendar` raw `<Text>`→NBText. Prior Jun 6: M3 Monitoring revamp MON-1/2/3/4. See [`status_progress.md`](./status_progress.md) for the authoritative shipped trail)
**Overall Progress:** ~50% (M1: 4-0 + 4-1 · M2: 4-2 + 4-3 + 4-7 + Sentry + BullMQ + coverage · M3a+b: entry-flow gates + ADRs 040-042 Accepted + pre-existing lint/typecheck clear)
**Branch:** main (M1 + M2 + M3a+b committed in-tree pending PR)
**Related ADRs:** [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-017](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md), [ADR-018](../../architecture/decisions/ADR-018-export-format-strategy.md), [ADR-019](../../architecture/decisions/ADR-019-offline-connectivity-model.md), **NEW** [ADR-040](../../architecture/decisions/ADR-040-design-system-v2.1.md), [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md), [ADR-042](../../architecture/decisions/ADR-042-onboarding-flow.md), [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md)

---

## Specification Reviews

| Item | Detail |
|------|--------|
| **Initial review** | March 12, 2026 — System Architect / DB Engineer / Backend Developer; 9 CRITICAL / 15 HIGH / 20 MEDIUM / 16 LOW (all addressed) |
| **Revamp re-baseline** | May 22, 2026 — adds rebrand + UI/UX revamp (Design System v2.1) + production-readiness gap audit (4-V); trims work already shipped in Phase 3 (FCM activation, Redis adapter, web PWA, generated tokens) |
| **New documents** | `status_progress.md` (NEW), `design/` vendored bundle |
| **Revised effort** | **67-87 developer-days** (was 52-68) — sum: 4-0 (3-4) + 4-R (15-18) + 4-V (4-5) + 4-1 (2-3) + 4-2 (4-6) + 4-3 (3-5) + 4-4 (3-4) + 4-5 (5-7) + 4-6 (4-5) + 4-7 (12-15) + 4-8 (3-4) + 4-9 (7-8) + 4-10 (2-3) = **67 low / 87 high** |

---

## Document Structure

### Specification Documents

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview, requirements, sub-phases | [View](./README.md) |
| **backend.md** | Backend endpoints, services, cron jobs | [View](./backend.md) |
| **mobile.md** | Mobile screens, offline sync, FCM | [View](./mobile.md) |
| **web.md** | Web pages, PWA, SEO, export/import UI | [View](./web.md) |
| **database.md** | Schema changes, migrations, indexes | [View](./database.md) |
| **infrastructure.md** | Redis, Docker, Sentry, CI/CD | [View](./infrastructure.md) |
| **testing.md** | Maestro + Playwright E2E specs | [View](./testing.md) |
| **ui-ux.md** | NB audit, empty states, animations | [View](./ui-ux.md) |
| **manual-testing.md** | Manual testing checklist | [View](./manual-testing.md) |

### Status Documents

| Document | Purpose | Link |
|----------|---------|------|
| **STATUS.md** | Implementation status & progress (this file) | [View](./STATUS.md) |
| **status_reviews.md** | Expert specification review findings & resolution | [View](./status_reviews.md) |
| **status_deployment_checklist.md** | Deployment procedures & testing checklist | [View](./status_deployment_checklist.md) |

---

## Overall Progress

> **Reconciliation note (May 25, 2026):** the per-task counts in the grid below are the original *planning* breakdown. They lagged reality — M1, M2 and M3a–d have shipped slices since. The **authoritative "what shipped when" trail is [`status_progress.md`](./status_progress.md)**; the `Milestone` column here maps each sub-phase to the milestone that delivered (or will deliver) it. Per-task tables further down are being reconciled milestone-by-milestone; M1+M2 rows are reconciled, M3+ rows still reflect the original plan.

| Sub-Phase | Name | Milestone | Status |
|-----------|------|-----------|--------|
| **4-0** | **Design Bundle Adoption + Token Re-baseline** | M1 + (4-0 reconciled to design/ May 25) | 🟡 Token pipeline ✅ v2.1.1 (sage + hard-edge + 5-status + 9 role + lilac, matched to `design/`); brand-asset integration (icons/splash/illustrations B1-B6) ⏳ |
| **4-R** | **UI/UX Revamp Sweep (mobile + web)** | M3a–d | 🟡 Mobile entry-flow ✅ + Home **role-aware anchor complete for ALL 9 roles** (shared masthead + tab bar + dispatcher; HOME-1 Field, HOME-2 Coordinator, HOME-3 Admin Data, + net-new Exec city-overview [top_mgmt/admin_sys/superadmin] + Kecamatan "my requests") ✅ + critical stale-`tokens.js` fix (v2.1 renders app-wide) ✅; Absensi/Tugas/Aktivitas/Lembur/Profile ✅; **Monitoring ✅ (M3: MON-1/2/3/4 — two-axis presence, activity chips, Lokasi filter, search modal + marker callout, BoundaryDetailModal on NBModal)**; **Perantingan ✅ (PRT CP1–CP5)**; **Notif prefs screen ✅ (Jun 9)**; **mobile rebrand residue cleared (Jun 9 — tagline → Kinerja, legacy `theme.ts` removed, `AvailabilityCalendar` raw `<Text>`→NBText)**; web revamp ⏳; brand assets (onboarding SVGs + PWA manifest) ⏳ |
| **4-V** | **Production-Readiness Gap Audit** | post-M3 | ⏳ Not started |
| 4-1 | Infrastructure & Evaluation (trimmed) | M1 | 🟡 Health module (`/live`,`/ready`+real 503) ✅; Sentry + BullMQ scaffolding ✅; structured-logging/tracing items ⏳ |
| 4-2 | Offline Sync Completion | M2 | 🟢 3-state connectivity + banner + queue expansion ✅ (staging field-test = 4-V) |
| 4-3 | Push Notification — Hardening | M2 + (completed Jun 9) | 🟢 **Feature-complete (Jun 9):** 8 FCM triggers + `fcm-retry` BullMQ + activity-tag (ADR-038); per-type **notification preferences** (table + GET/PATCH + `sendToUser` enforcement) + mobile prefs screen; **shift-reminder cron** (§C3, Redis-deduped) + **24h→offline cron** (§C4); **missing-worker hardening** (§C1 #8 — +kepala_rayon + sweeper notify + dedup). Remaining: staging e2e (4-V), web bell/panel (4-R web) |
| 4-4 | Worker Reassignment Workflow | — | ⏳ Not started |
| 4-5 | Export & Import Data | — | ⏳ Not started |
| 4-6 | Real Data Seeder & Data Management | — | ⏳ Not started |
| 4-7 | Refactor, Optimization & Security | M2 (partial) | 🟡 JWT refresh rotation + Redis blacklist + **strategy-level revocation enforcement (May 25)** ✅; remaining refactor/optimization/security items ⏳ |
| 4-8 | Mobile & Web Production Hardening (trimmed) | — | ⏳ Not started |
| 4-9 | E2E Testing | M3d (deferred) | ⏳ Maestro flows not started |
| 4-10 | Documentation Sync | ongoing | 🟡 Partial (this checkpoint syncs STATUS + design-tokens + COMPLETION_STATUS) |

### Sub-Phase 4-0: Design Bundle Adoption + Token Re-baseline 🟡 TOKEN PIPELINE COMPLETE (brand assets pending)

| Task | Status | Notes |
|------|--------|-------|
| A1. Vendor `design/` bundle | ✅ | Done May 22 — 224 KB from Claude Design |
| A2. Regenerate `specs/ui-ux/tokens.json` from `hifi-shared.css` | ✅ | M1 baseline (v2.1.0) + **May 25 fidelity reconciliation to v2.1.1**: radius/shadow/border matched to `hifi-shared.css`, 9 role accents + `accent.lilac` added |
| A3. Update `specs/ui-ux/design-tokens.md` v2.1 note | ✅ | v2.1 + §v2.1.1 reconciliation appendix |
| A4. Run `npm run tokens:build` | ✅ | Regenerated web `tokens.css` + mobile `tokens.ts`; `tokens:verify` clean; `test:tokens` 40/40 |
| A5. Visual diff snapshot | ⏳ | Story-driven, key NB primitives (deferred to a visual-regression sub-phase) |
| B1. Extract pinwheel SVG to brand assets | ⏳ | Mobile + web `brand/sekar-mark.svg` |
| B2. Replace app icon (iOS + Android) | ⏳ | iOS AppIcon, Android adaptive icon |
| B3. Replace splash screen (light/dark/green) | ⏳ | iOS LaunchScreen, Android splash |
| B4. Ship 6 empty-state SVG illustrations | ⏳ | illo-reports/shifts/offline/location/search/personnel |
| B5. Ship 3 onboarding scene SVGs | ⏳ | onb-clockin/photo/monitor |
| B6. PWA manifest theme/icon update | ⏳ | `theme_color: #7FBC8C`, maskable pinwheel |
| C1. Token-compliance ESLint sweep | ⏳ | Fix repo-wide violations |

### Sub-Phase 4-R: UI/UX Revamp Sweep ⏳ NOT STARTED

See [`status_reviews.md` § Revamp Acceptance Checklist](./status_reviews.md#revamp-acceptance-checklist) for the 50-row screen-by-screen sign-off table (WL-1…NOTIF-1 + LOG-1…KEC-1).

### Sub-Phase 4-V: Production-Readiness Gap Audit ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| G1. Offline sync — staging field-test | ⏳ | Verdict in `status_reviews.md` Gap 1 |
| G2. Push notifications — end-to-end on staging | ⏳ | Verdict in Gap 2 |
| G3. Background location — platform audit | ⏳ | Verdict in Gap 3 |
| G4. Broker decision (BullMQ vs no-broker) | ⏳ | Verdict in Gap 4 + ADR-043 |
| G5. Cross-gap synthesis | ⏳ | Final decision matrix in `status_reviews.md` |

---

## Implementation Progress

### Sub-Phase 4-1: Infrastructure & Evaluation ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. WebSocket connection stability audit | ⏳ | |
| A2. Redis adoption decision (ADR-016) | ⏳ | |
| A3. Docker Compose update (redis:7-alpine) | ⏳ | |
| B1. Structured logging setup | ⏳ | |
| B2. Request tracing middleware (X-Request-ID) | ⏳ | |
| B3. Sentry integration (backend) | ⏳ | |
| B4. Sentry integration (mobile) | ⏳ | |
| B5. Slow query interceptor | ⏳ | |
| C1. Health module (GET /health, GET /health/full) | ⏳ | |
| C2. Redis service setup | ⏳ | |

### Sub-Phase 4-2: Offline Sync Completion ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. ConnectivityStatus enum (ADR-019) | ⏳ | |
| A2. Network/server detection | ⏳ | |
| A3. Heartbeat polling (GET /health every 30s) | ⏳ | |
| B1. Queue expansion — overtime-start/end | ⏳ | |
| B2. Queue expansion — task-completion | ⏳ | |
| B3. Queue expansion — reassignment | ⏳ | |
| C1. Connectivity UI banners (yellow/orange) | ⏳ | |
| C2. Timezone verification (Asia/Jakarta) | ⏳ | |
| C3. Conflict resolution (server-wins) | ⏳ | |

### Sub-Phase 4-3: Push Notification Activation ✅ COMPLETE (Jun 9, 2026)

> Reconciled Jun 9: the original per-task table below predates the M2 + Jun-9 work. Actual state: **A1 (8 triggers) ✅, B1 (shift-reminder cron) ✅, B2 (stale/24h-offline cron) ✅, C1/C2 (preferences entity + CRUD) ✅, D1/D2/D3 (mobile token reg + foreground + NotificationsScreen) ✅, E3 (mobile preferences screen) ✅**. Remaining: E1/E2 web bell + `/dashboard/notifications` (tracked under 4-R web). Authoritative trail: [`status_progress.md`](./status_progress.md) Jun 9 entry.

| Task | Status | Notes |
|------|--------|-------|
| A1. Wire FCM triggers — 8 trigger points | ⏳ | |
| B1. Shift reminder cron (15min before) | ⏳ | |
| B2. Stale status cleanup cron | ⏳ | |
| C1. notification_preferences entity | ⏳ | |
| C2. Notification preferences CRUD endpoints | ⏳ | |
| D1. Mobile FCM token registration | ⏳ | |
| D2. Mobile foreground notification handling | ⏳ | |
| D3. Mobile NotificationsScreen (22nd screen) | ⏳ | |
| E1. Web notification bell component | ⏳ | |
| E2. Web /dashboard/notifications page | ⏳ | |
| E3. Mobile notification preferences screen | ⏳ | |

### Sub-Phase 4-4: Worker Reassignment Workflow ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. Verify ReassignWorkerModal (existing untracked) | ⏳ | |
| A2. Mobile confirmation step | ⏳ | |
| A3. Offline queue support for reassignment | ⏳ | |
| A4. Reassignment history in UserDetailSheet | ⏳ | |
| B1. Web bulk reassignment modal | ⏳ | |
| B2. Web area capacity indicator | ⏳ | |
| C1. Audit trail coverage for reassignment | ⏳ | |
| C2. Audit trail completeness check | ⏳ | |

### Sub-Phase 4-5: Export & Import Data ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. ExportModule scaffold | ⏳ | |
| A2. CSV/Excel export via exceljs (ADR-018) | ⏳ | |
| A3. Export endpoint (POST /export) | ⏳ | |
| A4. Async export_jobs table | ⏳ | |
| A5. 7 entity type exporters | ⏳ | |
| B1. CSV import endpoints (users, areas) | ⏳ | |
| C1. Web KMZ import page (/dashboard/import) | ⏳ | |
| C2. Web export page (/dashboard/export) | ⏳ | |
| C3. Web CSV import page (/dashboard/import/csv) | ⏳ | |

### Sub-Phase 4-6: Real Data Seeder & Data Management ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. Production seeder (7 real rayons) | ⏳ | |
| A2. CSV template parser utility | ⏳ | |
| B1. Location log retention cron (90-day) | ⏳ | |
| B2. Soft-delete cleanup cron (180-day) | ⏳ | |
| B3. Daily attendance summary cron | ⏳ | |
| C1. Database index audit + migration | ⏳ | |
| C2. Pagination standardization (all findAll) | ⏳ | |

### Sub-Phase 4-7: Refactor, Optimization & Security ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. Extract BoundaryCheckService from ShiftsService | ⏳ | |
| A2. Extract UserValidationService from UsersService | ⏳ | |
| A3. Extract RoomJoinService from EventsGateway | ⏳ | |
| A4. Five-lines-of-code audit | ⏳ | |
| B1. N+1 query audit (Tasks, Activities, Overtime) | ⏳ | |
| B2. QueryBuilder joins for identified patterns | ⏳ | |
| C1. Redis caching (monitoring, staffing, role) | ⏳ | |
| C2. JwtStrategy role cache | ⏳ | |
| D1. Per-endpoint rate limiting | ⏳ | |
| D2. JWT refresh token rotation | ⏳ | |
| D3. Input sanitization audit | ⏳ | |
| D4. CORS tightening (production domains) | ⏳ | |
| D5. Helmet.js headers | ⏳ | |
| E1. Timezone consistency audit | ⏳ | |
| E2. Date format standardization (DD/MM/YYYY) | ⏳ | |
| F1. Mobile optimization (React.memo, FlatList) | ⏳ | |
| G1. Web optimization (Core Web Vitals, SSG, lazy load) | ⏳ | |

### Sub-Phase 4-8: UI/UX Polish & Production Readiness ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. NB compliance audit — 22 mobile screens | ⏳ | |
| A2. NB compliance audit — 24+ web pages | ⏳ | |
| B1. Web NBEmptyState (9 variants) | ⏳ | |
| B2. Web NBSkeleton components | ⏳ | |
| B3. Mobile ErrorBoundary per screen | ⏳ | |
| B4. Web error.tsx per route segment | ⏳ | |
| C1. Mobile screen transitions | ⏳ | |
| C2. Button press animation (scale 0.97) | ⏳ | |
| C3. List staggered fade-in | ⏳ | |
| C4. Web modal/toast animations | ⏳ | |
| D1. Accessibility gaps (aria-labels, focus traps) | ⏳ | |
| E1. ProGuard/R8 config + Sentry + deep linking | ⏳ | |
| E2. Splash screen optimization (<2s) | ⏳ | |
| F1. SEO + PWA + bundle analysis + Next/Image | ⏳ | |

### Sub-Phase 4-9: E2E Testing ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. Maestro setup (ADR-017) | ⏳ | |
| A2. 15+ Maestro flows | ⏳ | |
| B1. Expand Playwright specs (20+ total) | ⏳ | |
| C1. CI integration (Maestro + Playwright) | ⏳ | |
| D1. Security E2E tests | ⏳ | |

### Sub-Phase 4-10: Documentation Sync ⏳ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| A1. Update COMPLETION_STATUS.md | ⏳ | |
| A2. Role name corrections across all specs | ⏳ | |
| A3. Screen/page count updates | ⏳ | |
| B1. ADR index update (ADR-012 through ADR-019) | ⏳ | |
| B2. specs/README.md update | ⏳ | |
| B3. phases/README.md update | ⏳ | |
| C1. API contracts.md update | ⏳ | |
| C2. Database schema.md update | ⏳ | |
| C3. Stale reference cleanup | ⏳ | |
| C4. Update system-overview.md for Phase 4 | ⏳ | Redis, Sentry, export module, health endpoints |

---

## Definition of Done

Per-sub-phase acceptance criteria. A sub-phase is considered complete only when all criteria are met.

| Sub-Phase | Acceptance Criteria |
|-----------|-------------------|
| **4-1 Infrastructure** | Redis connected and responding to `PING`; `/health` and `/health/full` endpoints return 200; Sentry receiving test events in staging project; structured JSON logs verified in stdout; `X-Request-ID` header present in all API responses |
| **4-2 Offline Sync** | `ConnectivityService` correctly detects all 3 states (online / no-internet / server-unreachable); offline queue persists across full app restart; queue flush succeeds and syncs all queued actions on reconnect; yellow and orange UI banners display correct state |
| **4-3 Push Notifications** | FCM tokens registered on login for all tested devices; all 8 notification trigger types fire correctly in integration tests; notification preferences toggle works and suppresses the correct push type; `NotificationsScreen` displays list with filtering by type |
| **4-4 Worker Reassignment** | `ReassignWorkerModal` flow completes end-to-end (confirm → API → WebSocket update); offline queue covers reassignment actions; reassignment event logged in audit trail; web bulk reassignment modal tested with ≥2 workers |
| **4-5 Export & Import** | CSV and Excel exports download with correct data and column headers; async export job polling resolves before timeout; KMZ import preview renders polygons correctly; CSV import validation catches missing required columns and duplicate identifiers |
| **4-6 Real Data Seeder** | Production seeder populates all 7 rayon names and boundaries without errors; location log retention cron deletes records older than 90 days in test run; soft-delete cleanup cron removes records older than 180 days; database index migration applied without downtime |
| **4-7 Refactor & Security** | No N+1 queries detected on Tasks, Activities, Overtime list endpoints under load test; Redis cache hit ratio >70% for monitoring endpoints; per-endpoint rate limits verified via integration test; Helmet headers present on all responses |
| **4-8 UI/UX Polish** | All 22 mobile screens pass NB compliance audit (border-width 2px, shadows correct, touch targets ≥48px); all 24 web pages pass NB audit; focus traps work correctly in all modals; all WCAG 2.1 AA aria-label gaps resolved |
| **4-9 E2E Testing** | 15+ Maestro flows pass on physical Android device; 20+ Playwright specs pass in CI; security E2E tests (auth bypass, IDOR) all return expected 401/403 responses |
| **4-10 Documentation** | `COMPLETION_STATUS.md` reflects Phase 4 metrics; all stale role references removed from specs; API contracts updated for new endpoints; ADR index updated through ADR-019 |

---

## Test Coverage

| Component | Before Phase 4 | After Phase 4 Target | Notes |
|-----------|----------------|---------------------|-------|
| Backend | 1,264 tests (94.51% stmts) | >1,500 tests (>90%) | +ExportModule, +HealthModule, +cron jobs |
| Mobile | 3,669+ tests (80.31%) | >4,000 tests (>80%) | +NotificationsScreen, +offline sync |
| Web Unit | 505+ tests (96%) | >550 tests (>90%) | +import/export/notification pages |
| Web E2E | 8 Playwright specs | 20+ Playwright specs | +12 new scenarios |
| Mobile E2E | 0 | 15+ Maestro flows | New infrastructure |

---

## Blockers

None currently — Phase 3 completion is the prerequisite. Phase 4 inherits Redis 7 stack (installed in Phase 3 sub-phase 3-3), unified design tokens + brand fonts (Phase 3 M1-R 3-R2), web PWA shell + mobile-web responsive layouts (Phase 3 M1-R 3-R4), and the full screen-level redesign sweep (Phase 3 M1-R 3-R5). The web-PWA item (#17) and design-system parts of UI/UX polish (#12) collapse to "verify and polish" rather than "implement".

---

## Pending Architecture Decisions

The following ADRs are candidates for creation during Phase 4. They should be drafted when each respective sub-phase begins:

- **ADR-020** — Sentry Error Reporting Configuration (draft at start of sub-phase 4-1)
- **ADR-021** — Structured Logging & Request Tracing (draft at start of sub-phase 4-1)
- **ADR-022** — FCM Notification Deduplication (draft at start of sub-phase 4-3)
- **ADR-023** — Data Retention Policies (draft at start of sub-phase 4-6)

---

## Stakeholder Sign-off Required

**TODO (Stakeholder):** Production seeder data (7 rayon names, area boundaries, realistic task templates) requires sign-off from DLH Surabaya before sub-phase 4-6 begins.

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-12 | Complete rewrite from outdated Jan 2026 stubs to comprehensive 10-sub-phase production readiness spec |
| 2026-03-12 | Expert architectural review: revised effort to 52-68 days, added dependency notes, fixed export endpoint, added review section |
