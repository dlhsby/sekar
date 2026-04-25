# CLAUDE.md

**Last Updated:** April 25, 2026
**Status:** Phase 2E Complete ✅ + Monitoring Map Bugfixes ✅ | Phase 3 (Plants Management + Monitoring Rebuild + Public Intake) IN PLANNING — ADR-029…037 drafted; **M1-R Redesign Foundation milestone added (sub-phases 3-R1…3-R5)**: unified token pipeline, brand-font bundling, NB primitive migration with NBModal/NBToast/NBText, web PWA shell with mobile-web responsive layouts, full redesign sweep promoted from Phase 4 backlog. Phase 4/5 renumbered.

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

### Fresh Start (from clean checkout)
```bash
# 1. Start infrastructure (PostgreSQL, Adminer, LocalStack S3)
./infra/start.sh

# 2. Backend setup
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

**Phase 1 MVP** ✅ Complete (Jan 23, 2026)
- Backend: 9 modules, 40 endpoints, 401 tests (84.23%)
- Mobile: 14 screens, 1,086 tests

**Phase 2 Enhanced Features** ✅ Complete (Jan 27, 2026)
- Backend: 15 modules, 83 endpoints, 845 tests (90.77%)
- Mobile: 17 screens, ~3,298 tests (80.31%+), Neo Brutalism UI, WCAG 2.1 AA
- Web: 18 pages, Next.js 16.1.4, Mapbox GL
- Features: Rayons (7), Tasks, Notifications, Monitoring, KMZ Import, WebSocket

**Phase 2 Code Review** ✅ Complete (Jan 31-Feb 1, 2026)
- Fixed critical bugs (withAlpha(), ErrorBoundary)
- Added 84 tests (2,057 → 2,141)
- Improved coverage: API +6.22%, Sync +5.02%

**Phase 2C Client Feedback** ✅ Complete + Deployed (Feb 10-28, 2026)
- 8-role system (ADR-009), Overtime module, Task redesign, Activity rename
- GPS soft geofencing, filter modal improvements, subordinate hierarchy filters
- Backend: 16 modules, 113 endpoints, 888 tests; Mobile: 3,264 tests
- Deployed: api.sekar.wahyutrip.com + sekar.wahyutrip.com (Feb 16, 2026)

**Phase 2D Real-Time Monitoring** ✅ Complete + Deployed (Mar 3-7, 2026)
- Five-status tracking (active/inactive/outside_area/missing/offline) backed by `user_tracking_status` table
- `StatusCalculatorService` integrated into `LocationService` (onLocationPing) and `ShiftsService` (onClockIn/onClockOut)
- Configurable thresholds via `monitoring_configs` table (5 configs); WebSocket `monitoring:` room prefix
- 5 new WebSocket events: status-changed, left-area, entered-area, reassigned, area:staffing-changed
- 3 new services: DayTypeService, RayonBoundaryService, MonitoringReassignService
- Web: full Mapbox GL map with markers/polygons, filter sidebar, worker detail panel, staffing summary
- Mobile: enhanced MapDashboard, UserDetailSheet, four-status marker colors, location history
- Backend: 122 endpoints, 1,204 tests (94.55% line coverage); Mobile: 3,669 tests
- 2 migrations: Phase2DMonitoringSchema + Phase2DGapFixes (rayon boundary columns)
- Deployed: api.sekar.wahyutrip.com (Mar 7, 2026)

**Phase 2E Client Feedback II** ✅ Complete (Mar 11, 2026)
- Phone number login (identifier-based auth, ADR-012)
- Profile picture upload (S3), multi-area korlap assignment (ADR-013)
- Overtime clock-in/clock-out redesign (ADR-014), optional selfie
- Admin_data + kepala_rayon clockable, audit trail module (ADR-015)
- Backend: 18 modules, ~130 endpoints, 1,204 tests; 2 new tables (user_areas, audit_logs)
- Mobile + Web: identifier login, types updated, optional selfie

**Monitoring Map Bugfixes** ✅ Fixed (Apr 24, 2026)
- Marker sizing: reduced 40→32px, LabelMode enum replaces raw `zoomLevel` float
- `tracksViewChanges={false}` + key includes `labelMode` → bitmap only redraws on threshold crossing
- LocationTrail: `requestAnimationFrame` mount guard prevents `addViewAt` bridge crash
- `useFocusEffect` replaces one-shot `useEffect` for boundary fetch; `boundaryKey` forces Polygon remount on tab re-focus
- Removed `animateToRegion` from `handleMarkerPress` to eliminate race with bottom-sheet `snapToIndex`

**Phase 3 Plants Management + Monitoring Rebuild + Public Intake** - IN PLANNING (Apr 24–25, 2026)
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
rm -rf node_modules && npm install         # Dependencies
```

### Mobile
```bash
npm start -- --reset-cache                  # Metro cache
cd android && ./gradlew clean && cd ..      # Build issues
# Check .env has correct API_BASE_URL
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
| **Phase 3 (planning)** | 9 ADRs drafted (029–037), **21 sub-phases** (incl. M1-R 3-R1…3-R5 redesign foundation), **~73 dev-days**; Phase 4/5 renumbered. Mobile + web unified design tokens + responsive PWA + full migration sweep. No code written yet. |

**Deployed to Production:** api.sekar.wahyutrip.com + sekar.wahyutrip.com — **Phase 2D (Mar 7, 2026) + Phase 2E (Apr 25, 2026)** both on production.

**Next:** Phase 3 — Plants Management + Monitoring Rebuild + Public Intake. Phase 4 (Production Readiness) follows.

**Deployment Guide:** `specs/deployment/phase-2-deployment.md`
