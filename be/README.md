# Backend API (NestJS 11)

**Purpose:** RESTful API for SEKAR worker tracking — GPS, task assignment, real-time monitoring, FCM notifications, S3 uploads, Redis Streams.

## Quick Start

For the full one-command setup, see [`/README.md`](/README.md) (`./scripts/setup.sh` + `./scripts/start.sh`). To work on the backend alone:

```bash
cd be
npm install
cp .env.local.example .env.local

# (Infra already running? Skip this.)
cd ../infra && ./start.sh && cd ../be

npm run migration:run
npm run db:seed              # Fresh dev data (Phase 1 + 2 + 3)
npm run start:dev            # http://localhost:3000/api/v1 · docs at /api/v1/docs
```

For **staging/production deploys**, use the authoritative guide: [`/specs/deployment/deployment-guide.md`](/specs/deployment/deployment-guide.md).

## Environment

Copy `cp .env.local.example .env.local` (plaintext, gitignored). Defaults point to local infra. Key vars:

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | API port |
| `DATABASE_*` | `localhost:5432` / `sekar_db` | PostgreSQL (auto-synced by `setup.sh`) |
| `JWT_*` | dev placeholders | Token signing — change for shared/deployed envs |
| `AWS_ENDPOINT_URL` | `http://localhost:9000` (MinIO) | S3 storage (MinIO dev, real AWS staging, MinIO prod compose) |
| `REDIS_URL` | `redis://localhost:16379` | Redis Streams (host port 16379 dev, 6379 prod) |
| `FCM_ENABLED` | `true` | Set `false` until Firebase configured |

**Env files use [dotenvx](https://dotenvx.com):** `.env.local` is plaintext + gitignored. `.env.staging` is committed encrypted and baked into the staging image. **Backend production env = `be/.env.production`** (committed encrypted, alongside `.env.staging`), which drives the root `docker-compose.prod.yml`. `.env.keys` (private key) is never committed. See [`/specs/deployment/encrypted-secrets.md`](/specs/deployment/encrypted-secrets.md) + [`/specs/deployment/credentials-setup.md`](/specs/deployment/credentials-setup.md).

## Testing & Seeding

```bash
npm test                   # Run tests
npm run test:cov           # Coverage (>80% required)
npm run db:seed            # Fresh data (dev only — wipes first)
npm run db:seed:reference  # Config data only (idempotent, prod-safe)
npm run db:seed:prod       # First prod/staging boot (superadmin + reference)
```

Full seeding guide: [`src/database/seeds/README.md`](src/database/seeds/README.md). **Never** run `db:seed` or `db:seed:phase1` in staging/prod — they wipe all data. Staging/production deploys use `:prod` scripts only.

Test users (all `password123`): `admin` (superadmin), `satgas1`/`satgas2` (field workers), `korlap1` (coordinator), `linmas1` (security), `kepala_rayon_selatan` (rayon manager), `top_management1` (city view), `staff_kecamatan1` (external). Phone login works: `081200000006`. See [`src/database/seeds/README.md`](src/database/seeds/README.md).

## API & Monitoring

- **API:** http://localhost:3000/api/v1
- **Swagger Docs:** http://localhost:3000/api/v1/docs
- **Health:** http://localhost:3000/api/v1/health/live (`{version, gitSha, builtAt}`)
- **~218 endpoints across 33 modules**; full contract in Swagger (`/api/v1/docs`); see also [`/specs/api/contracts.md`](/specs/api/contracts.md)
- **Real-time monitoring v2** via Redis Streams + WebSocket; tunables: `REDIS_STREAM_MAX_LEN`, `STAFFING_DEBOUNCE_SECONDS`, `MONITORING_SWEEP_CRON`, `CLUSTER_ZOOM_THRESHOLD`

## Docs & Specs

- **Root guide (conventions, running all services):** [`/README.md`](/README.md)
- **Full contributor guide:** [`/CLAUDE.md`](/CLAUDE.md)
- **Deploy (start-to-finish, staging → prod, CI/CD, rollback):** [`/specs/deployment/deployment-guide.md`](/specs/deployment/deployment-guide.md)
- **API contracts:** [`/specs/api/contracts.md`](/specs/api/contracts.md)
- **Seeding reference data:** [`src/database/seeds/README.md`](src/database/seeds/README.md)
- **All specs:** [`/specs/README.md`](/specs/README.md)
