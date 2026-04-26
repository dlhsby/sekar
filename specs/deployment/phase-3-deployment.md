# Phase 3 Deployment Guide — Plants Management, Monitoring Rebuild & Public Intake

**Last Updated:** April 26, 2026
**Status:** 🟡 M1-R + M1-S + M2 Ready to Deploy (10/21 sub-phases complete)
**Target:** Incremental deploy on top of Phase 2E production

> **Reference:** See `specs/deployment/phase-2-deployment.md` for infrastructure setup, GitHub Secrets, Nginx config, and baseline procedures. This guide covers only Phase 3 incremental changes.

---

## 📋 Quick Reference

**What changes in Phase 3 M1-R + M1-S + M2 deploy:**

| Component | Change | Action Required |
|-----------|--------|----------------|
| **Backend** | `ioredis`, `@socket.io/redis-adapter` packages; `CommonModule`; 3 new services | Deploy backend image |
| **Database** | 2 new migrations (Phase3Schema + Phase3BackfillIndexes) — 8 new tables, 5 altered | Run migrations |
| **Redis** | Redis 7 added to infra (for local dev) | AWS: provision ElastiCache Redis 7 |
| **Seeds** | 124 plant species + 4 monitoring configs + service_capacity grid (idempotent) | Run `db:seed:phase3:prod` |
| **Web** | supercluster, @tanstack/react-virtual packages; monitoring page rewrite; `staff_kecamatan` nav | Deploy web image |
| **Mobile** | `monitoringV2Slice`, `ClusterMarker`, `MonitoringToggleSheet`, `AreaStatusOverlay` | Build + release APK |
| **Env vars** | 5 new backend env vars for Redis | Update `.env.production` |

**New backend tests:** 1,297 passing (up from 1,264). Coverage maintained ≥ 94%.

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

## 🏗️ Infrastructure Changes

### AWS: Provision ElastiCache Redis 7

Phase 3 requires a Redis 7 instance for:
- Redis Streams (`location:pings`) — `StatusProjectorService` reads EVERY_SECOND
- Socket.IO Redis adapter (future horizontal scale)
- `StaleStatusSweeperService` cron (`*/5 * * * *`)

```bash
# Create ElastiCache Redis 7 (single-node for Phase 3; cluster-mode deferred to Phase 4)
aws elasticache create-cache-cluster \
  --cache-cluster-id sekar-redis-prod \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name sekar-subnet-group \
  --security-group-ids <SEKAR_SG_ID> \
  --tags Key=Project,Value=SEKAR Key=Environment,Value=production

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id sekar-redis-prod \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address'
```

Add the Redis endpoint to `REDIS_URL` in your production `.env`.

> **Phase 3 note:** Redis is used for Streams + Socket.IO adapter. If Redis is unavailable at startup, the app **still starts** — `StatusProjectorService.onModuleInit` is wrapped in try/catch, and `LocationService` falls back to synchronous latest-ping processing. Redis failures are logged as warnings, not crashes.

### Update Security Group

Allow the backend EC2/ECS instance to reach ElastiCache on port 6379:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id <SEKAR_SG_ID> \
  --protocol tcp \
  --port 6379 \
  --source-group <SEKAR_SG_ID>
```

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

**Phase 3 adds a new seed script.** The seed is **idempotent** (safe to re-run):

```bash
docker exec sekar-backend npm run db:seed:phase3:prod
```

This seeds:
1. **124 plant species** (`plant_species` table) — Indonesian tree/shrub/flower catalog from CSV data. `ON CONFLICT (name_id) DO NOTHING`.
2. **4 monitoring configs** — `staffing_debounce_seconds=30`, `stale_status_sweep_cron=*/5 * * * *`, `cluster_zoom_threshold=14`, `redis_stream_max_len=100000`. `ON CONFLICT (key) DO NOTHING`.
3. **Service capacity grid** — 7 rayons × 12 ISO weeks (from current week forward) × `service_type='pruning'`, all with `capacity_units=0`. `ON CONFLICT DO NOTHING`.

> **Guard:** `db:seed:phase3` checks for the `plant_species` table before running. If Phase 3 migrations haven't been applied, it logs a warning and exits gracefully — it does NOT crash the seed chain.

Also add to `be/package.json` `scripts`:
```json
"db:seed:phase3:prod": "ts-node -r tsconfig-paths/register src/database/seeds/seed-phase3.ts"
```
(Verify this script exists — the `:prod` variant may just call the same script, which is already idempotent.)

---

## 🚀 Incremental Deploy Procedure

### Step 0: Pre-Deploy Checklist

- [ ] All backend tests passing: `cd be && npm test` (1,297 tests expected)
- [ ] TypeScript clean: `cd be && npx tsc --noEmit`
- [ ] Web build clean: `cd fe/web && npm run build`
- [ ] Mobile: `cd fe/mobile && npm test -- --passWithNoTests` (passes)
- [ ] Token pipeline: `npm run tokens:verify` (no drift)
- [ ] Database backup taken
- [ ] Redis ElastiCache instance provisioned and endpoint noted
- [ ] New env vars added to GitHub Secrets `BACKEND_ENV_PRODUCTION`

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

```bash
docker exec sekar-backend npm run db:seed:phase3:prod
# Expected output:
#   ✓ 124 new plant_species inserted
#   ✓ 4 monitoring_configs inserted
#   ✓ XX service_capacity rows inserted (7 rayons × 12 weeks)
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
