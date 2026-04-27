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

### 0. Root Setup (Token Pipeline & ESLint Plugin)

**Run once per checkout from the project root:**

```bash
npm install
```

This installs **cross-workspace tooling only** (not app dependencies):
- `tsx` — TypeScript executor for build scripts
- `ajv` — JSON schema validator
- `jest` — Test runner for token pipeline
- `eslint-plugin-sekar-design` — Symlinked ESLint plugin for design token enforcement

The token pipeline (`npm run tokens:build|verify`) and design linting are then available to all workspaces (`be/`, `fe/mobile/`, `fe/web/`).

### 1. Start Infrastructure

```bash
cd infra && ./start.sh
```

### 2. Start Backend

```bash
cd be
npm install
cp .env.example .env        # Edit with your database credentials if needed
npm run migration:run        # Run all migrations (creates all tables)
npm run db:seed              # Seed all data (Phase 1 + 2 + 3)
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
| korlap_bungkul | korlap | Taman Bungkul + Jalan Raya Darmo |
| satgas_pusat_1 | satgas | Active status |
| satgas_pusat_2 | satgas | Outside area status |
| linmas_bungkul_1 | linmas | Active status |

See [`be/src/database/seeds/README.md`](be/src/database/seeds/README.md) for all test users.

---

## Design Tokens Pipeline (Phase 3 M1-R Sub-Phase 3-R2)

The token system is **single-source-of-truth** across mobile native, mobile web, and desktop web.

**Source of Truth:**
- [`specs/ui-ux/tokens.json`](specs/ui-ux/tokens.json) — All design tokens (colors, shadows, typography, spacing, radius)

**Generated Consumers:**
- `fe/web/src/app/generated/tokens.css` — Tailwind v4 CSS variables
- `fe/mobile/src/constants/generated/tokens.ts` — React Native exports

**Build Pipeline:**
```bash
npm run tokens:build   # Regenerate from tokens.json
npm run tokens:verify  # Verify committed files match source (CI validation)
npm run test:tokens    # Unit tests for generator + ESLint rules
```

**Critical Rules:**
- ✅ EDIT `specs/ui-ux/tokens.json` → run `npm run tokens:build` → commit regenerated files
- ❌ NEVER hand-edit `generated/tokens.css` or `generated/tokens.ts`
- ❌ NEVER use inline hex literals in code — ESLint rule `no-inline-hex-colors` blocks PRs

This ensures both platforms always ship identical color, shadow, and typography values — no drift.

---

## Project Status

**Phase 3 IN PROGRESS** (M1-R ✅ + M2 ✅ + M3 mobile spine ✅ + M4 mobile spine 🟡, Apr 27, 2026)

| Component | Status | Metrics |
|-----------|--------|---------|
| **Backend** | M2 complete | 18 modules, ~130 endpoints, 1,264+ tests, 94.51% coverage; Phase 3 Redis infrastructure live |
| **Mobile** | M2 complete | 22 screens, 3,836 tests, 80.31%+ coverage, WCAG 2.1 AA, Neo Brutalism 2.0, M1-R token migration complete |
| **Web** | M2 complete | 21 pages, supercluster monitoring, virtualized worker list, responsive 3-column layout, installable PWA (feature-flagged) |
| **Database** | M2 complete | 30 tables, 9-role system (incl. `staff_kecamatan`), 11 migrations, 128 plant species seeded |

**Deployed:** api.sekar.wahyutrip.com + sekar.wahyutrip.com — **Phase 2E (Apr 25, 2026)** live in production.

**Phase 3 progress: 13/21 sub-phases (~62%).** M1-R + 3-1 + 3-2 + M2 (3-3/3-4/3-5) ✅ + M3 (3-6 ✅, 3-7 ✅ mobile, 3-8 🟡 light) + M4 (3-9 🟡 submit-half, 3-10 🟡 kecamatan-slice). Web work for 3-7/3-10 + admin endpoints + capacity calendar + plant-seeds inventory deferred to next iteration. **Next: M3+M4 admin finish-out + review-fixes pass.**

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
# 1. Run all database migrations (creates all 22 tables)
docker exec sekar-backend npm run migration:run:prod

# 2. Seed reference data + 1 superadmin (idempotent, safe to re-run)
docker exec sekar-backend npm run db:seed:prod

# 3. Change default admin password immediately
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

**Last Updated:** April 27, 2026
