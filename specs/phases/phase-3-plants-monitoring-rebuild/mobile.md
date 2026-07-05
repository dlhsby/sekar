# Phase 3: Mobile Requirements

**Last Updated:** 2026-04-27
**Status:** 🟡 In Progress (3-1 through 3-12 landed; web work deferred)
**Framework:** React Native 0.83.4, React 19.2.4, Redux Toolkit, @react-native-Google Maps/maps
**Related ADRs:** [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md)
**See also:** [Backend](./backend.md), [UI/UX](./ui-ux.md), [README](./README.md)

---

## Apr 24 Marker/Trail Fixes — MUST PRESERVE

Commit `c2b8e85` (Apr 24, 2026) shipped four monitoring-map stability fixes. Phase 3 extends the map without regressing these. **All new map components inherit the same patterns.**

| Fix | Pattern | Phase 3 consequence |
|-----|---------|---------------------|
| Marker bitmap redraw thrash | `tracksViewChanges={false}` + `LabelMode` enum in marker `key` (not raw `zoomLevel` float) | `ClusterMarker` re-uses the same pattern; a lint rule (ESLint custom) forbids `tracksViewChanges={true}` anywhere under `components/monitoring/` |
| `LocationTrail` bridge crash (`addViewAt`) | `requestAnimationFrame` mount guard | Reference pattern for any new GL-bridged overlay |
| Stale boundaries after tab refocus | `useFocusEffect` + `boundaryKey` forcing Polygon remount | Inherited by `AreaStatusOverlay` and `PlantOverlayLayer` |
| Bottom-sheet race on `handleMarkerPress` | Removed `animateToRegion` in favor of bottom-sheet `snapToIndex` | Cluster press handler uses the same pattern (expand cluster OR snap sheet, not both) |

`components/monitoring/LocationTrail.tsx` and `UserMarker.tsx` are **reference files** — do not modify in Phase 3. `ClusterMarker` is introduced as a **parallel** component behind a feature flag (`featureFlags.clusterMarkersV2`) so we can roll back instantly if cluster rendering regresses.

---

## Redesign Sweep (M1-R sub-phase 3-R5)

Before any new feature work begins, every existing mobile screen migrates onto the unified token system delivered by 3-R1 / 3-R2 / 3-R3. This sub-phase performs a token + shadow + font + focus-ring audit; **no functional change**, only visual alignment with NB 2.0 + canonical tokens.

### Screens swept

| Stack | Screens |
|-------|---------|
| Auth | `LoginScreen`, `LoadingScreen`, `OnboardingStep1Screen`, `OnboardingStep2Screen`, `OnboardingStep3Screen` |
| Worker | `HomeScreen`, `ClockInScreen`, `ClockOutScreen`, `LocationTrackingScreen`, `TasksListScreen`, `TaskDetailScreen`, `ActivityFormScreen`, `OvertimeScreen`, `ProfileScreen`, `EditProfileScreen`, `SettingsScreen`, `NotificationsScreen` |
| Supervisor | `KorlapHomeScreen`, `UsersListScreen`, `ReportsScreen`, `SchedulesScreen` |
| Shared | error / empty / skeleton fallbacks (`ST-1` … `ST-4` per Flow 13), splash |
| Role-aware shells | `WorkerTabs`, `KorlapTabs`, `KepalaRayonTabs`, `AdminDataTabs`, `StaffKecamatanTabs` |

### Sweep checklist (applied per file)

1. Replace `#[0-9a-fA-F]{6}` and `rgba(...)` literals with token imports (`nbColors.*`) or generated shadow helpers.
2. Replace `shadowRadius` numeric literals with generated `shadow.*` token (always opaque, always zero radius).
3. Replace hand-set font sizes / weights / line-heights with `<NBText variant="h1|h2|h3|body-lg|body|body-sm|caption|mono-sm" />`.
4. Confirm focus state on inputs uses the `NBTextInput` 3 px primary border flash (not custom highlight).
5. Confirm every status indicator pairs an icon with text (no color-only signalling — WCAG color-blind rule).
6. Update Jest `react-test-renderer` snapshot.

### Explicitly NOT in 3-R5

These ship green-field on tokens in their own sub-phase and must NOT be touched in 3-R5:
- `MapDashboardScreen`, `ClusterMarker`, `ClusteredUserMarkers`, `MonitoringToggleSheet`, `AreaStatusOverlay`, `PlantOverlayLayer` — sub-phase 3-5
- `PruningTaskForm`, `SpeciesAutocomplete`, `PartialCompleteSheet` — sub-phase 3-7
- `SubmitScreen`, `MyRequestsScreen`, `RequestDetailScreen`, `ReviewQueueScreen`, `AssignToTaskSheet` — sub-phase 3-10
- `SeedsListScreen`, `SeedDetailScreen`, `AddTransactionScreen` — sub-phase 3-12

### Acceptance criteria

- [ ] `git grep -nE '#[0-9a-fA-F]{6}' apps/mobile/src` returns zero hits outside `generated/` and `scripts/hex-allowlist.txt`.
- [ ] `git grep -n 'shadowRadius' apps/mobile/src` returns zero literal numbers > 0 outside `generated/`.
- [ ] Jest snapshots updated for every swept screen; CI green.
- [ ] Every status indicator across swept screens has icon + text pair.
- [ ] Visual diff (pre vs post) shows hard-edge shadows and brand fonts on every screen.

---

## New / Modified Screens

### Monitoring (sub-phase 3-5)

| File | Responsibility | Slice |
|------|----------------|-------|
| `src/screens/monitoring/MapDashboardScreen.tsx` | Host for v2 map; preserves existing Redux wiring; adds `ClusterLayer`, `AreaStatusOverlay`, `MonitoringToggleSheet` | `monitoringV2` |
| `src/components/monitoring/ClusterMarker.tsx` | Cluster bubble with count; `tracksViewChanges={false}`; key includes `{ zoomBucket, count }` | — |
| `src/components/monitoring/ClusteredUserMarkers.tsx` | Chooses `ClusterMarker` vs per-user `UserMarker` based on `zoomLevel >= cluster_zoom_threshold` | `monitoringV2` |
| `src/components/monitoring/MonitoringToggleSheet.tsx` | NB bottom-sheet: workers / plants / overdue / rayons / areas toggles | `monitoringV2.visibleLayers` |
| `src/components/monitoring/AreaStatusOverlay.tsx` | Area polygons filled by `area_plants.status` (green/yellow/red). `useFocusEffect` reload on tab return | `plants.areaStatusById` |
| `src/components/monitoring/PlantOverlayLayer.tsx` | Notable-plants markers (read-only for `satgas`/`linmas` per Q4 Apr 25 — pin tap shows species + heritage notes; no edit affordance) and overdue-count badges. Workers see notable plants in their own area only; korlap+ see CRUD on tap | `plants.notableByArea` |
| `src/components/monitoring/UserMarker.tsx` | **Unchanged** — preserves Apr 24 fixes | — |
| `src/components/monitoring/LocationTrail.tsx` | **Unchanged** — `requestAnimationFrame` guard | — |

### Tasks (sub-phase 3-7)

| File | Responsibility | Slice |
|------|----------------|-------|
| `src/components/tasks/PruningTaskForm.tsx` | Dynamic form (3 required enums per Q1 Apr 25 — full glossary in [README §Pruning Vocabulary](./README.md#pruning-vocabulary-q1--locked-apr-25-2026)): **case_type** (GT/PT/PS/PD/PK radio) + **pruning_action** (PM/PB/PC radio) + **source** (TIW/TS/CC/PW/Wk select); plus species autocomplete (131 entries), quantity input per species, partial-complete CTA. When opened from a assigned pruning_request, `source` is pre-filled and locked to the request's intake channel | `tasks` |
| `src/components/tasks/SpeciesAutocomplete.tsx` | Autocomplete with fuzzy match over `plant_species.name_id`; caches catalog in Redux | `plants.speciesCatalog` |
| `src/screens/tasks/TaskDetailScreen.tsx` | Adds "Lanjutkan Besok" CTA that calls `/tasks/:id/resume`; shows parent/child lineage | `tasks.lineageById` |
| `src/screens/tasks/PartialCompleteSheet.tsx` | Bottom sheet for partial completion (completed_count, plant_items) | — |

### Pruning requests (sub-phase 3-10)

| File | Responsibility | Role gate | Slice |
|------|----------------|-----------|-------|
| `src/screens/pruningRequests/SubmitScreen.tsx` | **Apr 27 redesign + May 1 week-picker:** single scrollable card-based form (Lokasi · Foto · Detail Pohon · Kontak · Minggu Preferensi · Catatan). GPS auto-captured on mount with manual refresh. Rayon + kecamatan preset from user profile. Photos min 1 max 5 (camera or gallery). Date row replaced by `WeekPicker` (vertical week cards with 7 informational per-day chips); submit DTO sends `expected_year` + `expected_iso_week` (ADR-038, ADR-035 amendment 2026-05-01). | `staff_kecamatan` | `pruningRequests` |
| `src/screens/pruningRequests/components/WeekPicker.tsx` | **May 1 new:** kecamatan replacement for `AvailabilityCalendar`. Renders 8 week cards stacked vertically. Each card shows ISO-week range ("5 – 11 Mei"), an overall capacity badge (`Available` / `Hampir Penuh` / `Penuh` / `Belum diatur`), and 7 small per-day chips (informational, not tappable) so the submitter sees within-week distribution at a glance. Tap returns `(year, isoWeek)`. Token-only (consumes `nbColors`/`nbSpacing`/`NBCard`/`NBBadge`/`NBText`). | `staff_kecamatan` | — |
| `src/screens/pruningRequests/PerantinganListScreen.tsx` | **Apr 27 new (May 9 confirmed canonical):** staff_kecamatan home tab. Page-title row + filter bar (mini-chips left, sort + filter icon buttons right with active-count badge) + `PerantinganRequestCard` rows + floating "+ Buat Permohonan" FAB. Uses `SortModal` and `PruningRequestFilterModal`. Token-only styling via `nbTokens`. Replaces the standalone `MyRequestsScreen` route at the navigator level (the legacy file remains but is no longer wired into the tab nav). | `staff_kecamatan` | `pruningRequests` |
| `src/screens/pruningRequests/MyRequestsScreen.tsx` | (Legacy) — kept for backward compat with prior tests; no longer in the active nav. | — | `pruningRequests` |
| `src/screens/pruningRequests/RequestDetailScreen.tsx` | Outcome view: assigned task + activities + photos | submitter, reviewer, admin | `pruningRequests` |
| `src/screens/pruningRequests/ReviewQueueScreen.tsx` | **May 9 redesign — full parity with `PerantinganListScreen`:** page-title row "Review Permohonan Perantingan" + filter bar (mini-chips + sort + filter icon buttons with active-count badge) + `PerantinganRequestCard` rows. **No FAB, no inline quick-action buttons** — admins tap a card to open `RequestDetailScreen` with `adminMode: true`, where approve / reject / assign-to-task live (matches `OvertimeDetailScreen` / Aktivitas pattern). Status filter is server-side (refetch on change); reference-code, requester-name, date range and rayon are local-only. Token-only styling via `nbTokens`. | `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin` | `pruningRequests` |
| `src/screens/pruningRequests/AssignToTaskSheet.tsx` | Bottom sheet: pick area, **scheduled_date** (specific calendar day inside the booked ISO-week — Q3 Apr 25 answer), target_plant_count, optional assignee. Shows the week's capacity chip (`8/10` style); the day-picker constrains selectable dates to days within the booked week (Mon–Sun) and disables past dates | `admin_data` | — |

### Seeds (sub-phase 3-12)

| File | Responsibility | Role gate | Slice |
|------|----------------|-----------|-------|
| `src/screens/seeds/SeedsListScreen.tsx` | Master list; low-stock badges | `admin_data` (Taman Aktif), `top_management` | `seeds` |
| `src/screens/seeds/SeedDetailScreen.tsx` | Ledger view per seed | same | `seeds` |
| `src/screens/seeds/AddTransactionScreen.tsx` | Record purchase / distribution / adjustment | same | `seeds` |

---

## Redux Slices (new)

| Slice | State | Thunks |
|-------|-------|--------|
| `monitoringV2` | `{ snapshot, visibleLayers, selectedUserId, selectedAreaId, clusterZoomThreshold }` | `fetchSnapshot`, `applyPatch` (WS), `toggleLayer` |
| `plants` | `{ speciesCatalog[], areaPlantsByArea, notableByArea, areaStatusById }` | `fetchSpeciesCatalog`, `fetchAreaPlants`, `upsertAreaPlants` |
| `pruningRequests` | `{ mine[], queue, byId, filters }` | `submit`, `fetchMine`, `fetchQueue`, `review`, `assignToTask` |
| `seeds` | `{ seeds[], transactionsBySeed }` | `fetchSeeds`, `fetchTransactions`, `recordTransaction` |

Existing `tasks` slice extended with `lineageById`, `partialComplete`, `resume`.

---

## Offline Queue Scaffolds (3-7, 3-10)

Full offline polish is **deferred to Phase 4** per [ADR-019](../../architecture/decisions/ADR-019-offline-connectivity-model.md). This phase scaffolds the queue items so Phase 4 can polish retry/conflict logic:

| Queue action | Triggered by | Payload |
|--------------|--------------|---------|
| `activity.submit` | `PruningTaskForm` submit when offline | `{ task_id, custom_fields, plant_items, photos[] }` |
| `activity.partial` | Partial-complete sheet submit when offline | `{ task_id, completed_count, plant_items, resume_tomorrow }` |
| `pruning_request.submit` | Kecamatan submit when offline | `{ address, expected_date, photos[], gps }` |

Scaffolds live in `src/services/sync/offlineQueue.ts` but are wired with a simple FIFO flush on connectivity restore. Retry / conflict / duplicate-guard logic is Phase 4 scope.

---

## Navigation Gates (`src/navigation/RootNavigator.tsx`)

| Role | Entry route | Visible tabs |
|------|-------------|--------------|
| `satgas` | `HomeScreen` | Home · Tasks · Map (read-only area) · Profile |
| `linmas` | `HomeScreen` | Home · Map · Profile |
| `korlap` | `HomeScreen` | Home · Tasks · Map · Profile |
| `admin_data` | `HomeScreen` | Home · Tasks · Map · Requests (review) · Seeds (if Taman Aktif) · Profile |
| `kepala_rayon` | `MapDashboardScreen` | Map · Tasks · Profile |
| `top_management` | `MapDashboardScreen` | Map · Overview · Profile |
| `staff_kecamatan` | `PerantinganListScreen` | Perantingan · Profile |

**Apr 27 redesign:** `staff_kecamatan` now flows through `MainNavigator` like every other role (the standalone `KecamatanNavigator` is removed). The 2-tab layout is **Perantingan** (request list with status filter, sort, and FAB → submit) + **Profile**. The redesigned `SubmitScreen` is a single scrollable card-based form (no wizard) reachable via the FAB; cards: Lokasi (auto GPS + rayon/kecamatan presets) · Foto (min 1 max 5, camera + gallery) · Detail Pohon (jumlah/tinggi/diameter) · Kontak (pemohon + ketua RT, name + phone) · Catatan (optional). The role still has no Monitoring entry — `MainNavigator.TAB_CONFIGS.staff_kecamatan` only contains Perantingan + Profile.

**Apr 28 Round 3 polish:**

- `RequestDetailScreen` follows the `ActivityDetailScreen` visual template (NB section cards with `NBCardHeader`/`NBCardContent`, uppercase `sectionTitle` + emoji, `infoRow`/`label`/`value` rows, status `NBBadge` from `getPruningRequestStatusColor/Label`, photo viewer + review decision sheet wrapped in `NBModal`). `RequestDetailScreen.tsx` is the visual sibling of `ActivityDetailScreen` and `TaskDetailScreen` from Apr 28 onward.
- Submit's exit flow now matches `TaskCreateScreen`: a manual `handleLeave` callback (2-button "Tidak / Ya" alert when there's unsent content) wired to both the **Batal** button and `FieldHomeHeader.onBack` via `navigation.setOptions`. `beforeRemove` is **not** used because `SubmitScreen` is a hidden `Tab.Screen` and that listener doesn't fire on tab navigators. The footer is a fixed Batal + Kirim row, identical in shape to TaskCreate / ActivitySubmission.
- Draft is restored on **every** focus via `useFocusEffect(restoreDraft)` — no one-shot ref guard. Tab screens stay mounted across visits, so a guard would suppress legitimate restore prompts. Save-on-blur was deliberately removed so a brief camera/gallery intent doesn't auto-write a draft that the next focus would re-surface; the 30 s autosave still runs as the canonical persistence path.
- `dateUtils.formatDate` / `formatDateLong` are null-safe (return `'-'` for null/undefined/invalid input) so the detail screen can render unset `expectedDate` / `reviewedAt` without crashing.

**Apr 28 Round 4 — preferred-date booking calendar:**

- `SubmitScreen` adds a 📅 **Tanggal Diharapkan** card between Detail Pohon and Kontak. Tapping the date row opens an `AvailabilityModal` (fullscreen `NBModal`) hosting a shared `AvailabilityCalendar` — an 8-week roll-forward grid driven by `GET /api/v1/rayons/:id/capacity` (now also accessible to `staff_kecamatan` for their own rayon). Days are colored from a UX-only projection of weekly capacity: 🟢 available · 🟡 ≥ 80 % booked · 🔴 booked ≥ capacity · ⚪ unknown (admin hasn't filled the slot). Past days are greyed; tapping a full / unknown cell raises an `Alert` instead of selecting. Selected date persists in the AsyncStorage draft (`expectedDate` field) and is sent to the backend as `detail_date`.
- `RequestDetailScreen` always renders the `Tanggal Diharapkan` row (reads "Belum dipilih" when null). Admin reviewers see a new ⚖️ **ATUR JADWAL** card with an "Atur Jadwal" button visible for status ∈ {`submitted`, `under_review`, `approved`}. The button opens `RescheduleSheet` — a sheet `NBModal` embedding the same `AvailabilityCalendar`. On confirm it dispatches `reschedulePruningRequest` which `PATCH`es `/api/v1/pruning-requests/:id/expected-date`.
- Storage stays weekly per ADR-035; the per-day visualization is a UX projection only (helper `screens/pruningRequests/utils/capacityCalendar.ts`). See the 2026-04-28 amendment in ADR-035.
- New mobile thunk + slice state: `pruningRequestsSlice.reschedulePruningRequest` + `reschedulingId`. Updates `byId` / `adminList` / `mine` so list and detail consumers refresh without an explicit refetch.

---

## WebSocket Integration

Subscribe on login via existing `WebSocketService`:

```ts
ws.on('status:v2',                 patch => dispatch(monitoringV2.applyStatusPatch(patch)));
ws.on('cluster:update',            patch => dispatch(monitoringV2.applyClusterPatch(patch)));
ws.on('inventory:updated',         patch => dispatch(plants.applyInventoryPatch(patch)));
ws.on('request:status-changed',    patch => dispatch(pruningRequests.applyStatusPatch(patch)));
ws.on('area:plant-status-changed', patch => dispatch(plants.applyAreaStatusPatch(patch)));
```

React components react via selectors; map re-renders only dirty cluster/polygon children.

---

## Feature Flag

`apps/mobile/src/config/featureFlags.ts`:

```ts
export const featureFlags = {
  clusterMarkersV2: { default: false, remoteOverrideKey: 'phase3.cluster_v2' },
  phase3Enabled:    { default: false, remoteOverrideKey: 'phase3.enabled' },
};
```

Rollout: enable `phase3Enabled` for pilot rayon (Selatan) first; `clusterMarkersV2` stays off until 3-5 regression suite passes. Lint rule prevents re-enabling `tracksViewChanges={true}` regardless of flag state.

---

## Testing (3-7 → 3-10 → 3-12 → 3-14)

| Test file | Scope |
|-----------|-------|
| `__tests__/components/PruningTaskForm.test.tsx` | dynamic fields render; species autocomplete; partial submit dispatches `activity.partial` queue action |
| `__tests__/components/ClusterMarker.test.tsx` | `tracksViewChanges={false}`; key stability across cluster-count changes |
| `__tests__/screens/ClusterStability.test.tsx` | 500 mock users; zoom in/out; assert no bitmap redraw storm (spy on `_requestLayout`) |
| `__tests__/screens/SubmitScreen.test.tsx` | Photo picker; GPS capture; offline queue fallback |
| `__tests__/screens/ReviewQueueScreen.test.tsx` | Approve / reject / convert flows; capacity chip visible |
| `__tests__/slices/pruningRequests.test.ts` | State machine transitions applied from WS patches |

Coverage target: maintain ≥ 80 % overall; ≥ 85 % on new files.

---

**Last Updated:** 2026-04-25

---

## Per-Flow Wireframe Reference

**Source:** Claude-Design bundle `sekar-handoff.zip` → `sekar/project/mobile-wireframes.html` (1,953 lines, 13 flows).

Each flow below lists the concrete screens extracted from the wireframes. Devs assigned to a milestone (see [README.md §Milestone Plan](./README.md#milestone-plan)) can jump to the relevant flow here to ground their implementation in the same UI the client approved.

Legend for UI tokens mentioned below: `--ok` = success / plant-ok, `--accent` = bg.accent.yellow, `--fill` = bg.accent.green, `--danger` = status-missing / plant-overdue, `--warn` = status-idle. All map back to [tokens.json](../../ui-ux/tokens.json) via the generator.

### Flow 01 — Auth & Role Gate (`src/screens/auth/*` · `RootNavigator`)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **AS-1 Login idle** | Identifier (phone or username) + password | Logo · two inputs · "Lupa sandi?" link · primary lg CTA "Masuk" |
| **AS-1.1 Login submitting** | Disabled state during auth | Spinner in button · form opacity 0.55 · inputs `readOnly` |
| **AS-1.2 Login error** | Invalid credentials / rate limit | Danger card + `!` icon · input borders `#B55` · CTA "Coba Lagi" |

Post-login: JWT role → route to role-specific home (HM-1…HM-5).

### Flow 02 — Onboarding (first-run, 3 steps) (shown once)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **OB-1 Welcome** | Greet user, step 1/3 | Greeting "Selamat datang, {name}" · 3-dot progress (1 filled) · illustration placeholder · CTA "Lanjut" (primary), "Lewati" (ghost sm) |
| **OB-2 Permissions** | Request Lokasi / Kamera / Notifikasi | 3-card list · badges `ok` (granted) / default (prompt) / `muted` (later) · CTA "Berikan Izin" |
| **OB-3 Area preview** | Show assigned territory | Card: Area / Rayon / Korlap · map with polygon + user dot (green) · CTA "Mulai" |

Persist `onboardingCompleted: true` in Keychain.

### Flow 03 — Home per role (`MainNavigator` routes by JWT role)

| Screen | Role | Key UI |
|--------|------|-------|
| **HM-1** | `satgas` / `linmas` | Greeting + ONLINE chip · shift card on `--ok` bg with time + "CLOCK OUT" (danger sm) · "Tugas hari ini" list · quick actions "+Aktivitas" "+Lembur" · tabs Home·Aktivitas·Tugas·Map·Profil |
| **HM-2** | `korlap` | 4-tile status grid (AKTIF/IDLE/MISS/OFF counts) · "Tugas area hari ini" · quick actions "+Buat Tugas" "Reassign" · tabs Home·Tugas·Map·Profil |
| **HM-3** | `kepala_rayon` | Map-first (30% viewport) + stats HEALTH 87% / OVERDUE 12 / REQUEST 4 · "Area butuh perhatian" list · tabs Home·**Map (default)**·Tugas·Profil · Entry route = `MapDashboardScreen` |
| **HM-4** | `top_management` / `admin_data` / `admin_system` / `superadmin` | City health 82% · "Rayon overview" 4-row list · Alerts section · tabs Home·Map·Overview·Profil |
| **HM-5** | `staff_kecamatan` | **Minimal shell — NO bottom tab bar, NO map** · hero "+ Ajukan Baru" primary lg · "Permohonan saya · terakhir" 3 rows · tabs Ajukan·Saya·Profil · `/monitoring/*` route guard redirects to submission |

### Flow 04 — Monitoring v2 · Map Dashboard (`MapDashboardScreen` — M2 sub-phase 3-5)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **MN-1** | Default map | Full-bleed Google Maps · polygon fills by `area_plants.status` · cluster bubbles dissolve at zoom ≥14 · FABs: zoom ±, locate, layer toggle · pinned bottom status strip `28 AKTIF · 6 IDLE · 2 OUT · 1 MISS` (mono) |
| **MN-2** | Worker list sheet | Drag-up sheet (max-height 70%) · tabs "Pekerja (37)" `--accent` active / "Area (8)" · 4 worker rows · map dims to 0.6 while sheet open |
| **MN-3** | User detail sheet | Avatar + name + role + status badge (`--ok` AKTIF) · cards SHIFT · PING TERAKHIR · AKTIVITAS HARI INI · actions "💬 WA" (`whatsapp://send?phone=...`), "📍 Trail", "📋 Log" |
| **MN-4** | Location history trail | Header "Trail: {user} · Hari ini · shift pagi" · date/shift filter chips · SVG polyline (dashed) · start dot green / end dot yellow · ping-timeline slider · selected ping `10:24 · dalam area · akurasi 8m` |
| **MN-5** | Layer toggle sheet | 6 toggles: Pekerja, Area boundaries, Tanaman overdue, Tanaman (semua), Rayon boundaries, Trail saya · badge `--ok` ON / `muted` OFF · CTA "Terapkan" |

**Preserve Apr 24 fixes** (§ top of this doc): cluster press = expand cluster **OR** snap sheet (not both) · `useFocusEffect` on boundary fetch · `LocationTrail` gated by `requestAnimationFrame` mount guard · Polygon remounts on refocus via `boundaryKey`.

### Flow 05 — Clock In/Out & Location Tracking (`ClockInOutScreen`)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **CL-1 Pre-shift idle** | Show assignment + confirm in-area | Card: SHIFT · AREA · LOKASI SAAT INI (lat/lng + accuracy) with "dalam area ✓" · map 120px · primary lg CTA "CLOCK IN" |
| **CL-2 In-shift tracking** | Live session | Header "Sedang Shift · Pagi · {elapsed} · ● LIVE" ok chip · status AKTIF · PING TERAKHIR · stats AKTIVITAS / POHON / JARAK · trail map (dashed polyline + current dot) · danger lg CTA "CLOCK OUT" |
| **CL-3 Out-of-area warning** | Worker left polygon > threshold | Header chip "● OUT" danger · error card "Kamu di luar area tugas · Sudah {N} menit. Korlap sudah diberi tahu." · JARAK KE AREA `±120 m` · CTAs "Kembali ke area" accent / "CLOCK OUT" danger |
| **CL-4 Clock-out summary** | Shift recap | Success card `--ok` "✓ Terima kasih! Shift pagi · 8 jam 2 menit" · summary AKTIVITAS/POHON/JARAK · timeline (mono 11px, clock-in → activities → clock-out) · CTA "Selesai" |

Auto-notify korlap when out-of-area exceeds threshold (WebSocket event `user:left-area` from Phase 2D, kept intact).

### Flow 06 — Tasks (M3 sub-phase 3-6 / 3-7)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **TS-1 Task list** | Tabs Aktif (n) / Selesai (n) | Active tab `--accent` bg · task cards with badge `PM`/`PC`/`PB` + state chip `DUE`/`OVER`/`PARTIAL·RESUME` + task ID · actions "Detail" / "Mulai" / "Lanjutkan" |
| **TS-2 Task detail** | Full task + species list + map | Card (bg `--accent`): type badge, title, DIBUAT OLEH, DEADLINE · Card: target species list · Card: Lokasi (map 100px + address) · CTAs "Tolak" sm / "Mulai Aktivitas" primary lg |
| **TS-3 Task create (korlap)** | New task form | Dropdowns JENIS · AREA · TANGGAL · ASSIGN multi-select list · inputs TARGET POHON, CATATAN · CTA "Buat Tugas" primary lg |

"Lanjutkan Besok" calls `POST /tasks/:id/resume`; UI updates via `tasks.lineageById`.

### Flow 07 — Pruning Task Form (`PruningTaskForm` — M3 sub-phase 3-7)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **PR-1 Step 1 (case + action + source)** | Pick the 3 required pruning enums | Card AREA · RAYON read-only · radio **Kasus** GT (selected) / PT / PS / PD / PK · radio **Aksi** PM / PB (selected) / PC · select **Sumber** TIW / TS / CC (default) / PW / Wk · CTA "Lanjut → Spesies". When opened from a assigned pruning_request, Sumber is pre-filled (PW or Wk) and locked. |
| **PR-2 Species autocomplete** | 131-species fuzzy search | Search input "🔍 {query}" · autocomplete list with ✓ selected row · JUMLAH POHON spinner (− / n / +) · CTA "Tambahkan" |
| **PR-3 Full form** | Photos + location + species list | Card KASUS · AKSI · SUMBER read-only summary chips · Card species list "Trembesi ×4, Sono ×2" with ⋯ menu + "+ Tambah spesies" · Card foto grid (sebelum/sesudah + "+" up to 5) · Card Lokasi (GPS + ±Xm + ✓ dalam area) · CTAs "Lanjut Besok" / "SELESAI" primary lg |
| **PR-4 Partial complete sheet** | Resume tomorrow | Title "LANJUTKAN BESOK" · info "Pohon yang belum selesai akan jadi sub-task baru untuk besok" · Cards SELESAI HARI INI (m/n: species list) / BESOK LANJUT (n pohon) · input CATATAN BESOK · CTAs "Batal" / "Simpan & Jadwalkan" primary |

Offline: dispatches `activity.submit` or `activity.partial` queue action.

### Flow 08 — Plants · Area Inventory (M3 sub-phase 3-8)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **PL-1 Area plants list** | Per-area inventory overview | Card (bg `--accent`): stats TOTAL / DUE (amber) / OVERDUE (red) · search input · filter chips "Overdue (n)" danger / "Due (n)" / "OK (n)" · species rows with count + state badge |
| **PL-2 Species detail** | Per-species-in-area drill-down | Illustration placeholder 100px · Card (bg `--danger` if overdue) STATUS + LAST PRUNED · Card Siklus (N-day interval, "sudah lewat N hari") · Card Aktivitas terbaru (mono 11px) · CTA "+ Buat Tugas Perantingan" |

Syncs via WebSocket `area:plant-status-changed` → `plants.applyAreaStatusPatch`.

### Flow 09 — Pruning Requests · Admin Review (`admin_data` — M4 sub-phase 3-10)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **PQ-1 Review queue** | Inbox list (May 9 redesign — parity with PerantinganListScreen / Tugas / Aktivitas / Lembur) | Page title "Review Permohonan Perantingan" · filter bar with active mini-chips (status / date / rayon / refcode / requester) and sort + filter icon buttons (active-count badge) · `PerantinganRequestCard` rows showing reference code, address, kecamatan, **submitter chip (full_name + role)**, tree count, status badge · tap row → opens `PQ-2` with `adminMode: true`. **No inline quick-action buttons** — approve / reject / convert happen on `PQ-2`. |
| **PQ-2 Request detail** | Reviewer view (May 9 redesign) | Status card now includes a **"Pemohon (Petugas)" row above "Diajukan"** showing `submitter.full_name · submitter.role` (visible to both kecamatan and admin). Action cards collapsed into a **sticky bottom action bar**: when `expectedDate` is empty the bar shows a single primary "📅 Atur Jadwal Dahulu" button + a hint that approval is gated on the schedule; once a date is set the button reverts to a small secondary "Atur Ulang Jadwal" and the action row enables (Tolak / Setujui for `submitted` / `under_review`, "Tugaskan ke Petugas" for `approved`). **Admin no longer sees a "Batalkan Permohonan" button** — cancel is submitter-only; admin disposition is approve / reject / convert via the formal review trail. RescheduleSheet ("Atur Jadwal") switched from `type="sheet"` to `type="fullscreen"` to fix layout collapse — sheet's `flexShrink: 1` height left the inner calendar ScrollView unbounded. Photos now arrive as base64 data-URIs (mirrors TaskCompleteScreen / OvertimeSubmitScreen) so admin reviewers actually see the staff_kecamatan submission instead of an unreachable `file://` URI. |
| **PQ-2 (legacy wireframe)** | Original Reviewer wireframe (superseded by the May 9 redesign row above; left here for spec history) | Card (bg `--accent`) title + PENGAJU + HARAPAN (date + count) · Card foto 2×2 grid · Card Kapasitas minggu N (progress bar "N/M slot") · Card Catatan warga · CTAs "✕ Tolak" danger / "? Info" / "✓ Approve" primary |
| **PQ-3 Convert-to-task sheet** | Disposition flow | Title "KONVERSI PR-{id}" · inputs AREA (dropdown) · TANGGAL (dropdown + week) · TARGET POHON · ASSIGN optional · Card KAPASITAS (before → after, OK) · CTAs "Batal" / "Buat Tugas" primary |

### Flow 10 — Kecamatan Submission (`staff_kecamatan` 5-step, M4 sub-phase 3-10)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **KC-1 Step 1/5 lokasi** | Address + GPS capture | Progress bar 5 segments (1 filled) · Card KECAMATAN auto-fill read-only · inputs ALAMAT, GPS LOKASI (bg `--ok`, 📍) · map 140px green dot · CTA "Lanjut →" |
| **KC-2 Step 2/5 foto** | 3–5 photos | Progress bar (2 filled) · instructions "cabang bermasalah · pemandangan · (opsional) jalur listrik" · grid (3 cols) 3 skels + "+" placeholders · CTA "Lanjut (3/5) →" |
| **KC-3 Step 3/5 detail** | Expected date + count + urgency + notes | Progress bar (3 filled) · row TGL HARAPAN + JUMLAH POHON · URGENSI button group (Rendah / Sedang active / Tinggi) · textarea CATATAN · PENGAJU auto-read · CTA "Lanjut →" |
| **KC-4 Step 4/5 preview** | Review before submit | Progress bar (4 filled) · Cards ALAMAT / DETAIL / FOTO (3 thumbs) / CATATAN · CTAs "Edit" / "Kirim" primary lg |
| **KC-5 Step 5/5 confirm (online)** | Success | Card `--ok` "✓ Berhasil terkirim!" · Card NOMOR PERMOHONAN `PR-2026-0142` large · message "Tim admin Rayon Selatan akan meninjau dalam 2 hari kerja…" · CTAs "Lihat Permohonan" / "Ajukan Lagi" ghost |
| **KC-5b Step 5 (offline fallback)** | Queued locally | Status bar `✈` · header chip "⏳ QUEUE" accent · 72px ⏳ icon · Card "1 permohonan dalam antrian · Akan dikirim otomatis saat online" · message "Foto dan data sudah disimpan di HP-mu. Nomor resmi akan didapat setelah terkirim." |
| **KC-6 My requests list** | Own submissions | Card (bg `--accent`) TOTAL · AKTIF · SELESAI · list rows with state badge `REVIEW` / `SCHED` / `DONE` / `NO` · tabs Ajukan · Saya (active) · Profil |
| **KC-7 Request outcome detail** | Completed request view | Card (bg `--ok`) badge "SELESAI · {date}" + title + description · Card Linimasa (mono 11px, 4 events) · Card Foto hasil 2×2 grid · CTA "💬 Hubungi kami di WhatsApp" |

Offline queue: `pruning_request.submit` — FIFO flush on reconnect; full retry/conflict logic is Phase 4 per [ADR-019](../../architecture/decisions/ADR-019-offline-connectivity-model.md).

### Flow 11 — Profile & Settings

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **PF-1 Profile** | Home for account | Avatar + name + role · phone · Card Assignment (AREA / RAYON / KORLAP) · Card Statistik bulan ini · rows "Pengaturan ›" / "Bantuan ›" / "Keluar" (danger bg) |
| **PF-2 Settings** | Preferences | Section AKUN (ubah sandi, nomor HP) · Section NOTIFIKASI (toggles) · Section APLIKASI (bahasa, hapus cache, versi) |
| **PF-3 Edit profile** | Change name / phone / email / avatar | Avatar 72px with "Ganti foto" · inputs NAMA / NO HP / EMAIL optional · CTA "Simpan" primary lg |

### Flow 12 — Notifications · Reports · Offline Queue (cross-cutting)

| Screen | Purpose | Key UI |
|--------|---------|-------|
| **NT-1 Notifications** | List of recent notifs | Header "Notifikasi · {n} belum dibaca" · cards with left border colored by urgency · timestamp · deep-link on tap |
| **NT-2 Reports (satgas history)** | Activity history | Tabs "Minggu ini" (`--accent` active) / "Bulan ini" / "Semua" · stats card JML / POHON / JAM · activity list rows with type badge PM/PC and state `OK`/`PART` |
| **NT-3 Offline queue status** | When offline | ✈ status bar · header "Antrian Offline · {n} menunggu" · Card (bg `--accent`) "Mode offline · akan sync saat online" · queue items with ⏳ · CTA "↻ Coba Sync Sekarang" |
| **NT-4 Offline syncing** | On reconnect | Header "Menyinkron · {m}/{n} selesai" · success card "2 dari 3 berhasil dikirim · estimasi sisa: {t}" · progress bar · per-item rows with ✓ or ↑ badges |

### Flow 13 — Empty · Error · Loading States (reusable components)

| Component | Purpose | Key UI |
|-----------|---------|--------|
| **ST-1 Empty — tasks** | No tasks today | 72px dashed-border ✓ icon · title "Tidak ada tugas hari ini" · message · CTA "↻ Muat ulang" |
| **ST-2 Loading list skeleton** | Pending fetch | 4 skeleton cards (height 80px) pulsing |
| **ST-3 Error — network failure** | Fetch failed | 72px solid-border `!` icon on `--danger` · title "Gagal memuat data" · message · CTAs "↻ Coba Lagi" primary / "Lihat cached" ghost |
| **ST-4 Permission denied (camera)** | OS permission blocked | 72px `📷` icon on `--accent` · title "SEKAR butuh kamera" · message · CTAs "Buka Pengaturan" primary / "Nanti saja" ghost |

All four live in `src/components/common/` as reusable NB primitives; every screen that can fail / be empty / be loading wires them via a standard `useAsyncState()` hook.

---

## How to work a milestone against these wireframes

1. Open the milestone you own in [README.md §Milestone Plan](./README.md#milestone-plan).
2. For each screen in scope, jump to the flow above by anchor name.
3. Grab the token names from the [UI/UX doc §Token References](./ui-ux.md#token-references-not-the-source-of-truth) — never copy hex.
4. Component inventory and Redux wiring are in the sections above this appendix.
5. Run visual-regression snapshot before opening a PR.

---
