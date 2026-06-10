# Phase 4 - Specification Reviews + Gap Audit + Revamp Acceptance

**Last Updated:** May 22, 2026 (extended with §Revamp Acceptance Checklist + §Gap Audit; March-12 expert review preserved below)
**Status:** Expert Review Complete ✅ · Gap Audit ⏳ pending (4-V) · Revamp Acceptance ⏳ pending (4-R)

This document contains: (a) the March-12 expert specification review (preserved), (b) the **Production-Readiness Gap Audit** template that 4-V populates with verified findings, (c) the **Revamp Acceptance Checklist** that 4-R signs off screen by screen against the hi-fi.

---

## <a id="gap-audit"></a>Production-Readiness Gap Audit (Sub-Phase 4-V) — 🟡 desk portion complete (Jun 10, 2026) · field/staging probes ⏳

> **Desk-audit pass (Jun 10, 2026, code-verified on `main`):** every probe that can be answered by reading the codebase is filled in below. Probes needing a staging build, physical device, or wall-clock measurement remain ⏳ and are listed in the **Manual field-test checklist** at the end of this section.

**Purpose:** Replace speculation about production readiness with verified findings on staging. Output: one verdict per gap → **Deliver in 4-x** / **Already-good for MVP** / **Defer to Phase 5**. Final cross-gap synthesis is encoded in [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md).

**Method:** Run each gap test on a staging build mirroring production config (FCM_ENABLED=true, Redis 7, AUTH_LOGIN_THROTTLE per prod values). Record on `main @ <commit>` at audit time.

### Performance SLAs (pass thresholds for the audit)

| Capability | Metric | Threshold |
|------------|--------|-----------|
| Offline sync queue → server | Sync-to-server time after reconnect | p95 ≤ 60 s for queues ≤ 50 items |
| Offline queue size | Max items before back-pressure | ≥ 200 items without crash |
| FCM end-to-end | Backend trigger → device toast | p50 ≤ 1.5 s, p99 ≤ 5 s |
| FCM retry queue (BullMQ) | First-retry latency after transient failure | ≤ 90 s |
| Background location update | Position freshness during shift | ≤ 60 s stale tolerance while moving |
| Background battery drain | 4-h shift avg | ≤ 15 %/h (target ≤ 10 %/h) |
| BullMQ job latency | p95 job pickup time | ≤ 5 s under nominal load |

Failures against these thresholds escalate the verdict to "Deliver in 4-x".



### Gap 1 — Offline sync (does it work for satgas in field-no-coverage?)

| Probe | Result | Notes |
|-------|--------|-------|
| `fe/mobile/src/services/sync/offlineQueue.ts` `QueueItemType` enum coverage | ✅ desk-verified | Full 7-type set present at `offlineQueue.ts:18` incl. `overtime-start`, `overtime-end`, `task-completion`, `reassignment` (4-2 + 4-4 shipped) |
| Unit test pass rate on `__tests__/offlineQueue.*` | ✅ desk-verified | Part of the mobile jest suite (green as of Jun 9 4-R sign-off) |
| Manual airplane-mode flow (clock-in → reconnect → submission) | ⏳ field | Single-submission guarantee; no duplicate |
| Manual airplane-mode flow (activity → reconnect) | ⏳ field | Multipart upload re-attempts |
| Timezone preservation across queue + sync | ⏳ field | Asia/Jakarta retained, no UTC drift (backend day-boundary fixes landed in 4-7 E1, Jun 10) |
| ConnectivityBanner present? | ✅ desk-verified | `fe/mobile/src/components/common/ConnectivityBanner.tsx` |
| Distinction NO_INTERNET vs SERVER_UNREACHABLE? | ✅ desk-verified | `fe/mobile/src/services/sync/connectivityStatus.ts` implements the ADR-019 3-state model (+ tests) |

**Verdict (desk):** **Delivered in 4-2** — all code-side probes pass. Field flows remain to confirm single-submission + timestamp behavior on a real device.

### Gap 2 — Push notifications (FCM end-to-end on staging)

| Probe | Result | Notes |
|-------|--------|-------|
| Backend trigger inventory: `grep -rn "notificationsService.sendToUser" be/src/` | ✅ desk-verified | Trigger call sites across tasks, activities, overtime, pruning-requests, monitoring status-calculator (missing-worker), shift-reminder cron — full 4-3 set wired |
| Mobile token registration on login | ⏳ field | `fe/mobile/src/services/fcm/` — register/deregister code present; needs device confirmation |
| Foreground handling (toast + badge increment) | ⏳ field | Verify NBToast appears + bell badge increments |
| Background handling (system notification) | ⏳ field | iOS + Android — verify system tray notification, tap → deep-link to entity |
| Quit-state handling (cold-start with deep-link payload) | ⏳ field | App launches and routes to entity directly (deep-link routing lands in 4-8 E3) |
| FCM token rejection / re-registration | ⏳ field | Verify the May-17 `fix(fcm)` loop is fixed — rejected token deactivates without reactivate-loop |
| Delivery latency p50 / p99 | ⏳ field | Measure end-to-end (backend trigger → device toast) |
| Retry queue exists? | ✅ desk-verified | BullMQ `fcm-retry` queue live: `be/src/modules/queue/fcm-retry/` (module + processor + tests) on existing Redis per ADR-043 Gap 4 |
| Notification preferences entity exists? | ✅ desk-verified | `be/src/modules/notifications/entities/notification-preference.entity.ts` + per-type enforcement + mobile prefs screen (4-3, Jun 9) |

**Verdict (desk):** **Delivered in 4-3** — preferences, retry queue, inbox + type filters all shipped. Field probes (latency, background/quit handling) remain.

### Gap 3 — Background location tracking

| Probe | Result | Notes |
|-------|--------|-------|
| Library | `react-native-geolocation-service@5.3.1` | Confirmed in `fe/mobile/package.json` |
| Android `FOREGROUND_SERVICE` permission declared in `AndroidManifest.xml`? | ❌ desk-verified MISSING | Not declared (manifest lines 4-28 audited Jun 10) |
| Android `FOREGROUND_SERVICE_LOCATION` (API 34+)? | ❌ desk-verified MISSING | Required from Android 14 |
| Android `ACCESS_BACKGROUND_LOCATION` permission flow? | ✅ desk-verified | Declared at `AndroidManifest.xml:11` |
| Foreground-service implementation with persistent notification? | ❌ desk-verified MISSING | **No `<service>` in the manifest and no foreground-service library in package.json.** `locationTracker.ts` is a JS `setInterval` tracker (10-60 s randomized) — it stops when Android suspends the app. |
| iOS `UIBackgroundModes` includes `location`? | ❌ desk-verified MISSING | Not present in `fe/mobile/ios/SekarApp/Info.plist` |
| iOS `NSLocationAlwaysAndWhenInUseUsageDescription` present? | ❌ desk-verified MISSING | Only `NSLocationWhenInUseUsageDescription` exists — **and its string is empty** (App Store rejection risk) |
| Current tracking interval | ✅ desk-verified | 10-60 s randomized interval, `locationTracker.ts` |
| Battery audit (4-h field shift) | ⏳ field | Measure average drain; goal ≤ 15 %/h |
| Throttle logic when idle (no movement) | ⏳ field | Verify reduced polling when stationary |
| Permission denial fallback UX | ⏳ field | OB-2 explicitly handles "Tolak" path |

**Verdict (desk): ESCALATE — true background tracking does not exist today.** Tracking works only while the app is foregrounded/screen-on; once Android dozes or the user switches apps, pings stop until the app resumes (the offline-sweeper then marks the worker offline). Closing this requires a **foreground service** (e.g. `react-native-background-actions` or a native module) + the two missing Android permissions + iOS `UIBackgroundModes`. This is **net-new feature work (est. 1-2 d), not a config fix** — needs an explicit go/no-go from the project owner: ship MVP with screen-on tracking (document the limitation) or block release on a foreground-service implementation.

### Gap 4 — Message broker (do we need one?)

| Probe | Result | Notes |
|-------|--------|-------|
| Current brokers / queues in `be/package.json` | ✅ desk-verified | `@nestjs/bullmq@11` + `bullmq@5.77` ADOPTED on existing Redis 7 — `be/src/modules/queue/fcm-retry/` (module + processor + tests) live since 4-3 |
| Workloads that benefit from a queue | (see table below) | FCM retry on BullMQ ✅; async exports use `setImmediate` + retry cron (4-5 pragmatic choice — migrate to BullMQ when volume demands) |
| Throughput requirements | ⏳ field | Measure peak load (k6 test from Phase 3 sub-phase 3-14 — pending) |
| Persistence + retry semantics needed for which workloads | ✅ desk-verified | fcm-retry: BullMQ persistence/retry; export_jobs: DB-row status + 5-min retry cron (max 3) |

**Workload candidate inventory:**

| Workload | Today | Benefit from queue? | Recommendation |
|----------|-------|--------------------|----------------|
| FCM send | Sync in `notifications.service` | **Yes** — retry on transient failure | BullMQ `fcm-retry` queue |
| Async exports (> 5k rows) | None | **Yes** — non-blocking | BullMQ `export-jobs` queue |
| CSV import (> 1k rows) | None | **Yes** — progress tracking | BullMQ `csv-import` queue |
| KMZ parse | Sync | **Yes** — slow operation | BullMQ `kmz-parse` queue |
| Cron-driven aggregations (daily summary, stale cleanup) | `@nestjs/schedule` | No — cron is sufficient | Keep cron |
| Monitoring projector (Redis Streams consumer) | Live (Phase 3) | No — Streams is the queue | Keep |

**Verdict (desk): DELIVERED.** BullMQ adopted on existing Redis 7 — `fcm-retry` queue shipped in 4-3 per [`backend.md § R2`](./backend.md#r2-bullmq-retry-queue-on-existing-redis-per-adr-043). 4-5 exports chose `setImmediate` + retry-cron over a queue (documented deviation; acceptable at current volume, revisit if export traffic grows).

### Gap Audit Synthesis Matrix (desk pass — Jun 10, 2026)

| Gap | Verdict | Sub-phase delivery | ADR-043 record |
|-----|---------|---------------------|-----------------|
| 1 Offline sync | 🟢 Delivered (desk) — field flows pending | 4-2 shipped (7 queue types, 3-state banner) | Deliver — done |
| 2 Push hardening | 🟢 Delivered (desk) — latency/device probes pending | 4-3 shipped (prefs + BullMQ retry + inbox) | Deliver — done |
| 3 Background location | 🔴 **ESCALATED — owner decision needed** | Permissions/plist fixed in 4-8; **foreground-service impl missing (1-2 d net-new work)** — ship MVP with screen-on tracking or block release | Deliver (scope TBD) |
| 4 Broker / job queue | 🟢 Delivered | 4-3 (BullMQ fcm-retry on existing Redis) | Adopt — done |

### Manual field-test checklist (remaining ⏳ probes — staging + physical device)

1. **Offline sync:** airplane-mode clock-in → reconnect → exactly one submission, WIB timestamps preserved; repeat for activity (multipart), overtime, task-completion, reassignment; queue back-pressure ≥200 items.
2. **FCM:** trigger all 8 backend points against a staging FCM project; verify foreground toast + badge, background tray + tap-deep-link (`sekar://` routes from 4-8 E3), quit-state cold start; measure p50/p99 (SLA: ≤1.5 s / ≤5 s); kill FCM transiently → fcm-retry queue first retry ≤90 s.
3. **Background location:** 4-h shift battery drain (SLA ≤15 %/h); position freshness ≤60 s while moving **with the screen off** — expected to FAIL until the foreground service lands (Gap 3); idle throttling.
4. **Login throttle:** run `EXPECT_LOGIN_THROTTLE=true API_URL=<staging> npx playwright test e2e/12-security.spec.ts` (prod 5/min limit).
5. **Deep links on device:** `adb shell am start -W -a android.intent.action.VIEW -d "sekar://tasks/<id>" <applicationId>`.
6. **Maestro:** `maestro test fe/mobile/.maestro/flows/` per `.maestro/README.md` (staging seed + reachable backend).

---

## <a id="revamp-acceptance-checklist"></a>Revamp Acceptance Checklist (Sub-Phase 4-R) — 🟢 Mobile signed off (Jun 9) · Web ⏳ pending

Every revamped screen lands ✅ only when the 6 gates in [`ui-ux.md § 4`](./ui-ux.md#4-per-screen-acceptance-gate) pass: visual fidelity, NB compliance, a11y floor, copy lock, token compliance, no test regression.

**Mobile sign-off (Jun 9, 2026):** all 38 screens on v2.1; token residue cleared (raw `<Text>`/inline-font→`NBText` across the revamp screens); `NBSkeleton` loading states on the list screens; `NBEmptyState` coverage on all lists; a11y labels on dynamic controls (bell, mark-all-read, connectivity banner); code-health green — `tsc` 0, `eslint` 0, full jest 4032 pass. **Documented exceptions (✅ accepted, not pending):** OB-2 per-row emoji icons (semantic `NBText`, emoji retained); OB-3 AreaPreview simplified map reconciliation; `AvailabilityCalendar` + clock/countup numeric displays (pixel-tuned internals). Verification beyond unit tests (on-device WCAG contrast/screen-reader walk) → smoke-tested; deep field a11y audit folds into 4-8.

### Mobile (38 screens — 11 NEW · 22 revamp · 2 token-only · 3 sections grouped) — 🟢 signed off

| Hi-Fi ID | Name | Type | Status |
|----------|------|------|--------|
| WL-1 | Splash · 1/5 | NEW | ✅ |
| WL-2 | Pantau real-time | NEW | ✅ |
| WL-3 | Tugas terstruktur | NEW | ✅ |
| WL-4 | Permohonan kecamatan | NEW | ✅ |
| WL-5 | Offline-ready | NEW | ✅ |
| AS-1 | Login · idle | Revamp | ✅ |
| AS-2 | Login · field error | Revamp | ✅ |
| AS-3 | Login · auth-fail toast | Revamp | ✅ |
| AS-4 | Lupa sandi · contact admin | NEW | ✅ |
| AS-5 | Ganti sandi (forced + success) | NEW | ✅ |
| OB-1 | Welcome · 1/3 | NEW | ✅ |
| OB-2 | Permissions · 2/3 · 6 items | NEW | ✅ (emoji-icon exception) |
| OB-3 | Area preview · 3/3 | NEW | ✅ (map reconciliation) |
| HOME-1 | Home · Satgas | Revamp | ✅ |
| HOME-2 | Home · Korlap | Revamp | ✅ |
| HOME-3 | Home · Admin Data | Revamp | ✅ |
| ABS-1 | Clock-in · GPS + selfie | Revamp | ✅ |
| ABS-2 | Clock-in · Di luar area | Revamp | ✅ |
| ABS-3 | Shift history | Revamp | ✅ |
| MON-1 | Map · Korlap view | Revamp | ✅ |
| MON-2 | Personnel sheet | Revamp | ✅ |
| MON-3 | Tools FAB · expanded | Revamp | ✅ |
| TUG-1 | Tugas list | Revamp | ✅ |
| TUG-2 | Tugas detail | Revamp | ✅ |
| TUG-3 | Selesaikan tugas | Revamp | ✅ |
| AKT-1 | Submit aktivitas | Revamp | ✅ |
| AKT-2 | Aktivitas list | Revamp | ✅ |
| LBR-1 | Lembur list | Revamp | ✅ |
| LBR-2 | Ajukan lembur | Revamp | ✅ |
| LBR-3 | Detail lembur · disetujui | Revamp | ✅ |
| PRT-1 | Submit · Kecamatan | Revamp | ✅ |
| PRT-2 | Review queue · Admin Data | Revamp | ✅ |
| PRT-3 | Detail permohonan | Revamp | ✅ |
| PRT-4 | Pengajuan saya · Kecamatan | Token-only | ✅ |
| PRF-1 | Profile · Satgas | Revamp | ✅ |
| PRF-2 | Pengaturan | Revamp | ✅ |
| PRF-3 | Edit profil | Token-only | ✅ |
| NOTIF-1 | Inbox · 3 baru + type filter | NEW | ✅ |

### Web (15 frames — 11 revamp + 4 NEW)

| Hi-Fi ID | Name | Type | Status |
|----------|------|------|--------|
| LOG-1 | Login page | Revamp | ✅ |
| (new) | Forgot password (mirror AS-4) | NEW | ✅ |
| DASH-1 | Dashboard home | Revamp | ✅ |
| MON-1 | Monitoring wall | Revamp | ✅ |
| USR-1 | Daftar pengguna | Revamp | ✅ |
| RAY-1 | Rayon · detail | Revamp | ✅ |
| TSK-1 | Tugas list (kanban + table) | Revamp | ✅ |
| SCH-1 | Jadwal · weekly grid | Revamp | ✅ |
| LBR-1 | Lembur · approval queue | Revamp | ✅ |
| PRT-1 | Detail permohonan | Revamp | ✅ |
| SET-1 | Pengaturan · sistem | Revamp | ✅ |
| KEC-1 | Ajukan perantingan · Kecamatan | Revamp | ✅ |
| (new) | Notifications inbox | NEW | ✅ |
| (new) | Import (KMZ + CSV) | NEW | ⏳ |
| (new) | Export | NEW | ⏳ |

### Components sign-off (NEW — added May 22 late)

| Component | Mobile | Web | Status |
|-----------|--------|-----|--------|
| `NotificationBell` (bell icon + badge in header, Instagram-style) | `components/common/NotificationBell.tsx` | `components/nb/NotificationBell.tsx` | ⏳ |
| `deepLinkRouter` (single source for notification type → screen) | `services/notifications/deepLinkRouter.ts` | `services/notifications/deepLinkRouter.ts` | ⏳ |
| `ConnectivityBanner` v2.1 restyle (tokens, no hex) | `components/common/ConnectivityBanner.tsx` | `components/nb/ConnectivityBanner.tsx` | ⏳ |
| `OfflineScreen` (illo-offline + retry + status-specific subtitle) | `components/common/OfflineScreen.tsx` | `components/nb/OfflineScreen.tsx` | ⏳ |
| `ConnectivityGate` wrapper (renders OfflineScreen when status = unavailable) | `components/common/ConnectivityGate.tsx` | `components/nb/ConnectivityGate.tsx` | ⏳ |
| FCM foreground-suppression configured | `services/fcm/fcmService.ts` | `public/firebase-messaging-sw.js` | ⏳ |
| Per-screen offline matrix implemented per `mobile.md § A5` | every screen audited | every route audited | ⏳ |

### Sidebar redesign · sign-off

| Element | Status | Notes |
|---------|--------|-------|
| Pinwheel brand-mark (30 × 30 px green-bordered card) | ⏳ | per `hifi-shared.css` lines 423-451 |
| Active item state (primary bg + 2 px border + 1.5 px offset shadow) | ⏳ | |
| Section dividers (uppercase JetBrains Mono) | ⏳ | |
| Per-item count badge (monospace) | ⏳ | |
| Bottom-pinned "me" card with avatar + role pill | ⏳ | |

### Brand-asset shipment · sign-off

| Asset | Mobile | Web | Status |
|-------|--------|-----|--------|
| Pinwheel mark SVG | `assets/brand/sekar-mark.svg` | `public/brand/sekar-mark.svg` | ⏳ |
| App icon (iOS AppIcon) | n/a | ⏳ | |
| Adaptive icon (Android) | ⏳ | n/a | |
| Splash light | ⏳ | n/a | |
| Splash dark | ⏳ | n/a | |
| Splash green | ⏳ | n/a | |
| 6 empty-state illustrations | `assets/empty/illo-*.svg` | `public/empty/illo-*.svg` | ⏳ |
| 3 onboarding scenes | `assets/onboarding/onb-*.svg` | n/a | ⏳ |
| PWA manifest theme + maskable icon | n/a | `public/manifest.webmanifest` | ⏳ |
| Favicon (pinwheel) | n/a | `public/favicon.ico` | ⏳ |

---

## Pre-Implementation Specification Review (Mar 12, 2026) ✅

**Status:** Complete — All 60 Findings Addressed
**Scope:** Comprehensive review of 10 Phase 4 specification files + 4 ADRs (016-019)
**Method:** Three expert agents (System Architect, Database Engineer, Backend Developer) + 3 parallel fix agents
**Branch:** `main` (specification-only changes)

### Review Summary

| Category | Architect | DB Engineer | Backend Dev | Total |
|----------|-----------|-------------|-------------|-------|
| CRITICAL | 3 | 3 | 3 | **9** |
| HIGH | 5 | 5 | 5 | **15** |
| MEDIUM | 7 | 6 | 7 | **20** |
| LOW | 5 | 5 | 6 | **16** |
| **Total** | **20** | **19** | **21** | **60** |

### Key Themes Identified

1. Async export has no background worker mechanism defined
2. JWT blacklist incomplete — logout + rotation both need it
3. Database column name wrong — `created_at` vs `logged_at` on location_logs
4. Index conflicts with Phase 2E migration — `IF NOT EXISTS` silently skips upgrades
5. Soft-delete cascade will fail — FK constraints are RESTRICT, not CASCADE
6. `emitToUser()` is dead code with Redis adapter
7. Effort estimate is optimistic — revised from 44-57 to 52-68 days

---

### Phase A: CRITICAL Findings (7 items)

| # | Source | File | Issue | Fix |
|---|--------|------|-------|-----|
| C-1 | Architect C-3, Backend CRIT-3 | `backend.md` | Async export has no background worker mechanism — "background: generate file, upload to S3" but no implementation defined | Added section E4: `setImmediate()` fire-and-forget + 5-minute cron retry for stuck jobs |
| C-2 | DB Engineer C-2 | `database.md` | Index `idx_location_logs_user_created` references non-existent `created_at` column (actual: `logged_at`) | Renamed to `idx_location_logs_user_logged`, fixed column reference and retention SQL |
| C-3 | DB Engineer C-1 | `database.md` | `idx_audit_actor` upgrade silently skipped by `IF NOT EXISTS` (Phase 2E already created single-column version) | Added `DROP INDEX IF EXISTS` before CREATE for conflicting indexes |
| C-4 | Architect H-5, DB Engineer C-3 | `database.md`, `backend.md` | Soft-delete cascade will throw FK violations — `shifts.user_id` and `audit_logs.actor_id` are RESTRICT | Rewritten to application-level ordered deletion; users with audit_logs NEVER permanently deleted |
| C-5 | Architect C-2, Backend CRIT-2 | `backend.md` | JWT refresh token rotation doesn't blacklist incoming refresh token — only logout does | Added explicit sha256 check + blacklist step in refreshToken() flow |
| C-6 | Architect C-1 | `backend.md` | JWT access token config mismatch — module default 7d vs service override 15m; env var missing = 7-day access tokens | Documented env var requirements and module default change |
| C-7 | Backend CRIT-1 | `backend.md`, `infrastructure.md` | `emitToUser()` iterates in-memory `connectedClients` — invisible to other instances with Redis adapter | Added refactor note: use `server.to('user:{userId}').emit()` before Redis activation |

### Phase B: HIGH Findings (14 items)

| # | Source | File | Issue | Fix |
|---|--------|------|-------|-----|
| H-1 | Architect | `README.md` | Sub-phase 4-4 has hidden dependency on 4-2 (both modify `offlineQueue.ts`) | Added 4-2 as soft dependency of 4-4 |
| H-2 | Architect | `infrastructure.md` | Redis Socket.IO adapter "graceful fallback" is aspirational — room subscriptions lost on Redis restart | Rewritten: fallback only at startup; clients must reconnect and rejoin rooms |
| H-3 | Backend Dev | `backend.md` | Export job S3 URLs stored directly — no access control on download | `file_url` stores S3 object key; GET endpoint generates presigned URL with 15-min TTL |
| H-4 | Backend Dev | `backend.md` | Shift reminder cron has no dedup lock, references non-existent `shift_start` column | Added Redis `SET NX` dedup key; fixed query to JOIN schedules + shift_definitions |
| H-5 | Backend Dev | `backend.md` | BoundaryCheckService extraction lists wrong source — polygon logic is in status-calculator.service.ts | Fixed: extraction from BOTH shifts.service.ts AND status-calculator.service.ts |
| H-6 | DB Engineer | `database.md` | `export_jobs.user_id` missing ON DELETE rule — blocks user hard-delete | Added `ON DELETE CASCADE` |
| H-7 | DB Engineer | `database.md` | Redundant `idx_notification_pref_user` — UNIQUE constraint already provides this index | Removed redundant index |
| H-8 | DB Engineer | `database.md` | `location_daily_summaries` missing `rayon_id` column — can't do rayon-level aggregation | Added `rayon_id UUID REFERENCES rayons(id) ON DELETE SET NULL` |
| H-9 | DB Engineer | `database.md` | Migration should be split — indexes on large tables need `CREATE INDEX CONCURRENTLY` | Split into Migration A (tables, transactional) and Migration B (indexes, `transaction = false`) |
| H-10 | Backend Dev | `backend.md` | `auth:role:{userId}` 5-minute cache creates stale role security risk | Added cache invalidation on role/is_active change; TTL reduced to 30s |
| H-11 | Backend Dev | `backend.md` | Export rate limit is per-IP, not per-user; no date range validation | Changed to per-user; added max 366-day date range validator |
| H-12 | Backend Dev | `backend.md`, `web.md`, ADR-018 | `GET /export/:entityType` should be POST (creates resource) | Changed to `POST /export`; returns 202 for async, 200 for sync |
| H-13 | DB Engineer | `database.md` | `location_daily_summaries` backfill can't populate `within_area_pings` | Documented: columns are 0 for backfilled data; added `is_backfilled` flag |
| H-14 | Backend Dev | `backend.md` | Stale status cleanup should SET 'offline' not DELETE | Changed from DELETE to `UPDATE SET status='offline'` |

### Phase C: MEDIUM Findings (20 items)

| # | File | Issue | Fix |
|---|------|-------|-----|
| M-1 | `database.md` | No `location_daily_summaries` retention policy | Added 2-year retention with monthly cleanup cron |
| M-2 | `database.md` | No `notifications` table retention | Added 90-day read / 180-day unread retention |
| M-3 | `web.md` | Export poll interval undefined | Specified 3s poll interval with 5-minute timeout |
| M-4 | `web.md` | PWA service worker scope — caches auth pages and API routes | Excluded `_next/static/`, `/api/`, auth pages from SW cache |
| M-5 | `README.md`, `infrastructure.md` | Maestro CI on every PR too slow (8+ min) | Changed to push-to-main only |
| M-6 | `README.md` | `system-overview.md` is stale | Added to 4-10 documentation scope |
| M-7 | ADR-019, `mobile.md` | Polling interval inconsistency — 5s vs 30s | Standardized to 30s in both documents |
| M-8 | `database.md` | No CHECK constraints on new tables | Added CHECK for export_jobs.status, format, entity_type |
| M-9 | `backend.md` | CSV import session token underspecified | Defined Redis key `import:{sessionId}` with 1-hour TTL |
| M-10 | `database.md` | Pagination max 100 too low for monitoring | Added 500 override for monitoring endpoints |
| M-11 | `backend.md` | Logging interceptor PII risk — may log request/response bodies | Added "never log bodies" policy; log only method, URL, status, duration |
| M-12 | `backend.md` | `RoomJoinService` provider registration unclear | Clarified: registered in EventsModule, imports UsersModule |
| M-13 | `database.md` | Offset pagination unsuitable for location_logs | Added keyset/cursor pagination specification |
| M-14 | `backend.md` | Notification preferences missing UNIQUE constraint | Added `@Unique(['user_id', 'notification_type'])` |
| M-15 | `backend.md` | Export job entity missing @ManyToOne relation | Added User relation with `onDelete: 'CASCADE'` |
| M-16 | `database.md` | Column naming convention inconsistency | Added naming convention note (consistent `created_at`/`updated_at`/`deleted_at`) |
| M-17 | `database.md` | Missing rollback (down) migration | Documented reverse dependency order for table drops |
| M-18 | `database.md` | boundary_polygon no database-level CHECK | Documented: validation is application-level (GeoJSON structure check) |
| M-19 | `testing.md` | Coverage target unclear for new vs existing modules | Clarified: new >90%, existing must not drop, floor 80% |
| M-20 | `database.md` | Migration split needs TypeORM example | Added `transaction = false` TypeORM migration class example |

### Phase D: LOW Findings (16 items)

| # | File | Issue | Fix |
|---|------|-------|-----|
| L-1 | ADR-016 | Redis `allkeys-lru` can evict JWT blacklist entries | Changed to `volatile-lru` eviction policy |
| L-2 | `web.md` | Deep link `assetlinks.json` not specified | Added `/.well-known/assetlinks.json` for Android App Links |
| L-3 | ADR-016 | Redis AOF persistence tradeoffs undocumented | Added persistence section: `appendfsync everysec` acceptable for all use cases |
| L-4 | `ui-ux.md` | Stale status cleanup condition too broad | Added: users with active shifts go to 'missing', not 'offline' |
| L-5 | `backend.md` | Helmet.js CSP breaks Swagger UI | Added exclusion for `/api/docs` path |
| L-6 | `backend.md` | Export route collision — `jobs/:jobId` vs `:entityType` | Documented route registration order (or POST resolves this) |
| L-7 | `backend.md` | FCM trigger #8 circular dependency risk | Added `forwardRef()` or event-based pattern note |
| L-8 | `backend.md` | Production seeder missing `monitoring_configs` | Added 5 default threshold values to seeder spec |
| L-9 | `backend.md`, `testing.md` | Coverage target framing unclear | Clarified: new modules >90%, overall ≥94.51% stmts, ≥83.49% branches |
| L-10 | ADR-016 | `emitToUser()` incompatible with Redis adapter | Added cross-reference to backend.md refactoring section |
| L-11 | ADR-018 | Export endpoint uses GET (should be POST) | Updated to POST /export |
| L-12 | ADR-019 | Polling interval says 5s (should be 30s) | Updated to 30s for SERVER_UNREACHABLE state |
| L-13 | `manual-testing.md` | No backup verification procedure | Added monthly restore test to infrastructure testing section |
| L-14 | `backend.md` | Missing worker alert recipient ambiguous for multi-area korlap | Clarified: notify ALL korlaps for the area + kepala_rayon |
| L-15 | `backend.md` | `POST /auth/logout` needs refresh token in body (breaking change) | Documented as breaking API change with migration plan |
| L-16 | `README.md` | Effort estimate underestimated | Revised 4-7 to 12-15 days, 4-9 to 7-8 days; total 52-68 days |

### Phase E: Missing Production Readiness Items (5 items)

| # | File | Issue | Fix |
|---|------|-------|-----|
| P-1 | `testing.md` | No load test specification | Added k6 scenario: 500 concurrent workers, P95 <500ms target |
| P-2 | `backend.md` | No API versioning migration plan for JWT expiry change | Added phased rollout: keep 7d → deploy refresh → switch to 15m |
| P-3 | `manual-testing.md` | No database backup verification procedure | Added monthly restore test checklist |
| P-4 | `backend.md` | Missing worker alert recipient ambiguous for multi-area | Clarified: notify all korlaps for area + kepala_rayon |
| P-5 | `backend.md` | `POST /auth/logout` breaking API change not documented | Added refresh token in body requirement + migration plan |

---

## Pre-Implementation Checklist

### Architecture Review ✅

- [x] All 4 ADRs (016-019) cross-referenced and consistent
- [x] Dependency ordering verified (4-1 → 4-2, 4-3, 4-7; 4-5 → 4-6)
- [x] Soft dependency 4-2 → 4-4 documented (shared offlineQueue.ts)
- [x] Effort estimates revised to 52-68 days (from 44-57)
- [x] Risk assessment updated with API versioning risk
- [x] `emitToUser()` refactor sequenced before Redis adapter activation

### Database Review ✅

- [x] All index names reference correct column names (`logged_at` not `created_at`)
- [x] All FK ON DELETE rules explicitly stated (CASCADE, RESTRICT, SET NULL)
- [x] Phase 2E index conflicts resolved with DROP+CREATE pattern
- [x] Retention policies complete: location_logs 90d, summaries 2y, notifications 90/180d
- [x] Migration split: tables (transactional) + indexes (CONCURRENTLY)
- [x] CHECK constraints defined for enum columns
- [x] Cursor pagination specified for location_logs

### Backend Review ✅

- [x] All endpoints defined with HTTP method, auth, and response codes
- [x] JWT refresh flow complete: blacklist check → blacklist write → issue new tokens
- [x] Export endpoint changed to POST (semantically correct)
- [x] Cron jobs have dedup mechanisms (Redis SET NX)
- [x] Service extractions list correct source files
- [x] PII logging policy defined (no request/response bodies)
- [x] Circular dependency risk mitigated (FCM trigger #8)

### Mobile/Web Review ✅

- [x] Polling interval consistent: 30s in ADR-019, mobile.md
- [x] Export poll: 3s with 5-minute timeout
- [x] PWA scope exclusions defined (auth, API, _next/static)
- [x] Deep link assetlinks.json specified
- [x] Maestro CI: push-to-main only (not every PR)

### Cross-Cutting Review ✅

- [x] Effort estimates realistic (52-68 days)
- [x] All 5 missing production items addressed
- [x] Stale docs identified for 4-10 scope (system-overview.md)
- [x] No conflicting information between spec files
- [x] Coverage targets clarified (new >90%, floor 80%, overall ≥94.51%)

---

## Verification Results

### Files Modified (14 total)

| File | Agent | Fixes Applied |
|------|-------|---------------|
| `specs/phases/phase-4-production-readiness/backend.md` | Agent 1 | C-1, C-5, C-6, C-7, H-3, H-4, H-5, H-10, H-11, H-12, H-14, M-9, M-11, M-12, M-14, M-15, L-5, L-6, L-7, L-8, L-9, P-2, P-4, P-5 |
| `specs/phases/phase-4-production-readiness/infrastructure.md` | Agent 1 | C-7, H-2, M-5, L-1 |
| `specs/phases/phase-4-production-readiness/database.md` | Agent 2 | C-2, C-3, C-4, H-6, H-7, H-8, H-9, H-13, M-1, M-2, M-8, M-10, M-13, M-16, M-17, M-18, M-20 |
| `specs/phases/phase-4-production-readiness/testing.md` | Agent 2 | M-19, P-1 |
| `specs/phases/phase-4-production-readiness/README.md` | Agent 3 | H-1, M-5, M-6, L-16 |
| `specs/phases/phase-4-production-readiness/STATUS.md` | Agent 3 | Status update + review reference |
| `specs/phases/phase-4-production-readiness/mobile.md` | Agent 3 | M-7, P-4 |
| `specs/phases/phase-4-production-readiness/web.md` | Agent 3 | M-3, M-4, H-12, L-2 |
| `specs/phases/phase-4-production-readiness/ui-ux.md` | Agent 3 | L-4 |
| `specs/phases/phase-4-production-readiness/manual-testing.md` | Agent 3 | P-3 |
| `specs/architecture/decisions/ADR-016-redis-websocket-scaling.md` | Agent 3 | L-1, L-3, L-10 |
| `specs/architecture/decisions/ADR-018-export-format-strategy.md` | Agent 3 | L-11 |
| `specs/architecture/decisions/ADR-019-offline-connectivity-model.md` | Agent 3 | L-12 |

### New Documents Created

| File | Purpose |
|------|---------|
| `status_reviews.md` | This document — expert review findings and resolution |
| `status_deployment_checklist.md` | Phase 4 deployment procedures and manual testing checklist |

### Key Learnings

1. **Index names must be verified against existing migrations** — Phase 2E migration creates indexes that Phase 4 tries to upgrade. `IF NOT EXISTS` silently skips the upgrade, requiring explicit DROP+CREATE.
2. **FK constraints determine retention strategy** — `ON DELETE RESTRICT` on audit_logs means users can never be hard-deleted if they have audit trail. Design retention policies around the strictest FK constraint.
3. **In-memory patterns break with Redis adapter** — `emitToUser()` using a local Map is a common pattern that fails silently in multi-instance deployments. Always use room-based broadcasting.
4. **Effort estimates need expert calibration** — Service extractions, JWT refresh, and CI pipeline setup are consistently underestimated. 4-7 alone went from 7-9 to 12-15 days.
5. **Specification reviews before implementation save rework** — 9 CRITICAL issues found would have caused production failures or silent data loss if discovered during implementation.

---

## Second-Pass Review (Mar 13, 2026) ✅

**Status:** Complete — 25 of 31 Findings Fixed, 2 Already Resolved, 3 Deferred, 1 No Action
**Scope:** Cross-file consistency, missing implementation detail, ADR terminology/sequencing
**Method:** 2 parallel specification agents (backend-focused + frontend-focused) + verification agent
**Branch:** `main` (specification-only changes)

### Review Summary

| Priority | Found | Fixed | Already Fixed | Deferred | No Action |
|----------|-------|-------|---------------|----------|-----------|
| CRITICAL | 4 | 3 | 1 (#4) | 0 | 0 |
| HIGH | 7 | 7 | 0 | 0 | 0 |
| MEDIUM | 10 | 10 | 0 | 0 | 0 |
| LOW | 7 | 5 | 1 (#28) | 0 | 1 |
| DEFERRED | 3 | 0 | 0 | 3 | 0 |
| **Total** | **31** | **25** | **2** | **3** | **1** |

### Key Fixes Applied

1. **`export_jobs` status alignment** — DDL default changed from `'pending'` to `'processing'`; CHECK constraint updated to `('processing', 'completed', 'failed')`
2. **Mobile/web spec detail parity** — Added State Management, Auth Token Management, Component Architecture, and Auth Interceptor sections to match backend.md depth
3. **Testing strategies** — Added FCM mock, Sentry DSN guard, ioredis-mock, cron timer patterns; Maestro CI configuration details
4. **ADR-016 sequencing** — Hard dependency callout added; "graceful fallback" replaced with "degraded mode"; JWT blacklist TTL clarified
5. **Token refresh interceptor** — Documented consistently across backend.md, mobile.md, and web.md
6. **Notification preferences lifecycle** — Lazy creation, default-on semantics, full matrix GET
7. **N+1 queries** — Specific patterns identified for Tasks, Activities, Overtime services
8. **README dependency note** — Added Redis adapter → emitToUser refactoring sequencing constraint

### Deferred Items

| # | Issue | Status |
|---|-------|--------|
| #9 | Production seeder data stakeholder sign-off | TODO note added to STATUS.md |
| #12 | Missing ADRs (020-023) | Candidates listed in STATUS.md |
| #19 | Feature flag / rollout strategy | Partially covered in deployment checklist |

### Files Modified (12 total)

| File | Fixes Applied |
|------|---------------|
| `database.md` | #1, #16, #23 |
| `backend.md` | #3, #7, #8, #11, #14, #15, #17, #18, #27 |
| `mobile.md` | #2, #7, #26 |
| `web.md` | #2, #7, #30, #31 |
| `testing.md` | #3, #10 |
| `ui-ux.md` | #20, #21 |
| `manual-testing.md` | #22, #29 |
| `STATUS.md` | #13, #12, #9 |
| `README.md` | Dependency note for #5 |
| `ADR-016` | #5, #6, #24 |
| `ADR-018` | #25 |
| `ADR-019` | #26 |

### Verification Results

- No `'pending'` contradictions in export_jobs status
- Token refresh interceptor present and consistent in all 3 frontmatter files
- ADR-016 hard dependency callout present; README dependency notes updated
- STATUS.md task counts consistent with README.md (99 expanded vs grouped summary)
- 19/19 new sections verified present

---

*Phase 4 Production Readiness: Specification Reviews*
*Last Updated: March 13, 2026*
