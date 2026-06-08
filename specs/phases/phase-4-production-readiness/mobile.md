# Phase 4: Mobile Specifications

**Date:** May 22, 2026 (revamp pass — sections below the §UI/UX Revamp block remain from March 12; updated facts in §0)
**Status:** ⏳ Not Started
**Depends On:** Phase 3 M1-R complete; **Sub-Phase 4-0 (token re-baseline) blocks the §UI/UX Revamp work**
**Related Sub-Phases:** **4-R** (UI/UX Revamp), 4-2 (Offline), 4-3 (FCM hardening), 4-4 (Reassignment), 4-7 (Refactor), 4-8 (Prod hardening — non-UI)

---

## 0. Reality check — May 22, 2026 (overrides March-12 facts in §1)

| Fact | Updated value |
|------|---------------|
| Screens (current) | **21** (8 field + 9 monitoring + 4 shared); Phase 4 adds **7 NEW** screens → **28 total at Phase 4 finish** |
| FCM | **Live** in `be/.env` (`FCM_ENABLED=true`); mobile token reg + foreground/background already wired (May 16-17 commits) |
| ConnectivityBanner | Still does **not** exist — confirmed for Gap 1 → 4-2 |
| Deep linking | Not configured — 4-8 E3 |
| Sentry | Not integrated — 4-1 B4 |
| ProGuard | Default — 4-8 E1 |
| Background location | `react-native-geolocation-service@5.3.1` present; Android foreground-service + iOS background-mode wiring unverified — **4-V Gap 3** |

---

## <a id="ui-ux-revamp"></a>UI/UX Revamp (Sub-Phase 4-R) — hi-fi screen matrix

**Source:** [`design/project/hifi-mobile.html`](../../../design/project/hifi-mobile.html). Every row maps a hi-fi screen ID to its current code file (or `NEW`) with the action. **NEW** = file doesn't exist yet. **Revamp** = file exists but is rebuilt against hi-fi (layout, tokens, copy). **Token-only** = automatic visual pickup from regenerated tokens, no layout change.

### Pre-login carousel (5 NEW screens)

| Hi-Fi ID | Name | Current file | Action | Notes |
|----------|------|--------------|--------|-------|
| WL-1 | Splash · 1/5 | `screens/auth/SplashScreen.tsx` | ✅ Done (2026-05-25, `3f390c6`) | **Dedicated screen** (not a carousel slide): `SplashSlide` + `SekarPinwheel` (Green lockup, real tagline "Sistem Evaluasi Kerja Satgas RTH") + `PulsingDots`; dependency-free native boot splash (launch-theme technique) |
| WL-2 | Pantau real-time · 2/5 | `screens/auth/WelcomeCarouselScreen.tsx` | ✅ Done (2026-05-25, `d96aeea`) | Split-swipe carousel — `CarouselScenePanel` (illustration+title+subtitle swipe together); pinned `PaginationDots` + CTAs |
| WL-3 | Tugas terstruktur · 3/5 | WelcomeCarouselScreen | ✅ Done (2026-05-25) | Lanjut/Lewati CTAs ("Lewati" jumps to the last slide) |
| WL-4 | Permohonan kecamatan · 4/5 | WelcomeCarouselScreen | ✅ Done (2026-05-25) | Perantingan illustration scene |
| WL-5 | Offline-ready · 5/5 | WelcomeCarouselScreen | ✅ Done (2026-05-25) | Single "Mulai (Masuk)" CTA; Login pushed (back button → carousel) |

**Files:** `screens/auth/SplashScreen.tsx` (WL-1, dedicated) + `screens/auth/WelcomeCarouselScreen.tsx` (WL-2…5) with `components/auth/CarouselScenePanel` + `components/common/PaginationDots`. Splash + carousel **always** lead the logged-out flow (the `carousel_seen` gate was dropped); the old all-in-one `OnboardingSlide` was removed.

### Login & auth (5 screens — 3 revamp + 2 NEW)

| Hi-Fi ID | Name | Current file | Action | Notes |
|----------|------|--------------|--------|-------|
| AS-1 | Login · idle | `fe/mobile/src/screens/auth/LoginScreen.tsx` | ✅ Done (2026-05-25) | Hi-fi layout (Selamat datang hero + Identifier + Password + Masuk button + Lupa sandi link); back button (`testID=login-back`) → carousel when `canGoBack` |
| AS-2 | Login · field error | LoginScreen | ✅ Done (2026-05-25) | Inline per-field validation states |
| AS-3 | Login · auth-fail toast | LoginScreen | ✅ Done (2026-05-25) | NBToast instead of native `Alert` |
| AS-4 | Lupa sandi · contact admin | `screens/auth/ForgotPasswordScreen.tsx` | ✅ Done (2026-05-25) | Informational, no API call. tel:/wa.me deep-links per [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md) |
| AS-5 | Ganti sandi · forced after reset + success | `screens/auth/ChangePasswordScreen.tsx` | ✅ Done (2026-05-25) | Tied to backend `users.password_must_change`; RootNavigator routes here on first login post-reset (precedes onboarding) |

### Onboarding & permissions (3 NEW screens)

| Hi-Fi ID | Name | Current file | Action | Notes |
|----------|------|--------------|--------|-------|
| OB-1 | Welcome (greeting + role badge) | `screens/onboarding/OnboardingWelcomeScreen.tsx` | ✅ Done (2026-05-25) | Waving card + "Hai, {firstName}" (sage name chip) + Lanjut/Lewati; reuses `PaginationDots` |
| OB-2 | Permissions · 2/3 | `screens/onboarding/OnboardingPermissionsScreen.tsx` | ✅ Done (2026-05-25) — **replaced** `PermissionsModal` | 5 permission rows (notif/location/background-location/camera/gallery), per-row "Izinkan" + status pill, **no skip** (Lanjut gated until all addressed); old startup modal removed from App.tsx; +runtime re-check on resume |
| OB-3 | Area preview · 3/3 | `screens/onboarding/OnboardingAreaPreviewScreen.tsx` | ✅ Done (2026-05-25) | Area name + radius + static pin from `auth.area`, role-variant CTA (korlap card omitted — no data); routing via Redux `onboardingCompleted` + AsyncStorage flag |

**First-launch detection:** `AsyncStorage` flag `onboarding_completed` set on OB-3 completion. Auth-guard routes: not-authenticated → carousel/login; authenticated + `password_must_change=true` → AS-5; authenticated + `!onboarding_completed` → OB-1; else → role-aware home.

### Post-login revamp (existing screens — layout + tokens)

| Hi-Fi ID | Name | Current file | Action |
|----------|------|--------------|--------|
| (anchor) | Home dispatcher (role-aware) | `fe/mobile/src/screens/home/HomeScreen.tsx` | ✅ Done (Checkpoint 1c) — switches on `auth.user.role` |
| HOME-1 | Home · Satgas/Linmas | `fe/mobile/src/screens/home/FieldHomeScreen.tsx` | ✅ Done (Checkpoint 2b; polished 6, 7) — absensi hero (**collapsible**, whole-card tap → toggle; "Detail shift →" link) + **"Ringkasan hari ini" tiles directly under hero**. Inline Tugas list removed; the **Tugas tile opens `TodayTasksModal`** (like Aktivitas/Jam kerja). |
| HOME-2 | Home · Korlap/Kepala Rayon | `fe/mobile/src/screens/home/CoordinatorHomeScreen.tsx` | ✅ Done (Checkpoint 3; polished 6) — team-status hero (**role-tinted `RoleAvatar` grid**) + 5-status KPI grid + derived out-of-area/missing alerts |
| HOME-3 | Home · Admin Data | `fe/mobile/src/screens/home/AdminDataHomeScreen.tsx` | ✅ Done (Checkpoint 4) — perantingan-queue hero + disposition breakdown + "berjalan" list (overtime-approvals dropped: admin_data isn't an approver) |
| (no hi-fi) | Home · Top Mgmt / Admin Sys / Superadmin | `fe/mobile/src/screens/home/ExecHomeScreen.tsx` | ✅ Done (Checkpoint 5) — NET-NEW (no hi-fi): city-overview hero + personnel KPI grid + per-rayon roll-up. Added a Beranda tab to these roles. |
| (no hi-fi) | Home · Staff Kecamatan | `fe/mobile/src/screens/home/KecamatanHomeScreen.tsx` | ✅ Done (Checkpoint 5) — NET-NEW (no hi-fi): "my requests" hero + status breakdown + recent list. Added a Beranda tab. |
| (chrome) | Shared masthead + bottom tab bar | `components/navigation/FieldHomeHeader.tsx`, `navigation/MainNavigator.tsx` | ✅ Done (Checkpoints 1a/1b; polished 6; nav refactor 2026-05-31) — masthead uses shared **`RoleAvatar`** (tap opens Profile via `useNavigation().navigate('Profile')`), smaller role/name fonts, status chip left of the bell. **Profile removed from tab bar:** `MainNavigator` is now a NativeStack wrapping inner `TabNavigator`; Profile/Settings/EditProfile/ShiftHistory are stack screens that slide from the left over the full viewport. `NB_HEADER_STYLE` const shared by both the tab `headerStyle` and the `withProfileHeader` HOC wrapper — single source of truth for 76 px NB header chrome. |
| (primitive) | `RoleAvatar` (v2.1 avatar) | `fe/mobile/src/components/common/RoleAvatar.tsx` | ✅ Done (Checkpoint 6) — role-accent tint + black initials, renders `profile_picture_url` when set; used by masthead + team grid |
| (sheets) | Home Ringkasan bottom sheets | `components/modals/Today{Activities,WorkHours,Tasks}Modal.tsx`, `components/common/ShiftCard.tsx` | ✅ Done (Checkpoint 7) — all three on `NBModal` + `NBText`/tokens; `TodayTasksModal` new; `ShiftCard` Text→NBText |
| ABS-1 | Clock-in · GPS + selfie | existing absensi screen | ✅ Done (2026-05-27) — time hero (live clock + date), always-visible GPS status row + NBBadge (DI AREA/LUAR AREA), NBAlert for inside/outside area state |
| ABS-2 | Clock-in · Di luar area | existing | ✅ Done (2026-05-27) — cardOutside tint + NBAlert warning (visual-only; soft geofencing kept) |
| ABS-3 | Shift history | existing | ✅ Done (2026-05-27) — monthly grouping (replaces per-date), tap-to-open ShiftDetailModal, 2-tile summary retained (tests stable) |
| MON-1 | Map · Korlap view | monitoring screen + `components/monitoring/*` | ✅ Done (2026-05-26); **M3 revamp 2026-06-06** — two-axis presence (CP6: activity `aktif/idle/missing/offline` × location `dalam/luar/unknown`, derived on read, no migration); markers = activity fill + purple ring on `luar_area`; peek `StatusSummaryBar` = **3 activity chips** each with a `dalam · luar` split (CP6c); fullscreen search modal + native marker callout + recents (CP-SEARCH); compass FAB |
| MON-2 | Personnel sheet | `UserDetailSheet.tsx` | ✅ Done (2026-05-26); **M3 2026-06-06** — rebuilt on `NBModal` w/ tile-driven sub-sheets (Lokasi/Jam kerja/Tugas/Aktivitas); presence pill keyed on the activity axis + a "Luar area" pill when outside (CP6b) |
| MON-3 | Tools FAB · expanded | `MapDashboardScreen` inline toolbox | ✅ Done (2026-05-26); **M3 2026-06-06** — wrench filter switched status→**Lokasi** (Dalam/Luar area, client-side); activity filtering moved to the peek chips (CP6c) |
| MON-4 | Area/Rayon detail modal | `components/modals/BoundaryDetailModal.tsx` | ✅ Done (M3 2026-06-06, CP7) — rebuilt raw `@gorhom/bottom-sheet` → `NBModal` on the `UserDetailSheet` language: hero (icon chip · name · sub-line · `StatusPill`), `HomeStatTile` KPI row, tokenised staffing rows (area: per-role delta pills + Reassign; rayon: area-list pills), **plant status + heritage in a nested "Tanaman" sub-sheet** |
| TUG-1 | Tugas list · filtered tabs | `fe/mobile/src/screens/taskActivity/TasksActivityScreen.tsx` | ✅ Revamped (2026-05-29) — **standardized list card**: `TaskCard`/`ActivityCard`/`OvertimeCard` rebuilt as thin wrappers over the new shared `components/common/ListItemCard` (dotted `StatusPill` + created date + title + description + meta chips + creator). Same card applied to `TodayTasksModal`/`TodayActivitiesModal`; `ShiftCard`/`ShiftHistoryScreen` headers aligned (pill+title, time grid kept). `taskPill` extended to 8 statuses; new `activityPill`/`overtimePill`. `TasksTab` states: error→illo-offline+retry, filtered-empty→illo-search (`isFiltered`). Prior token-shim pass 2026-05-26 |
| TUG-2 | Tugas detail | `fe/mobile/src/screens/field/TaskDetailScreen.tsx` | ✅ Done (2026-05-26) — 20× gray bracket-notation → flat; all nbBorders.base/nbBorderRadius shims migrated |
| TUG-3 | Selesaikan tugas | `fe/mobile/src/screens/field/TaskCompleteScreen.tsx` | ✅ Done (2026-05-26) — 📸 emoji → MaterialCommunityIcons camera; tokens were already clean |
| AKT-1 | Submit aktivitas | `fe/mobile/src/screens/field/ActivitySubmissionScreen.tsx` | ✅ Done (2026-05-27) — emoji section headers → MaterialCommunityIcons; all Phase 2 token shims removed; supporting files: ActivityCard, ActivitiesTab, ActivityDetailScreen, TaskCard, TasksTab, PlantStatusChip, SortModal, TaskCreateScreen |
| AKT-2 | Aktivitas list | `fe/mobile/src/screens/taskActivity/tabs/ActivitiesTab.tsx` | ✅ Done (2026-05-27) — raw Text → NBText; nbTypography/nbBorderRadius shims removed |
| LBR-1 | Lembur list | OvertimeListScreen | ✅ Done (2026-05-27) — monthly summary card (JAM LEMBUR · BULAN INI, X dari Y ACC pill); OvertimeCard: raw Text→NBText, nbTypography→variants, emoji chips→MaterialCommunityIcons |
| LBR-2 | Ajukan lembur | OvertimeSubmitScreen | ✅ Done (2026-05-27) — State A: date hero card (TANGGAL · Indonesian date, primary tint); State B: DURASI tinted card (amber bg, display-xl elapsed timer) |
| LBR-3 | Detail lembur · disetujui | OvertimeDetailScreen | ✅ Done (2026-05-27) — status header with `#XXXXXXXX` ID code + badge; 2-tile info grid (TANGGAL/JAM, statusIdleBg tint); RIWAYAT PENGAJUAN timeline (Diajukan→Disetujui/Ditolak→Akan dijalankan); Phase 2 shims removed (nbBorderRadius→nbRadius, nbBorders.base→widthBase, gray[50]→gray50) |
| PRT-1 | Submit · Kecamatan | `fe/mobile/src/screens/pruningRequests/SubmitScreen.tsx` | Revamp (keeps Apr-27/28 Phase 3 redesign; visual pass to v2.1) |
| PRT-2 | Review queue · Admin Data | ReviewQueueScreen (pruning-requests list, admin filter) | ✅ CP3 done (2026-06-08) — `NBPageHeader` + flat-token sweep; rows via CP1 `PerantinganRequestCard` with a derived SLA-urgency pill (`utils/sla.ts`, open statuses only, `<6h` neutral/`<24h` warn/`≥24h` bad, label `SLA Nj`) hung off the card `extraTag`. Shared `PruningRequestFilterModal` swept in CP2. New `sla.test` + ReviewQueue SLA assertion |
| PRT-3 | Detail permohonan | RequestDetailScreen | Revamp |
| PRT-4 | Pengajuan saya · Kecamatan | PerantinganListScreen (live `Perantingan` tab) | ✅ CP2 done (2026-06-08) — full v2.1 sweep: `NBPageHeader` + `NBFabBar` + `NBText`, flat tokens; rows via the CP1 `PerantinganRequestCard`. Shared `PruningRequestFilterModal` swept alongside. New test suites (12 + 14 cases). CP1 (2026-06-08): card rebuilt on `ListItemCard` + `pruningPill`; dead `MyRequestsScreen` deleted |
| PRF-1 | Profile · Satgas | ProfileScreen | ✅ Done (2026-05-28) — compact identity strip (`ProfileHeader` = RoleAvatar 52px + `ROLE · RAYON` mono line + `@username · sejak <year>`), `ProfileStatsRow` (3 HomeStatTiles, field/monitoring, `—` fallback), grouped `ProfileMenu` (Akun/Aplikasi chip-rows + logout danger row), `AssignedAreaCard` relaid out; dead Field/MonitoringStatsCard removed; ChangePassword/About modals kept outside ScrollView |
| PRF-2 | Pengaturan | SettingsScreen | ✅ Done (2026-05-28) — hi-fi sections (Notifikasi/Lokasi & data/Offline sync/Tentang), custom NB toggle, live offline-sync card via `useProfileSync`, duplicate title removed, shims gone |
| PRF-3 | Edit profil | EditProfileScreen | ✅ Done (2026-05-28) — RoleAvatar 88px + edit badge, "Tidak bisa diubah" locked mono card, sticky Save footer, NBToast feedback, back→Profile |
| NOTIF-1 | Inbox · 3 baru | `fe/mobile/src/screens/common/NotificationsScreen.tsx` | ✅ Done (2026-05-24, M3d) — `FlatList` inbox (pull-to-refresh, mark-all-read, row tap → optimistic read + deep-link to TaskDetail/PruningDetail), `NBEmptyState`; `components/navigation/NotificationBell.tsx` (unread badge, caps 99+) in every authenticated header; registered as a hidden tab (`tabBarButton: () => null`) |

### Navigation routing changes

Update `fe/mobile/src/navigation/AppNavigator.tsx` (or equivalent) with three pre-main routes (carousel / forgot-password / change-password / onboarding) gated by AsyncStorage flags + `password_must_change` server flag. NotificationsScreen reachable via header bell icon (badge with unread count) on every authenticated screen.

### Brand assets in mobile

- `fe/mobile/src/assets/brand/sekar-mark.svg` — header logo (22 × 22 px standard)
- ✅ `fe/mobile/src/components/nb/illustrations/index.tsx` — 6 inline SVG illustrations (`illo-reports/shifts/offline/location/search/personnel`, react-native-svg, token colors) wired via `NBEmptyState`'s `illustration` prop (2026-05-28). Used in ShiftHistory (shifts/offline/search), OvertimeList (reports/search), Tasks/Activities tabs (reports); personnel/location available for monitoring screens.
- `fe/mobile/src/assets/onboarding/onb-*.svg` — 3 scenes (OB-1/2/3)
- ✅ iOS `Images.xcassets/AppIcon` + Android `mipmap-*/ic_launcher*` (+ adaptive `mipmap-anydpi-v26`) — SEKAR app icon (2026-05-28): tilted white NB-box lockup + pinwheel, transparent background (no field); generated by `fe/mobile/scripts/generate-app-icon.mjs` (sharp). Standard lockup = `SekarLogoBox`.
- ✅ iOS `LaunchScreen.storyboard` (pinwheel `UIImageView` above the SEKAR label, `SekarPinwheel.imageset`) — shows the box-lockup on white (2026-05-28).
- ✅ Android `res/drawable/bootsplash.xml` — two layers: sage canvas + centered `splash_icon` (200dp). **No text in native stages** — `windowSplashScreenBrandingImage` removed (Android stretches it to full screen width at uncontrollable position; can't match window-bg layout). SEKAR wordmark + tagline appear in WL-1 (`SplashSlide.tsx`). Both OS splash and window-bg stages are now visually identical (2026-05-29).
- `react-native-bootsplash` config update for new splash
- ✅ `SekarLogoBox` is the canonical SEKAR mark (white NB box + pinwheel, tilt prop) — used in Login (with `SEKAR` wordmark), `SplashSlide`, the app icon, and the native splash. Hard-edge ink shadow via absolute-positioned black View offset `size × 0.075` (not elevation — elevation renders as soft blur on Android). Border: `size × 0.04`. Radius: `size × 0.2`. All match app icon + native splash geometry (2026-05-29).

---

## 1. Current Codebase Facts (Verified March 12, 2026 — refreshed May 22 in §0)

| Fact | Value |
|------|-------|
| Screens | 21 (8 field worker + 9 monitoring + 4 shared) |
| Tests | 3,669+ passing (80.31%+ coverage) |
| Offline sync | syncManager.ts covers 4 of 7 action types (shift-clock-in, shift-clock-out, location-update, activity-submit) |
| Missing queue types | overtime-start, overtime-end, task-completion, reassignment |
| FCM | Packages installed, token registration not wired to login/logout |
| Deep linking | Not configured (no App Links / Universal Links) |
| Crash reporting | Not integrated (no Sentry / Crashlytics) |
| ProGuard | Default RN config, no custom rules |
| Bundle size | Not measured |
| ConnectivityBanner | Does not exist — no differentiation between no-internet and server-unreachable |

---

## A. Offline Sync Completion (Sub-Phase 4-2)

### A1. ConnectivityStatus Enum

**File:** `fe/mobile/src/services/sync/connectivityStatus.ts`

```typescript
export enum ConnectivityStatus {
  ONLINE = 'online',
  NO_INTERNET = 'no_internet',
  SERVER_UNREACHABLE = 'server_unreachable',
}
```

Detection logic:
1. `NetInfo.fetch()` → if no internet → `NO_INTERNET`
2. If internet available, `GET /health` with 5s timeout → if fails → `SERVER_UNREACHABLE`
3. If health responds → `ONLINE`

### A2. SyncManager Expansion

**File:** `fe/mobile/src/services/sync/syncManager.ts`

New queue item types to add:

| Queue Type | Payload | Sync Endpoint |
|------------|---------|--------------|
| `overtime-start` | `{ latitude, longitude, selfie_photo? }` | `POST /overtime/start` |
| `overtime-end` | `{ activity_type_id, description, photos? }` | `POST /overtime/end` |
| `task-completion` | `{ taskId, notes?, photos? }` | `PATCH /tasks/:id/complete` |
| `reassignment` | `{ userId, targetAreaId }` | `POST /monitoring/reassign` |

### A3. Heartbeat Polling

**File:** `fe/mobile/src/services/sync/syncManager.ts`

```
When status = NO_INTERNET:
  - Listen to NetInfo change events (immediate detection)
  - On internet restored → check GET /health → transition to ONLINE or SERVER_UNREACHABLE

When status = SERVER_UNREACHABLE:
  - Poll GET /health every 30s (consistent with ADR-019)
  - On success → transition to ONLINE, trigger queue flush
  - After 10 consecutive failures → show "Extended outage" message
  - Rationale: 30s balances detection speed vs server load from degraded clients
```

### A4. Connectivity Banner

**File:** `fe/mobile/src/components/common/ConnectivityBanner.tsx`

| Status | Color | Icon | Text |
|--------|-------|------|------|
| `NO_INTERNET` | Yellow (#F59E0B) | wifi-off | "Tidak ada koneksi internet" |
| `SERVER_UNREACHABLE` | Orange (#F97316) | server-off | "Server tidak dapat dihubungi" |
| `ONLINE` (after recovery) | Green (#22C55E) | check | "Terhubung kembali" (auto-dismiss 3s) |

- Rendered at top of screen, below status bar
- Animated slide-down entrance, slide-up dismiss
- Shows pending queue count: "3 perubahan menunggu sinkronisasi"

### A4b. Connectivity Banner — token-compliant restyle

The existing A4 spec lists hex literals (`#F59E0B`, `#F97316`, `#22C55E`). With Design System v2.1 those must come from tokens. Restate using v2.1 tokens:

| Status | Token bg | Token fg | Icon (Lucide) | Text (Indonesian) |
|--------|----------|----------|---------------|--------------------|
| `NO_INTERNET` | `--warning-bg` | `--warning-fg` | `wifi-off` | "Tidak ada koneksi internet" |
| `SERVER_UNREACHABLE` | `--danger-bg` | `--danger-fg` | `server-off` (or `cloud-off`) | "Server tidak dapat dihubungi" |
| `ONLINE` (recovery toast, 3 s) | `--success-bg` | `--success-fg` | `check` | "Terhubung kembali" |

- 2 px black border (`--bw`), `--r-base` corners, `--sh-xs` shadow — the banner is a card, not flat.
- Pending-queue badge ("3 perubahan menunggu") uses `--paper` chip with mono text — same chip primitive as bell badge.
- Animated slide-down entrance 220 ms ease-out, slide-up dismiss 180 ms.

### <a id="offline-screen-matrix"></a>A5. Offline behavior matrix — per-screen behavior by connectivity state

Goal: every screen has an explicit verdict for what it does when the user is `NO_INTERNET` or `SERVER_UNREACHABLE`. Default mistake (silent failure or generic error) is no longer acceptable.

**Three categories per screen:**

- **Works offline (cached)** — reads from local cache / Redux / AsyncStorage; user can browse and submit, writes go to offline queue.
- **Read-only offline (degraded)** — shows last-cached data with a "Data offline" banner; mutations are disabled with a toast "Aksi ini butuh koneksi".
- **Unavailable offline** — replaced by a full-screen `OfflineScreen` (illustration `illo-offline` + headline "Anda offline" + retry button + "Coba lagi" + status-specific subtitle).

| Screen / Flow | NO_INTERNET behavior | SERVER_UNREACHABLE behavior | Justification |
|---------------|---------------------|------------------------------|----------------|
| **Pre-login WL-1…5 carousel** | Works offline | Works offline | Static content, no API |
| **AS-1…3 Login** | Unavailable | Unavailable | Cannot validate credentials without server |
| **AS-4 Forgot password** | Works offline | Works offline | Static content (admin contacts) |
| **AS-5 Change password** | Unavailable | Unavailable | Requires backend write |
| **OB-1 / OB-3** | Works offline | Works offline | Static greeting + locally-cached area |
| **OB-2 Permissions** | Works offline | Works offline | OS-level dialogs |
| **HOME-1/2/3** | **Read-only offline** | **Read-only offline** | Show last-cached shift + today's tasks; "Clock-in" button works (queues) |
| **ABS-1 Clock-in (GPS + selfie)** | **Works offline** | **Works offline** | Captures photo + GPS locally, queues submission |
| **ABS-2 Clock-in out-of-area** | **Works offline** | **Works offline** | Same as ABS-1 with warning flag |
| **ABS-3 Shift history** | **Read-only offline** | **Read-only offline** | Show cached history; pull-to-refresh disabled with toast |
| **MON-1 Map (korlap)** | **Read-only offline** | **Read-only offline** | Last snapshot from Redux; live updates paused; banner "Pantauan offline · update terakhir {time}" |
| **MON-2 Personnel sheet** | Read-only offline | Read-only offline | Cached personnel list |
| **MON-3 Tools FAB** | Read-only offline | Read-only offline | Reassign action queued |
| **TUG-1 Tugas list** | **Read-only offline** | **Read-only offline** | Cached list + filter tabs work locally |
| **TUG-2 Tugas detail** | **Read-only offline** | **Read-only offline** | Cached detail; photos may not load if not cached |
| **TUG-3 Selesaikan tugas** | **Works offline** | **Works offline** | Form fills locally; submission queues |
| **AKT-1 Submit aktivitas** | **Works offline** | **Works offline** | Form + photos local; submission queues |
| **AKT-2 Aktivitas list** | **Read-only offline** | **Read-only offline** | Cached list |
| **LBR-1 Lembur list** | **Read-only offline** | **Read-only offline** | Cached |
| **LBR-2 Ajukan lembur** | **Works offline** | **Works offline** | Queues |
| **LBR-3 Detail lembur** | Read-only offline | Read-only offline | Cached |
| **PRT-1 Submit · Kecamatan** | **Works offline** | **Works offline** | Already drafts to AsyncStorage (Phase 3 Apr-27 Round 2 — preserves) + queues |
| **PRT-2 Review queue** | Read-only offline | Read-only offline | Cached list |
| **PRT-3 Detail permohonan** | Read-only offline | Read-only offline | Cached |
| **PRT-4 Pengajuan saya** | Read-only offline | Read-only offline | Cached |
| **PRF-1 Profile** | Read-only offline | Read-only offline | Cached `/auth/me` snapshot |
| **PRF-2 Pengaturan** | **Works offline** | **Works offline** | Local-only toggles (e.g., dark mode); server-bound toggles disabled with toast |
| **PRF-3 Edit profil** | Unavailable | Unavailable | Server write required |
| **NOTIF-1 Inbox** | Read-only offline | Read-only offline | Cached notifications; mark-read queued |
| **Settings → Reset password** | Unavailable | Unavailable | Server-only |
| **Settings → Notification preferences** | Read-only offline (read cached, mutations queue) | Read-only offline | — |
| **Any deep-linked entity loaded fresh from FCM tap** | If not cached → Unavailable | If not cached → Unavailable | Fallback to NOTIF-1 with toast "Buka notifikasi saat online" |

**Implementation rule:** every screen reads connectivity from `useConnectivity()` hook and conditionally renders one of three states. The `OfflineScreen` component is the same across "Unavailable" cases — only the subtitle changes per status:

- `NO_INTERNET` subtitle: "Aktifkan WiFi atau data seluler"
- `SERVER_UNREACHABLE` subtitle: "Server SEKAR sedang tidak dapat dihubungi. Coba lagi nanti."

`OfflineScreen` uses the `illo-offline.svg` illustration from `design/project/illustrations.html`. Per [`ui-ux.md § 3.4`](./ui-ux.md#34-empty-state-illustrations-6-svgs).

### A5b. Offline error screen — visual spec

**File:** `fe/mobile/src/components/common/OfflineScreen.tsx`

```
┌────────────────────────────────────┐
│            [illo-offline]           │   ← SVG, 180 × 180, centered
│                                     │
│           Anda offline              │   ← Space Grotesk 800, 24 px, --black
│                                     │
│   Aktifkan WiFi atau data seluler  │   ← Inter 14 px, --g700
│   untuk menggunakan fitur ini.      │
│                                     │
│    ┌──────────────────────────┐    │
│    │  ↻  Coba lagi             │    │   ← NBButton.primary full-width
│    └──────────────────────────┘    │
│                                     │
│    ┌──────────────────────────┐    │
│    │     Lihat data offline    │    │   ← NBButton.ghost (deep-links to NOTIF-1 / cached tab)
│    └──────────────────────────┘    │
└────────────────────────────────────┘
```

- Background: `--paper` warm stone, dot-grid pattern
- Layout centered vertically + horizontally
- Retry button: triggers `syncManager.checkHealth()` immediately; if healthy → ONLINE + flush queue + auto-dismiss; if still failing → shake animation + brief NBToast "Masih offline"
- "Lihat data offline" link visible only on screens that have a usable cached fallback

### A6. Timezone Verification

All offline-queued items must store timestamps as ISO 8601 with Asia/Jakarta offset (`+07:00`):

```typescript
const timestamp = new Date().toISOString(); // UTC — converted on display
```

- Backend stores UTC (no change)
- Frontend displays using `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta' })`
- Verify: format all dates as DD/MM/YYYY HH:mm WIB

---

## State Management

### Redux Slices

**`notificationsSlice`** — `fe/mobile/src/store/slices/notificationsSlice.ts`

| State Field | Type | Description |
|-------------|------|-------------|
| `unreadCount` | `number` | Badge count shown on bottom tab icon |
| `notifications` | `Notification[]` | Full list fetched from `GET /notifications` |
| `activeFilter` | `'all' \| 'unread' \| 'tasks' \| 'shifts'` | Currently selected filter tab |
| `status` | `'idle' \| 'loading' \| 'succeeded' \| 'failed'` | Fetch state |

**`connectivitySlice`** — `fe/mobile/src/store/slices/connectivitySlice.ts`

| State Field | Type | Description |
|-------------|------|-------------|
| `status` | `ConnectivityStatus` | Enum: `ONLINE \| NO_INTERNET \| SERVER_UNREACHABLE` |
| `lastChecked` | `string \| null` | ISO 8601 timestamp of last health check |

### New Services

**`NotificationService`** — `fe/mobile/src/services/notifications/notificationService.ts`

- FCM token registration on login, deregistration on logout
- Token refresh subscription via `messaging().onTokenRefresh()`
- Preference sync: `GET /users/:id/notification-preferences` and `PATCH /users/:id/notification-preferences`

**`ConnectivityService`** — `fe/mobile/src/services/sync/connectivityService.ts`

- Heartbeat polling (`GET /health` every 30s when `SERVER_UNREACHABLE`)
- NetInfo change subscription for `NO_INTERNET` detection
- State transitions dispatched to `connectivitySlice`
- On recovery to `ONLINE`: triggers offline queue flush via `syncManager`

### NotificationsScreen Component Tree

```
NotificationsScreen
└── FilterTabs (tabs: All / Unread / Tasks / Shifts)
└── NotificationList (FlatList, pull-to-refresh)
    └── NotificationItem (mark-read on tap, swipe-to-dismiss)
```

### Navigation Changes

- **Worker tab navigator** — add `NotificationsScreen` tab with unread count badge
- **Supervisor tab navigator** — add `NotificationsScreen` tab with unread count badge
- Tab icon: bell icon; badge shows `unreadCount` from `notificationsSlice` (hidden when 0)

---

## Auth Token Management

- Tokens stored in **encrypted storage** via `react-native-encrypted-storage` (AES-256, hardware-backed on Android)
- **Axios request interceptor:** attaches `Authorization: Bearer <accessToken>` header to all outgoing requests
- **Axios response interceptor:** on 401 response → calls `POST /auth/refresh` with the stored refresh token → retries the original request with the new access token
- **Refresh mutex:** only one refresh request may be in-flight at a time; concurrent 401s are queued and resolved once the single refresh completes
- **On refresh failure:** clears both tokens from encrypted storage, dispatches `authSlice.logout()`, and navigates to `LoginScreen` via the root navigation ref
- **App foreground event** (`AppState` change to `active`): proactively checks access token expiry; if it expires within 60 seconds, a background refresh is triggered before the next API call

> **Note on NetInfo reliability:** NetInfo can report stale connectivity state on some Android devices (particularly after wake from deep sleep). Treat actual API call network errors as the authoritative signal for connectivity status — NetInfo is used as a secondary/initial signal only. `ConnectivityService` reconciles both signals before dispatching state transitions.

---

## B. Push Notification Integration (Sub-Phase 4-3)

### B1. Token Registration

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```
On login success:
  1. Request notification permission
  2. Get FCM token via messaging().getToken()
  3. POST /users/:id/fcm-token { token, platform: 'android'|'ios' }
  4. Subscribe to messaging().onTokenRefresh() → re-POST

On logout:
  1. DELETE /users/:id/fcm-token
  2. Unsubscribe from onTokenRefresh
```

### B2. Foreground Handling

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```
messaging().onMessage(remoteMessage => {
  // Show in-app toast (not system notification)
  // Toast includes: title, body, tap action
  // Tap → navigate to deep link from data.deepLink
});
```

### B3. Background Handling

**File:** `fe/mobile/src/services/fcm/fcmService.ts`

```
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Display system notification via notifee
  // On tap → open app to deep link
});
```

### B4. NotificationsScreen (22nd Screen)

**File:** `fe/mobile/src/screens/notifications/NotificationsScreen.tsx`

| Section | Description |
|---------|-------------|
| Header | "Notifikasi" with unread count badge |
| Filter tabs | Semua / Tugas / Aktivitas / Lembur / Sistem |
| Notification list | FlatList with mark-read on tap, swipe-to-dismiss |
| Empty state | NBEmptyState "Belum ada notifikasi" |
| Pull-to-refresh | Fetch latest from GET /notifications |

Navigation: Bottom tab icon with unread badge count

### B5. Notification Preferences

**File:** `fe/mobile/src/screens/settings/NotificationSettingsScreen.tsx`

- List of toggles per notification type
- Fetch: `GET /users/:id/notification-preferences`
- Update: `PATCH /users/:id/notification-preferences`

### B6. In-app notification bell + badge (Instagram / Twitter / Facebook pattern)

**Goal:** Every authenticated screen has a bell icon in the app header with an unread-count badge. Tapping it opens the inbox (NOTIF-1). When a push notification arrives — whether the app is foreground, background, or quit — the same notification record drives both the OS-tray notification AND the in-app bell badge, so the two surfaces never disagree.

**File:** `fe/mobile/src/components/common/NotificationBell.tsx`

Visual spec (token-compliant, per `design/project/hifi-shared.css`):

| Element | Spec |
|---------|------|
| Bell icon | Lucide `Bell` at 22 × 22 px, stroke 2 px, color `--black` |
| Container | 36 × 36 px touch target, `var(--r-base)` corners, no border by default |
| Badge | Top-right, 18 × 18 px, `var(--danger)` bg, `var(--white)` text, 2 px black border, `var(--r-full)` radius, `--sh-xs` shadow |
| Badge text | JetBrains Mono 700, 10 px, centered; shows count for ≤ 9, "9+" for ≥ 10 |
| Badge visibility | Hidden when `unreadCount === 0` |
| Active (sheet open) | Container gets `--primary` bg + 2 px black border + `--sh-xs` |
| A11y | `accessibilityLabel="Notifikasi, {count} belum dibaca"` updates dynamically |

**Placement:** In `Header.tsx` (or current shared header), right-side after screen title. Visible on every authenticated screen except OB-1/2/3 and AS-5 (those are pre-app flows). On screens with their own header (e.g., NotificationsScreen itself), the bell is replaced by a "mark all read" action.

**State source:** `notificationsSlice.unreadCount` (Redux). Updated by three writers:
1. Initial fetch on app foreground (`GET /notifications?unread=true&limit=1` returns `meta.totalUnread`).
2. FCM foreground handler (`fcmService.onMessage`) — increments by 1 + appends notification to `items`.
3. NotificationsScreen mark-read / mark-all-read — decrements / zeroes.

**Tap behavior:** Bell tap → navigate to `NotificationsScreen` (NOTIF-1). Same target whether bell is in the tab bar or in the app header — single inbox.

**Foreground FCM behavior** (when app is open and a push arrives):

| Step | Behavior |
|------|----------|
| 1 | NBToast slides in from top with notification title + body (180 ms, `--sh-md`) — does NOT auto-dismiss for HIGH-priority types (task-assigned, missing-alert); auto-dismisses after 4 s for routine types |
| 2 | Bell badge increments by 1 (Redux update — re-renders all mounted screens) |
| 3 | OS does NOT show a system-tray notification (suppressed by FCM SDK when foreground) — single surface only |
| 4 | Tapping the toast or the bell routes to the deep-link target screen |
| 5 | If user ignores the toast, it lands in the inbox for later read |

**Background / quit FCM behavior:**

| Step | Behavior |
|------|----------|
| 1 | OS shows system-tray notification (FCM default) — title + body + app icon |
| 2 | On tap → app cold-starts (if quit) or foregrounds (if background) and deep-links to the entity |
| 3 | On foreground, bell badge syncs from server (`GET /notifications/unread-count`) — corrects any race conditions |

### B7. Deep-link routing matrix (push notification → screen)

Every backend notification carries `data.type` + `data.entity_id`. The same routing table drives (a) tap-on-toast, (b) tap-on-bell-row, (c) tap-on-system-tray notification — guaranteeing one consistent destination per type. Source of truth: `fe/mobile/src/services/notifications/deepLinkRouter.ts`.

| Notification type | Title (Indonesian) | Deep-link target | Required role |
|-------------------|-------------------|------------------|---------------|
| `task_assigned` | "Tugas baru: {title}" | `TaskDetailScreen` (TUG-2) with `task_id` | satgas, linmas, korlap |
| `task_completed` | "Tugas selesai: {title}" | `TaskDetailScreen` (TUG-2) | korlap, admin_data |
| `task_revision` | "Revisi tugas: {title}" | `TaskDetailScreen` (TUG-2) | satgas, linmas |
| `activity_approved` | "Aktivitas disetujui" | `ActivityDetailScreen` (AKT-1 detail) | satgas, linmas |
| `activity_rejected` | "Aktivitas ditolak" | `ActivityDetailScreen` | satgas, linmas |
| `overtime_approved` | "Lembur disetujui" | `OvertimeDetailScreen` (LBR-3) | satgas, linmas |
| `overtime_rejected` | "Lembur ditolak" | `OvertimeDetailScreen` | satgas, linmas |
| `monitoring_missing` | "Petugas tidak hadir di {area}" | `MonitoringScreen` (MON-1) with `area_id` filter | korlap, admin_data, kepala_rayon |
| `pruning_submitted` | "Permohonan baru dari {kecamatan}" | `RequestDetailScreen` (PRT-3) with `request_id` | admin_data (rayon-scoped) |
| `pruning_disposed` | "Permohonan {code} ditugaskan" | `RequestDetailScreen` (PRT-3) | staff_kecamatan, korlap |
| `shift_reminder` | "Shift dimulai 15 menit lagi" | `HomeScreen` (HOME-1) | satgas, linmas, korlap |
| `system_announcement` | "{title}" | `NotificationsScreen` (NOTIF-1) — no deeper target | all |

If the user lacks the required role (data integrity should prevent this, but defensive coding): route to NOTIF-1 with a NBToast "Anda tidak punya akses ke notifikasi ini" and the notification stays read.

### B8. Web parity — bell + badge in sidebar header

The web sidebar already plans a bell icon (see [`web.md`](./web.md#ui-ux-revamp)). Detailed spec:

- `fe/web/src/components/nb/NotificationBell.tsx` — bell with badge in top-right of the main canvas, NOT in the sidebar (sidebar collapses at narrow widths; the bell must stay visible).
- Click → opens `NotificationPanel` popover (last 5 unread + "Lihat Semua" link to `/dashboard/notifications`).
- Same deep-link router on web — clicking a row navigates to the entity's web route (e.g., `task_assigned` → `/dashboard/tasks/{id}`).
- Web push (via existing Phase 3 PWA push subscription) follows the same suppression rule: when the web tab is foreground, no service-worker notification surfaces; the NBToast + badge handles it.

---

## C. Reassignment Enhancements (Sub-Phase 4-4)

### C1. ReassignWorkerModal Verification

**File:** `fe/mobile/src/components/modals/ReassignWorkerModal.tsx` (exists as untracked)

Verify and complete:
- [ ] Worker selection (from UserDetailSheet)
- [ ] Target area picker (areas in same rayon)
- [ ] Confirmation step with current/target area names
- [ ] Loading state during API call
- [ ] Success/error feedback

### C2. Offline Queue Support

Add `reassignment` queue type (see A2 above).

### C2.1 Offline Queue Conflict Note

> **Important:** Offline sync (4-2) and reassignment (4-4) both modify `offlineQueue.ts`. Start 4-2 first and merge its offlineQueue changes before beginning 4-4 to avoid merge conflicts. See README.md Sub-Phase Dependency Notes.

### C3. Reassignment History

**File:** `fe/mobile/src/components/monitoring/UserDetailSheet.tsx`

Add "Riwayat Penugasan" section at bottom:
- Fetch from `GET /audit-logs?entity_type=user_tracking_status&entity_id={userId}`
- Show: date, from area → to area, reassigned by

### C4. Missing Worker Alert Recipients

When a worker is flagged as 'missing' (no location update within threshold):
- **Multi-area korlap:** Notify ALL korlaps assigned to the worker's area (query via `user_areas` table)
- **Kepala rayon:** Also notify the `kepala_rayon` of the containing rayon
- Notification type: FCM push + in-app notification

---

## D. Performance Optimization (Sub-Phase 4-7)

### D1. React.memo Targets

| Component | File | Reason |
|-----------|------|--------|
| `UserMarker` | `fe/mobile/src/components/monitoring/UserMarker.tsx` | Re-renders on every map gesture |
| `LocationTrail` | `fe/mobile/src/components/monitoring/LocationTrail.tsx` | Polyline with many points |
| `StaffingSummarySection` | `fe/mobile/src/components/monitoring/StaffingSummarySection.tsx` | Expensive staffing calculations |
| `LocationStatusCard` | `fe/mobile/src/components/home/LocationStatusCard.tsx` | GPS updates every second |

### D2. FlatList Optimization

All list screens must implement:

```typescript
<FlatList
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={10}
/>
```

Screens to audit: TasksScreen, ActivitiesScreen, OvertimeScreen, NotificationsScreen, UsersListScreen

### D3. Bundle Analysis

- Target: <2MB JS bundle (Hermes bytecode)
- Tool: `npx react-native-bundle-visualizer`
- Expected large chunks: react-native-maps, @react-navigation, react-native-reanimated
- Action items: lazy-load map screens, tree-shake unused icon sets

---

## E. Production Readiness (Sub-Phase 4-8)

### E1. ProGuard/R8 Configuration

**File:** `fe/mobile/android/app/proguard-rules.pro`

```
# React Native
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native Maps
-keep class com.google.android.gms.maps.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Keep source file names for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

**File:** `fe/mobile/android/app/build.gradle`

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### E2. Crash Reporting (Sentry)

**File:** `fe/mobile/src/services/crashReporting.ts`

```typescript
import * as Sentry from '@sentry/react-native';

export function initCrashReporting() {
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}

export function setUserContext(user: User) {
  Sentry.setUser({ id: user.id, username: user.username, role: user.role });
}
```

- Initialize in App.tsx before any other setup
- Set user context on login, clear on logout
- Wrap navigation container with `Sentry.wrap()`

### E3. Deep Linking

**File:** `fe/mobile/android/app/src/main/AndroidManifest.xml`

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="sekar.wahyutrip.com" />
    <data android:scheme="sekar" />
</intent-filter>
```

**Supported deep links:**

| URL | Screen |
|-----|--------|
| `sekar://tasks/{id}` | TaskDetailScreen |
| `sekar://activities/{id}` | ActivityDetailScreen |
| `sekar://overtime/{id}` | OvertimeDetailScreen |
| `sekar://notifications` | NotificationsScreen |
| `sekar://monitoring` | MapDashboardScreen |

**File:** `fe/mobile/src/navigation/linking.ts`

```typescript
export const linking = {
  prefixes: ['sekar://', 'https://sekar.wahyutrip.com'],
  config: {
    screens: {
      TaskDetail: 'tasks/:id',
      ActivityDetail: 'activities/:id',
      OvertimeDetail: 'overtime/:id',
      Notifications: 'notifications',
      MapDashboard: 'monitoring',
    },
  },
};
```

### E4. Splash Screen Optimization

- Target: <2s cold start on mid-range Android device
- Use `react-native-bootsplash` for native splash
- Measure with `adb shell am start -W com.sekar`
- Defer non-critical initializations (Sentry, FCM) to after first render

---

## F. UI/UX Polish (Sub-Phase 4-8)

### F1. Screen Transitions

**File:** `fe/mobile/src/navigation/`

```typescript
const screenOptions = {
  animation: 'slide_from_right',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};
```

### F2. Button Press Animation

All NB buttons should scale to 0.97 on press:

```typescript
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: withSpring(pressed.value ? 0.97 : 1) }],
}));
```

### F3. List Item Staggered Fade-In

For list screens (tasks, activities, notifications):

```typescript
// Each item fades in with 50ms delay per index
const enteringAnimation = FadeInDown.delay(index * 50).duration(300);
```

### F4. Error Boundaries

Wrap each screen root with ErrorBoundary:

```typescript
<ErrorBoundary fallback={<NBErrorFallback onRetry={refetch} />}>
  <ScreenContent />
</ErrorBoundary>
```

---

## G. Screen Inventory (Phase 4 Target: 22 Screens)

| # | Screen | Role(s) | Changes in Phase 4 |
|---|--------|---------|-------------------|
| 1 | LoginScreen | All | No change |
| 2 | HomeScreen | Field workers | Connectivity banner |
| 3 | ClockInOutScreen | Clockable roles | Offline queue improvements |
| 4 | ActivitiesScreen | All clockable | FlatList optimization |
| 5 | ActivityDetailScreen | All clockable | Deep linking target |
| 6 | TasksScreen | All | FlatList optimization, deep linking |
| 7 | TaskDetailScreen | All | Deep linking target |
| 8 | OvertimeScreen | Clockable roles | Offline queue for start/end |
| 9 | ProfileScreen | All | Notification preferences link |
| 10 | MapDashboardScreen | Monitoring roles | React.memo, performance |
| 11 | MonitoringFilterScreen | Monitoring roles | No change |
| 12 | UserDetailScreen | Monitoring roles | Reassignment history |
| 13 | UsersListScreen | Admin roles | FlatList optimization |
| 14 | SettingsScreen | All | Notification preferences |
| 15 | SchedulesScreen | All | No change |
| 16 | ReportsScreen | Monitoring roles | No change |
| 17 | AreaDetailScreen | Monitoring roles | No change |
| 18 | RayonDetailScreen | Admin roles | No change |
| 19 | AuditLogScreen | Admin roles | No change |
| 20 | ImportScreen | Admin roles | No change |
| 21 | OvertimeApprovalScreen | Approver roles | No change |
| **22** | **NotificationsScreen** | **All** | **NEW — Sub-Phase 4-3** |

---

**Last Updated:** 2026-03-12
