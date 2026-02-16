# SEKAR Backend API

NestJS backend for SEKAR worker tracking system. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
cd be
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Start infrastructure (first time)
cd ../infra && ./start.sh && cd ../be

# Seed database (first time)
npm run seed

# Start server
npm run start:dev
```

## API Access

- **API:** http://localhost:3000/api
- **Swagger Docs:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/api/health

## Test Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Superadmin |
| korlap1, korlap2 | korlap123 | Korlap |
| satgas1, satgas2, satgas3 | satgas123 | Satgas |

## Common Commands

```bash
npm run start:dev       # Start with hot-reload
npm test                # Run tests
npm run test:cov        # Tests with coverage
npm run lint            # Lint code
npm run seed            # Seed all data (Phase 1 + Phase 2 + Tasks)
```

## Seeding Database

For fresh development setup (recommended):
```bash
npm run seed  # Seeds Phase 1 + Phase 2 + Tasks
```

For selective seeding (testing):
```bash
npm run seed:phase1  # Phase 1 only (users, areas)
npm run seed:phase2  # Phase 2 only (rayons, activities)
npm run seed:tasks   # Tasks only (clears tasks table)
```

⚠️ **Warning:** Seeders clear existing data. Never run on production!

## Documentation

- **Complete Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **API Contracts:** [`/specs/api/contracts.md`](/specs/api/contracts.md) (all 83 endpoints)
- **AWS S3 Setup:** [`/specs/deployment/aws-s3-setup.md`](/specs/deployment/aws-s3-setup.md)
- **WSL2 Network:** [`/specs/deployment/wsl2-network-setup.md`](/specs/deployment/wsl2-network-setup.md)
- **Backend Specs:** [`/specs/phases/phase-2-enhanced/backend.md`](/specs/phases/phase-2-enhanced/backend.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Current Status

- **Modules:** 15 feature modules
- **Endpoints:** 83 (40 Phase 1 + 43 Phase 2)
- **Tests:** 845 passing
- **Coverage:** 90.77%
- **Features:** JWT auth, role-based access, WebSocket, FCM notifications, S3 uploads
# Backend deployment successful - Mon Feb 10 11:17:00 +07 2026
# Production URL: http://api.sekar.wahyutrip.com
# Health Check: http://api.sekar.wahyutrip.com/api/v1/health
# API Docs: http://api.sekar.wahyutrip.com/api/v1/docs
