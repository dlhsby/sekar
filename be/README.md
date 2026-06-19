# SEKAR Backend API

NestJS backend for SEKAR worker tracking system. See [`/CLAUDE.md`](/CLAUDE.md) for complete documentation.

## Quick Start

```bash
cd be
npm install

# Setup environment (defaults target local infra; edit only if your creds differ)
cp .env.local.example .env.local

# Start infrastructure (first time)
cd ../infra && ./start.sh && cd ../be

# Run all migrations (creates all tables)
npm run migration:run

# Seed database (Phase 1 + 2 + 3)
npm run db:seed

# Start server
npm run start:dev
```

## Environment Essentials

Copy `cp .env.local.example .env.local` — gitignored, the runtime file. Defaults
work against local infra (`infra/.env`); the values you may need to touch:

| Var(s) | Default | Purpose |
|--------|---------|---------|
| `PORT` | `3000` | API port (override to avoid collisions) |
| `DATABASE_*` | `localhost:5432`, `postgres/postgres`, `sekar_db` | Postgres — `setup.sh` syncs `DATABASE_PORT` to `infra/.env` `POSTGRES_PORT` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders (≥32 chars) | Token signing — change for any shared/deployed env |
| `AWS_*` + `AWS_ENDPOINT_URL` | MinIO `http://localhost:9000`, `minioadmin`, bucket `sekar-media-dev` | S3 media (dev = MinIO; staging = real AWS S3; prod = MinIO in compose) |
| `REDIS_URL` | `redis://localhost:16379` | Redis Streams / BullMQ (dev host port 16379, not 6379) |
| `FCM_ENABLED` | `true` | Set `false` until Firebase creds (`FIREBASE_SERVICE_ACCOUNT_PATH`) are configured |

**Env files use [dotenvx](https://dotenvx.com).** `.env.local` (dev) is plaintext + gitignored.
`be/.env.staging` is committed **encrypted** (`encrypted:…` ciphertext) and baked into the
staging image; `load-env.ts` decrypts it at boot with `DOTENV_PRIVATE_KEY_STAGING`. The only
real secret is `.env.keys` (**never committed**). **Backend _production_ env is the repo-root
`./.env.production`** (drives `docker-compose.prod.yml`), not a `be/` file. Templates `*.example`
are committed. Guide: [`/specs/deployment/encrypted-secrets.md`](/specs/deployment/encrypted-secrets.md);
keys/credentials: [`/specs/deployment/credentials-setup.md`](/specs/deployment/credentials-setup.md).

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
- **Obtaining keys (S3/Firebase/Maps):** [`/specs/deployment/credentials-setup.md`](/specs/deployment/credentials-setup.md)
- **Run locally / WSL2 device net:** [`/specs/deployment/local-development.md`](/specs/deployment/local-development.md)
- **All Specs:** [`/specs/README.md`](/specs/README.md)

## Staging / Production Deployment

The complete, from-scratch deploy procedure (local → staging → production, CI/CD, operations)
lives in **[`/specs/deployment/deployment-guide.md`](/specs/deployment/deployment-guide.md)** —
this README does not duplicate it. Backend-specific notes:

- **Staging (AWS)** auto-deploys on every green push to `main` (GitHub OIDC → ECR → SSM). The
  encrypted `be/.env.staging` is baked into the image and decrypted at boot by `load-env.ts`.
- **Production (on-prem)** is driven by the **repo-root `./.env.production`** (encrypted), not a
  `be/` file — it feeds `docker-compose.prod.yml`.
- Migrations run every deploy; seeders run **first boot only**. Use the **`:prod`** scripts
  (`migration:run:prod`, `db:seed:staging:prod` / `db:seed:production:prod`) — the production
  image is `npm prune`d, so plain `migration:run` (needs `ts-node`) fails. **Never** run
  `db:seed` / `db:seed:phase1` in staging/prod — they wipe all data.
- `DATABASE_SYNCHRONIZE` must be `false` in staging/prod (`main.ts` blocks startup otherwise).
- Env model (dotenvx, encrypted): [`/specs/deployment/encrypted-secrets.md`](/specs/deployment/encrypted-secrets.md).

## Monitoring v2 / Redis Streams (live)

Real-time monitoring v2 (Redis Streams + status projector) is live and requires Redis. Local
infra exposes Redis on host port **16379** (set in `infra/.env` to avoid colliding with a
system-wide Redis); production uses standard 6379. Tunables: `REDIS_STREAM_MAX_LEN`,
`STAFFING_DEBOUNCE_SECONDS`, `MONITORING_SWEEP_CRON`, `CLUSTER_ZOOM_THRESHOLD`. Full catalogue:
[`/specs/deployment/environment-variables.md`](/specs/deployment/environment-variables.md).

## Current Status

- **Modules:** 18 feature modules (16 existing + plants + pruning-requests + service-capacity + plant-seeds)
- **Endpoints:** ~130 (120 Phase 2 + ~10 Phase 3 stubs)
- **Tests:** 1,264 passing, 94.51% coverage
- **Features:** JWT auth, 9-role RBAC (incl. `staff_kecamatan`), WebSocket, FCM notifications, S3 uploads, Redis Streams, real-time monitoring v2

**Staging (AWS, UAT):** http://api.sekar.wahyutrip.com · Production (on-prem) not yet deployed.
