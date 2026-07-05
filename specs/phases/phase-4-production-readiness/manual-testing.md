# Phase 4: Manual Testing Checklist

**Date:** May 22, 2026 (extended with §0 hi-fi walks; March-12 base checklist preserved below)
**Status:** ⏳ Not Started
**Scope:** **28 mobile screens** (21 existing + 7 NEW) · **26+ web pages** (21 existing + 4 NEW + 1 config) · **9 roles** (8 + staff_kecamatan)

---

## 0. Hi-Fi-driven entry-flow walks (revamp acceptance — Sub-Phase 4-R)

Run each walk on a fresh-install device (AsyncStorage cleared). Compare screen-by-screen against the hi-fi rendered at [`design/project/hifi-mobile.html`](../../../design/project/hifi-mobile.html) (open in any browser).

### Walk A · First-launch satgas (carousel → login → onboarding → home)

1. Fresh install + first launch → **WL-1** splash slide visible
2. Swipe through **WL-2 → WL-3 → WL-4 → WL-5** ("Offline-ready" with "Masuk" CTA)
3. Tap "Masuk" → **AS-1** Login screen (Selamat datang hero, Identifier + Password)
4. Try empty fields → **AS-2** field error states
5. Wrong password → **AS-3** NBToast auth-fail
6. Correct credentials (`satgas_bungkul_1/Password123!`) → **OB-1** Welcome
7. Tap "Lanjut" → **OB-2** Permissions (6 cards: Lokasi/Kamera/Notifikasi/Galeri/Telepon/SMS), accept each
8. **OB-3** Area preview → "Mulai shift" → **HOME-1** Satgas home
9. Close + relaunch → no carousel, no onboarding (verifies AsyncStorage flags)

### Walk B · First-launch korlap → HOME-2

Same as A with `korlap_bungkul/Password123!`; lands on **HOME-2** with monitoring quick-access + team summary.

### Walk C · First-launch admin_data → HOME-3

`admin/Password123!` → **HOME-3** with KPI tiles + pending perantingan queue.

### Walk D · First-launch staff_kecamatan

`staff_kecamatan_<kecamatan-code>/Password123!` → after onboarding, lands on **Perantingan** tab with empty state + FAB to submit; monitoring tab hidden.

### Walk E · Forgot password (informational)

1. AS-1 → tap "Lupa sandi" → **AS-4** "Sandi tidak bisa di-reset sendiri"
2. Verify per-rayon admin contact list (phone + WhatsApp icons)
3. Tap phone → tel: intent opens dialer
4. Tap WhatsApp → wa.me link with pre-filled message
5. "Kembali" → AS-1

### Walk F · Forced password change

1. Admin (web) resets a satgas password → `users.password_must_change=true`
2. Satgas logs in → routed to **AS-5** (cannot skip)
3. Submit valid new password → success ("Sandi tersimpan") → home

### Walk G · Notifications inbox + bell badge

1. Admin assigns task to satgas via web (TSK-1)
2. **App backgrounded:** Satgas device system-tray notification fires within 10 s; tap → app deep-links to TaskDetail (works from cold-start too)
3. **App foregrounded during second push:** NBToast slides in from top with title + body; **no** system-tray notification appears (foreground suppression); bell badge increments
4. Verify badge visual: top-right of bell, red (`--danger`) circle with white mono digit, 2 px black border, `--sh-xs` shadow
5. Send 10+ pushes to verify badge overflow → shows "9+"
6. Tap bell → **NOTIF-1** Inbox; bell container active state = primary bg + shadow
7. Verify deep-link router for each notification type: tap a `task_assigned` row → routes to TaskDetail; tap `activity_approved` → ActivityDetail; tap `monitoring_missing` → MonitoringScreen with area filter
8. Tap row → mark-read; row loses the `--primary` unread dot
9. "Tandai semua dibaca" → all read; badge disappears (hidden when `unreadCount === 0`)
10. **Web parity:** open dashboard in two tabs; mark-read in tab A → tab B's bell count updates within 1 s (BroadcastChannel cross-tab sync)

### Walk H · Background location (4-V Gap 3 — manual confirmation)

1. Satgas clocks in within geofence → status "active"
2. Background app for 5 min
3. Walk 100 m outside geofence
4. Foreground app → status "outside"; admin/korlap can see in monitoring
5. No persistent location-service notification visible? → **fail** (foreground service missing)
6. 4-h battery drain ≤ 15 %/h? → **record actual** in `status_reviews.md § Gap 3`

### Walk I · Offline sync + per-screen offline behavior (4-V Gap 1)

1. Satgas authenticated, in coverage
2. Airplane mode ON → ConnectivityBanner appears with `--warning-bg` + "Tidak ada koneksi internet"
3. **Works-offline screens (per `mobile.md § A5`):** open ABS-1 clock-in → form works, submit → "Antrian" badge; open AKT-1 → fill activity with photos → queued; open LBR-2 → submit lembur → queued
4. **Read-only-offline screens:** open MON-1 → shows last cached snapshot + grey "Pantauan offline · update terakhir {time}" banner; pull-to-refresh disabled with NBToast "Aksi ini butuh koneksi"; open TUG-1 → cached list rendered, tab filters work locally
5. **Unavailable-offline screens:** open PRF-3 Edit Profile → full-screen `OfflineScreen` with `illo-offline.svg` + "Anda offline" + subtitle "Aktifkan WiFi atau data seluler" + "Coba lagi" button
6. **SERVER_UNREACHABLE differentiation:** block server at firewall (or stop backend); banner switches to `--danger-bg` + "Server tidak dapat dihubungi"; OfflineScreen subtitle changes to "Server SEKAR sedang tidak dapat dihubungi…"
7. Tap "Coba lagi" → triggers health check; if still failing → shake animation + NBToast "Masih offline"
8. Airplane mode OFF + backend up; wait 30 s
9. Banner shows green `--success-bg` "Terhubung kembali" toast and auto-dismisses after 3 s
10. All queued items synced (no duplicate); timestamps preserved (Asia/Jakarta) — verify via web

### Walk J · Sidebar redesign (web)

1. Login at LOG-1
2. Pinwheel mark visible top-left (sage primary border)
3. Each item click → active state = primary bg + 1.5 px offset shadow
4. Section dividers in monospace caps
5. Per-item count badges render
6. Bottom user card with avatar + role-accent pill
7. 768 px → sidebar collapses to icon-rail
8. 375 px → hidden behind hamburger

---

## 1. Original March-12 prerequisites + execution order

---

## Prerequisites

Before starting manual testing, ensure the following environment is in place:

- Backend running with fully seeded data (`npm run db:seed` from `apps/be/`)
- Mobile app configured with test credentials (see `CLAUDE.md` — all users use `Password123!`)
- `.env` set to correct `API_BASE_URL` (emulator: `http://10.0.2.2:3000`; device: `http://<YOUR_IP>:3000`)
- Web app running at `http://localhost:3001` (`npm run dev` from `apps/web/`)
- Stable internet connection available for push notification tests
- Test devices: Android 12+ physical device recommended; Chrome latest for web testing

---

## Execution Order

Test sections in the following order to respect authentication dependencies:

1. **Authentication flows** — required first; all other sections depend on a valid session
2. **Clock-in/out and shift management** — foundational for location and monitoring tests
3. **Task workflows** — depend on existing users and shifts
4. **Activity and overtime submissions** — depend on active shifts
5. **Monitoring features** — require clocked-in workers visible on map
6. **Notifications** — require prior actions to generate notification events
7. **Import / Export** — admin-only, independent of field workflows
8. **Admin operations** — user CRUD, audit logs, settings
9. **Offline scenarios** — run last; require toggling device connectivity on/off

---

## Performance Thresholds

Acceptable performance baselines to verify during testing:

- **API response time:** <500ms for list endpoints; <200ms for single-resource endpoints
- **Page load:** <3s on a 4G connection
- **Mobile screen transition:** <300ms
- **Map render with 30 markers:** <2s

---

## Mobile App Testing (22 Screens)

### Authentication

#### 1. LoginScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Login with username | Navigate to HomeScreen | ⏳ | |
| 2 | Login with phone number | Navigate to HomeScreen | ⏳ | Identifier field |
| 3 | Invalid credentials | Show error toast | ⏳ | |
| 4 | Empty fields validation | Show field errors | ⏳ | |
| 5 | Password visibility toggle | Show/hide password | ⏳ | |
| 6 | Network error | Show connectivity banner | ⏳ | |
| 7 | Auto-login with stored token | Skip login, go to HomeScreen | ⏳ | |

### Field Worker Screens (satgas, linmas, korlap, admin_data, kepala_rayon)

#### 2. HomeScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display shift status card | Show clock-in/out status | ⏳ | |
| 2 | Show LocationStatusCard (when clocked in) | GPS coords, accuracy, boundary status | ⏳ | |
| 3 | Hide LocationStatusCard (when not clocked in) | Card not visible | ⏳ | |
| 4 | Show today's tasks count | Correct task count | ⏳ | |
| 5 | Pull to refresh | Refresh all data | ⏳ | |
| 6 | Connectivity banner (offline) | Yellow/orange banner | ⏳ | |

#### 3. ClockInOutScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Clock in with GPS | Success, show timer | ⏳ | |
| 2 | Clock in with optional selfie | Upload if provided, skip if not | ⏳ | |
| 3 | Clock in outside area | Warning, still allowed (soft geofencing) | ⏳ | |
| 4 | Clock in without GPS permission | Request permission | ⏳ | |
| 5 | Clock out with confirmation | Confirm dialog, success | ⏳ | |
| 6 | Offline clock-in | Queue action, show banner | ⏳ | |

#### 4. ActivitiesScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List all activities | Paginated FlatList | ⏳ | |
| 2 | Submit new activity | Form with photos (max 3) | ⏳ | |
| 3 | Filter by status | Approved/pending/rejected | ⏳ | |
| 4 | Pull to refresh | Refresh list | ⏳ | |
| 5 | Empty state | NBEmptyState shown | ⏳ | |

#### 5. ActivityDetailScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display activity details | All fields, photos | ⏳ | |
| 2 | Show approval status | Badge with status | ⏳ | |
| 3 | Deep link navigation | Open from notification/URL | ⏳ | |

#### 6. TasksScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | List assigned tasks | Paginated FlatList | ⏳ | |
| 2 | Filter by status | Active/completed | ⏳ | |
| 3 | Navigate to detail | Open TaskDetailScreen | ⏳ | |

#### 7. TaskDetailScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display task details | All fields, map | ⏳ | |
| 2 | Complete task | Notes + photo submission | ⏳ | |
| 3 | Revision history | Show audit trail | ⏳ | |
| 4 | Deep link navigation | Open from notification/URL | ⏳ | |

#### 8. OvertimeScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Start overtime (after normal shift) | Clock-in overtime shift | ⏳ | |
| 2 | Block overtime (during normal shift) | Error: end normal shift first | ⏳ | |
| 3 | End overtime with activity | Mandatory activity submission | ⏳ | |
| 4 | Overtime history | List past overtime records | ⏳ | |

#### 9. ProfileScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display user info | Name, role, phone, area | ⏳ | |
| 2 | Upload profile picture | Camera/gallery picker | ⏳ | |
| 3 | Navigate to notification settings | Open settings screen | ⏳ | |
| 4 | Logout | Clear session, navigate to login | ⏳ | |

### Monitoring Screens (korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)

#### 10. MapDashboardScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display worker markers | Five-status colors (4 visible) | ⏳ | |
| 2 | Display area polygons | Boundary overlays | ⏳ | |
| 3 | Tap marker → UserDetailSheet | Sheet slides up | ⏳ | |
| 4 | Filter by rayon/area | Markers filtered | ⏳ | |
| 5 | Staffing summary | Per-role breakdown | ⏳ | |
| 6 | Auto-focus on filter change | Map viewport adjusts | ⏳ | |
| 7 | Location trail playback | Polyline with timeline | ⏳ | |

#### 11. MonitoringFilterScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Open filter modal from MapDashboard | Modal slides up with all filter options | ⏳ | |
| 2 | Filter by rayon | Map markers filtered to selected rayon | ⏳ | |
| 3 | Filter by area within rayon | Markers filtered further to that area | ⏳ | |
| 4 | Filter by worker status (active/inactive/outside) | Only matching status markers shown | ⏳ | |
| 5 | Filter by role (satgas/linmas/korlap) | Only workers with that role shown | ⏳ | |
| 6 | Reset all filters | All markers restored, counters reset | ⏳ | |
| 7 | Staffing summary updates on filter change | Per-role counts reflect filtered set | ⏳ | |
| 8 | korlap sees only assigned areas | Cannot filter to areas outside their assignment | ⏳ | |

#### 12. UserDetailSheet (MonitoringDetailScreen)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Open sheet by tapping worker marker | Bottom sheet slides up with worker info | ⏳ | |
| 2 | Show current shift status and duration | Clocked-in time, shift name displayed | ⏳ | |
| 3 | Show current GPS coordinates and accuracy | Lat/lng and accuracy radius shown | ⏳ | |
| 4 | Show boundary status (inside/outside/missing) | Correct status badge color | ⏳ | |
| 5 | WhatsApp link (tap phone number) | Opens WhatsApp with pre-filled message | ⏳ | |
| 6 | View location trail from detail sheet | Trail polyline rendered on map | ⏳ | |
| 7 | Reassign worker to different area (korlap+) | Reassignment modal opens, confirms | ⏳ | |
| 8 | Last seen timestamp for offline workers | Shows "Last seen X min ago" | ⏳ | |

#### 13. UsersListScreen (admin_system, superadmin, kepala_rayon, top_management)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load paginated user list | FlatList with 20 items per page | ⏳ | |
| 2 | Search by name | List filters as user types | ⏳ | |
| 3 | Filter by role | Only users with selected role shown | ⏳ | |
| 4 | Filter by rayon | Only workers in that rayon shown | ⏳ | |
| 5 | Tap user row → UserDetailScreen | Navigate with correct userId | ⏳ | |
| 6 | Empty state (no results) | NBEmptyState with clear message | ⏳ | |
| 7 | Pull to refresh | List reloads from API | ⏳ | |
| 8 | korlap cannot see admin roles | admin_system/superadmin rows hidden | ⏳ | |

#### 14. SettingsScreen
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display app version and build number | Version string visible | ⏳ | |
| 2 | Navigate to notification preferences | Opens NotificationSettingsScreen | ⏳ | |
| 3 | Toggle location sharing (when clocked out) | Preference saved, persists on restart | ⏳ | |
| 4 | Clear cache | Cache cleared, confirmation shown | ⏳ | |
| 5 | Logout from settings | Session cleared, navigate to Login | ⏳ | |
| 6 | Display current user role and rayon | Correct info from auth state | ⏳ | |

#### 15. SchedulesScreen (kepala_rayon, korlap, admin_data — view own rayon)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load this week's schedule | Calendar/list with shift assignments | ⏳ | |
| 2 | Navigate to previous/next week | Schedule updates for selected week | ⏳ | |
| 3 | Tap shift entry → shift detail | Show assigned workers and times | ⏳ | |
| 4 | Empty state (no schedule for week) | NBEmptyState shown | ⏳ | |
| 5 | API failure on load | Error state with retry button | ⏳ | |
| 6 | satgas sees only own shifts | Cannot see other workers' schedules | ⏳ | |

#### 16. ReportsScreen (summary reports for supervisors)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load activity summary for today | Counts: submitted/approved/rejected | ⏳ | |
| 2 | Change date range filter | Report data updates | ⏳ | |
| 3 | Filter by rayon or area | Stats scoped to selection | ⏳ | |
| 4 | Drill down from summary to list | Navigate to filtered ActivitiesScreen | ⏳ | |
| 5 | Empty state (no data for range) | Descriptive empty message | ⏳ | |
| 6 | API error on load | Toast + retry option | ⏳ | |

#### 17. AreaDetailScreen (korlap, kepala_rayon, admin roles)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display area name, rayon, boundary map | All info rendered correctly | ⏳ | |
| 2 | Show list of currently assigned workers | Names, roles, status badges | ⏳ | |
| 3 | Show area requirements (min workers) | Required vs. actual count | ⏳ | |
| 4 | Tap worker in list → UserDetailSheet | Opens monitoring detail | ⏳ | |
| 5 | Navigate to parent rayon | RayonDetailScreen opens | ⏳ | |
| 6 | korlap sees only their assigned areas | Cannot access areas outside assignment | ⏳ | |

#### 18. RayonDetailScreen (kepala_rayon, top_management, admin roles)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Display rayon name, number, area count | All fields correct | ⏳ | |
| 2 | List all areas in rayon | FlatList of area cards | ⏳ | |
| 3 | Staffing summary per area | Active/required counts visible | ⏳ | |
| 4 | Tap area → AreaDetailScreen | Correct area loads | ⏳ | |
| 5 | kepala_rayon only sees own rayon | Cannot navigate to other rayons | ⏳ | |
| 6 | Empty state (rayon has no areas) | Informative empty state | ⏳ | |

#### 19. AuditLogScreen (admin_system, superadmin only)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load paginated audit log entries | List with actor, action, entity, timestamp | ⏳ | |
| 2 | Filter by entity type (user/shift/task) | Filtered list updates | ⏳ | |
| 3 | Filter by actor (search by username) | Entries by that actor only | ⏳ | |
| 4 | Filter by date range | Entries in range only | ⏳ | |
| 5 | Tap entry → detail view | JSON diff or summary of changes shown | ⏳ | |
| 6 | Non-admin roles cannot access | Redirect or 403 error | ⏳ | |
| 7 | Empty state (no logs for filter) | NBEmptyState message | ⏳ | |

#### 20. ImportScreen (admin_system, superadmin)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Upload valid KMZ file | Preview area polygons before confirm | ⏳ | |
| 2 | Upload invalid file type | Error: unsupported format | ⏳ | |
| 3 | Upload CSV for users/schedules | Preview table rows | ⏳ | |
| 4 | CSV with validation errors | Show row-by-row errors | ⏳ | |
| 5 | Confirm import | Job queued, progress indicator | ⏳ | |
| 6 | Cancel import before confirm | No data saved | ⏳ | |
| 7 | Import job failure | Error message with details | ⏳ | |

#### 21. OvertimeApprovalScreen (korlap, kepala_rayon, admin roles)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load pending overtime requests | List with worker name, date, hours | ⏳ | |
| 2 | Filter by status (pending/approved/rejected) | List updates accordingly | ⏳ | |
| 3 | Approve overtime request | Status → approved, worker notified | ⏳ | |
| 4 | Reject with reason | Status → rejected, reason stored | ⏳ | |
| 5 | korlap approves only own area workers | Cannot see/approve other areas | ⏳ | |
| 6 | Pull to refresh | New requests appear | ⏳ | |
| 7 | Empty state (no pending) | NBEmptyState shown | ⏳ | |

#### 22. NotificationsScreen (Phase 4 NEW)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load notifications list | Paginated list, unread count badge | ⏳ | |
| 2 | Filter tab: All | All notifications visible | ⏳ | |
| 3 | Filter tab: Unread | Only unread notifications shown | ⏳ | |
| 4 | Filter tab: Tasks | Only task-related notifications | ⏳ | |
| 5 | Filter tab: Activities | Only activity-related notifications | ⏳ | |
| 6 | Filter tab: Overtime | Only overtime-related notifications | ⏳ | |
| 7 | Tap notification → deep link | Navigate to relevant screen/entity | ⏳ | |
| 8 | Mark single notification as read | Unread indicator removed, count decrements | ⏳ | |
| 9 | Mark all as read | All unread cleared, count = 0 | ⏳ | |
| 10 | Empty state (no notifications) | NBEmptyState with descriptive message | ⏳ | |
| 11 | Pull to refresh | New notifications appear at top | ⏳ | |

#### 23. NotificationSettingsScreen (Phase 4 NEW)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load current preferences from API | Toggles reflect saved settings | ⏳ | |
| 2 | Toggle task notifications off | Setting saved, no task push notifications | ⏳ | |
| 3 | Toggle activity notifications off | Setting saved, no activity push notifications | ⏳ | |
| 4 | Toggle overtime notifications off | Setting saved, no overtime push notifications | ⏳ | |
| 5 | Toggle monitoring alerts off | Setting saved, no alert push notifications | ⏳ | |
| 6 | Save all changes | Preferences persist after app restart | ⏳ | |
| 7 | API error on save | Toast error, original settings restored | ⏳ | |

#### Deep Link Testing

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | `sekar://tasks/{id}` — app is running | Opens TaskDetailScreen for that task ID | ⏳ | |
| 2 | `sekar://tasks/{id}` — app is killed | Launches app, then navigates to TaskDetailScreen | ⏳ | |
| 3 | `sekar://notifications` | Opens NotificationsScreen | ⏳ | |
| 4 | `sekar://monitoring` — supervisor role | Opens MapDashboardScreen | ⏳ | |
| 5 | `sekar://monitoring` — worker role (satgas/linmas) | Shows unauthorized message or redirects to HomeScreen | ⏳ | |
| 6 | Invalid deep link (e.g., `sekar://tasks/nonexistent-id`) | Shows error or not-found state gracefully; no crash | ⏳ | |
| 7 | Deep link triggered when user is not authenticated | Redirects to LoginScreen; after successful login navigates to intended destination | ⏳ | |

---

## Web Dashboard Testing (24+ Pages)

### Authentication

#### 1. Login Page
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Login with identifier (username/phone) | Redirect to dashboard | ⏳ | |
| 2 | Invalid credentials | Error message | ⏳ | |
| 3 | Session persistence | Stay logged in on refresh | ⏳ | |
| 4 | Token refresh | Silent refresh before expiry | ⏳ | |

### Dashboard Pages

| # | Page | Key Tests | Status |
|---|------|-----------|--------|
| 2 | Dashboard Overview | Stats cards, charts, loading skeleton | ⏳ |
| 3 | Users Management | CRUD, search, role filter, pagination, empty state | ⏳ |
| 4 | User Detail | Profile, areas, audit history | ⏳ |
| 5 | Areas Management | CRUD, polygon editor, KMZ import link | ⏳ |
| 6 | Area Detail | Map, staff list, requirements | ⏳ |
| 7 | Rayons Management | View 7 rayons, edit, area drill-down | ⏳ |
| 8 | Rayon Detail | Area list, staffing summary | ⏳ |
| 9 | Tasks | CRUD, assignment, status workflow, pagination | ⏳ |
| 10 | Task Detail | Info, assignee, revision history | ⏳ |
| 11 | Activities | List, approve/reject, filter, pagination | ⏳ |
| 12 | Activity Detail | Photos, approval history | ⏳ |
| 13 | Overtime | List, approve/reject, filter | ⏳ |
| 14 | Monitoring | Google Maps map, markers, polygons, filters, WebSocket updates | ⏳ |
| 15 | Monitoring Config | Threshold editing | ⏳ |
| 16 | Schedules | Calendar, shift assignments | ⏳ |
| 17 | Shift Definitions | CRUD for 3 shifts | ⏳ |
| 18 | Activity Types | CRUD for 20 types | ⏳ |
| 19 | Special Days | Holiday management | ⏳ |
| 20 | Audit Logs | Filter, entity/actor search | ⏳ |
| 21 | Settings | System configuration | ⏳ |
| 22 | Import | See detail below | ⏳ |
| 23 | Export | See detail below | ⏳ |
| 24 | Notifications | See detail below | ⏳ |

#### 22. /dashboard/import (Phase 4 NEW)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Upload valid KMZ file | Polygon preview renders on map | ⏳ | |
| 2 | Upload KMZ with invalid geometry | Validation error list displayed | ⏳ | |
| 3 | Upload CSV for users | Row preview table shown before confirm | ⏳ | |
| 4 | CSV missing required columns | Column error highlighted | ⏳ | |
| 5 | CSV with duplicate identifier | Row-level error: duplicate phone/username | ⏳ | |
| 6 | Confirm import | Job created, progress bar/spinner shown | ⏳ | |
| 7 | Job completes successfully | Success toast, import count displayed | ⏳ | |
| 8 | Job fails mid-import | Error details shown, partial rows reported | ⏳ | |
| 9 | Cancel before confirm | No data written, returns to upload form | ⏳ | |
| 10 | Non-admin role accesses page | 403 redirect to dashboard | ⏳ | |

#### 23. /dashboard/export (Phase 4 NEW)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Select entity type (users/activities/shifts) | Format options update to valid choices | ⏳ | |
| 2 | Select CSV format | Download starts or job queued | ⏳ | |
| 3 | Select Excel format | XLSX file exported | ⏳ | |
| 4 | Set date range filter | Export scoped to that range | ⏳ | |
| 5 | Trigger export | Job created, polling starts automatically | ⏳ | |
| 6 | Job polling completes | Download button activates | ⏳ | |
| 7 | Download file | File saves with correct name and format | ⏳ | |
| 8 | Export with no data in range | Empty file or informative message | ⏳ | |
| 9 | Job fails | Error message with retry option | ⏳ | |

#### 24. /dashboard/notifications (Phase 4 NEW)
| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1 | Load notification list | Paginated list, unread count in header | ⏳ | |
| 2 | Filter: All | All notifications shown | ⏳ | |
| 3 | Filter: Unread | Only unread entries | ⏳ | |
| 4 | Filter by type (tasks/activities/overtime) | Scoped list | ⏳ | |
| 5 | Mark single notification read | Row loses unread styling, count decrements | ⏳ | |
| 6 | Mark all read | All rows cleared, count = 0 | ⏳ | |
| 7 | Paginate beyond page 1 | Next page loads correctly | ⏳ | |
| 8 | Empty state | Descriptive empty message shown | ⏳ | |

---

## Role-Based Testing Matrix

Each role must be tested with the following:

| Role | Login | Home | Clock | Tasks | Activities | Overtime | Monitoring | Admin |
|------|-------|------|-------|-------|------------|----------|------------|-------|
| satgas | ✓ | ✓ | ✓ | View own | Submit | Start/end | - | - |
| linmas | ✓ | ✓ | ✓ | View own | Submit | Start/end | - | - |
| korlap | ✓ | ✓ | ✓ | Assign/view | Approve | Approve area | Own areas | - |
| admin_data | ✓ | ✓ | ✓ | View rayon | View rayon | View rayon | Own rayon | - |
| kepala_rayon | ✓ | ✓ | ✓ | View rayon | Approve rayon | Approve rayon | Own rayon | - |
| top_management | ✓ | ✓ | - | View all | View all | View all | All | - |
| admin_system | ✓ | ✓ | - | Manage | Manage | Manage | All | CRUD |
| superadmin | ✓ | ✓ | - | Manage | Manage | Manage | All | Full |

---

## Cross-Platform Testing

### Browsers
| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ⏳ |
| Firefox | Latest | ⏳ |
| Safari | Latest | ⏳ |
| Edge | Latest | ⏳ |

### Mobile Devices
| Device | OS | Status |
|--------|-----|--------|
| Samsung Galaxy A14 | Android 13 | ⏳ |
| Xiaomi Redmi Note 12 | Android 14 | ⏳ |
| Samsung Galaxy S23 | Android 14 | ⏳ |
| Google Pixel 7 | Android 14 | ⏳ |

### Responsive Viewports
| Viewport | Width | Status |
|----------|-------|--------|
| Mobile | 375px | ⏳ |
| Tablet | 768px | ⏳ |
| Desktop | 1024px | ⏳ |
| Wide | 1280px | ⏳ |

---

## Network Condition Testing

| Condition | Test Scope | Status |
|-----------|------------|--------|
| 4G/5G | Normal operation, real-time updates | ⏳ |
| Slow 3G | Loading states, timeouts, skeleton display | ⏳ |
| No Internet | Yellow banner, offline queue, cached data | ⏳ |
| Server Unreachable | Orange banner, heartbeat polling | ⏳ |
| Intermittent | Sync on reconnect, queue flush | ⏳ |

---

## Infrastructure & Deployment Testing

### Database Backup Verification

| # | Test Case | Expected Result | Frequency | Status | Notes |
|---|-----------|-----------------|-----------|--------|-------|
| 1 | Restore latest backup to test database | Restore completes without errors | Monthly | ⏳ | |
| 2 | Verify row counts match production | All table row counts within ±1% | Monthly | ⏳ | |
| 3 | Verify no data corruption | Spot-check 10 records per table, compare checksums | Monthly | ⏳ | |
| 4 | Application can connect and query | Run health check + sample queries against restored DB | Monthly | ⏳ | |
| 5 | Document restore procedure | Step-by-step runbook exists and is tested | Once | ⏳ | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | | | |
| Dev Lead | | | |
| Product Owner | | | |

---

**Last Updated:** 2026-03-12
