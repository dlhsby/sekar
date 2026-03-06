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
- 7 Rayon organizational structure with 8-role RBAC
- Firebase push notifications
- Four-status monitoring (active/inactive/outside_area/missing)

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

**Phase 2D Real-Time Monitoring - Code Complete** (March 2026)

| Component | Status | Metrics |
|-----------|--------|---------|
| **Backend** | Complete | 16 modules, 120 endpoints, 1,095 tests, 92.15% coverage |
| **Mobile** | Complete | 21 screens, 3,493 tests, 80.31%+ coverage, WCAG 2.1 AA |
| **Web** | Complete | 21 pages, Mapbox GL, real-time monitoring dashboard |
| **Database** | Complete | 20 tables, 8-role system, monitoring status tracking |

**Deployed:** api.sekar.wahyutrip.com + sekar.wahyutrip.com

**Next:** Phase 3 - Polishing & E2E Testing

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
cd be && npm run test:cov       # 1,095 tests, 92.15% coverage

# Mobile
cd fe/mobile && npm test        # 3,493 tests, 80.31% coverage

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
- **[specs/api/contracts.md](/specs/api/contracts.md)** - All 120 API endpoints
- **[be/src/database/seeds/README.md](be/src/database/seeds/README.md)** - Database seeding guide
- **[specs/deployment/phase-2-deployment.md](specs/deployment/phase-2-deployment.md)** - Deployment guide
- **[specs/README.md](/specs/README.md)** - All specifications

---

## License

UNLICENSED - Proprietary project for DLH Surabaya

**Last Updated:** March 5, 2026
