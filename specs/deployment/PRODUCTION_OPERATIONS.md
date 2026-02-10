# SEKAR Production Operations Manual

**Last Updated:** February 10, 2026
**Status:** Production Ready
**Audience:** DevOps Engineers

---

## 🎯 Overview

This manual provides step-by-step instructions for managing the SEKAR backend in production, including deployment, database operations, troubleshooting, and emergency procedures.

**Production Architecture:**
- **Backend:** NestJS on EC2 (Docker container)
- **Database:** AWS RDS PostgreSQL 14
- **Storage:** AWS S3 (ap-southeast-3)
- **Registry:** AWS ECR (Docker images)
- **CI/CD:** GitHub Actions

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Initial Deployment](#initial-deployment)
3. [Database Operations](#database-operations)
4. [Daily Operations](#daily-operations)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Procedures](#emergency-procedures)
7. [Monitoring & Health Checks](#monitoring--health-checks)

---

## 1. Architecture Overview

### Database Architecture

**CRITICAL:** Production uses **AWS RDS PostgreSQL**, NOT a local Docker PostgreSQL container.

```
┌──────────────────┐
│  GitHub Actions  │ Pushes code, triggers deployment
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   AWS ECR        │ Stores Docker images
└────────┬─────────┘
         │
         ▼
┌──────────────────┐         ┌──────────────────┐
│   EC2 Instance   │────────▶│   AWS RDS        │
│  (sekar-backend) │         │  (PostgreSQL)    │
│                  │         │                  │
│  Port: 3000      │         │  Port: 5432      │
│  Docker: Yes     │         │  Version: 14     │
└────────┬─────────┘         └──────────────────┘
         │
         ▼
┌──────────────────┐
│   AWS S3         │ Media storage (photos/videos)
│  sekar-media-prod│
└──────────────────┘
```

### Why No Local PostgreSQL?

The `docker-compose.prod.yml` file **intentionally does not include a PostgreSQL service** because:
1. AWS RDS provides managed backups, auto-failover, and scaling
2. Reduces EC2 resource usage (no database overhead)
3. Better security (VPC isolation, encryption at rest)
4. Professional-grade monitoring and maintenance

**If you see "postgres service not running"**, this is **EXPECTED** - production uses RDS!

---

## 2. Initial Deployment

### Prerequisites

Before deploying for the first time, ensure:
- [ ] AWS infrastructure provisioned (EC2, RDS, S3, ECR)
- [ ] All 16 GitHub Secrets configured in `production` environment
- [ ] SSH access to EC2 instance configured
- [ ] Domain DNS records pointed to EC2 IP (optional)

### Step 1: Verify GitHub Secrets

All secrets must be in the **production environment** (not repository secrets).

Navigate to: `https://github.com/wahyutrip/sekar/settings/environments`

**Required Secrets (16 total):**

#### AWS Infrastructure (4)
- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret key
- `AWS_S3_BUCKET` - `sekar-media-prod`
- `AWS_REGION` - `ap-southeast-3`

#### EC2 Access (3)
- `EC2_HOST` - Public IP of EC2 instance
- `EC2_USER` - `ec2-user`
- `EC2_SSH_KEY` - Private SSH key (entire PEM file content)

#### Database (2)
- `DATABASE_HOST` - RDS endpoint (e.g., `sekar-db.xxxxx.ap-southeast-3.rds.amazonaws.com`)
- `DATABASE_PASSWORD` - RDS master password

#### Security (4)
- `JWT_SECRET` - 32+ character random string (generate with `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` - Different 32+ character random string
- `CORS_ORIGIN` - Comma-separated allowed origins (e.g., `http://sekar.wahyutrip.com,https://sekar.wahyutrip.com`)

#### Firebase (3)
- `FCM_ENABLED` - `true` or `false`
- `FCM_PROJECT_ID` - Firebase project ID
- `FCM_CLIENT_EMAIL` - Service account email
- `FCM_PRIVATE_KEY` - Service account private key (include `-----BEGIN PRIVATE KEY-----` header/footer)

### Step 2: Prepare EC2 Instance

SSH to EC2 and create the directory structure:

```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240

# Create backend directory
mkdir -p ~/sekar/backend
cd ~/sekar/backend

# Install Docker if not already installed
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes to take effect
exit
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240

# Verify Docker works
docker ps
```

### Step 3: Copy Deployment Files to EC2

From your local machine:

```bash
# Copy docker-compose.prod.yml
scp -i ~/.ssh/sekar-prod.pem \
  be/docker-compose.prod.yml \
  ec2-user@16.79.183.240:~/sekar/backend/

# Copy seeding script
scp -i ~/.ssh/sekar-prod.pem \
  be/scripts/deploy-seed.sh \
  ec2-user@16.79.183.240:~/sekar/backend/scripts/

# Make script executable
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240 \
  "chmod +x ~/sekar/backend/scripts/deploy-seed.sh"
```

### Step 4: Trigger First Deployment

Push to main branch to trigger automated deployment:

```bash
# From your local repository
git push origin main
```

**What Happens:**
1. ✅ Linting and formatting checks
2. ✅ Unit tests (845 tests, 90.77% coverage)
3. ✅ Security scanning (npm audit, secret detection)
4. ✅ Docker image build and push to ECR
5. ✅ SSH to EC2, generate `.env.production` from secrets
6. ✅ Database wipe (development phase only!)
7. ✅ Run migrations (creates all 16 tables)
8. ⏩ Skip seeding (manual step)
9. ✅ Start backend container
10. ✅ Wait for health check (30 attempts, 2s interval)

**Monitor Progress:**
- GitHub Actions: `https://github.com/wahyutrip/sekar/actions`
- Deployment time: ~10-15 minutes

### Step 5: Seed Database (Manual)

After first deployment succeeds, SSH to EC2 and run seeding:

```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240

# Navigate to backend directory
cd ~/sekar/backend

# Run seeding script
./scripts/deploy-seed.sh
```

**What Gets Seeded:**
- **Phase 1:** 3 users (admin, supervisor1, worker1), 5 areas, 25 work zones
- **Phase 2:** 7 rayons (one per work zone, covering Surabaya districts)
- **Tasks:** 10 sample tasks for testing

**Expected Output:**
```
✅ Environment variables loaded
✅ Database connection successful
✅ Found 3 migrations applied
✅ Database schema complete (16 tables)
✅ Phase 1 seeding complete
✅ Phase 2 seeding complete
✅ Task seeding complete

Test credentials:
  Admin:      admin / admin123
  Supervisor: supervisor1 / supervisor123
  Worker:     worker1 / worker123
```

### Step 6: Verify Deployment

Test the API:

```bash
# Health check
curl http://16.79.183.240:3000/api/v1/health

# Login as admin
curl -X POST http://16.79.183.240:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# API documentation
open http://16.79.183.240:3000/api/docs
```

---

## 3. Database Operations

### Understanding Database Connection Modes

**CRITICAL:** Production database connection is controlled by these `.env.production` variables:

```env
# PRODUCTION CONFIGURATION (set by CI/CD)
DATABASE_SYNCHRONIZE=false       # ✅ MUST be false (use migrations)
DATABASE_MIGRATIONS_RUN=false    # ✅ MUST be false (run manually)
DATABASE_SSL=true                # ✅ MUST be true (RDS requires SSL)
```

**Why `DATABASE_SYNCHRONIZE=false`?**
- TypeORM `synchronize` mode auto-creates/modifies tables from entities
- This can cause data loss in production (table drops, column changes)
- We use migrations for controlled schema changes

**Why `DATABASE_MIGRATIONS_RUN=false`?**
- Auto-running migrations on app startup can cause race conditions (multiple instances)
- Migrations are run manually during deployment via CI/CD

### Running Migrations

Migrations are automatically run during CI/CD deployment. To run manually:

```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240
cd ~/sekar/backend

# Load environment variables
source .env.production

# Run migrations
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

### Checking Migration Status

```bash
# Show applied migrations
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js
```

### Reverting Migrations

**⚠️ DANGER:** Only revert in emergency situations!

```bash
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js
```

### Database Backup & Restore

**Automated Backups:**
AWS RDS automatically backs up the database daily with 7-day retention.

**Manual Backup:**

```bash
# From EC2 or local machine with RDS access
pg_dump -h $DATABASE_HOST -U sekar_admin -d sekar_db > sekar_backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore from Backup:**

```bash
# ⚠️ DANGER: This will overwrite all data!
psql -h $DATABASE_HOST -U sekar_admin -d sekar_db < sekar_backup_20260210_120000.sql
```

### Direct Database Access

Connect to RDS using `psql`:

```bash
# From EC2
docker run -it --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db
```

**Useful Commands:**
```sql
-- List all tables
\dt

-- Show table structure
\d users

-- Count records
SELECT
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM areas) as areas,
  (SELECT COUNT(*) FROM work_zones) as work_zones,
  (SELECT COUNT(*) FROM rayons) as rayons,
  (SELECT COUNT(*) FROM tasks) as tasks;

-- Check migrations
SELECT * FROM typeorm_migrations ORDER BY timestamp;
```

---

## 4. Daily Operations

### Monitoring Backend Status

```bash
# SSH to EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240

# Check container status
docker ps

# Expected output:
# CONTAINER ID   IMAGE                                  STATUS
# abc123def456   xxx.dkr.ecr...sekar-backend:latest     Up 2 hours (healthy)

# View logs
docker logs sekar-backend --tail=100 --follow

# Check resource usage
docker stats sekar-backend
```

### Restarting the Backend

```bash
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Updating Environment Variables

If you need to change `.env.production`:

```bash
# SSH to EC2
cd ~/sekar/backend

# Edit .env.production
nano .env.production

# Restart to apply changes
docker-compose -f docker-compose.prod.yml restart backend
```

**⚠️ WARNING:** Changes to `.env.production` will be overwritten on next CI/CD deployment! Update GitHub Secrets instead.

### Viewing Application Logs

```bash
# Real-time logs
docker logs sekar-backend --follow

# Last 100 lines
docker logs sekar-backend --tail=100

# Logs since 1 hour ago
docker logs sekar-backend --since=1h

# Search for errors
docker logs sekar-backend 2>&1 | grep -i error
```

---

## 5. Troubleshooting

### Issue: "Postgres service not running"

**This is EXPECTED!** Production uses AWS RDS, not a local PostgreSQL container.

**Verify RDS connection:**

```bash
cd ~/sekar/backend
source .env.production

docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "SELECT version();"
```

**If this fails:**
1. Check RDS security group allows EC2 access
2. Verify `DATABASE_HOST` in `.env.production`
3. Verify `DATABASE_PASSWORD` is correct

### Issue: "Relation does not exist" When Seeding

**Root Cause:** Migrations haven't been applied yet.

**Solution:**

```bash
# 1. Check migration status
cd ~/sekar/backend
source .env.production

docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:show -d dist/database/data-source.js

# 2. If no migrations shown, run them
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js

# 3. Now run seeding
./scripts/deploy-seed.sh
```

### Issue: Backend Container Keeps Restarting

**Check logs for error:**

```bash
docker logs sekar-backend --tail=200
```

**Common causes:**
1. **Database connection failure:** Check RDS security group, credentials
2. **Missing environment variables:** Verify `.env.production` was generated correctly
3. **Port conflict:** Check if port 3000 is already in use (`lsof -i:3000`)
4. **Out of memory:** Check EC2 instance resources (`docker stats`)

**Solution:**

```bash
# Recreate container
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d backend

# Watch startup logs
docker logs sekar-backend --follow
```

### Issue: Health Check Fails

**Test health endpoint:**

```bash
curl http://localhost:3000/api/v1/health
```

**If it fails:**
1. Check container is running: `docker ps`
2. Check logs: `docker logs sekar-backend`
3. Verify database connection (most common issue)

### Issue: Deployment Fails at Migration Step

**Error:** `migration:run` command exits with error during CI/CD.

**Diagnosis:**

```bash
# SSH to EC2 and manually run migration
cd ~/sekar/backend
source .env.production

# Test database connectivity first
docker run --rm \
  -e PGPASSWORD=$DATABASE_PASSWORD \
  postgres:14-alpine \
  psql -h $DATABASE_HOST -U sekar_admin -d sekar_db -c "\dt"

# If connectivity works, try migration
docker run --rm \
  -e DATABASE_HOST=$DATABASE_HOST \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USER=sekar_admin \
  -e DATABASE_PASSWORD=$DATABASE_PASSWORD \
  -e DATABASE_NAME=sekar_db \
  -e DATABASE_SSL=true \
  -e NODE_ENV=production \
  $ECR_REGISTRY/sekar-backend:latest \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

**Common causes:**
1. Migrations already applied (safe to ignore)
2. Database schema conflicts (may need manual fix)
3. RDS not accessible (check security groups)

---

## 6. Emergency Procedures

### Emergency: Complete Service Outage

**Step 1: Check if backend is running**

```bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@16.79.183.240
docker ps
```

**Step 2: If container is down, restart it**

```bash
cd ~/sekar/backend
docker-compose -f docker-compose.prod.yml up -d backend
docker logs sekar-backend --follow
```

**Step 3: If restart fails, rollback to previous image**

```bash
# List available images
docker images | grep sekar-backend

# Use previous version (change tag to specific commit SHA)
docker-compose -f docker-compose.prod.yml stop backend
docker tag $ECR_REGISTRY/sekar-backend:previous-sha $ECR_REGISTRY/sekar-backend:latest
docker-compose -f docker-compose.prod.yml up -d backend
```

### Emergency: Database Corruption

**Step 1: Stop accepting traffic**

```bash
docker-compose -f docker-compose.prod.yml stop backend
```

**Step 2: Restore from RDS automated backup**

```bash
# Via AWS Console:
# RDS → Databases → sekar-db → Actions → Restore to point in time

# Via AWS CLI:
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier sekar-db \
  --target-db-instance-identifier sekar-db-restored \
  --restore-time $(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --region ap-southeast-3
```

**Step 3: Point backend to restored database**

```bash
# Update DATABASE_HOST in .env.production
nano .env.production
# Change DATABASE_HOST to restored RDS endpoint

# Restart backend
docker-compose -f docker-compose.prod.yml up -d backend
```

### Emergency: Disk Space Full

**Check disk usage:**

```bash
df -h
```

**Clean up Docker resources:**

```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove unused containers
docker container prune -f

# Check space again
df -h
```

---

## 7. Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://16.79.183.240:3000/api/v1/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

### CloudWatch Integration (TODO)

**Future enhancement:** Configure CloudWatch logs for:
- Container logs
- Application errors
- Database slow queries
- API latency metrics

### Setting Up Automated Monitoring

**Install monitoring agent on EC2:**

```bash
# Install CloudWatch agent
sudo yum install -y amazon-cloudwatch-agent

# Configure metrics
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/config.json
```

**Key Metrics to Monitor:**
- Backend container health (every 30s)
- Database connections (current vs max)
- API response time (p50, p95, p99)
- Error rate (4xx, 5xx responses)
- Disk space (alert at 80%)
- Memory usage (alert at 90%)

---

## Summary

**Key Takeaways:**

1. **No Local PostgreSQL:** Production uses AWS RDS, so "postgres service not running" is **EXPECTED**
2. **Migrations First, Then Seeding:** Always run migrations before seeding
3. **Seeding is Manual:** Not automated in CI/CD to prevent accidental data overwrites
4. **Use Deploy Script:** Run `./scripts/deploy-seed.sh` for consistent seeding
5. **Monitor Logs:** Use `docker logs sekar-backend --follow` to watch for issues
6. **Update GitHub Secrets:** Don't edit `.env.production` directly - it gets overwritten

**Quick Commands Reference:**

```bash
# Check backend status
docker ps

# View logs
docker logs sekar-backend --follow

# Restart backend
cd ~/sekar/backend && docker-compose -f docker-compose.prod.yml restart backend

# Run seeding
cd ~/sekar/backend && ./scripts/deploy-seed.sh

# Connect to database
docker run -it --rm -e PGPASSWORD=$DATABASE_PASSWORD postgres:14-alpine psql -h $DATABASE_HOST -U sekar_admin -d sekar_db
```

---

**Last Updated:** February 10, 2026
**Maintainer:** DevOps Team
**For Issues:** Open GitHub issue or contact DevOps team
