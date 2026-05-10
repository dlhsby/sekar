# Phase 3 — Implementation Reviews

**Last Updated:** 2026-04-27
**Status:** 🟡 In Progress — M1-R review ✅; M2 compliance review ✅ (7 gaps logged); **M3+M4 mobile-slice review ✅ (12 findings: 4 critical + 6 medium + 2 low) — ALL FIXED ✅ in `ff7d128`**

This document mirrors the Phase 2D `status_reviews.md` pattern: it collects post-implementation reviews, defect findings, and their remediations. Each sub-phase that completes work gets one entry here with its scope, findings, and fixes.

The intent is that future authors can read this file and understand **what went wrong and how it was corrected** — it's the phase's institutional memory.

---

## How to add an entry

When a sub-phase completes, a code reviewer (or the author themselves via self-review) appends a section with this structure:

1. **Review title + date + status.**
2. **Summary table** — issues found / fixed / deferred, grouped by severity.
3. **Per-area tables** (database, backend, web, mobile, specs, deployment) listing each issue with file reference, severity, and fix narrative.
4. **Deferrals** — anything that couldn't be fixed now and where it goes next.
5. **Links to commits / PRs** that landed the fixes.

Phase 2D's `status_reviews.md` at `specs/phases/phase-2-d-monitoring/status_reviews.md` is the canonical reference for depth and format.

---

## Planned Review Passes

| Review | Trigger | Agent / Reviewer | Expected entry |
|--------|---------|------------------|----------------|
| M1-R foundation review | After sub-phases 3-R1…3-R5 ship | web-code-reviewer + mobile-code-reviewer | Token-pipeline correctness; PWA Lighthouse; ESLint coverage; visual-regression baselines; full-sweep verification (zero non-generated hex literals) |
| 3-2 schema review | After sub-phase 3-2 lands | database-engineer + backend-code-reviewer | Migration correctness + rollback; index selection; role-enum migration risk |
| 3-3 monitoring backend review | After sub-phase 3-3 ships | backend-code-reviewer | Redis connection pooling; Streams replay safety; projector idempotency; debouncer timer accuracy; eager-load correctness |
| 3-4 web monitoring review | After sub-phase 3-4 ships | web-code-reviewer | Supercluster recomputation cost; WS patch idempotency; virtualization re-keying; overlay toggle memo |
| 3-5 mobile monitoring review | After sub-phase 3-5 ships | mobile-code-reviewer | Apr 24 marker fixes preserved; `tracksViewChanges={false}` audit; cluster bitmap key stability; `useFocusEffect` coverage |
| 3-6/3-7 task typing review | After sub-phases 3-6 + 3-7 ship | backend-code-reviewer + mobile-code-reviewer + web-code-reviewer | `custom_fields` schema strictness; parent/child cycle detection; partial-complete idempotency |
| 3-9/3-10 pruning-requests review | After sub-phases 3-9 + 3-10 ship | backend-code-reviewer + security-review | State-machine exhaustiveness; ADR-032 rayon-scope guard tests; FCM payload size; photo upload chunking |
| 3-11 capacity review | After sub-phase 3-11 ships | backend-code-reviewer | Concurrency (SELECT FOR UPDATE); overbook semantics; suggested-week payload shape |
| 3-12 seeds review | After sub-phase 3-12 ships | backend-code-reviewer | Ledger invariant (balance = Σ transactions); audit of every write path |
| 3-13 CSV backfill review | After sub-phase 3-13 ships | backend-code-reviewer + database-engineer | Idempotency on `reference_code`; Drive rehosting failure modes; memory bounds on 5 008-row import |
| 3-14 load-test review | After k6 runs | devops-engineer + backend-code-reviewer | Findings + fixes; baseline captured for Phase 4 comparison |
| Pre-deploy review | Before M5 rollout | code-reviewer + security-review (full branch scan) | All open issues triaged; nothing silently skipped |

---

## Entries

---

## M2 Monitoring v2 — Compliance Review (2026-04-26) 🟡

**Status:** 11 gaps found — 4 previously known (deferred), 7 new; 0 fixed same session (fix work tracked in M3 window + 3-14)
**Scope:** Sub-phases 3-3 (backend), 3-4 (web), 3-5 (mobile) — compliance against spec only (not code quality)
**Method:** Automated compliance agent review against `backend.md`, `web.md`, `mobile.md`, `infrastructure.md`
**Branch:** `main` (iterative delivery)

### Review Summary

| Category | Issues Found | Fixed | Deferred |
|----------|-------------|-------|----------|
| Backend (3-3) | 6 | 0 | 6 |
| Web (3-4) | 3 | 0 | 3 |
| Mobile (3-5) | 3 | 0 | 3 |
| **Total** | **11** (7 gaps + 4 previously known) | **0** | **11** |

> **Production safety:** All gaps have graceful degradation. `status:v2` events: page falls back to snapshot polling. Debouncer: `area:staffing-changed` still fires from `StatusCalculatorService` (Phase 2D path). Redis unavailable: app starts and processes synchronously. No gap blocks the M2 deploy.

### Gap Registry

| ID | Severity | Sub-phase | File | Gap | Planned Fix |
|----|----------|-----------|------|-----|-------------|
| Gap-1 | HIGH | 3-3 | `status-projector.service.ts` | `status:v2` WS event not emitted by projector; Phase 2D `StatusCalculatorService` still owns emission | Fix in 3-3 follow-up: projector calls `eventsGateway.server.to(...).emit('status:v2', ...)` after each status write |
| Gap-2 | HIGH | 3-3 | `staffing-debouncer.service.ts` + `events.gateway.ts` | `StaffingDebouncerService.setEmitter()` never called; debouncer is standalone | Fix in 3-3 follow-up: call `debouncerService.setEmitter(server)` in `EventsGateway.afterInit()` |
| Gap-3 | MEDIUM | 3-3/3-4 | — | `cluster:update` WS delta event not implemented | Fix in 3-4 follow-up once ClusterLayer integrates with MonitoringMap |
| Gap-4 | MEDIUM | 3-3 | `status-projector.service.ts` | Projector delegates to unmodified `StatusCalculatorService`; 6+ query pool pressure moved async, not eliminated | Deferred to 3-14 (load test window) — measure first, then optimize |
| Gap-5 | LOW | 3-3 | `be/src/modules/health/` | Health check not extended to report Redis connectivity or `stream_lag_s` | Fix before M5 rollout |
| Gap-6 | LOW | 3-3 | `be/.env.example` | `PHASE3_FEATURES_ENABLED` master feature flag not added | Add before deploy |
| Gap-7 | MEDIUM | 3-5 | `fe/mobile/src/store/slices/` | `plants` Redux slice (`speciesCatalog`, `areaPlantsByArea`, `notableByArea`, `areaStatusById`) not created | Deferred to 3-8 (plant data doesn't exist until 3-8 backend seeds/endpoints) |
| Gap-8 | MEDIUM | 3-4 | `fe/web/src/components/monitoring/` | No unit/integration tests for `ClusterLayer`, `WorkerListVirtual`, `HierarchyFilterPanel`, `AreaDetailDrawer`, `monitoring-v2` hook | Fix in 3-4 follow-up; coverage target ≥80% |
| Gap-9 | MEDIUM | 3-5 | `fe/mobile/src/components/monitoring/` | No tests for `ClusterMarker`, `ClusteredUserMarkers`, `MonitoringToggleSheet`, `AreaStatusOverlay`, `monitoringV2Slice` | Fix in 3-5 follow-up; coverage target ≥80% |
| Gap-10 | LOW | 3-4 | `fe/web/src/app/(dashboard)/monitoring/config/` | `monitoring/config` page not updated with Phase 3 debounce/sweep fields | Minor UX; fix before M5 rollout |
| Gap-11 | LOW | 3-5 | `fe/mobile/src/screens/monitoring/MapDashboardScreen.tsx` | Integration of v2 components (`ClusteredUserMarkers`, `MonitoringToggleSheet`, `AreaStatusOverlay`) into `MapDashboardScreen` not confirmed | Verify + wire in 3-5 follow-up |

### Pre-Deploy Requirements

The following gaps **must** be closed before deploying M2 to production:

- [ ] **Gap-1** — Wire `status:v2` emission from `StatusProjectorService`
- [ ] **Gap-2** — Wire `StaffingDebouncerService.setEmitter()` in `EventsGateway.afterInit()`
- [ ] **Gap-6** — Add `PHASE3_FEATURES_ENABLED` to `be/.env.example` and GitHub Secrets

The remaining gaps are safe to ship in a follow-up (Phase 3 M3 window or 3-14 load test).

### Deployment Checklist (User Review)

Work through this checklist before merging the Phase 3 M2 PR:

**Backend**
- [ ] `cd be && npm test` → 1,297 tests passing (no regression from Phase 2E baseline of 1,264)
- [ ] `cd be && npx tsc --noEmit` → 0 errors
- [ ] `npm run migration:run` on local DB → `Phase3Schema` + `Phase3BackfillIndexes` execute successfully
- [ ] `npm run db:seed` → Phase 3 tables exist → seed runs (124 plant_species, 4 monitoring_configs, service_capacity rows)
- [ ] `npm run db:seed` WITHOUT running migration first → prints "Phase 3 tables not found — skipping" (no crash)
- [ ] Redis service starts: `docker-compose up redis` → `redis-cli ping` → PONG
- [ ] Backend starts with Redis down (`REDIS_URL=redis://localhost:19999`) → logs warning, does NOT crash
- [ ] `GET /api/v1/monitoring/snapshot` with admin JWT → `{"success":true}` (scope=city)
- [ ] `GET /api/v1/monitoring/snapshot?scope=rayon&id=<OTHER_RAYON_UUID>` with kepala_rayon JWT → 403

**Web**
- [ ] `cd fe/web && npm run build` → 0 errors
- [ ] Monitoring page loads at `/monitoring` without console errors
- [ ] HierarchyFilterPanel renders (city / rayon / area scope selector)
- [ ] WorkerListVirtual renders and scrolls (check DevTools → Elements — only ~10 rows in DOM at a time)
- [ ] AreaDetailDrawer opens when an area is clicked
- [ ] `staff_kecamatan` role login → redirected away from `/monitoring`

**Mobile**
- [ ] `cd fe/mobile && npm test -- --passWithNoTests` → passes
- [ ] `cd fe/mobile && npx eslint src/components/monitoring/ --max-warnings=0` → 0 violations (no `tracksViewChanges={true}`)
- [ ] APK builds without error: `cd fe/mobile/android && ./gradlew assembleRelease`
- [ ] MapDashboard loads without crash on device/emulator
- [ ] `featureFlags.clusterMarkersV2 = false` (default) → existing individual markers shown (no cluster UI)
- [ ] BoundaryOverlay reloads on tab re-focus (Apr 24 fix preserved)

**Infrastructure**
- [ ] `infra/docker-compose.yml` includes Redis 7 service with healthcheck
- [ ] `be/.env.example` has `REDIS_URL`, `REDIS_STREAM_MAX_LEN`, `STAFFING_DEBOUNCE_SECONDS`, `MONITORING_SWEEP_CRON`, `CLUSTER_ZOOM_THRESHOLD`, `MISSING_THRESHOLD_SECONDS`

### Deferred

| # | Reason | Tracked in |
|---|--------|-----------|
| Gap-4 (eager-load rewrite) | Measure under load first; async path is better than sync even without single-query optimization | 3-14 (load test) |
| Gap-7 (plants Redux slice) | No plant data until 3-8 backend plants module | 3-8 |
| Gap-8/9 (missing tests) | Time-boxed M2 delivery; tests to follow in next iteration | 3-3/3-4/3-5 follow-up |
| Gap-3/5/10/11 | Minor; no production impact | Before M5 rollout |

---

## M1-R Redesign Foundation — Post-Implementation Review (2026-04-25) ✅

**Status:** 4 bugs found → fixed same session; 0 deferred
**Scope:** Sub-Phases 3-R1 → 3-R5: token pipeline, ESLint plugin, brand fonts, NB primitives (mobile), Web PWA shell, full redesign sweep (mobile + web)
**Method:** User manual review on device + visual inspection of code
**Branch:** `main` (iterative delivery, no PR workflow yet)

### Review Summary

| Category | Issues Found | Fixed | Deferred |
|----------|-------------|-------|----------|
| Mobile | 3 | 3 | 0 |
| Web | 0 | 0 | 0 |
| Specs | 1 (clarity) | 1 | 0 |
| **Total** | **4** | **4** | **0** |

### Issues

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | Medium | `fe/mobile/src/screens/auth/LoginScreen.tsx` | Login error shows both a bottom toast AND an inline Redux error box simultaneously — duplicate feedback | Removed `dispatch(setError(...))` calls + inline error `View`; all API errors now route to toast only; field-validation errors (identifierError/passwordError under inputs) unchanged |
| 2 | Medium | `fe/mobile/src/screens/auth/LoginScreen.tsx` + `fe/mobile/src/components/nb/NBToast.tsx` | Toast auto-dismissed after 4 s — user couldn't read the error message | Added `persistent?: boolean` to `NBToastOptions`; all login-failure toast calls pass `persistent: true` → `visibilityTime: Number.MAX_SAFE_INTEGER`; user must tap ✕ to dismiss |
| 3 | Medium | `fe/mobile/src/components/nb/NBModal.tsx` + 6 consumers | NBModal had no built-in content or footer padding — every caller duplicated the same spacing values in a wrapper `<View>`; `ChangePasswordModal` footer used `NBButton` (shadow, 2 px radius) while filter modals used flat `TouchableOpacity` (borderWidth only, minHeight 46) — visually inconsistent across all bottom-sheet modals | Added `noPadding?: boolean` prop; non-scrollable `content` gains `padding: md, paddingBottom: sm` by default; `footerWrap` gains `paddingHorizontal: md, paddingVertical: sm+2`; `SortModal` passes `noPadding` (edge-to-edge rows); `ProfileScreen` drops manual `aboutContent` wrapper; all three filter modals drop redundant padding from `actionButtons`; `ChangePasswordModal` footer migrated from `NBButton` to `TouchableOpacity` matching filter-modal style (borderWidth, minHeight 46, `ActivityIndicator` for loading) |
| 4 | Low | `specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md` | "Already clean from Phase 2 + 3-R2" for web 3-R5 sweep read like a skip; user couldn't see what web actually got in M1-R | Expanded row to explicitly list 3-R1/3-R2/3-R4 web deliverables and frame 3-R5 as a verification pass |

### Deferred

_None._

---

## M1-R Manual Review Checklist

> Work through this checklist on a physical Android device or emulator + a desktop browser before starting 3-2.
> Tick each item when confirmed OK; raise any failure as a bug.

### A. Token Pipeline (3-R1 / 3-R2)

```bash
# Run from project root
npm run tokens:build && git diff --exit-code   # must be clean
npm run tokens:verify                           # must exit 0
npm run test:tokens                             # all tests green
```

- [ ] `fe/web/src/app/generated/tokens.css` — present, starts with `/* generated`, has `:root { --color-nb-primary`
- [ ] `fe/mobile/src/constants/generated/tokens.ts` — present, starts with `/* generated`, exports `generatedTokens`

### B. ESLint — Zero Violations

```bash
cd fe/web   && npx eslint src/ --max-warnings=0   # no-inline-hex-colors, no-tailwind-shadow-classes-with-blur, prefer-nb-shadow-utility
cd fe/mobile && npx eslint src/ --max-warnings=0  # no-inline-hex-colors, rn-no-shadow-radius
```

- [ ] Both exit 0 — only allowlisted files in each config
- [ ] `scripts/hex-allowlist.txt` exists with 18+ entries, each has `| <reason>`

### C. Brand Fonts

**Mobile:**
- [ ] LoginScreen heading ("MASUK" / "SEKAR") renders in Space Grotesk Bold (not system font)
- [ ] Body text renders in Inter

**Web:**
- [ ] DevTools → heading → Computed → font-family shows "Space Grotesk"
- [ ] Body text shows "Inter"

### D. NB Primitives (3-R3 Mobile)

**NBToast (after Bug 1 + 2 fix):**
- [ ] Login with wrong credentials → single toast at bottom only (no inline red box below password field)
- [ ] Toast does NOT auto-dismiss — stays until user taps ✕
- [ ] Tapping ✕ closes the toast
- [ ] Field errors ("Username harus diisi" etc.) still appear under the relevant input

**NBModal — "Tentang Aplikasi" + all bottom-sheet modals (after Bug 3 fix):**
- [ ] Profile → "Tentang Aplikasi" → content has visible breathing room (no manual wrapper needed)
- [ ] Title "TENTANG SEKAR" visible (uppercase) at top; drag down closes sheet
- [ ] Filter modals (Aktivitas / Lembur / Tugas) — Reset and Terapkan buttons look identical to Batal / Ubah Password buttons in Ubah Password modal
- [ ] Sort modal (Urutkan) — option rows extend edge-to-edge (no content padding)

**NBText:**
- [ ] `variant="h1"` renders bold, larger than body text
- [ ] `variant="body-sm" color="gray500"` renders muted gray

### E. Web PWA Shell (3-R4)

- [ ] `fe/web/public/manifest.webmanifest` exists, valid JSON
- [ ] DevTools → Application → Manifest → shows SEKAR name, icons, theme color
- [ ] `NEXT_PUBLIC_FEATURE_PWA=false` in `.env.local` → no SW in DevTools → Service Workers
- [ ] `NEXT_PUBLIC_FEATURE_PWA=true`, restart dev → SW registered; disconnect network → offline shell loads
- [ ] Chrome Android: install banner appears → "Pasang" triggers browser install prompt
- [ ] `/icon` and `/apple-icon` routes render icons

### F. Responsive Scaffolding (3-R4)

- [ ] 375 px — single-column, no horizontal overflow
- [ ] 768 px — tablet breakpoint graceful
- [ ] 1280 px — desktop sidebar layout

### G. Full Redesign Sweep (3-R5)

**Mobile — key tokens:**
- [ ] ClockIn/ClockOut/ActivitySubmission/TaskCreate/OvertimeSubmit — error summary background is pinkish (`withAlpha(danger, 0.05–0.06)`), not `#FFF5F5`
- [ ] StaffingSummarySection — progress bar amber is `#E3A018` (nbColors.warning), not `#D97706`
- [ ] BoundaryOverlay — area center marker is amber; rayon dot is blue `#2563EB` (expected, allowlisted)
- [ ] LocationTrail — purple trail `#9333EA` (expected, allowlisted)

**Web — tokens already applied from Phase 2 + 3-R2:**
- [ ] Login page — NB card styling, Space Grotesk heading
- [ ] Dashboard sidebar — token colors
- [ ] Monitoring pages — load without errors; status colors render correctly from `monitoring.ts`

### H. Shadow Discipline

- [ ] Mobile cards/buttons show hard-edge shadow (offset, no blur)
- [ ] Web cards — `box-shadow: 6px 6px 0 #1C1917` (or similar hard-edge value) in DevTools
- [ ] No Tailwind `shadow-sm/md/lg` on web (ESLint enforces)

### I. CI Gates (simulate locally)

- [ ] Edit hex in non-allowlisted file → `npm run tokens:verify` exits non-zero
- [ ] Add `className="shadow-md"` to web component → `cd fe/web && npx eslint src/<file>` reports error
- [ ] Both gates pass on clean branch

---

## M3+M4 Mobile Slice — Review (2026-04-27) ✅ All 12 fixed

**Status:** Complete — review surfaced 4 critical, 6 medium, 2 low. **All 12 fixed in commit `ff7d128`** the same day.

**Scope:** Phase 3 sub-phases 3-6 mobile glue, 3-7 mobile (plants slice + form), 3-8 mobile chip, 3-10 kecamatan slice (3 screens + slice + offline queue).

**Method:** mobile-code-reviewer agent against committed + uncommitted code on `main`.

**Files reviewed (committed in 2169867 + later):**
- `src/components/tasks/{PartialCompleteSheet,SpeciesAutocomplete,PruningTaskForm}.tsx`
- `src/screens/taskActivity/components/PlantStatusChip.tsx`
- `src/store/slices/{plantsSlice,pruningRequestsSlice}.ts`
- `src/services/api/{plantsApi,pruningRequestsApi}.ts`
- `src/screens/pruningRequests/{SubmitScreen,MyRequestsScreen,RequestDetailScreen}.tsx`
- `src/navigation/KecamatanNavigator.tsx`
- `src/hooks/useNetworkStatus.ts`
- `src/services/sync/syncManager.ts` (extension)
- `src/store/slices/tasksSlice.ts` (extension)

### Review Summary

| Category | Critical | Medium | Low | Total |
|----------|----------|--------|-----|-------|
| Redux state shape | 1 | 0 | 1 | 2 |
| API error handling | 1 | 1 | 0 | 2 |
| Accessibility (WCAG 2.1 AA) | 1 | 1 | 0 | 2 |
| Concurrency / network state | 1 | 0 | 0 | 1 |
| Component performance | 0 | 2 | 1 | 3 |
| Offline sync UX | 0 | 1 | 0 | 1 |
| Misc | 0 | 1 | 0 | 1 |
| **Total** | **4** | **6** | **2** | **12** |

### Critical Issues (must fix before next iteration)

| # | File:line | Issue | Suggested Fix |
|---|-----------|-------|---------------|
| C1 | `plantsSlice.ts:130` | `searchSpecies.fulfilled` mutates `state.speciesById` outside the immer-tracked path (assigns object props inline rather than via spread). With Redux Toolkit's Immer this *happens* to work but is a footgun for future maintainers. | Replace with `state.speciesById = { ...state.speciesById, ...Object.fromEntries(action.payload.map(s => [s.id, s])) }`. |
| C2 | `plantsSlice.ts:78`, `pruningRequestsSlice.ts:68` (and other thunks) | `rejectWithValue(String(err))` collapses error objects to strings. UI loses access to `code` / `details` for retry decisions. | Pass `{ error, code }` shape; type reducers' `action.payload` accordingly. |
| C3 | `SpeciesAutocomplete.tsx:160-175` | Selected-species chip list lacks `accessibilityRole="list"` + per-chip `accessibilityRole="listitem"`. Screen readers can't announce the selection group. | Wrap chips container with `accessibilityRole="list"` + `accessibilityLabel="Spesies terpilih"`; chips use `listitem` + `accessibilityLabel` describing remove action. |
| C4 | `SubmitScreen.tsx:177-184` | `handleSubmit` reads `isOnline` once via hook closure. If connection drops between validation and dispatch, request can be enqueued **and** submitted; rapid taps amplify. | Re-fetch `await NetInfo.fetch()` inside `handleSubmit` immediately before branching; debounce submit button. |

### Medium Issues

| # | File:line | Issue | Suggested Fix |
|---|-----------|-------|---------------|
| M1 | `pruningRequestsApi.ts:10-19` | `getMyPruningRequests` unconditionally returns `response.data`; if envelope is `{ error, code }` the slice stores `undefined`. | Validate `response.data && !response.error` before resolving. |
| M2 | `SpeciesAutocomplete.tsx:83-104` | `handleSpeciesSelect` / `handleRemoveChip` deps array missing `multi`. If parent toggles `multi`, stale closure double-selects. | Add `multi` to deps. |
| M3 | `syncManager.ts:285-300` | When `syncPruningRequest` fails, error is logged but **not** propagated back into `pruningRequestsSlice.byId[id]`. UI shows stale "submitted" status. | Dispatch a `pruningRequests/setSyncError({id, error})` action on failure. |
| M4 | `PartialCompleteSheet.tsx:60-64` | Uses `Alert.alert` for success feedback — blocks UI thread for 2 s on slow devices. | Replace with toast (`NBToast.show(…)`). |
| M5 | `MyRequestsScreen.tsx:83-90` | FlatList missing `maxToRenderPerBatch`, `initialNumToRender`, `updateCellsBatchingPeriod`. 60 FPS jank likely with 50+ rows. | Add the three optimization props. |
| M6 | `PartialCompleteSheet.tsx:111-123` | "Lanjutkan Besok" toggle uses checkmark prefix in `title` rather than `accessibilityRole="switch"` + `accessibilityState={{checked}}`. | Use proper switch role + state; remove cosmetic checkmark. |

### Low Issues

| # | File:line | Issue | Suggested Fix |
|---|-----------|-------|---------------|
| L1 | `plantsSlice.ts:168-177` | Selectors typed as `(state: any) =>`, blocking IDE inference. | Type via `RootState`; move to `createSelector` for memoization. |
| L2 | `PruningTaskForm.tsx:55-65` | `isFormValid` recomputed every render — fine now, but with 100+ species selected could matter. | Wrap in `useMemo`. |

### Deferred

| # | Reason | Tracked in |
|---|--------|-----------|
| (none) | All 12 fixed same-day. | — |

### Related Commits / PRs

- `2169867` feat(phase-3-3-8): mobile glue (committed prematurely by rogue agent — files include partial 3-6/3-7/3-10 mobile work in addition to the 3-8 chip)
- `0201cbb` feat(phase-3): seeders (notable_plants + pruning_request samples)
- `fc37bcd` docs: CLAUDE.md status line for Phase E
- `4717080` fix(mobile/phase-3): repair kecamatan + plants tests + add useNetworkStatus
- `f130faa` docs(phase-3): sync STATUS + progress + reviews for M3+M4 mobile spine
- **`ff7d128` fix(mobile/phase-3): address M3+M4 review findings (4 critical, 6 medium, 2 low)** ← landed all 12 fixes

---

## Phase 3 — From-Scratch Verification Checklist (Apr 27, 2026)

**Purpose:** Comprehensive walkthrough of all Phase 3 sub-phases (M1-R through 3-12) to confirm integration, data seeding, and UAT readiness before next rollout.

**Prerequisites:**
- Fresh PostgreSQL + Redis 7 via `./infra/start.sh`
- Backend migrations run: `npm run migration:run`
- All data seeded: `npm run db:seed:prod` (includes Phase 3 reference + staging sample data)
- Backend + Web + Mobile all started without errors

---

### 🔥 Pre-flight smoke (run this first — should take <5 min)

If any of these fail, stop and fix before walking the full checklist:

| # | Step | Expected | Apr 27 status |
|---|------|----------|---------------|
| 1 | Login mobile as `staff_kec_pusat / password123` → land on `SubmitScreen` (5-step wizard) | Renders without crash; "Kembali" + "Lanjut" buttons visible | ✅ fixed Apr 27 |
| 2 | Navigate `SubmitScreen` Step 1 → Step 2 → Step 5 (any direction) | Buttons render text correctly; no red error screen | ✅ fixed Apr 27 |
| 3 | Login mobile as `admin_data_pusat / password123` → tap admin tab → `ReviewQueueScreen` | List of pending pruning requests (≥2 from seed) | ✅ |
| 4 | In `ReviewQueueScreen`, tap a request → `RequestDetailScreen` → tap "Setujui" | Modal opens; reason textarea visible; submit fires `POST /pruning-requests/:id/review` | ✅ |
| 5 | In `RequestDetailScreen` for an approved request → tap "Tugaskan ke Petugas" | `AssignToTaskSheet` opens; date picker + units field visible; **note: areas/users dropdowns are empty until Phase 4 polish** | 🟡 partial |
| 6 | Login web as `admin_pusat / password123` → click each sidebar link | All routes render (no 404). Phase 3 web pages show "Coming soon — use mobile" placeholders | ✅ Apr 27 placeholders added |
| 7 | Login web as `staff_kec_pusat` → sidebar has only "Kirim Permintaan" + "Permintaan Saya" | Both links resolve to placeholder pages, no 404 | ✅ Apr 27 fixed |
| 8 | Backend: `curl -H "Authorization: Bearer <admin token>" http://localhost:3000/api/v1/pruning-requests` | 200 OK; paginated list with at least 1 request | ✅ |

---

### M1-R Redesign Foundation (Sub-phases 3-R1 through 3-R5)

#### 3-R1 & 3-R2 — Token Pipeline + ESLint
- [ ] `npm run tokens:verify` exits 0 (no drift)
- [ ] `fe/web/src/app/generated/tokens.css` exists, starts with `/* generated`, contains `:root { --color-nb-primary`
- [ ] `fe/mobile/src/constants/generated/tokens.ts` exists, starts with `/* generated`, exports `generatedTokens`
- [ ] `npx eslint fe/web/src --max-warnings=0` exits 0
- [ ] `npx eslint fe/mobile/src --max-warnings=0` exits 0
- [ ] All hex colors in non-allowlisted files trigger ESLint `no-inline-hex-colors` errors (verify with a test edit)

#### 3-R3 Mobile — NB Primitives + Fonts
- [ ] Mobile LoginScreen: "SEKAR" heading renders in Space Grotesk Bold (visibly different from system font)
- [ ] Body text on HomeScreen renders in Inter
- [ ] `NBToast`: error toast persists (no auto-dismiss); ✕ button closes it
- [ ] `NBModal` (Tentang Aplikasi, filters, sort): content has consistent padding on all sides; buttons aligned
- [ ] `NBText` variants (`h1`, `body-sm`, etc.) render with correct sizing + weight

#### 3-R4 Web — PWA Shell + Responsive Scaffolding
- [ ] `fe/web/public/manifest.webmanifest` is valid JSON with SEKAR name + icons
- [ ] DevTools → Application → Manifest → renders correctly
- [ ] `NEXT_PUBLIC_FEATURE_PWA=true` → Service Worker registered; offline shell loads
- [ ] Responsive test (375 / 768 / 1280 px): no horizontal scroll, content readable at all widths
- [ ] `/icon` and `/apple-icon` routes return images

#### 3-R5 Web — Full Redesign Sweep Verification
- [ ] LoginScreen: NB card styling (hard-edge shadows), Space Grotesk heading
- [ ] Dashboard sidebar: colors match token definitions
- [ ] All non-rewritten screens (Settings, Rayons, Tasks, etc.): no inline hex colors; all colors from tokens

---

### M2 Monitoring v2 (Sub-phases 3-3, 3-4, 3-5)

#### 3-3 Backend — Redis Streams + Status Projector
- [ ] `docker logs sekar-backend | grep -i redis` shows "Socket.IO Redis adapter active" (if Redis available)
- [ ] `curl localhost:3000/api/v1/health` → `{"status":"ok"}`
- [ ] `GET /api/v1/monitoring/snapshot` (requires JWT) → `{"success":true}` with worker cluster counts
- [ ] `GET /api/v1/monitoring/snapshot?scope=rayon&id=<RAYON_UUID>` as kepala_rayon → 403 if OTHER rayon, 200 if own
- [ ] `GET /api/v1/monitoring/config` → includes keys: `staffing_debounce_seconds`, `cluster_zoom_threshold`, `missing_threshold_seconds`
- [ ] **Gap-1 Status**: `status:v2` WebSocket event emitted by StatusProjectorService (verify via browser DevTools WS tab or test script)
- [ ] **Gap-2 Status**: StaffingDebouncerService wired to EventsGateway (verify via logs: "Staffing debounced for" messages appear)
- [ ] Health endpoint extended (Gap-5): `GET /api/v1/health` returns `{"status":"ok","redis":{"connected":true,"stream_lag_ms":...}}` (if Redis available)

#### 3-4 Web — Monitoring Page v2
- [ ] `/monitoring` page loads without console errors
- [ ] HierarchyFilterPanel (scope selector: Kota / Rayon / Area) renders and switches scopes
- [ ] WorkerListVirtual scrolls smoothly; DevTools shows <15 DOM rows at a time (virtualized)
- [ ] AreaDetailDrawer opens when area is clicked; shows area name + staffing summary
- [ ] Worker status updates in real-time (clock in/out a worker via API → list updates within 1 s)
- [ ] `staff_kecamatan` login → redirected away from `/monitoring` (role guard works)

#### 3-5 Mobile — Monitoring MapDashboard
- [ ] MapDashboard loads without crash
- [ ] `featureFlags.clusterMarkersV2=false` (default) → existing individual markers shown (no new cluster UI yet)
- [ ] BoundaryOverlay reloads on tab re-focus (Apr 24 fix preserved)
- [ ] No `tracksViewChanges={true}` in monitoring components (ESLint enforces)
- [ ] Apr 24 marker/trail fixes still in place: `requestAnimationFrame` guard, `LabelMode` enum, `tracksViewChanges={false}`

---

### M3 Plants + Task Typing (Sub-phases 3-6, 3-7, 3-8)

#### 3-6 Backend — Plants Module
- [ ] `GET /api/v1/plants/species` → 128+ plant species (JSON array with id, name_en, name_id, family, status)
- [ ] `GET /api/v1/plants/notable` → 4 heritage plants (area_id, species_id, name, notes)
- [ ] `GET /api/v1/monitoring/area/:id/plant-status` → plant inventory + status summary for area
- [ ] `plants_species` table exists with 128 rows: `SELECT COUNT(*) FROM plant_species;` → 128
- [ ] `area_plants` aggregate table seeded: `SELECT COUNT(*) FROM area_plants;` → ≥30
- [ ] `notable_plants` table seeded: `SELECT COUNT(*) FROM notable_plants;` → ≥4

#### 3-7 Mobile — Plants Form + Autocomplete
- [ ] `SpeciesAutocomplete` component: typing "mah" → shows Mahoni, Mahagoni (autocomplete filtering works)
- [ ] Multi-select: tap species → chip added; tap chip ✕ → removed
- [ ] `PruningTaskForm`: pre-fills with area + deadline; species chips visible
- [ ] `plantsSlice` in Redux: `state.speciesCatalog` populated; selectors return correct data
- [ ] No immutability violations: `npm run test -- plantsSlice` passes (immer checks included)
- [ ] API calls via `plantsApi.ts`: `searchSpecies()` returns ≥20 matches; `getAreaPlants()` returns inventory

#### 3-8 Light — Plant Status Chip
- [ ] `PlantStatusChip` renders on pruning tasks: shows icon + species name + status + due-date countdown
- [ ] Read-only mode (3-8 light): no edit button; chip displays only
- [ ] Status color coding: pending (gray), partial (amber), done (green) — matches token colors
- [ ] Chip integrates into `TaskDetailScreen`: appears inline with other task metadata
- [ ] Test coverage: `PlantStatusChip.test.tsx` exists, ≥80% statements covered

---

### M4 Admin Finish-Out (Sub-phases 3-9, 3-10, 3-11, 3-12)

#### 3-9 & 3-10 Backend + Mobile — Pruning Requests Full Stack
- [ ] **Backend (3-9)**:
  - [ ] `POST /api/v1/pruning-requests` (staff_kecamatan) → 201 with id, status=submitted
  - [ ] `GET /api/v1/pruning-requests` (admin_data, admin_system) → paginated list; filters by status/rayon work
  - [ ] `POST /api/v1/pruning-requests/:id/review` (admin_data) → update status (approved/rejected); ADR-032 rayon scope enforced
  - [ ] `POST /api/v1/pruning-requests/:id/assign-to-task` (admin_system) → status→assigned, new task created
  - [ ] `pruning_requests` table exists: `SELECT COUNT(*) FROM pruning_requests;` → ≥4 (seeded samples)
  - [ ] `activity_plant_items` table exists: links activities to plant species (for task conversion)
  - [ ] Tests: 30+ tests for PruningRequestsController, ≥80% coverage

- [ ] **Mobile (3-10)**:
  - [ ] `KecamatanNavigator` role-gated: visible only for staff_kecamatan; other roles don't see this tab
  - [ ] `SubmitScreen` (5 steps): area selector → species multi-select → optional photos → review → submit
  - [ ] Form submission: online → immediate API call; offline → queued, synced on reconnect
  - [ ] `MyRequestsScreen`: list of staff_kecamatan's own requests; filters by status (submitted/approved/rejected)
  - [ ] `RequestDetailScreen`: full request detail; status updates via WS in real-time
  - [ ] `ReviewQueueScreen` (admin_data): paginated queue of submitted requests; approval/rejection form
  - [ ] `AssignToTaskSheet` (admin_system): approve→convert flow; modal opens with task pre-population
  - [ ] `pruningRequestsSlice`: state shape correct, no mutations, tests ≥80%
  - [ ] Offline queue: `syncManager.ts` includes `syncPruningRequest()` with retry logic

#### 3-11 Backend + Web — Service Capacity Grid
- [ ] `service_capacity` table exists: 84 rows (7 rayons × 12 weeks), capacity_units column
- [ ] `GET /api/v1/service-capacity/grid` (kepala_rayon, admin_system) → 7×12 grid with current capacity_units
- [ ] `PUT /api/v1/service-capacity` (kepala_rayon, admin_system) → update capacity_units for rayon+week
- [ ] `GET /api/v1/service-capacity/suggested-week` (admin_system) → returns least-booked week for a rayon
- [ ] **Web UI:** `/service-capacity` page (or `/kapasitas-layanan`) shows interactive grid; click cell → edit form; update saves
- [ ] Kepala_rayon sees only own rayon's rows; admin_system sees all
- [ ] Tests: 20+ for CapacityController, ≥80% coverage

#### 3-12 Backend + Mobile — Plant Seeds Inventory
- [ ] `plant_seeds` table exists: ≥5 rows seeded (e.g., Bibit Mahoni, Bibit Pohon Asam)
- [ ] `seed_transactions` table exists: ≥5 sample transactions (purchase, usage, waste)
- [ ] **Backend endpoints (3-12)**:
  - [ ] `GET /api/v1/plant-seeds` → list with current balance (calculated from transactions)
  - [ ] `GET /api/v1/plant-seeds/:id` → detail + full transaction ledger
  - [ ] `POST /api/v1/plant-seeds/:id/transaction` → record purchase/usage/waste; idempotent on `reference_code`
  - [ ] Balance calculation: `balance = initial_qty + Σ(purchases) - Σ(usages) - Σ(waste)` ✓ verified
- [ ] **Mobile UI** — ⏳ **DEFERRED to Phase 4 polish (Apr 27 audit confirmed `screens/plantSeeds/` directory does not exist):**
  - ⏳ `PlantSeedsInventoryScreen` — not implemented
  - ⏳ `SeedDetailScreen` — not implemented
  - ⏳ `AddTransactionScreen` — not implemented
  - [x] `plantSeedsSlice` in Redux — implemented + tested; selectors return correct balances when state hydrated via API
  - [x] `plantSeedsApi.ts` — implemented + tested
- [ ] Tests: 29 for PlantSeedsController (100 % stmts / 94.23 % branches); ledger invariant tests pass

#### 3-12 Seeders — CSV Backfill (Deferred to Phase 4, but seeder scaffold in place)
- [ ] `src/database/seeds/seed-phase3.ts` exists; runs idempotently on `npm run db:seed:prod`
- [ ] Reference data seeded: 128 plant_species, 4 monitoring_configs, 84 service_capacity rows
- [ ] Staging data seeded (on `npm run db:seed:staging:prod`): 30 area_plants, 4 pruning_requests samples, 5 plant_seeds + 5 transactions
- [ ] Scaffold for CSV backfill ready; 5,008-row import deferred to 3-13

---

### Integration & End-to-End Flows

#### Role-Based Flows
- [ ] **Staff Kecamatan**: Log in → Kecamatan tab → Submit pruning request → see in MyRequests
- [ ] **Admin Data**: Log in → Pruning Requests → review request → approve/reject (rayon-scoped)
- [ ] **Admin System**: Log in → Pruning Requests → convert approved → new task appears in Tasks list
- [ ] **Kepala Rayon**: Log in → Service Capacity → view own rayon's weeks (read/write depending on ADR-032); Plant Seeds → add transaction
- [ ] **Satgas**: Log in → Monitoring → see cluster status; Tasks → pruning task shows PlantStatusChip

#### WebSocket Real-Time
- [ ] Clock in a worker (via API) → monitoring list updates within 1 s (all connected clients)
- [ ] Change pruning request status (via admin form) → staff_kecamatan's MyRequests list updates via WS
- [ ] Update service capacity (via grid) → refresh monitoring snapshot scope → staffing debounce fires within 30 s

#### Offline + Sync
- [ ] Mobile: submit pruning request while offline → queued in `syncManager`
- [ ] Go online → sync fires automatically; request appears in backend within 2 s
- [ ] Verify no duplicate submissions (idempotent on `request_id`)

---

### Database Consistency
- [ ] All 30 tables exist (Phase 1 + 2 + 3): `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';` → 30
- [ ] All 8 Phase 3 tables present: `plant_species`, `area_plants`, `notable_plants`, `pruning_requests`, `activity_plant_items`, `service_capacity`, `plant_seeds`, `seed_transactions`
- [ ] User role enum includes `staff_kecamatan`: `SELECT enum_range(NULL::user_role);` → includes 'staff_kecamatan'
- [ ] Foreign keys enforced: delete an area → cascade to area_plants (or explicit error)
- [ ] Indexes optimized: migration 10 (`Phase3BackfillIndexes`) applied; location_logs queries sub-100ms (verify via `EXPLAIN ANALYZE`)

---

### Test Coverage & CI
- [ ] Backend: `npm test` → 1,297 tests passing; `npm run test:cov` → ≥94% statements covered
- [ ] Mobile: `npm test` → ≥3,900 tests passing; coverage ≥80% per module
- [ ] Web: `npm run test:e2e` → Playwright runs without errors (or skipped if no E2E suite yet)
- [ ] Token pipeline: `npm run tokens:verify` exits 0
- [ ] ESLint: `npx eslint` on all workspaces exits 0 (max-warnings=0)

---

### Docs & Deployment Readiness
- [ ] `specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md` reflects current state (17/21 sub-phases complete)
- [ ] `specs/deployment/phase-3-deployment.md` matches actual endpoints + env vars
- [ ] `CLAUDE.md` and `README.md` updated with Phase 3 progress
- [ ] `status_reviews.md` documents all findings + fixes (this file)
- [ ] GitHub Secrets has all Phase 3 env vars (REDIS_URL, etc.) — OR graceful degradation if missing
- [ ] CI/CD pipelines (backend-ci-cd.yml, web-ci-cd.yml) passing on main

---

**Completion Criteria:** All checkboxes ☑ = Phase 3 ready for production rollout (or next milestone demo).

**Owner:** QA + Implementation Leads

---

<!--
Template (copy and fill when a sub-phase completes):

## Sub-Phase 3-X — Review (YYYY-MM-DD) ✅

**Status:** Complete — N of M issues fixed, K deferred
**Scope:** Brief description of what was reviewed
**Method:** Reviewers + tools
**Branch:** `f/phase-3-sub-X-name`

### Review Summary

| Category | Issues Found | Fixed | Deferred |
|----------|-------------|-------|----------|
| Database & Entity | 0 | 0 | 0 |
| Backend | 0 | 0 | 0 |
| Web | 0 | 0 | 0 |
| Mobile | 0 | 0 | 0 |
| Specs | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** |

### Issues

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| — | — | — | — | — |

### Deferred

| # | Reason | Tracked in |
|---|--------|-----------|
| — | — | — |

### Related Commits / PRs

- PR #__ — Title
-->
