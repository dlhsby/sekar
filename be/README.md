# SEKAR Backend API

NestJS backend for SEKAR worker tracking system. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
cd be
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials if needed

# Start infrastructure (first time)
cd ../infra && ./start.sh && cd ../be

# Run all migrations (creates all tables)
npm run migration:run

# Seed database (Phase 1 + 2 + 3)
npm run db:seed

# Start server
npm run start:dev
```

## API Access

- **API:** http://localhost:3000/api/v1
- **Swagger Docs:** http://localhost:3000/api/v1/docs
- **Health Check:** http://localhost:3000/api/v1/health

## Test Users

All passwords: `password123`

| Username | Role | Notes |
|----------|------|-------|
| admin | superadmin | Full access |
| korlap1, korlap2 | korlap | Field coordinators |
| satgas1, satgas2, satgas3 | satgas | Field workers |
| linmas1 | linmas | Security officer |
| kepala_rayon_selatan | kepala_rayon | Rayon manager |
| top_management1 | top_management | City-wide view |

## Common Commands

```bash
npm run start:dev          # Start with hot-reload
npm test                   # Run tests
npm run test:cov           # Tests with coverage (>80% required)
npm run lint               # Lint code
npm run db:seed            # Seed all data (Phase 1 + Phase 2)
npm run db:seed:reference  # Seed reference data only (idempotent, prod-safe)
```

## Seeding Database

For fresh development setup (recommended):
```bash
npm run db:seed  # Wipes all data, seeds Phase 1 (6 users) + Phase 2 (30 users, tasks, activities, monitoring)
```

For selective seeding:
```bash
npm run db:seed:phase1     # Phase 1 only (wipes + seeds base data)
npm run db:seed:phase2     # Phase 2 only (run after Phase 1)
npm run db:seed:reference  # Reference/config data only (idempotent, safe for prod)
```

For production/staging (first deploy):
```bash
npm run migration:run:prod
npm run db:seed:prod       # Reference data + 1 superadmin only
```

See [`src/database/seeds/README.md`](src/database/seeds/README.md) for full seeding documentation.

## Documentation

- **Complete Guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **API Contracts:** [`/specs/api/contracts.md`](/specs/api/contracts.md) (120 endpoints)
- **Seed Data:** [`src/database/seeds/README.md`](src/database/seeds/README.md)
- **AWS S3 Setup:** [`/specs/deployment/aws-s3-setup.md`](/specs/deployment/aws-s3-setup.md)
- **WSL2 Network:** [`/specs/deployment/wsl2-network-setup.md`](/specs/deployment/wsl2-network-setup.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Staging / Production Deployment

See [`/specs/deployment/phase-2-deployment.md`](/specs/deployment/phase-2-deployment.md) for the complete guide.

### Fresh Deploy

```bash
# On the server, after pulling the Docker image:

# 1. Run all migrations
docker exec sekar-backend npm run migration:run:prod

# 2. Create tables not covered by migrations (one-time)
#    Temporarily start with DATABASE_SYNCHRONIZE=true, then disable

# 3. Seed reference data + 1 superadmin (idempotent)
docker exec sekar-backend npm run db:seed:prod

# 4. Change default admin password immediately!
```

### Incremental Deploy

```bash
# 1. Pull new image and restart container
docker pull <ECR_URI>/sekar-backend:latest
docker-compose -f docker-compose.prod.yml up -d

# 2. Run pending migrations (only new ones execute)
docker exec sekar-backend npm run migration:run:prod

# 3. (Optional) Re-run reference seeder if new config data was added
docker exec sekar-backend npm run db:seed:prod

# Do NOT run db:seed or db:seed:phase1 — these wipe all data!
```

### Environment

- **Staging template:** `be/.env.staging.example`
- **Production template:** `be/.env.production.example`
- `DATABASE_SYNCHRONIZE` must be `false` in staging/prod (`main.ts` blocks startup otherwise)

## Environment Configuration

### Phase 3 Infrastructure

Add to `.env` for Phase 3 M2 Monitoring v2 features (Redis Streams, status projector):

```env
# Redis (Phase 3 M2+)
REDIS_URL=redis://localhost:6379
REDIS_STREAM_MAX_LEN=10000
STAFFING_DEBOUNCE_SECONDS=30
MONITORING_SWEEP_CRON=*/30 * * * *    # Every 30 minutes
CLUSTER_ZOOM_THRESHOLD=14              # Zoom level for cluster visibility
```

For development, Redis is not required until Phase 3 M2 implementation starts. Existing Phase 2E deployments continue to work without these variables.

## Current Status

- **Modules:** 18 feature modules (16 existing + plants + pruning-requests + service-capacity + plant-seeds)
- **Endpoints:** ~130 (120 Phase 2 + ~10 Phase 3 stubs)
- **Tests:** 1,264 passing, 94.51% coverage
- **Features:** JWT auth, 9-role RBAC (incl. `staff_kecamatan`), WebSocket, FCM notifications, S3 uploads, Redis Streams, real-time monitoring v2

**Production:** https://api.sekar.wahyutrip.com
