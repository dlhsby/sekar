# Phase 2 Production Deployment Guide

> **Per-phase historical record.** Current deduplicated deploy/operate procedures live in [`deployment-guide.md`](deployment-guide.md), [`operations.md`](operations.md), and [`credentials-setup.md`](credentials-setup.md). This file is retained as the Phase 2 review record (role-system migration, GitHub-Secrets strategy, Phase 2C/2E milestones).

**Last Updated:** April 25, 2026 (Phase 2E deployed)
**Status:** ✅ Phase 2D Deployed (Mar 7, 2026) | ✅ Phase 2E Deployed (Apr 25, 2026)
**Deployment Time:** Backend 15-20 min (automated) | Web 10-15 min (automated via CI/CD on push to `main`)

> **Phase 2E deployment note (Apr 25, 2026):** Mar 15 push intent was blocked by a stale `shifts.service.spec.ts` test that still asserted the old S3-upload code path after Phase 2E's base64 selfie refactor. Test was reconciled in commit `ab67414` (Apr 25) — backend CI/CD then went green and the production deploy stage ran automatically. Phase 2E backend + web are now on production. Backend remaining vulns (18 moderate-transitive uuid<14 via typeorm/firebase-admin/@google-cloud/storage) tracked in `specs/architecture/security.md` DEP-SEC; upstream-blocked.

> **⚠️ IMPORTANT:** This guide references domain names that need to be set up manually.
> For current deployment status and actual URLs, see: `specs/COMPLETION_STATUS.md`

---

## 📋 Quick Reference

**Current Production URLs:**
- API: http://api.sekar.wahyutrip.com (sekar-backend:3000)
- Web Dashboard: http://sekar.wahyutrip.com (sekar-web:3001)
- Database: RDS PostgreSQL 14 (22 tables as of Phase 2E)

**Phase 2E (Deployed April 25, 2026):**
- ✅ Phone number login (identifier-based auth, ADR-012)
- ✅ Profile picture upload (base64 data URI — Mar 15 fix; S3 path removed for LocalStack/device compatibility), multi-area korlap assignment (ADR-013)
- ✅ Overtime clock-in/clock-out redesign (ADR-014), optional selfie (base64-stored directly)
- ✅ Admin_data + kepala_rayon clockable, audit trail module (ADR-015)
- ✅ New tables: `user_areas`, `audit_logs`
- ✅ Migration: `Phase2EClientFeedback`
- ⚠️ Breaking (already coordinated): Login DTO `username` → `identifier`
- ✅ Re-seed completed for `phone_number` and `user_areas` data (admin/superadmin run via `npm run db:seed:prod`)
- 📌 Deploy was blocked from Mar 15 → Apr 25 by stale `shifts.service.spec.ts` test asserting the old S3 selfie upload path. Reconciled in commit `ab67414`; backend CI/CD then went green and the production deploy step ran automatically.

**Phase 2D (Deployed March 7, 2026):**
- ✅ Five-status tracking system (active/inactive/outside_area/missing/offline)
- ✅ Materialized `user_tracking_status` table (O(1) lookups)
- ✅ `monitoring_configs` table (runtime-adjustable thresholds)
- ✅ Full Google Maps integration on web monitoring page
- ✅ Mobile map: polygon rendering, status colors, location trail
- ✅ WebSocket fixes (PascalCase role bug) + 3 new events

**Phase 2C (Deployed Feb 16, 2026):**
- ✅ 8-role system (satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)
- ✅ Terminology cleanup (activities, schedules, overtime - no more Indonesian paths)
- ✅ New modules: Activities, Schedules, Overtime (flat structure)
- ✅ Web dashboard deployed (Next.js 16.1.6 with Nginx proxy)
- ✅ Database: 18 tables (dropped worker_assignments, overtime_aktivitas)
- ⚠️ Breaking changes: Old mobile apps will not work

**Prerequisites:**
- [ ] All 16 GitHub Secrets configured
- [ ] Firebase project created with FCM
- [ ] AWS infrastructure ready (EC2, RDS, S3, ECR)
- [ ] All tests passing (1,264 tests, 94.51% coverage)

---

## 🔥 Fresh Start Deployment (Feb 10, 2026) - COMPLETED ✅

**What happened:** Complete database rebuild from specification to fix accumulated migration issues.

### What Was Done

1. ✅ **Rebuilt InitialSchema** from `specs/database/schema.md` exactly
2. ✅ **Fixed all column name mismatches** (check_in→clock_in, user_id→worker_id)
3. ✅ **Deployed 4 times** with iterative fixes until schema perfect
4. ✅ **Both migrations executed** (InitialSchema + Phase2DatabaseSchema)
5. ✅ **Database fully seeded** with Phase 1 + Phase 2A test data

### Final Schema Fixes Applied

**InitialSchema corrections:**
- ✅ **area_types**: Added `code` (VARCHAR(20)) and `deleted_at`
- ✅ **worker_assignments**: Changed `user_id` → `worker_id`, removed extra fields, RESTRICT delete
- ✅ **shifts**: Renamed all `check_in_*` → `clock_in_*`, GPS columns fixed, removed status/notes
- ✅ **work_reports**: Already correct (`worker_id`, `gps_lat`, `gps_lng`)
- ✅ **location_logs**: Already correct (`worker_id`, `gps_lat`, `gps_lng`)

**Lessons Learned:**
- Entities were correct; migrations had wrong column names from initial creation
- DATABASE_SYNCHRONIZE=false but TypeORM still synced at some point
- Migration tracking worked correctly once executed

### Current Database State (✅ PHASE 2C PRODUCTION)

**Executed Migrations:**
```
DATABASE_SYNCHRONIZE=true enabled (workaround)
No migrations tracked in typeorm_migrations table
Schema created from TypeORM entities directly
```

**Tables (18 total):**
- **Phase 1**: users, area_types, areas, shifts, location_logs
- **Phase 2**: rayons, shift_definitions, activity_types, special_day_overrides, area_staff_requirements, schedules
- **Phase 2C**: activities, tasks, notifications, overtimes
- **System**: typeorm_migrations
- **Dropped**: worker_assignments (Phase 2C removed), overtime_aktivitas (Phase 2C removed)

**Seeded Data:**
- 6 users (1 admin, 2 korlap, 3 satgas) with Phase 2C roles
- 7 rayons (Rayon 1 - Rayon 7)
- 100+ areas across rayons
- Sample tasks and activities
- 20 activity types across 4 roles

**API Status:** ✅ Operational at http://api.sekar.wahyutrip.com
**Web Status:** ✅ Operational at http://sekar.wahyutrip.com (CSR bailout issue)
**Test Login:** ✅ `admin`/`Password123!` works with JWT tokens

---

## 📦 Deployment Guide — Staging & Production

### Overview

| Environment | Migration Command | Seed Command | Notes |
|-------------|-------------------|--------------|-------|
| **Dev** | `npm run migration:run` | `npm run db:seed` | Full wipe+seed OK |
| **Staging (fresh)** | `npm run migration:run:prod` | `npm run db:seed:prod` | Reference data + 1 superadmin |
| **Staging (incremental)** | `npm run migration:run:prod` | *(skip unless new ref data)* | Migrations only |
| **Production (fresh)** | `npm run migration:run:prod` | `npm run db:seed:prod` | Reference data + 1 superadmin |
| **Production (incremental)** | `npm run migration:run:prod` | *(skip unless new ref data)* | Migrations only |

### Migrations

4 migrations run in order:
1. `InitialSchema1737000000000` — Phase 1 base tables (users, areas, shifts, location_logs, etc.)
2. `AddProductionIndexesAndConstraints1737006000000` — Production indexes
3. `Phase2CSchema1739390400000` — 8-role system, rename tables/columns, tasks, overtimes, schedules
4. `Phase2DMonitoringSchema1741000000000` — monitoring_configs, user_tracking_status, indexes
5. `Phase2DGapFixes1741100000000` — rayon boundary columns (boundary_polygon, center_lat, center_lng), composite index fix, GIN index on rayon boundaries

> **Note:** `notification_tokens` and `notifications` tables are NOT created by migrations. They are created by TypeORM entity sync. For staging/prod, either:
> - Run the app once with `DATABASE_SYNCHRONIZE=true`, then disable it, OR
> - Add a one-time SQL script (see Fresh Deploy below)

### Seeder Commands

```bash
# Dev (destructive — wipes all data)
npm run db:seed            # Phase 1 + Phase 2 (30 users, tasks, activities, monitoring)
npm run db:seed:phase1     # Phase 1 only (wipes + 6 base users)
npm run db:seed:phase2     # Phase 2 only (24 more users, tasks, activities, monitoring)

# Staging / Production (idempotent — safe to re-run)
npm run db:seed:prod       # Reference data only + 1 superadmin (ON CONFLICT DO NOTHING)

# Staging only — optional demo data (destructive!)
npm run db:seed:phase1:prod && npm run db:seed:phase2:prod
```

---

### Fresh Deploy — Staging

Prerequisites: EC2 instance, RDS PostgreSQL 14+, S3 bucket, ECR repository, GitHub Secrets configured.

```bash
# 1. SSH into staging server
ssh -i sekar-staging-key.pem ec2-user@<STAGING_IP>

# 2. Pull and start backend container
cd ~/sekar/backend
docker pull <ECR_URI>/sekar-backend:latest
docker-compose -f docker-compose.prod.yml up -d

# 3. Run all migrations
docker exec sekar-backend npm run migration:run:prod
# Expected: 5 migrations executed

# 4. Create tables not covered by migrations (notification_tokens, notifications)
docker exec sekar-backend sh -c "DATABASE_SYNCHRONIZE=true node -e \"
  const {DataSource} = require('typeorm');
  const ds = new DataSource(require('./dist/database/data-source').default || require('./dist/database/data-source'));
  ds.initialize().then(() => ds.synchronize().then(() => {console.log('Sync done'); ds.destroy()}));
\"" || echo "Sync via env var instead"
# Alternative: temporarily set DATABASE_SYNCHRONIZE=true in .env, restart, then disable

# 5. Seed reference data (idempotent — safe to re-run)
docker exec sekar-backend npm run db:seed:prod
# Creates: 4 area types, 7 rayons, 3 shift defs, 20 activity types,
#          5 monitoring configs (cluster_zoom_threshold=14), 4 special day overrides, 1 superadmin

# 6. (Optional) Seed demo data for staging testing
docker exec sekar-backend npm run db:seed:phase1:prod
docker exec sekar-backend npm run db:seed:phase2:prod
# Creates: 30 users, tasks, activities, monitoring status variants

# 7. Verify
curl http://<STAGING_IP>:3000/api/v1/health
# → {"status":"ok"}

TOKEN=$(curl -s -X POST http://<STAGING_IP>:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Password123!"}' | jq -r '.access_token')

curl -s -H "Authorization: Bearer $TOKEN" http://<STAGING_IP>:3000/api/v1/monitoring/config | jq
# → 5 monitoring config entries

# 8. Deploy web dashboard
cd ~/sekar/web
docker pull <ECR_URI>/sekar-web:latest
docker-compose up -d

# 9. Configure Nginx (see Phase 2C section below for template)
sudo nginx -t && sudo systemctl reload nginx
```

### Fresh Deploy — Production

Same as staging, but:
- Use production credentials and domains
- **Do NOT seed demo data** — only `npm run db:seed:prod` (reference + 1 superadmin)
- Change the default admin password immediately after first login
- Ensure `DATABASE_SYNCHRONIZE=false` in `.env.production`
- Ensure `CORS_ORIGIN` matches production domain

```bash
# 1-4: Same as staging (pull, start, migrate, sync tables)

# 5. Seed reference data only (no demo data!)
docker exec sekar-backend npm run db:seed:prod

# 6. Verify
curl https://api.sekar.wahyutrip.com/api/v1/health

# 7. Change default admin password via API or direct DB update
docker exec sekar-backend sh -c "node -e \"
  const bcrypt = require('bcrypt');
  bcrypt.hash('<NEW_SECURE_PASSWORD>', 10).then(h => console.log(h));
\""
# Then UPDATE users SET password_hash = '<hash>' WHERE username = 'admin';

# 8. Deploy web, configure Nginx, verify
```

---

### Incremental Deploy — Staging & Production

For subsequent deploys (new features, bug fixes):

```bash
# 1. SSH into server
ssh -i <KEY>.pem ec2-user@<SERVER_IP>

# 2. Pull new backend image
cd ~/sekar/backend
docker pull <ECR_URI>/sekar-backend:latest

# 3. Run pending migrations (safe — only runs new ones)
docker exec sekar-backend npm run migration:run:prod
# If no new migrations: "No migrations are pending"

# 4. (Only if new reference data was added) Seed reference data
docker exec sekar-backend npm run db:seed:prod
# Idempotent — ON CONFLICT DO NOTHING for all inserts

# 5. Restart with new image
docker-compose -f docker-compose.prod.yml up -d

# 6. Verify health
curl http://<SERVER>:3000/api/v1/health

# 7. (If web changes) Pull and restart web
cd ~/sekar/web
docker pull <ECR_URI>/sekar-web:latest
docker-compose up -d
```

**What NOT to do on incremental deploys:**
- Never run `npm run db:seed` (destructive — wipes all data)
- Never run `npm run db:seed:phase1:prod` (destructive — wipes all data)
- Never set `DATABASE_SYNCHRONIZE=true` (except during initial setup)
- Never drop the schema

---

### Environment Variables

**Staging** — see `be/.env.staging.example`
**Production** — see `be/.env.production.example`

Critical settings for non-dev environments:
```env
DATABASE_SYNCHRONIZE=false    # CRITICAL: must be false
DATABASE_MIGRATIONS_RUN=false # Run migrations manually, not on startup
NODE_ENV=staging              # or 'production'
DATABASE_SSL=true             # Required for RDS
```

`main.ts` has a startup guard that throws if `DATABASE_SYNCHRONIZE=true` in non-development environments.

---

### Rollback Procedures

**Backend (any phase):**
```bash
# Revert to previous image
docker pull <ECR_URI>/sekar-backend:<PREVIOUS_TAG>
docker tag <ECR_URI>/sekar-backend:<PREVIOUS_TAG> <ECR_URI>/sekar-backend:latest
docker-compose -f docker-compose.prod.yml up -d
```

**Database migration rollback:**
```bash
# Revert the most recent migration
docker exec sekar-backend npm run migration:revert:prod
# Repeat for each migration to undo
```

**Full database rollback (last resort):**
```bash
# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod \
  --db-snapshot-identifier <SNAPSHOT_ID>
```

> Always prefer "fix forward" over database rollbacks. Migration reverts can lose data.

---

## 🚀 Phase 2C Deployment (Client Feedback) - COMPLETED ✅

**Deployment Date:** February 16, 2026 (15:25-16:45 WIB)
**Deployment Time:** 1 hour 20 minutes
**Breaking Changes:** Yes (role system overhaul, terminology cleanup)
**Commit:** 65c7895 (main merge) + 6239094 (tsconfig fix)
**Status:** ✅ DEPLOYED

### Deployment Summary

**Services Deployed:**
- ✅ Backend: http://api.sekar.wahyutrip.com (sekar-backend:3000)
- ✅ Web: http://sekar.wahyutrip.com (sekar-web:3001)
- ✅ Database: Phase 2C schema (18 tables)

**What Was Deployed:**
1. 8-role system (satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)
2. New endpoints: `/api/v1/activities`, `/api/v1/schedules`, `/api/v1/overtime`
3. Web dashboard (first deployment)
4. Database: 18 tables total (6 Phase 1 + 11 Phase 2 + 1 Phase 2C)
5. Seeded data: 6 users, 7 rayons, 100+ areas

### Critical Issues & Fixes During Deployment

**1. Database Migration Failure** ⚠️
- **Issue:** Phase2CSchema migration failed - tries to ALTER non-existent tables
- **Root Cause:** Migration assumes Phase 2 tables exist but they weren't created
- **Workaround:** Enabled `DATABASE_SYNCHRONIZE=true` (temporary)
- **Action Required:** Disable after 48h stability period

**2. Docker Build Failure (Web)** ✅
- **Issue:** tsconfig.json excluded from Docker context
- **Error:** All module imports failed in Docker build
- **Fix:** Removed tsconfig.json from .dockerignore (commit 6239094)

**3. Missing Environment Variables (Web)** ✅
- **Issue:** NEXT_PUBLIC_* vars not baked into build
- **Fix:** Rebuilt with correct build args
- **Note:** These are build-time variables, not runtime

**4. Web CI/CD Not Triggered** ⚠️
- **Issue:** Automated deployment didn't run after merge
- **Workaround:** Manual deployment via Docker save/load
- **Follow-up:** Investigate GitHub Actions

**5. Login Page CSR Bailout** ⚠️
- **Issue:** Page uses `useSearchParams()` without Suspense wrapper
- **Impact:** Skeleton loaders until JavaScript hydrates
- **Status:** Functional but UX issue
- **Fix Required:** Wrap useSearchParams in Suspense boundary

### What's New in Phase 2C

**1. Role System Overhaul (ADR-009)**
- Expands from 3 roles to 8 roles: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin
- Removes old roles: worker, supervisor, admin, koordinator_lapangan
- Adds 11 role group constants (CLOCKABLE_ROLES, ACTIVITY_SUBMITTERS, etc.)
- Adds `users.area_id` column (nullable, FK to areas)

**2. Terminology Cleanup (ADR-010)**
- Table renames: work_reports→activities, worker_schedules→schedules
- Column renames: worker_id→user_id (in shifts, activities, location_logs)
- Module renames: reports→activities, worker-schedules→schedules
- Route changes: /aktivitas→/activities, /worker-schedules→/schedules
- Dropped tables: worker_assignments, overtime_aktivitas

**3. Module Changes**
- **Shifts:** Soft geofencing warnings (never blocks), optional area_id
- **Activities:** Scoped access by role, role-filtered activity types
- **Tasks:** Simplified 4-status workflow (removes accepted/declined), rayon-scoped tasks, tagged users
- **Overtime:** Flat structure (no nested aktivitas), simplified DTO
- **Monitoring:** Scope authorization (city/rayon/area level access control)

**4. Web Dashboard**
- First deployment of Next.js web application
- Nginx proxy configuration at /etc/nginx/conf.d/sekar-web.conf
- Google Maps integration
- Note: Uses `npm start` with standalone mode (warning, but functional)

### Phase 2C Deployment Prerequisites

**Infrastructure (Must Complete Before Deployment Day):**
1. ✅ Web CI/CD workflow created (`.github/workflows/web-ci-cd.yml`)
2. ⏳ AWS ECR `sekar-web` repository created
3. ⏳ GitHub Secrets added (3 new: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, GOOGLE_MAPS_API_KEY)
4. ⏳ Nginx configuration template reviewed (`specs/deployment/nginx-web.conf.template`)

**Documentation:**
1. ✅ Phase 2C backend spec complete
2. ✅ Phase 2C mobile spec complete
3. ✅ Phase 2C web spec complete
4. ✅ ADR-009 (role system) and ADR-010 (terminology) written
5. ✅ Deployment checklist ready (323 tests)

**Testing:**
1. ✅ Backend tests passing (845 tests, 90.77% coverage)
2. ✅ Mobile tests passing (2,141 tests, 80.31% coverage)
3. ✅ Web tests passing (84.36% coverage)
4. ✅ Database migration tested locally
5. ✅ Fresh seed data verified

### Phase 2C Actual Deployment Process (February 16, 2026)

**Backend Deployment (Automated):**
1. ✅ Merged Phase 2C to main (git push) - 65c7895
2. ✅ GitHub Actions triggered backend-ci-cd.yml
3. ✅ CI/CD: lint → test → build → push ECR → deploy EC2
4. ⚠️ Migration failed due to missing tables
5. ✅ Applied workaround: `DATABASE_SYNCHRONIZE=true` in be/.env.production
6. ✅ Seeded Phase 1 + Phase 2 data
7. ✅ Health check: PASS

**Web Deployment (Manual - CI/CD Failure):**
1. ⚠️ Web CI/CD didn't trigger automatically
2. ✅ Fixed .dockerignore (removed tsconfig.json exclusion) - commit 6239094
3. ✅ Built locally with NEXT_PUBLIC_ env vars
4. ✅ Saved Docker image: `docker save sekar-web:latest | gzip`
5. ✅ Copied to server: `scp sekar-web.tar.gz ec2-user@16.79.183.240:~/sekar/web/`
6. ✅ Loaded and started: `docker load && docker-compose up -d`
7. ✅ Created Nginx config: `/etc/nginx/conf.d/sekar-web.conf`

**Nginx Configuration:**
```bash
ssh -i ~/wahyutrip/dlhsby/taman/creds/sekar-key.pem ec2-user@16.79.183.240

sudo tee /etc/nginx/conf.d/sekar-web.conf << 'EOF'
server {
    listen 80;
    server_name sekar.wahyutrip.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3001;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    client_max_body_size 10M;
}
EOF

sudo nginx -t && sudo systemctl reload nginx
```

**Database Seeding:**
```bash
# Phase 1 (base users and areas)
npm run seed:phase1:prod

# Phase 2 (rayons, tasks, notifications)
npm run seed:phase2:prod
```

**Verification Results:**
```bash
# Backend API
curl http://api.sekar.wahyutrip.com/api/v1/health
# → {"status":"ok","timestamp":"..."}

# Login test
curl -X POST http://api.sekar.wahyutrip.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Password123!"}'
# → {"access_token":"eyJhbG..."}

# New Phase 2C endpoints
GET /api/v1/activities → 200 (2 activities)
GET /api/v1/schedules → 200 (0 schedules)
GET /api/v1/overtime → 200 (0 overtime)

# Old routes removed
GET /api/v1/aktivitas → 404
GET /api/v1/worker-schedules → 404

# Web Dashboard
curl http://sekar.wahyutrip.com
# → 307 redirect to /login

curl http://sekar.wahyutrip.com/login
# → 200 OK (HTML with skeleton loaders due to CSR bailout)
```

**Total Time:** 1 hour 20 minutes (less automated than planned)

### Phase 2C Test Credentials

**Seeded Users (6 total):**
| Username | Password | Role |
|----------|----------|------|
| admin | Password123! | superadmin |
| korlap1 | Password123! | korlap |
| korlap2 | Password123! | korlap |
| satgas1 | Password123! | satgas |
| satgas2 | Password123! | satgas |
| satgas3 | Password123! | satgas |

### Phase 2C Breaking Changes

**Mobile Apps:**
- ❌ Old mobile apps will not work
- ✅ Must update mobile app immediately after backend deployment
- ⚠️ Users will see login errors until mobile app updated

**API Routes:**
- ❌ `/api/v1/aktivitas` → 404 (use `/api/v1/activities`)
- ❌ `/api/v1/reports` → 404 (use `/api/v1/activities`)
- ❌ `/api/v1/worker-schedules` → 404 (use `/api/v1/schedules`)

**Database:**
- ❌ Phase 2B backups cannot be restored to Phase 2C schema
- ⚠️ Rollback requires RDS snapshot + code revert + mobile app rollback

### Post-Deployment Actions

**Immediate (Next 24h):**
- [ ] Monitor DATABASE_SYNCHRONIZE logs for sync issues
- [ ] Test login flow in browser (verify JavaScript hydration)
- [ ] Update mobile app to Phase 2C
- [ ] Test all critical user flows (clock-in, activities, tasks)

**Short-term (Next Week):**
- [ ] Disable DATABASE_SYNCHRONIZE=true after stability confirmed
- [ ] Fix Phase2CSchema migration to create all tables properly
- [ ] Investigate web CI/CD pipeline failure
- [ ] Fix login page CSR bailout (wrap useSearchParams in Suspense)
- [ ] Consider switching web Dockerfile to use `.next/standalone/server.js`

**Long-term:**
- [ ] Implement zero-downtime deployments with blue-green strategy
- [ ] Add CloudWatch monitoring and alerting
- [ ] Set up automated rollback on health check failure

### Known Issues

1. **Web Login CSR Bailout:**
   - Login page uses `useSearchParams()` without Suspense wrapper
   - Page shows skeleton loaders until JavaScript hydrates
   - Functional but UX impact
   - Fix: Wrap useSearchParams in Suspense boundary

2. **DATABASE_SYNCHRONIZE Enabled:**
   - Temporary workaround for migration failure
   - Must be disabled after confirming stable operations
   - Security risk in production (schema changes without migrations)

3. **Web CI/CD Pipeline:**
   - Automated deployment didn't trigger
   - Required manual deployment via Docker save/load
   - Investigate GitHub Actions workflow

4. **Standalone Mode Warning:**
   - Next.js warns about `output: 'standalone'` with `npm start`
   - Container works but should use `node .next/standalone/server.js`
   - Non-blocking but worth fixing for best practices

### Phase 2C Rollback Procedure

**If critical issues arise:**
```bash
# Backend rollback
ssh -i ~/wahyutrip/dlhsby/taman/creds/sekar-key.pem ec2-user@16.79.183.240
cd ~/sekar/backend
docker pull ${ECR_REGISTRY}/sekar-backend:65c7895  # Previous Phase 2B commit
docker-compose -f docker-compose.prod.yml up -d

# Web rollback
cd ~/sekar/web
docker stop sekar-web && docker rm sekar-web
# No previous version (first deployment)
```

**Database rollback (ONLY if migration failed mid-way):**
```bash
# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod \
  --db-snapshot-identifier sekar-phase2b-backup-YYYYMMDD
```

**⚠️ WARNING:** Database migration is partially irreversible. Do NOT rollback database after migration completes. Fix forward instead.

---

## Part 1: Pre-Deployment Preparation

### 1.1 Verify Local Environment

Run these commands to ensure everything is ready:

```bash
# 1. Verify all tests pass
cd be
npm test
# Expected: 845/845 passing, 90.77% coverage

# 2. Check for uncommitted changes
git status
# Expected: Working tree clean

# 3. Ensure on main branch
git branch --show-current
# Expected: main

# 4. Pull latest changes
git pull origin main
```

**For Fresh Local Testing** (optional):

If you want to test locally before production deployment:

```bash
# Start fresh database
cd infra
./stop.sh && ./start.sh
cd ../be

# Enable synchronize temporarily
sed -i 's/DATABASE_SYNCHRONIZE=false/DATABASE_SYNCHRONIZE=true/' .env

# Run unified seeder (creates all Phase 1 + Phase 2 tables)
npm run seed
# Expected: ✅ Phase 1/2 seeding complete

# Verify 16 tables created
docker exec -it sekar-postgres psql -U postgres -d sekar_db -c "\dt"

# Switch back to migration mode
sed -i 's/DATABASE_SYNCHRONIZE=true/DATABASE_SYNCHRONIZE=false/' .env

# Mark migrations as executed
docker exec -i sekar-postgres psql -U postgres -d sekar_db << 'SQL'
INSERT INTO typeorm_migrations (timestamp, name) VALUES
  (1737006000000, 'AddProductionIndexesAndConstraints1737006000000'),
  (1737720000000, 'Phase2DatabaseSchema1737720000000')
ON CONFLICT DO NOTHING;
SQL

# Test locally
npm run start:dev
curl http://localhost:3000/api/health
```

---

### 1.2 Configure GitHub Secrets

Phase 2 introduced the GitHub-Secrets CI/CD strategy. **Full secret/env reference:** [`environment-variables.md`](environment-variables.md) + [`credentials-setup.md`](credentials-setup.md).

---

## Part 2: Deployment Execution

### 2.1 Trigger Automated Deployment

The deployment is **fully automated** via GitHub Actions. Simply push to the main branch:

```bash
# Ensure on main branch and up to date
git checkout main
git pull origin main

# Add all changes (if any)
git add .

# Commit with descriptive message
git commit -m "feat(deployment): Phase 2 production deployment with automated secrets"

# Push to main - this triggers CI/CD
git push origin main
```

**What Happens Automatically:**

1. **Backend CI/CD** (10-12 minutes):
   - Lint & format check (2 min)
   - Run 845 tests with PostgreSQL (3-5 min)
   - Security scan (npm audit, secret scanning) (1 min)
   - Build Docker image (3-5 min)
   - Push to ECR with latest + SHA tags (1 min)
   - SSH to EC2, auto-generate `.env.production` from GitHub Secrets (30s)
   - Run database migrations (1 min)
   - Deploy backend with zero-downtime (1 min)
   - Health check verification (30s)

2. **Web CI/CD** (8-10 minutes):
   - Lint & type check (2 min)
   - Run tests (2 min)
   - Build Docker image with production config (5-7 min)
   - Push to ECR (1 min)
   - Deploy web dashboard to EC2 (1 min)
   - Health check verification (30s)

**Total deployment time: 10-15 minutes** for both services

---

### 2.2 Monitor Deployment

**Watch GitHub Actions:**

1. Go to: https://github.com/wahyutrip/sekar/actions
2. You should see two workflows running:
   - "Backend CI/CD - Production"
   - "Web Dashboard CI/CD - Production"

**Monitor progress:**

Both workflows show real-time logs. Watch for:
- ✅ Lint and Test passing
- ✅ Build completing
- ✅ **Deploy step** - this creates `.env.production` automatically
- ✅ Health checks passing

**If deployment fails:**
- Check GitHub Actions logs for error details
- Deployment aborts automatically on failure
- No changes applied to production
- Previous version remains running

---

## Part 3: Post-Deployment Verification

See [`deployment-guide.md`](deployment-guide.md) §E.7 (smoke test) for standard verification steps (health checks, endpoint tests, authentication flow).

---

## Part 4: Troubleshooting

### Issue 1b: "Credentials could not be loaded" in Build Job (Phase 2 Lesson)

**Symptom:** Build and Push to ECR job fails at "Configure AWS credentials" with:
```
Error: Credentials could not be loaded, please check your action inputs:
Could not load credentials from any providers
```

**Root Cause:** AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are stored in the `production` environment but the build job doesn't have `environment: production` set, so it can't access them.

**Fix:**
1. Ensure the build job in `.github/workflows/backend-ci-cd.yml` has `environment: production`:
   ```yaml
   build:
     name: Build and Push to ECR
     runs-on: ubuntu-latest
     needs: [test, security]
     environment: production    # Required to access environment secrets
   ```
2. Verify secrets exist in Settings → Environments → production (not just repository secrets)
3. Verify `main` branch is authorized under the production environment's deployment branch policies

---

### Issue 2: Backend .env.production Not Created

**Symptom:** Deployment succeeds but backend fails to start

**Check:**
```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<EC2_IP>
cd ~/sekar/backend
ls -la .env.production
# If file doesn't exist, envsubst failed
```

**Fix:**
1. Install envsubst on EC2:
   ```bash
   sudo yum install -y gettext
   ```

2. Manually create .env.production (emergency only):
   ```bash
   cp be/.env.example .env.production
   nano .env.production  # Fill in production values (refer to GitHub Secrets)
   chmod 600 .env.production
   docker-compose -f docker-compose.prod.yml restart backend
   ```

---

### Issue 3: Health Check Returns 500

**Symptom:** API returns 500 Internal Server Error

**Check:**
```bash
# View backend logs
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<EC2_IP>
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml logs backend | tail -100
```

**Common causes:**
- Database connection failed (check DATABASE_HOST, DATABASE_PASSWORD)
- JWT secret missing or invalid
- Firebase credentials incorrect
- S3 bucket not accessible

**Fix:**
1. Verify DATABASE_HOST is reachable:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend ping -c 3 <RDS_ENDPOINT>
   ```

2. Check environment variables loaded:
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend env | grep DATABASE
   ```

3. Restart backend:
   ```bash
   docker-compose -f docker-compose.prod.yml restart backend
   ```

---

For additional troubleshooting (migrations, web dashboard, CI/CD workflows), see [`operations.md`](operations.md).

## Part 5: Rollback Procedure

See [`operations.md`](operations.md) §Releases & Rollback for standard rollback procedures.

---

## Part 6: Secret Management

### Updating Secrets

To update any secret after deployment:

1. Go to: https://github.com/wahyutrip/sekar/settings/environments
2. Click on **production** environment
3. Find the secret under "Environment secrets"
4. Click "Update"
5. Enter new value and save
6. Push to main branch to trigger re-deployment:
   ```bash
   git commit --allow-empty -m "chore: update production secrets"
   git push origin main
   ```

CI/CD will automatically regenerate `.env.production` with new values.

---

### Secret Rotation Schedule

**Quarterly (Every 90 Days):**

1. Rotate JWT secrets:
   ```bash
   # Generate new secrets
   openssl rand -base64 32  # JWT_SECRET
   openssl rand -base64 32  # JWT_REFRESH_SECRET
   ```

2. Rotate AWS IAM keys:
   - Go to AWS IAM Console
   - Create new access key for sekar-cicd-user
   - Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub Secrets

3. Deploy:
   ```bash
   git commit --allow-empty -m "chore: quarterly secret rotation"
   git push origin main
   ```

4. After 24-hour verification, deactivate old AWS keys

**Annually:**

1. Rotate database password via AWS RDS Console
2. Update `DATABASE_PASSWORD` in GitHub Secrets
3. Deploy

**Total maintenance: ~2 hours/year**

---

## Success Criteria

Deployment is successful when:

**Backend:**
- ✅ Health check returns `{"status":"ok","database":"connected"}`
- ✅ Swagger shows 83 endpoints at http://api.sekar.wahyutrip.com/api/docs
- ✅ Login endpoint works
- ✅ Phase 2 endpoints accessible (rayons, tasks, notifications)
- ✅ `.env.production` exists on EC2 with 600 permissions
- ✅ No secrets visible in GitHub Actions logs

**Web:**
- ✅ Dashboard loads at http://sekar.wahyutrip.com
- ✅ Login page functional
- ✅ Can authenticate and access dashboard
- ✅ Google Maps display correctly

**Database:**
- ✅ All 16 tables exist
- ✅ Both migrations marked as executed
- ✅ Seeded data present (7 rayons, test users)

**Monitoring:**
- ✅ No errors in backend logs
- ✅ No errors in web logs
- ✅ Containers running with correct health status

---

## Quick Command Reference

```bash
# Pre-deployment checks
npm test                    # Run all tests
git status                  # Check for uncommitted changes
git pull origin main        # Get latest changes

# Deploy (automated)
git push origin main        # Triggers CI/CD

# Monitor
# Go to: https://github.com/wahyutrip/sekar/actions

# Verify
curl http://api.sekar.wahyutrip.com/api/health
curl http://sekar.wahyutrip.com

# SSH to EC2 (if needed)
ssh -i ~/.ssh/sekar-prod-key.pem ec2-user@<EC2_IP>

# Check backend logs
cd ~/sekar/backend && docker-compose -f docker-compose.prod.yml logs backend

# Check web logs
cd ~/sekar/web && docker-compose -f docker-compose.prod.yml logs web

# Restart services
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart web
```

---

## Additional Resources

- **Environment Variables:** See `be/.env.example` for local development
- **Production Secrets:** All 16 secrets documented in Section 1.2 above
- **Deployment Script:** Run `./scripts/deploy-production.sh` for guided deployment
- **API Documentation:** http://api.sekar.wahyutrip.com/api/docs
- **Phase 2 Status:** See `specs/phases/phase-2-enhanced/STATUS.md`

---

## Notes

- **Production-only deployment:** This guide covers only production (main branch)
- **Automated secret management:** All secrets injected via GitHub Actions
- **Zero-downtime:** Docker Compose ensures no service interruption
- **Rollback-ready:** Previous images tagged with backup timestamps
- **No manual .env editing:** All environment variables managed via GitHub Secrets

**Last deployed:** Check GitHub Actions for latest successful deployment
**Next maintenance:** Quarterly secret rotation (90 days from deployment)

---

## 🚀 Phase 2D Deployment (Monitoring Reimplementation) — DEPLOYED

**Status:** ✅ Deployed (March 7, 2026)
**Branch:** main
**Breaking Changes:** Additive only (non-breaking for Phase 2C clients)

### Pre-Deployment Checklist

- [ ] All backend tests passing (1,204 tests, 62 suites, 94.55% line coverage)
- [ ] All mobile tests passing (~3,493 tests)
- [ ] Database migration scripts reviewed and tested (2 migrations: `1741000000000` + `1741100000000`)
- [ ] Backfill script for `user_tracking_status` tested on staging
- [ ] Google Maps API key configured for production domain (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
- [ ] WebSocket event handlers verified on staging (including `AREA_STAFFING_CHANGED`)
- [ ] Monitoring config seed data reviewed (`cluster_zoom_threshold: 14`)
- [ ] Rayon boundary recompute verified after area boundary updates

### Database Migration

Run in order after merging to main:

```sql
-- 1. monitoring_configs table
CREATE TABLE monitoring_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_tracking_status table
CREATE TABLE user_tracking_status (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    shift_definition_id UUID REFERENCES shift_definitions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'offline',
    last_latitude DECIMAL(10, 8),
    last_longitude DECIMAL(11, 8),
    last_accuracy_meters DECIMAL(6, 2),
    last_battery_level INTEGER,
    last_location_at TIMESTAMPTZ,
    is_within_area BOOLEAN DEFAULT TRUE,
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_tracking_status CHECK (status IN ('active','inactive','outside_area','missing','offline'))
);

-- 3. Add shift_definition_id to shifts table
ALTER TABLE shifts ADD COLUMN shift_definition_id UUID REFERENCES shift_definitions(id) ON DELETE SET NULL;

-- 4. Indexes
CREATE INDEX idx_uts_status ON user_tracking_status(status);
CREATE INDEX idx_uts_area_id ON user_tracking_status(area_id);
CREATE INDEX idx_uts_shift_id ON user_tracking_status(shift_id);
CREATE INDEX idx_uts_updated_at ON user_tracking_status(updated_at);
CREATE INDEX idx_uts_status_area ON user_tracking_status(status, area_id);
CREATE INDEX CONCURRENTLY idx_location_logs_user_shift_time ON location_logs(user_id, shift_id, logged_at DESC);
CREATE INDEX idx_areas_boundary_polygon ON areas USING GIN(boundary_polygon);
CREATE INDEX idx_shifts_shift_definition_id ON shifts(shift_definition_id);

-- 5. Seed default monitoring config
INSERT INTO monitoring_configs (key, value, description) VALUES
('status_thresholds', '{"active_max_age_seconds": 300, "inactive_threshold_seconds": 900, "missing_threshold_seconds": 3600, "location_ping_interval_seconds": 60}', 'Thresholds for determining user tracking status'),
('geofencing', '{"tolerance_meters": 50, "outside_area_grace_seconds": 120}', 'Geofencing tolerance and grace period settings'),
('map_defaults', '{"center_lat": -7.2575, "center_lng": 112.7521, "zoom": 12, "cluster_zoom_threshold": 14}', 'Default map view configuration'),
('alerts', '{"low_battery_threshold": 15, "understaffed_notify": true, "missing_user_notify": true}', 'Alert notification settings'),
('location_ping', '{"interval_seconds": 60, "batch_size": 10}', 'Location ping batch settings');

-- 6. Backfill user_tracking_status from active shifts
INSERT INTO user_tracking_status (user_id, shift_id, status, area_id, updated_at)
SELECT s.user_id, s.id, 'offline', u.area_id, NOW()
FROM shifts s JOIN users u ON s.user_id = u.id
WHERE s.clock_out_time IS NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_tracking_status (user_id, status, area_id, updated_at)
SELECT id, 'offline', area_id, NOW() FROM users
WHERE deleted_at IS NULL AND id NOT IN (SELECT user_id FROM user_tracking_status)
ON CONFLICT (user_id) DO NOTHING;
```

### Backend Deployment Steps

```bash
# 1. Run database migrations
cd be && npm run migration:run

# 2. Seed monitoring configs
cd be && npm run seed

# 3. Deploy backend image
docker build -t sekar-backend .
docker tag sekar-backend:latest <ECR_URI>/sekar-backend:phase-2d
docker push <ECR_URI>/sekar-backend:phase-2d

# 4. Verify cron job running (every 60s)
docker logs sekar-backend --since 5m | grep "MonitoringScheduler"
```

### Web Environment Variables (Phase 2D additions)

```env
# Google Maps (NEW — required for Phase 2D monitoring map)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# WebSocket (existing)
NEXT_PUBLIC_WS_URL=wss://api.sekar.wahyutrip.com
```

### New Endpoints (9)

- `GET /monitoring/users/:userId/location-history`
- `GET /monitoring/users/:userId/day-summary`
- `GET /monitoring/config`
- `PATCH /monitoring/config/:key`
- `GET /monitoring/staffing-summary`
- `GET /monitoring/boundaries` — rayon/area boundary polygons with staffing summary (hierarchical)
- `POST /monitoring/reassign` — reassign worker to different area (creates new schedule)
- `GET /areas/:id/boundary`
- `PUT /areas/:id/boundary` — also triggers `RayonBoundaryService.recompute()`

### New WebSocket Events

- `user:status-changed` — emitted when tracking status changes
- `user:left-area` — emitted when user moves outside area boundary
- `user:entered-area` — emitted when user moves inside area boundary
- `user:reassigned` — emitted when worker is reassigned to a new area
- `area:staffing-changed` — emitted when area staffing crosses threshold (payload: `areaId`, `rayonId`, `activeCount`, `requiredCount`, `isMet`)
- Enhanced `user:location` — now includes `status`, `is_within_area`, `shift_name`

### WebSocket Room Prefix

All monitoring events use `monitoring:` room prefix:
- `monitoring:city` — city-wide events
- `monitoring:rayon:{rayonId}` — rayon-scoped events
- `monitoring:area:{areaId}` — area-scoped events

### Post-Deployment Verification

```bash
TOKEN=$(curl -s -X POST http://api.sekar.wahyutrip.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Password123!"}' | jq -r '.access_token')

curl -s -H "Authorization: Bearer $TOKEN" http://api.sekar.wahyutrip.com/api/v1/monitoring/config
# → 5 config entries (status_thresholds, geofencing, map_defaults, alerts, location_ping)

curl -s -H "Authorization: Bearer $TOKEN" http://api.sekar.wahyutrip.com/api/v1/monitoring/staffing-summary
# → per-role breakdown

curl -s -H "Authorization: Bearer $TOKEN" "http://api.sekar.wahyutrip.com/api/v1/monitoring/live-users?status=active"
# → active users from user_tracking_status

curl -s -H "Authorization: Bearer $TOKEN" http://api.sekar.wahyutrip.com/api/v1/monitoring/boundaries
# → hierarchical rayon/area boundaries with staffing_summary

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"user_id":"<user-id>","target_area_id":"<area-id>"}' \
  http://api.sekar.wahyutrip.com/api/v1/monitoring/reassign
# → reassignment response with new_schedule_id
```

**Database checks:**
```sql
SELECT COUNT(*) FROM monitoring_configs;   -- Should be 5
SELECT COUNT(*) FROM user_tracking_status; -- Should match user count
SELECT indexname FROM pg_indexes WHERE tablename = 'user_tracking_status';
-- Should include: idx_uts_status, idx_uts_area_id, idx_uts_shift_id, idx_uts_updated_at, idx_uts_status_area
SELECT column_name FROM information_schema.columns WHERE table_name = 'rayons' AND column_name IN ('boundary_polygon', 'center_lat', 'center_lng');
-- Should return 3 rows (rayon boundary columns from gap fix migration)
```

**Web checks:**
- [ ] `/monitoring` loads with Google Maps map and area polygons
- [ ] User markers show correct status colors (green/amber/purple/red/gray)
- [ ] Side panel filters work and show staffing summary
- [ ] `/monitoring/config` accessible for admin_system/superadmin only (403 for others)
- [ ] Rayon boundaries display on map when available
- [ ] Staffing threshold alerts visible (area:staffing-changed events)

### Phase 2D Rollback

```bash
# Backend: revert to Phase 2C image
docker pull <ECR_URI>/sekar-backend:phase-2c
docker tag <ECR_URI>/sekar-backend:phase-2c <ECR_URI>/sekar-backend:latest
# Restart ECS service

# Database: drop Phase 2D additions (WARNING: destroys monitoring data)
-- Revert gap fix migration (1741100000000)
ALTER TABLE rayons DROP COLUMN IF EXISTS boundary_polygon;
ALTER TABLE rayons DROP COLUMN IF EXISTS center_lat;
ALTER TABLE rayons DROP COLUMN IF EXISTS center_lng;
DROP INDEX IF EXISTS idx_rayons_boundary_polygon;

-- Revert base Phase 2D migration (1741000000000)
DROP TABLE IF EXISTS user_tracking_status;
DROP TABLE IF EXISTS monitoring_configs;
ALTER TABLE shifts DROP COLUMN IF EXISTS shift_definition_id;
DROP INDEX IF EXISTS idx_location_logs_user_shift_time;
DROP INDEX IF EXISTS idx_areas_boundary_polygon;
```

### Breaking Changes (Phase 2D)

- `GET /monitoring/live-users`: `total_online` deprecated → use `total_active` (alias kept for backwards compat)
- `GET /monitoring/area/:id`: staff requirements now per-role instead of aggregate
- Phase 2C mobile app continues to work with deprecated `total_online` field

### Performance Targets

| Metric | Target |
|--------|--------|
| `/monitoring/live-users` response | < 200ms |
| `/monitoring/city` response | < 500ms (was N+1, now single join) |
| WebSocket event delivery | < 100ms |
| Cron job cycle | < 10s |
| Cache hit rate (thresholds) | > 90% |

---

## 🚀 Phase 2E Deployment (Client Feedback II) — PENDING

**Status:** ✅ Code-Complete | 🔄 Awaiting Deployment
**Branch:** main
**Breaking Changes:** Login DTO `username` → `identifier`

### Pre-Deployment Checklist

- [ ] All backend tests passing (1,264 tests, 66 suites, 94.51% line coverage)
- [ ] All mobile tests passing (3,669+ tests)
- [ ] Database migration reviewed: `1741200000000-Phase2EClientFeedback`
- [ ] Re-seed executed for phone_number data (`npm run db:seed`)
- [ ] Phone number login verified (e.g., `081300000002/Password123!`)

### Database Migration

**Migration:** `1741200000000-Phase2EClientFeedback`

**New tables:**
- `user_areas` — Junction table for multi-area korlap assignment (user_id, area_id, assignment_type, assigned_by)
- `audit_logs` — Audit trail for entity changes (entity_type, entity_id, action, actor_id, old_value/new_value JSONB)

**Altered tables:**
- `users` — Added `phone_number` (varchar(20), unique partial index, nullable), `profile_picture_url` (text, nullable)
- `shifts` — Added `is_overtime` (boolean, default false)
- `overtimes` — Added `shift_id` (UUID FK, nullable); made `end_datetime`, `activity_type_id`, `description` nullable; added `IN_PROGRESS` to status enum
- `user_tracking_status` — Added `rayon_id` (UUID FK to rayons, nullable)

### Backend Deployment Steps

```bash
# 1. Run migration
npm run migration:run
# Applies: 1741200000000-Phase2EClientFeedback

# 2. Re-seed data (destructive — wipes and re-creates all data)
npm run db:seed

# 3. Verify phone login works
curl -X POST http://api.sekar.wahyutrip.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"081300000002","password":"Password123!"}'
```

### Breaking Changes (Phase 2E)

- `POST /auth/login`: Request body changed from `{ username, password }` to `{ identifier, password }`
  - `identifier` accepts either username or phone number
  - Phase 2D mobile apps **will not work** without updating login screen
- `CLOCKABLE_ROLES` expanded: `admin_data` and `kepala_rayon` can now clock in/out
- New endpoints: `POST /overtime/start`, `POST /overtime/end`, `GET /overtime/active`

### No New Environment Variables

Phase 2E does not require any new environment variables. S3 infrastructure (for profile pictures) reuses existing AWS S3 config.

### Phase 2E Rollback

```bash
# Backend: revert to Phase 2D image
docker pull <ECR_URI>/sekar-backend:phase-2d
docker tag <ECR_URI>/sekar-backend:phase-2d <ECR_URI>/sekar-backend:latest
# Restart ECS service

# Database: revert Phase 2E migration
npm run migration:revert
# Reverts: 1741200000000-Phase2EClientFeedback
# WARNING: Drops user_areas, audit_logs tables and removes new columns
```

---

## Known Gaps (Not Bugs — Future Phase Scope)

1. **Web: Multi-area korlap UI** — Backend supports multi-area assignment via `user_areas` table, but web user management form only shows single `area_id` dropdown. Needs multi-select UI.
2. **Web: Audit trail page** — Backend `AuditModule` fully implemented (entity history, actor history, paginated queries). No web dashboard page to browse audit logs yet.

---

**End of Deployment Guide**
