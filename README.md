# SEKAR - Sistem Evaluasi Kerja Satgas RTH

**Worker Tracking & Task Management System for DLH Surabaya**

---

## Overview

SEKAR is a comprehensive worker tracking and task management system for DLH Surabaya - the municipal department managing parks and green spaces across the city.

**Core Features:**
- Real-time GPS tracking with geofence monitoring
- Digital clock-in/out with selfie verification
- Photo/video work reports with offline support
- Live supervisor dashboards (web + mobile)
- Task assignment and workflow management
- 7 Rayon organizational structure with 8-role RBAC (9th role `staff_kecamatan` planned in Phase 3)
- Firebase push notifications (mobile FCM + web push admin subscription planned in Phase 3)
- Five-status monitoring (active/inactive/outside_area/missing/offline)
- Neo Brutalism 2.0 design system (unified mobile + web tokens planned in Phase 3 M1-R)

---

## Quick Start

### Prerequisites

- **Node.js** >=24.13.0
- **PostgreSQL** 14+ (or Docker)
- **npm** >=10.0.0

### 1. Start Infrastructure

```bash
cd infra && ./start.sh
```

### 2. Start Backend

```bash
cd be
npm install
cp .env.example .env        # Edit with your database credentials (uncomment DATABASE_SYNCHRONIZE=true)
npm run migration:run        # Run database migrations
DATABASE_SYNCHRONIZE=true npm run start:dev  # Start once to sync tables, then Ctrl+C
npm run db:seed              # Seed test data (30 users, tasks, activities, monitoring)
npm run start:dev            # http://localhost:3000
```

### 3. Start Mobile App

```bash
cd fe/mobile
npm install
# Edit .env with API_BASE_URL
npm run android              # Android emulator/device
npm run ios                  # iOS simulator (macOS only)
```

### 4. Start Web Dashboard

```bash
cd fe/web
npm install
npm run dev                  # http://localhost:3001
```

### 5. Access Services

- **Backend API:** http://localhost:3000/api/v1
- **Swagger Docs:** http://localhost:3000/api/v1/docs
- **Adminer (DB UI):** http://localhost:8080
- **Web Dashboard:** http://localhost:3001

### Test Users

All passwords: `password123`

| Username | Role | Notes |
|----------|------|-------|
| admin | superadmin | Full access |
| korlap1 | korlap | Taman Bungkul |
| satgas1 | satgas | Active status |
| satgas2 | satgas | Inactive status |
| linmas1 | linmas | Active status |

See [`be/src/database/seeds/README.md`](be/src/database/seeds/README.md) for all 30 test users.

---

## Project Status

**Phase 2E Complete + Monitoring Map Bugfixes** ✅ (April 2026)

| Component | Status | Metrics |
|-----------|--------|---------|
| **Backend** | Complete | 18 modules, ~130 endpoints, 1,264 tests, 94.51% coverage |
| **Mobile** | Complete | 22 screens, 3,669+ tests, 80.31%+ coverage, WCAG 2.1 AA, Neo Brutalism 2.0 |
| **Web** | Complete | 21 pages, Mapbox GL, real-time monitoring dashboard, identifier login |
| **Database** | Complete | 22 tables, 8-role system, 8 migrations, monitoring status tracking |

**Deployed:** api.sekar.wahyutrip.com + sekar.wahyutrip.com — **Phase 2D (Mar 7) + Phase 2E (Apr 25)** both live in production.

**Next:** Phase 3 — Plants Management + Monitoring Rebuild + Public Intake (5–7 weeks, 73 dev-days, in planning)
- **M1-R Redesign Foundation (14 d):** unified design-token pipeline + brand-font bundling + NB primitive migration + new mobile NBModal/NBToast/NBText + Web installable PWA + mobile-web responsive layouts at 375/768/1280 px + full screen-level redesign sweep
- **M1-S Schema + Spec Sync (6 d):** new role `staff_kecamatan`, plant-related tables, obsolete-doc cleanup
- **M2 Monitoring v2 (21 d):** Redis Streams pipeline, supercluster, virtualized list, k6 500-worker load test
- **M3 Plants & Typed Tasks (15 d):** pruning task form, due-date forecast, CSV backfill of 5,008 historical records
- **M4 Public Intake + Capacity + Seeds (16 d):** kecamatan submit → admin_data review → convert-to-task workflow, capacity calendar, seed ledger
- **M5 Documentation + Deploy (2 d + rollout):** pilot at Rayon Selatan → all rayons

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 11, TypeScript 5.9, PostgreSQL 14+, TypeORM, JWT, WebSocket |
| **Mobile** | React Native 0.83, React 19, Redux Toolkit, FCM, Neo Brutalism UI |
| **Web** | Next.js 16, React 19, TailwindCSS 4, Mapbox GL, Socket.io |
| **Infra** | Docker, AWS S3, LocalStack (dev), GitHub Actions CI/CD |

---

## Testing

```bash
# Backend
cd be && npm run test:cov       # 1,264 tests, 94.51% coverage

# Mobile
cd fe/mobile && npm test        # 3,669+ tests, 80.31% coverage

# Web
cd fe/web && npm run test:e2e   # Playwright E2E tests
```

---

## Deployment

### Fresh Deploy (Staging / Production)

```bash
# 1. Run all database migrations
docker exec sekar-backend npm run migration:run:prod

# 2. Sync tables not covered by migrations (one-time)
# Temporarily set DATABASE_SYNCHRONIZE=true, start app, then disable

# 3. Seed reference data + 1 superadmin (idempotent, safe to re-run)
docker exec sekar-backend npm run db:seed:prod

# 4. Change default admin password immediately
```

### Incremental Deploy (Subsequent Releases)

```bash
# 1. Pull new image and restart
docker pull <ECR_URI>/sekar-backend:latest && docker-compose up -d

# 2. Run only new migrations
docker exec sekar-backend npm run migration:run:prod

# 3. (Optional) Re-run reference seeder if new config data was added
docker exec sekar-backend npm run db:seed:prod

# NEVER run db:seed or db:seed:phase1 in staging/prod — these wipe all data!
```

See [`specs/deployment/phase-2-deployment.md`](specs/deployment/phase-2-deployment.md) for the complete deployment guide.

---

## Documentation

- **[CLAUDE.md](/CLAUDE.md)** - Complete project guide
- **[specs/COMPLETION_STATUS.md](/specs/COMPLETION_STATUS.md)** - Project status
- **[specs/api/contracts.md](/specs/api/contracts.md)** - All ~130 API endpoints (Phase 3 plans add ~35 more)
- **[be/src/database/seeds/README.md](be/src/database/seeds/README.md)** - Database seeding guide
- **[specs/deployment/phase-2-deployment.md](specs/deployment/phase-2-deployment.md)** - Deployment guide
- **[specs/README.md](/specs/README.md)** - All specifications

---

## License

UNLICENSED - Proprietary project for DLH Surabaya

**Last Updated:** April 25, 2026
