# SEKAR — Deployment Guide (start to finish)

**The single authoritative guide for running and deploying SEKAR across every environment.**
It walks the four scenarios end-to-end — **run locally → obtain keys → deploy to staging → deploy to production** — and links to focused deep-dive guides for exhaustive detail. The per-phase deployment records (`phase-1`…`phase-5-deployment.md`) remain as historical/review notes.

## Scenarios & where to look

| You want to… | Start here |
|--------------|-----------|
| Run the whole stack on your machine | **§A Run locally** → [`local-development.md`](local-development.md) |
| Get Firebase / Maps / AWS keys | **§B Obtaining keys** → [`credentials-setup.md`](credentials-setup.md) |
| Understand every env var | **§C Environment variables** → [`environment-variables.md`](environment-variables.md) |
| Ship to a staging server | **§D Deploy to staging** |
| Ship to production | **§E Deploy to production** |
| Automate it / cut a versioned release | **§F CI/CD & releases** → [`ci-cd.md`](ci-cd.md) |
| Operate it (migrate, back up, roll back, debug) | **§G Operations** → [`operations.md`](operations.md) |
| Watch it (dashboards, alarms) | **§H Monitoring** → [`monitoring.md`](monitoring.md) |
| Release the mobile apps | **§I Mobile releases** → [`android-release-guide.md`](android-release-guide.md) · [`ios-release-guide.md`](ios-release-guide.md) |
| Run it on managed AWS | **Appendix A** → [`infrastructure.md`](infrastructure.md) |

## Deployment targets (same application images)

1. **Production → on-prem (pemkot) server** — Docker Compose, **platform-agnostic** (Windows
   Server *or* Linux). One host runs everything: PostgreSQL + Redis + MinIO + backend + web +
   reverse proxy. No cloud bill. → **§E** (`docker-compose.prod.yml`).
2. **Staging / UAT → AWS** — EC2 `t3.micro` (dedicated SEKAR box, sole tenant as of 2026-06): backend + web + Redis
   containers behind the SEKAR-owned Caddy, shared RDS `dlhsby` (database `sekar_staging`), AWS S3 (instance role),
   secrets in SSM Parameter Store. → **§D** (`infra/compose.staging.yml`).
3. *(Reference)* fuller managed-cloud layout (ECS/ElastiCache/CloudFront) → **Appendix A**.

## Environment model at a glance

| | **Local dev** | **Staging (AWS)** | **Production (on-prem)** |
|--|--------------|-------------|----------------|
| Where | laptop | AWS EC2 (sole tenant, dlhsby box) | pemkot server (Win/Linux) |
| Compose file | `infra/` dev | `infra/compose.staging.yml` | `docker-compose.prod.yml` |
| Env file | `.env.local` (per workspace) | `/opt/sekar/.env` (from SSM) | `.env.production` (root) |
| Object storage | **MinIO** (in `infra/`) | **AWS S3** (instance role) | **MinIO** (in `docker-compose.prod.yml`) |
| Database | local Docker Postgres | **shared RDS** → `sekar_staging` | compose Postgres |
| Redis | Docker | **in-stack container** | in-stack container |
| Seeder | `db:seed` (destructive) | `db:seed:staging:prod` | `db:seed:production:prod` (non-destructive) |
| TLS | none (http) | **Caddy auto-HTTPS** (Let's Encrypt) | Let's Encrypt / internal cert |
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

This brings up local infra (PostgreSQL :5432, Adminer :8080, MinIO S3 :9000 + console :9001, Redis :16379) and runs the backend (`http://localhost:3000`, API docs `/api/v1/docs`) and web (`http://localhost:3001`). Test users use `Password123!` (e.g. `admin/Password123!`, `satgas1/Password123!`).

**Two values you must fill** after `setup.sh`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `fe/web/.env.local` and `API_BASE_URL` in `fe/mobile/.env.local` (see §B). Everything else defaults to local infra.

→ **Full detail** — infra services, per-workspace run, local MinIO media, WSL2 device networking, and local troubleshooting: **[`local-development.md`](local-development.md)**.

---

## B. Obtaining keys & credentials

| Credential | Where to get it | Lands in (gitignored) | Needed for |
|-----------|-----------------|-----------------------|-----------|
| **Google Maps API key** | console.cloud.google.com/google/maps-apis | `fe/web/.env.local` `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Web maps (blank without it) |
| **Google Maps key** | Google Cloud Console (Maps SDK) | `fe/mobile/.env.local` `GOOGLE_MAPS_API_KEY` | Mobile native maps |
| **Firebase service account** | Firebase Console → Service accounts | `be/config/firebase-service-account.json` + `FCM_ENABLED=true` | Backend push sends |
| **Android FCM** | Firebase → Add Android app `com.sekarapp` | `fe/mobile/android/app/google-services.json` | Android push |
| **iOS FCM + APNs** | Firebase → Add iOS app + Apple Developer APNs key | `fe/mobile/ios/GoogleService-Info.plist` (+ APNs) | iOS push (needs Mac) |
| **AWS S3 + IAM** | AWS Console (staging/prod media) | `.env.staging` / `.env.production` `AWS_*` | Media storage (dev/prod use MinIO) |

→ **Step-by-step for every credential**, including the dev/staging/prod variance and the **security flag on the committed Maps key** (`fe/mobile/android/app/src/main/AndroidManifest.xml:49`): **[`credentials-setup.md`](credentials-setup.md)**.

---

## C. Environment variables

All three workspaces share one scheme, managed with **[dotenvx](https://dotenvx.com)**:
**`.env.local`** = local dev (plaintext, gitignored — the runtime file); **`.env.staging`** /
**`.env.production`** = deploys, committed **encrypted** (every secret is `encrypted:…`
ciphertext). The one real secret is the per-file private key in **`.env.keys`** (gitignored,
**never committed**). Committed templates are `*.example`. Loaders: backend
`be/src/config/load-env.ts` → `dotenvx.config()` (decrypts the chosen file at boot; plaintext
`.env.local` passes through); web → `dotenvx run -f .env.<env> -- next …` (`npm run build:<env>` /
`start:<env>`); mobile → `ENVFILE` in `babel.config.js`, release builds decrypt to a temp file
(`scripts/decrypt-env.js`). **Backend production env = repo-root `./.env.production`**, not a
`be/` file.

> **Build-time vs run-time:** `NEXT_PUBLIC_*` are compiled into the browser bundle when the `web` image builds — they must be the **public** URLs (through the proxy), not internal service names. Backend `DATABASE_HOST`/`REDIS_URL`/`AWS_ENDPOINT_URL` are overridden to the compose service names inside `docker-compose.prod.yml`, so you don't set those to localhost in deploys.

→ **Full catalogue** of every variable per workspace and environment: **[`environment-variables.md`](environment-variables.md)**. The encrypt/decrypt/rotate workflow and key topology: **[`encrypted-secrets.md`](encrypted-secrets.md)**.

---

## D. Deploy to staging (AWS — sole tenant)

Staging/UAT runs on **AWS**, sole tenant (SEKAR-owned as of 2026-06) on the `t3.micro`
(account `659828096624`, region `ap-southeast-3`, CLI profile `sekar`). It does **not** use
the self-hosted `docker-compose.prod.yml` — that's the on-prem **production** stack (§E).
Authoritative deltas live in [ADR-028 addendum](../architecture/decisions/ADR-028-staging-environment.md).

**Live URLs (HTTPS via Caddy auto-HTTPS):** API `https://api.sekar.wahyutrip.com` · web `https://sekar.wahyutrip.com` · docs (public user manual) `https://docs.sekar.wahyutrip.com`.

**Tooling URLs (staging only):**
- **Swagger / OpenAPI** — `https://api.sekar.wahyutrip.com/api/v1/docs` (UI; not env-gated) ·
  `…/api/v1/docs-json` (spec). Authorize with a JWT from `POST /auth/login`.
- **Adminer (DB UI)** — `https://adminer.wahyutrip.com`, behind Caddy **HTTP basic-auth**
  (user `sekar`; bcrypt hash in `infra/Caddyfile.staging`). Adminer login: System *PostgreSQL*,
  Server pre-filled to the RDS endpoint, User `sekar`, Database `sekar_staging`, Password =
  `DATABASE_PASSWORD` from the dotenvx-encrypted `be/.env.staging` (decrypt with
  `cd be && DOTENV_PRIVATE_KEY_STAGING=$(aws --profile sekar --region ap-southeast-3 ssm
  get-parameter --name /sekar/staging/BE_DOTENV_PRIVATE_KEY --with-decryption --query
  Parameter.Value --output text) npx @dotenvx/dotenvx get DATABASE_PASSWORD -f .env.staging`).
  The `adminer` service lives in
  `infra/compose.staging.yml` (internal-only `expose`, reached via Caddy on the `edge` network).
  DNS A record `adminer.wahyutrip.com → 16.79.124.63`.

### Topology
- **Edge/TLS:** SEKAR's own **Caddy** service (`sekar-caddy`) on 80/443 via a shared external Docker network `edge`;
  site blocks live in [`infra/Caddyfile.staging`](../../infra/Caddyfile.staging)
  (the source of truth, served directly by SEKAR's deploy). Bare hostnames → Caddy auto-provisions Let's Encrypt certs and
  redirects HTTP→HTTPS.
  - **Caddyfile is SEKAR-owned:** The `sekar-caddy` service is defined in `infra/compose.staging.yml` and configured by
    `infra/Caddyfile.staging`. When SEKAR deploys, it applies the Caddyfile directly. (As of 2026-06, the KPI project
    was decommissioned; SEKAR is the sole tenant and owns the Caddy TLS edge.)
  - **Applying a Caddyfile change:** the file is bind-mounted into the caddy
    container as a **single file (read-only)**, so editing it in place (`sed -i`/editors) swaps the
    inode and `caddy reload` reports "config is unchanged". Push via the SEKAR repo, then redeploy, or
    **restart** the caddy container after editing the box file — a plain reload is not enough.
- **Apps:** `backend` + `web` + `docs` (ECR images) + a small `redis` container —
  [`infra/compose.staging.yml`](../../infra/compose.staging.yml), per-container memory limits.
  - **`docs`** is the public user manual (Docusaurus static site, [`fe/docs/`](../../fe/docs)),
    built into the `sekar-docs` ECR image by CI and served as static HTML by its bundled nginx.
    One-time setup: create the `sekar-docs` ECR repo, add the `ECR_DOCS` repo Variable, and add
    DNS A record `docs.sekar.wahyutrip.com → 16.79.124.63`. Caddy block in
    [`infra/Caddyfile.staging`](../../infra/Caddyfile.staging) is part of SEKAR's config
    and deployed with the SEKAR stack. No auth — anyone can read it. Content edits (markdown under
    `fe/docs/docs/`) rebuild & redeploy on the next staging release (merge to `staging` / manual run).
- **DB:** `sekar_staging` database + `sekar` role on the **shared** RDS `dlhsby` (`DATABASE_SSL=true`).
- **Media:** S3 `sekar-media-staging` via the **EC2 instance role** — no static AWS keys on the host.
- **Secrets (dotenvx):** the backend's full staging config lives in the committed, **encrypted**
  [`be/.env.staging`](../../be/.env.staging) baked into the image. The only thing the box needs
  at runtime is the private key to decrypt it — `DOTENV_PRIVATE_KEY_STAGING`, pulled from SSM
  (`/sekar/staging/BE_DOTENV_PRIVATE_KEY`) into `/opt/sekar/.env` by
  [`infra/seed-env-from-ssm.sh`](../../infra/seed-env-from-ssm.sh). Web's `NEXT_PUBLIC_*` are
  decrypted from `fe/web/.env.staging` at **build** time (BuildKit secret, never in a layer).
- **No SSH:** all box operations go through **SSM Run Command**.

### Routine deploys — GitHub Actions (preferred)
Deploys are **deliberate**, not every-push — the job builds 3 Docker images, so it runs
only on an actual release (this keeps GitHub Actions within the free-tier minutes).
**A push to `main` does NOT deploy.** Trigger a staging deploy by either:
- **Release PR:** open a PR from `main` into `staging` and merge it (rebase/squash — `staging` is PR-only), or
- **Manual:** Actions tab → *Deploy staging (AWS)* → **Run workflow** (`workflow_dispatch`).

The `staging` GitHub **Environment requires one manual approval** (reviewer: repo owner) at the
`build-push` job before anything is built/deployed — approve from the run page. (The `deploy` job
isn't environment-scoped, so a release is approved **once**, not twice.)

That runs [`.github/workflows/deploy-staging.yml`](../../.github/workflows/deploy-staging.yml):
quality gate (backend + web) → **approve** → OIDC → build+push the images (`:staging` + `:<sha>`) →
pre-deploy RDS snapshot → migrate (SSM `migration:run:prod`) → `docker compose up -d --wait`
pinned to the SHA (recreates `sekar-caddy` too) → smoke test.
**Rollback:** re-run the workflow (`workflow_dispatch`) — or re-deploy a prior `:<sha>` tag.

> Day-to-day: develop on feature branches → PR → `main` (PRs run the quality gates).
> When `main` is ready for UAT, open a PR `main → staging` and merge it to release.

Required GitHub **Variables**: `AWS_REGION`, `AWS_ROLE_ARN`, `ECR_BACKEND`, `ECR_WEB`,
`EC2_INSTANCE_ID`, `RDS_INSTANCE_ID`. Required `staging`-environment **Secret**:
`WEB_DOTENV_PRIVATE_KEY` (decrypts `fe/web/.env.staging` — incl. the Google Maps API key — at build).

### First-time / manual deploy (mirrors what CI does)
```bash
# 1. Build + push images. Web decrypts NEXT_PUBLIC_* from the encrypted fe/web/.env.staging
#    via dotenvx at build time; the private key is a BuildKit secret, never in a layer.
aws ecr get-login-password --profile sekar --region ap-southeast-3 \
  | docker login --username AWS --password-stdin 659828096624.dkr.ecr.ap-southeast-3.amazonaws.com
docker buildx build --platform linux/amd64 -f be/Dockerfile \
  -t .../sekar-backend:staging --push be          # bakes the encrypted be/.env.staging
docker buildx build --platform linux/amd64 -f fe/web/Dockerfile \
  --build-arg DOTENV_ENV=staging \
  --secret id=dotenv_private_key,env=WEB_DOTENV_PRIVATE_KEY \
  -t .../sekar-web:staging --push fe/web

# 2. On the box (via SSM, as ec2-user): seed the dotenvx key, ensure edge net, pull, up
bash ~/sekar/infra/seed-env-from-ssm.sh          # writes /opt/sekar/.env (the private key only)
docker network create edge 2>/dev/null; docker network connect edge sekar-caddy 2>/dev/null
cd ~/sekar/infra && IMAGE_TAG=staging docker compose -f compose.staging.yml up -d --wait

# 3. First boot only: migrate + seed (compiled scripts; prod image has no ts-node)
docker compose -f compose.staging.yml run --rm --no-deps backend npm run migration:run:prod
docker compose -f compose.staging.yml run --rm --no-deps backend npm run db:seed:staging:prod
```
> `db:seed:staging:prod` is the staging dataset (idempotent, all passwords `Password123!`).
> **Never** run it on production. Migrations run every deploy; the seed is first-boot only.

### Smoke test
```bash
curl -sf https://api.sekar.wahyutrip.com/api/v1/health/ready   # {db,redis} ok
curl -sI https://sekar.wahyutrip.com/login                      # 200
```
Then log in (`superadmin/Password123!`) and confirm the monitoring map renders (Google Maps +
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
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key (maps fail to render without it) |
| `FCM_ENABLED` | `false` until Firebase is set up (§B / [`credentials-setup.md`](credentials-setup.md)) |

### E.4 TLS certificates

Nginx expects `infra/certs/fullchain.pem` + `infra/certs/privkey.pem` (gitignored).

**Let's Encrypt (recommended)** — get the cert with the stack down (port 80 free), then start the stack. Include the **docs** subdomain as a second `-d` so the same cert covers it:
```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d sekar.example.com -d docs.sekar.example.com
mkdir -p infra/certs
sudo cp /etc/letsencrypt/live/sekar.example.com/fullchain.pem infra/certs/
sudo cp /etc/letsencrypt/live/sekar.example.com/privkey.pem  infra/certs/
sudo chown "$USER" infra/certs/*.pem
```
Renewal: re-copy after `certbot renew` (the `certbot-webroot` volume + the Nginx `/.well-known/acme-challenge/` location support webroot renewal without downtime). Edit `server_name` in `infra/nginx.conf` to your domain (both the app and `docs.` server blocks), and add DNS A records for **both** hostnames.

> **Public docs site:** the `docs` service in `docker-compose.prod.yml` serves the user manual ([`fe/docs/`](../../fe/docs)) as static HTML, fronted by Nginx at `docs.<your-domain>`. Rebuild its image with your real domain via the `DOCS_URL`/`APP_URL` build args (and set web's `NEXT_PUBLIC_DOCS_URL` to match). To avoid a second subdomain/cert SAN entirely, use the **path-routed** alternative documented inline in [`infra/nginx.conf`](../../infra/nginx.conf) (serve under `sekar.example.com/docs` with `DOCS_BASE_URL=/docs/`).

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
curl -sI https://docs.sekar.example.com                      # 200 (public user manual)
```
Then log in to the dashboard and confirm the monitoring map renders (validates the Google Maps API key + WebSocket through Nginx).

### E.8 Push notifications (FCM) — optional

1. Create a Firebase project, generate a service-account key.
2. Mount it into the backend and point `FIREBASE_SERVICE_ACCOUNT_PATH` at it, **or** set the inline `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` trio in `.env.production`.
3. Set `FCM_ENABLED=true` and restart the backend.

Full detail: [`credentials-setup.md`](credentials-setup.md) §Firebase. iOS APNs relay: [`ios-release-guide.md`](ios-release-guide.md).

---

## F. CI/CD & releases

**Continuous staging.** [`deploy-staging.yml`](../../.github/workflows/deploy-staging.yml) runs on every
push to `main`: **`quality-be` + `quality-web`** gates (lint/tsc/test) → GitHub **OIDC** (no stored AWS
keys) → build + push backend/web images to ECR (`:staging` + `:<sha>`, with `GIT_SHA`/`BUILD_TIME`
baked in) → pre-deploy RDS snapshot → migrate + `up -d --wait` via **SSM** → smoke test. PRs are gated
by `backend-quality` / `web-quality` / `mobile-quality`.

**Versioned releases** (named, promotable — separate from the continuous staging stream). Bump → tag →
workflow, via `scripts/release.sh`:
- `scripts/release.sh server X.Y.Z` → `sekar-v*` tag → [`release-server.yml`](../../.github/workflows/release-server.yml)
  builds + ECR-tags `:X.Y.Z` images (be+web coupled, one shared version) and cuts a GitHub Release. **No
  auto-deploy** — promote to on-prem prod manually (§E, from `git checkout sekar-vX.Y.Z`).
- `scripts/release.sh mobile X.Y.Z <versionCode>` → `mobile-v*` tag → signed APK/AAB + auto-publish (§I).

**Build identity** is surfaced for deploy verification: backend `GET /health/live` →
`{version, gitSha, builtAt}`; web sidebar footer `v… · <sha>`. Full inventory + step-by-step release
runbook + rollback → **[`ci-cd.md`](ci-cd.md)**.

---

## G. Operations (day-2)

Migrations, seeding variants, **backup & restore**, **rollback**, health checks, connection-pool tuning, and incident runbooks (deploy-credential / dotenvx-key rotation, phantom-migration recovery, Firebase env loading, pool exhaustion). → **[`operations.md`](operations.md)**.

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

- **Android:** [`android-release-guide.md`](android-release-guide.md). Cut a release with
  `scripts/release.sh mobile X.Y.Z <versionCode>` (→ `mobile-v*` tag → [`mobile-release.yml`](../../.github/workflows/mobile-release.yml));
  manual `workflow_dispatch` stays as a fallback. The workflow builds a **signed APK + AAB** and
  **auto-publishes** to the `app-releases` registry (S3 + `POST /app-releases`), so the web download
  links and the in-app update checker update themselves. Field workers install from
  **`sekar.wahyutrip.com/android`**. Per-env config (API URL, Maps key, `google-services.json`) is
  resolved via dotenvx. **Bump `versionCode` each release** — the in-app checker compares it.
- **iOS (needs a Mac):** [`ios-release-guide.md`](ios-release-guide.md) — Xcode / capabilities / APNs /
  TestFlight / App Store runbook (and what's prepared in the repo vs. deferred to a Mac).

---

## Troubleshooting (top issues)

| Symptom | Likely cause / fix |
|---------|--------------------|
| `backend` container restarts / unhealthy | `docker compose ... logs backend`. Common: wrong DB creds, or migrations not yet run. Health probe is `/api/v1/health/live`. |
| Migrations fail with auth error | `.env.*` `DATABASE_*` must match the postgres service (compose wires `DATABASE_HOST=postgres`). |
| Web shows but API calls fail / CORS | `CORS_ORIGIN` must equal the public origin; `NEXT_PUBLIC_API_URL` must be the public URL (rebuild `web` after changing — it's a build arg). |
| Map blank | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` missing/invalid (rebuild `web`). |
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
