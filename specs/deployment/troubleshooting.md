# Deployment Troubleshooting Guide

**Last Updated:** February 10, 2026
**Status:** Active fixes deployed

This document provides troubleshooting steps for common deployment issues in the SEKAR backend CI/CD pipeline.

---

## Recent Deployment Hang Issues (Feb 10, 2026)

### Problem Summary

Deployments were hanging indefinitely at the "Deploy to Production" stage after schema initialization, resulting in cancelled workflow runs.

### Root Causes Identified

1. **Complex Migration Strategy**
   - Previous approach: Start app with `synchronize=true` → Run migrations separately
   - Issue: Double database connections, potential pool exhaustion
   - Fix: Run migrations directly without starting the full application

2. **Firebase Initialization Blocking**
   - Firebase tries to load service account from file path
   - File doesn't exist in production container → error thrown
   - Fix: Support environment variables for Firebase credentials

3. **Health Check URL Mismatch**
   - Workflow: `/api/v1/health`
   - Docker Compose: `/api/health` (missing `/v1`)
   - Fix: Standardized to `/api/v1/health` everywhere

4. **Database Connection Pool Limits**
   - Schema init + migrations = too many connections
   - Fix: Reduced pool size for migration CLI (3 max)

5. **Migration Timeout Handling**
   - Timeouts kill process but don't cleanup properly
   - Fix: Removed artificial timeouts, let migrations complete

### Fixes Applied

#### 1. Simplified Migration Process

**File:** `.github/workflows/backend-ci-cd.yml` (lines 305-325)

```bash
# Before: Two-step process (schema init + migrations)
timeout 40 docker run --env-file .env.init backend node dist/main.js
timeout 120 docker-compose run backend npm run migration:run:prod

# After: Direct migration run
docker run --rm \
  -e DATABASE_HOST=${DATABASE_HOST} \
  -e DATABASE_SSL=true \
  sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

**Benefits:**
- No full application startup required
- Single database connection pool
- Faster execution (no 40s wait)
- Cleaner error messages

#### 2. Enhanced Firebase Configuration

**File:** `be/src/config/firebase.config.ts` (lines 17-75)

**Changes:**
- Support environment variables (`FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`)
- Fallback to file-based loading for development
- Better error messages for missing credentials
- Proper newline handling in private key

**Usage:**

**Development (file-based):**
```bash
FCM_ENABLED=true
# Place firebase-service-account.json in be/config/
```

**Production (environment variables):**
```bash
FCM_ENABLED=true
FCM_PROJECT_ID=your-project-id
FCM_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### 3. Fixed Health Check URL

**File:** `be/docker-compose.prod.yml` (line 23)

```yaml
# Before
test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]

# After
test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/v1/health"]
```

**Note:** Also switched from `curl` to `wget` (more reliable in Alpine containers).

#### 4. Improved Health Check Logic

**File:** `.github/workflows/backend-ci-cd.yml` (lines 375-393)

```bash
# Retry logic with detailed feedback
for i in {1..30}; do
  if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
    break
  fi
  echo "   Attempt $i/30: Health check not ready yet..."
  sleep 2
  if [ $i -eq 30 ]; then
    echo "❌ ERROR: Health check failed after 60 seconds"
    echo "📋 Container logs:"
    docker-compose -f docker-compose.prod.yml logs --tail=50 backend
    exit 1
  fi
done
```

**Benefits:**
- 30 retries over 60 seconds (vs. single 10s wait)
- Shows progress during wait
- Displays container logs on failure

#### 5. Database Connection Pool Optimization

**File:** `be/src/database/data-source.ts` (lines 36-44)

```typescript
// Connection pool for migrations (smaller than application)
extra: {
  max: 3,              // Maximum 3 connections for migration CLI
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
},
ssl: process.env.DATABASE_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false,
```

**File:** `be/src/app.module.ts` (lines 59-62)

```typescript
// SSL configuration for RDS
ssl: process.env.DATABASE_SSL === 'true'
  ? { rejectUnauthorized: false }
  : false,
```

**Benefits:**
- Prevents connection pool exhaustion
- Supports AWS RDS SSL connections
- Faster connection timeout detection

---

## Common Deployment Issues

### Issue 1: Health Check Timeout

**Symptoms:**
```
❌ ERROR: Health check failed after 60 seconds
```

**Possible Causes:**
1. Application failed to start (check logs)
2. Database connection issues
3. Port already in use
4. Memory/CPU limits exceeded

**Troubleshooting Steps:**

```bash
# SSH into EC2
ssh -i ~/.ssh/sekar-ec2.pem ubuntu@api.sekar.wahyutrip.com

# Check container status
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Check database connectivity
docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "SELECT version();"

# Check port availability
sudo lsof -i :3000

# Check resource usage
docker stats sekar-backend --no-stream
```

### Issue 2: Migration Failures

**Symptoms:**
```
❌ ERROR: Migration failed
```

**Possible Causes:**
1. Database schema conflicts
2. Missing tables from previous phases
3. Connection timeout
4. SSL configuration mismatch

**Troubleshooting Steps:**

```bash
# View migration status
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js

# Manually run migrations with verbose output
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  sh -c "node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js"

# If migrations are stuck, revert and retry
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js
```

### Issue 3: Firebase Initialization Errors

**Symptoms:**
```
⚠️ Firebase Admin SDK not initialized. Push notifications disabled.
```

**Possible Causes:**
1. `FCM_ENABLED=true` but credentials missing
2. Invalid private key format
3. Newline characters not escaped

**Troubleshooting Steps:**

**Option 1: Disable FCM (temporary fix)**
```bash
# In GitHub Secrets, set:
FCM_ENABLED=false
```

**Option 2: Fix Credentials**

1. Verify secrets in GitHub:
   - Go to Repository → Settings → Secrets → Actions → Environment (production)
   - Check: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`

2. Fix private key format:
```bash
# Private key must include \n for newlines
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA...\n-----END PRIVATE KEY-----\n"
```

3. Test locally:
```bash
cd be
export FCM_ENABLED=true
export FCM_PROJECT_ID=sekar-app
export FCM_CLIENT_EMAIL=firebase-adminsdk@sekar-app.iam.gserviceaccount.com
export FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

npm run start:dev
# Should see: ✅ Firebase Admin SDK initialized successfully
```

### Issue 4: Database Connection Pool Exhaustion

**Symptoms:**
```
Error: Connection terminated unexpectedly
Error: Connection pool timeout
```

**Possible Causes:**
1. Too many concurrent connections
2. RDS connection limit reached
3. Idle connections not released

**Troubleshooting Steps:**

```bash
# Check active connections in RDS
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle
  FROM pg_stat_activity
  WHERE datname = 'sekar_db';
"

# Check connection limits
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SHOW max_connections;
  SELECT count(*) FROM pg_stat_activity;
"

# Kill idle connections (if needed)
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = 'sekar_db'
    AND state = 'idle'
    AND state_change < now() - interval '5 minutes';
"
```

**Prevention:**
- Application pool: max 15 connections
- Migration CLI pool: max 3 connections
- RDS t3.micro default: 87 connections
- Leave 20+ connections for other operations

### Issue 5: Docker Image Pull Failures

**Symptoms:**
```
Error: pull access denied for <ECR_REGISTRY>/sekar-backend
```

**Possible Causes:**
1. ECR login expired
2. IAM permissions insufficient
3. Repository doesn't exist

**Troubleshooting Steps:**

```bash
# Re-authenticate to ECR
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin $ECR_REGISTRY

# Verify repository exists
aws ecr describe-repositories --repository-names sekar-backend --region ap-southeast-3

# Check IAM permissions
aws sts get-caller-identity
aws iam list-attached-user-policies --user-name sekar-ci

# Test image pull
docker pull $ECR_REGISTRY/sekar-backend:latest
```

---

## Deployment Checklist

Before deploying to production, verify:

- [ ] All tests passing in CI (lint, test, security)
- [ ] Database migrations tested locally
- [ ] `.env.production` variables configured in GitHub Secrets
- [ ] RDS database accessible from EC2
- [ ] S3 bucket exists with proper IAM permissions
- [ ] ECR repository contains latest image
- [ ] Health check endpoint returns 200 OK
- [ ] Firebase credentials valid (if FCM enabled)
- [ ] No hardcoded secrets in code
- [ ] Backup of production database taken (if schema changes)

---

## Rollback Procedures

### Rollback to Previous Image

```bash
# SSH into EC2
ssh -i ~/.ssh/sekar-ec2.pem ubuntu@api.sekar.wahyutrip.com
cd ~/sekar/backend

# Find previous image SHA
aws ecr list-images --repository-name sekar-backend --region ap-southeast-3

# Pull specific version
docker pull $ECR_REGISTRY/sekar-backend:PREVIOUS_SHA

# Update docker-compose.prod.yml to use specific SHA
# Or retag the image as :latest
docker tag $ECR_REGISTRY/sekar-backend:PREVIOUS_SHA $ECR_REGISTRY/sekar-backend:latest

# Restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d backend
```

### Rollback Database Migration

```bash
# SSH into EC2
cd ~/sekar/backend

# Revert last migration
docker-compose -f docker-compose.prod.yml run --rm backend \
  node ./node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js

# Verify migration status
docker-compose -f docker-compose.prod.yml run --rm backend \
  node ./node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
```

---

## Monitoring & Logs

### Application Logs

```bash
# Real-time logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Search logs
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR
```

### Container Metrics

```bash
# Resource usage
docker stats sekar-backend --no-stream

# Container inspect
docker inspect sekar-backend

# Health check status
docker inspect sekar-backend | jq '.[0].State.Health'
```

### Database Monitoring

```bash
# Active queries
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT pid, state, query_start, query
  FROM pg_stat_activity
  WHERE datname = 'sekar_db'
    AND state = 'active'
  ORDER BY query_start;
"

# Slow queries (last 24h)
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

---

## Performance Optimization

### Current Configuration

| Component | Setting | Value |
|-----------|---------|-------|
| **Container** | CPU Limit | 0.9 cores |
| | Memory Limit | 768MB |
| | Memory Reservation | 512MB |
| **Database Pool (App)** | Max Connections | 15 |
| | Min Connections | 5 |
| | Idle Timeout | 60s |
| **Database Pool (Migration)** | Max Connections | 3 |
| | Min Connections | 1 |
| | Idle Timeout | 30s |
| **Health Check** | Interval | 30s |
| | Timeout | 10s |
| | Start Period | 40s |
| | Retries | 3 |

### Tuning Recommendations

**For higher traffic:**
```yaml
# docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '1.5'
      memory: 1536M
```

```typescript
// app.module.ts - Database connection pool
extra: {
  max: 25,  // Increase max connections
  min: 10,  // Higher baseline
}
```

**For faster startup:**
```yaml
# docker-compose.prod.yml
healthcheck:
  start_period: 30s  # Reduce if app starts quickly
  interval: 20s      # Check more frequently
```

---

## Contact & Escalation

**For deployment issues:**
1. Check this document first
2. Review GitHub Actions logs
3. Check EC2 container logs
4. Escalate to DevOps team if unresolved after 30 minutes

**For database issues:**
1. Check RDS metrics in AWS Console
2. Review query performance
3. Check connection pool status
4. Escalate to Database team if persistent

**Emergency contacts:**
- DevOps Lead: [Name] - [Email/Slack]
- Database Admin: [Name] - [Email/Slack]
- On-call Engineer: Check PagerDuty/Slack

---

## Related Documentation

- **Deployment Guide:** `specs/deployment/phase-2-deployment.md`
- **AWS S3 Setup:** `specs/deployment/aws-s3-setup.md`
- **Infrastructure Setup:** `specs/deployment/infrastructure-setup.md`
- **Security Guidelines:** `specs/architecture/security.md`
- **API Documentation:** `specs/api/contracts.md`

---

**Last Review:** February 10, 2026
**Next Review:** March 10, 2026 (monthly)
