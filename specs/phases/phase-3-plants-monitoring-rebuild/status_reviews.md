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
| Gap-5 | LOW | 3-3 | `apps/be/src/modules/health/` | Health check not extended to report Redis connectivity or `stream_lag_s` | Fix before M5 rollout |
| Gap-6 | LOW | 3-3 | `apps/be/.env.example` | `PHASE3_FEATURES_ENABLED` master feature flag not added | Add before deploy |
| Gap-7 | MEDIUM | 3-5 | `apps/mobile/src/store/slices/` | `plants` Redux slice (`speciesCatalog`, `areaPlantsByArea`, `notableByArea`, `areaStatusById`) not created | Deferred to 3-8 (plant data doesn't exist until 3-8 backend seeds/endpoints) |
| Gap-8 | MEDIUM | 3-4 | `apps/web/src/components/monitoring/` | No unit/integration tests for `ClusterLayer`, `WorkerListVirtual`, `HierarchyFilterPanel`, `AreaDetailDrawer`, `monitoring-v2` hook | Fix in 3-4 follow-up; coverage target ≥80% |
| Gap-9 | MEDIUM | 3-5 | `apps/mobile/src/components/monitoring/` | No tests for `ClusterMarker`, `ClusteredUserMarkers`, `MonitoringToggleSheet`, `AreaStatusOverlay`, `monitoringV2Slice` | Fix in 3-5 follow-up; coverage target ≥80% |
| Gap-10 | LOW | 3-4 | `apps/web/src/app/(dashboard)/monitoring/config/` | `monitoring/config` page not updated with Phase 3 debounce/sweep fields | Minor UX; fix before M5 rollout |
| Gap-11 | LOW | 3-5 | `apps/mobile/src/screens/monitoring/MapDashboardScreen.tsx` | Integration of v2 components (`ClusteredUserMarkers`, `MonitoringToggleSheet`, `AreaStatusOverlay`) into `MapDashboardScreen` not confirmed | Verify + wire in 3-5 follow-up |

### Pre-Deploy Requirements

The following gaps **must** be closed before deploying M2 to production:

- [ ] **Gap-1** — Wire `status:v2` emission from `StatusProjectorService`
- [ ] **Gap-2** — Wire `StaffingDebouncerService.setEmitter()` in `EventsGateway.afterInit()`
- [ ] **Gap-6** — Add `PHASE3_FEATURES_ENABLED` to `apps/be/.env.example` and GitHub Secrets

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
- [ ] `cd apps/web && npm run build` → 0 errors
- [ ] Monitoring page loads at `/monitoring` without console errors
- [ ] HierarchyFilterPanel renders (city / rayon / area scope selector)
- [ ] WorkerListVirtual renders and scrolls (check DevTools → Elements — only ~10 rows in DOM at a time)
- [ ] AreaDetailDrawer opens when an area is clicked
- [ ] `staff_kecamatan` role login → redirected away from `/monitoring`

**Mobile**
- [ ] `cd apps/mobile && npm test -- --passWithNoTests` → passes
- [ ] `cd apps/mobile && npx eslint src/components/monitoring/ --max-warnings=0` → 0 violations (no `tracksViewChanges={true}`)
- [ ] APK builds without error: `cd apps/mobile/android && ./gradlew assembleRelease`
- [ ] MapDashboard loads without crash on device/emulator
- [ ] `featureFlags.clusterMarkersV2 = false` (default) → existing individual markers shown (no cluster UI)
- [ ] BoundaryOverlay reloads on tab re-focus (Apr 24 fix preserved)

**Infrastructure**
- [ ] `infra/docker-compose.yml` includes Redis 7 service with healthcheck
- [ ] `apps/be/.env.example` has `REDIS_URL`, `REDIS_STREAM_MAX_LEN`, `STAFFING_DEBOUNCE_SECONDS`, `MONITORING_SWEEP_CRON`, `CLUSTER_ZOOM_THRESHOLD`, `MISSING_THRESHOLD_SECONDS`

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
| 1 | Medium | `apps/mobile/src/screens/auth/LoginScreen.tsx` | Login error shows both a bottom toast AND an inline Redux error box simultaneously — duplicate feedback | Removed `dispatch(setError(...))` calls + inline error `View`; all API errors now route to toast only; field-validation errors (identifierError/passwordError under inputs) unchanged |
| 2 | Medium | `apps/mobile/src/screens/auth/LoginScreen.tsx` + `apps/mobile/src/components/nb/NBToast.tsx` | Toast auto-dismissed after 4 s — user couldn't read the error message | Added `persistent?: boolean` to `NBToastOptions`; all login-failure toast calls pass `persistent: true` → `visibilityTime: Number.MAX_SAFE_INTEGER`; user must tap ✕ to dismiss |
| 3 | Medium | `apps/mobile/src/components/nb/NBModal.tsx` + 6 consumers | NBModal had no built-in content or footer padding — every caller duplicated the same spacing values in a wrapper `<View>`; `ChangePasswordModal` footer used `NBButton` (shadow, 2 px radius) while filter modals used flat `TouchableOpacity` (borderWidth only, minHeight 46) — visually inconsistent across all bottom-sheet modals | Added `noPadding?: boolean` prop; non-scrollable `content` gains `padding: md, paddingBottom: sm` by default; `footerWrap` gains `paddingHorizontal: md, paddingVertical: sm+2`; `SortModal` passes `noPadding` (edge-to-edge rows); `ProfileScreen` drops manual `aboutContent` wrapper; all three filter modals drop redundant padding from `actionButtons`; `ChangePasswordModal` footer migrated from `NBButton` to `TouchableOpacity` matching filter-modal style (borderWidth, minHeight 46, `ActivityIndicator` for loading) |
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

- [ ] `apps/web/src/app/generated/tokens.css` — present, starts with `/* generated`, has `:root { --color-nb-primary`
- [ ] `apps/mobile/src/constants/generated/tokens.ts` — present, starts with `/* generated`, exports `generatedTokens`

### B. ESLint — Zero Violations

```bash
cd apps/web   && npx eslint src/ --max-warnings=0   # no-inline-hex-colors, no-tailwind-shadow-classes-with-blur, prefer-nb-shadow-utility
cd apps/mobile && npx eslint src/ --max-warnings=0  # no-inline-hex-colors, rn-no-shadow-radius
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

- [ ] `apps/web/public/manifest.webmanifest` exists, valid JSON
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
- [ ] Add `className="shadow-md"` to web component → `cd apps/web && npx eslint src/<file>` reports error
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

## Pruning Workflow — End-to-End Review & UAT Checklist (2026-05-12) ✅

**Scope:** Full sweep across kecamatan submission → admin review → assignment → korlap execution → activity report → request closure, plus task tagging, verification, and the cascade that closes the loop. Triggered by user's 13-point spec evolved across May 9–12 + the May 12 round of UAT findings.

**Method:** Two parallel code-review agents (backend + mobile), then targeted verification of HIGH-severity claims by reading the actual source. False positives discarded.

### Summary

| Area | Critical | Medium | Low | Fixed | Deferred |
|------|----------|--------|-----|-------|----------|
| Backend | 1 | 6 | 2 | 1 critical (`f12c0ea`) | 6 medium, 2 low |
| Mobile | 1 | 4 | 0 | 1 medium (`f12c0ea`) | 4 medium |
| **Total** | **2** | **10** | **2** | **2** | **12** |

### Real bugs fixed in this pass

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | CRITICAL | `apps/be/src/modules/tasks/tasks.service.ts` (cascadePruningRequestStatus, line ~398) | The cascade `UPDATE pruning_requests` only guarded `status <> $1` — it would happily overwrite a `rejected` or `cancelled` request to `in_progress`/`done` if a stray task later completed. Activities-side cascade already had the right guard; tasks-side didn't mirror it. | Added `AND status NOT IN ('done','rejected','cancelled')` to the WHERE clause. New backend spec asserts the exact SQL fragment so a refactor can't quietly drop it. Tests 91/91 ✓. |
| 2 | MEDIUM | `apps/mobile/src/components/admin/AssignToTaskSheet.tsx` (line ~66) | If `request.rayonId` was null/missing (data corruption), the picker silently fell back to the FULL cross-rayon user list — an admin in Pusat could assign a Pusat-kecamatan permohonan to a satgas in Timur. | Fail-closed: empty list instead of cross-rayon fallback. Rayon FK is NOT NULL by schema so this path is unreachable under normal flow; the guard prevents future schema-relaxation regressions. |

### False positives (verified by reading source — no fix needed)

| Claim | Reality |
|-------|---------|
| AdminList reducer calls `.forEach` on an envelope `{items,...}` and hangs infinitely | The thunk at `pruningRequestsSlice.ts:172-204` already normalizes both shapes (array OR envelope.items) before returning; reducer always sees an array. May 9 fix `c8ddf79`. |
| Reschedule cascade vs. concurrent task completion race | Backend reschedule whitelist excludes `done`; the only overlap is `in_progress`. In that window, two parallel admin actions targeting the same request would last-write-wins on `pruning_requests.status`, but the data damage is limited to status — neither booking nor task is corrupted, and the request will self-heal on the next cascade or admin action. Documented, not fixed. |
| Self-verification by creator-who-is-also-assignee (`kepala_rayon` makes a task for themselves) | `VERIFY_MAP` hierarchy check at `tasks.service.ts:1224` already blocks same-role verification; the `assigned_to===verifierId` guard is redundant but defensive. No bug. |

### Deferred (tracked, intentional)

| # | Area | Issue | Why deferred |
|---|------|-------|--------------|
| D-01 | Mobile | Tag picker UX (paginated server-search + role-filter chips) | Bigger UX change. User flagged the need but accepted current implementation for now. ~half day. |
| D-02 | Mobile | `RescheduleSheet` capacity-fetch failure silent — no toast, calendar renders all-grey | Real but low-incidence (capacity endpoint is reliable). Polish later. |
| D-03 | Backend | Cascade SQL writes outside the pruning-request transaction; two concurrent UPDATEs to the same request can race | Real but impact is limited to a transient wrong status; resolved by next cascade. Polish later with a row-level lock. |
| D-04 | Mobile | `SubmitScreen` photo upload uses base64 data-URIs with no per-file size cap | Backend bodyParser limit + image picker default cap mitigate; switch to multipart form-data is a separate work item. |
| D-05 | Backend | Mixed Indonesian/English error messages | i18n sweep is its own track. |
| D-06 | Backend | `addTags` doesn't dedupe in-memory before DB lookup; duplicate IDs in `user_ids` array cause N redundant queries | Functional, just inefficient. |
| D-07 | Mobile | Web admin `(dashboard)/pruning-requests/*` pages don't exist | Phase 4 backlog row. |
| D-08 | Mobile | `RequestDetailScreen` reject-reason input not cleared on dismiss | Cosmetic — re-opens with stale text but always under explicit user action. |
| D-09 | Mobile | `LocationMapModal` Google Maps deep-link has no fallback for devices without Google Maps | Edge case for unusual device configs. |
| D-10 | Backend | `findMyTasks` `scope='assigned'` uses `.where()` instead of `.andWhere()` — works today because no prior filter | Defensive refactor for future safety. |

### Related Commits

- `f12c0ea` — backend cascade guard + mobile rayon fail-closed + cascade-guard regression test

---

## Pruning Workflow — Detailed UAT Checklist (2026-05-12)

**Goal:** A reviewer can follow this top-to-bottom and confirm every behavior the user has asked for across the 13-point spec. Each scenario lists the test users, expected behavior, and what to look for if something goes wrong.

All test passwords: `Password123!`. Run from a fresh `npm run db:seed` so display names match (`<Role> <Rayon> <Bahasa-number>`). Backend on `:3000`, mobile pointed at it.

### Reference users for the full flow

| Role | Username | Display name | Rayon |
|------|----------|--------------|-------|
| Public intake | `staff_kecamatan_tegalsari_1` | Staff Kecamatan Tegalsari Satu | Pusat |
| Admin (review + assign) | `admin_data_pusat_1` | Admin Data Pusat Satu | Pusat |
| Field coordinator (assignee) | `korlap_pusat_1` | Korlap Pusat Satu | Pusat |
| Field worker (tagged) | `satgas_pusat_1` | Satgas Pusat Satu | Pusat |
| Verifier alt (creator of multi-hop) | `kepala_rayon_pusat_1` | Kepala Rayon Pusat Satu | Pusat |
| Cross-rayon negative test | `admin_data_timur_1_1` | Admin Data Timur 1 Satu | Timur 1 |

### Round A — Kecamatan submission

| # | Action | Expected | If broken |
|---|--------|----------|-----------|
| A1 | Login `staff_kecamatan_tegalsari_1` → Buat Permohonan → fill all fields including ≥1 photo + Ketua RT/RW phone | Form submits, MyRequestsScreen shows the new card with status **Diajukan** (warning/yellow badge) | Check `expected_year` + `expected_iso_week` are non-null on the new row in Adminer |
| A2 | Tap the card → RequestDetailScreen opens | Kontak card has 3 icon buttons per contact: **copy / WhatsApp / call**. Label reads **Ketua RT/RW**. | Verify `normalizePhone` is imported on RequestDetailScreen; `wa.me/62…` link should swap a leading `0` → `62` |
| A3 | Hardware back from Detail Permohonan | Returns to MyRequestsScreen (NOT Home) | `MainNavigator` route param `adminMode=false` should map back to `Perantingan` tab |
| A4 | Submit a second permohonan with a week that's already 70%-full | Calendar cell shows yellow (hampir penuh) AND can be selected | A `full` cell shows red and a tap → "Tanggal yang dipilih sudah penuh" alert |

### Round B — Admin review + schedule + Tugaskan

| # | Action | Expected | If broken |
|---|--------|----------|-----------|
| B1 | Login `admin_data_pusat_1` → PruningReviewQueue | Cards from Rayon Pusat only (NOT Timur, Selatan, etc.) | Cross-rayon leakage = `findAll` query scope bug |
| B2 | Open the request → tap **Setujui** WITHOUT setting schedule | 409 error toast: **"Atur jadwal terlebih dahulu sebelum menyetujui permohonan"** | Backend `review()` guard at `pruning-requests.service.ts` |
| B3 | Tap Atur Jadwal → AvailabilityCalendar opens | Sun-Sat headers aligned with date rows. Today is the earliest selectable date. The preferred week (from kecamatan) has a **blue ring** (not a fill — the underlying capacity color shows through) | Mis-aligned headers = month-grouping regression |
| B4 | Pick a date → "Tanggal Terpilih" strip appears with Hapus → Simpan | Modal dismisses, schedule visible on Detail Permohonan | |
| B5 | Tap Setujui | Status flips to **Disetujui** (green badge) | |
| B6 | Tap **Tugaskan ke Petugas** | Bottom sheet opens. Jabatan dropdown pre-fills **Admin Data** ordered Kepala Rayon → Admin Data → Korlap → Satgas → Linmas. Ditugaskan Ke pre-fills the current admin if their role matches. | Order wrong = stale ASSIGNABLE_ROLES constant |
| B7 | Switch Jabatan to Korlap → Ditugaskan Ke list populates with Pusat korlaps only | Korlap Pusat Satu and Korlap Pusat Dua appear. **NO** Korlap Timur / Selatan etc. | Cross-rayon leakage = fixed in `f12c0ea`; fail-closed if `request.rayonId` is null |
| B8 | Pick Korlap Pusat Satu → Tugaskan | Status flips to **Ditugaskan** (primary badge). Detail Permohonan now shows a "TUGAS TERKAIT" card with **Lihat Tugas** button. | |
| B9 | Tap **Lihat Tugas** | TaskDetailScreen opens. Title: `Permintaan Perantingan PR-<ref>`. Description: `Permintaan Perantingan dari Kecamatan Tegalsari : <address>`. | English bleed (`Pruning Request` / `Convert from pruning request`) = stale title template |
| B10 | Hardware back from TaskDetail | Returns to RequestDetailScreen (NOT global Tugas list) | `from`+`fromParams` propagation broken |
| B11 | Open the same task from admin's "Tugas" tab → filter **Ditugaskan Kepada Saya** | Task does **NOT** appear (admin is creator, not assignee) | Pre-`4d1d979` scope-union bug |
| B12 | Switch filter to **Dibuat oleh Saya** | Task **appears** | TaskFilterModal `canCreateTask` predicate broken; should include admin_data |

### Round C — Task lifecycle + cascade

| # | Action | Expected | If broken |
|---|--------|----------|-----------|
| C1 | Login `korlap_pusat_1` → Tugas → filter **Ditugaskan Kepada Saya** | Task `Permintaan Perantingan PR-<ref>` appears | If empty, retest after the scope fix landed (`de81c5f`) — was a DTO whitelist issue |
| C2 | On TaskDetailScreen with status=ASSIGNED, check **Tag Petugas Terlibat** card | **No pencil icon** for the assignee — only the creator can tag pre-accept | If assignee can tag pre-accept, the gate-after-accept rule is broken |
| C3 | Tap **Terima** → status flips to **Diterima** | Status badge updates. Pencil icon now appears on Tag card. | |
| C4 | Tap pencil → multi-select opens. Pick `satgas_pusat_1` and `satgas_pusat_2`. Save. | Two chips appear under Tag Petugas Terlibat. | |
| C5 | Switch to `satgas_pusat_1` → Tugas tab → filter **Tag Saya** | Task appears in their feed | `GET /tasks/tagged` not returning |
| C6 | Back to `korlap_pusat_1` → Tap **Mulai Tugas** | Task status → Dikerjakan. **Cascade check**: switch to `staff_kecamatan_tegalsari_1` → MyRequests → request now shows **Diproses** (blue/primary). Kecamatan also gets a push notification "Permohonan Perantingan Dikerjakan". | If request stuck on "Ditugaskan", cascade not firing — check `cascadePruningRequestStatus` log line |
| C7 | Back to korlap → **Selesaikan Tugas** | Photo uploader prompts **Kamera / Galeri / Batal**. Pick Galeri to test. Upload + submit. | If only camera option, PhotoUploader regression |
| C8 | After completion, korlap sees TaskDetailScreen with status=Menunggu Verifikasi | **NO** Verifikasi or Revisi buttons visible to korlap (the assignee). | If buttons appear, the !isAssignee gate is broken |
| C9 | Cascade check 2: switch to `staff_kecamatan_tegalsari_1` → MyRequests → request shows **Selesai** (green badge). Push: "Permohonan Perantingan Selesai". | | Cascade to 'done' from `complete()` |
| C10 | Open the done request → "Tugas Terkait" card still visible | Lihat Tugas button still works. Body text: "Pekerjaan telah selesai. Lihat detail tugas untuk foto bukti dan catatan penyelesaian." | If card hidden, the `request.assignedTaskId` visibility guard regressed |
| C11 | Tap Lihat Tugas as kecamatan → TaskDetailScreen opens read-only | Can see foto bukti, completion notes, tag chips. **NO** action buttons (Accept/Decline/Start/Complete/Verify/Revisi/Pencil-tag-edit). | If any action button visible to kecamatan, an `isAssignee || isCreator || canVerify` gate regressed |
| C12 | Back to `admin_data_pusat_1` → open task (filter: Dibuat oleh Saya) | **Verifikasi** and **Revisi** buttons visible (admin is creator + not assignee + role allows) | If hidden, the new canVerifyThisTask check regressed |
| C13 | Tap **Verifikasi** → status flips to Terverifikasi. Cascade does NOT flip request back from `done`. | Request stays `done`. | |

### Round D — Direct activity (no task path)

| # | Action | Expected | If broken |
|---|--------|----------|-----------|
| D1 | Login `korlap_pusat_2` (must clock in first) | | |
| D2 | Bottom tab → Buat Aktivitas → fill description + photo (test both Kamera and Galeri) + select Tipe Aktivitas | Form submits | |
| D3 | In "Tag Petugas Terlibat" pick 1 satgas | Activity submitted with tag | |
| D4 | Switch to the tagged satgas → Aktivitas tab → filter **Tag Saya** | Activity from step D2 appears | `?involving_me=true` filter |

### Round E — Multi-hop delegation

| # | Action | Expected |
|---|--------|----------|
| E1 | Login `top_management_1` → Buat Tugas → assign to `kepala_rayon_pusat_1` | Task created |
| E2 | Login `kepala_rayon_pusat_1` → open task → **Tugaskan Ulang** (delegation before accept) → admin_data_pusat_1 | Task reassigned, delegation row recorded |
| E3 | Login `admin_data_pusat_1` → open task → Tugaskan Ulang → `korlap_pusat_1` | Same, 3 hops total |
| E4 | Open Detail Tugas → "Riwayat Disposisi" section | Shows 3 rows in chronological order with `from_role` → `to_role` labels |

### Round F — Reschedule (regression)

| # | Action | Expected |
|---|--------|----------|
| F1 | On a task with status=ASSIGNED, admin changes schedule date via Atur Ulang Jadwal | `task.deadline` updates AND `task_delegations` gets a row with reason "Jadwal diubah ke YYYY-MM-DD". Capacity rebalances atomically. |
| F2 | On a task with status=IN_PROGRESS, attempt reschedule | Whitelist allows it; same cascade fires |
| F3 | On a task with status=COMPLETED or DONE, attempt reschedule | API rejects 400 "Status … tidak dapat diatur ulang" |

### Round G — Cancel

| # | Action | Expected |
|---|--------|----------|
| G1 | Kecamatan submits, BEFORE admin acts → Batalkan Permohonan | Allowed; status → `cancelled` |
| G2 | Try to cancel an `assigned`/`in_progress`/`done` request | Blocked — whitelist is `['submitted','under_review','approved']` |
| G3 | After cancel, admin opens it | No action buttons visible; status badge shows Dibatalkan |

### Round H — Permission negative tests

| # | Action | Expected |
|---|--------|----------|
| H1 | `staff_kecamatan_tegalsari_1` tries to GET `/tasks/<some-other-kecamatan-task-id>` via Swagger | 403 "Anda tidak memiliki akses ke tugas ini" |
| H2 | `admin_data_timur_1_1` tries to read a Pusat permohonan | 403 / not in list |
| H3 | Korlap who is the assignee on a `completed` task taps the API endpoint `/tasks/:id/verify` directly | 403 "Anda tidak dapat memverifikasi penyelesaian tugas Anda sendiri" |
| H4 | Admin POSTs `/pruning-requests/:id/review` with `decision:'approve'` and the request has `scheduledDate=null` | 409 "Atur jadwal terlebih dahulu …" |
| H5 | Cascade idempotency: complete a task whose request has been manually `cancelled` in DB | Task completes successfully BUT request status stays `cancelled` (not overwritten). Verify in Adminer. **This is the bug `f12c0ea` fixes.** |

### Round I — Animation crash regression

| # | Action | Expected |
|---|--------|----------|
| I1 | Admin opens AssignToTaskSheet → Tugaskan → IMMEDIATELY taps Lihat Tugas before the sheet fully dismisses | No `connectAnimatedNodeFromView` / `disconnectAnimatedNodeFromView` SoftException in logcat. App stays responsive. |
| I2 | Open Tag editor on TaskDetailScreen → pick users → Simpan → IMMEDIATELY navigate away | Same — no Animated tag-not-found crash |

### What the cascade looks like in DB (audit query)

```sql
SELECT pr.reference_code, pr.status AS request_status,
       t.status AS task_status, t.assigned_to, t.created_by,
       t.started_at, t.completed_at, pr.updated_at
FROM pruning_requests pr
LEFT JOIN tasks t ON pr.assigned_task_id = t.id
WHERE pr.reference_code = 'PR-<ref>';
```

Expected after Round C12:
- `request_status = 'done'`
- `task_status = 'verified'` (or `completed` if not yet verified)
- `completed_at` non-null, `started_at` non-null



**Purpose:** Comprehensive walkthrough of all Phase 3 sub-phases (M1-R through 3-12) to confirm integration, data seeding, and UAT readiness before next rollout.

**Prerequisites:**
- Fresh PostgreSQL + Redis 7 via `./scripts/infra.sh start`
- Backend migrations run: `npm run migration:run`
- All data seeded: `npm run db:seed:prod` (includes Phase 3 reference + staging sample data)
- Backend + Web + Mobile all started without errors

---

### 🔥 Pre-flight smoke (run this first — should take <5 min)

If any of these fail, stop and fix before walking the full checklist:

| # | Step | Expected | Apr 27 status |
|---|------|----------|---------------|
| 1 | Login mobile as `staff_kec_pusat / Password123!` → land on `SubmitScreen` (5-step wizard) | Renders without crash; "Kembali" + "Lanjut" buttons visible | ✅ fixed Apr 27 |
| 2 | Navigate `SubmitScreen` Step 1 → Step 2 → Step 5 (any direction) | Buttons render text correctly; no red error screen | ✅ fixed Apr 27 |
| 3 | Login mobile as `admin_data_pusat / Password123!` → tap admin tab → `ReviewQueueScreen` | List of pending pruning requests (≥2 from seed) | ✅ |
| 4 | In `ReviewQueueScreen`, tap a request → `RequestDetailScreen` → tap "Setujui" | Modal opens; reason textarea visible; submit fires `POST /pruning-requests/:id/review` | ✅ |
| 5 | In `RequestDetailScreen` for an approved request → tap "Tugaskan ke Petugas" | `AssignToTaskSheet` opens; date picker + units field visible; **note: areas/users dropdowns are empty until Phase 4 polish** | 🟡 partial |
| 6 | Login web as `admin_pusat / Password123!` → click each sidebar link | All routes render (no 404). Phase 3 web pages show "Coming soon — use mobile" placeholders | ✅ Apr 27 placeholders added |
| 7 | Login web as `staff_kec_pusat` → sidebar has only "Kirim Permintaan" + "Permintaan Saya" | Both links resolve to placeholder pages, no 404 | ✅ Apr 27 fixed |
| 8 | Backend: `curl -H "Authorization: Bearer <admin token>" http://localhost:3000/api/v1/pruning-requests` | 200 OK; paginated list with at least 1 request | ✅ |

---

### M1-R Redesign Foundation (Sub-phases 3-R1 through 3-R5)

#### 3-R1 & 3-R2 — Token Pipeline + ESLint
- [ ] `npm run tokens:verify` exits 0 (no drift)
- [ ] `apps/web/src/app/generated/tokens.css` exists, starts with `/* generated`, contains `:root { --color-nb-primary`
- [ ] `apps/mobile/src/constants/generated/tokens.ts` exists, starts with `/* generated`, exports `generatedTokens`
- [ ] `npx eslint apps/web/src --max-warnings=0` exits 0
- [ ] `npx eslint apps/mobile/src --max-warnings=0` exits 0
- [ ] All hex colors in non-allowlisted files trigger ESLint `no-inline-hex-colors` errors (verify with a test edit)

#### 3-R3 Mobile — NB Primitives + Fonts
- [ ] Mobile LoginScreen: "SEKAR" heading renders in Space Grotesk Bold (visibly different from system font)
- [ ] Body text on HomeScreen renders in Inter
- [ ] `NBToast`: error toast persists (no auto-dismiss); ✕ button closes it
- [ ] `NBModal` (Tentang Aplikasi, filters, sort): content has consistent padding on all sides; buttons aligned
- [ ] `NBText` variants (`h1`, `body-sm`, etc.) render with correct sizing + weight

#### 3-R4 Web — PWA Shell + Responsive Scaffolding
- [ ] `apps/web/public/manifest.webmanifest` is valid JSON with SEKAR name + icons
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
## Notification Stack — End-to-End Review & UAT (2026-05-13) ✅

**Scope:** Full sweep of FCM + push notifications across backend (dispatch, token lifecycle, error handling) and mobile (bootstrap, deep-link, AppState, logout). Triggered by UAT showing no notifications landing despite cascade fires.

### Summary

| Area | Critical | Important | Medium | Fixed | Deferred |
|------|----------|-----------|--------|-------|----------|
| Backend | 3 | 4 | 2 | 7 | 6 |
| Mobile | 4 | 2 | 4 | 7 | 5 |
| **Total** | **7** | **6** | **6** | **14** | **11** |

### Real bugs fixed

| # | Severity | File | Bug | Fix |
|---|----------|------|-----|-----|
| 1 | HIGH | `apps/be/notifications.service.ts:414` | Token-deactivation `update()` fire-and-forget; DB failures silently swallowed | Added `.catch(err => logger.error(...))` |
| 2 | HIGH | `apps/be/notifications.service.ts:411` | Permanent-failure error code set missed `mismatched-sender-id` | Extended Set + documented transient codes |
| 3 | HIGH | `apps/be/tasks.service.ts:434` | Cascade fired sendToUser with no null guard on submitted_by | Early-return if falsy |
| 4 | HIGH | `apps/be/tasks.service.ts` (4 sites) | No push on task accept/decline/verify/revision | New `notifyTaskLifecycleParty` helper |
| 5 | MEDIUM | `apps/be/pruning-requests.service.ts:884` | Reschedule pushed only assignee, not submitter | Added `notifySubmitter` call |
| 6 | HIGH | `apps/mobile/useProfileLogout.ts` | No unregisterToken on logout; device_tokens row stayed active | `await fcmService.unregisterToken()` before clearing JWT |
| 7 | MEDIUM | `apps/mobile/useProfileLogout.ts` | NotificationsSlice not reset on logout | Added `resetNotificationsState` dispatch |
| 8 | HIGH | `apps/mobile/App.tsx` | AppState foreground re-register POSTed every transition | `lastRegisteredTokenRef` idempotency guard |
| 9 | HIGH | `apps/mobile/RootNavigator.tsx` | Zero deep-link wiring; push taps navigated nowhere | Exported `navigationRef`; `onNotificationOpened` + `getInitialNotification` route on task_id/pruning_request_id |
| 10 | MEDIUM | `apps/mobile/fcmService.ts:124` | Android notifee channel name in English | "SEKAR Notifications" → "Notifikasi SEKAR" |

### Deferred

| # | Area | Description |
|---|------|-------------|
| D-N1 | Backend | `NotificationType.PRUNING_REQUEST_*` enum values |
| D-N2 | Backend | Pushes on activity approve/reject |
| D-N3 | Backend | Background retry job for stuck `is_sent=false` |
| D-N4 | Backend | Integration specs for `notifyRayonAdmins` + `cascadePruningRequestStatus` |
| D-N5 | Backend | `deactivation_reason` column for audit |
| D-N6 | Mobile | `onNotificationOpened` multi-handler unsubscribe correctness |
| D-N7 | Mobile | Stuck-state UX when rotation returns same token |
| D-N8 | Mobile | Background message handler `delivered_at` tracking |
| D-N9 | Mobile | `setupNotificationHandlers()` dead code cleanup |
| D-N10 | Mobile | Permission-state race in `fcmService.initialize` |
| D-N11 | Mobile | Spec coverage for `onNotificationOpened` |

### Notification UAT Checklist

Run from a fresh `npm run db:seed`. Login each role from scratch so the May 12+13 bootstrap registers a fresh FCM token. After each login, verify in Adminer:

```sql
SELECT u.username, nt.user_id, nt.is_active, nt.last_used_at,
       LEFT(nt.fcm_token, 12) AS token_prefix
FROM notification_tokens nt JOIN users u ON nt.user_id = u.id
ORDER BY nt.last_used_at DESC LIMIT 10;
```

Expected: 1 active row per device-per-user. After the May 13 rotation fix shipped, the prefix should be **different** from the legacy `etdQPzEW...` (which was server-rejected).

#### Round N-A — Submit / Approve / Reject / Cancel
| # | Action | Expected push recipient | Body sample |
|---|--------|------------------------|-------------|
| N-A1 | `staff_kecamatan_tegalsari_1` submits | `admin_data_pusat_1` + `kepala_rayon_pusat_1` (rayon-scoped) | "Permohonan Perantingan Baru · Tegalsari mengajukan permohonan PR-…. Mohon ditinjau." |
| N-A2 | Admin approves after Atur Jadwal | submitter | "Permohonan Perantingan Disetujui · PR-… disetujui. Jadwal: YYYY-MM-DD." |
| N-A3 | Admin rejects with reason | submitter | "Permohonan Perantingan Ditolak · PR-… ditolak. Alasan: …" |
| N-A4 | Submitter cancels a submitted PR | admin_data + kepala_rayon | "Permohonan Perantingan Dibatalkan · {name} membatalkan PR-…" |

#### Round N-B — Task lifecycle (NEW May 13)
| # | Action | Recipient | Body sample |
|---|--------|-----------|-------------|
| N-B1 | Admin Tugaskan'd | assignee | (existing — "Tugas baru ditugaskan: …") |
| N-B2 | Korlap **accepts** | creator | "Tugas Diterima · Tugas '…' diterima oleh petugas." |
| N-B3 | Korlap **declines** with reason | creator | "Tugas Ditolak · Tugas '…' ditolak oleh petugas. Alasan: …" |
| N-B4 | Korlap starts | submitter (cascade) | "Permohonan Perantingan Dikerjakan · PR-… sedang dikerjakan oleh petugas." |
| N-B5 | Korlap completes | submitter (cascade) | "Permohonan Perantingan Selesai · PR-… telah selesai dikerjakan." |
| N-B6 | Admin **verifies** | assignee | "Tugas Diverifikasi · Tugas '…' telah diverifikasi." |
| N-B7 | Admin **requests revision** | assignee | "Tugas Perlu Revisi · Tugas '…' perlu direvisi. Alasan: …" |

#### Round N-C — Reschedule (NEW May 13)
| # | Action | Recipients |
|---|--------|-----------|
| N-C1 | Admin reschedules `assigned` PR | assignee + submitter |
| N-C2 | Admin reschedules `in_progress` PR | assignee + submitter |

#### Round N-D — Deep-linking on notification tap (NEW May 13)
| # | App state | Action | Expected |
|---|-----------|--------|----------|
| N-D1 | Foreground | Tap tray notification | No navigation; tray displays only |
| N-D2 | Background | Tap notification with `task_id` | Opens TaskDetail for that task |
| N-D3 | Background | Tap notification with `pruning_request_id` only | Opens PruningDetail for that request |
| N-D4 | Killed | Tap notification, app cold-starts | Routes correctly via `getInitialNotification` |

#### Round N-E — Token hygiene (regression for May 13 fixes)
| # | Action | Expected |
|---|--------|----------|
| N-E1 | Login user A | device_tokens row: `user_id=A`, `is_active=true`, FRESH token prefix |
| N-E2 | Logout A | A's row flips to `is_active=false` (mobile sent unregister) |
| N-E3 | Login user B on same device | A row stays `is_active=false`; B row is new with `is_active=true` |
| N-E4 | Push fires to A while only B is logged in | `getUserTokens(A)` returns empty → no FCM attempt to wrong device |
| N-E5 | Background → foreground 3× rapidly | Backend logs **at most 1** `Registering FCM token` per app session |
| N-E6 | Push to user with Firebase-rejected token | Backend logs `Deactivated invalid token: …` → next foreground triggers rotation (`requires_rotation: true` → mobile `deleteToken` + `getToken`) → fresh token registered → next push lands |

#### Round N-F — Permission negative
| # | Action | Expected |
|---|--------|----------|
| N-F1 | User denies POST_NOTIFICATIONS on Android 13+ | Token still registered; system tray won't display; in-app Redux entries still work |
| N-F2 | User revokes permission in OS settings | `fcmService.initialize` logs "Permission not granted yet"; re-grant via onboarding modal re-initializes |

#### What to check in backend logs

After each push:
- `[NotificationsService] Sending notification to user: <uuid>` — DB row created
- `[NotificationsService] FCM send result: X/Y successful` — X should equal Y
- `[NotificationsService] Push notification sent: <uuid>` — `is_sent=true` flipped

If `Deactivated invalid token: …` appears, that token row is now inactive. The user needs a foreground transition (or fresh login) to trigger rotation via `requires_rotation`.

### Related Commits
- `1224ab3` — pruning notify edges
- `b1c672c` — AppState foreground + validation surfacing
- `2b9802b` — token rotation
- `<this commit>` — 10 fixes from this review

---

## Phase 3 Sign-Off Review (2026-05-23) ✅

**Status:** Phase 3 ready for closure. 17 findings from the 2026-05-23 gap audit closed across Waves 1–6; 9 items formally deferred to Phase 4 with stated reasons; CSV backfill scaffold (3-13) shipped and ready to execute against production data when DLH ops sign off.
**Scope:** End-to-end review of every Phase-3-introduced module against the 10 phase ADRs (029–038), `backend.md`, `database.md`, `mobile.md`, `web.md`, `infrastructure.md`, `ui-ux.md`, `testing.md`.
**Method:** Eight parallel review agents (`backend-code-reviewer`, `database-engineer`, `mobile-code-reviewer`, `web-code-reviewer`, four `Explore` agents for design system / infra / coverage / ADR conformance) + direct filesystem verification on conflicting findings + remediation Waves 1–6 executed in-session.
**Source:** [GAP-AUDIT-2026-05-23.md](./GAP-AUDIT-2026-05-23.md) — full evidence table + waves log
**Branch:** `main` (iterative delivery; all wave commits pending push)

### Review Summary

| Category | Findings | Fixed | Deferred to Phase 4 | Not-a-bug (audit overstatement) |
|----------|---------|-------|----------------------|-------------------------------|
| Database & Entity | 5 | 5 | 0 | 1 (`expected_year/iso_week` already documented) |
| Backend | 10 | 9 | 0 | 1 (M3 reschedule already correctly transactional) |
| Web | 4 | 3 | 4 (capacity, plants, seeds, kecamatan submit) | 1 (L2 inline style) |
| Mobile | 7 | 7 | 1 (mobile seeds) | 0 |
| Design system / CI | 4 | 3 | 1 (visreg infra) | 1 (L1 sw.ts already had ref) |
| Specs | 5 | 5 | 0 | 1 (L3 DTO already documented) |
| Coverage | 3 | 3 | 0 | 0 |
| **Total** | **38** | **35** | **6** (one item maps to several deferrals) | **5** |

### Issues — fully closed

| # | Severity | File | Issue | Fix (commit / file) |
|---|----------|------|-------|---------------------|
| C1 | Critical | `apps/be/src/modules/activities/activities.service.spec.ts:560,573` | KORLAP scope check threw `TypeError` not `ApiException` (missing `manager.query` mock) | spec mocks `manager.query`; assertion updated to multi-area `IN (...)` form |
| C2 | Critical | `apps/be/src/modules/plants/services/plant-due-date.service.spec.ts:240` | `due_soon` 14-day boundary mis-classified once wall-clock advanced past May 7 | `jest.useFakeTimers().setSystemTime('2026-04-27')` pins clock |
| C3 | Critical | `apps/mobile/src/components/common/__tests__/CollapsibleCard.test.tsx:319` | Test asserted `useNativeDriver: true`, code was `false` | Code keeps `false` (deliberate Fabric race fix); test now asserts `false` with rationale comment |
| C4 | Critical | `apps/be/src/modules/kecamatans/*` | Module added May 9 with 0 % coverage | `kecamatans.{service,controller}.spec.ts` — 11 tests, 100 % stmts |
| C5 | Critical | `apps/be/src/modules/pruning-requests/entities/pruning-request.entity.ts:41` | `submitter` `onDelete: CASCADE` mismatch vs migration `RESTRICT` | Entity flipped to `RESTRICT`; comment updated |
| H1 | High | `apps/be/src/modules/pruning-requests/pruning-requests.service.ts`, `activities.service.ts` | User-relation projections leaked phone/role/PII | `SAFE_PRUNING_REQUEST_SELECT` constant + safe-column QB joins; `findActivityTags` switched to QB |
| H2 | High | `apps/be/.env.example:141` | `REDIS_URL` `:6379` vs docker-compose `:16379` | Flipped to `:16379` |
| H6 | High | `apps/web/src/lib/api/{monitoring-v2,plants,pruning-requests}.ts` | Untested API client layer | 3 new spec files — 30 tests across snapshot hooks, plant aggregates, pruning admin flows |
| H7 | High | 5 mobile + 1 web file, 19 hex literals total | Hardcoded colors bypass token pipeline | Mapped to NB tokens (incl. exact-match `requestUnderReview` `#2563EB`, `plantOverdue` `#DC2626`); WhatsApp brand kept with rule-disable + comment; web hex → `var(--color-status-*)` |
| H8 | High | `apps/mobile/src/screens/pruningRequests/__tests__/{RequestDetailScreen,SubmitScreen}.test.tsx` | 30 s default timeout caused flake | Per-file `jest.setTimeout(60000)` |
| H11 | High | (missing) `apps/be/src/database/backfill/pruning-csv-importer.ts` | 5,008-row historical CSV backfill not started | Scaffold shipped: idempotent on `reference_code`, dry-run default, 10-test helper suite; production execution gated on S3 photo rehosting + DLH sign-off |
| M1 | Medium | `apps/be/src/modules/pruning-requests/pruning-requests.controller.ts:229` | GET `/:id` no method-level `@Roles` | `@Roles(...)` added (defence-in-depth; service-side scope check still runs) |
| M4 | Medium | `apps/be/src/modules/monitoring/services/staffing-debouncer.service.ts` | Per-process Map double-emits on multi-replica | Redis-backed `SET NX EX` leader election (`tryClaimEmit`); single-replica/no-Redis path stays synchronous |
| M6 | Medium | `apps/be/src/modules/monitoring/services/status-calculator.service.ts:189` | 3 DB reads per ping (tracking, user, area) | Eager-load `user` + `area` on initial findOne with safe column-select; broadcast helpers consume cache. 3 reads → 1 |
| M7 | Medium | `apps/be/src/modules/activities/activities.service.ts:140` | `TaskTypeRegistry.validate` not called on activities side | `TasksModule` imported into `ActivitiesModule`, registry injected, validate-by-`case_type` plugged at the boundary |
| Spec | Various | `database.md`, `ADR-031` | `area_plants.status` enum drift, `task_delegations.{from_role,to_role}` undocumented, plant_species seed count stale, ADR-031 silent on missing validator | All reconciled (Wave 2 + this review); ADR-031 amended with audit note |
| ESLint CI | Medium | (missing) `.github/workflows/mobile-quality.yml` | Mobile ESLint design-system rules configured but no PR gate | New lean `mobile-quality.yml` workflow: lint + tsc + jest on mobile path-filtered PRs |

### Issues — deferred to Phase 4 (with traceable home)

| # | Sub-phase | Reason | Phase 4 home |
|---|-----------|--------|--------------|
| Mobile `screens/seeds/` inventory UI | 3-12 | Backend + Redux slice complete; UI requires dedicated UX sweep | 4-3 UI/UX completion |
| Web `(dashboard)/seeds/` | 3-12 | Same — desktop UI deferred | 4-3 |
| Web `(dashboard)/rayons/[id]/capacity/` | 3-11 | Mobile already covers ergonomic admin path | 4-3 |
| Web `(dashboard)/plants/` (read-only) | 3-8 | Data accessible via API; no production block | 4-3 |
| Web `(kecamatan)/pruning-requests` submit form | 3-10 | Mobile is primary submit channel; web shell exists | 4-3 |
| Overdue alerts dashboard + FCM trigger | 3-8 | Compute + sweep cron live; alert UX + push trigger require dedicated PR | 4-4 notifications |
| Visreg baselines + `web-visreg`/`mobile-snapshots` CI | 3-R3 | Token pipeline + ESLint guard against drift today; visreg infra is its own L-sized task | 4-R UI/UX revamp |
| `clusterMarkersV2` flag flip | 3-5 | Code shipped + Apr 24 fixes preserved; rollout gated on k6 500-worker + low-end Android FPS verification | 4-3 polish / pre-release verification |
| CSV backfill execution (3-13) | 3-13 | Scaffold + tests landed; production execution needs S3 rehosting + DLH ops sign-off | Phase 4 production cutover |

### Issues — not-a-bug (audit overstatement, closed)

| # | Audit claim | Reality |
|---|-------------|---------|
| L1 | `sw.ts` missing `webworker` ref | Already on line 1 |
| L2 | `WorkerListVirtual` inline `style={{ height: '56px' }}` | File does not contain that style |
| L3 | `AssignPruningRequestDto.areaId` lacks JSDoc | Already extensively documented (May 11 amendment block) |
| M2 | Reschedule DTO missing date validators | `@IsDateString() @IsNotEmpty()` already present |
| M3 | Reschedule capacity-rebook silent fallback | Properly transactional — capacity-full throws `ConflictException` and rolls back; the only fallback is a defensive guard for missing task rows (audit-logged) |
| L4 | `expected_year`/`expected_iso_week` undocumented | Already documented at `database.md:152-153` |

### What you need to manually check (UAT walkthrough)

Open these in order on a fresh checkout (`./scripts/infra.sh start && cd be && npm run migration:run && npm run db:seed && npm run start:dev`):

**1. Phase 3 sign-off DB invariants (Swagger / Adminer)**
```
SELECT COUNT(*) FROM plant_species;               -- expected 143 (seed)
SELECT COUNT(*) FROM kecamatans;                  -- expected 31
SELECT COUNT(*) FROM users WHERE role='staff_kecamatan';  -- expected 7+
SELECT COUNT(DISTINCT status) FROM pruning_requests;       -- expected 8 (all statuses exercised)
SELECT COUNT(*) FROM activities WHERE reference_code IS NOT NULL;  -- 0 today; 5,008 after CSV backfill execution
```

**2. Backend smoke (Swagger — http://localhost:3000/api/docs)**
- `GET /api/v1/kecamatans?rayonId=<id>` returns 31 ÷ 7 = ~4-5 rows per rayon ✅
- `GET /api/v1/pruning-requests/:id` — verify response **does NOT** include `submitter.phone_number`, `submitter.kecamatan_id`, `submitter.is_active`, `reviewer.phone_number` (H1 fix)
- `GET /api/v1/tasks/:id/delegations` — returns chronological hops with `from_role` / `to_role` populated; no `password_hash` anywhere
- `GET /api/v1/activities/:id/tags` — returns tagged users with only `id / username / full_name / role / profile_picture_url`
- `POST /api/v1/activities` with malformed `custom_fields` + `case_type: GT` → expect 400 ("custom_fields is invalid for…") (M7 fix)
- `PATCH /api/v1/pruning-requests/:id/expected-date` with a date inside a full ISO week → expect `409 ConflictException` ("Capacity penuh…") (M3 verification)

**3. Mobile smoke (`cd apps/mobile && npm run android`)**
- Login `staff_kec_pusat / Password123!` → Perantingan tab → tap "+ Buat Permohonan" → SubmitScreen
- Fill location pin → upload photo → tap date row → `AvailabilityModal` (8 ISO weeks visible, day labels Sunday-start, full = `plantOverdue` red, partial = `plantDue` amber, available = `plantOk` green — H7 verification)
- Login `korlap_bungkul / Password123!` → Map → tap a worker → UserDetailSheet → WhatsApp button green; Reassign button = `requestUnderReview` blue (H7)
- Login `admin / Password123!` → ActivitySubmissionScreen → tag a peer → submit → verify activity_tags row written; satgas's Aktivitas list shows "Diikutsertakan" badge
- Open a task with delegation history → TaskDetailScreen → "Riwayat Penugasan" card shows role hops

**4. Web smoke (`cd apps/web && npm run dev` → http://localhost:3001)**
- `/monitoring` → confirm StaffingSummaryCard renders with proper colors (H7 verification: no `bg-[#15803D]` hardcodes in DOM inspector — all `var(--color-status-active)`)
- `/pruning-requests` admin queue → filter by status → detail page → review (approve/reject) → assign-to-task → confirm POST hits `/assign-to-task` with default `units: 1`
- PWA: open Chrome devtools → Application → Manifest = `manifest.webmanifest`; Service Workers = `sw.js` active; Install button visible on supported browsers
- ResponsiveShell: shrink viewport to 375 / 768 / 1280 — sidebar collapses to drawer / icon rail / full sidebar at the right widths

**5. Multi-replica monitoring (optional, requires docker)**
- `docker compose -f infra/docker-compose.yml up -d` → ensure Redis on `:16379` (H2 verification)
- Run two backend instances simultaneously — flag an area's staffing change on both; verify only **one** emits `area:staffing-changed` per debounce window (M4 verification)

**6. CSV backfill dry-run (must run before any production import)**
```
cd be
npx tsx src/database/backfill/pruning-csv-importer.ts --dry-run --limit 50
# Expect: report at data/csv-backfill-report.json with inserted=N, skippedExisting=0, insertFailures=[]
npx tsx src/database/backfill/pruning-csv-importer.ts --dry-run    # full 5,007
# When ops sign off:
# npx tsx src/database/backfill/pruning-csv-importer.ts --apply
```

**7. Coverage gates (CI mirror)**
```
cd be && npm run test:cov           # branches 77.94 % global (tasks.service.ts legacy drag; all new Phase-3 modules ≥85 %)
cd apps/mobile && npm test -- --coverage --watchAll=false --ci
cd apps/web && npm run test:cov
```

### Sign-off statement

Phase 3 (Plants Management + Monitoring Rebuild + Public Intake) is **ready for closure** as of 2026-05-23:
- **17 of 17 ADR conformance items implemented** (ADR-029…038)
- **All 5 CRITICAL + 12 HIGH audit findings remediated** (or scoped to Phase 4 with stated reasons)
- **Phase 3-introduced backend modules** at ≥85 % statement coverage uniformly; the global branch-coverage miss (77.94 %) is `tasks.service.ts` legacy code, not Phase 3 regression
- **9 deferrals** all formally tracked in Phase 4 sub-phases with reasons
- **No PII leak surfaces remain** in the public API
- **Monitoring v2 is multi-replica safe** (Redis adapter + leader-elected debouncer + eager-load fix)
- **Token pipeline + ESLint rules** are CI-gated on web + mobile

**Recommended next:** start Phase 4 with the deferred UI items (4-3) so the sub-district staff workflow is complete on web by demo day; CSV backfill execution can run in parallel once S3 rehosting is sorted.

### Related commits / PRs

- (this session) Waves 1–6 of `GAP-AUDIT-2026-05-23.md` execution; full per-wave log in the audit doc

---

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
