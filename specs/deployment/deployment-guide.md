# SEKAR — Deployment Guide (start to finish)

**The single authoritative guide for running and deploying SEKAR across every environment.**
It walks the four scenarios end-to-end — **run locally → obtain keys → deploy to staging → deploy to production** — and links to focused deep-dive guides for exhaustive detail. The per-phase deployment records (`phase-1`…`phase-5-deployment.md`) remain as historical/review notes.

## Scenarios & where to look

| You want to… | Start here |
|--------------|-----------|
| Run the whole stack on your machine | **§A Run locally** → [`local-development.md`](local-development.md) |
| Get Firebase / Maps / Mapbox / AWS keys | **§B Obtaining keys** → [`credentials-setup.md`](credentials-setup.md) |
| Understand every env var | **§C Environment variables** → [`environment-variables.md`](environment-variables.md) |
| Ship to a staging server | **§D Deploy to staging** |
| Ship to production | **§E Deploy to production** |
| Automate it | **§F CI/CD** → [`ci-cd.md`](ci-cd.md) |
| Operate it (migrate, back up, roll back, debug) | **§G Operations** → [`operations.md`](operations.md) |
| Watch it (dashboards, alarms) | **§H Monitoring** → [`monitoring.md`](monitoring.md) |
| Release the mobile apps | **§I Mobile releases** → [`android-release-guide.md`](android-release-guide.md) · [`ios-release-guide.md`](ios-release-guide.md) |
| Run it on managed AWS | **Appendix A** → [`infrastructure.md`](infrastructure.md) |

## Deployment targets (same application images)

1. **Production → on-prem (pemkot) server** — Docker Compose, **platform-agnostic** (Windows
   Server *or* Linux). One host runs everything: PostgreSQL + Redis + MinIO + backend + web +
   reverse proxy. No cloud bill. → **§E** (`docker-compose.prod.yml`).
2. **Staging / UAT → AWS** — co-tenant with KPI on a shared `t3.micro`: backend + web + Redis
   containers behind the existing Caddy, AWS RDS (`sekar_staging`), AWS S3 (instance role),
   secrets in SSM Parameter Store. → **§D** (`infra/compose.staging.yml`).
3. *(Reference)* fuller managed-cloud layout (ECS/ElastiCache/CloudFront) → **Appendix A**.

## Environment model at a glance

| | **Local dev** | **Staging (AWS)** | **Production (on-prem)** |
|--|--------------|-------------|----------------|
| Where | laptop | shared AWS EC2 (co-tenant) | pemkot server (Win/Linux) |
| Compose file | `infra/` dev | `infra/compose.staging.yml` | `docker-compose.prod.yml` |
| Env file | `.env.local` (per workspace) | `/opt/sekar/.env` (from SSM) | `.env.production` (root) |
| Object storage | **MinIO** (in `infra/`) | **AWS S3** (instance role) | **MinIO** (in `docker-compose.prod.yml`) |
| Database | local Docker Postgres | **shared RDS** → `sekar_staging` | compose Postgres |
| Redis | Docker | **in-stack container** | in-stack container |
| Seeder | `db:seed` (destructive) | `db:seed:staging:prod` | `db:seed:production:prod` (non-destructive) |
| TLS | none (http) | **none yet (http)** — Caddy ready | Let's Encrypt / internal cert |
| FCM | usually off | off (until configured) | on (prod project) |
| Secrets | `.env.local` | **SSM Parameter Store** | `.env.production` (chmod 600) |

---

## 0. Architecture at a glance

```
                          ┌───────────────────────── Linux host (Docker) ─────────────────────────┐
   Browser / Mobile  ──►  │  Nginx :80/:443 (TLS)                                                   │
                          │     ├─ /            → web    (Next.js standalone :3000)                 │
                          │     ├─ /api/        → backend (NestJS :3000)                            │
                          │     └─ /socket.io/  → backend (WebSocket, upgrade)                      │
                          │  backend ─► postgres:5432   redis:6379   minio:9000 (media bucket)      │
                          └────────────────────────────────────────────────────────────────────────┘
```

All inter-service traffic stays on the private compose network `sekar-prod`; only Nginx publishes ports (80/443). Compose file: [`docker-compose.prod.yml`](../../docker-compose.prod.yml). Reverse proxy: [`infra/nginx.conf`](../../infra/nginx.conf).

---

## A. Run locally

The fastest path, from the repo root:

```bash
./scripts/setup.sh          # creates .env.local files, installs all workspaces, starts infra, runs migrations (+ optional seed)
./scripts/start.sh          # backend + web in background, Metro in foreground (--no-mobile to skip)
./scripts/stop.sh           # stop services (--infra to also stop Docker)
```

This brings up local infra (PostgreSQL :5432, Adminer :8080, MinIO S3 :9000 + console :9001, Redis :16379) and runs the backend (`http://localhost:3000`, API docs `/api/v1/docs`) and web (`http://localhost:3001`). Test users use `password123` (e.g. `admin/password123`, `satgas1/password123`).

**Two values you must fill** after `setup.sh`: `NEXT_PUBLIC_MAPBOX_TOKEN` in `fe/web/.env.local` and `API_BASE_URL` in `fe/mobile/.env.local` (see §B). Everything else defaults to local infra.

→ **Full detail** — infra services, per-workspace run, local MinIO media, WSL2 device networking, and local troubleshooting: **[`local-development.md`](local-development.md)**.

---

## B. Obtaining keys & credentials

| Credential | Where to get it | Lands in (gitignored) | Needed for |
|-----------|-----------------|-----------------------|-----------|
| **Mapbox token** | account.mapbox.com/access-tokens | `fe/web/.env.local` `NEXT_PUBLIC_MAPBOX_TOKEN` | Web maps (blank without it) |
| **Google Maps key** | Google Cloud Console (Maps SDK) | `fe/mobile/.env.local` `GOOGLE_MAPS_API_KEY` | Mobile native maps |
| **Firebase service account** | Firebase Console → Service accounts | `be/config/firebase-service-account.json` + `FCM_ENABLED=true` | Backend push sends |
| **Android FCM** | Firebase → Add Android app `com.sekarapp` | `fe/mobile/android/app/google-services.json` | Android push |
| **iOS FCM + APNs** | Firebase → Add iOS app + Apple Developer APNs key | `fe/mobile/ios/GoogleService-Info.plist` (+ APNs) | iOS push (needs Mac) |
| **AWS S3 + IAM** | AWS Console (staging/prod media) | `.env.staging` / `.env.production` `AWS_*` | Media storage (dev/prod use MinIO) |

→ **Step-by-step for every credential**, including the dev/staging/prod variance and the **security flag on the committed Maps key** (`fe/mobile/android/app/src/main/AndroidManifest.xml:49`): **[`credentials-setup.md`](credentials-setup.md)**.

---

## C. Environment variables

All three workspaces share one scheme: **`.env.local`** = local dev (the runtime file), **`.env.staging`** / **`.env.production`** = deploys. Committed templates are `*.example`. Loaders: backend `be/src/config/load-env.ts` (picks `.env.local` in dev, `.env.<NODE_ENV>` for deploys); web is Next.js-native; mobile is `react-native-dotenv`.

> **Build-time vs run-time:** `NEXT_PUBLIC_*` are compiled into the browser bundle when the `web` image builds — they must be the **public** URLs (through Nginx), not internal service names. Backend `DATABASE_HOST`/`REDIS_URL`/`AWS_ENDPOINT_URL` are overridden to the compose service names inside `docker-compose.prod.yml`, so you don't set those to localhost in deploys.

→ **Full catalogue** of every variable per workspace and environment: **[`environment-variables.md`](environment-variables.md)**.

---

## D. Deploy to staging (AWS — co-tenant)

Staging/UAT runs on **AWS**, co-tenant with the KPI project on one shared `t3.micro`
(account `659828096624`, region `ap-southeast-3`, CLI profile `sekar`). It does **not** use
the self-hosted `docker-compose.prod.yml` — that's the on-prem **production** stack (§E).
Authoritative deltas live in [ADR-028 addendum](../architecture/decisions/ADR-028-staging-environment.md).

**Live URLs (plain HTTP — no TLS yet):** API `http://api.sekar.wahyutrip.com` · web `http://sekar.wahyutrip.com`.

### Topology
- **Edge/TLS:** reuse KPI's **Caddy** on 80/443 via a shared external Docker network `edge`;
  SEKAR's two site blocks live in [`infra/Caddyfile.staging`](../../infra/Caddyfile.staging)
  (merged into the box Caddyfile). `http://` prefix disables auto-HTTPS for now.
- **Apps:** `backend` + `web` (ECR images) + a small `redis` container —
  [`infra/compose.staging.yml`](../../infra/compose.staging.yml), per-container memory limits.
- **DB:** `sekar_staging` database + `sekar` role on the **shared** RDS `kobin-kpi-db` (`DATABASE_SSL=true`).
- **Media:** S3 `sekar-media-staging` via the **EC2 instance role** — no static AWS keys on the host.
- **Secrets:** SSM Parameter Store SecureString `/sekar/staging/*` → materialized to
  `/opt/sekar/.env` by [`infra/seed-env-from-ssm.sh`](../../infra/seed-env-from-ssm.sh).
- **No SSH:** all box operations go through **SSM Run Command**.

### Routine deploys — GitHub Actions (preferred)
Push to `main` (or run the workflow manually) triggers
[`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml):
OIDC → build+push both images (`:staging` + `:<sha>`) → pre-deploy RDS snapshot → migrate
(SSM `migration:run:prod`) → `docker compose up -d --wait` pinned to the SHA → smoke test.
**Rollback:** re-run the workflow (`workflow_dispatch`) — or re-deploy a prior `:<sha>` tag.

Required GitHub **Variables**: `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_BACKEND`, `ECR_WEB`,
`EC2_INSTANCE_ID`, `RDS_INSTANCE_ID`. Required **Secret**: `NEXT_PUBLIC_MAPBOX_TOKEN` (baked
into the web bundle at build).

### First-time / manual deploy (mirrors what CI does)
```bash
# 1. Build + push images (web bakes NEXT_PUBLIC_* at build time)
aws ecr get-login-password --profile sekar --region ap-southeast-3 \
  | docker login --username AWS --password-stdin 659828096624.dkr.ecr.ap-southeast-3.amazonaws.com
docker buildx build --platform linux/amd64 -f be/Dockerfile \
  -t .../sekar-backend:staging --push be
docker buildx build --platform linux/amd64 -f fe/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://api.sekar.wahyutrip.com \
  --build-arg NEXT_PUBLIC_WS_URL=ws://api.sekar.wahyutrip.com \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.* \
  -t .../sekar-web:staging --push fe/web

# 2. On the box (via SSM, as ec2-user): seed env, ensure edge net, pull, up
bash ~/sekar/infra/seed-env-from-ssm.sh
docker network create edge 2>/dev/null; docker network connect edge kobin-kpi-caddy 2>/dev/null
cd ~/sekar/infra && IMAGE_TAG=staging docker compose -f compose.staging.yml up -d --wait

# 3. First boot only: migrate + seed (compiled scripts; prod image has no ts-node)
docker compose -f compose.staging.yml run --rm --no-deps backend npm run migration:run:prod
docker compose -f compose.staging.yml run --rm --no-deps backend npm run db:seed:staging:prod
```
> `db:seed:staging:prod` is the staging dataset (idempotent, all passwords `password123`).
> **Never** run it on production. Migrations run every deploy; the seed is first-boot only.

### Smoke test
```bash
curl -sf http://api.sekar.wahyutrip.com/api/v1/health/ready   # {db,redis} ok
curl -sI http://sekar.wahyutrip.com/login                      # 200
```
Then log in (`superadmin/password123`) and confirm the monitoring map renders (Mapbox +
WebSocket + S3 media path). **Enabling TLS later:** drop the `http://` prefix in
`infra/Caddyfile.staging`, switch the web build args + `CORS_ORIGIN` to `https`/`wss`, and
flip `NEXT_PUBLIC_SECURE_COOKIES`/`NEXT_PUBLIC_FEATURE_PWA` back on.

---

## E. Deploy to production (self-hosted)

### E.1 Prerequisites

**Host:** Ubuntu 22.04/24.04 LTS (or any Docker-capable Linux), 2 vCPU / 4 GB RAM minimum (4 vCPU / 8 GB recommended with all services co-located), 30 GB+ disk.

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
docker --version && docker compose version
sudo apt-get update && sudo apt-get install -y git
```

**DNS:** point an A record at the host's public IP, e.g. `sekar.example.com → 203.0.113.10`. (Both the dashboard and the API are served from this one hostname; the API lives under `/api`.)

**Firewall:** allow inbound 22 (SSH), 80, 443 only.
```bash
sudo ufw allow 22,80,443/tcp && sudo ufw enable
```

### E.2 Get the code

```bash
git clone <repo-url> sekar && cd sekar && git checkout main
```
No host `npm install` — the Docker images build their own dependencies.

### E.3 Configure environment

Everything is driven by one root file, `.env.production` (gitignored):
```bash
cp .env.production.example .env.production
```
Set **every** `<...>` placeholder. Minimum to change:

| Variable | What to set |
|----------|-------------|
| `DATABASE_PASSWORD` | A strong DB password |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Two **different** strong secrets — `openssl rand -base64 32` each |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | MinIO root credentials (any strong values for the in-stack MinIO) |
| `AWS_S3_BUCKET` | Media bucket name (e.g. `sekar-media`) |
| `CORS_ORIGIN` | `https://sekar.example.com` |
| `NEXT_PUBLIC_API_URL` | `https://sekar.example.com` (baked into the web build) |
| `NEXT_PUBLIC_WS_URL` | `wss://sekar.example.com` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox token (maps fail to render without it) |
| `FCM_ENABLED` | `false` until Firebase is set up (§B / [`credentials-setup.md`](credentials-setup.md)) |

### E.4 TLS certificates

Nginx expects `infra/certs/fullchain.pem` + `infra/certs/privkey.pem` (gitignored).

**Let's Encrypt (recommended)** — get the cert with the stack down (port 80 free), then start the stack:
```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d sekar.example.com
mkdir -p infra/certs
sudo cp /etc/letsencrypt/live/sekar.example.com/fullchain.pem infra/certs/
sudo cp /etc/letsencrypt/live/sekar.example.com/privkey.pem  infra/certs/
sudo chown "$USER" infra/certs/*.pem
```
Renewal: re-copy after `certbot renew` (the `certbot-webroot` volume + the Nginx `/.well-known/acme-challenge/` location support webroot renewal without downtime). Edit `server_name` in `infra/nginx.conf` to your domain.

### E.5 Build & start the stack

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps      # all services healthy?
```
First boot order is handled by healthcheck `depends_on`: postgres + redis + minio come up, `minio-init` creates the media bucket and exits, then backend, then web, then nginx.

### E.6 Database migrations & seed

The backend never auto-syncs or auto-migrates in production (`DATABASE_SYNCHRONIZE=false`, `DATABASE_MIGRATIONS_RUN=false`). Run migrations explicitly once the backend container is up:
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run migration:run:prod
```
> **Use the `:prod` script, not `migration:run`.** The production image is `npm prune --production`d, so `ts-node`/`tsconfig-paths` are absent — the plain `migration:run` will fail. The `:prod` variants run the **compiled** `dist/src/database/...` via the TypeORM CLI. On a brand-new DB the backend logs a few harmless "relation … does not exist" cron warnings until this step completes — restart the backend afterwards for a clean log.

**First-run reference data** (rayons, shift definitions, kecamatans, admin users — non-destructive):
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec \
  -e PROD_ADMIN_PASSWORD=... -e PROD_SUPERADMIN_PASSWORD=... -e PROD_ADMIN_SYSTEM_PASSWORD=... \
  backend npm run db:seed:production:prod
```
> `db:seed:production:prod` is the safe, non-destructive seeder (reads admin passwords from env, fails loudly if unset). **Never** run `npm run db:seed` in production — that one wipes the database.

### E.7 Smoke test

```bash
curl -sf https://sekar.example.com/api/v1/health/live       # {"status":"ok",...}
curl -sf https://sekar.example.com/api/v1/health/ready       # DB + Redis reachable
curl -sI https://sekar.example.com/login                     # 200 (dashboard)
```
Then log in to the dashboard and confirm the monitoring map renders (validates the Mapbox token + WebSocket through Nginx).

### E.8 Push notifications (FCM) — optional

1. Create a Firebase project, generate a service-account key.
2. Mount it into the backend and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it, **or** set the inline `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` trio in `.env.production`.
3. Set `FCM_ENABLED=true` and restart the backend.

Full detail: [`credentials-setup.md`](credentials-setup.md) §Firebase. iOS APNs relay: [`ios-release-guide.md`](ios-release-guide.md).

---

## F. CI/CD

**Staging (AWS)** is automated by [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml):
on push to `main` (or `workflow_dispatch`) it uses GitHub **OIDC** (no stored AWS keys) →
first runs the **`quality-be` + `quality-web`** test gates (lint/tsc/test), then uses GitHub
**OIDC** (no stored AWS keys) → builds + pushes backend/web images to ECR (`:staging` + `:<sha>`)
→ pre-deploy RDS snapshot → migrate + `up -d --wait` on the box via **SSM** → smoke test. Gated by
the GitHub `staging` environment (add required reviewers to make it a manual gate). PRs are gated by
`backend-quality` / `web-quality` / `mobile-quality`. The old Elastic-Beanstalk / SSH workflows have
been **deleted**. Full inventory + monorepo release strategy → **[`ci-cd.md`](ci-cd.md)**.

---

## G. Operations (day-2)

Migrations, seeding variants, **backup & restore**, **rollback**, health checks, connection-pool tuning, and incident runbooks (SSH key rotation, phantom-migration recovery, Firebase env loading, pool exhaustion). → **[`operations.md`](operations.md)**.

Quick reference:
```bash
# Nightly DB backup
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$DATABASE_USER" "$DATABASE_NAME" | gzip > backup-$(date +%F).sql.gz
# Update to a new release
git pull && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run migration:run:prod
# Logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```
**RTO/RPO:** nightly `pg_dump` → RPO ≤ 24h; redeploy + restore → RTO ≈ 30 min. For tighter RPO use streaming replication or a managed DB with PITR (Appendix A).

---

## H. Monitoring

Dashboards (system / application / business KPIs), CloudWatch alarms, structured-log queries. → **[`monitoring.md`](monitoring.md)**.

---

## I. Mobile releases

- **Android:** [`android-release-guide.md`](android-release-guide.md). Preferred: the **`mobile-release.yml`** CI workflow (manual dispatch → signed APK + AAB artifact) — `gh workflow run "Mobile Release (Android · staging)" --ref main -f environment=staging`. Per-env config (API URL, Maps key, `google-services.json`) is resolved automatically via dotenvx. Local equivalents: `npm run build:release:staging` / `build:android:production`.
- **iOS (needs a Mac):** [`ios-release-guide.md`](ios-release-guide.md) — full Xcode / capabilities / APNs / TestFlight / App Store runbook (and what's already prepared in the repo vs. deferred to a Mac).

---

## Troubleshooting (top issues)

| Symptom | Likely cause / fix |
|---------|--------------------|
| `backend` container restarts / unhealthy | `docker compose ... logs backend`. Common: wrong DB creds, or migrations not yet run. Health probe is `/api/v1/health/live`. |
| Migrations fail with auth error | `.env.*` `DATABASE_*` must match the postgres service (compose wires `DATABASE_HOST=postgres`). |
| Web shows but API calls fail / CORS | `CORS_ORIGIN` must equal the public origin; `NEXT_PUBLIC_API_URL` must be the public URL (rebuild `web` after changing — it's a build arg). |
| Map blank | `NEXT_PUBLIC_MAPBOX_TOKEN` missing/invalid (rebuild `web`). |
| Real-time monitoring not updating | WebSocket blocked — confirm Nginx `/socket.io/` upgrade block and that `wss://` is used. |
| Media upload 413 | Raise `client_max_body_size` in `infra/nginx.conf` (default 60M). |
| Port 80/443 in use | Stop the conflicting service or change the Nginx port mapping. |

Deeper diagnosis and incident procedures: [`operations.md`](operations.md).

---

## Appendix A — AWS (managed services)

Use the same images, but replace the in-stack data services with managed ones:

| In-stack service | AWS replacement | How |
|------------------|-----------------|-----|
| `postgres` | **RDS for PostgreSQL** | Remove the `postgres` service; set `DATABASE_HOST`/`DATABASE_PORT`/creds to the RDS endpoint, `DATABASE_SSL=true`. |
| `redis` | **ElastiCache for Redis** | Remove the `redis` service; set `REDIS_URL=redis://<elasticache-endpoint>:6379`. |
| `minio` + `minio-init` | **S3 + CloudFront** | Remove both; set real `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_S3_BUCKET` and **delete** the `AWS_ENDPOINT_URL`/`AWS_S3_FORCE_PATH_STYLE` overrides. See [`credentials-setup.md`](credentials-setup.md) §AWS S3. |
| `nginx` (self-managed TLS) | **ALB + ACM** (optional) | Terminate TLS at an ALB; or keep Nginx on EC2. |
| host VM | **EC2** (`t3.small`+) or **ECS Fargate** | EC2: run the trimmed compose file. ECS: push images to ECR and define a task per service. |

Rough monthly cost (ap-southeast, small): EC2 t3.small ~$15 + RDS db.t3.micro ~$15 + ElastiCache t3.micro ~$12 + S3/CloudFront ~$1–5. Full AWS spec (VPC, security groups, IAM, CloudWatch, DR, cost): **[`infrastructure.md`](infrastructure.md)**.

---

## Reference

- Run locally: [`local-development.md`](local-development.md) · root `CLAUDE.md` Quick Start
- Obtain keys: [`credentials-setup.md`](credentials-setup.md)
- Env var catalogue: [`environment-variables.md`](environment-variables.md)
- Operations / monitoring / CI-CD: [`operations.md`](operations.md) · [`monitoring.md`](monitoring.md) · [`ci-cd.md`](ci-cd.md)
- Mobile release: [`android-release-guide.md`](android-release-guide.md) · [`ios-release-guide.md`](ios-release-guide.md)
- AWS deep-dive: [`infrastructure.md`](infrastructure.md)
- Security & dependency audit: [`../architecture/security.md`](../architecture/security.md)
- Per-phase deploy records: `phase-1`…`phase-5-deployment.md`
