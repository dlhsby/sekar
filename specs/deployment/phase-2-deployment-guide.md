# Phase 2 Backend Deployment Guide

**Project:** SEKAR
**Date:** February 2, 2026
**Status:** Ready for Production Deployment

---

## Overview

This guide covers deploying Phase 2 backend features to AWS production environment, including:
- 6 new database tables (rayons, shift_definitions, activity_types, etc.)
- 43 new API endpoints (tasks, notifications, monitoring, KMZ import)
- Database migration automation
- FCM push notifications setup

**Estimated Time:** 2-3 hours (includes monitoring period)

---

## Pre-Deployment Checklist

### Local Verification

```bash
cd be

# 1. Verify all tests pass
npm test
# Expected: 845 tests passing, 90.77% coverage

# 2. Test unified seeder
npm run seed
# Expected: Phase 1 + Phase 2 + Tasks complete successfully

# 3. Test migration locally
# Edit .env: DATABASE_SYNCHRONIZE=false
cd ../infra
docker-compose down -v
docker-compose up -d
sleep 10
cd ../be
npm run migration:run
# Expected: "Phase2DatabaseSchema1737720000000" executed

# 4. Verify health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected"}
```

### Code Review

- [ ] All tests passing (845/845)
- [ ] Coverage ≥90% (currently 90.77%)
- [ ] No console.log or debug code
- [ ] Environment variables documented
- [ ] Migration tested locally
- [ ] Seeder tested locally

---

## Deployment Steps

### Step 1: Backup Production Database

**CRITICAL:** Always backup before deployment.

```bash
# SSH to production EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>

# Create backup directory
mkdir -p ~/backups/$(date +%Y%m%d)

# Backup database
docker exec sekar-postgres pg_dump -U postgres sekar_db > \
  ~/backups/$(date +%Y%m%d)/sekar_db_pre_phase2_$(date +%H%M%S).sql

# Verify backup created
ls -lh ~/backups/$(date +%Y%m%d)/
```

**Expected Output:**
```
-rw-r--r-- 1 ec2-user ec2-user 5.2M Feb  2 14:30 sekar_db_pre_phase2_143045.sql
```

---

### Step 2: Update Environment Variables

**Edit:** `~/sekar/.env` on production EC2

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar
nano .env
```

**Add Phase 2 variables:**

```env
# Firebase Cloud Messaging
FCM_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# Notification Settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_BATCH_SIZE=100

# Task Settings
TASK_AUTO_ASSIGN_ENABLED=false
TASK_DEADLINE_WARNING_HOURS=24

# KMZ Import
KMZ_MAX_FILE_SIZE_MB=10
KMZ_MAX_POLYGONS=100

# Database (CRITICAL - verify these)
DATABASE_SYNCHRONIZE=false
DATABASE_MIGRATIONS_RUN=false

# AWS S3 (verify existing values)
AWS_ENDPOINT_URL=
AWS_S3_FORCE_PATH_STYLE=false
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_S3_BUCKET=sekar-media-prod
AWS_REGION=ap-southeast-3
```

**Save and exit:** Ctrl+X, Y, Enter

---

### Step 3: Upload Firebase Configuration

**From local machine:**

```bash
# Upload Firebase service account JSON
scp -i ~/.ssh/sekar-prod.pem \
  /path/to/firebase-service-account.json \
  ec2-user@<ELASTIC_IP>:~/sekar/config/

# Verify upload
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
ls -l ~/sekar/config/firebase-service-account.json
# Expected: -rw-r--r-- 1 ec2-user ec2-user 2419 Feb  2 14:35 firebase-service-account.json
```

---

### Step 4: Deploy via GitHub Actions

#### Option A: Automatic Deployment (Recommended)

```bash
# On local machine
cd /path/to/sekar

# Ensure on main branch with latest changes
git checkout main
git pull origin main

# Push to trigger deployment
git push origin main

# CI/CD will automatically:
# 1. Run all 845 tests
# 2. Build Docker image
# 3. Push to ECR with production tag
# 4. SSH to EC2 and run migration
# 5. Restart containers with zero-downtime
```

#### Option B: Manual Trigger

1. Go to: https://github.com/<YOUR_ORG>/sekar/actions
2. Select "Backend CI/CD" workflow
3. Click "Run workflow" button
4. Configure:
   - **Branch:** main
   - **Environment:** production
5. Click "Run workflow"

**Monitor:** Watch GitHub Actions UI for real-time logs (5-8 minutes)

---

### Step 5: Monitor Deployment

**Watch CI/CD Pipeline:**

```
✓ Lint and Format Check (2 min)
✓ Unit Tests (3 min)
✓ Security Scan (1 min)
✓ Build (2 min)
✓ Deploy to Production:
  - ECR login
  - Create backup image
  - Pull latest image
  - Run migration ← CRITICAL
  - Restart containers
  - Show logs
✓ Smoke Tests (30 sec)
```

**If migration fails:** Deployment aborts automatically, no changes applied.

---

### Step 6: Verify Deployment

#### A. Health Check

```bash
curl http://<SERVER_IP>:3000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

#### B. Swagger Documentation

```bash
# Open in browser
http://<SERVER_IP>:3000/api/docs

# Verify endpoint count
# Should show 83 endpoints (40 Phase 1 + 43 Phase 2)
```

#### C. Test Authentication

```bash
# Login
curl -X POST http://<SERVER_IP>:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Save the access_token from response
TOKEN="<jwt_token>"
```

#### D. Test Phase 2 Endpoints

```bash
# Rayons
curl http://<SERVER_IP>:3000/api/rayons \
  -H "Authorization: Bearer $TOKEN"
# Expected: [] (empty, no data seeded yet)

# Activity Types
curl http://<SERVER_IP>:3000/api/activity-types \
  -H "Authorization: Bearer $TOKEN"
# Expected: [] (empty)

# Tasks
curl http://<SERVER_IP>:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN"
# Expected: [] (empty)

# Notifications
curl http://<SERVER_IP>:3000/api/notifications/my \
  -H "Authorization: Bearer $TOKEN"
# Expected: [] (empty)
```

#### E. Verify Database Migration

```bash
# SSH to production
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>

# Check migration status
docker exec -it sekar-postgres psql -U postgres -d sekar_db

# In PostgreSQL:
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;
# Expected: Phase2DatabaseSchema1737720000000

# Verify new tables exist
\dt
# Should show: rayons, shift_definitions, activity_types,
#              special_day_overrides, area_staff_requirements, worker_schedules

# Exit PostgreSQL
\q
```

#### F. Monitor Application Logs

```bash
# SSH to production
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar

# Watch logs (Ctrl+C to exit)
docker-compose logs -f backend | grep -E "(ERROR|WARN|INFO)"

# Look for:
# ✓ "Nest application successfully started"
# ✓ "Mapped {/api/rayons, GET}" (and other Phase 2 routes)
# ✗ No ERROR or WARN messages
```

---

## Post-Deployment Tasks

### Immediate (Day 0)

```bash
# 1. Monitor logs for 1 hour
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
docker-compose logs -f backend | grep ERROR

# 2. Test mobile app connection
# - Open mobile app
# - Login with test credentials
# - Verify GPS tracking works
# - Submit a test report
# - Check if notifications arrive (if FCM configured)

# 3. Test web dashboard
# - Login at http://<SERVER_IP>:3001
# - Navigate to Rayons page (should be empty)
# - Navigate to Tasks page (should be empty)
# - Verify no console errors
```

### Day 1

- [ ] Create production rayons via admin UI (NOT seeders)
- [ ] Import production areas via KMZ (use `/api/areas/import-kmz`)
- [ ] Create shift definitions via admin UI
- [ ] Test FCM notifications on physical device
- [ ] Verify WebSocket connections work (real-time monitoring)
- [ ] Check CloudWatch metrics (CPU, memory, disk)
- [ ] Review application logs for any warnings

### Week 1

- [ ] Monitor error logs daily
- [ ] Test task assignment workflow end-to-end
- [ ] Review FCM notification delivery rates
- [ ] Gather user feedback from supervisors
- [ ] Optimize slow queries if identified (use EXPLAIN ANALYZE)
- [ ] Review database size growth (should be minimal)
- [ ] Test backup restoration procedure

---

## Rollback Procedure

**If deployment fails or critical issues found:**

### Step 1: Stop Current Deployment

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar
docker-compose down
```

### Step 2: Revert Migration

```bash
# Revert Phase 2 migration
docker-compose run --rm backend npm run migration:revert:prod

# Verify reversion
docker exec -it sekar-postgres psql -U postgres -d sekar_db
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;
# Should NOT show Phase2DatabaseSchema1737720000000
\q
```

### Step 3: Restore Previous Image

```bash
# List available backup images
aws ecr describe-images \
  --repository-name sekar-backend \
  --query 'imageDetails[?imageTags!=`null`].imageTags' \
  --region ap-southeast-3 \
  | grep backup

# Pull backup image (replace TIMESTAMP)
docker pull <ECR_REGISTRY>/sekar-backend:backup-<TIMESTAMP>

# Tag as latest
docker tag <ECR_REGISTRY>/sekar-backend:backup-<TIMESTAMP> \
  <ECR_REGISTRY>/sekar-backend:latest

# Restart
docker-compose up -d

# Wait and verify
sleep 30
curl http://<SERVER_IP>:3000/api/health
```

### Step 4: Verify Rollback

```bash
# Should return Phase 1 functionality only
curl http://<SERVER_IP>:3000/api/docs
# Endpoint count should be ~40 (not 83)

# Phase 2 endpoints should return 404
curl http://<SERVER_IP>:3000/api/rayons \
  -H "Authorization: Bearer $TOKEN"
# Expected: 404 Not Found
```

---

## Troubleshooting

### Issue: Migration Fails

**Symptom:** Deployment aborted, error in logs

**Solution:**
```bash
# SSH to server
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar

# Check migration logs
docker-compose logs backend | grep migration

# Common issues:
# 1. Table already exists → Run migration:revert, then re-deploy
# 2. Foreign key constraint → Check data integrity
# 3. Permission denied → Verify DATABASE_USER has CREATE TABLE rights
```

### Issue: Health Check Returns 500

**Symptom:** `curl http://IP:3000/api/health` returns error

**Solution:**
```bash
# Check application logs
docker-compose logs --tail=100 backend

# Common issues:
# 1. Database connection failed → Verify DATABASE_* env vars
# 2. Missing env vars → Check .env file completeness
# 3. Port conflict → Verify port 3000 not in use
```

### Issue: FCM Notifications Not Working

**Symptom:** No notifications received on mobile

**Solution:**
```bash
# 1. Verify FCM enabled
grep FCM_ENABLED ~/sekar/.env
# Should be: FCM_ENABLED=true

# 2. Verify service account file exists
ls -l ~/sekar/config/firebase-service-account.json

# 3. Check logs for FCM errors
docker-compose logs backend | grep -i firebase

# 4. Test notification manually via Swagger
# http://IP:3000/api/docs → POST /api/notifications/broadcast
```

### Issue: Endpoints Return 401 Unauthorized

**Symptom:** All API calls return 401

**Solution:**
```bash
# 1. Verify JWT_SECRET set in .env
grep JWT_SECRET ~/sekar/.env

# 2. Re-login to get fresh token
curl -X POST http://<SERVER_IP>:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. Verify token not expired (default 7 days)
```

---

## Performance Monitoring

### Key Metrics to Watch

```bash
# 1. Database connection pool
docker-compose logs backend | grep "connection pool"
# Should maintain 10-15 connections

# 2. Memory usage
docker stats sekar-backend
# Should be <768MB

# 3. Response times
# Check Swagger → Execute requests
# Most endpoints should respond <500ms

# 4. Error rate
docker-compose logs backend | grep ERROR | wc -l
# Should be 0 after 1 hour
```

### CloudWatch Metrics (if configured)

- **CPU Utilization:** Should be <50% average
- **Memory Utilization:** Should be <70%
- **Disk I/O:** Monitor read/write patterns
- **Network Traffic:** Should align with user activity

---

## Success Criteria

✅ **Deployment successful when:**

1. All 845 tests pass in CI/CD
2. Migration executes without errors
3. Health check returns `{"status":"ok","database":"connected"}`
4. Swagger documentation shows 83 endpoints
5. Phase 2 endpoints respond correctly:
   - `GET /api/rayons` returns 200 (empty array)
   - `GET /api/activity-types` returns 200
   - `GET /api/tasks` returns 200
   - `GET /api/notifications/my` returns 200
6. Mobile app connects successfully
7. No ERROR logs for 30 minutes
8. Database has 16 tables (10 Phase 1 + 6 Phase 2)
9. WebSocket connections work (real-time monitoring)
10. FCM notifications work (if enabled)

---

## Additional Resources

- **Complete Status:** `/specs/COMPLETION_STATUS.md`
- **Phase 2 Specs:** `/specs/phases/phase-2-enhanced/STATUS.md`
- **API Documentation:** `/specs/api/contracts.md`
- **Database Schema:** `/specs/database/schema.md`
- **AWS S3 Setup:** `/specs/deployment/aws-s3-setup.md`
- **Infrastructure:** `/specs/deployment/infrastructure-setup.md`

---

## Notes

- **Never run seeders on production** with real data
- **Always backup before deployment**
- **Test migration locally first**
- **Monitor for at least 1 hour post-deployment**
- **Have rollback plan ready**
- **FCM setup assumed complete** (firebase-service-account.json available)

---

**Deployment Prepared By:** Claude Code
**Date:** February 2, 2026
**Version:** Phase 2 Enhanced
