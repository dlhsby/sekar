# SEKAR — Deployment Guide (start to finish)

**The single authoritative guide for deploying SEKAR to a fresh environment.**
Supersedes the per-phase deployment notes (`phase-1`…`phase-6-deployment.md`), which remain as historical record.

Two supported topologies, same application images:

1. **Self-hosted (default, cheapest)** — one Linux host runs everything via Docker Compose: PostgreSQL + Redis + MinIO (S3-compatible) + backend + web + Nginx (TLS). No cloud bill beyond the VM. → follow §1–§9.
2. **Managed cloud (AWS)** — EC2 (or ECS) for the app, RDS for Postgres, ElastiCache for Redis, real S3 + CloudFront for media. → follow §1–§9 with the substitutions in **Appendix A**.

The mobile app (Android/iOS) is released separately — see §10.

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

## 1. Prerequisites

**Host:** Ubuntu 22.04/24.04 LTS (or any Docker-capable Linux), 2 vCPU / 4 GB RAM minimum (4 vCPU / 8 GB recommended with all services co-located), 30 GB+ disk.

**Software on the host:**
```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out/in afterwards
docker --version && docker compose version

# git (to fetch the repo)
sudo apt-get update && sudo apt-get install -y git
```

**DNS:** point an A record at the host's public IP, e.g. `sekar.example.com → 203.0.113.10`. (Both the dashboard and the API are served from this one hostname; the API lives under `/api`.)

**Firewall:** allow inbound 22 (SSH), 80, 443 only.
```bash
sudo ufw allow 22,80,443/tcp && sudo ufw enable
```

---

## 2. Get the code

```bash
git clone <repo-url> sekar && cd sekar
git checkout main
```

No `npm install` is needed on the host — the Docker images build their own dependencies.

---

## 3. Configure environment

Everything is driven by one root file, `.env.production` (gitignored):

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and set **every** `<...>` placeholder. Minimum to change:

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
| `FCM_ENABLED` | `false` until Firebase is set up (see §8) |

> **Build-time vs run-time:** `NEXT_PUBLIC_*` are compiled into the browser bundle when the `web` image builds — they must be the **public** URLs (through Nginx), not internal service names. Backend `DATABASE_HOST`/`REDIS_URL`/`AWS_ENDPOINT_URL` are overridden to the compose service names inside `docker-compose.prod.yml`, so you don't set those to localhost.

---

## 4. TLS certificates

Nginx expects `infra/certs/fullchain.pem` + `infra/certs/privkey.pem` (gitignored).

**Let's Encrypt (recommended).** Easiest first-issue approach — get the cert with the stack down (port 80 free), then start the stack:
```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d sekar.example.com
mkdir -p infra/certs
sudo cp /etc/letsencrypt/live/sekar.example.com/fullchain.pem infra/certs/
sudo cp /etc/letsencrypt/live/sekar.example.com/privkey.pem  infra/certs/
sudo chown "$USER" infra/certs/*.pem
```
Renewal: re-copy after `certbot renew` (the `certbot-webroot` volume + the Nginx `/.well-known/acme-challenge/` location support webroot renewal without downtime). Edit `server_name` in `infra/nginx.conf` to your domain.

**Self-signed (staging/testing only):**
```bash
mkdir -p infra/certs
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout infra/certs/privkey.pem -out infra/certs/fullchain.pem \
  -subj "/CN=sekar.example.com"
```

---

## 5. Build & start the stack

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps      # all services healthy?
```

First boot order is handled by healthcheck `depends_on`: postgres + redis + minio come up, `minio-init` creates the media bucket and exits, then backend, then web, then nginx.

---

## 6. Database migrations & seed

The backend never auto-syncs or auto-migrates in production (`DATABASE_SYNCHRONIZE=false`, `DATABASE_MIGRATIONS_RUN=false`). Run migrations explicitly **once the backend container is up**:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run migration:run:prod
```

> **Use the `:prod` script, not `migration:run`.** The production image is `npm prune --production`d, so `ts-node`/`tsconfig-paths` are absent — the plain `migration:run` (which runs the TypeScript source via ts-node) will fail. The `:prod` variants run the **compiled** `dist/src/database/...` via the TypeORM CLI (a runtime dependency). On a brand-new DB the backend logs a few harmless "relation … does not exist" cron warnings until this step completes — restart the backend afterwards (`... restart backend`) for a clean log.

**First-run reference data** (rayons, shift definitions, kecamatans, admin users — non-destructive):
```bash
# The seeder refuses to run unless every PROD_*_PASSWORD is set (min 12 chars):
docker compose --env-file .env.production -f docker-compose.prod.yml exec \
  -e PROD_ADMIN_PASSWORD=... -e PROD_SUPERADMIN_PASSWORD=... -e PROD_ADMIN_SYSTEM_PASSWORD=... \
  backend npm run db:seed:production:prod
```
> `db:seed:production:prod` is the safe, non-destructive seeder (compiled-JS variant) and reads admin passwords from env (fails loudly if unset). **Never** run `npm run db:seed` in production — that one wipes the database.

---

## 7. Smoke test

```bash
# From the host:
curl -sf https://sekar.example.com/api/v1/health/live      # {"status":"ok",...}
curl -sf https://sekar.example.com/api/v1/health/ready      # DB + Redis reachable
curl -sI https://sekar.example.com/login                    # 200 (dashboard)
```
Then log in to the dashboard at `https://sekar.example.com` and confirm the monitoring map renders (validates the Mapbox token + WebSocket through Nginx).

---

## 8. Push notifications (FCM) — optional

1. Create a Firebase project, generate a service-account key (Project Settings → Service Accounts).
2. Mount it into the backend and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it, **or** set the inline `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` trio in `.env.production`.
3. Set `FCM_ENABLED=true` and restart the backend.

Full detail: [`firebase-fcm-setup.md`](firebase-fcm-setup.md). iOS APNs relay: see the iOS runbook (§10).

---

## 9. Backup, restore & operations

**Database backup (nightly cron on the host):**
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$DATABASE_USER" "$DATABASE_NAME" | gzip > backup-$(date +%F).sql.gz
```
**Restore:**
```bash
gunzip -c backup-YYYY-MM-DD.sql.gz | \
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres psql -U "$DATABASE_USER" "$DATABASE_NAME"
```
**Media backup:** snapshot the `minio-data` volume (or use bucket replication on real S3).

**Update to a new release:**
```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend npm run migration:run
```
**Logs:** `docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend` (also see [`monitoring.md`](monitoring.md), [`PRODUCTION_OPERATIONS.md`](PRODUCTION_OPERATIONS.md)).

**RTO/RPO target:** nightly `pg_dump` → RPO ≤ 24h; redeploy + restore → RTO ≈ 30 min. For tighter RPO use streaming replication or a managed DB with PITR (Appendix A).

---

## 10. Mobile releases

- **Android:** follow [`android-release-guide.md`](android-release-guide.md). Set the app's `API_BASE_URL` to `https://sekar.example.com` for the production build. `fe/mobile/scripts/build-release.sh` drives the signed build.
- **iOS:** requires a Mac — see [`ios-release-guide.md`](ios-release-guide.md) for the full Xcode / capabilities / APNs / TestFlight / App Store runbook (and what's already prepared in the repo vs. deferred to a Mac).

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `backend` container restarts / unhealthy | Check `docker compose ... logs backend`. Common: wrong DB creds, or migrations not yet run. Health probe is `/api/v1/health/live`. |
| Migrations fail with auth error | `.env.production` `DATABASE_*` must match the postgres service (the compose file wires `DATABASE_HOST=postgres`). |
| Web shows but API calls fail / CORS | `CORS_ORIGIN` must equal the public origin; `NEXT_PUBLIC_API_URL` must be the public URL (rebuild `web` after changing — it's a build arg). |
| Map blank | `NEXT_PUBLIC_MAPBOX_TOKEN` missing/invalid (rebuild `web`). |
| Real-time monitoring not updating | WebSocket blocked — confirm Nginx `/socket.io/` upgrade block and that `wss://` is used. |
| Media upload 413 | Raise `client_max_body_size` in `infra/nginx.conf` (default 60M). |
| Port 80/443 in use | Stop the conflicting service or change the Nginx port mapping in `docker-compose.prod.yml`. |

---

## Appendix A — AWS (managed services)

Use the same images, but replace the in-stack data services with managed ones:

| In-stack service | AWS replacement | How |
|------------------|-----------------|-----|
| `postgres` | **RDS for PostgreSQL** | Remove the `postgres` service; set `DATABASE_HOST`/`DATABASE_PORT`/creds to the RDS endpoint, `DATABASE_SSL=true`. |
| `redis` | **ElastiCache for Redis** | Remove the `redis` service; set `REDIS_URL=redis://<elasticache-endpoint>:6379`. |
| `minio` + `minio-init` | **S3 + CloudFront** | Remove both; set real `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_S3_BUCKET` and **delete** the `AWS_ENDPOINT_URL`/`AWS_S3_FORCE_PATH_STYLE` overrides from the backend service. See [`aws-s3-setup.md`](aws-s3-setup.md). |
| `nginx` (self-managed TLS) | **ALB + ACM** (optional) | Terminate TLS at an Application Load Balancer; or keep Nginx on EC2. |
| host VM | **EC2** (`t3.small`+) or **ECS Fargate** | EC2: run the trimmed compose file. ECS: push images to ECR (`be/docker-compose.prod.yml` is the ECR-image variant) and define a task per service. |

Rough monthly cost (ap-southeast, small): EC2 t3.small ~$15 + RDS db.t3.micro ~$15 + ElastiCache t3.micro ~$12 + S3/CloudFront ~$1–5. Existing infra notes: [`infrastructure.md`](infrastructure.md), [`ci-cd.md`](ci-cd.md).

---

## Reference

- Env var catalogue + naming convention: [`environment-variables.md`](environment-variables.md)
- Security & dependency audit: [`../architecture/security.md`](../architecture/security.md)
- Local development: root `CLAUDE.md` Quick Start + `./scripts/setup.sh`
