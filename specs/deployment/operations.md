# SEKAR Operations & Troubleshooting Runbook

**Last Updated:** June 17, 2026  
**Audience:** DevOps engineers, on-call operators  
**Scope:** Day-2 operations, incident response, monitoring, and recovery procedures

---

## Table of Contents

1. [Database Operations](#1-database-operations)
2. [Backup & Restore](#2-backup--restore)
3. [Releases & Rollback](#3-releases--rollback)
4. [Health Checks & Daily Monitoring](#4-health-checks--daily-monitoring)
5. [Incident Procedures](#5-incident-procedures)
6. [Web-Specific Operations](#6-web-specific-operations)
7. [Quick Reference & Commands](#7-quick-reference--commands)
8. [Related Documentation](#8-related-documentation)

---

## 1. Database Operations

### Understanding the Database Layer

**Production (AWS):** AWS RDS PostgreSQL — managed service with automated backups and failover. No local PostgreSQL container.

**Development/Staging:** Local Docker PostgreSQL via `infra/docker-compose.yml`.

> CRITICAL: Production uses RDS, NOT a local Docker container. If you see "postgres service not running" in production logs, this is **expected** and normal.

### Running Migrations

**Production** uses compiled JavaScript migrations (ts-node not available in production image):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:run:prod
```

**Development** uses TypeScript source via ts-node:

```bash
cd be
npm run migration:run
```

**Verify migration status:**

```bash
# Show applied migrations (production)
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:show:prod

# Development
npm run migration:show
```

### Reverting Migrations (Emergency Only)

⚠️ Reverting drops tables and loses data. Only in emergencies.

```bash
# Production
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:revert:prod

# Development
npm run migration:revert
```

### Seeding Reference Data

**Production (non-destructive):**

Reference data (rayons, shift definitions, activity types, admin users) — safe to run repeatedly:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec \
  -e PROD_ADMIN_PASSWORD=<password> \
  -e PROD_SUPERADMIN_PASSWORD=<password> \
  -e PROD_ADMIN_SYSTEM_PASSWORD=<password> \
  backend npm run db:seed:production:prod
```

All passwords must be ≥12 characters and set. The seeder fails loudly if any are missing.

**Development (destructive):**

Wipes all tables, then reseeds for local testing:

```bash
cd be
npm run db:seed
```

**Phase-specific production seed (for cold-start):**

```bash
# Cold-start fresh production (all reference + seeded sample data)
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run db:seed:prod

# Phase 3 reference data only (idempotent, add to existing DB)
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run db:seed:phase3:prod
```

### Direct Database Access

Connect to the PostgreSQL database via psql:

```bash
# Production (RDS)
docker run -it --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db

# Development (local container)
docker exec -it sekar-postgres psql -U postgres -d sekar_db
```

**Useful SQL commands:**

```sql
-- List all tables
\dt

-- Show table structure
\d users

-- Count records in key tables
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM areas) as areas,
  (SELECT COUNT(*) FROM rayons) as rayons,
  (SELECT COUNT(*) FROM tasks) as tasks;

-- Check applied migrations
SELECT * FROM typeorm_migrations ORDER BY timestamp;

-- Active database connections
SELECT
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'sekar_db';
```

### Connection Pool Tuning

**Application pool** (in `be/src/app.module.ts`):

```typescript
extra: {
  max: 15,                    // Maximum connections
  min: 5,                     // Baseline
  idleTimeoutMillis: 60000,   // Idle timeout
  connectionTimeoutMillis: 5000
}
```

**Migration CLI pool** (in `be/src/database/data-source.ts`):

```typescript
extra: {
  max: 3,                     // Smaller for migrations
  min: 1,
  idleTimeoutMillis: 30000
}
```

**RDS connection limits** depend on instance type. Default AWS RDS t3.micro allows ~87 connections. Leave 20+ free for other operations.

If you see "Connection pool timeout" errors:

```bash
# Kill idle connections (if needed)
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'sekar_db'
    AND state = 'idle'
    AND state_change < now() - interval '5 minutes';
"
```

---

## 2. Backup & Restore

### Backup Strategy

**RDS (Production):** AWS RDS automatically creates daily snapshots with 7-day retention (configurable). No manual action needed for day-to-day.

**Manual backup (all environments):**

```bash
# Backup to file
pg_dump -h $DATABASE_HOST -U sekar_admin -d sekar_db | gzip > backup-$(date +%F-%H%M%S).sql.gz

# From EC2 (with credentials in .env.production)
docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  sh -c 'pg_dump -h $DATABASE_HOST -U sekar_admin -d sekar_db | gzip > /dev/stdout' > backup.sql.gz
```

**Media backup (S3/MinIO):**

For AWS S3 (production):
- Enable versioning on the S3 bucket
- Set up cross-region replication if needed
- Use lifecycle policies to archive old media

For MinIO (development/self-hosted):
- Snapshot the `minio-data` volume: `docker volume create minio-backup && docker run --rm -v minio-data:/data -v minio-backup:/backup alpine cp -r /data /backup/$(date +%F)`
- Or use MinIO's native backup: `mc mirror minio-alias/sekar-media backup-dir`

### Restore Procedure

**RDS point-in-time restore:**

```bash
# Via AWS CLI
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier sekar-db \
  --target-db-instance-identifier sekar-db-restored \
  --restore-time $(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --region ap-southeast-3

# Then update DATABASE_HOST in .env.production to the restored instance
# Restart backend: docker-compose -f docker-compose.prod.yml restart backend
```

**Restore from dump file:**

```bash
gunzip < backup.sql.gz | \
  docker run -i --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db
```

**Test restore before making it the primary:**
- Always restore to a separate DB instance first
- Verify data integrity
- Test application connectivity
- Promote only when confident

### RTO/RPO Targets

- **RTO (Recovery Time Objective):** <15 minutes (RDS restore + failover)
- **RPO (Recovery Point Objective):** <24 hours (daily RDS snapshots; more frequent for critical operations)

---

## 3. Releases & Rollback

### Deploying a New Release

The standard flow is **push to main → GitHub Actions CI/CD → auto-deploy**:

```bash
git push origin main
# Monitor: https://github.com/org/sekar/actions
```

Expected CI/CD timeline:
- **Backend:** 20–25 minutes (lint, test, build image, deploy to EC2/ECS)
- **Web:** 10–15 minutes (lint, build, deploy)

### Pre-Deployment Checklist

- [ ] All tests passing locally (`npm test`)
- [ ] No `git` uncommitted changes
- [ ] Database backup taken (snapshot for RDS)
- [ ] Migration scripts tested locally
- [ ] No hardcoded secrets in code
- [ ] Health check endpoint ready (`/api/v1/health/live`)

### Rolling Back to a Previous Release

**Option 1: Quick rollback (use previous image tag)**

```bash
# SSH to production host
ssh -i ~/.ssh/sekar-key.pem ec2-user@<PROD_IP>
cd ~/sekar/backend

# Find previous image
aws ecr list-images --repository-name sekar-backend --region ap-southeast-3 \
  --query 'imageIds | sort_by(@, &imagePushedAt) | [-2]'

# Retag and deploy
docker tag <ECR_REGISTRY>/sekar-backend:<PREVIOUS_SHA> \
           <ECR_REGISTRY>/sekar-backend:latest

docker-compose -f docker-compose.prod.yml restart backend

# Verify
docker logs sekar-backend --tail=50
curl http://localhost:3000/api/v1/health
```

**Option 2: Rollback migration (if schema change caused the problem)**

```bash
docker-compose -f docker-compose.prod.yml exec backend \
  npm run migration:revert:prod
```

Then redeploy the previous image.

**Option 3: Revert the git commit and push**

```bash
git revert <bad-commit-hash>
git push origin main
# CI/CD picks up the revert and redeploys automatically
```

### Gradual Rollout (Blue-Green Deployment)

For large changes, consider running two backend instances:

1. Bring up a second backend container on a different port (e.g., 3001)
2. Test with a canary load balancer
3. Flip traffic once confident
4. Scale down the old instance

Requires updating `docker-compose.prod.yml` to support multiple backend services and Nginx upstream configuration.

---

## 4. Health Checks & Daily Monitoring

### Health Check Endpoints

**Live check** (shallow — app process running):

```bash
curl http://api.sekar.wahyutrip.com/api/v1/health/live
# Expected: 200 OK, {"status":"ok"}
```

**Readiness check** (deep — can serve requests):

```bash
curl http://api.sekar.wahyutrip.com/api/v1/health/ready
# Expected: 200 OK, {"status":"ok","database":true,"redis":true}
```

**Web health check:**

```bash
curl http://sekar.wahyutrip.com/api/health
# Expected: 200 OK
```

### Container Status

```bash
# SSH to production host
ssh ec2-user@<PROD_IP>

# Check all services
docker ps --filter "name=sekar"

# Expected statuses:
# sekar-backend      - Up (healthy)
# sekar-web          - Up (healthy)
# sekar-postgres     - Up (or not present if using RDS)
# sekar-redis        - Up (healthy)
```

### View Logs

```bash
# Real-time (follow)
docker logs sekar-backend --follow

# Last 100 lines
docker logs sekar-backend --tail=100

# Last hour
docker logs sekar-backend --since=1h

# Search for errors
docker logs sekar-backend 2>&1 | grep -i error

# Specific service
docker logs sekar-web --tail=50
```

### Resource Usage

```bash
# Current stats
docker stats sekar-backend --no-stream

# Typical limits (from docker-compose.prod.yml):
# CPU: 0.9 cores
# Memory: 768 MB limit / 512 MB reservation
```

Watch for:
- Memory usage > 90% → likely leak or spike, restart and investigate
- CPU usage > 100% → performance issue, check logs for slow operations
- Disk usage > 85% → clean up old Docker images/volumes

### Daily Monitoring Checklist

Run every 4 hours or automate with a monitoring service (CloudWatch, Datadog, etc.):

```bash
# Health check all three services
curl -s http://localhost:3000/api/v1/health/live | jq .status
curl -s http://localhost:3001/api/health | jq .status
curl -s http://localhost:6379/ping    # Redis

# Check error rate (should be < 0.1%)
docker logs sekar-backend --since=1h 2>&1 | grep -c "ERROR\|CRITICAL"

# Check uptime
docker stats sekar-backend --no-stream | awk 'NR==2 {print $5}'

# Verify database connectivity
docker exec sekar-backend node -e \
  "require('typeorm').DataSource {...}.initialize().then(() => console.log('✓')).catch(e => console.error(e))"
```

For depth, see [`specs/deployment/monitoring.md`](./monitoring.md).

---

## 5. Incident Procedures

### Issue: Health Check Timeout (Service Not Responding)

**Symptoms:**
```
curl: (7) Failed to connect to localhost port 3000
timeout waiting for http://localhost:3000/api/v1/health
```

**Step 1: Check if container is running**

```bash
docker ps --filter "name=sekar-backend"
```

**Step 2: If container is down, restart it**

```bash
docker-compose -f docker-compose.prod.yml up -d backend
docker logs sekar-backend --follow
```

**Step 3: If it crashes immediately, check the logs**

```bash
docker logs sekar-backend --tail=200
```

Common causes:
- Database connection failed → verify `DATABASE_HOST`, `DATABASE_PASSWORD`, RDS security group
- Missing environment variables → check `.env.production` has all required vars
- Port already in use → `lsof -i:3000` and kill if needed
- Out of memory → check `docker stats` and increase limit in `docker-compose.prod.yml`

**Step 4: If still failing, rollback to previous image**

See [Rolling Back to a Previous Release](#rolling-back-to-a-previous-release).

---

### Issue: "Relation Does Not Exist" at Startup

**Symptoms:**
```
ERROR: relation "users" does not exist
ERROR: relation "areas" does not exist
```

**Cause:** Migrations have not been applied yet.

**Solution:**

```bash
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run:prod

# Wait for completion
docker logs sekar-backend --follow
# Should see: "Migration X has been executed successfully"
```

---

### Issue: Connection Pool Exhaustion

**Symptoms:**
```
Error: Connection pool timeout
Error: Connection pool error: too many connections
```

**Step 1: Check active connections**

```bash
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT count(*) as total FROM pg_stat_activity WHERE datname = 'sekar_db';
"
```

**Step 2: Kill idle connections**

```bash
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'sekar_db' AND state = 'idle' AND state_change < now() - interval '5 min';
"
```

**Step 3: Adjust pool size**

Edit `be/src/app.module.ts` and reduce `max` if the app is hogging connections:

```typescript
extra: {
  max: 10,  // Lower from 15
  min: 3,   // Lower from 5
}
```

Rebuild and redeploy.

---

### Issue: SSH Key Compromised or Lost

**Scenario:** The EC2 SSH key (`sekar-key.pem`) is exposed or lost.

**Recovery procedure:**

See **Phase 3 Deployment Guide §2** for the 7-step key rotation procedure:
- Generate new key locally
- Install public key on server
- Test new key works
- Remove old key from `authorized_keys`
- Update GitHub Actions secret (`EC2_SSH_KEY`)
- Securely destroy old key
- Update local docs

Critical: Do not delay this — treat an exposed SSH key as compromised immediately.

---

### Issue: Firebase/FCM Initialization Error

**Symptoms:**
```
⚠️ Firebase Admin SDK not initialized. Push notifications disabled.
```

**Possible causes:**
1. `FCM_ENABLED=true` but credentials missing
2. Invalid private key format (newlines not escaped)
3. Service account email/project ID wrong

**Troubleshooting:**

```bash
# Option 1: Disable FCM (temporary)
# Update GitHub Secrets: FCM_ENABLED=false
# Redeploy: git commit --allow-empty -m "chore: disable FCM" && git push

# Option 2: Fix credentials
# Verify in GitHub Secrets → production environment:
# - FCM_PROJECT_ID is set
# - FCM_CLIENT_EMAIL is valid
# - FCM_PRIVATE_KEY includes \n for newlines (raw format)

# Test locally
export FCM_ENABLED=true
export FCM_PROJECT_ID=<your-project>
export FCM_CLIENT_EMAIL=<service-account@...>
export FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
npm run start:dev
# Should log: "✅ Firebase Admin SDK initialized successfully"
```

For full setup, see `specs/deployment/deployment-guide.md` §8.

---

### Issue: Database Corruption or Data Loss

**Critical incident — treat as security event.**

**Step 1: Stop accepting traffic**

```bash
docker-compose -f docker-compose.prod.yml stop backend
```

**Step 2: Contact your backup strategy**

- If RDS: restore from automated snapshot
- If self-hosted: restore from pg_dump
- If MinIO media: restore from volume snapshot

**Step 3: Restore to a new instance (do NOT overwrite production)**

```bash
# RDS point-in-time restore
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier sekar-db \
  --target-db-instance-identifier sekar-db-recovered \
  --restore-time $(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --region ap-southeast-3
```

**Step 4: Verify the restored DB**

Test queries, check row counts, verify referential integrity.

**Step 5: Update the backend to point to the recovered instance**

Edit `.env.production`:
```env
DATABASE_HOST=sekar-db-recovered.xxxxx.ap-southeast-3.rds.amazonaws.com
```

**Step 6: Restart the backend**

```bash
docker-compose -f docker-compose.prod.yml restart backend
docker logs sekar-backend --follow
```

**Step 7: Post-incident**

- Investigate what caused the corruption
- Review logs from the incident window
- Document in a postmortem
- Implement preventive controls

---

### Issue: Disk Space Full

**Symptoms:**
```
docker: Error response from daemon: mkdir /var/lib/docker: no space left on device
```

**Step 1: Check disk usage**

```bash
df -h
docker system df
```

**Step 2: Clean up old Docker resources**

```bash
# Remove unused images (careful: won't remove in-use images)
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused containers
docker container prune -f

# Remove build cache
docker builder prune -a -f
```

**Step 3: Check again**

```bash
df -h
```

If still full:
- Compress old application logs: `gzip /var/log/docker.log*`
- Archive media to S3 and delete old MinIO data
- Expand the EBS volume (AWS) or add a new disk (self-hosted)

---

### Issue: Phantom Migration Rows

**Scenario:** `typeorm_migrations` table shows applied migrations, but the actual tables don't exist.

**Cause:** Likely a half-run that committed bookkeeping rows but rolled back DDL.

**Recovery:**

```sql
-- Check if tables exist
SELECT to_regclass('public.users');  -- Should NOT return NULL

-- If table is missing but migration is recorded
DELETE FROM typeorm_migrations 
WHERE name = 'Phase3Schema17460000000000';

-- Re-run migrations
```

Then from the CLI:
```bash
docker exec sekar-backend npm run migration:run:prod
```

---

## 6. Web-Specific Operations

### Cookie Secure Flag (HTTP vs HTTPS)

**Problem:** Web dashboard set `secure: true` by default, which breaks HTTP deployments (browsers reject secure cookies over HTTP).

**Solution:** Cookie flag is configurable via environment variable:

**For HTTP (development/testing):**

Do NOT set `NEXT_PUBLIC_SECURE_COOKIES` in build args (defaults to `false`).

```bash
# .github/workflows/web-ci-cd.yml — no change needed
# (defaults to insecure for HTTP)
```

**For HTTPS (production recommended):**

Set `NEXT_PUBLIC_SECURE_COOKIES=true` during the web image build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SECURE_COOKIES=true \
  -t sekar-web:latest \
  fe/web
```

Or in CI/CD:
```yaml
--build-arg NEXT_PUBLIC_SECURE_COOKIES=true
```

**Testing:**
1. Clear browser cookies
2. Log in at your domain
3. Hard refresh (Ctrl+Shift+F5) — should NOT redirect to login
4. Check DevTools → Application → Cookies for `access_token`

### Docker Multi-Stage Build

Web uses multi-stage build to minimize image size (~150–180 MB):

```dockerfile
Stage 1 (deps)  → npm ci
Stage 2 (build) → npm run build (Next.js compile)
Stage 3 (run)   → node server.js (standalone)
```

Build args consumed in Stage 2:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN`

These are baked into the bundle at build time — they cannot be overridden at runtime.

### Web Container Health Check

```bash
docker exec sekar-web curl -f http://localhost:3000/api/health
```

If it fails, check:
```bash
docker logs sekar-web --tail=50
```

Common issues:
- Port 3001 (or 3000 inside container) already in use
- Missing env vars (build failed)
- Node.js server crashed

---

## 7. Quick Reference & Commands

### Pre-Flight Checks

```bash
# SSH to production
ssh -i ~/.ssh/sekar-key.pem ec2-user@<PROD_IP>

# Check all containers
docker ps --filter "name=sekar"

# Check health
curl -s http://localhost:3000/api/v1/health | jq .
curl -s http://localhost:3001/api/health | jq .
curl -s http://localhost:6379/ping

# Check logs (all services)
docker logs sekar-backend --tail=50
docker logs sekar-web --tail=50
docker logs sekar-redis --tail=20
```

### Database Commands

```bash
# Login to DB
docker exec -it sekar-postgres psql -U postgres -d sekar_db

# Show migrations applied
docker exec sekar-backend npm run migration:show:prod

# Run migrations (production)
docker exec sekar-backend npm run migration:run:prod

# Backup database
pg_dump -h $DATABASE_HOST -U sekar_admin -d sekar_db | gzip > backup-$(date +%F).sql.gz

# Show table count
docker exec sekar-backend psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
```

### Container Operations

```bash
# Restart a service
docker-compose -f docker-compose.prod.yml restart backend

# Rebuild a service (if code changed)
docker-compose -f docker-compose.prod.yml up -d --build backend

# Stop all
docker-compose -f docker-compose.prod.yml down

# Start all
docker-compose -f docker-compose.prod.yml up -d

# Inspect resource usage
docker stats sekar-backend --no-stream

# Remove stopped containers
docker container prune -f
```

### Network & Connectivity

```bash
# Test RDS connectivity (if using AWS RDS)
docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "SELECT version();"

# Test Redis (if using external Redis)
docker run --rm redis:7.1 redis-cli -u $REDIS_URL PING

# Test S3/MinIO
docker run --rm \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_REGION=$AWS_REGION \
  amazon/aws-cli s3 ls s3://$AWS_S3_BUCKET
```

### Deployment & Rollback

```bash
# Deploy (push to main, wait for CI/CD)
git push origin main
gh run watch --exit-status

# Rollback (revert commit)
git revert <commit-hash>
git push origin main

# Manual rollback (use previous image)
docker tag <registry>/sekar-backend:<PREVIOUS_SHA> <registry>/sekar-backend:latest
docker-compose -f docker-compose.prod.yml restart backend
```

### File Locations on Production EC2

```
/home/ec2-user/
├── sekar/
│   └── backend/
│       ├── .env.production           (auto-generated from GitHub Secrets)
│       └── docker-compose.prod.yml
│
/etc/nginx/conf.d/
├── sekar.conf                         (sekar.wahyutrip.com → backend/web)
│
/etc/letsencrypt/live/sekar.wahyutrip.com/
├── fullchain.pem
└── privkey.pem
```

---

## 8. Related Documentation

**For in-depth information on specific topics, see:**

| Topic | Reference |
|-------|-----------|
| **Deployment from scratch** | [`specs/deployment/deployment-guide.md`](./deployment-guide.md) — authoritative start-to-finish guide (self-hosted or AWS) |
| **Monitoring & metrics** | [`specs/deployment/monitoring.md`](./monitoring.md) — CloudWatch, dashboards, alarms |
| **Local development** | [`specs/deployment/local-development.md`](./local-development.md) — Docker infra, MinIO, WSL2 device networking |
| **AWS infrastructure** | [`specs/deployment/infrastructure.md`](./infrastructure.md) — EC2, RDS, S3, VPC, IAM, networking |
| **Credentials & keys** | [`specs/deployment/credentials-setup.md`](./credentials-setup.md) — Firebase, Maps, Mapbox, AWS S3 |
| **Environment variables** | [`specs/deployment/environment-variables.md`](./environment-variables.md) — all configuration options |
| **CI/CD pipelines** | [`specs/deployment/ci-cd.md`](./ci-cd.md) — GitHub Actions workflows |
| **API contracts** | [`specs/api/contracts.md`](../api/contracts.md) — all ~130 endpoints, request/response shapes |
| **Error handling** | [`specs/api/error-handling.md`](../api/error-handling.md) — error codes and recovery strategies |
| **Architecture & decisions** | [`specs/architecture/`](../architecture/) — ADRs, design patterns |
| **Security checklist** | [`specs/architecture/security.md`](../architecture/security.md) — pre-commit checks, secrets management |

---

## Summary

**Key points for daily operations:**

1. **Production uses RDS** — no local PostgreSQL container. "Postgres service not running" is expected.
2. **Always run `:prod` migration scripts** in production — the plain scripts need ts-node, which isn't available.
3. **Seeding is manual & non-destructive** in production — use `db:seed:production:prod` for reference data only.
4. **Health checks are your early warning** — monitor `/api/v1/health/live` and `/api/v1/health/ready` continuously.
5. **Backups matter** — test restore procedures regularly, don't wait until you need them.
6. **Rollback is fast** — keep previous image tags available; revert a git commit if needed.
7. **Document incidents** — postmortems prevent recurrence.

---

**Maintainers:** DevOps team  
**Last Review:** June 17, 2026  
**Next Review:** Monthly or after major incidents
