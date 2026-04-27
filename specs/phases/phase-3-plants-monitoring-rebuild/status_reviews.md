# Phase 3 — Implementation Reviews

**Last Updated:** 2026-04-27
**Status:** 🟡 In Progress — M1-R review ✅; M2 compliance review ✅ (7 gaps logged); **M3+M4 mobile-slice review ✅ (4 critical follow-ups, 6 medium, 2 low — all logged below)**

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

## M3+M4 Mobile Slice — Review (2026-04-27) 🟡 4 critical follow-ups

**Status:** Complete — review surfaced 4 critical, 6 medium, 2 low. All deferred to a follow-up review-fixes commit (see "Deferred" below); none block tomorrow's demo.

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
| C1–C4 + M1–M6 + L1–L2 | All 12 findings deferred to a "M3+M4 review-fixes" commit after tomorrow's demo. None block functional demo. | This entry; carry into next iteration plan. |

### Related Commits / PRs

- `2169867` feat(phase-3-3-8): mobile glue (committed prematurely by rogue agent — files include partial 3-6/3-7/3-10 mobile work in addition to the 3-8 chip)
- `0201cbb` feat(phase-3): seeders (notable_plants + pruning_request samples)
- `fc37bcd` docs: CLAUDE.md status line for Phase E
- *(pending)* M3+M4 finalization commit covering test fixes + spec sync

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
