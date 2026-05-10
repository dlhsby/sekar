# CLAUDE.md

**Last Updated:** May 10, 2026 (May 10 late — **pruning workflow review + UX polish**: (a) **Approve gate** — `PruningRequestsService.review()` now rejects `decision: 'approve'` with 409 `"Atur jadwal terlebih dahulu sebelum menyetujui permohonan"` when `request.scheduled_date` is null. Mirrors the existing mobile UI rule; closes the API bypass into "approved-without-date" limbo. Reject path is intentionally NOT gated — admins must be able to reject incomplete requests. Use `under_review` for tentative dispositions. (b) **Reschedule cascade** — `/pruning-requests/:id/expected-date` whitelist extended to include `assigned`. For `assigned` requests the cascade runs in one transaction: `service_capacity` rebook only when ISO week changes (book new → release old; abort BEFORE touching old slot if new week is full so the original booking is never lost), `task.deadline` bump, `task_delegations` audit row with `reason: "Jadwal diubah ke YYYY-MM-DD"`, and best-effort assignee push. `in_progress` / `done` / `rejected` / `cancelled` remain blocked — the task lifecycle owns those. Mobile `RESCHEDULABLE_STATUSES` updated to match. Defensive fallback: if linked task FK doesn't resolve, log loudly and update only the request. (c) **AvailabilityCalendar redesign** — Sunday-start labels (Min..Sab), month-grouped grid (each month renders its own Sun..Sat × N-rows matrix so day-of-week headers always sit directly above their dates with no overlap or drift), tap-to-toggle selection (`onSelect(null)` clears), inline `Tanggal Terpilih` strip with explicit Hapus action, blue ring for preferred-week (no background fill override) so the actual status color is never disguised — fixes the bug on PR-1778385950945 where a `full` day rendered yellow inside the preferred week and surprised admin with a "Penuh" alert. Range floor clamped to today; cells reduced to 34 dp with 4 dp inter-cell padding so 3 dp indicators are clearly visible. (d) **Sun-Sat label alignment** — `formatIsoWeekLabel` switched to `getSundayWeekBoundsForIso` so the admin label matches what kecamatan saw on the WeekPicker (ISO 21 → "Minggu 21 · 17–23 Mei 2026" not "18–24 Mei"). Calendar highlight range tracks the same Sun-Sat block. (e) **RescheduleSheet vertical compaction** — ~70 dp reclaimed via negative margins on body (without touching NBModal globals) so at least one full month is visible above the fold; Batal/Simpan switched to `size="lg"` to match Buat Permohonan footer. (f) **Detail Permohonan Kontak card** redesigned — per-contact rows show name on its own line + phone with three icon buttons (copy / WhatsApp brand-green `#25D366` / call); `normalizePhone()` helper handles `0` → `62` swap so `wa.me/` always works on Indonesian numbers. Label `Ketua RT` → `Ketua RT/RW`. (g) **Penuh alert wording** corrected from "Minggu ini sedang penuh" to "Tanggal yang dipilih sudah penuh, silakan pilih tanggal lain." Backend tests **94/94 ✓** (88 → 94, +6 specs covering approve guard + 4 reschedule cascade scenarios); mobile pruning + dateUtils **214/214 ✓**. Specs updated: `backend.md`, `STATUS.md`, `testing.md`. — May 10 — **pruning lifecycle rename `converted → assigned`**: status value, FK column (`converted_task_id` → `assigned_task_id`), DTO class (`AssignPruningRequestDto`), service method + HTTP route (`/assign-to-task`), mobile API + slice action (`assignPruningRequestToTask`), component file (`AssignToTaskSheet.tsx`), and Indonesian UI labels (`Dijadwalkan` → `Ditugaskan`, `Konversi ke Tugas` → `Tugaskan ke Petugas`). Migration 17460009 renames the status value + 17460010 renames the column. Both migrations are idempotent — 17460010 detects sync-collision states and either RENAMEs, drops the legacy column, or no-ops as appropriate. Seed-phase3 sample + bulk inserts updated to populate the new columns (`expected_year`/`expected_iso_week` for every row, `scheduled_date` only for admin-acted statuses). Cancel rule also tightened (May 9 late) — switched from blacklist to whitelist `['submitted', 'under_review', 'approved']`, closing four wrong-state holes (`rejected`/`assigned`/`in_progress`/`done`). Backend tests 88/88 ✓ (+9 cancel specs); mobile 378/378 ✓; web pruning 3/3 ✓. Specs updated: `database.md`, `backend.md`, `mobile.md`, `web.md`, `testing.md`, `STATUS.md`, `ui-ux.md`, `status_progress.md`, `status_reviews.md`. — May 9 late+1 — **full seeder username standardization + verbose output**: Three rounds of cleanup so every dummy user follows `<role>_<rayon|code>_<n>` (admin and superadmin remain exempted): (a) Per-kecamatan staff renamed `staff_kec_<rayon>_*` / `staff_kec_pusat_*` → `staff_kecamatan_<rayon>_*` / `staff_kecamatan_pusat_*` everywhere — including the legacy staging-only single-rayon user `staff_kec_pusat_1` → `staff_kecamatan_pusat_1`. The internal `USER_STAFF_KEC_PUSAT_ID` constant was also renamed to `USER_STAFF_KECAMATAN_PUSAT_ID` for consistency. Mobile `SubmitScreen` test fixture updated to match. (b) Audit of dev seeder `seed-phase2.ts` found 12 multi-rayon usernames missing the trailing instance suffix: `kepala_rayon_timur_1` / `_2`, `kepala_rayon_barat_1` / `_2`, `admin_data_timur_1` / `_2`, `admin_data_barat_1` / `_2`, `korlap_timur_1` / `_2`, `korlap_barat_1` / `_2` — all renamed to add `_1` (e.g. `admin_data_timur_1_1`, paralleling the satgas convention `satgas_timur_1_2`). (c) Verbose seeder output: `seed-staging.ts` `insertUser` helper now logs every row inserted with marker (✚ inserted / · already existed) + role + rayon name; the per-kecamatan loop in both `seed-phase3.ts` and `seed-staging.ts` prints a 31-row table before the summary; `seed-phase2.ts` now ends with a live USER AUDIT block that queries the DB back and groups every seeded row by role with rayon names. Backend tests 79/79 ✓; mobile pruning tests 69/69 ✓; tsc clean for all touched seeders. — Earlier May 9 — **staff_kecamatan username standardization**: Per-kecamatan staff users renamed `staff_kecamatan_<code>` → `staff_kecamatan_<code>_1` (e.g. `staff_kecamatan_tegalsari` → `staff_kecamatan_tegalsari_1`) so every multi-instance role follows the same `<role>_<rayon|code>_<n>` numeric-suffix convention — only `admin` (Phase 1) and `superadmin` are exempted. Legacy staging-only user `staff_kec_pusat` → `staff_kec_pusat_1`. Updates in `seed-phase3.ts` (insert template + Pusat-staff lookup falls back through both names) + `seed-staging.ts` (insert template + UAT walkthrough tip + summary banner) + mobile test fixture. Backend tests 125/125 ✓; mobile pruning tests 69/69 ✓. — Earlier May 9 — **Perantingan FK + seeder tip fix**: (1) Kept `pruning_requests.submitted_by` NOT NULL — a request without a submitter is invalid by business rule. Relation is `@ManyToOne(User, { onDelete: 'CASCADE' })`. (2) Added `npm run db:fix-orphans` (`be/src/database/seeds/db-fix-orphans.ts`) — DEV-only standalone script that **DELETEs** pruning_requests rows whose `submitted_by` no longer references a live user (and NULLs nullable `reviewed_by` / `rayon_id` orphans). Use it when synchronize fails with `FK_…_submitted_by` violations on stale local data, without resorting to a full `db:seed` wipe. (3) Realigned the dev seed-phase3 + staging seeder UAT tips: previously suggested `staff_kecamatan_wiyung` (Rayon Selatan) paired with `admin_data_pusat_1` (Rayon Pusat), which obviously misses the admin queue because the request lands in Selatan, not Pusat. Tip now suggests `staff_kecamatan_tegalsari` ↔ `admin_data_pusat_1` ↔ `satgas_pusat_1` (all Rayon Pusat) with explicit cross-rayon examples below. Backend tests 79/79 ✓. — Earlier May 9 — **Perantingan review polish round**: (1) Backend `PruningRequest` entity gains `submitter` / `reviewer` / `rayon` `@ManyToOne` relations and the service queries (`findMine`, `findById`, `findAll`) hydrate them — column names unchanged so no migration. The list card's "submitter" chip and the new "Pemohon (Petugas)" row on the detail status card now actually populate. (2) `RequestDetailScreen` action cards collapsed into a single sticky bottom action bar: while `expectedDate` is empty the bar shows a primary "📅 Atur Jadwal Dahulu" + hint, and Setujui / Tolak / Konversi stay disabled — admin must set the schedule first. Once a date is set the schedule button shrinks to "Atur Ulang Jadwal" and the action row enables. (3) Admin no longer sees "Batalkan Permohonan" — cancel is submitter-only; admin disposition is approve/reject/convert via the formal review trail. (4) `RescheduleSheet` switched from `type="sheet"` to `type="fullscreen"` — sheet's `flexShrink: 1` height left `AvailabilityCalendar`'s inner ScrollView unbounded, collapsing the calendar layout. (5) `SubmitScreen` photo upload now sends base64 data-URIs via `mediaService.convertToBase64` (mirrors `TaskCompleteScreen` / `OvertimeSubmitScreen`); previously sent local `file://` URIs were unreadable on admin devices. Backend tests 125/125 ✓; mobile pruning + slice tests 105/105 ✓. — Earlier May 9 — **admin_data Perantingan review redesign**: fixed infinite-loading on `ReviewQueueScreen` — `fetchAdminPruningRequests.fulfilled` was iterating `action.payload` with `.forEach`, but the backend returns the paginated envelope `{items, total, page, limit}`, so Immer aborted the reducer with a TypeError and `adminListLoading` never cleared. Slice now unwraps `data.items` (or accepts a plain array for legacy callers). Visual rework of `ReviewQueueScreen` to match the canonical list pattern shared by `PerantinganListScreen` / `OvertimeListScreen` / Tugas / Aktivitas: `NBBackgroundPattern` chrome, page-title row "Review Permohonan Perantingan", filter bar with active mini-chips + sort/filter icon buttons (active-count badge), `PerantinganRequestCard` rows, `SortModal` + `PruningRequestFilterModal`. Inline approve/reject buttons removed — admins tap a card to open `RequestDetailScreen` with `adminMode:true` where the FAB approve/reject/convert-to-task live (mirrors `OvertimeDetailScreen`). Token-only styling via `nbTokens`. Tests rewritten (10/10 ✓; 105/105 pruning + slice tests ✓). Specs updated in `specs/phases/phase-3-plants-monitoring-rebuild/mobile.md` (PQ-1 wireframe + screen catalog rows for `PerantinganListScreen` and `ReviewQueueScreen`). Earlier May 9 — **staff_kecamatan UX review pass**: new `kecamatans` table FK to rayons, all 31 Surabaya kecamatans seeded + one `staff_kecamatan_<code>` user per kecamatan; `/auth/me` + login response expose `kecamatan_id` + `kecamatan_name`; mobile SubmitScreen pre-fills + locks rayon/kecamatan, mandatory `*` markers, integer-only tinggi/diameter/jumlah pohon, Indonesian phone validation, `Ketua RT` → `Ketua RT/RW`, catatan textarea; WeekPicker now Sunday-start with date-derived day labels, fixes May 9 "Sabtu shown as Senin", and runs ~3 months ahead instead of 8 weeks; RequestDetail gains copy-clipboard icon next to ref code, GPS row opens LocationMapModal with Google Maps deep-link, `Batalkan Permohonan` endpoint + UI (submitter or admin); status `Dikonversi` renamed `Dijadwalkan` everywhere; filter modal supports `Nomor Permohonan` + `Nama Pemohon` substring search; sort renamed to `Minggu Preferensi Terdekat/Terjauh`; `PerantinganRequestCard` shows requester name. Backend pruning + auth tests 125/125 ✓; mobile pruning + modals tests 328/328 ✓.) (May 4 — **delegation chain UI + load test harness**: ADR-038 `/tasks/:id/assign` now permits delegation from `assigned` status when caller===current assignee (closes "kepala_rayon hands the task to admin_data before accepting"); web `/tasks/[id]` "Disposisi Tugas" card with role-aware target list (`a5856eb`), mobile `TaskDetailScreen` matching "Disposisi ke Bawahan" button (`2a156d0`); k6 harness `infra/loadtest/monitoring-500w.js` + README + `seed-loadtest.ts` (`npm run db:seed:loadtest`) ship for Phase 3 sub-phase 3-14; Manual UAT walkthrough table A–H appended to phase-3 STATUS.md. Two commits: `a5856eb` web disposisi + backend ASSIGNED-delegation, `2a156d0` mobile parity + k6 + checklist; seed-loadtest in next commit.) (May 3 — **pruning workflow redesign hardening**: ADR-038 audit trails fully wired (`activity_tags` + `task_delegations`); `/convert-to-task` now lands tasks in `assigned` status and inserts a delegation row + push notification so the kecamatan flow is e2e-walkable (submit → review → convert → accept → start → complete); capacity `bookAtomic`/`releaseAtomic` switched to entity-aware QB (the previous `from()` form returned un-hydrated rows so every booking missed); `dotenv/config` preloaded in `main.ts` so `@Throttle` decorator literals see env vars; login throttle is now env-driven (`AUTH_LOGIN_THROTTLE_LIMIT/TTL`); env templates synced across dev/staging/prod; global `ClassSerializerInterceptor` registered so `@Exclude` on `User.password_hash` is honoured everywhere (no more leaks on tasks/users/me/delegations); 35-task `task_delegations` backfill migration. Six commits: `33c43b9` activity-tag, `4d4a5b0` capacity+throttle, `fff06da` env templates, `332db67` task delegations, `9a47f3c` backfill, `a4f1bd9` push-notif-on-hop. — May 1 plant-monitoring + perantingan review — seeder hardening (no orphaned active shifts; all `user_tracking_status` rows reset to `offline` so the monitoring map no longer crashes on stale clock-in state), token compliance sweep on new mobile primitives `MonitoringStatusSheet` / `MonitoringStatCard` / `MonitoringSearchBar` and web `MonitoringTogglePanel`, plant-monitoring overlay + AreaDetailDrawer pruning-requests panel wired to live `useAreaPlants` / `useNotablePlants` / `usePruningByRayon`, manual review checklist published in `specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md`. — Apr 28 staff_kecamatan UX Rounds 3 & 4: RequestDetailScreen redesign + tab-navigator draft prompt fix + preferred-date booking calendar (mobile-first) + admin `PATCH /pruning-requests/:id/expected-date` reschedule endpoint.)
**Status:** Phase 2E ✅ + Monitoring Map Bugfixes ✅ | Phase 3 IN PROGRESS — **~70 % weighted (13 fully complete + 4 partial + 4 not-started)**. M1-R ✅ + M1-S ✅ + M2 ✅ + M3 partial (3-6 ✅, 3-7 mobile ✅, 3-8 🟡 60 %) + M4 partial (3-9 ✅, 3-10 mobile ✅ web ⏳, 3-11 backend+mobile-state ✅ web ⏳, 3-12 backend+slice ✅ UI ⏳). Earlier "17/21 ~81 %" headline counted partials as wholes; corrected on Apr 27 audit. **Backend coverage:** `PlantsController` (5 endpoints, 41 tests, 100/97 %) + `PruningRequestsController` (6 endpoints, 55 tests, 99.35/93.1 %) + `ServiceCapacityController` (3 endpoints, 24 tests, 98.9/93.3 %) + `PlantSeedsController` (5 endpoints, 29 tests, 100/94.23 %). **Apr 27 bug-fix sweep:** (1) `NBButton` API extension — added `outline` variant + `label` alias + `leftIcon` + string-children fallback + graceful unknown-variant fallback; fixes `staff_kec_pusat` SubmitScreen crash. (2) `ConvertToTaskSheet` defensive patch — was reading non-existent `state.areas`/`state.users` slices and used `request.rayon_id` instead of `rayonId`. (3) `nbSpacing` numeric subscript shim. (4) Web `(kecamatan)/pruning-requests` placeholder pages to prevent 404. See `specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md` → "Open Items by Bucket" for the deferred-work inventory. **May 1 review pass:** `seed-phase2.ts` Section D.3 no longer forces 5 demo users into open shifts (was crashing the rebuilt monitoring sheet); `mapUtils.getStatusColor` + `MonitoringStatusSheet` STAT_CONFIG now consume `nbColors.statusActive/Idle/Outside/Missing` instead of hard-coded hex; backend `pruning-requests.service.spec.ts` date fixtures rebased onto `futureDateString()` so they don't rot. Web admin `(dashboard)/pruning-requests/*` pages confirmed missing → tracked as Phase 4 backlog row. ADRs 029–037 Accepted. Next: 3-12 mobile screens + 3-13 backfill + 3-14 load test + web finish-out + Phase 4 polish.

This file provides guidance to Claude Code when working with this repository.

---

## 📝 Communication Guidelines

**When responding to user requests:**
- ✅ **Be brief and concise** - Clear, direct answers without unnecessary elaboration
- ✅ **Use specs/ as reference** - All technical specifications are in `specs/` directory
- ✅ **Check before creating** - Update existing docs instead of creating new ones
- ✅ **Keep specs updated** - Update `specs/COMPLETION_STATUS.md` and phase STATUS files after changes

**Documentation Hierarchy:**
1. `specs/COMPLETION_STATUS.md` - Overall project status
2. `specs/phases/phase-X/STATUS.md` - Phase implementation details
3. Role-specific folders (`architecture/`, `database/`, `api/`, `mobile/`, `web/`) - Detailed specs

---

## Project Overview

**SEKAR** (Sistem Evaluasi Kerja Satgas RTH) - Worker tracking and task management system for DLH Surabaya municipal parks department.

**Core Features:** Real-time GPS tracking, digital clock-in/out with photo verification, work reports with multimedia evidence, supervisor dashboards, 7 Rayon organizational structure, shift scheduling, task workflow, push notifications.

**Tech Stack:**
- **Backend:** NestJS 11.1.13, TypeScript 5.9.3, PostgreSQL 14+, TypeORM, JWT, WebSocket, AWS S3, Jest 30, ESLint 10
- **Mobile:** React Native 0.83.1, React 19.2.4, Redux Toolkit, FCM, Neo Brutalism UI (WCAG 2.1 AA)
- **Web:** Next.js 16.1.6, React 19.2.3, TailwindCSS 4.x, Mapbox GL, Playwright 1.58.1
- **Runtime:** Node.js >=24.13.0, npm >=10.0.0

---

## Quick Start Commands

### Monorepo structure (Phase 3 onward)

The root `package.json` manages **cross-workspace tooling only** — it does NOT share dependencies with the app packages.

| Location | `npm install` installs | Purpose |
|----------|----------------------|---------|
| `/` (root) | `tsx`, `ajv`, `jest`, ESLint plugin symlink | Token pipeline (`tokens:build/verify`) + design lint rules |
| `be/` | NestJS, TypeORM, etc. | Backend |
| `fe/mobile/` | React Native, Redux, etc. | Mobile app |
| `fe/web/` | Next.js, Tailwind, etc. | Web app |

Each workspace is **fully independent** — `npm install` in one never touches another.

### Fresh Start (from clean checkout)
```bash
# 0. Root tooling — one-time per checkout (token pipeline + eslint plugin)
npm install                # Run from project root

# 1. Start infrastructure (PostgreSQL, Adminer, LocalStack S3)
./infra/start.sh

# 2. Backend setup (separate terminal)
cd be
npm install
cp .env.example .env       # Edit database credentials if needed
npm run migration:run      # Run all migrations (creates tables)
npm run db:seed            # Seed all data (Phase 1 + Phase 2, wipes first)
npm run start:dev          # http://localhost:3000

# 3. Mobile setup (separate terminal)
cd fe/mobile
npm install
# Edit .env: API_BASE_URL=http://10.0.2.2:3000 (emulator) or http://<YOUR_IP>:3000 (device)
npm run android            # Android (first connected device)
npm run android:all        # Android (all connected devices simultaneously)
npm run ios                # iOS (macOS only)

# 4. Web setup (separate terminal)
cd fe/web
npm install
cp .env.local.example .env.local  # Edit Mapbox token if needed
npm run dev                # http://localhost:3001
```

### Token Pipeline Commands (run from project root)
```bash
npm run tokens:build       # Regenerate fe/web/src/app/generated/tokens.css + fe/mobile/src/constants/generated/tokens.ts
npm run tokens:verify      # Same but exits non-zero if committed files differ (used by CI)
npm run test:tokens        # Unit tests for the generator + ESLint rule tests
```

### Backend Commands
```bash
cd be
npm run start:dev          # Start dev server (http://localhost:3000)
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
npm run db:seed            # Seed all data (destructive — wipes first)
npm test                   # Run tests
npm run test:cov           # With coverage (>80% required)
```

**Test Users:** All users use `password123` — e.g. `admin/password123`, `korlap1/password123`, `satgas1/password123`
**Phone Login:** Users can also login with phone number as identifier — e.g. `081200000006/password123` (admin)
**API Docs:** http://localhost:3000/api/docs

### Mobile Commands
```bash
cd fe/mobile
npm run android            # Android (first connected device)
npm run android:all        # Android (all connected devices simultaneously)
npm run ios                # iOS (macOS only)
npm test                   # Run tests
```

### Web Commands
```bash
cd fe/web
npm run dev                # http://localhost:3001
npm run test:e2e           # Playwright E2E tests
npm run test:e2e:ui        # With UI
```

### Infrastructure
```bash
./infra/start.sh           # Start PostgreSQL, Adminer, LocalStack
./infra/stop.sh            # Stop all services
```

**Services:** PostgreSQL (5432), Adminer (8080), LocalStack S3 (4566)

---

## Architecture Quick Reference

### Backend Structure
```
be/src/
├── modules/               # Feature modules (15 total)
│   ├── auth/             # JWT authentication, guards, decorators
│   ├── users/            # User management (CRUD, soft delete)
│   ├── rayons/           # 7 sector management (Phase 2A)
│   ├── tasks/            # Task workflow (Phase 2B)
│   ├── notifications/    # FCM push notifications (Phase 2B)
│   └── monitoring/       # Real-time stats (Phase 2B)
├── gateways/             # WebSocket events
├── common/               # Shared guards, interceptors
└── database/             # Migrations, seeds
```

**Key Patterns:**
- Each module: controller → service → repository → entity → DTOs
- Auth: `@UseGuards(JwtAuthGuard)`, `@Roles('Admin')`, `@GetUser()`
- Testing: Jest, >80% coverage, mock external dependencies
- API Docs: Swagger at `/api/docs` with `@Api*` decorators

### Mobile Structure
```
fe/mobile/src/
├── screens/              # 17 screens (8 worker + 9 supervisor)
├── components/           # Common + Neo Brutalism (NB*) components
├── store/slices/         # Redux (auth, shifts, reports, tasks, notifications)
├── services/             # API, FCM, WebSocket, location, sync
└── __tests__/            # ~3,298 tests, 80.31%+ coverage
```

### Web Structure
```
fe/web/src/
├── app/                  # Next.js App Router (18 pages)
│   ├── (auth)/          # Login
│   └── (dashboard)/     # Areas, Rayons, Tasks, Reports, Settings
├── components/nb/        # Neo Brutalism design system
└── lib/                  # API client, auth utilities
```

**See** `specs/architecture/` for detailed system design.

---

## Development Workflow

### Adding Backend Feature
1. Create module: `nest g module <name>`
2. Create entity with TypeORM decorators
3. Create DTOs with class-validator
4. Create service (business logic)
5. Create controller with Swagger decorators
6. Add guards: `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(...)`
7. Write tests (>80% coverage)
8. Test via Swagger UI

### Authentication Pattern
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'supervisor')
async method(@GetUser() user: User) { ... }
```

### Role Values Convention

**CRITICAL:** Always use lowercase role values matching backend enum.

**Phase 2C roles (8 roles -- ADR-009):**
- `'satgas'` - Field worker (was `worker`)
- `'linmas'` - Security officer
- `'korlap'` - Field coordinator (was `koordinator_lapangan`)
- `'admin_data'` - Data administrator (new)
- `'kepala_rayon'` - Rayon manager
- `'top_management'` - City-wide view
- `'admin_system'` - System administrator (new, split from `admin`)
- `'superadmin'` - Full system access (new, split from `admin`)

**Removed roles:** `worker`, `supervisor`, `admin`, `koordinator_lapangan`

**Phase 3 planned additions (ADR-032, ADR-033 — not yet implemented):**
- `'staff_kecamatan'` - External sub-district staff submitting pruning requests (new, non-clockable)
- `admin_data` gains **narrow disposition authority** over `pruning_requests` scoped by `users.rayon_id` (capability extension, per ADR-032 — amends ADR-009). **No new `admin_rayon` role.**

**Never use Pascal case for roles** (avoid `'Worker'`, `'Admin'`, `'Supervisor'`).

### Terminology Convention (Phase 2C -- ADR-010)

**Code uses English; Indonesian only for UI labels and user-facing messages.**

| Concept | Code Name | Indonesian UI Label |
|---------|-----------|-------------------|
| Activity submission | `Activity`, `/activities` | Aktivitas |
| Work schedule | `Schedule`, `/schedules` | Jadwal |
| Overtime | `Overtime`, `/overtime` | Lembur |

**Dropped:** `WorkerAssignment`, `OvertimeAktivitas`, `Report` (entity), `/aktivitas` (route), `/worker-schedules` (route)

---

## Environment Configuration

### Backend (.env)
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=sekar_db

# Auth
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRATION=7d

# LocalStack S3 (Development)
AWS_ENDPOINT_URL=http://localhost:4566
AWS_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=sekar-media-dev
AWS_REGION=ap-southeast-1

# Production S3: Leave AWS_ENDPOINT_URL empty, use real credentials

# Phase 2
FCM_ENABLED=false              # Enable when Firebase configured
NOTIFICATION_RETRY_ATTEMPTS=3
TASK_AUTO_ASSIGN_ENABLED=false
```

**See** `specs/deployment/aws-s3-setup.md` for complete S3 configuration.

### Mobile (.env)
```env
API_BASE_URL=http://10.0.2.2:3000    # Android emulator
# or http://<YOUR_IP>:3000           # Physical device
# or https://api.sekar.dlhsurabaya.go.id  # Production
API_VERSION=v1
```

**See** `specs/deployment/wsl2-network-setup.md` for physical device testing.

---

## Key Development Guidelines

### Code Standards
- Follow `.cursor/rules/001-code-generation.mdc`
- Apply SOLID principles, clean architecture
- Write concise TypeScript (aim for 5-line functions)
- Use descriptive names (camelCase variables, PascalCase classes)
- Check ADRs in `specs/architecture/decisions/` before major changes

### Security
- JWT auth with role-based access (Worker, Supervisor, Admin)
- Bcrypt password hashing (10 rounds)
- GPS validation (±100m tolerance)
- Input validation with class-validator
- Rate limiting: 100 req/min global, 5 req/min login
- Never commit secrets (.env in .gitignore)

**See** `specs/architecture/security.md` for complete security guidelines.

### Testing
- **Unit Tests:** >80% coverage per module
- **Pattern:** Arrange-Act-Assert
- **Mocking:** Mock repositories, services, external dependencies
- **Run:** `npm run test:cov`

**See** `.cursor/rules/003-unit-testing.mdc` for testing guidelines.

### Database
- **Dev:** TypeORM auto-sync enabled
- **Prod:** Use migrations (`specs/database/migrations.md`)
- **Seeding:** `npm run db:seed` creates test data (30 users, tasks, activities, monitoring)
- **Connection Pool:** 15 connections/instance in production
- **Soft Delete:** Users use `deleted_at` timestamp

### Dependency Management
- **Last Update:** March 13, 2026 (All components updated to latest semver-compatible)
- **Backend:** TypeScript 5.9, ESLint 10, Jest 30.3, NestJS 11.1.16, AWS SDK 3.1008
- **Web:** Next.js 16.1.6, React 19.2.3, Playwright 1.58.2, Tailwind 4.2.1, Mapbox GL 3.20
- **Mobile:** React Native 0.83.4, React 19.2.4, Jest 30.3, Firebase 23.8.8
- **Dependabot:** Enabled (patch-only updates weekly, prevents breaking changes)
- **Security:** 0 vulnerabilities (web, mobile), 8 moderate nested dev deps (backend — upstream NestJS/Angular)
- **See:** `specs/architecture/security.md` (DEP-SEC section) for vulnerability assessment
- **See:** `specs/mobile/dependency-updates.md` for React Native 0.83 upgrade + policy

---

## Development Phases

**Past Phases (Phase 1–2E + Monitoring Map Bugfixes):** See `specs/COMPLETION_STATUS.md` for full history.

**Phase 3 Plants Management + Monitoring Rebuild + Public Intake** - IN PROGRESS (Apr 24–, 2026)
- **M1-R Redesign Foundation (NEW, 14 d) — opens Phase 3 BEFORE feature work.** Sub-phases 3-R1…3-R5: token generator pipeline + CI + ESLint, token value migration with hard-edge shadows + brand-font bundling on both platforms, NB primitive migration + new `NBModal`/`NBToast`/`NBText`, web PWA shell with mobile-web responsive scaffolding, full redesign sweep on every non-rewritten screen. After M1-R, mobile native + mobile web (<768 px) + desktop web all share one visual spine; no screen left on old tokens. Promoted full migration sweep from prior Phase 4 backlog (ADR-036, ADR-037).
- Full monitoring v2 rewrite: Redis Streams projector, Socket.IO Redis adapter, staffing debouncer, stale-status sweep, supercluster rendering (web + mobile), virtualized worker list, incremental WS patches (ADR-029 supersedes ADR-011 at pipeline level)
- Preserves Apr 24 marker/trail fixes (tracksViewChanges={false}, LabelMode enum, requestAnimationFrame guard, useFocusEffect) via parallel `ClusterMarker` + feature flag + ESLint rule
- Plants management: `plant_species` (131 rows from CSV), `area_plants` aggregate inventory, optional `notable_plants`, deterministic species × area_type due-date forecast (ADR-030, ADR-034)
- Task typing: `task_type` enum + JSONB `custom_fields` schema registry, parent/child lineage, partial-complete / resume-tomorrow, `activity_plant_items` line items (ADR-031)
- Public intake: new `staff_kecamatan` role (ADR-033), `pruning_requests` entity + workflow, `admin_data` disposition extension (ADR-032), generic `service_capacity` booking model (ADR-035)
- Plant-seed inventory: unified `plant_seeds` + `seed_transactions` ledger
- Web becomes installable PWA + mobile-responsive at 375 / 768 / 1280 px; install banner directs satgas/linmas/korlap on phone browsers to native app; `staff_kecamatan` submits via dedicated `(kecamatan)` layout
- Redis 7 adopted earlier than Phase 4's ADR-016 plan; CSV backfill seeder (5,008 rows); k6 500-worker load test
- 21 sub-phases, ~73 dev-days, 8 new tables, 5 altered tables, ~35 new endpoints + push subscription endpoints, new backend modules: plants, pruning-requests, service-capacity, plant-seeds
- **Task status simplification (ADR-009 debt, 8→4) deferred to Phase 4 backlog**

**Phase 4 Production Readiness** - NOT STARTED (renumbered from old Phase 3)
- E2E testing (Detox mobile, Playwright web), manual testing checklist, UI/UX polish, performance, FCM full activation, offline sync completion, exports, JWT refresh, rate limiting
- Task status simplification (ADR-009 debt), staging environment

**Phase 5 Finishing / iOS** - NOT STARTED (renumbered from old Phase 4)
- Analytics & Reporting, Asset Management (QR), iOS Platform, user guides

**See** `specs/COMPLETION_STATUS.md` and `specs/phases/` for detailed tracking.

---

## Troubleshooting

### Backend
```bash
lsof -ti:3000 | xargs kill -9              # Port in use
docker-compose ps                           # Check database
rm -rf node_modules && npm install         # Dependencies (run inside be/)
```

### Mobile
```bash
npm start -- --reset-cache                  # Metro cache
cd android && ./gradlew clean && cd ..      # Build issues
# Check .env has correct API_BASE_URL
```

### Token pipeline / ESLint plugin
```bash
# "Cannot find eslint-plugin-sekar-design" or "tokens:build not found"
npm install                                 # Run from project ROOT (not be/ or fe/*)
# This installs tsx/ajv/jest and symlinks eslint-plugin-sekar-design to root node_modules/
# The plugin is then found by ESLint in fe/mobile and fe/web via directory traversal.
```

### Metro "Cannot resolve @react-native/metro-config"
```bash
# Caused if be/fe/web/fe/mobile were previously in root workspaces (old 3-R1 config).
# Fix: run npm install from project root to resync the reduced workspace list.
npm install                                 # From project root
```

### Infrastructure
```bash
cd infra
docker-compose ps                           # Service status
docker-compose logs -f                      # View logs
docker-compose down -v                      # Clean restart (deletes data!)
```

**See** `specs/deployment/infrastructure-setup.md` for complete troubleshooting.

---

## Key Resources

| Category | Resource | Description |
|----------|----------|-------------|
| **Project Status** | `specs/COMPLETION_STATUS.md` | Single source of truth |
| **Phase 2** | `specs/phases/phase-2-enhanced/STATUS.md` | Implementation tracking |
| **Phase 2D** | `specs/phases/phase-2-d-monitoring/STATUS.md` | Monitoring implementation |
| **Phase 2E** | `specs/phases/phase-2-e-client-feedback-2/STATUS.md` | Client Feedback II |
| **Phase 3** | `specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md` | Plants + Monitoring v2 + Public Intake (IN PLANNING) |
| **Phase 4** | `specs/phases/phase-4-production-readiness/STATUS.md` | Production Readiness (renumbered from old Phase 3) |
| **Phase 5** | `specs/phases/phase-5-finishing-ios/STATUS.md` | Finishing / iOS (renumbered from old Phase 4) |
| **API Docs** | `specs/api/contracts.md` | All ~130 endpoints |
| **Errors** | `specs/api/error-handling.md` | 31 error codes |
| **Security** | `specs/architecture/security.md` | Security architecture + dependency audit |
| **Mobile Updates** | `specs/mobile/dependency-updates.md` | React Native 0.83.1 upgrade + policy |
| **AWS S3** | `specs/deployment/aws-s3-setup.md` | Media storage setup |
| **WSL2** | `specs/deployment/wsl2-network-setup.md` | Mobile testing network |
| **Infrastructure** | `specs/deployment/infrastructure-setup.md` | Docker services |
| **E2E Testing** | `specs/testing/e2e-testing.md` | Playwright guide |
| **Architecture** | `specs/architecture/decisions/` | 24 ADRs (15 existing + ADR-029…037 added for Phase 3; ADR-036 + ADR-037 Accepted) |
| **Design tokens** | [`specs/ui-ux/design-tokens.md`](specs/ui-ux/design-tokens.md) / [`tokens.json`](specs/ui-ux/tokens.json) | Single source of truth for both platforms from Phase 3 M1-R sub-phase 3-R2 onward (ADR-036). Do not hand-edit generated files. |
| **Web PWA** | [`specs/phases/phase-3-plants-monitoring-rebuild/web.md`](specs/phases/phase-3-plants-monitoring-rebuild/web.md) §PWA | Web becomes installable in Phase 3 M1-R sub-phase 3-R4 (ADR-037). Offline shell, SWR snapshot caching, web push for admins. |
| **All Specs** | `specs/README.md` | Complete navigation |

---

## Recommended Agents & Skills

### For Mobile Development
- **mobile-developer**: Implement screens, components, navigation, state management
- **mobile-code-reviewer**: Review mobile code after implementation
- **mobile-tester**: Create tests for React Native components

### For Backend Development
- **backend-developer**: Implement API endpoints, modules, services
- **backend-code-reviewer**: Review backend code after implementation
- **backend-tester**: Create tests for NestJS modules

### For Web Development
- **web-developer**: Implement pages, components, data fetching
- **web-code-reviewer**: Review web code for Next.js best practices

### For Cross-Cutting Concerns
- **Explore agent**: Investigate codebase, understand patterns (use before implementing)
- **Plan agent**: Design implementation approach for complex features
- **system-architect**: Architectural decisions, technology choices
- **database-engineer**: Schema design, query optimization
- **product-ui-ux-designer**: UI/UX design, accessibility, Neo Brutalism consistency

### Workflow Pattern
1. **Explore** → Understand existing code patterns
2. **Plan** → Design implementation approach
3. **Implement** → Use role-specific developer agent
4. **Review** → Use role-specific reviewer agent
5. **Test** → Run tests and fix issues

---

## Current Status

**Phase 2E Complete + Monitoring Map Bugfixes** ✅ (Apr 24, 2026)

| Component | Metrics |
|-----------|---------|
| **Backend** | 18 modules, ~130 endpoints, 1,264 tests (94.51% stmts, 83.49% branches) |
| **Mobile** | 22 screens (+EditProfileScreen), 3,669+ tests passing, 80.31%+ coverage |
| **Web** | 21 pages (+1 config), identifier login, auth tests updated |
| **Database** | 22 tables, 8-role system, 8 migrations (incl. drop-phone, fix-indexes+CHECK) |
| **DevOps** | 3 CI/CD pipelines, ESLint 10, Phase 2D deployed to production |
| **UI/UX** | Neo Brutalism 2.0, five-status monitoring, optional selfie, overtime clock-in/out |
| **Phase 3 (in progress)** | M1-R ✅ (3-R1…3-R5 all complete Apr 25); 3-1 spec sync ✅; **3-2 schema migration in progress** (8 new tables + staff_kecamatan role). 6/21 sub-phases done (~29%). |

**Deployed to Production:** api.sekar.wahyutrip.com + sekar.wahyutrip.com — **Phase 2D (Mar 7, 2026) + Phase 2E (Apr 25, 2026)** both on production.

**Next:** Phase 3 — Plants Management + Monitoring Rebuild + Public Intake. Phase 4 (Production Readiness) follows.

**Deployment Guide:** `specs/deployment/phase-2-deployment.md`
