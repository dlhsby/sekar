# Phase 2 Production Deployment Guide

**Last Updated:** February 16, 2026 (Phase 2C Deployment Complete)
**Status:** ✅ Phase 2C Deployed (Backend + Web)
**Deployment Time:** Backend 15-20 min (automated) | Web 10-15 min (manual) | Total ~1h20m with fixes

> **⚠️ IMPORTANT:** This guide references domain names that need to be set up manually.
> For current deployment status and actual URLs, see: `specs/deployment/DEPLOYMENT_STATUS.md`

---

## 📋 Quick Reference

**Current Production URLs (Phase 2C):**
- API: http://api.sekar.wahyutrip.com (sekar-backend:3000)
- Web Dashboard: http://sekar.wahyutrip.com (sekar-web:3001)
- Database: RDS PostgreSQL 14 (18 tables)

**What's New in Phase 2C:**
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
- [ ] All tests passing (845/845, 90.77% coverage)

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
**Test Login:** ✅ `admin`/`admin123` works with JWT tokens

---

## 🔄 Reproducibility for Future Phases

### Current Migration System Status

✅ **WORKING** - Both migrations executed correctly via TypeORM
✅ **TRACKED** - typeorm_migrations table exists with both entries
⚠️ **MANUAL** - Migrations don't run automatically on deployment

### How Migrations Currently Execute

The migrations were executed through TypeORM's auto-sync mechanism when:
1. DATABASE_SYNCHRONIZE was temporarily enabled, OR
2. Entities were loaded and TypeORM created missing tables

**Issue:** No explicit migration runner in deployment pipeline.

### Making Future Deployments Reproducible

For **Phase 2C**, **Phase 3**, and beyond, use one of these approaches:

**Option A: Enable Auto-Migration (Recommended for Now)**
```typescript
// be/src/app.module.ts - TypeOrmModule.forRoot()
{
  // ... existing config
  synchronize: false, // Keep false for safety
  migrationsRun: true, // ADD THIS - runs migrations on startup
  migrations: ['dist/database/migrations/*.js'],
}
```

**Option B: Add Migration Step to Deployment**
```yaml
# .github/workflows/backend-ci-cd.yml
- name: Run Migrations
  run: |
    docker exec sekar-backend npm run migration:run
  # Add after container starts, before health check
```

**Option C: Manual Migration Script (Current Approach)**
```bash
# After deployment, run manually:
ssh -i key.pem user@server "docker exec sekar-backend npm run migration:run"
```

### For Next Phase Deployment (Phase 2C/3)

1. **Create migration:** `npm run migration:create src/database/migrations/Phase3Schema`
2. **Write migration SQL:** Follow InitialSchema pattern
3. **Test locally:** Drop DB, run migrations, verify schema
4. **Deploy to production:** Push to main (triggers CI/CD)
5. **Verify migration executed:** Check typeorm_migrations table
6. **Run seeding if needed:** `npm run seed:prod`

### Seeding Strategy

**Phase 1 data** (users, areas): Safe to re-run (clears old data)
**Phase 2+ data** (rayons, tasks): Consider incremental seeding scripts

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
- Mapbox maps integration
- Note: Uses `npm start` with standalone mode (warning, but functional)

### Phase 2C Deployment Prerequisites

**Infrastructure (Must Complete Before Deployment Day):**
1. ✅ Web CI/CD workflow created (`.github/workflows/web-ci-cd.yml`)
2. ⏳ AWS ECR `sekar-web` repository created
3. ⏳ GitHub Secrets added (3 new: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, MAPBOX_TOKEN)
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
  -d '{"username":"admin","password":"admin123"}'
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
| admin | admin123 | superadmin |
| korlap1 | password123 | korlap |
| korlap2 | password123 | korlap |
| satgas1 | password123 | satgas |
| satgas2 | password123 | satgas |
| satgas3 | password123 | satgas |

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

**All secrets are stored in the GitHub `production` environment** and automatically injected during deployment.

> **Important: Environment vs Repository Secrets**
>
> Secrets must be configured in the **`production` environment**, not as repository-level secrets.
> Both the `build` and `deploy` jobs reference `environment: production` in the workflow,
> so they can only access secrets stored in that environment scope.
>
> If secrets are added as repository secrets instead, the build job will fail with:
> `Error: Credentials could not be loaded, please check your action inputs`

> **Deployment Branch Policy**
>
> The `production` environment requires the `main` branch to be authorized for deployment.
> If deployments are blocked, verify that `main` is listed under:
> Settings → Environments → production → Deployment branches → Add deployment branch rule

**Navigate to GitHub Secrets:**
1. Go to: https://github.com/wahyutrip/sekar/settings/environments
2. Click on the **production** environment
3. Under "Environment secrets", click "Add secret" for each secret below

**Required: 16 Environment Secrets (in `production` environment)**

#### AWS Infrastructure (4 secrets)

**AWS_ACCESS_KEY_ID**
```bash
# Get your IAM access key
aws iam list-access-keys --user-name sekar-cicd-user
```
- Value: Your access key ID (starts with `AKIA`)

**AWS_SECRET_ACCESS_KEY**
- Value: Your IAM secret key

**AWS_S3_BUCKET**
- Value: `sekar-media-prod`

**AWS_REGION**
- Value: `ap-southeast-3`

---

#### EC2 Access (3 secrets)

**EC2_HOST**
```bash
# Get production EC2 IP
aws ec2 describe-addresses --region ap-southeast-3 \
  --filters "Name=tag:Name,Values=sekar-prod" \
  --query 'Addresses[0].PublicIp' --output text
```
- Value: EC2 Elastic IP address

**EC2_USER**
- Value: `ec2-user`

**EC2_SSH_KEY**
```bash
# View your SSH private key
cat ~/.ssh/sekar-prod-key.pem
```
- Value: Entire SSH private key (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)

---

#### Database (2 secrets)

**DATABASE_HOST**
```bash
# Get RDS endpoint
aws rds describe-db-instances --region ap-southeast-3 \
  --query 'DBInstances[?DBInstanceIdentifier==`sekar-prod-db`].Endpoint.Address' \
  --output text
```
- Value: RDS endpoint (e.g., `sekar-prod-db.xxxxx.ap-southeast-3.rds.amazonaws.com`)

**DATABASE_PASSWORD**
- Value: Your RDS master password

---

#### Authentication (2 secrets)

**Generate JWT secrets first:**
```bash
# Run this command twice to get two different secrets
openssl rand -base64 32
```

**JWT_SECRET**
- Value: First generated secret (minimum 32 characters)

**JWT_REFRESH_SECRET**
- Value: Second generated secret (MUST be different from JWT_SECRET)

---

#### Security (1 secret)

**CORS_ORIGIN**
- Value: `http://sekar.wahyutrip.com`

---

#### Firebase Cloud Messaging (3 secrets)

**Get Firebase credentials:**
1. Go to Firebase Console: https://console.firebase.google.com/
2. Project Settings → Service Accounts
3. Click "Generate new private key"
4. Save the JSON file
5. Extract the following values:

**FCM_PROJECT_ID**
- Value: `project_id` from JSON

**FCM_CLIENT_EMAIL**
- Value: `client_email` from JSON

**FCM_PRIVATE_KEY**
- Value: `private_key` from JSON (keep `\n` escape sequences as-is)

---

#### Maps (1 secret)

**MAPBOX_TOKEN**
```
Get from: https://account.mapbox.com/access-tokens/
```
- Value: Your Mapbox public token (starts with `pk.eyJ`)

---

### Verification Checklist

After adding all secrets, verify in GitHub:

Settings → Environments → production → Environment secrets

You should see exactly **16 secrets:**

**AWS (4):**
- [x] AWS_ACCESS_KEY_ID
- [x] AWS_SECRET_ACCESS_KEY
- [x] AWS_S3_BUCKET
- [x] AWS_REGION

**EC2 (3):**
- [x] EC2_HOST
- [x] EC2_USER
- [x] EC2_SSH_KEY

**Database (2):**
- [x] DATABASE_HOST
- [x] DATABASE_PASSWORD

**Auth (2):**
- [x] JWT_SECRET
- [x] JWT_REFRESH_SECRET

**Security (1):**
- [x] CORS_ORIGIN

**Firebase (3):**
- [x] FCM_PROJECT_ID
- [x] FCM_CLIENT_EMAIL
- [x] FCM_PRIVATE_KEY

**Maps (1):**
- [x] MAPBOX_TOKEN

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

### 3.1 Verify Backend API

```bash
# Health check
curl http://api.sekar.wahyutrip.com/api/health

# Expected response:
{
  "status": "ok",
  "database": "connected"
}

# Check Swagger documentation
# Open in browser: http://api.sekar.wahyutrip.com/api/docs
# Expected: 83 endpoints (40 Phase 1 + 43 Phase 2)
```

---

### 3.2 Run Database Seeding

**IMPORTANT:** After fresh start or first deployment, database is empty. Run seeding to create test users and data.

```bash
# SSH to production server
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240

# Navigate to backend directory
cd ~/sekar/backend

# Run production seeding (on running container)
docker exec sekar-backend npm run seed:prod

# Expected output:
# 🌱 Seeding database...
# 🗑️  Clearing existing data...
# 👥 Seeding users...
#   ✓ Created admin: admin
#   ✓ Created supervisor: supervisor1
#   ✓ Created supervisor: supervisor2
#   ✓ Created worker: worker1
#   ✓ Created worker: worker2
#   ✓ Created worker: worker3
# 🏷️  Seeding area types...
#   ✓ Created area type: Taman
#   ... (continues for all tables)
# ✅ Seeding completed successfully!

# Verify users were created
docker exec sekar-backend node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'sekar-db.cdsoa0g42ump.ap-southeast-3.rds.amazonaws.com',
  port: 5432,
  user: 'sekar_admin',
  password: process.env.DATABASE_PASSWORD,
  database: 'sekar_db',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => {
  return client.query('SELECT COUNT(*) FROM users');
}).then(result => {
  console.log('Users in database:', result.rows[0].count);
  return client.end();
});
"
# Expected: Users in database: 6

# Test login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected: JSON with access_token and refresh_token
```

**Test Users:**
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| supervisor1 | supervisor123 | Supervisor |
| supervisor2 | supervisor123 | Supervisor |
| worker1 | worker123 | Worker |
| worker2 | worker123 | Worker |
| worker3 | worker123 | Worker |

---

### 3.3 Verify Web Dashboard

```bash
# Homepage check
curl http://sekar.wahyutrip.com

# Expected: HTML response with Next.js app

# Open in browser: http://sekar.wahyutrip.com
# Expected: Login page loads
```

---

### 3.3 Test Phase 2 Endpoints

**Rayons (7 sectors):**
```bash
curl http://api.sekar.wahyutrip.com/api/v1/rayons

# Expected: List of 7 rayons (Rayon 1 - Rayon 7)
```

**Tasks:**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://api.sekar.wahyutrip.com/api/v1/tasks

# Expected: Task list (requires auth)
```

**Notifications:**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://api.sekar.wahyutrip.com/api/v1/notifications/my-notifications

# Expected: User notifications
```

---

### 3.4 Verify Database Migration

SSH to production EC2 to verify:

```bash
# Connect to EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<EC2_IP>

# Check backend .env file was auto-generated
cd ~/sekar/backend
ls -la .env.production
# Expected: -rw------- 1 ec2-user ec2-user (600 permissions)

# Verify no placeholders in .env
cat .env.production | grep '\${' || echo "✅ No placeholders found"

# Check migration status
docker-compose -f docker-compose.prod.yml exec backend npm run migration:show

# Expected output includes:
# [X] AddProductionIndexesAndConstraints1737006000000
# [X] Phase2DatabaseSchema1737720000000

# Verify 16 tables exist
docker exec sekar-postgres psql -U postgres -d sekar_db -c "\dt" | wc -l
# Expected: 16+ (including typeorm_migrations)

# Check backend logs
docker-compose -f docker-compose.prod.yml logs --tail=50 backend

# Check web logs
cd ~/sekar/web
docker-compose -f docker-compose.prod.yml logs --tail=50 web
```

---

### 3.5 Test Authentication Flow

**Login via API:**
```bash
curl -X POST http://api.sekar.wahyutrip.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sekar.com",
    "password": "admin123"
  }'

# Expected: { "access_token": "eyJ...", "user": {...} }
```

**Login via Web Dashboard:**
1. Open: http://sekar.wahyutrip.com/login
2. Email: `admin@sekar.com`
3. Password: `admin123`
4. Click "Login"
5. Expected: Redirects to dashboard

---

## Part 4: Troubleshooting

### Issue 1: GitHub Actions Workflow Fails

**Symptom:** Workflow fails during deployment

**Check:**
```bash
# View failed workflow logs in GitHub Actions
# Common issues:
# - Missing or incorrect GitHub Secret
# - SSH key format issues (needs BEGIN/END lines)
# - EC2 not accessible
# - RDS not accessible
```

**Fix:**
1. Check all 16 secrets are configured correctly
2. Verify EC2_SSH_KEY includes `-----BEGIN RSA PRIVATE KEY-----` lines
3. Test SSH connection: `ssh -i ~/.ssh/sekar-prod-key.pem ec2-user@<EC2_IP>`
4. Check AWS credentials: `aws sts get-caller-identity`

---

### Issue 1b: "Credentials could not be loaded" in Build Job

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

### Issue 4: Migration Fails

**Symptom:** Migration step fails during deployment

**Check logs:**
```bash
# GitHub Actions will show migration error
# Example: "Migration Phase2DatabaseSchema1737720000000 failed"
```

**Fix:**
1. SSH to EC2 and check migration status:
   ```bash
   cd ~/sekar/backend
   docker-compose -f docker-compose.prod.yml run --rm backend npm run migration:show
   ```

2. If migration is stuck, rollback and retry:
   ```bash
   docker-compose -f docker-compose.prod.yml run --rm backend npm run migration:revert
   docker-compose -f docker-compose.prod.yml run --rm backend npm run migration:run
   ```

3. If issue persists, restore database backup and re-deploy

---

### Issue 5: Web Dashboard Not Loading

**Symptom:** http://sekar.wahyutrip.com returns error

**Check:**
```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod-key.pem ec2-user@<EC2_IP>

# Check web container status
cd ~/sekar/web
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs web | tail -100

# Test locally on EC2
curl http://localhost:3001
```

**Fix:**
1. Verify NEXT_PUBLIC_API_URL was baked into Docker image:
   ```bash
   docker-compose -f docker-compose.prod.yml exec web env | grep NEXT_PUBLIC
   ```

2. Restart web:
   ```bash
   docker-compose -f docker-compose.prod.yml restart web
   ```

3. If still failing, rebuild with correct build args (update GitHub Secret MAPBOX_TOKEN and re-deploy)

---

## Part 5: Rollback Procedure

If deployment causes critical issues, rollback immediately:

### Option 1: Revert to Previous Docker Image

```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod-key.pem ec2-user@<EC2_IP>

# Backend rollback
cd ~/sekar/backend
docker pull <ECR_REGISTRY>/sekar-backend:<PREVIOUS_SHA>
docker tag <ECR_REGISTRY>/sekar-backend:<PREVIOUS_SHA> <ECR_REGISTRY>/sekar-backend:latest
docker-compose -f docker-compose.prod.yml up -d backend

# Web rollback
cd ~/sekar/web
docker pull <ECR_REGISTRY>/sekar-web:<PREVIOUS_SHA>
docker tag <ECR_REGISTRY>/sekar-web:<PREVIOUS_SHA> <ECR_REGISTRY>/sekar-web:latest
docker-compose -f docker-compose.prod.yml up -d web
```

**Find previous SHA:**
```bash
# Check ECR for recent image tags
aws ecr describe-images --repository-name sekar-backend --region ap-southeast-3 \
  --query 'sort_by(imageDetails,& imagePushedAt)[-5:].[imageTags[0], imagePushedAt]'
```

---

### Option 2: Revert Git Commit

```bash
# On local machine
cd /path/to/sekar

# Find commit to revert
git log --oneline -5

# Revert the deployment commit
git revert <COMMIT_SHA>
git push origin main

# Or hard reset (destructive!)
git reset --hard <PREVIOUS_COMMIT_SHA>
git push origin main --force

# GitHub Actions will automatically deploy the reverted version
```

---

### Option 3: Restore Database Backup

**Only if database migration caused issues:**

```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod-key.pem ec2-user@<EC2_IP>

# Stop backend
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml stop backend

# Restore backup
docker exec -i sekar-postgres psql -U postgres -d sekar_db < \
  ~/backups/<DATE>/sekar_db_pre_phase2_<TIME>.sql

# Restart backend
docker-compose -f docker-compose.prod.yml start backend
```

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
- ✅ Mapbox maps display correctly

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

**End of Deployment Guide**
