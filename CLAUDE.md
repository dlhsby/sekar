# CLAUDE.md

**Last Updated:** February 5, 2026
**Status:** Phase 2 Complete ✅ | Dependencies Updated (RN 0.83.1) | Phase 3 Next

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
- **Backend:** NestJS 11.1.13, TypeScript 5.9.3, PostgreSQL 14+, TypeORM, JWT, WebSocket, AWS S3, Jest 30
- **Mobile:** React Native 0.83.1, React 19.2.4, Redux Toolkit, FCM, Neo Brutalism UI (WCAG 2.1 AA)
- **Web:** Next.js 16.1.6, React 19.2.3, TailwindCSS 4.x, Mapbox GL, Playwright 1.58.1
- **Runtime:** Node.js >=24.13.0, npm >=10.0.0

---

## Quick Start Commands

### Backend
```bash
cd be
npm install
npm run start:dev          # http://localhost:3000
npm test                   # Run tests
npm run test:cov           # With coverage (>80% required)
npm run seed               # Seed all data (Phase 1 + Phase 2 + Tasks)
```

**Test Users:** `admin/admin123`, `supervisor1/supervisor123`, `worker1/worker123`
**API Docs:** http://localhost:3000/api/docs

### Mobile
```bash
cd fe/mobile
npm install
# Edit .env: API_BASE_URL=http://10.0.2.2:3000 (emulator) or http://<YOUR_IP>:3000 (device)
npm run android            # Android
npm run ios                # iOS (macOS only)
npm test                   # Run tests
```

### Web
```bash
cd fe/web
npm install
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
└── __tests__/            # 2,141 tests, 80.31% coverage
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
- **Seeding:** `npm run seed` creates test users
- **Connection Pool:** 15 connections/instance in production
- **Soft Delete:** Users use `deleted_at` timestamp

### Dependency Management
- **Last Update:** February 5, 2026 (All components updated)
- **Backend:** TypeScript 5.9, ESLint 9, Jest 30, NestJS 11.1.13
- **Web:** Next.js 16.1.6, React 19.2.3, Playwright 1.58.1
- **Mobile:** React Native 0.83.1, React 19.2.4, React Navigation 7.x
- **Dependabot:** Enabled (patch-only updates weekly, prevents breaking changes)
- **Security:** 0 vulnerabilities (web), nested dev deps only (backend/mobile)
- **See:** `specs/architecture/security.md` (DEP-SEC section) for vulnerability assessment
- **See:** `specs/mobile/dependency-updates.md` for React Native 0.83 upgrade + policy

---

## Development Phases

**Phase 1 MVP** ✅ Complete (Jan 23, 2026)
- Backend: 9 modules, 40 endpoints, 401 tests (84.23%)
- Mobile: 14 screens, 1,086 tests

**Phase 2 Enhanced Features** ✅ Complete (Jan 27, 2026)
- Backend: 15 modules, 83 endpoints, 845 tests (90.77%)
- Mobile: 17 screens, 2,141 tests (80.31%), Neo Brutalism UI, WCAG 2.1 AA
- Web: 18 pages, Next.js 16.1.4, Mapbox GL
- Features: Rayons (7), Tasks, Notifications, Monitoring, KMZ Import, WebSocket

**Phase 2 Code Review** ✅ Complete (Jan 31-Feb 1, 2026)
- Fixed critical bugs (withAlpha(), ErrorBoundary)
- Added 84 tests (2,057 → 2,141)
- Improved coverage: API +6.22%, Sync +5.02%

**Phase 3 Polishing & E2E Testing** - NOT STARTED
- E2E testing (Detox mobile, Playwright web)
- Manual testing checklist (35 screens/pages)
- UI/UX polish, performance optimization

**Phase 4 Advanced Features** - NOT STARTED
- Analytics & Reporting, Asset Management, iOS Platform

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
| **Phase 3** | `specs/phases/phase-3-polishing/STATUS.md` | Polishing & E2E Testing |
| **API Docs** | `specs/api/contracts.md` | All 83 endpoints |
| **Errors** | `specs/api/error-handling.md` | 31 error codes |
| **Security** | `specs/architecture/security.md` | Security architecture + dependency audit |
| **Mobile Updates** | `specs/mobile/dependency-updates.md` | React Native 0.83.1 upgrade + policy |
| **AWS S3** | `specs/deployment/aws-s3-setup.md` | Media storage setup |
| **WSL2** | `specs/deployment/wsl2-network-setup.md` | Mobile testing network |
| **Infrastructure** | `specs/deployment/infrastructure-setup.md` | Docker services |
| **E2E Testing** | `specs/testing/e2e-testing.md` | Playwright guide |
| **Architecture** | `specs/architecture/decisions/` | 8 ADRs |
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

**Phase 2B Complete** ✅ (126/126 tasks)

| Component | Metrics |
|-----------|---------|
| **Backend** | 15 modules, 83 endpoints, 845 tests (90.77%) |
| **Mobile** | 17 screens, 16 NB 2.0 components, 2,141 tests (99.07% pass rate, 80.31% coverage) |
| **Web** | 18 pages, 16 NB 2.0 components, 11 tests |
| **Database** | 16 tables, migrations complete |
| **DevOps** | 3 CI/CD pipelines, Docker, Firebase guide |
| **UI/UX** | Neo Brutalism 2.0 complete (supervisor components migrated), WCAG 2.1 AA |

**Ready for Production:** All tests passing, deployment guides complete, NB 2.0 design system fully implemented.

**Next:** Phase 3 - Polishing & E2E Testing

**Deployment Guide:** `specs/deployment/phase-2-deployment.md`
