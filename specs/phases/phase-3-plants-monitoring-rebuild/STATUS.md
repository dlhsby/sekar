# Phase 3: Plants Management, Monitoring Rebuild & Public Intake — Status

**Status:** 🟡 In Progress
**Date:** 2026-05-01 (May 1 plant-monitoring + perantingan review pass — seeder hardening so monitoring no longer crashes on stale clock-in state, token compliance sweep on the new `MonitoringStatusSheet` / `MonitoringStatCard` / `MonitoringSearchBar` mobile primitives + matching web `MonitoringTogglePanel`, AreaDetailDrawer plant-status + pruning-requests panels wired to live `useAreaPlants` / `useNotablePlants` / `usePruningByRayon`, manual review checklist below)

> **Apr 28 staff_kecamatan UX — Round 3** (mobile-only, no backend / migration changes):
>
> 1. **`RequestDetailScreen` redesign** — rewritten to mirror `ActivityDetailScreen`: section cards with `NBCardHeader`/`NBCardContent`, uppercase `sectionTitle` + emoji + `infoRow`/`label`/`value`, status `NBBadge` sourced from `getPruningRequestStatusColor/Label`, photo viewer + review decision sheet wrapped in `NBModal`, reviewer name reads `request.reviewer.full_name`.
> 2. **Submit draft prompt actually fires** — Round 2 used `navigation.addListener('beforeRemove', …)` to show the "Simpan Draft?" prompt, but `SubmitScreen` is registered as a hidden `Tab.Screen` (with `tabBarButton: () => null`), and `beforeRemove` does **not** fire on tab navigators. Replaced with a manual `handleLeave` callback (TaskCreate pattern: 2-button "Tidak / Ya" alert when content present) wired to both the Batal button and `FieldHomeHeader.onBack` via `navigation.setOptions`. Footer is now a fixed Batal + Kirim row matching `TaskCreateScreen` / `ActivitySubmissionScreen`.
> 3. **Draft restore on every focus** — Round 2's `hasRestoredRef` guard suppressed every restore prompt after the first focus because the tab screen stays mounted across visits. `useFocusEffect` now calls `restoreDraft` unconditionally (TaskCreate parity); the previous "draft re-prompt after camera intent" bug is prevented instead by the removal of save-on-blur (camera blur no longer auto-writes a draft, so refocus has nothing to detect unless the 30-second autosave fires during the camera modal).
> 4. **`NBModal` fullscreen back arrow standardized** — replaced raw `<Text>←</Text>` glyph with `<MaterialCommunityIcons name="arrow-left" />` so the fullscreen modal matches the back-button look used everywhere else (`LocationPickerModal` is the visible consumer for staff_kecamatan).
> 5. **`dateUtils.formatDate` / `formatDateLong` null-safe** — both now accept `Date | string | null | undefined` and return `'-'` for invalid input, matching the existing `formatDateTime` / `formatTime` shape. Fixes `TypeError: Cannot read property 'getFullYear' of null` on `RequestDetailScreen` when `expectedDate` / `reviewedAt` are not yet set.

> **Apr 27 staff_kecamatan UX — Round 2** (mobile-heavy, one-line backend DTO patch):
>
> 1. **Backend** — `ListPruningRequestsQueryDto` now whitelists `mine` (boolean) and `offset` (int ≥0) so `GET /pruning-requests?mine=true&offset=0` no longer 400s for staff_kecamatan.
> 2. **Profile** — staff_kecamatan no longer fetches monitoring stats (`useProfileData` early-returns), so 3× 403 calls to `/supervisor/active-users` + `/supervisor/area-status` + `/activities` are gone. The "Ringkasan" card is hidden for them.
> 3. **Permissions** — first-install onboarding modal now also requests **gallery** (Android: `READ_MEDIA_IMAGES` 33+ / `READ_EXTERNAL_STORAGE` <33; iOS: `PHOTO_LIBRARY`). Modal step count now 5/5.
> 4. **Perantingan list** — FAB matches `OvertimeListScreen` pattern (`+ Buat Permohonan`, full-width, `size="lg"`, list wrapper with 80 px clearance).
> 5. **Submit screen** — (a) stale Redux error cleared on focus so "Gagal mengirim permohonan" no longer flashes before submit; (b) AsyncStorage draft persistence (`pruning_request_draft`, 24 h TTL, 30 s auto-save, "Simpan Draft?" on back, "Lanjutkan / Hapus" on focus); (c) `LocationPickerModal` — drag/tap to drop pin, defaults to current GPS / Surabaya centroid fallback.
> 6. **Dev seeder** — `seed-phase3.ts` now also seeds 25 bulk `pruning_requests` across all 8 statuses + 9 kecamatan + 25 days of dates so the list UX (scroll, filter, sort) is exercisable on first login.
**Overall Progress:** **~70 % weighted** — **13 sub-phases fully complete + 4 partial + 4 not-started.** (Earlier "17/21 ~81 %" headline counted partials as wholes; corrected on Apr 27 audit. The detail-section tables further down match this revised count.)
- **Fully complete (13):** M1-R 5/5 (3-R1…3-R5) + 3-1 + 3-2 + 3-3 + 3-4 + 3-5 + 3-6 + 3-7 mobile + 3-9
- **Partial (4):** 3-8 (60 % — service + endpoint live; cron/WS/FCM/map overlay deferred), 3-10 (mobile complete; web deferred), 3-11 (backend + mobile state complete; web UI deferred), 3-12 (~50 % — backend + slice + API live; mobile inventory screens + web UI deferred)
- **Not started (4):** 3-13 CSV backfill, 3-14 k6 load test, 3-15 doc final sweep (3-15 partly handled in Wave 6, treated as in-progress)
**Branch:** main (no feature branch yet)
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md), [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md), [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md), [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md), [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md)

---

## 🧪 Manual Review Checklist (May 1, 2026 review pass)

Use this when you sit down to manually QA plant monitoring + the perantingan workflow. Items marked **✅ verified** are covered by the automated test suite; **🔍 manual** require a real device or browser. Login passwords are all `password123`.

### Preconditions

```bash
./infra/start.sh
cd be && npm run migration:run && npm run db:seed
```

After seed, expect:

| Query | Expected | Why |
|-------|----------|-----|
| `SELECT COUNT(*) FROM shifts WHERE clock_out_time IS NULL` | **0** | Worker monitoring won't crash on orphaned active shifts; live clock-in via mobile owns `user_tracking_status` updates. |
| `SELECT DISTINCT status FROM user_tracking_status` | **only `offline`** | Every clockable user starts clean. |
| `SELECT COUNT(*) FROM notable_plants` | **3** | Heritage trees on the map (Bungkul / Pusat / Darmo). |
| `SELECT COUNT(*) FROM area_plants` | **33** | Showcase mix across 10 areas with intentional ok / due_soon / overdue spread. |
| `SELECT COUNT(*) FROM pruning_requests` | **74** spanning all 8 statuses | Stage-2 disposition + reschedule UX has data for every status filter chip. |
| `SELECT COUNT(*) FROM users WHERE role = 'staff_kecamatan'` | **7** (one per rayon + 1 generic) | Login via `staff_kec_pusat` etc. |
| `SELECT COUNT(*) FROM plant_species` | **128** | CSV catalog seeded; species autocomplete in `PruningTaskForm` returns hits. |

### Backend (Swagger — http://localhost:3000/api/docs)

| Action | Expected | Status |
|--------|----------|--------|
| `GET /api/v1/areas/:id/plants` for any seeded area | Array of `AreaPlantRow` with `status`, `nextDueAt`, `species.nameId` | ✅ verified (188 backend tests green) |
| `GET /api/v1/areas/:id/notable-plants` | Up to 3 entries on the demo areas | ✅ verified |
| `GET /api/v1/pruning-requests?admin=true&status=submitted` | 21 rows (per seed) | ✅ verified |
| `POST /api/v1/pruning-requests` as staff_kecamatan | New row with `submitted` status, auto-derived `kecamatan_name` + `rayon_id` | ✅ verified |
| `POST /api/v1/pruning-requests/:id/review` then `:id/convert-to-task` | Status walks `submitted → approved → converted`; new task created | ✅ verified |
| `PATCH /api/v1/pruning-requests/:id/expected-date` (admin reschedule) | Capacity rebooked atomically; date changes | ✅ verified |
| `GET /api/v1/plant-species?q=akasia` | Returns AKASIA + AKASIA_MANGIUM | ✅ verified |
| `GET /api/v1/monitoring/snapshot` | Worker + plant + area aggregates; no 500 | 🔍 manual smoke after seed |

### Mobile — perantingan 5-stage walkthrough (`cd fe/mobile && npm run android`)

1. **Stage 1 — Submit (`staff_kec_pusat`)**
   - Open Perantingan tab → tap "+ Buat Permohonan" → SubmitScreen.
   - Fill location (drag pin in `LocationPickerModal`), upload ≥1 photo, fill tree details, **tap the date row → `AvailabilityModal` shows 8-week calendar with capacity color-coding**.
   - Submit → toast → `MyRequestsScreen` lists the new row with `submitted` badge. 🔍 manual
   - Background: `pruning_request_draft` AsyncStorage entry persists if you bail out. ✅ verified by `SubmitScreen.test.tsx`
2. **Stage 2 — Disposition (`admin` or `admin_data`)**
   - Login → Perantingan tab → ReviewQueueScreen → tap a `submitted` request → RequestDetailScreen.
   - Approve via `NBModal` review sheet → status → `approved` → tap "Buat Tugas" → `ConvertToTaskSheet` (note: empty area/user selectors are an Apr 27 known issue, manual area_id/assignee entry works as workaround). 🔍 manual
   - Capacity calendar in convert sheet should disable any week beyond 12-week horizon and show booked/free counts. ✅ verified by capacityCalendar tests
   - Reschedule: from RequestDetailScreen open `RescheduleSheet` → pick a different available date → status stays, `expectedDate` changes. ✅ verified
3. **Stage 3 — Work (`satgas1` or `satgas_pusat_1`)**
   - Login → Tasks list → open a `perantingan` task → `PruningTaskForm` (3 enums: case_type, pruning_action, source) + species autocomplete + per-species count + photos. ✅ verified by `PruningTaskForm.test.tsx`
   - Submit "Sebagian" (partial) or "Selesai" (complete) → `activity_plant_items` rows created on backend. ✅ verified
4. **Stage 4 — Reporting**
   - Activity record visible in worker's daily history; carries `pruning_request_id` reference + before/after photos. ✅ verified
   - Pruning request auto-transitions `converted → in_progress → done`. ✅ verified by `pruning-requests.service.spec.ts`
5. **Stage 5 — Monitoring (any role with map access)**
   - Open Monitoring tab → tap an area boundary marker → `BoundaryDetailModal` opens with: staffing table, **Status Tanaman** (3-pill summary OK/Hampir/Lewat + species list), and **Pohon Heritage** if any. 🔍 manual on real device — confirm no crash on the `daySummary === null` path (offline-seeded users)
   - Verify `MonitoringStatusSheet` peek/middle/full snap points work and the new `MonitoringSearchBar` filters the worker list. 🔍 manual
   - Verify the 4 status stat cards render via the new `MonitoringStatCard` and pull colors from `nbColors.statusActive/Idle/Outside/Missing`. ✅ verified

### Web — monitoring page (`cd fe/web && npm run dev` → http://localhost:3001/monitoring)

| Step | Expected | Status |
|------|----------|--------|
| Open `/monitoring` | Map renders without console errors; offline-seeded users do not appear (OK — seeder leaves them offline) | 🔍 manual |
| Top-left `MonitoringTogglePanel` ("Tampilan Peta") | 5 toggles (Petugas / Tanaman / Jatuh Tempo / Batas Rayon / Batas Area); state persists in localStorage `monitoring.layers.v1` | 🔍 manual |
| Click any area centroid | `AreaDetailDrawer` slides in with: Staffing → **Status Tanaman** (live `useAreaPlants` + `useNotablePlants`) → **Permohonan Pangkas** (rayon-scoped `usePruningByRayon`, top-5 with status pill) → Worker list | 🔍 manual |
| Plant section | 3-tone summary (`bg-nb-success-light` / `warning-light` / `danger-light`) + species list ordered overdue-first; heritage subsection shows on areas with notable_plants | 🔍 manual |
| Pruning section | Each row uses `PRUNING_STATUS_TONE` map for the status pill; expected_date displayed when set | 🔍 manual |
| Layer toggles actually hide layers | Toggling Tanaman / Petugas / Rayon / Area changes Mapbox + overlay rendering | 🔍 manual |

### Web — staff_kecamatan submit (`/(kecamatan)/pruning-requests`)

This route exists as a placeholder shell only. Full web submit form is **deferred to Phase 4** (mobile is the primary submit channel). Manual UAT from web is not required this pass.

### Phase 4 backlog uncovered by this review

- Web admin (dashboard) pruning-requests pages — `fe/web/src/app/(dashboard)/pruning-requests/{page,[id]/page,[id]/disposition/page}` are **not implemented**; admin disposition is mobile-only. Spec call-out exists in `web.md` but page files were never created.
- `ConvertToTaskSheet` on mobile reads empty Redux state for areas + users (Apr 27 defensive patch returns `[]`). Real `areasSlice` + `usersSlice` ship in Phase 4 polish; admin currently must enter area_id + assignee manually.

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

## 📋 Open Items by Bucket (Apr 27, 2026 audit)

A scannable inventory of what's left, grouped by *who decides when it ships*. Use this to plan follow-up iterations without re-reading the per-sub-phase tables.

### 🌐 Web bucket — deferred to post-demo iteration

These were always carved out of the Phase 3 demo scope. The mobile + backend spine works without them. Each requires its own dev-day budget.

- `(dashboard)/pruning-requests/` — admin queue page with rayon filter, status tabs, detail drawer (3-10 web half).
- `(dashboard)/rayons/[id]/capacity/` — weekly capacity calendar grid editor (3-11 web half).
- `(dashboard)/plant-seeds/` — inventory list + transaction ledger UI (3-12 web half).
- `tasks/new` dynamic form by `task_type` — pruning task form parity with mobile `PruningTaskForm` (3-7 web half).
- `(kecamatan)/pruning-requests/` — submit + my-requests on web. **Apr 27 update:** placeholder pages added to prevent 404s; full implementation deferred. Mobile is the canonical path for staff_kecamatan.

### 🔧 Phase 4 polish bucket — small, contained follow-ups

Each is <1 dev-day and has a clear owner. Schedule together as a "Phase 4 mobile polish" iteration.

- **3-12 mobile inventory screens** — `screens/plantSeeds/` directory does not exist; `plantSeedsSlice` + `plantSeedsApi` are ready and tested. Screens (`InventoryScreen`, `SeedDetailScreen`, `AddTransactionScreen`) just need NB-primitive composition.
- **3-8 cron daily recalc** — `PlantDueDateRecalculator` cron at `@Cron('0 2 * * *')`.
- **3-8 WS event** `area:plant-status-changed` broadcast on status flip.
- **3-8 FCM digest** `area_plant_overdue` to top_management (daily 8 AM).
- **3-8 plant map overlay** — full impl beyond the current stub.
- **Mobile coverage thresholds** — restore floor to 80/75/80/82 (currently 74/66/70/76 due to SubmitScreen wizard branch gaps).
- **Areas + Users Redux slices** — `ConvertToTaskSheet` currently degrades to empty selectors (Apr 27 defensive patch). Real fix: add `areasSlice` + `usersSlice` so the convert form shows real options.

### 🧱 Out-of-scope until separate iteration

These are larger or specialty workstreams. Don't bundle with demo polish.

- **3-13 CSV backfill seeder** — 5,008 rows + Drive→S3 photo rehost. Data engineering work.
- **3-14 k6 load test** — 500-worker / 12-s ping / 30-min run + regression fixes. Performance work; needs `infra/loadtest/` directory built.
- **3-15 doc deep-sweep** — full sync of `specs/api/contracts.md`, `specs/database/schema.md`, `specs/architecture/security.md`, etc. to reflect every Phase 3 endpoint + entity.
- **M2 finish-out gaps** — `status:v2` final polish, `cluster:update` WS event, `includes` query param on snapshot, Redis health endpoint, `PHASE3_FEATURES_ENABLED` env flag, `ClusterLayer` + `AreaDetailDrawer` test backfill, monitoring config UI Phase 3 fields.

---

## 🎨 Apr 27 — staff_kecamatan UX redesign

After the audit, the user piloted the staff_kecamatan flow and asked for a structural redesign — bottom-tab navigation parity with other roles + a single scrollable submission form (in place of the 5-step wizard) + new tree-detail and contact fields. Shipped the same day:

**Mobile**

- **Bottom-tab navigation parity** — `staff_kecamatan` now flows through `MainNavigator` (the 8-role unified navigator) instead of the standalone `KecamatanNavigator`. New 2-tab layout: `Perantingan` (request list) + `Profile`. The standalone `KecamatanNavigator.tsx` and the `KecamatanTabs` Stack route are removed.
- **`PerantinganListScreen`** — replaces the bare `MyRequestsScreen` route. Status filter chips (Semua / Menunggu / Disetujui / Ditolak / Dikonversi / Diproses / Selesai), date sort toggle, FAB "Buat Permohonan", pull-to-refresh, NB-styled list cards.
- **`SubmitScreen` redesigned** — single scrollable card-based form mirroring `TaskCreateScreen`'s rhythm. Cards: **Lokasi** (auto-fetched GPS + refresh button + rayon + kecamatan presets from user profile + free-text street), **Foto** (camera + gallery, min 1 max 5), **Detail Pohon** (jumlah/tinggi/diameter), **Kontak** (pemohon + ketua RT, name + phone), **Catatan** (optional). Permissions are requested on demand (location on mount, camera on tap), matching the `useClockInOut` pattern other roles already follow.
- **`mediaService` import bug** fixed — `import * as mediaService` (namespace import) was the root cause of "mediaservice.pickfromgallery is not a function". Changed to `import { mediaService }` (singleton).

**Backend**

- Migration `17460002000000-StaffKecamatanRedesign` adds `users.kecamatan_name` (varchar 100, nullable) and 7 new `pruning_requests` columns: `tree_count`, `tree_height_estimate`, `tree_diameter_estimate`, `requester_name`, `requester_phone`, `rt_leader_name`, `rt_leader_phone` (all nullable so existing rows + other roles unaffected).
- `CreatePruningRequestDto` accepts the 7 new fields as optional. `detail_date` and `target_count` are now optional too — admin sets the date during convert-to-task. Photo minimum lowered from 3 to **1**.
- `PruningRequestsService.create` now auto-derives `kecamatan_name` and `rayon_id` from the submitter's profile so the mobile client doesn't send them.

**Seeders**

- `seed-staging.ts` and `seed-phase3.ts` populate `users.kecamatan_name` for `staff_kec_pusat` (= "Tegalsari") and write the 6 sample `pruning_requests` with realistic tree-detail + contact values.

**Specs**

- Updated `mobile.md`, `backend.md`, `database.md` with the new fields and screens.

---

## 🐛 Apr 27 Bug-Fix + Audit Notes

Two bugs surfaced when the user ran the staging seeder + logged in as `staff_kec_pusat`:

1. **`SubmitScreen` crash** — `TypeError: Cannot read property 'bg' of undefined at NBButton`. Root cause: `SubmitScreen.tsx:357,430` passed `variant="outline"` and used children-as-text, neither supported by `NBButton`. Fixed by extending `NBButton` with: `outline` variant (white bg + black border), `label` prop alias, string children fallback, `leftIcon` prop, and graceful fallback-to-primary on unknown variants. `NBButton.test.tsx` extended with 5 regression-guard tests (26 total, all green).

2. **`ConvertToTaskSheet` runtime drift** — read `state.areas` and `state.users` (slices that don't exist), used `request.rayon_id` (model uses `rayonId`), passed wrong props to `NBAlert`/`NBToast`/`NBDatePicker`. Defensively patched — sheet now renders without crashing; areas/users selectors return `[]` until real slices land in Phase 4 polish.

3. **Mobile `nbSpacing` numeric-subscript shim** — Phase 3 admin screens written by Wave 3/4 used Tailwind-style `nbSpacing[2]`/`nbSpacing[4]` that returned `undefined`. Added numeric aliases (1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 7=28, 8=32, 10=40, 12=48, 16=64) in `constants/nbTokens.ts`. Remove in Phase 4 polish once screens migrate to named tokens.

4. **Web `staff_kecamatan` 404 prevention** — added two minimal placeholder pages at `(kecamatan)/pruning-requests/page.tsx` + `(kecamatan)/pruning-requests/my/page.tsx` directing the user to the mobile app. Resolves the dead sidebar links from `lib/navigation.ts`.

---

## 🎨 Apr 28 — staff_kecamatan UX Round 3

After Round 2 the user piloted the flow as `staff_kec_pusat` and surfaced four follow-ups: detail-screen visuals, a null-date crash, a non-standard back arrow inside the location picker, and — most importantly — **the Round 2 draft prompt + Batal/back never actually fired on the Submit screen**. Root cause: `SubmitScreen` is registered as a hidden `Tab.Screen` (via `tabBarButton: () => null` so it doesn't appear in the tab bar), and `navigation.addListener('beforeRemove', …)` does not fire on tab navigators. The Round 2 fix was visually correct but functionally dead.

**Mobile**

- **`RequestDetailScreen` rewrite** — full visual parity with `ActivityDetailScreen`: `NBBackgroundPattern` wrap, section cards with `NBCardHeader` / `NBCardContent`, uppercase `sectionTitle` (📌 STATUS · 📍 LOKASI · 🌳 DETAIL POHON · 👤 KONTAK · 📝 CATATAN · 📸 FOTO LOKASI · ✅ HASIL REVIEW · 🔗 TUGAS TERKAIT · ⚖️ AKSI ADMIN), `infoRow` / `label` / `value` rows. Status badge sourced from new helpers `getPruningRequestStatusColor` / `getPruningRequestStatusLabel` in `utils/statusHelpers.ts`. Photos render in a horizontal scroll (160 × 160). Photo viewer + admin review decision sheet now use `NBModal` (`fullscreen` + `sheet` size `sm`) instead of raw `Modal`. Reviewer name reads `request.reviewer?.full_name` (Round 2 still referenced the legacy `reviewedBy.name` shape). `NBToast` calls now use the correct `body` field (was `message`).
- **`SubmitScreen` draft / leave flow rebuilt** — replaced the dead `beforeRemove` listener with a manual `handleLeave` (TaskCreate pattern: 2-button alert "Tidak / Ya" when there's content, direct `navigation.goBack()` otherwise). `handleLeave` is wired to both the new fixed-bottom **Batal** button and the `FieldHomeHeader` back arrow via `navigation.setOptions({ headerTitle: () => <FieldHomeHeader … onBack={handleLeave} /> })` — exactly the same hook TaskCreate uses, so the two screens now have identical exit behaviour. Submit footer restructured: removed the inline "Kirim Permohonan" submit-card-as-final-card and moved to a fixed-bottom row with `Batal` (`variant="secondary"`, `size="lg"`) + `Kirim` (`variant="primary"`, `size="lg"`).
- **Draft restore on every focus** — Round 2's `hasRestoredRef` one-shot guard meant the tab screen (which stays mounted across visits) never re-prompted "Lanjutkan / Hapus" after the first focus. Removed the guard; `useFocusEffect` now calls `restoreDraft()` on every focus. The original camera-intent regression that motivated the guard is prevented instead by removing save-on-blur — the camera modal blur no longer auto-writes a draft, so the refocus has nothing to surface unless the 30-second autosave happens to fire during the camera intent (matches TaskCreate behaviour exactly).
- **`NBModal` fullscreen back arrow** — `<Text>←</Text>` replaced with `<MaterialCommunityIcons name="arrow-left" size={22} />` inside a 40 × 40 framed touch target. `getByText('←')` test assertions switched to `getByLabelText('Kembali')`. Visible consumer: `LocationPickerModal`.
- **`dateUtils.formatDate` / `formatDateLong` null-safe** — both now accept `Date | string | null | undefined` and return `'-'` for null / invalid input, matching the existing `formatDateTime` / `formatTime` shape. Fixes the production `TypeError: Cannot read property 'getFullYear' of null` thrown when viewing a freshly-submitted request whose `expectedDate` / `reviewedAt` haven't been set.

**Tests**

`RequestDetailScreen.test.tsx`'s nb-component mock now exports `NBBackgroundPattern` (was missing from the legacy mock); one regex assertion (`/Tugas Terkait/`) is now case-insensitive to accommodate the uppercase section title. `SubmitScreen.test.tsx` adds a `withAlpha` shim to its `nbTokens` proxy mock and mocks `FieldHomeHeader` in isolation so the new header override doesn't pull in the full header tree. `NBModal.test.tsx`'s 3 back-button assertions migrated to `getByLabelText('Kembali')`. Mobile sweep: 4118 / 4125 tests green (7 pre-existing skips), pruning + NBModal subset 137 / 137.

**Backend / specs**

No schema, DTO, or migration change in Round 3. `mobile.md` § "staff_kecamatan" amended; `backend.md` / `database.md` left as-is.

---

## 🗓 Apr 28 — staff_kecamatan UX Round 4 (preferred-date booking)

The user identified that the booking-style scheduling feature called out in the Round 1 spec was never wired up: `staff_kecamatan` could not pick a preferred date when submitting, and admins could only adjust the date via the full convert-to-task flow. Round 4 closes that gap **without changing the storage model** — `service_capacity` stays weekly per ADR-035, and the day-by-day picker is delivered as a UX projection. **Mobile-first scope**: web admin / submit pages remain deferred per "Open Items by Bucket".

**Backend**

- `PruningRequestsService.create` already accepted the optional `detail_date` field; the mobile now sends it when the user picks a date.
- New endpoint `PATCH /api/v1/pruning-requests/:id/expected-date` (`ReschedulePruningRequestDto { expectedDate }`) lets `admin_data` (rayon-scoped), `kepala_rayon`, `top_management`, `admin_system`, `superadmin` adjust `expected_date` independent of conversion. Validates: status ∈ {`submitted`, `under_review`, `approved`}; new date today-or-future; admin_data scoped by `rayon_id`.
- `GET /api/v1/rayons/:id/capacity` now also accepts `staff_kecamatan` (own rayon only) so the submit calendar can read availability. Same scope-check pattern as `admin_data`.
- Tests: `pruning-requests.{controller,service}.spec.ts` add reschedule happy/forbidden/conflict/past-date cases; `service-capacity.controller.spec.ts` adds staff_kecamatan happy + cross-rayon 403.

**Mobile**

- New helper `screens/pruningRequests/utils/capacityCalendar.ts` projects weekly `service_capacity` rows into per-day status (`available` / `partial` / `full` / `unknown`) using a single threshold rule (capacity 0 → unknown; booked ≥ capacity → full; ≥ 80 % → partial; else available). 10 unit tests covering threshold edges, snake/camelCase row shapes, and the 8-week range builder.
- New shared `components/AvailabilityCalendar.tsx` — 8-week roll-forward grid keyed by ISO-week. Past dates greyed out, full / unknown cells show an `Alert` instead of selecting. Used by both the submit and reschedule flows so the visual layer is identical.
- New `components/AvailabilityModal.tsx` (fullscreen `NBModal` host) used by `SubmitScreen`, and `components/RescheduleSheet.tsx` (sheet `NBModal` host with Batal / Simpan footer) used by `RequestDetailScreen`.
- `SubmitScreen` adds a 📅 **Tanggal Diharapkan** card between Detail Pohon and Kontak: tappable date row → `AvailabilityModal`. Selected date persists in the draft (`expectedDate` added to `DraftShape`) and is passed to the backend as `detail_date`. The screen dispatches `fetchCapacity({ rayonId, fromWeek, toWeek: fromWeek + 7, serviceType: 'pruning' })` once `rayonId` is known.
- `RequestDetailScreen` always renders a `Tanggal Diharapkan` row in DETAIL POHON (now reads "Belum dipilih" when null, instead of hiding the row). New ⚖️ **AKSI ADMIN** sibling card 📅 **ATUR JADWAL** with an "Atur Jadwal" button visible only to admin reviewers and only for status ∈ {`submitted`, `under_review`, `approved`}. Opens `RescheduleSheet`, which on confirm dispatches the new `reschedulePruningRequest` thunk and PATCHes the new endpoint.
- New `pruningRequestsSlice` thunk `reschedulePruningRequest` + `reschedulingId` state; updates `byId`, `adminList`, and `mine` on fulfillment so all list/detail consumers refresh without a refetch.

**Tests**

Mobile: pruning + AvailabilityCalendar + capacityCalendar subset 139 / 139 (was 137 in Round 3, +1 SubmitScreen render assertion for the date card, +3 AvailabilityCalendar status tests, +10 capacityCalendar projection tests, -2 net since the SubmitScreen mock store was extended with the new slice).
Backend: pruning-requests + service-capacity subset 92 / 92 (+5 reschedule cases on the service spec, +2 controller cases, +2 capacity controller cases).

**ADR-035 amendment**

ADR-035 (service-capacity model) appended a 2026-04-28 paragraph: storage stays weekly. The mobile staff_kecamatan submit calendar projects weekly capacity to per-day status as a UX-only derivation. Daily granularity remains explicitly out of scope for the storage model (per Alternative #2 in the original ADR). Admin reschedule endpoint added; `staff_kecamatan` granted read on `GET /rayons/:id/capacity` (own rayon).

**Out of scope**

- Web staff_kecamatan submit page + admin reschedule UI — still deferred per "Open Items by Bucket" (3-12 web half).
- Switching `service_capacity` to daily granularity — explicitly off-limits per ADR-035.
- Push to origin — branch is now ahead of `origin/main` by the Round 4 commits; deploying is a separate user decision.

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
| 3-6 | M3 | Task typing + partial-complete API | 4 | ✅ Complete | 100 % |
| 3-7 | M3 | Pruning task UX (depends on M1-R) | 5 | ✅ Complete | 100 % |
| 3-8 | M3 | Due-date forecast + overdue alerts | 3 | 🟡 Partial (light) | 60 % |
| 3-9 | M4 | Pruning-requests backend (+ admin endpoints) | 4 | ✅ Complete | 100 % |
| 3-10 | M4 | Pruning-requests frontends (+ admin screens) | 5 | 🟡 Mobile complete; web deferred | 70 % |
| 3-11 | M4 | Service capacity calendar | 4 | 🟡 Backend + mobile state ✅; web UI deferred | 75 % |
| 3-12 | M4 | Plant-seed inventory | 3 | 🟡 Backend + slice ✅; mobile UI + web UI deferred | 50 % |
| 3-13 | M3 | CSV backfill seeder | 3 | ⏳ Not Started | 0 % |
| 3-14 | M2 | Load test + regression fixes | 3 | ⏳ Not Started | 0 % |
| 3-15 | M5 | Documentation final sync | 2 | 🟡 In Progress (Wave 6 + Apr 27 audit) | 40 % |

**Total:** 73 dev-days single-threaded. M1-R = 14 d (3-R1+3-R2+3-R3+3-R4+3-R5), M1-S = 6 d, M2 = 21 d, M3 = 15 d, M4 = 16 d, M5 = 2 d + rollout.

**Legend:** ⏳ Not Started · 🟡 In Progress · ✅ Complete · 🚫 Blocked

---

## ✅ M3 + M4 Admin Finish-Out Landed (Apr 27, 2026)

Six waves of commits merged Apr 27, establishing all admin endpoints + mobile admin screens + capacity + seeds scaffolding (17/21 sub-phases complete, ~81 % overall):

| Wave | Commits | Description |
|------|---------|-------------|
| **0** | `ff7d128` | Bug fix: Redux mutation guard in pruningRequestsSlice + token regression test (rn-no-shadow-radius enforced). |
| **1** | `d50b15e`, `bb0d6b1` | 3-11 service-capacity backend: `CapacityService` + 3 endpoints (`GET/PUT /rayons/:id/capacity`, `POST /rayons/:id/capacity/book`). Full stack incl. seeders + 28 tests. |
| **2** | `9c7a5de`, `ae2d4ac`, `ceee2e4` | 3-9 pruning-requests admin endpoints: `POST /pruning-requests/:id/review` + `POST /pruning-requests/:id/convert-to-task` + `GET /pruning-requests?rayon_id=&status=` (30 tests, 100 % coverage); admin-filter guard wired to `admin_data` + `kepala_rayon` + `top_management`. |
| **3** | `44a96c0`, `1f4c3e9` | 3-10 admin mobile screens: `ReviewQueueScreen` (tabs: pending/approved) + `ConvertToTaskSheet` (capacity picker + confirm). Role-gated to `admin_data`, 32 screen tests. |
| **4** | `f2a8f9e`, `2847372` | 3-12 plant-seeds full stack: `PlantSeedsService` + `SeedTransactionsService` + 5 endpoints + `PlantSeedsInventoryScreen` + `SeedTransactionDetailScreen` + `seedsSlice`. Offline queue scaffold. 35 tests. |
| **5** | `c8d25f7`, `3b04bc8` | Seeders + coverage backfill: `seed-phase3.ts` extends with capacity grid (7 rayons × 52 weeks, 6 service types) + seeds catalog (19 rows). Test coverage 94.51 % stmts (backend); mobile 80+ %. |

All work code-reviewed same-day (12 findings: 4 critical + 6 medium + 2 low) and fixed in `ff7d128`. Tests pass; no CI blockers.

**Next:** M3+M4 web work (dynamic task forms, pruning queue pages, capacity calendar UI, seed inventory pages) + cron/FCM/map overlay. Phase 4 deferred (load test, visual regression, offline retry polish).

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

### Monitoring UX Hardening (May 2026, retroactive to Phase 2E)

| Task | Status | Notes |
|------|--------|-------|
| Trail crash fix — Fabric `addViewAt` | ✅ | `BoundaryOverlay` + `AreaStatusOverlay` gated with `!showTrail`; prevents 150+ concurrent MapView children |
| FAB repositioned to bottom-right | ✅ | `fabColumn` style: `bottom: PEEK_HEIGHT + spacing.md`; removed `top:0/bottom:0/justifyContent:'center'` |
| `StatusSummaryBar` relocated to peek sheet | ✅ | Removed from top bar; now rendered inside `MonitoringStatusSheet` peek state |
| `MonitoringStatCard` reusable stat card | ✅ new | `fe/mobile/src/components/monitoring/MonitoringStatCard.tsx` — accent left-border, icon, h3 value, caption label |
| `MonitoringStatusSheet` peek bottom sheet | ✅ new | `fe/mobile/src/components/monitoring/MonitoringStatusSheet.tsx` — 3 snap points (88dp / 50% / 90%); `BottomSheetFlatList` worker list; stale GPS detection (10 min); area coverage + last-updated summary |
| `MonitoringSearchBar` floating search | ✅ new | `fe/mobile/src/components/monitoring/MonitoringSearchBar.tsx` — pill bar overlaying map top-left; filters `visibleUsers` + sheet list in real-time |
| `BoundaryOverlay` marker tap precision | ✅ | Added `zIndex={20}` + `anchor={{x:0.5,y:0.5}}` to area markers; `zIndex={10}` + `anchor` to rayon markers; worker markers already at `zIndex={200}` |
| `mapPadding` updated | ✅ | `{{ top: 60, right: 64, bottom: PEEK_HEIGHT, left: 0 }}` to prevent map controls obscured by sheet |

---

## Sub-Phase 3-6: Task typing + partial-complete API ✅

| Task | Status | Notes |
|------|--------|-------|
| Task entity additions (`task_type`, `custom_fields`, `parent_task_id`, `target_plant_count`, `completed_plant_count`) | ✅ | landed in 3-2 schema migration |
| `TaskTypeRegistry` with per-type Zod schemas | ✅ | `be/src/modules/tasks/registry/` |
| `POST /tasks/:id/partial-complete` | ✅ | `tasks.controller.ts` — spawns child via `parent_task_id` when remaining > 0 |
| `POST /tasks/:id/resume` | ✅ | `tasks.controller.ts` |
| `GET /tasks/:id/lineage` | ✅ | parent chain + children |
| Mobile `PartialCompleteSheet` + tasksSlice thunks (`partialCompleteTask`, `resumeTask`, `fetchTaskLineage`) | ✅ | `fe/mobile/src/components/tasks/PartialCompleteSheet.tsx`, `tasksSlice.ts:51,84,103` |
| `TaskDetailScreen` "Selesai Sebagian" CTA + lineage breadcrumb | ✅ | `fe/mobile/src/screens/field/TaskDetailScreen.tsx` |
| Activity entity additions (`custom_fields`, `reference_code`, `pruning_request_id`, photos) | ✅ | landed in 3-2 schema |
| `activity_plant_items` entity + CRUD | ✅ | `ActivityPlantItemsService` already in plants module |

**Completed:** 2026-04-27.

---

## Sub-Phase 3-7: Pruning task UX ✅

| Task | Status | Notes |
|------|--------|-------|
| Backend `PlantsController` + `PlantsService` (list/search species, list area-plants, list/create notable-plants) | ✅ | `be/src/modules/plants/plants.controller.ts` — 5 endpoints; 41 tests at 100/97 % coverage |
| Mobile `PruningTaskForm` component | ✅ | `fe/mobile/src/components/tasks/PruningTaskForm.tsx` — 3 required pickers (caseType GT/PT/PS/PD/PK, pruningAction PM/PB/PC, source TIW/TS/CC/PW/Wk) per ADR-031 |
| Mobile `SpeciesAutocomplete` (debounced 300 ms multi/single select over 128 species) | ✅ | `fe/mobile/src/components/tasks/SpeciesAutocomplete.tsx` |
| Mobile `plantsSlice` Redux state + thunks | ✅ | `fe/mobile/src/store/slices/plantsSlice.ts` — fetchSpecies, searchSpecies, fetchAreaPlants, fetchNotablePlants, createNotablePlant |
| Mobile `plantsApi.ts` API client | ✅ | `fe/mobile/src/services/api/plantsApi.ts` |
| "Lanjutkan Besok" CTA wired to `/tasks/:id/resume` | ✅ | landed via 3-6 PartialCompleteSheet "Lanjutkan Besok" toggle |
| Web dynamic task form by `task_type` | ⏳ DEFERRED | web work deferred until after demo iteration |
| Offline queue scaffold (`activity.submit`, `activity.partial`) | 🟡 | partial via syncManager; full polish deferred to Phase 4 |

**Completed:** 2026-04-27 (mobile only).

---

## Sub-Phase 3-8: Due-date forecast + overdue alerts 🟡 Partial (light)

| Task | Status | Notes |
|------|--------|-------|
| `PlantDueDateService` (species × area_type lookup) | ✅ | `be/src/modules/plants/services/plant-due-date.service.ts` — pure functions, deterministic, 100 % coverage |
| Manual override column (`override_cycle_days`) | ✅ | already in 3-2 schema; precedence override > species default |
| `AreaPlantStatusService` aggregation | ✅ | `be/src/modules/monitoring/services/area-plant-status.service.ts` |
| `GET /monitoring/area/:id/plant-status` endpoint | ✅ | `monitoring.controller.ts` |
| Mobile `PlantStatusChip` on TaskCard for pruning tasks | ✅ | `fe/mobile/src/screens/taskActivity/components/PlantStatusChip.tsx` |
| `PlantDueDateRecalculator` daily cron | ⏳ DEFERRED | no scheduler infra yet — deferred to Phase 4 |
| WS event `area:plant-status-changed` | ⏳ DEFERRED | client polls on focus instead |
| FCM digest `area_plant_overdue` to top_management | ⏳ DEFERRED | needs digest scheduler |
| `PlantOverlayLayer` map render | ⏳ DEFERRED | cluster z-fight work needed |

**Status:** Light slice landed Apr 27, demo-functional. Remaining items rolled to a future iteration.

---

## Sub-Phase 3-9: Pruning-requests backend ✅

| Task | Status | Notes |
|------|--------|-------|
| `pruning_requests` entity + migration | ✅ | landed in 3-2 schema |
| `PruningRequestsService.create` + `findMine` + `findById` | ✅ | `be/src/modules/pruning-requests/pruning-requests.service.ts` — 55 tests, 99.35 % stmts / 93.1 % branches |
| `POST /pruning-requests` (staff_kecamatan) | ✅ | reference code `PR-{ts}-{uuid}` |
| `GET /pruning-requests?mine=true` | ✅ | paginated, ordered DESC |
| `GET /pruning-requests/:id` (owner + rayon-scoped admin_data + kepala_rayon + top_management) | ✅ | rayon scoping enforced per ADR-032 |
| `POST /pruning-requests/:id/review` (admin_data) | ✅ | landed Apr 27 — accepts `{ decision, reason? }`; sets `reviewed_by`/`reviewed_at` |
| `POST /pruning-requests/:id/convert-to-task` | ✅ | landed Apr 27 — atomic transaction; calls `CapacityService.bookAtomic`; sets `converted_task_id` |
| `GET /pruning-requests?rayon_id=&status=&from=&to=` (admin filter) | ✅ | landed Apr 27 — paginated; auto-scoped by `users.rayon_id` for admin_data |
| Auto-rayon resolution from GPS | ⏳ DEFERRED → Phase 4 polish | client passes `rayon_id` explicitly for now |
| FCM notifications on status change | ⏳ DEFERRED → Phase 4 polish (3-8 bucket) | review/convert endpoints log status transition; FCM digest pending |

---

## Sub-Phase 3-10: Pruning-requests frontends 🟡 Mobile complete; web deferred

| Task | Status | Notes |
|------|--------|-------|
| Mobile `KecamatanNavigator` (no bottom tabs, role-gated) | ✅ | `fe/mobile/src/navigation/KecamatanNavigator.tsx`; `RootNavigator.tsx` branches on `user.role === 'staff_kecamatan'` |
| Mobile `SubmitScreen` (5-step wizard: address+GPS, photos, detail, preview, success) | ✅ | `fe/mobile/src/screens/pruningRequests/SubmitScreen.tsx`; draft persisted in slice. Apr 27: NBButton variant + children compat fix |
| Mobile `MyRequestsScreen` + `RequestDetailScreen` | ✅ | status chips (pending/approved/rejected/converted), pull-to-refresh, photo gallery |
| Mobile `pruningRequestsSlice` + `pruningRequestsApi` | ✅ | submitRequest, fetchMine, fetchById, fetchAdminPruningRequests, reviewPruningRequest, convertPruningRequestToTask |
| Offline queue: `pruning_request.submit` action | ✅ | `syncManager.ts` — FIFO; retry deferred to Phase 4 |
| `useNetworkStatus` hook | ✅ | `fe/mobile/src/hooks/useNetworkStatus.ts` |
| Mobile `ReviewQueueScreen` (admin_data) | ✅ | `fe/mobile/src/screens/pruningRequests/ReviewQueueScreen.tsx` — tabs (pending/approved), rayon-scoped list |
| Mobile `ConvertToTaskSheet` (capacity chip) | 🟡 | `fe/mobile/src/components/admin/ConvertToTaskSheet.tsx` — renders, capacity chip works; areas/users selectors empty until Phase 4 (no `areasSlice`/`usersSlice` yet). Apr 27 defensive patch keeps it from crashing |
| Top-management read-only filter | ✅ | role list on admin endpoints includes `top_management` |
| Web `/pruning-requests/` queue + `[id]/` detail | ⏳ DEFERRED → web bucket | tracked in "Open Items by Bucket" |
| Web `(kecamatan)/` layout for staff_kecamatan submit on web | 🟡 | layout shell ✅ from 3-R4; submit form deferred. Apr 27: placeholder pages added at `(kecamatan)/pruning-requests/{,my}/page.tsx` to avoid 404s |

**Completed:** 2026-04-27 (mobile complete; web deferred). Apr 27 audit surfaced + fixed: `NBButton` `outline`/`label`/`leftIcon` API gaps, `ConvertToTaskSheet` runtime drift, mobile `nbSpacing` numeric subscripts, web staff_kecamatan placeholder pages.

---

## Sub-Phase 3-11: Service capacity calendar 🟡 Backend + mobile state ✅; web UI deferred

| Task | Status | Notes |
|------|--------|-------|
| `CapacityService` (`bookAtomic`, `upsertCapacity`, `findCalendar`) | ✅ | `be/src/modules/service-capacity/service-capacity.service.ts` — `pessimistic_write` lock; throws `ConflictException` when over capacity. 24 tests, 98.9 % stmts |
| `GET /rayons/:id/capacity?from=&to=&serviceType=` | ✅ | rayon × ISO-week × serviceType grain; admin-only |
| `PUT /rayons/:id/capacity` (upsert) | ✅ | overrides default 5 units/day per rayon |
| `POST /rayons/:id/capacity/book` (manual book) | ✅ | rare — convert-to-task uses service directly |
| Implicit booking on `/pruning-requests/:id/convert-to-task` | ✅ | atomic — if capacity exceeded, conversion rolls back |
| Mobile `serviceCapacitySlice` + `serviceCapacityApi` | ✅ | `fe/mobile/src/store/slices/serviceCapacitySlice.ts` — `fetchCapacity`, `calendarByRayon` cache |
| Web capacity calendar page | ⏳ DEFERRED → web bucket | tracked in "Open Items by Bucket" |

---

## Sub-Phase 3-12: Plant-seed inventory 🟡 Backend + slice ✅; UI deferred

| Task | Status | Notes |
|------|--------|-------|
| `plant_seeds` + `seed_transactions` entities | ✅ | landed in 3-2 schema |
| Backend CRUD (`GET /plant-seeds`, `POST`, `GET /:id`, `POST /:id/transactions`, `GET /:id/transactions`) | ✅ | `be/src/modules/plant-seeds/` — `pessimistic_write` lock on `recordTransaction`; throws on insufficient stock for distribution. 29 tests, 100 % stmts |
| Mobile `plantSeedsSlice` + `plantSeedsApi` | ✅ | `fe/mobile/src/store/slices/plantSeedsSlice.ts` — full thunk surface |
| Mobile inventory screens (`InventoryScreen`, `SeedDetailScreen`, `AddTransactionScreen`) | ⏳ DEFERRED → Phase 4 polish | `screens/plantSeeds/` directory does not exist; deleted in Wave 4 due to NB-primitive prop drift; deferred to Phase 4 polish where they can be rebuilt against the now-extended NBButton API |
| Web seeds pages + ledger view | ⏳ DEFERRED → web bucket | tracked in "Open Items by Bucket" |

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
