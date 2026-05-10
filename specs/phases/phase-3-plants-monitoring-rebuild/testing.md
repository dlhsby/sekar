# Phase 3: Testing Plan

**Last Updated:** 2026-04-24
**Status:** ⏳ Not Started
**Coverage targets:** Backend new modules ≥ 85 % stmts; mobile ≥ 80 % overall and ≥ 85 % new files; web unit ≥ 80 %
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md)
**See also:** [Backend](./backend.md), [Infrastructure](./infrastructure.md), [README](./README.md), [Progress](./status_progress.md), [Reviews](./status_reviews.md)

---

## Scope

Phase 3 adds ~35 endpoints, 8 new tables, 4 new backend modules, 10+ new mobile screens, 7 new web pages, a Redis-backed projection pipeline, and the first formal load test in the project's history. Testing is structured across four layers:

1. **Unit tests** — pure functions, services with mocked deps
2. **Integration tests** — Nest TestModule + real Postgres + Redis-in-docker
3. **E2E tests** — Playwright (web), Maestro-planned (mobile, full coverage deferred to Phase 4)
4. **Load test** — k6 against a staging-like environment

---

## Backend Unit Tests

| Module | Target | Key test files |
|--------|--------|----------------|
| `StatusProjectorService` | ≥ 88 % | projector consumes stream, eager-loads context once, writes status, emits events, acks correctly; idempotent on `(user_id, ts)` |
| `StaffingDebouncerService` | ≥ 90 % | collapses bursts within window; emits at window close; separate timers per area |
| `StaleStatusSweeperService` | ≥ 90 % | batch 50; flips ACTIVE without recent ping → MISSING; does not flip users in OFFLINE/INACTIVE |
| `TaskTypeRegistry` | 100 % | per-type Zod schema registration and validation; reject unknown `task_type` |
| `PlantDueDateService` | 100 % | cycle-days lookup precedence (override > species > area_type default); status color thresholds |
| `PruningRequestService` | ≥ 88 % | state machine: submitted → under_review → approved/rejected → assigned; rayon scoping; **approve guard requires `scheduled_date`** (May 10); **reschedule cascade for `assigned` status** rebooks capacity + bumps `task.deadline` + writes delegation audit + pushes assignee (May 10) |
| `CapacityService` | ≥ 85 % | booking increments; cancel rebalances; week-grid fetch; UNIQUE constraint handled gracefully |
| `SeedTransactionService` | ≥ 90 % | balance arithmetic (purchase +, distribution -, adjustment +/-); atomic update with insert |
| `RedisService` | ≥ 80 % | connection pool; graceful shutdown; stream helpers; fallback on unreachable |

---

## Backend Integration Tests

| File | Scenario |
|------|----------|
| `test/integration/monitoring-v2.e2e-spec.ts` | 10k location pings → stream → projector applies → all `user_tracking_status` rows updated; no missed status transitions |
| `test/integration/monitoring-v2-stale.e2e-spec.ts` | 5-min tick of `StaleStatusSweeperService` flips seeded ACTIVE rows → MISSING |
| `test/integration/task-partial-complete.e2e-spec.ts` | partial-complete → activity created → child task spawned → resume → final complete; lineage endpoint returns full tree |
| `test/integration/pruning-request-flow.e2e-spec.ts` | submit → review (as `admin_data`) → assign-to-task → activity completion propagates status back to request; capacity decremented on convert, rebalanced on task cancel |
| `test/integration/plants-forecast.e2e-spec.ts` | activity with plant_items updates `area_plants.last_pruned_at` and `next_due_at`; cron flips status appropriately |
| `test/integration/role-matrix.e2e-spec.ts` | Every controller × every role returns expected 200/201/403; `staff_kecamatan` denied outside own endpoints |
| `test/integration/csv-backfill.e2e-spec.ts` | Seeder runs twice on 10-row fixture without duplication (idempotent on `reference_code`) |
| `test/integration/migration-roundtrip.e2e-spec.ts` | Drop + re-run all migrations on scratch DB; seeds apply |

---

## Mobile Tests (Jest + RTL)

| File | Scope |
|------|-------|
| `__tests__/components/tasks/PruningTaskForm.test.tsx` | Dynamic fields render; species autocomplete narrows 131 → N; quantity validation; partial submit dispatches `activity.partial` queue action when offline |
| `__tests__/components/monitoring/ClusterMarker.test.tsx` | `tracksViewChanges={false}` assertion; key stability across cluster-count changes; snapshot includes count label |
| `__tests__/screens/monitoring/ClusterStability.test.tsx` | Render 500 mock users; zoom levels `[10, 12, 14, 16]`; assert `_requestLayout` spy called ≤ N times (no bitmap storm) |
| `__tests__/screens/pruningRequests/SubmitScreen.test.tsx` | Photo picker; GPS capture fallback; offline queue scaffold |
| `__tests__/screens/pruningRequests/ReviewQueueScreen.test.tsx` | Approve / reject / convert flows; capacity chip shows on convert |
| `__tests__/slices/pruningRequests.test.ts` | WS patch application per state-machine transition |
| `__tests__/slices/monitoringV2.test.ts` | `applyStatusPatch` is immutable and O(1) for single worker |
| `__tests__/components/home/LocationStatusCard.test.tsx` | (regression) Apr 24 fixes intact |

**Coverage rule:** Files under `src/components/monitoring/` have a **lint gate** forbidding `tracksViewChanges={true}` regardless of test coverage.

---

## Web Tests

| File | Framework | Scope |
|------|-----------|-------|
| `e2e/monitoring-realtime.spec.ts` | Playwright | Virtualized list updates < 200 ms after a mocked WS emit; cluster count updates on filter toggle; hierarchy filter reduces marker count |
| `e2e/pruning-request-flow.spec.ts` | Playwright | staff_kecamatan submit → admin_data review (role switch via token) → assign-to-task → task visible on `/tasks` |
| `e2e/pruning-task-assignment.spec.ts` | Playwright | Dynamic custom-fields form on `/tasks/new?task_type=pruning`; species search narrows 131 → ~5 |
| `e2e/capacity-calendar.spec.ts` | Playwright | Edit capacity_units; booked_bar updates after pruning-request convert |
| `e2e/seeds-ledger.spec.ts` | Playwright | Record purchase + distribution; balance equals (purchase sum − distribution sum) |
| `lib/monitoring/patch-reducers.test.ts` | Vitest | Pure reducer correctness |
| `components/capacity/WeekGrid.test.tsx` | Vitest | Edit + save cycle; booked bar overflow (> 100 %) shows warning |

Playwright fixtures provide seeded tokens for each of the 9 roles.

---

## Visual Regression Harness (M1-R sub-phase 3-R3)

Visual regression locks the look of every NB primitive and every swept screen. **Required-green** in CI on every PR after 3-R3 lands.

### Web — Playwright `toHaveScreenshot`

- File: `fe/web/e2e/visual-regression.spec.ts`
- Browsers: Chromium pinned (record version in `playwright.config.ts`); single-browser to avoid sub-pixel rendering noise across engines.
- Viewports: **375 × 667** (mobile web), **768 × 1024** (tablet), **1280 × 800** (desktop).
- Tolerance: `maxDiffPixelRatio: 0.001` (0.1 %).
- Baseline directory: `fe/web/e2e/__snapshots__/visual-regression.spec.ts/` — committed to git.
- CI job: `web-visreg` in `.github/workflows/ci.yml` runs after build; uploads diff artifacts on failure.
- Coverage at minimum: NBButton (default/hover/active/disabled/loading), NBCard (4 accent variants), NBBadge (5 status variants), Input (default/focus/error), `<NBText>` h1–caption rendering, `(auth)/login`, `(dashboard)/` home — and every page swept by 3-R5.

### Mobile — Jest `react-test-renderer` snapshots

- Files: `fe/mobile/__tests__/nb/<Component>.test.tsx` per primitive; `fe/mobile/__tests__/screens/<Screen>.test.tsx` for swept screens.
- Snapshot directory: `__snapshots__/` next to each test file — committed.
- CI job: `mobile-snapshots` runs `npm test -- --ci`; fails on snapshot diff.
- Coverage: every NB primitive (existing + NBModal/NBToast/NBText), plus a smoke snapshot per screen swept in 3-R5.

### Updating baselines

- A baseline change requires: (a) explicit author commit message containing `[visreg-update]`; (b) reviewer approval flagging the visual change; (c) screenshot comparison posted in the PR description.
- Drift caught later: revert and reopen, do not silently re-bless.

---

## Mobile-Web Responsive Testing (M1-R sub-phase 3-R4 / 3-R5)

Every web page must render correctly on three breakpoints. Mobile-web is **functional**, not a degraded experience.

- Playwright tests instantiate viewports 375 / 768 / 1280 px and run smoke flows (load page, open ☰ drawer at 375 px, expand icon rail at 768 px, verify sidebar at 1280 px).
- For pages with bottom-sheet filter UI (mobile web), tests verify the sheet opens, snaps to the documented snap points (10 / 45 / 90 %), and closes via the grabber drag-down.
- For role-gated install banners (`MobileInstallPush`), tests verify the banner renders for `satgas` / `linmas` / `korlap` at < 768 px login, and is hidden for admin roles or at ≥ 768 px.
- Lighthouse PWA audit runs on `/monitoring`; CI artifact stores the JSON report; PWA score < 90 fails the build.

---

## Load Test

See [infrastructure.md §k6](./infrastructure.md#k6-load-test-harness) for the harness.

**Environment:** Clone production DB (anonymized) to staging-like EC2; Redis + Postgres co-located with backend.

**Pass criteria (all must hold):**

- p95 `/api/v1/location/batch` request < 200 ms
- p95 `status:v2` broadcast latency < 500 ms (WS client → receipt)
- Postgres pool utilization < 70 % (max 10 of 15 connections in use)
- Redis stream consumer lag < 5 s at any point during the 30-min run
- Zero missed status transitions (sampled 100 workers cross-checked against DB `user_tracking_status` + WS event log)
- No errors in backend logs (excluding expected 401 from token refresh edge cases)

**Regression-fix budget:** Sub-phase 3-14 reserves 3 days; typical findings (indexes missed, debounce window too tight, Redis pool exhaustion) are fixed before sign-off.

---

## Manual QA Walkthrough

Phase 2D kept manual testing inside this file as a section rather than a separate doc. Phase 3 follows that pattern.

**Audience:** QA + product owner + rotating developer on-call.

### Pre-Conditions

**Test accounts** (seeded in `seed-phase3-test-users.ts`):

| Role | Username | Password | Rayon | Notes |
|------|----------|----------|-------|-------|
| `satgas` | `satgas1` | `password123` | Selatan | Assigned to Jalan Darmo Sec 1 R |
| `korlap` | `korlap1` | `password123` | Selatan | Supervises Darmo area |
| `admin_data` | `admin_data_selatan` | `password123` | Selatan | Pruning-request reviewer |
| `admin_data` | `admin_data_taman_aktif` | `password123` | Taman Aktif | Plant-seed manager |
| `kepala_rayon` | `kepala_selatan` | `password123` | Selatan | |
| `top_management` | `top1` | `password123` | — | City-wide view |
| `admin_system` | `admin_system` | `password123` | — | All access |
| `superadmin` | `admin` | `password123` | — | All access |
| `staff_kecamatan` | `kec_wonokromo` | `password123` | — | Kecamatan Wonokromo |
| `staff_kecamatan` | `kec_gubeng` | `password123` | — | Kecamatan Gubeng |

**Seeded data:**

- [ ] 131 plant species in `plant_species`
- [ ] `area_plants` seeded for Darmo Sec 1 R: 8 trembesi (`last_pruned_at = 90 days ago → overdue`), 2 sono (`ok`)
- [ ] 10 pruning requests across statuses (submitted, under_review, approved, assigned, done)
- [ ] 7 rayons × 12 weeks × `service_type='pruning'` capacity rows (`capacity_units=10`, `booked_units=0..4`)
- [ ] 50 plant_seeds + 200 seed_transactions at Rayon Taman Aktif
- [ ] `PHASE3_FEATURES_ENABLED=true` in test env
- [ ] Redis running; `/health/full` reports `redis: up`

### Flow 1 — Web monitoring v2 hierarchy + overlays (`top_management`)

- [ ] Log in to web
- [ ] Navigate to `/monitoring`
- [ ] Verify map loads with 7 rayons (city view)
- [ ] Click `Rayon Selatan` in filter panel → map auto-focuses
- [ ] Toggle "Tanaman" overlay → area polygons fill with plant-status color
- [ ] Toggle "Tanaman terlambat" → Darmo Sec 1 R shows red fill with "3 overdue" badge
- [ ] Zoom to < 14 → workers collapse into cluster bubbles
- [ ] Zoom to ≥ 14 → per-user markers appear
- [ ] Click a worker → side panel opens with shift info, WhatsApp link
- [ ] Force a WS status change (via backend helper) → list updates in < 200 ms without full refresh

**Pass criteria:** all checkboxes; no console errors; no full-page reloads in DevTools Network tab beyond the initial load.

### Flow 2 — Create pruning task on web (`korlap1`)

- [ ] Navigate to `/tasks/new?task_type=pruning`
- [ ] Select area: Jalan Darmo Sec 1 R
- [ ] Select maintenance type: PM
- [ ] Add species: Trembesi × 8, Sono × 2
- [ ] Set `target_plant_count = 10`
- [ ] Assign to `satgas1`
- [ ] Submit
- [ ] Verify task appears in `/tasks` with `task_type=pruning` badge
- [ ] Verify `satgas1` receives FCM (or WS toast fallback)

### Flow 3 — Mobile pruning + partial complete + resume (`satgas1` on Android)

- [ ] Open Tasks screen → see new pruning task
- [ ] Tap task → PruningTaskForm opens
- [ ] Mark 5 trembesi done; leave sono untouched
- [ ] Tap "Lanjutkan Besok" → confirm dialog → confirm
- [ ] Verify parent task shows `status=partial`, `completed_plant_count=5`
- [ ] Verify a child task exists with `parent_task_id = parent` and `target_plant_count = 5`
- [ ] Verify `area_plants.status` for trembesi at Darmo Sec 1 R flipped `overdue → due` (last_pruned_at updated)
- [ ] Refresh home; WS patches applied (no full reload)

Edge cases:
- [ ] Submit while offline → queued as `activity.partial`; sends on reconnect
- [ ] Submit when GPS is outside area boundary → activity still accepted (soft geofencing, ADR-005) with `outside_boundary=true`

### Flow 4 — Kecamatan → admin_data loop (`kec_wonokromo`, then `admin_data_selatan`)

As `kec_wonokromo`:
- [ ] Open mobile app → redirected to `SubmitScreen` (no bottom tab bar)
- [ ] Fill address "Jl Raya Wonokromo 123"
- [ ] Tap GPS capture
- [ ] Upload 3 photos
- [ ] Submit → see confirmation with `reference_code` (e.g., `KC-2026-0023`)
- [ ] Navigate to My Requests → request shows `submitted`

As `admin_data_selatan`:
- [ ] Open `/pruning-requests` on web (or ReviewQueueScreen on mobile)
- [ ] See the new request in queue
- [ ] Open detail → view photos
- [ ] Approve
- [ ] Open AssignToTaskDialog
- [ ] Select target area (auto-suggested by GPS proximity)
- [ ] Select date within a week with available capacity (capacity chip shows "6/10 booked")
- [ ] Assign to `korlap1`
- [ ] Submit → returns `task_id`

Back as `kec_wonokromo`:
- [ ] Receive FCM: "Permohonan disetujui"
- [ ] Open My Requests → status `assigned`
- [ ] Wait until korlap/satgas completes the task
- [ ] Receive FCM: "Pekerjaan selesai"
- [ ] Open request detail → see assigned task + activity photos (before/after)

Edge cases:
- [ ] Reject flow: reject with notes → kecamatan sees `rejected` with reason
- [ ] Reject after approve attempted → 409 Conflict (state machine guard)
- [ ] Kecamatan tries to access `/monitoring` → redirected (role gate)
- [ ] Capacity full: selected week shows "booked 10/10" → convert blocked until overbook confirmed

### Flow 5 — Top management overdue + capacity (`top1`)

- [ ] Open `/monitoring`
- [ ] Staffing summary header shows `3 overdue areas` badge (red)
- [ ] Click badge → drawer lists overdue areas with species breakdown
- [ ] Navigate to `/rayons/{selatan-id}/capacity`
- [ ] See week grid: weeks 18–21 show booked/capacity bars
- [ ] Expected state (after Flow 4): booked increments reflect the assigned request

### Flow 6 — Plant-seed ledger (`admin_data_taman_aktif` then `top1`)

As `admin_data_taman_aktif`:
- [ ] Navigate to Seeds list
- [ ] Open a seed detail → see current `stock_qty`
- [ ] Record purchase: qty 500, unit_price 2500, supplier "Nurseri Jaya", upload receipt
- [ ] Verify `stock_qty` increments by 500
- [ ] Record distribution: qty -100, to_rayon Selatan, recipient "Pak Budi"
- [ ] Verify `stock_qty` decrements by 100

As `top1`:
- [ ] Navigate to `/seeds/{id}` → see ledger with both entries in reverse-chron order
- [ ] Verify balance matches sum

Edge cases:
- [ ] Distribution qty > stock → 422 error with clear message
- [ ] Adjustment (positive correction for found inventory) recorded and visible
- [ ] `kepala_rayon` navigates to `/seeds` → 403 (gated to Taman Aktif admin_data + top_management)

### Regression — Apr 24 monitoring fixes

- [ ] Open mobile map; idle 10 min → no marker-bitmap CPU spikes (Android Studio profiler)
- [ ] Toggle tab away and back → Polygon and boundary layers re-fetch (`useFocusEffect`)
- [ ] Pan rapidly → no `addViewAt` bridge crashes in LocationTrail
- [ ] Tap a worker marker → bottom sheet opens without map fighting for viewport

### Regression — Role matrix

Run the `role-matrix.e2e-spec.ts` integration test as part of manual sign-off. Spot-check:

- [ ] `satgas` denied on `/pruning-requests/review`
- [ ] `staff_kecamatan` denied on `/monitoring/snapshot`
- [ ] `admin_data` in rayon Timur cannot review a request from rayon Selatan

### Sign-off

| Role | Tester | Date | Pass? |
|------|--------|------|-------|
| Backend | | | ☐ |
| Mobile | | | ☐ |
| Web | | | ☐ |
| Product | | | ☐ |

---

## CI Pipeline Updates

| Stage | Change | Runs on |
|-------|--------|---------|
| `backend-test` | Add Redis 7 service container; run integration tests | PR + main |
| `backend-lint` | Existing (no change) | PR |
| `mobile-test` | Add ESLint rule for `tracksViewChanges={true}` | PR |
| `web-e2e` | Add 5 new Playwright specs | PR |
| `loadtest` | New pipeline, **manual trigger only** (runs against staging) | manual |

---

## Test Data

| Dataset | Size | Origin |
|---------|------|--------|
| 131 plant species | 131 rows | CSV col 6, deduped |
| 5,008 activities | 5,008 rows | CSV full backfill (for 3-13) |
| 10 pruning requests | 10 rows | seeded in `seed-phase3.ts` across 4 statuses |
| 7 rayons × 12 weeks × 1 service_type | 84 rows | `seed-service-capacity.ts` |
| 50 plant_seeds + 200 seed_transactions | 250 rows | `seed-phase3-seeds.ts` |

---

**Last Updated:** 2026-04-24
