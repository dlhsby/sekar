# Phase 3 Deployment Guide — Plants Management, Monitoring Rebuild & Public Intake

**Last Updated:** April 27, 2026 (Apr 27 audit + bug-fix sweep)
**Status:** 🟡 Backend deployed; Redis pending; Web pending CI fix
**Target:** Incremental deploy on top of Phase 2E production

> **Reference:** See `specs/deployment/phase-2-deployment.md` for infrastructure setup, GitHub Secrets, Nginx config, and baseline procedures. This guide covers only Phase 3 incremental changes.

---

## 🆕 Apr 27 Audit + Bug-Fix Sweep — Pre-Deploy Smoke

Before pushing the next mobile build, run this 5-minute smoke test against the dev environment. Each step has a known-fixed status — if any fail, that means a regression has been introduced and the deploy should pause.

| # | Action | Expected | Apr 27 status |
|---|--------|----------|---------------|
| 1 | `cd be && npm run db:seed:staging` | Exits 0; output mentions `6 pruning_requests inserted (mixed statuses with review metadata)` and `5 plant_seeds + 5 seed_transactions` and `84 new service_capacity rows` | ✅ |
| 2 | Login mobile as `staff_kec_pusat / password123` → tap "Kirim Permintaan" | `SubmitScreen` 5-step wizard renders without crash; "Kembali" + "Lanjut" buttons show text | ✅ fixed Apr 27 |
| 3 | Login mobile as `admin_data_pusat_1 / password123` → tap admin tab | `ReviewQueueScreen` lists ≥2 pending pruning_requests | ✅ |
| 4 | Tap a request → `RequestDetailScreen` → tap "Setujui" | Modal opens with reason textarea | ✅ |
| 5 | For an approved request, tap "Konversi ke Tugas" | `ConvertToTaskSheet` opens (areas/users dropdowns are empty until Phase 4 — known) | 🟡 partial |
| 6 | Login web as `admin_pusat / password123` → click each sidebar link | All resolve (no 404). Phase 3 routes show "Coming soon" placeholders | ✅ Apr 27 placeholders |
| 7 | Login web as `staff_kec_pusat` | Sidebar shows "Kirim Permintaan" + "Permintaan Saya"; both routes resolve to placeholders | ✅ Apr 27 placeholders |
| 8 | Backend `cd be && npm test -- --testPathPattern='modules/(pruning-requests\|service-capacity\|plant-seeds\|plants)'` | 179 tests, 0 failures | ✅ |
| 9 | Mobile `cd fe/mobile && npx jest src/components/nb/__tests__/NBButton.test.tsx` | 26 tests pass (5 new regression-guard tests for `outline`, `label`, `leftIcon`, unknown-variant fallback, string children) | ✅ |

If any row flips ❌ in this table after a future change, **don't deploy** until the regression is identified and either fixed or explicitly accepted by the user.

### Apr 27 deployment changelog

- **Mobile**: `NBButton` extended with `outline` variant + `label` alias + `leftIcon` + string-children fallback + graceful unknown-variant fallback. `nbSpacing` numeric subscript shim added (Tailwind-style `nbSpacing[2]`/`nbSpacing[4]`). `ConvertToTaskSheet` defensive patch (no longer crashes on missing `areas`/`users` slices). Bumps mobile bundle by ~3 KB.
- **Web**: Two new placeholder pages at `(kecamatan)/pruning-requests/page.tsx` and `(kecamatan)/pruning-requests/my/page.tsx` to prevent staff_kecamatan 404s.
- **Backend**: No code changes. (Pre-existing `/pruning-requests/:id/review`, `/convert-to-task`, `/rayons/:id/capacity*`, `/plant-seeds/*` endpoints all live and tested.)
- **Spec**: STATUS.md headline reconciled with detail tables (was "17/21 ~81 %", now "13/21 fully + 4 partial + 4 not-started ≈ 70 %"). New "Open Items by Bucket" block added.

---

## 📍 Where We Are — Resume Checklist (Apr 27, 2026)

| # | Step | State | Notes |
|---|------|-------|-------|
| 1 | Push Phase 3 commits to `main` | ✅ done | up to commit `874b13e` |
| 2 | Backend CI/CD (build + ECR + EC2) | ✅ done | run `24972458864` green; new image active on `16.79.183.240` |
| 3 | Phase 3 migrations | ✅ done | both migrations recorded in `typeorm_migrations` (id 12, 13); see "Issues Resolved" below |
| 4 | Phase 3 seed (`db:seed:phase3:prod`) | ✅ done (partial, Apr 27) | 128 plant_species, 4 monitoring_configs, 5 plant_seeds. Sections 3/4/6 skipped on the day — prod DB has no users/areas/rayons. **Resolved going forward:** as of `3844974`, `db:seed:prod` and `db:seed:staging:prod` both run Phase 3 reference + sample data automatically; future cold-starts and UAT resets are one-step. |
| 5 | Backend smoke test (`/api/v1/health`) | ✅ done | OK |
| 6 | **Redis provisioning** | ⏸️ pending | choose Upstash OR ElastiCache (see below); add `REDIS_URL` to GitHub Secrets |
| 7 | Add 5 new env vars to GitHub Secrets `BACKEND_ENV_PRODUCTION` | ⏸️ pending | depends on step 6 |
| 8 | Empty commit + push to redeploy backend with Redis vars | ⏸️ pending | `git commit --allow-empty -m "chore: enable Redis"` |
| 9 | **Web CI/CD fix** (`eslint-plugin-sekar-design` not found in CI) | ⏸️ pending | runs failing since Apr 26; see "Web CI/CD Fix" below |
| 10 | Web deploy (after CI fix) | ⏸️ pending | currently the older Phase 2E web image is still serving |
| 11 | Mobile APK release build | ⏸️ pending | `cd fe/mobile/android && ./gradlew assembleRelease` |
| 12 | **Rotate `sekar-key.pem`** | ⏸️ pending | private key was exposed in a chat transcript on Apr 27 — treat as compromised. See "Rotate `sekar-key.pem` Before Resuming SSH Ops" section below for the 7-step procedure. |

**To resume:** start at step 6. The backend is fully Phase-3-capable but running with Redis in degraded fallback mode (sync ping processing, in-memory Socket.IO).

---

## 🔐 Rotate `sekar-key.pem` Before Resuming SSH Ops

The contents of `sekar-key.pem` were exposed in a chat transcript on **Apr 27, 2026**. Treat the existing key as compromised. Rotate before any further `ssh ec2-user@16.79.183.240` operations.

> **Heads-up:** EC2 does not let you replace the *original* key pair attached to a launched instance from the AWS console. The supported flow is "add a new key to `authorized_keys`, verify, remove the old one." That works without instance downtime and is the safest path. The CLI commands assume the rotating user (you) currently has SSH access with the old key.

### Step 1 — Generate a new keypair locally

```bash
# Pick a path; the existing key lives at ~/.ssh/sekar-key.pem (or /home/wahyutrip/wahyutrip/dlhsby/taman/creds/sekar-key.pem)
NEW_KEY=~/.ssh/sekar-key-2026.pem

ssh-keygen -t ed25519 -f $NEW_KEY -C "sekar-prod-2026-04-27" -N ""
chmod 600 $NEW_KEY
chmod 644 $NEW_KEY.pub

# Quick sanity check
ssh-keygen -l -f $NEW_KEY.pub
```

> Use `ed25519` (smaller, faster, modern). RSA-2048 is fine if your tooling needs it.

### Step 2 — Install the new public key on the server (using the OLD key one last time)

```bash
OLD_KEY=~/.ssh/sekar-key.pem      # whatever you currently use
NEW_PUB=$(cat $NEW_KEY.pub)

ssh -i $OLD_KEY ec2-user@16.79.183.240 \
  "echo '$NEW_PUB' >> ~/.ssh/authorized_keys && \
   chmod 600 ~/.ssh/authorized_keys && \
   wc -l ~/.ssh/authorized_keys"
# Expected: line count goes up by 1
```

### Step 3 — Verify the new key works (in a NEW shell — do NOT close the old session yet)

```bash
ssh -i $NEW_KEY -o IdentitiesOnly=yes ec2-user@16.79.183.240 "whoami && uname -a && date"
# Expected: "ec2-user", linux kernel info, current time
```

If this fails, do not proceed — keep the old session alive while you debug. Common gotchas: wrong file mode on the key (`chmod 600`), wrong path, or copy/paste mangled the public key on the server.

### Step 4 — Remove the OLD public key from `authorized_keys`

First, find the comment/fingerprint of the old key so you can target the right line:

```bash
ssh-keygen -l -f $OLD_KEY.pub      # if you have the .pub
# OR derive the public key from the private key:
ssh-keygen -y -f $OLD_KEY | awk '{print $2}'   # prints the base64 blob
```

Then remove that exact line from the server's `authorized_keys` (using the NEW key now):

```bash
OLD_PUB_BLOB=$(ssh-keygen -y -f $OLD_KEY | awk '{print $2}')

ssh -i $NEW_KEY ec2-user@16.79.183.240 \
  "grep -v \"$OLD_PUB_BLOB\" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.new && \
   mv ~/.ssh/authorized_keys.new ~/.ssh/authorized_keys && \
   chmod 600 ~/.ssh/authorized_keys && \
   wc -l ~/.ssh/authorized_keys"
# Expected: line count drops by 1
```

Re-verify the NEW key still works **and** the OLD key now fails:

```bash
ssh -i $NEW_KEY -o IdentitiesOnly=yes ec2-user@16.79.183.240 "echo NEW OK"
ssh -i $OLD_KEY -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=5 ec2-user@16.79.183.240 "echo OLD STILL WORKS" 2>&1
# Expected last line: "Permission denied (publickey)."
```

### Step 5 — Update GitHub Actions secret

The backend CI/CD pipeline SSHs to `16.79.183.240` to deploy. Update the private key it uses:

```bash
# Find the secret name (it's likely EC2_SSH_KEY or SSH_PRIVATE_KEY)
gh secret list --env production

# Update it with the contents of the NEW private key
gh secret set EC2_SSH_KEY --env production < $NEW_KEY
# (Use the actual secret name found above — naming may vary.)
```

Trigger a tiny redeploy to confirm the pipeline still SSHs successfully:

```bash
git commit --allow-empty -m "chore(infra): rotate prod SSH key"
git push origin main
gh run watch --exit-status
```

### Step 6 — Securely destroy the OLD key

```bash
# Linux/macOS — overwrite the file before delete to defeat undelete tools
shred -u $OLD_KEY  2>/dev/null || rm -P $OLD_KEY  # `shred` on Linux, `rm -P` on macOS
# Also remove the cached fingerprint from any agent
ssh-add -d $OLD_KEY 2>/dev/null
```

If the old key was committed anywhere (shouldn't be, but check):

```bash
# Search the SEKAR repo + any related repos
git -C ~/wahyutrip/dlhsby grep -rn "BEGIN RSA PRIVATE KEY\|BEGIN OPENSSH PRIVATE KEY" 2>/dev/null
git -C ~/wahyutrip/dlhsby log --all --diff-filter=A --name-only -- '**/*.pem' 2>/dev/null
```

If anything turns up, use BFG Repo-Cleaner (<https://rtyley.github.io/bfg-repo-cleaner/>) or `git filter-repo` to scrub it, force-push, and tell collaborators to re-clone.

### Step 7 — Update local docs that reference the key path

| File | What to update |
|------|----------------|
| `specs/deployment/DEPLOYMENT_STATUS.md` | All `~/.ssh/sekar-key.pem` references → new path |
| `specs/deployment/phase-2-deployment.md`, `phase-3-deployment.md` | Same |
| Personal `~/.ssh/config` | Add a `Host sekar-prod` block (see below) |

Convenience entry for `~/.ssh/config`:
```
Host sekar-prod
  HostName 16.79.183.240
  User ec2-user
  IdentityFile ~/.ssh/sekar-key-2026.pem
  IdentitiesOnly yes
```
Then `ssh sekar-prod` just works.

### Optional — record the old key as revoked

Keep a note in `specs/deployment/DEPLOYMENT_STATUS.md`:
```
**SSH key rotations:**
- 2026-04-27 — sekar-key.pem rotated (transcript exposure). Revoked fingerprint: <output of `ssh-keygen -l -f $OLD_KEY.pub`>
```
This is not strictly required, but helps if anyone ever finds a cached copy of the old key and wonders if it's still valid.

---

## 🛠️ Issues Resolved During Apr 27 Deploy

### A. Phantom `typeorm_migrations` rows
On the first migration attempt, `typeorm_migrations` already contained rows for `Phase3Schema17460000000000` and `Phase3BackfillIndexes17460001000000`, yet the actual tables didn't exist (`to_regclass('public.plant_species')` returned NULL). Cause unknown — likely a previous half-run that committed the bookkeeping rows but rolled the DDL back, OR a manual marker.

**Recovery executed:**
```sql
DELETE FROM typeorm_migrations WHERE name IN ('Phase3Schema17460000000000', 'Phase3BackfillIndexes17460001000000');
-- Re-ran migration → it failed at `uq_area_plants_area_species already exists` because some DDL HAD been applied.
-- Verified all 8 Phase 3 tables + indexes + ALTER columns existed in DB.
INSERT INTO typeorm_migrations(timestamp, name) VALUES
  (7460000000000, 'Phase3Schema17460000000000'),
  (7460001000000, 'Phase3BackfillIndexes17460001000000');
```

**Lesson:** the migration `EXCEPTION WHEN duplicate_object` clause does NOT catch `42P07 duplicate_table` (which fires when a UNIQUE constraint name conflicts because constraints create relations/indexes). If you ever need to retry a half-applied Phase3Schema, prefer to verify DDL state first (see "Verify schema" below) rather than re-running blind.

### B. Missing UNIQUE constraint on `plant_seeds.name_id`
The seed used `INSERT … ON CONFLICT (name_id) DO NOTHING`, but the migration didn't declare that constraint. Patched live with:
```sql
ALTER TABLE plant_seeds ADD CONSTRAINT uq_plant_seeds_name_id UNIQUE (name_id);
```
Then committed the migration fix in `874b13e`. Future fresh installs are unaffected.

### Verify schema (anytime)
```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  'docker exec sekar-backend node -e "
    const {DataSource}=require(\"typeorm\");
    new DataSource({type:\"postgres\",host:process.env.DATABASE_HOST,port:5432,username:process.env.DATABASE_USERNAME||\"sekar_admin\",password:process.env.DATABASE_PASSWORD,database:process.env.DATABASE_NAME||\"sekar_db\",ssl:{rejectUnauthorized:false}}).initialize().then(async ds => {
      for (const t of [\"plant_species\",\"area_plants\",\"notable_plants\",\"pruning_requests\",\"activity_plant_items\",\"service_capacity\",\"plant_seeds\",\"seed_transactions\"]) {
        const r = await ds.query(\\\`SELECT to_regclass(\\\"public.\\\${t}\\\") AS x\\\`);
        console.log(t, r[0].x ? \"OK\" : \"MISSING\");
      }
      await ds.destroy();
    });"'
```

---

## 📋 Quick Reference

**What changes in Phase 3 M1-R + M1-S + M2 deploy:**

| Component | Change | Action Required |
|-----------|--------|----------------|
| **Backend** | `ioredis`, `@socket.io/redis-adapter` packages; `CommonModule`; 3 new services | Deploy backend image |
| **Database** | 2 new migrations (Phase3Schema + Phase3BackfillIndexes) — 8 new tables, 5 altered | Run migrations |
| **Redis** | Redis 7 added to infra (for local dev) | AWS: provision ElastiCache Redis 7 |
| **Seeds** | 128 plant species + 4 Phase 3 monitoring configs + service_capacity grid (idempotent) | Built into `db:seed:prod` (cold-start) and `db:seed:staging:prod` (UAT) — no separate Phase 3 seed step needed |
| **Web** | supercluster, @tanstack/react-virtual packages; monitoring page rewrite; `staff_kecamatan` nav | Deploy web image |
| **Mobile** | `monitoringV2Slice`, `ClusterMarker`, `MonitoringToggleSheet`, `AreaStatusOverlay` | Build + release APK |
| **Env vars** | 5 new backend env vars for Redis | Update `.env.production` |

**New backend tests:** 1,297 passing (up from 1,264). Coverage maintained ≥ 94%.

---

## 🎯 Demo Path — Test Phase 3 Locally (Quick Start)

**Goal:** Spin up backend + mobile with Phase 3 sample data to validate Plants, Monitoring v2, and Pruning Requests features.

**Time:** ~10 minutes (Docker + npm setup) + 2 minutes (seed)

### Demo Path Steps

#### 1. Start backend with Phase 3 seed

```bash
cd /path/to/sekar
./scripts/infra.sh start                   # Bring up PostgreSQL, Adminer, LocalStack (docker-compose)
cd be
npm install                         # If not already done
cp .env.example .env               # Use default localhost credentials
npm run migration:run              # Run all migrations (Phase 3 tables created)
npm run db:seed:prod               # Seeds reference data + Phase 3 sample (127 users, 5 areas, 7 rayons, 128 plant species, 4 notable_plants, 4 pruning_requests, 5 plant_seeds)
npm run start:dev                  # http://localhost:3000
```

#### 2. Verify Phase 3 data via Swagger UI

Open http://localhost:3000/api/docs and test:

- **GET** `/api/v1/plants/species` → 128 plant species
- **GET** `/api/v1/plants/notable` → 4 heritage plants (area 1–3)
- **GET** `/api/v1/monitoring/snapshot` → live worker cluster counts + staffing by rayon
- **GET** `/api/v1/pruning-requests` (with `admin_system` token) → 4 sample requests in mixed statuses (submitted, approved, rejected)

**Test user credentials:**
- `satgas1 / password123` — field worker (can clock-in, see monitoring)
- `admin_system / password123` — system admin (can review pruning requests, see all data)

#### 3. Start mobile with Phase 3 UI

```bash
cd fe/mobile
npm install                        # If not already done
cp .env.example .env               # Set API_BASE_URL=http://10.0.2.2:3000 (emulator) or YOUR_IP:3000 (device)
npm run android                    # Or: npm run ios (macOS only)
```

#### 4. Validate Phase 3 features on mobile

- **As satgas1:** Log in → Home → "Monitoring" tab → see live worker cluster markers + staffing by rayon
- **As staff_kecamatan:** Log in → "Kecamatan" tab → "Ajukan Permintaan" → submit a pruning request (form auto-filled with demo data)
- **As admin_system (on web):** Go to "Pruning Requests" → review the 4 sample requests → approve/reject one

#### 5. Clean up

```bash
./scripts/infra.sh stop                    # Tear down Docker services (PostgreSQL, etc.)
```

**Demo data will persist on next `npm run db:seed:prod` — it's idempotent. Use `docker-compose down -v` if you want a fresh start.**

---

## 🔑 New Environment Variables

Add to `be/.env.production` (and GitHub Secrets `BACKEND_ENV_PRODUCTION`):

```env
# Redis (Phase 3 — M2 Monitoring v2)
REDIS_URL=redis://<ELASTICACHE_ENDPOINT>:6379
REDIS_STREAM_MAX_LEN=100000
STAFFING_DEBOUNCE_SECONDS=30
MONITORING_SWEEP_CRON=*/5 * * * *
CLUSTER_ZOOM_THRESHOLD=14
MISSING_THRESHOLD_SECONDS=900
```

For local dev (already in `infra/docker-compose.yml`):
```env
REDIS_URL=redis://localhost:6379
```

---

## 🏗️ Infrastructure Changes — Redis 7

Phase 3 uses Redis 7 for:
- Redis Streams (`location:pings`) — `StatusProjectorService` reads EVERY_SECOND
- Socket.IO Redis adapter (future horizontal scale)
- `StaleStatusSweeperService` cron (`*/5 * * * *`)

> **Graceful fallback:** If Redis is unavailable, the app **still starts** — `StatusProjectorService.onModuleInit` is wrapped in try/catch, `LocationService` falls back to synchronous latest-ping processing, and Socket.IO falls back to in-memory single-instance mode. Redis failures log as warnings, not crashes. **You can defer Redis** and Phase 3 monitoring still works in degraded mode.

### Choose your Redis provider

| Option | Monthly Cost | RAM | TLS | Connection limit | Best for |
|--------|-------------|-----|-----|------------------|----------|
| **Upstash Redis (free tier)** | **$0** | 256 MB | ✅ required | 100 concurrent | Phase 3 production at current scale (~tens of workers, low ping volume) |
| **AWS ElastiCache `cache.t3.micro`** | ~$13.14/mo (ap-southeast-3) | 0.5 GB | optional | thousands | Phase 4+ horizontal scaling, same-VPC latency |
| **Self-hosted Redis 7 on the same EC2 box** | $0 | bounded by host | manual | manual | Bench/staging only — production t3.micro has only 327 Mi RAM free |

**Recommendation for now:** **Upstash free tier** (Section 1). It clears today's deploy with zero AWS friction and zero cost. Move to ElastiCache (Section 2) when you start hitting Upstash limits or when you need same-VPC latency / multi-instance scale.

---

### Section 1 — Upstash Redis (free tier, recommended)

#### Step 1.1 — Create the database (web console)

1. Go to <https://console.upstash.com/redis> and sign in (GitHub login is fine).
2. Click **Create Database**.
3. Settings:
   - **Name:** `sekar-redis-prod`
   - **Type:** Regional (Global is more expensive and not needed)
   - **Region:** `AWS / ap-southeast-1 (Singapore)` — closest free-tier region to Jakarta. (`ap-southeast-3` Jakarta is not in Upstash free regions; Singapore adds ~30 ms RTT, acceptable for our workload.)
   - **Eviction:** `Disabled` (we want stream entries to persist until consumed)
   - **TLS / SSL:** **Enabled** (required for free tier)
4. Click **Create**.

#### Step 1.2 — Copy the connection URL

In the database detail page, find **REST API** / **Redis Connect**:
- The `UPSTASH_REDIS_REST_URL` is the REST API — **don't use this for Phase 3.**
- The `redis://` and `rediss://` URLs are the standard Redis-protocol endpoints.
- Copy the **`rediss://`** URL (TLS variant). Format:
  ```
  rediss://default:<PASSWORD>@<host>.upstash.io:6379
  ```

#### Step 1.3 — Add to GitHub Secrets

```bash
gh secret set REDIS_URL --env production --body 'rediss://default:<PASSWORD>@<host>.upstash.io:6379'
gh secret set REDIS_STREAM_MAX_LEN --env production --body '100000'
gh secret set STAFFING_DEBOUNCE_SECONDS --env production --body '30'
gh secret set MONITORING_SWEEP_CRON --env production --body '*/5 * * * *'
gh secret set CLUSTER_ZOOM_THRESHOLD --env production --body '14'
gh secret set MISSING_THRESHOLD_SECONDS --env production --body '900'
```

Or via the web UI: <https://github.com/dlhsby/sekar/settings/environments/production> → Environment secrets → Add `REDIS_URL` etc.

> **Important:** GitHub Secrets are pulled into `.env.production` by `backend-ci-cd.yml` at deploy time. The variables only become active **after a redeploy** (next push or empty commit).

#### Step 1.4 — Trigger a redeploy

```bash
git commit --allow-empty -m "chore(deploy): activate Redis (Upstash) for Phase 3 monitoring v2"
git push origin main
gh run watch --exit-status   # waits for CI/CD to finish
```

#### Step 1.5 — Verify

```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  'docker logs sekar-backend --tail=200 2>&1 | grep -E "Redis|StatusProjector|Socket.IO"'
# Expected lines:
#   [Nest] StatusProjectorService dependencies initialized
#   [Nest] Socket.IO Redis adapter active
#   No "Redis connection failed" warnings.

# Confirm stream is being written from a worker ping (after a clock-in event):
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  'docker exec sekar-backend node -e "
    const Redis = require(\"ioredis\");
    const r = new Redis(process.env.REDIS_URL);
    r.xlen(\"location:pings\").then(n => { console.log(\"location:pings length:\", n); r.quit(); });"'
```

#### Free-tier limits (Upstash, current as of 2026-04)

| Limit | Free tier |
|-------|-----------|
| Storage | 256 MB |
| Bandwidth | 50 GB / month |
| Commands | 500,000 / day (~5.8 / sec sustained) |
| Concurrent connections | 100 |
| Daily request quota | 10,000 / day for REST (we use Redis protocol — different bucket) |
| Persistence | Snapshot every 5 min |

Phase 3 sustained load estimate: ~30 active workers × 1 ping / 30 sec = 1 cmd/sec average. Comfortably inside the free tier. If you exceed, Upstash auto-scales to Pay-as-you-go ($0.20 per 100k commands) — set a billing alert.

---

### Section 2 — AWS ElastiCache Redis 7 (paid)

> **Free-tier note:** ElastiCache offers 750 hours/month of `cache.t3.micro` for the first **12 months only after AWS account creation**. This account (`170848542527`, created 2023-03-29) is past the free-tier window. Expect ~$13.14/mo in `ap-southeast-3` (Jakarta), prorated.

#### Prerequisites

- IAM user with `elasticache:*`, `ec2:DescribeSubnets`, `ec2:DescribeSecurityGroups`, `ec2:AuthorizeSecurityGroupIngress`. (`wahyu-vision` does NOT have these as of Apr 27 — request from account admin or use the SEKAR-prod account.)
- The VPC, subnet group, and security group used by the SEKAR backend EC2 (`16.79.183.240`).

```bash
# Find your existing infra (run from a workstation with the right AWS creds)
SEKAR_INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*sekar*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text)
SEKAR_VPC=$(aws ec2 describe-instances --instance-ids $SEKAR_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].VpcId' --output text)
SEKAR_SG=$(aws ec2 describe-instances --instance-ids $SEKAR_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
SEKAR_SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$SEKAR_VPC" \
  --query 'Subnets[].SubnetId' --output text | tr '\t' ',')
echo "INSTANCE=$SEKAR_INSTANCE_ID VPC=$SEKAR_VPC SG=$SEKAR_SG SUBNETS=$SEKAR_SUBNETS"
```

#### Path A — AWS CLI

```bash
# 2A.1 — Create a subnet group across the SEKAR VPC's subnets
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name sekar-subnet-group \
  --cache-subnet-group-description "SEKAR backend subnet group" \
  --subnet-ids $(echo $SEKAR_SUBNETS | tr ',' ' ')

# 2A.2 — Create a dedicated security group for Redis (Redis port 6379 from backend SG only)
SEKAR_REDIS_SG=$(aws ec2 create-security-group \
  --group-name sekar-redis-sg \
  --description "SEKAR Redis access from backend EC2" \
  --vpc-id $SEKAR_VPC \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $SEKAR_REDIS_SG \
  --protocol tcp --port 6379 \
  --source-group $SEKAR_SG

# 2A.3 — Create the cache cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id sekar-redis-prod \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.1 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name sekar-subnet-group \
  --security-group-ids $SEKAR_REDIS_SG \
  --tags Key=Project,Value=SEKAR Key=Environment,Value=production

# 2A.4 — Wait for it to come available (~5-10 min)
aws elasticache wait cache-cluster-available --cache-cluster-id sekar-redis-prod

# 2A.5 — Read the endpoint
REDIS_HOST=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id sekar-redis-prod \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)
echo "REDIS_URL=redis://$REDIS_HOST:6379"
```

#### Path B — AWS Console

1. **VPC > Security Groups > Create security group**
   - Name: `sekar-redis-sg`
   - VPC: same VPC as the backend EC2 (find via EC2 Console → instance `16.79.183.240` → Networking tab)
   - Inbound rule: Type `Custom TCP`, Port `6379`, Source = backend EC2 security group ID
   - Save. Copy the new SG ID.

2. **ElastiCache → Redis OSS caches → Create Redis cluster**
   - Deployment option: **Design your own cache**
   - Creation method: **Easy create** is fine; pick **Demo** preset, then customize
   - Cluster info:
     - Name: `sekar-redis-prod`
     - Engine: Redis OSS
     - Engine version: `7.1` (latest stable)
     - Port: `6379`
     - Node type: **`cache.t3.micro`** (cheapest — ~$13/mo)
     - Number of replicas: `0` (single node; cluster mode is overkill for Phase 3)
   - Subnet group: **Create new** → name `sekar-subnet-group` → VPC = backend VPC → select all private subnets
   - Security: Security groups = `sekar-redis-sg` (the one you just created); leave Auth disabled for in-VPC private access (encryption-in-transit can be enabled but adds ~10 ms RTT and requires `rediss://`)
   - Backup: enable, daily, retention 1 day
   - Maintenance window: pick a low-traffic window (e.g., Sunday 04:00 WIB)
   - Tags: `Project=SEKAR`, `Environment=production`
   - Click **Create**

3. After ~5-10 min, status flips to `available`. Click the cluster name → **Configuration** tab → copy **Primary endpoint** (looks like `sekar-redis-prod.xxxxxx.0001.aps3.cache.amazonaws.com:6379`).

#### Step 2.5 — Add to GitHub Secrets (CLI or console)

Same as Upstash Section 1.3, but with `REDIS_URL=redis://<endpoint>:6379` (no TLS — in-VPC plaintext is fine; switch to `rediss://` if you enabled encryption-in-transit).

```bash
gh secret set REDIS_URL --env production --body "redis://$REDIS_HOST:6379"
# Plus the other 5 vars from Section 1.3
```

#### Step 2.6 — Verify (after redeploy)

Same as Upstash 1.5. From the EC2 host you can also `redis-cli` directly:
```bash
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240 \
  "docker run --rm redis:7.1 redis-cli -h $REDIS_HOST -p 6379 PING"
# → PONG
```

#### Step 2.7 — Cost monitoring

In CloudWatch, set a billing alarm:
```bash
aws budgets create-budget --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{"BudgetName":"sekar-redis-monthly","BudgetLimit":{"Amount":"20","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST","CostFilters":{"Service":["Amazon ElastiCache"]}}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"<your@email>"}]}]'
```

---

### Section 3 — Migrating from Upstash to ElastiCache later

When you outgrow Upstash:
1. Provision ElastiCache per Section 2.
2. Update `REDIS_URL` GitHub Secret to the new endpoint.
3. Empty-commit + push — backend rebuilds with the new URL.
4. Streams (`location:pings`) **don't need migration** — they're a rolling cap-trimmed log; the old Upstash data simply ages out. Tracking state is rebuilt on the next ping cycle.
5. Cancel the Upstash database after 24 hours of stable ElastiCache operation.

---

## 📦 Migrations

**Two new migration files** (in order):

| # | File | What it does |
|---|------|-------------|
| 9 | `17460000000000-Phase3Schema.ts` | Creates 8 new tables (plant_species, area_plants, notable_plants, pruning_requests, activity_plant_items, service_capacity, plant_seeds, seed_transactions); alters activities (+6 cols) and tasks (+5 cols); adds `staff_kecamatan` to user_role enum; 2 indexes on user_tracking_status |
| 10 | `17460001000000-Phase3BackfillIndexes.ts` | 3× `CREATE INDEX CONCURRENTLY` on location_logs (user_id + logged_at patterns) — runs outside transaction |

> **Important:** Migration 10 uses `CONCURRENTLY` and breaks out of the TypeORM transaction. This is safe and expected — it may take 30–60 seconds on a large `location_logs` table. Do not interrupt it.

Run on production:
```bash
docker exec sekar-backend npm run migration:run:prod
# Expected: 2 new migrations executed:
#   17460000000000-Phase3Schema
#   17460001000000-Phase3BackfillIndexes
```

---

## 🌱 Seeds

As of commit `3844974` (Apr 27, 2026) the **reference and staging seeders both include Phase 3 data**, so cold-start prod and UAT no longer need a separate Phase 3 seed step.

### Production cold-start (`db:seed:prod` → `seed-reference.ts`)

```bash
docker exec sekar-backend npm run db:seed:prod
```

Idempotent. Seeds, in order:
1. **4** area types · **3** shift definitions · **7** rayons · **20** activity types · **4** special-day overrides
2. **5** monitoring configs (Phase 2D)
3. **4** monitoring configs (Phase 3) — `plants_forecast`, `service_capacity_defaults`, `pruning_request_workflow`, `seed_inventory`
4. **128** `plant_species` (Indonesian tree/shrub/flower catalog)
5. **service_capacity grid** — 7 rayons × 12 ISO weeks × `service_type='pruning'` with `capacity_units=0` (admins set per-rayon later)
6. **1** default superadmin (`admin` / `password123` — change immediately)

> **Phase 3 schema guard:** if `plant_species` table doesn't exist (migrations not yet run), Phase 3 reference inserts log a warning and skip. Safe to call against a Phase 2-only DB.

### Staging UAT (`db:seed:staging:prod` → `seed-staging.ts`)

```bash
docker exec sekar-backend npm run db:seed:staging:prod
```

**Destructive — wipes all tables, then reseeds for Rayon Pusat UAT.** Adds, on top of `seed-reference`:
- 13 areas (1 active park + 12 pedestrian) · 24 users (14 test + 10 real) · permanent `user_areas` assignments · 26 staff requirements
- **Phase 3 sample data:**
  - **`staff_kec_pusat`** user (role `staff_kecamatan`, phone `081200000023`) — for testing the public intake flow
  - **30** `area_plants` (6 areas × 5 species inventory)
  - **4** `pruning_requests` in mixed statuses (`submitted`/`submitted`/`approved`/`rejected`)
  - **5** `plant_seeds` + **5** `seed_transactions` (initial purchase ledger)
  - **84** `service_capacity` rows with `capacity_units=5` so testers can actually book pruning slots

### Standalone Phase 3 seed (development convenience)

```bash
docker exec sekar-backend npm run db:seed:phase3:prod
```

Runs only the Phase 3 sections via the original entry point. Same idempotency guarantees. Useful when you need to top up Phase 3 data without touching Phase 1/2.

---

## 🚀 Incremental Deploy Procedure

### Step 0: Pre-Deploy Checklist

- [ ] All backend tests passing: `cd be && npm test` (1,297 tests expected)
- [ ] TypeScript clean: `cd be && npx tsc --noEmit`
- [ ] Web build clean: `cd fe/web && npm run build`
- [ ] Mobile: `cd fe/mobile && npm test -- --passWithNoTests` (passes)
- [ ] Token pipeline: `npm run tokens:verify` (no drift)
- [ ] Database backup taken (RDS automated snapshot or manual `pg_dump`)
- [ ] Redis provisioned and endpoint noted — Upstash (free) or ElastiCache (paid). See "Infrastructure Changes — Redis 7" section. **Optional for first cut: backend degrades gracefully without Redis.**
- [ ] New env vars added to GitHub Secrets `BACKEND_ENV_PRODUCTION` (only the ones you have values for)

### Step 1: Push to `main` → auto-deploy backend

```bash
git push origin main
# → GitHub Actions: backend-ci-cd.yml triggers
# → Lint → Test → Build ECR image → SSH deploy to production
# Monitor: https://github.com/org/sekar/actions
```

Expected CI/CD time: 20–25 minutes.

### Step 2: Run Phase 3 migrations

```bash
ssh -i sekar-prod-key.pem ec2-user@<PROD_IP>
docker exec sekar-backend npm run migration:run:prod
# Verify output ends with:
#   "Migration 17460000000000-Phase3Schema has been executed successfully"
#   "Migration 17460001000000-Phase3BackfillIndexes has been executed successfully"
```

### Step 3: Seed Phase 3 reference data

For a **cold-start prod** (no users/data yet), the reference seeder now bundles Phase 3:
```bash
docker exec sekar-backend npm run db:seed:prod
# Expected log highlights:
#   ✓ 5 monitoring configs (Phase 2D)
#   🌳 Seeding Phase 3 reference data...
#   ✓ 128 new plant_species inserted (0 already existed)
#   ✓ 4 new Phase 3 monitoring_configs inserted (0 already existed)
#   ✓ 84 new service_capacity rows (7 rayons × 12 weeks, capacity_units=0)
#   ✓ Default superadmin (admin / password123) — change password after first login!
```

For an **existing prod that already has Phase 1/2 data and just needs Phase 3 added on top** (this is the path taken Apr 27):
```bash
docker exec sekar-backend npm run db:seed:phase3:prod
# Idempotent — only inserts rows that don't already exist.
```

### Step 4: Verify backend health

```bash
# Health check
curl https://api.sekar.wahyutrip.com/api/v1/health
# → {"status":"ok"}

TOKEN=$(curl -s -X POST https://api.sekar.wahyutrip.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"admin","password":"password123"}' | jq -r '.data.access_token')

# Check new snapshot endpoint
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.sekar.wahyutrip.com/api/v1/monitoring/snapshot" | jq '.success'
# → true

# Check plant species seeded
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.sekar.wahyutrip.com/api/v1/plant-species" | jq '.meta.total'
# → 124 (or higher if already existed)

# Verify monitoring configs include new Phase 3 entries
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.sekar.wahyutrip.com/api/v1/monitoring/config" | jq '[.[].key]'
# Should include: "staffing_debounce_seconds", "cluster_zoom_threshold"
```

### Step 5: Deploy web (auto on push to `main`)

The web deploy triggers automatically via `web-ci-cd.yml` when `fe/web/**` changes.

**Verify new web features:**
```bash
# Open https://sekar.wahyutrip.com/monitoring in browser
# - Monitoring page should load without errors
# - HierarchyFilterPanel visible (Kota / Rayon / Area scope selector)
# - Worker list is virtualized (check with DevTools — no DOM overflow)
```

### Step 6: Mobile APK (manual build)

```bash
cd fe/mobile
npm install
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

Distribute via internal channel. The `featureFlags.clusterMarkersV2` defaults to `false` so all legacy marker rendering is unchanged.

---

## 🔄 Rollback Procedure

### Redis failure (graceful degradation)

Phase 3 is designed to degrade gracefully:
- If Redis goes down: `StatusProjectorService` will log warnings on each cron tick but not crash
- `LocationService` falls back to synchronous latest-ping processing
- Socket.IO Redis adapter falls back to in-memory (single-instance) mode

No rollback needed for a Redis outage — just fix Redis.

### Full backend rollback

```bash
ssh ec2-user@<PROD_IP>
cd ~/sekar/backend

# Roll back the 2 Phase 3 migrations
docker exec sekar-backend npm run migration:revert:prod  # reverts Phase3BackfillIndexes
docker exec sekar-backend npm run migration:revert:prod  # reverts Phase3Schema

# Deploy previous image
docker pull <ECR_URI>/sekar-backend:<PREVIOUS_SHA>
docker-compose -f docker-compose.prod.yml up -d
```

> **Warning:** Rolling back Phase3Schema drops all 8 Phase 3 tables and removes the `staff_kecamatan` enum value. Only do this in an emergency — any Phase 3 seed data will be lost.

---

## ✅ Smoke Test Checklist

Run after every Phase 3 deploy:

### Backend
- [ ] `GET /api/v1/health` → `{"status":"ok"}`
- [ ] `GET /api/v1/monitoring/snapshot` → `{"success":true}` (requires JWT)
- [ ] `GET /api/v1/monitoring/snapshot?scope=rayon&id=<rayon_uuid>` → scope enforcement works (kepala_rayon returns only their rayon)
- [ ] `GET /api/v1/monitoring/config` → includes `staffing_debounce_seconds` key
- [ ] New tables exist in DB: `plant_species`, `area_plants`, `pruning_requests`, `service_capacity`, `plant_seeds`, `seed_transactions`, `notable_plants`, `activity_plant_items`
- [ ] `user_role` enum includes `staff_kecamatan`: `SELECT enum_range(NULL::user_role);`
- [ ] `plant_species` count ≥ 124: `SELECT count(*) FROM plant_species;`
- [ ] Redis connected: check backend logs for `Socket.IO Redis adapter active`

### Web Dashboard
- [ ] Monitoring page loads at `/monitoring`
- [ ] `staff_kecamatan` login redirects away from `/monitoring`
- [ ] HierarchyFilterPanel scope selector works (Kota / Rayon / Area)
- [ ] AreaDetailDrawer opens when area selected
- [ ] Worker list scrolls without layout thrash (virtualized)
- [ ] `status:v2` WebSocket event patches worker status in real-time (test by clocking in/out a worker)

### Mobile App
- [ ] MapDashboard loads without crash
- [ ] `BoundaryOverlay` reloads on tab refocus (Apr 24 fix preserved)
- [ ] `MonitoringToggleSheet` opens via FAB layers button
- [ ] `AreaStatusOverlay` renders (may be transparent if no plant data yet)
- [ ] `featureFlags.clusterMarkersV2 = false` → individual markers shown as before

---

## 📦 Phase 3 Endpoints Inventory

### Pruning Requests Module (3-9, 3-10)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/pruning-requests` | GET | admin_data, admin_system | List all requests (paginated, filterable by status/rayon) |
| `/api/v1/pruning-requests/:id` | GET | admin_data, admin_system, staff_kecamatan | Fetch single request detail |
| `/api/v1/pruning-requests` | POST | staff_kecamatan | Submit new pruning request |
| `/api/v1/pruning-requests/:id/review` | POST | admin_data, admin_system | Approve/reject request (disposition transition) |
| `/api/v1/pruning-requests/:id/convert` | POST | admin_data, admin_system | Convert approved request to task |
| `/api/v1/pruning-requests/:id/cancel` | POST | staff_kecamatan (own only) | Cancel own submitted request |

### Service Capacity Module (3-11)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/service-capacity/grid` | GET | kepala_rayon, admin_system | Fetch weekly grid (7 rayons × 12 weeks) with capacity units per service_type |
| `/api/v1/service-capacity` | PUT | kepala_rayon, admin_system | Update capacity units for a rayon + week + service_type |
| `/api/v1/service-capacity/suggested-week` | GET | admin_data, admin_system | Suggest least-booked week for a rayon (for auto-scheduling) |

### Plant Seeds Module (3-12)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/plant-seeds` | GET | kepala_rayon, admin_system | List all seed inventory rows (with balances) |
| `/api/v1/plant-seeds/:id` | GET | kepala_rayon, admin_system | Fetch single seed entry + transaction ledger |
| `/api/v1/plant-seeds` | POST | admin_system | Add new seed type to inventory |
| `/api/v1/plant-seeds/:id/transaction` | POST | admin_system, kepala_rayon | Record purchase, usage, or waste transaction (idempotent on `reference_code`) |
| `/api/v1/plant-seeds/:id` | PUT | admin_system | Update seed metadata (name, supplier, cost per unit, etc.) |

**Total new endpoints:** 11 (plus 2 existing `POST /monitoring/subscribe` and `DELETE /monitoring/unsubscribe` for web push, deferred to Phase 4)

---

## 🎯 Phase 3 UAT & Demo Path (Multi-Role)

### Pre-Demo Checklist

```bash
cd /path/to/sekar
./scripts/infra.sh start                   # Bring up Docker services
cd be && npm run migration:run && npm run db:seed:prod
cd be && npm run start:dev
# In separate terminals:
cd fe/web && npm run dev           # http://localhost:3001
cd fe/mobile && npm run android    # Or: npm run ios
```

### UAT Flows by Role

#### 1. Staff Kecamatan (staff_kecamatan) — Submit Pruning Request
**User:** `staff_kec_pusat` / `password123` | **Phone:** 081200000023

**Mobile (or web at `/mobile` responsive):**
1. Log in with staff_kecamatan credentials
2. Tap "Kecamatan" tab (role-gated nav)
3. Tap "Ajukan Permintaan" button → `SubmitScreen` opens
4. Form pre-fills with demo area (Taman Bungkul), species dropdown + multi-select
5. Select 2–3 species (e.g., Mahoni, Pohon Asam)
6. Tap "Kirim" → request queued (offline) or submitted (online) → toast feedback
7. Tap "Permintaan Saya" → see submitted request in `MyRequestsScreen`
8. Tap request → `RequestDetailScreen` shows detail + status (submitted, under_review, approved, rejected, done)

**Expected:** Request appears in `/api/v1/pruning-requests` on backend within 2 seconds (WS sync).

#### 2. Admin Data (admin_data) — Review & Disposition
**User:** `admin_data1` / `password123` | **Rayon:** Pusat scope only (ADR-032)

**Web Dashboard:**
1. Log in with admin_data credentials
2. Navigate to "Pruning Requests" or "Kecamatan / Permintaan"
3. See a paginated list of submitted + under_review requests (scoped to own rayon)
4. Click a request → `RequestDetailModal` / side drawer with form
5. Fill disposition: **Approve** (→ approved status) or **Reject** (→ rejected, with rejection reason)
6. Tap "Simpan" → status updates in real-time
7. If approved, a new "Convert to Task" button appears (admin_system role required to execute; admin_data can see but not click)

**Expected:** Disposition change visible on mobile `RequestDetailScreen` via WS patch within 1 s.

#### 3. Admin System (admin_system) — Convert & Capacity View
**User:** `admin_system1` / `password123` | **Scope:** City-wide

**Web Dashboard:**
1. Log in with admin_system
2. Navigate to "Pruning Requests" → see ALL requests across all rayons
3. Click an approved request → click "Convert to Task" button → `ConvertToTaskSheet` modal
4. Modal shows:
   - Original request (species, areas affected)
   - "Create as Task?" checkbox (prepopulates task_type='pruning', due_date from forecast)
   - Confirm button
5. Tap "Buat Task" → request status → converted, new task created + visible in `/tasks` endpoint
6. Navigate to "Service Capacity" or "Kapasitas Layanan"
7. See 7 rayons × 12 weeks grid with capacity_units per week
8. Click a cell → update capacity for that rayon + week (e.g., set to 10 units/week for Rayon Pusat week 15)
9. See real-time updates in the grid

**Expected:** Task appears instantly; capacity updates visible to kepala_rayon of that rayon within 1 s.

#### 4. Kepala Rayon (kepala_rayon) — Capacity & Plant Seeds
**User:** `kepala_pusat` / `password123` | **Rayon:** Pusat scope only

**Web Dashboard:**
1. Log in with kepala_rayon
2. Navigate to "Service Capacity"
3. See ONLY own rayon's 12 weeks (not other rayons)
4. Click a cell → view capacity_units for that week (read-only OR limited edit if permission extended — see ADR-032)
5. Navigate to "Plant Seeds" (sub-admin menu, if exposed in Phase 3)
6. See seed inventory: name, current balance, transaction history
7. Click a seed → open `SeedDetailScreen` / modal:
   - Transaction ledger (date, quantity, type: purchase/usage/waste, balance_after)
   - "Add Transaction" button
8. Tap "Add Transaction" → form with: quantity, type, reference_code, notes
9. Submit → ledger updates, balance recalculated
10. Tap back → balance on list reflects change (within 1 s)

**Expected:** All balance calculations match: `balance = initial_qty + Σ(purchase) - Σ(usage) - Σ(waste)`.

#### 5. Satgas / Linmas — Monitoring + Plant Status Chip (3-8 light)
**User:** `satgas_pusat_1` / `password123` | **Role:** satgas

**Mobile:**
1. Log in with satgas
2. Tap "Monitoring" tab → MapDashboardScreen
3. See worker cluster markers on map + "Area Status Overlay" with area-name + staffing (deprecated; Phase 3 M3+M4 cleans this up)
4. Tap a pruning task in task list → `TaskDetailScreen`
5. See new `PlantStatusChip` widget (for tasks with `task_type='pruning'` and plant items linked)
6. Chip shows: species icon + name, status (pending/partial/done), due_date countdown
7. Tap chip → readonly view of which species planted / in progress (3-8 light = read-only; 3-7 allows edit)

**Expected:** Chip renders without crash; color coding matches Phase 3 token system.

---

## 🩹 Web CI/CD Fix (required before web Phase 3 ships)

The web pipeline has been failing since Apr 26 with:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'eslint-plugin-sekar-design'
imported from /home/runner/work/sekar/sekar/fe/web/eslint.config.mjs
```

**Cause:** the local design-token ESLint plugin is symlinked into `node_modules/eslint-plugin-sekar-design` only when you run `npm install` at the repo root (the root `package.json` has a `postinstall` that does the symlink). The web CI job runs `npm install` only inside `fe/web/`, so the symlink never gets created.

**Fix options (any one):**

1. **(Quickest) Add a root-level `npm install` to `web-ci-cd.yml`** before the `cd fe/web` step:
   ```yaml
   - name: Install root tooling (eslint-plugin-sekar-design symlink, token pipeline)
     run: npm install
     working-directory: .

   - name: Install web deps
     run: npm install
     working-directory: fe/web
   ```

2. **(Cleanest) Publish `eslint-plugin-sekar-design` as a versioned local file dep** in `fe/web/package.json`:
   ```json
   "devDependencies": {
     "eslint-plugin-sekar-design": "file:../../eslint-plugin-sekar-design"
   }
   ```
   Then drop the root postinstall symlink. Same fix needed in `fe/mobile/package.json` if mobile lint also breaks in CI.

3. **(Workaround) Make the rule `optional`** in `fe/web/eslint.config.mjs` by wrapping the import in a try/catch and skipping the plugin if missing. Not recommended — defeats the lint guard.

After the fix lands, re-trigger the web pipeline:
```bash
gh workflow run web-ci-cd.yml --ref main
gh run watch --exit-status
```

---

## ⚠️ Known Limitations (Phase 3 M2)

| Limitation | Impact | Resolution |
|-----------|--------|-----------|
| `ClusterLayer` (web) doesn't integrate with existing `MonitoringMap` component | Cluster pins not visible on map yet; `useMonitoringSnapshot` data powers the sidebar list only | 3-4 deferred integration; `MonitoringMap` will need `lngLatToPixel` exposed in a follow-up |
| `PlantOverlayLayer` (mobile) is a stub | Notable plant markers not visible | Sub-phase 3-8 |
| No `plant-species` API endpoint yet | `GET /api/v1/plant-species` returns 404 | Sub-phase 3-6 (plant module) |
| `staff_kecamatan` login not yet usable | Navigation exists but no screens | Sub-phase 3-10 (pruning requests) |
| `service_capacity` API not yet exposed | Table seeded but no endpoint | Sub-phase 3-11 |

---

## 📊 Post-Deploy Monitoring

After deploy, watch these for 30 minutes:

```bash
# Redis Stream health (on EC2)
docker exec sekar-backend sh -c "redis-cli -u $REDIS_URL XLEN location:pings"
# Should be near 0 — projector drains it every second

# Stale sweeper running (check logs)
docker logs sekar-backend --tail=100 | grep "StaleStatusSweeper"

# Staffing debouncer (check logs on area changes)
docker logs sekar-backend --tail=100 | grep "Staffing"

# Error rate (should be 0 new errors)
docker logs sekar-backend --tail=200 | grep -E "ERROR|CRITICAL"
```

---

**Document Owner:** Backend Lead  
**Last Updated:** April 26, 2026  
**Status:** Ready for Phase 3 M2 incremental deploy  
**Related Docs:** [`phase-2-deployment.md`](./phase-2-deployment.md) · [`DEPLOYMENT_STATUS.md`](./DEPLOYMENT_STATUS.md) · [`infrastructure-setup.md`](./infrastructure-setup.md)
