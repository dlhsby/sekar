# Phase 2 Deployment Guide - Enhanced Features

Deployment procedures for Phase 2 enhanced features including Firebase Cloud Messaging (FCM), task management, background notifications, and KMZ area import.

## Overview

Phase 2 introduces:
- **Firebase Cloud Messaging (FCM)** for push notifications
- **Task Management** with assignments and tracking
- **Background Notifications** for shift reminders and task assignments
- **KMZ Area Import** for bulk area creation from GPS files
- **Area Revision History** for audit trails
- **GitHub Actions CI/CD** for automated testing and deployment

---

## 1. Pre-Deployment Checklist

### Code Readiness
- [ ] All Phase 2 features tested in development
- [ ] Unit tests passing (>80% coverage)
- [ ] E2E tests passing
- [ ] Database migrations verified
- [ ] API documentation updated (Swagger)
- [ ] Mobile app builds successfully

### Infrastructure Readiness
- [ ] Firebase project created
- [ ] FCM credentials generated
- [ ] Environment variables configured (dev, staging, prod)
- [ ] Database backup taken
- [ ] S3 bucket permissions verified
- [ ] CloudWatch alarms configured for new endpoints
- [ ] Redis/ElastiCache cluster provisioned

### CI/CD Readiness
- [ ] GitHub Actions workflows tested
- [ ] GitHub Secrets verified (AWS, EC2, Android)
- [ ] ECR repository accessible
- [ ] EC2 instances reachable via SSH
- [ ] Docker and Docker Compose updated on EC2

### Team Readiness
- [ ] Team briefed on new features
- [ ] Deployment window scheduled
- [ ] Rollback plan reviewed
- [ ] On-call rotation confirmed

---

## 2. GitHub Actions CI/CD Workflows

Phase 2 leverages automated CI/CD pipelines for consistent, repeatable deployments.

### 2.1 Backend Workflow (`.github/workflows/backend-ci-cd.yml`)

**Pipeline Stages:**
1. **Lint** - ESLint and Prettier checks
2. **Test** - Unit tests with PostgreSQL service (coverage >80%)
3. **Security** - npm audit and secret scanning
4. **Build** - TypeScript compilation
5. **Deploy** - Environment-specific deployment to EC2

**Branch Strategy:**
- `develop` → Deploys to Development environment
- `staging` → Deploys to Staging environment
- `main` → Deploys to Production (with manual approval)

**Deployment Process:**
```yaml
# Automated on push to branch
1. Build Docker image
2. Tag with branch-specific tag (dev-latest, staging-latest, latest)
3. Push to ECR (ap-southeast-3)
4. SSH to EC2
5. Login to ECR
6. Pull latest image
7. Run migrations (if schema changes)
8. Restart containers with zero-downtime
9. Verify health check
```

**Key Features:**
- **Zero-downtime deployment** via Docker Compose graceful shutdown
- **Automatic backup** of current production image before deployment
- **Health checks** after deployment
- **Smoke tests** for production deployments
- **Build artifacts** retained for 7 days

### 2.2 Mobile Workflow (`.github/workflows/mobile-ci-cd.yml`)

**Pipeline Stages:**
1. **Lint** - ESLint and TypeScript checks
2. **Test** - Jest unit tests
3. **Build APK** - Environment-specific builds
4. **Sign APK** - Production signing with keystore
5. **Release** - GitHub Release for production builds

**Build Matrix:**
- `develop` → Debug APK (unsigned)
- `staging` → Signed Release APK
- `main` → Signed Release APK + GitHub Release

**Deployment Process:**
```yaml
# Automated on push to branch
1. Lint and test code
2. Create .env with environment-specific API_BASE_URL
3. Build Android APK (debug or release)
4. Sign APK with keystore (staging/prod only)
5. Upload to GitHub Artifacts
6. Create GitHub Release (prod only)
```

**Key Features:**
- **Automatic version code increment** for production builds
- **Signed APK** for staging and production
- **GitHub Releases** for easy distribution
- **Artifact retention** (14 days dev, 30 days staging, 90 days prod)

### 2.3 Required GitHub Secrets

Configure these in **Settings → Secrets and variables → Actions**:

| Secret Name | Value | Used By | Description |
|------------|-------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | `<iam-user-key>` | Backend | AWS credentials for ECR |
| `AWS_SECRET_ACCESS_KEY` | `<iam-user-secret>` | Backend | AWS credentials for ECR |
| `EC2_HOST` | `<elastic-ip>` | Backend | Production EC2 IP |
| `EC2_HOST_DEV` | `<dev-elastic-ip>` | Backend | Development EC2 IP |
| `EC2_HOST_STAGING` | `<staging-elastic-ip>` | Backend | Staging EC2 IP |
| `EC2_USER` | `ec2-user` | Backend | EC2 SSH username |
| `EC2_SSH_KEY` | `<private-key>` | Backend | SSH private key (raw text) |
| `ANDROID_SIGNING_KEY` | `<base64-keystore>` | Mobile | Android signing keystore |
| `ANDROID_KEY_ALIAS` | `sekar-key` | Mobile | Keystore alias |
| `ANDROID_KEYSTORE_PASSWORD` | `<password>` | Mobile | Keystore password |
| `ANDROID_KEY_PASSWORD` | `<password>` | Mobile | Key password |
| `GOOGLE_MAPS_API_KEY` | `<api-key>` | Mobile | Google Maps API key |

**IAM User Permissions (sekar-cicd-user):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:DescribeImages",
        "ecr:ListImages"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2.4 Manual Deployment Trigger

For hotfixes or manual deployments:

```bash
# Via GitHub UI
1. Go to Actions tab
2. Select workflow (Backend CI/CD or Mobile CI/CD)
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

# Or push a tag to trigger release
git tag -a v2.0.0-rc1 -m "Phase 2 Release Candidate 1"
git push origin v2.0.0-rc1
```

---

## 3. Firebase Cloud Messaging (FCM) Setup

### Firebase Project Creation

**Step 1: Create Firebase Project**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: `SEKAR-Production`
4. Enable Google Analytics (optional)
5. Complete project creation

**Step 2: Register Android App**
1. In Firebase project, click "Add App" → Android
2. Enter Android package name: `com.wahyutrip.sekar`
3. Download `google-services.json`
4. Place in `fe/mobile/android/app/google-services.json`
5. **Important:** Add `google-services.json` to `.gitignore`

**Step 3: Generate FCM Server Key**
1. Go to Project Settings → Cloud Messaging
2. Copy "Server Key" (legacy)
3. Store in AWS Secrets Manager (see below)

**Step 4: Enable FCM API**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Enable "Firebase Cloud Messaging API"

### AWS Secrets Manager Configuration

**Create Secret for FCM Credentials:**
```bash
aws secretsmanager create-secret \
  --name sekar/fcm/server-key \
  --description "Firebase Cloud Messaging Server Key" \
  --secret-string '{"server_key":"YOUR_FCM_SERVER_KEY_HERE"}' \
  --region ap-southeast-3
```

**Retrieve Secret (for verification):**
```bash
aws secretsmanager get-secret-value \
  --secret-id sekar/fcm/server-key \
  --region ap-southeast-3 \
  --query SecretString \
  --output text | jq -r '.server_key'
```

### Mobile App Configuration

**Android: google-services.json**
```json
{
  "project_info": {
    "project_number": "YOUR_PROJECT_NUMBER",
    "project_id": "sekar-production",
    "storage_bucket": "sekar-production.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "YOUR_MOBILE_SDK_APP_ID",
        "android_client_info": {
          "package_name": "com.wahyutrip.sekar"
        }
      },
      "api_key": [
        {
          "current_key": "YOUR_API_KEY"
        }
      ]
    }
  ]
}
```

**iOS: GoogleService-Info.plist (Phase 5)**
- Will be added in Phase 5 during iOS development

---

## 4. Environment Variables - Phase 2 Additions

### Backend (.env additions)

Add these to existing `.env` file:

```bash
# Firebase Cloud Messaging
FCM_SERVER_KEY=<from-aws-secrets-manager>
FCM_ENABLED=true

# Notification Settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000  # milliseconds
NOTIFICATION_BATCH_SIZE=100    # max devices per batch

# Task Management
TASK_AUTO_ASSIGN_ENABLED=true
TASK_DEADLINE_WARNING_HOURS=24  # hours before deadline to send reminder

# Background Jobs (Bull Queue - Phase 2+)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # empty for development
REDIS_DB=0

# KMZ Import
KMZ_MAX_FILE_SIZE=10485760  # 10 MB in bytes
KMZ_MAX_POLYGONS=100        # max polygons per KMZ file
```

### Mobile App (.env additions)

Add these to existing `.env` file:

```bash
# Firebase Cloud Messaging (from google-services.json)
FCM_SENDER_ID=YOUR_PROJECT_NUMBER

# Notification Settings
NOTIFICATION_SOUND_ENABLED=true
NOTIFICATION_VIBRATE_ENABLED=true
```

### EC2 Environment Configuration

Update `.env.production` on EC2 instances:

**Development Environment:**
```bash
# SSH to dev EC2
ssh -i sekar-key.pem ec2-user@<dev-elastic-ip>
cd ~/sekar
nano .env.production

# Add Phase 2 variables
FCM_SERVER_KEY=<from-secrets-manager>
FCM_ENABLED=true
REDIS_HOST=sekar-redis-dev.xxxxx.ng.0001.apse3.cache.amazonaws.com
REDIS_PORT=6379
# ... (add all Phase 2 variables)

# Restart to apply changes
docker-compose down && docker-compose up -d
```

**Staging Environment:**
```bash
# SSH to staging EC2
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar
nano .env.production

# Add Phase 2 variables (same as dev but with staging Redis endpoint)
FCM_SERVER_KEY=<from-secrets-manager>
FCM_ENABLED=true
REDIS_HOST=sekar-redis-staging.xxxxx.ng.0001.apse3.cache.amazonaws.com
REDIS_PORT=6379
```

**Production Environment:**
```bash
# SSH to prod EC2
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar
nano .env.production

# Add Phase 2 variables (production Redis cluster)
FCM_SERVER_KEY=<from-secrets-manager>
FCM_ENABLED=true
REDIS_HOST=sekar-redis-prod.xxxxx.ng.0001.apse3.cache.amazonaws.com
REDIS_PORT=6379
```

---

## 5. Redis/ElastiCache Setup (for Bull Queue)

### ElastiCache Redis Configuration

**Development Environment:**
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id sekar-redis-dev \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --engine-version 7.0 \
  --cache-subnet-group-name sekar-cache-subnet-group \
  --security-group-ids sg-xxxxx \
  --region ap-southeast-3 \
  --tags Key=Environment,Value=Development Key=Project,Value=SEKAR
```

**Production Environment:**
```bash
aws elasticache create-replication-group \
  --replication-group-id sekar-redis-prod \
  --replication-group-description "SEKAR Production Redis Cluster" \
  --engine redis \
  --cache-node-type cache.t3.small \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --engine-version 7.0 \
  --cache-subnet-group-name sekar-cache-subnet-group \
  --security-group-ids sg-xxxxx \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --region ap-southeast-3 \
  --tags Key=Environment,Value=Production Key=Project,Value=SEKAR
```

### Security Group for Redis

**Inbound Rules:**
| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| Redis | TCP | 6379 | sekar-ec2-sg | From application servers |

**Create Security Group:**
```bash
aws ec2 create-security-group \
  --group-name sekar-redis-sg \
  --description "Security group for SEKAR Redis cluster" \
  --vpc-id vpc-xxxxx \
  --region ap-southeast-3

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 6379 \
  --source-group sekar-ec2-sg \
  --region ap-southeast-3
```

### Bull Queue Dashboard (Optional)

**Install Bull Board for queue monitoring:**
```bash
cd be
npm install @bull-board/express
```

**Access dashboard at:** `http://sekar.wahyutrip.com/admin/queues`
- Requires Admin role
- Shows pending/active/completed/failed jobs
- Allows manual job retry

---

## 6. Database Migrations

### Migration Files to Execute

Phase 2 introduces new tables and columns:

**Migration 1: Tasks Table**
```sql
-- File: be/src/database/migrations/1705500000000-CreateTasksTable.ts
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'cleaning', 'maintenance', 'inspection'
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  deadline TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER, -- minutes
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  area_id UUID REFERENCES areas(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_area_id ON tasks(area_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
```

**Migration 2: Notifications Table**
```sql
-- File: be/src/database/migrations/1705500001000-CreateNotificationsTable.ts
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'shift_reminder', 'task_assigned', 'shift_ending', 'report_approved'
  data JSONB, -- additional metadata
  read BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  fcm_message_id VARCHAR(255), -- FCM response message ID
  error TEXT, -- error if send failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_sent ON notifications(sent);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

**Migration 3: FCM Tokens Table**
```sql
-- File: be/src/database/migrations/1705500002000-CreateFcmTokensTable.ts
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  device_id VARCHAR(255),
  device_type VARCHAR(50), -- 'android', 'ios'
  app_version VARCHAR(20),
  os_version VARCHAR(20),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX idx_fcm_tokens_token ON fcm_tokens(token);
CREATE INDEX idx_fcm_tokens_active ON fcm_tokens(active);
```

**Migration 4: Area Revisions Table**
```sql
-- File: be/src/database/migrations/1705500003000-CreateAreaRevisionsTable.ts
CREATE TABLE area_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id),
  name VARCHAR(255) NOT NULL,
  coordinates JSONB NOT NULL,
  target_time INTEGER,
  description TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  changes JSONB, -- detailed change log
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_area_revisions_area_id ON area_revisions(area_id);
CREATE INDEX idx_area_revisions_created_at ON area_revisions(created_at DESC);
```

### Run Migrations

**Development:**
```bash
cd be
npm run typeorm migration:run
```

**Staging/Production (via SSH):**
```bash
# SSH to EC2
ssh -i sekar-key.pem ec2-user@<elastic-ip>
cd ~/sekar

# Run migrations BEFORE restarting app (zero-downtime)
docker-compose run --rm backend npm run migration:run:prod

# Verify migrations applied
docker-compose run --rm backend npm run migration:show:prod

# Then restart app with new code
docker-compose up -d
```

**Via GitHub Actions (Automated):**

Add migration step to deployment script by updating EC2 `.env.production`:

```bash
# On EC2, create migration script
cat > ~/sekar/migrate.sh << 'EOF'
#!/bin/bash
cd ~/sekar
docker-compose run --rm backend npm run migration:run:prod
EOF

chmod +x ~/sekar/migrate.sh
```

Update backend workflow to run migrations:
```yaml
# In .github/workflows/backend-ci-cd.yml
# Add before "Restart with zero-downtime"
- name: Run database migrations
  run: |
    cd ~/sekar
    ./migrate.sh || echo "No migrations to run"
```

### Verify Migrations

```sql
-- Connect to database
psql -h sekar-prod-db.xxxxx.ap-southeast-3.rds.amazonaws.com -U sekar_admin -d sekar_db

-- Check new tables exist
\dt

-- Verify table structure
\d tasks
\d notifications
\d fcm_tokens
\d area_revisions

-- Check indexes
\di

-- Sample query
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM notifications;
```

---

## 7. Deployment Procedure

### Step 1: Pre-Deployment Verification (1 hour before deployment)

**Checklist:**
```bash
# 1. Verify all tests pass
cd be
npm test
npm run test:e2e

cd ../fe/mobile
npm test

# 2. Verify builds succeed
cd ../../be
npm run build

cd ../fe/mobile
cd android && ./gradlew assembleRelease

# 3. Create database backup
aws rds create-db-snapshot \
  --db-instance-identifier sekar-prod-db \
  --db-snapshot-identifier sekar-prod-db-pre-phase2-$(date +%Y%m%d-%H%M%S) \
  --region ap-southeast-3

# 4. Verify backup created
aws rds describe-db-snapshots \
  --db-instance-identifier sekar-prod-db \
  --region ap-southeast-3 \
  --query 'DBSnapshots[0].[DBSnapshotIdentifier,Status]'

# 5. Notify team in Slack
# Post in #sekar-deployments: "Phase 2 deployment starting in 1 hour. Backup created: sekar-prod-db-pre-phase2-20260121-140000"
```

### Step 2: Deploy Backend (Automated via GitHub Actions)

**Push to GitHub (triggers CI/CD):**
```bash
git checkout develop
git pull origin develop
git tag -a v2.0.0-rc1 -m "Phase 2 Release Candidate 1"
git push origin v2.0.0-rc1

# Merge to staging
git checkout staging
git merge develop
git push origin staging

# Wait for CI/CD to complete (check GitHub Actions)
# GitHub Actions will:
# 1. Run lint, tests, security scans
# 2. Build Docker image
# 3. Push to ECR with tag "staging-latest"
# 4. SSH to staging EC2
# 5. Pull latest image
# 6. Restart containers

# Monitor deployment in GitHub Actions
# https://github.com/<org>/sekar/actions

# Verify deployment
curl http://staging.sekar.wahyutrip.com/api/health
curl http://staging.sekar.wahyutrip.com/api/docs | grep -i "task"
```

**Run migrations in staging (via SSH):**
```bash
# SSH to staging EC2
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>

# Run migrations
cd ~/sekar
docker-compose run --rm backend npm run migration:run:prod

# Verify
docker-compose run --rm backend sh -c "
  PGPASSWORD=\$DATABASE_PASSWORD psql \
    -h \$DATABASE_HOST \
    -U \$DATABASE_USER \
    -d \$DATABASE_NAME \
    -c '\dt'
"
```

### Step 3: Smoke Tests (15 minutes)

**Backend API Tests:**
```bash
# Test new endpoints
API_URL="http://staging.sekar.wahyutrip.com"

# 1. Test task creation
curl -X POST $API_URL/api/v1/tasks \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test cleanup task",
    "description": "Cleanup area A",
    "type": "cleaning",
    "areaId": "uuid-here",
    "assignedTo": "uuid-here",
    "deadline": "2026-01-22T10:00:00Z"
  }'

# 2. Test notification sending
curl -X POST $API_URL/api/v1/notifications/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-here",
    "title": "Test Notification",
    "body": "This is a test",
    "type": "task_assigned"
  }'

# 3. Test KMZ import
curl -X POST $API_URL/api/v1/areas/import-kmz \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test-areas.kmz"
```

### Step 4: Deploy Mobile App (Automated via GitHub Actions)

**GitHub Actions automatically builds and signs APK:**

```bash
# Mobile workflow triggers on push to staging/main
# 1. Builds release APK
# 2. Signs with Android keystore
# 3. Uploads to GitHub Artifacts

# Download APK from GitHub Actions
# Go to: https://github.com/<org>/sekar/actions
# Select the latest mobile workflow run
# Download "sekar-staging-signed.apk" artifact

# Or distribute via Firebase (manual for staging)
cd fe/mobile
firebase appdistribution:distribute \
  android/app/build/outputs/apk/release/app-release-signed.apk \
  --app <firebase-app-id> \
  --groups "qa-team" \
  --release-notes "Phase 2 staging build"
```

### Step 5: UAT Testing (2-3 days in staging)

**QA Test Cases:**

**1. Push Notifications**
- [ ] Worker receives notification when task is assigned
- [ ] Tapping notification opens task detail screen
- [ ] Notification appears in in-app notification list
- [ ] Notification badge count updates correctly
- [ ] Worker can mark notifications as read

**2. Task Management**
- [ ] Supervisor can create new task
- [ ] Supervisor can assign task to worker
- [ ] Worker sees assigned tasks on dashboard
- [ ] Worker can start task (status → in_progress)
- [ ] Worker can complete task with notes
- [ ] Supervisor can view task completion status
- [ ] Task deadline shows warning when approaching

**3. KMZ Import**
- [ ] Admin can upload KMZ file
- [ ] Areas are created from KMZ polygons
- [ ] Area coordinates are correctly parsed
- [ ] Import errors are handled gracefully
- [ ] Import summary shows success/failure counts

**4. Area Revision History**
- [ ] Area changes are tracked
- [ ] Revision history shows who made changes
- [ ] Revision history shows what changed
- [ ] Admin can view revision timeline

### Step 6: Production Deployment (During low-traffic window)

**Recommended Time:** Sunday 02:00-04:00 WIB (low worker activity)

**Deployment Steps (Automated):**
```bash
# 1. Create production backup
aws rds create-db-snapshot \
  --db-instance-identifier sekar-prod-db \
  --db-snapshot-identifier sekar-prod-db-pre-phase2-$(date +%Y%m%d-%H%M%S) \
  --region ap-southeast-3

# 2. Merge to main (triggers production deployment via GitHub Actions)
git checkout main
git merge staging
git tag -a v2.0.0 -m "Phase 2 Production Release"
git push origin main
git push origin v2.0.0

# 3. Monitor deployment in GitHub Actions
# GitHub Actions will:
# - Run full test suite
# - Build and tag image with commit SHA
# - Push to ECR with tags: <sha> and "latest"
# - Create backup tag of current production image
# - SSH to production EC2
# - Pull latest image
# - Restart containers (zero-downtime)
# - Run smoke tests

# 4. Run migrations in production (via SSH)
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar
docker-compose run --rm backend npm run migration:run:prod
exit

# 5. Verify deployment
curl http://sekar.wahyutrip.com/api/health
curl http://sekar.wahyutrip.com/api/docs | grep -i "task"

# 6. Monitor logs for errors
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar
docker-compose logs -f backend
```

### Step 7: Post-Deployment Verification (30 minutes)

**Checklist:**
```bash
# 1. Health check
curl http://sekar.wahyutrip.com/api/health

# 2. Check Docker logs for errors
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar
docker-compose logs --tail=100 backend | grep -i error

# 3. Verify new tables
docker-compose run --rm backend sh -c "
  PGPASSWORD=\$DATABASE_PASSWORD psql \
    -h \$DATABASE_HOST \
    -U \$DATABASE_USER \
    -d \$DATABASE_NAME \
    -c 'SELECT COUNT(*) FROM tasks; SELECT COUNT(*) FROM notifications;'
"

# 4. Test FCM notification sending (via Swagger or API)
curl -X POST http://sekar.wahyutrip.com/api/v1/notifications/send \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<test-user-id>",
    "title": "Production Test",
    "body": "Testing FCM in production",
    "type": "shift_reminder"
  }'

# 5. Monitor CloudWatch alarms (no new alarms should trigger)

# 6. Check error rate in CloudWatch dashboard
# Should remain < 1%

# 7. Verify mobile app can register FCM token
# Install APK on test device, login, check backend logs for FCM token registration
```

---

## 8. Monitoring - Phase 2 Additions

### New CloudWatch Metrics

**Custom Metrics to Add:**
```typescript
// Backend: Log Phase 2 metrics
await logMetric('TaskCreated', 1, 'Count');
await logMetric('TaskAssigned', 1, 'Count');
await logMetric('TaskCompleted', 1, 'Count');
await logMetric('NotificationSent', 1, 'Count');
await logMetric('NotificationFailed', 1, 'Count');
await logMetric('FCMTokenRegistered', 1, 'Count');
await logMetric('KMZImportSuccess', 1, 'Count');
await logMetric('KMZImportFailed', 1, 'Count');
await logMetric('KMZImportDuration', 5234, 'Milliseconds');
```

### New CloudWatch Alarms

**Alarm 1: High Notification Failure Rate**
```yaml
AlarmName: SEKAR-Prod-NotificationFailureHigh
MetricName: NotificationFailed
Namespace: SEKAR/API
Statistic: Sum
Period: 300  # 5 minutes
EvaluationPeriods: 2
Threshold: 10
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-3:ACCOUNT_ID:sekar-warning-alerts
```

**Alarm 2: Redis Connection Failures**
```yaml
AlarmName: SEKAR-Prod-RedisConnectionFailed
MetricName: CacheHits
Namespace: AWS/ElastiCache
Statistic: Sum
Period: 300
EvaluationPeriods: 1
Threshold: 0
ComparisonOperator: LessThanThreshold
Dimensions:
  - Name: CacheClusterId
    Value: sekar-redis-prod
Actions:
  - arn:aws:sns:ap-southeast-3:ACCOUNT_ID:sekar-high-alerts
```

**Alarm 3: Bull Queue Processing Delays**
```yaml
# Custom metric from Bull queue
AlarmName: SEKAR-Prod-QueueDelayHigh
MetricName: QueueWaitTime
Namespace: SEKAR/Queue
Statistic: Average
Period: 300
EvaluationPeriods: 2
Threshold: 60000  # 60 seconds
ComparisonOperator: GreaterThanThreshold
Actions:
  - arn:aws:sns:ap-southeast-3:ACCOUNT_ID:sekar-warning-alerts
```

### Updated Dashboard

Add new row to `SEKAR-Application-Metrics` dashboard:

**Row: Phase 2 Features**
| Widget | Type | Metric | Period |
|--------|------|--------|--------|
| Tasks Created Today | Number | `SEKAR/API/TaskCreated` | 1 day |
| Notifications Sent Today | Number | `SEKAR/API/NotificationSent` | 1 day |
| Notification Failure Rate | Line | `SEKAR/API/NotificationFailed / NotificationSent * 100` | 5 min |
| FCM Token Registrations | Number | `SEKAR/API/FCMTokenRegistered` | 1 day |

---

## 9. Rollback Procedure

### When to Rollback

**Critical Issues:**
- API completely unresponsive
- Database migration failed and can't be fixed
- High error rate (> 10%) persists after 15 minutes
- FCM notifications causing app crashes
- Data loss detected

**Minor Issues (don't rollback):**
- Slow performance (optimize instead)
- Single endpoint failing (can be fixed without rollback)
- Minor UI glitches

### Rollback Steps

**Step 1: Rollback Backend (via ECR)**

```bash
# SSH to EC2
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar

# List available images in ECR
aws ecr describe-images \
  --repository-name sekar-backend \
  --region ap-southeast-3 \
  --query 'sort_by(imageDetails,& imagePushedAt)[*].[imageTags[0],imagePushedAt]' \
  --output table

# Option 1: Use backup tag created by GitHub Actions
# GitHub Actions automatically creates backup-YYYYMMDD-HHMMSS tag before deployment

# Update docker-compose.yml to use backup tag
nano docker-compose.yml
# Change image to: <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:backup-20260121-020000

# Pull and restart
aws ecr get-login-password --region ap-southeast-3 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com
docker-compose pull
docker-compose up -d

# Option 2: Use previous commit SHA tag
# Update docker-compose.yml to use specific commit SHA
nano docker-compose.yml
# Change image to: <account-id>.dkr.ecr.ap-southeast-3.amazonaws.com/sekar-backend:<previous-commit-sha>

docker-compose pull
docker-compose up -d
```

**Step 2: Revert Database (if needed)**

```bash
# Only if migrations caused data loss
# Restore from backup taken before deployment

aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod-db-restored \
  --db-snapshot-identifier sekar-prod-db-pre-phase2-20260121-140000 \
  --region ap-southeast-3

# After restore completes, update DNS or connection strings
# This will cause downtime - coordinate with team
```

**Step 3: Disable Phase 2 Features (Quick Mitigation)**

```bash
# Quick mitigation: disable features via environment variables
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar
nano .env.production

# Disable Phase 2 features
FCM_ENABLED=false
TASK_AUTO_ASSIGN_ENABLED=false

# Restart
docker-compose down && docker-compose up -d
```

**Step 4: Verify Rollback**

```bash
# Check health
curl http://sekar.wahyutrip.com/api/health

# Check error rate (should be < 1%)
ssh -i sekar-key.pem ec2-user@<prod-elastic-ip>
cd ~/sekar
docker-compose logs --tail=100 backend | grep -i error

# Verify Phase 1 features still work
curl -X POST http://sekar.wahyutrip.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Step 5: Post-Rollback Analysis**
- Review logs to identify root cause
- Document what went wrong
- Fix issues in development
- Re-test thoroughly before next deployment attempt
- Schedule post-mortem meeting

---

## 10. Testing Checklist

### Backend API Testing

**Task Management Endpoints:**
- [ ] POST /api/v1/tasks - Create new task
- [ ] GET /api/v1/tasks - List all tasks (with filters)
- [ ] GET /api/v1/tasks/:id - Get task details
- [ ] PATCH /api/v1/tasks/:id - Update task
- [ ] PATCH /api/v1/tasks/:id/assign - Assign task to worker
- [ ] PATCH /api/v1/tasks/:id/start - Start task
- [ ] PATCH /api/v1/tasks/:id/complete - Complete task
- [ ] DELETE /api/v1/tasks/:id - Delete task (soft delete)

**Notification Endpoints:**
- [ ] POST /api/v1/notifications/send - Send push notification
- [ ] POST /api/v1/fcm-tokens/register - Register FCM token
- [ ] GET /api/v1/notifications - List notifications for user
- [ ] PATCH /api/v1/notifications/:id/read - Mark as read
- [ ] GET /api/v1/notifications/unread-count - Get unread count

**KMZ Import Endpoints:**
- [ ] POST /api/v1/areas/import-kmz - Import areas from KMZ file
- [ ] GET /api/v1/areas/import-history - View import history

**Area Revision Endpoints:**
- [ ] GET /api/v1/areas/:id/revisions - Get revision history
- [ ] GET /api/v1/areas/revisions/:id - Get specific revision

### Mobile App Testing

**Push Notifications:**
- [ ] App requests notification permissions on first launch
- [ ] FCM token is registered with backend after login
- [ ] Notifications appear when app is in foreground
- [ ] Notifications appear when app is in background
- [ ] Notifications appear when app is closed
- [ ] Tapping notification opens correct screen
- [ ] Notification badge count updates
- [ ] Notifications list shows all received notifications
- [ ] Mark notification as read works
- [ ] Clear all notifications works

**Task Management:**
- [ ] Worker sees "My Tasks" tab on dashboard
- [ ] Task list shows assigned tasks
- [ ] Task detail screen shows all information
- [ ] Start task button works (status updates)
- [ ] Complete task form validates input
- [ ] Complete task submits successfully
- [ ] Task completion shows success message
- [ ] Completed tasks show in separate tab

**Supervisor Features:**
- [ ] Supervisor sees "Tasks" section in menu
- [ ] Create task form validates input
- [ ] Create task submits successfully
- [ ] Assign task to worker works
- [ ] View all tasks with filters works
- [ ] View task status updates in real-time

### Performance Testing

**Load Test Scenarios:**
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test notification sending
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  -p notification-payload.json \
  -T application/json \
  http://staging.sekar.wahyutrip.com/api/v1/notifications/send

# Test task creation
ab -n 50 -c 5 \
  -H "Authorization: Bearer $TOKEN" \
  -p task-payload.json \
  -T application/json \
  http://staging.sekar.wahyutrip.com/api/v1/tasks
```

**Expected Performance:**
- Task creation: < 300ms (P95)
- Notification sending: < 500ms (P95)
- KMZ import (100 polygons): < 10s (P95)
- Task list retrieval: < 200ms (P95)

---

## 11. Documentation Updates

### API Documentation (Swagger)

Verify Swagger UI includes all Phase 2 endpoints:
- http://sekar.wahyutrip.com/api/docs#/Tasks
- http://sekar.wahyutrip.com/api/docs#/Notifications
- http://sekar.wahyutrip.com/api/docs#/Areas (KMZ import)

### User Documentation

Update user guides:
- [ ] Worker mobile app guide (task management, notifications)
- [ ] Supervisor guide (task assignment, KMZ import)
- [ ] Admin guide (notification settings, FCM configuration)

### Developer Documentation

Update technical docs:
- [ ] API contracts in `specs/api/contracts.md`
- [ ] Database schema in `specs/database/schema.md`
- [ ] Architecture decisions (ADRs) if any new patterns introduced
- [ ] Environment variables in `CLAUDE.md`

---

## 12. Communication Plan

### Pre-Deployment Announcement (3 days before)

**Email to:** All stakeholders, supervisors
**Subject:** SEKAR Phase 2 Deployment - New Features Coming

**Content:**
```
Dear SEKAR Users,

We're excited to announce the Phase 2 deployment scheduled for Sunday, January 26, 2026 at 02:00 WIB.

New Features:
✅ Push Notifications - Receive real-time alerts for tasks and shift reminders
✅ Task Management - Supervisors can assign and track tasks
✅ Area Import - Bulk import areas from KMZ files
✅ Revision History - Track changes to area boundaries

Expected Downtime: 30 minutes (02:00 - 02:30 WIB)

What You Need to Do:
- Workers: Update mobile app when prompted
- Supervisors: Allow notification permissions when asked
- No action needed for existing data (all data will be preserved)

Questions? Contact support@sekar.dlhsurabaya.go.id

Thank you,
SEKAR Development Team
```

### Deployment Day Updates

**Slack Channel: #sekar-deployments**
```
02:00 WIB - Deployment started
02:05 WIB - Database backup completed
02:10 WIB - GitHub Actions deployment in progress
02:15 WIB - Docker image pushed to ECR
02:20 WIB - Migrations running
02:25 WIB - Smoke tests passing
02:30 WIB - ✅ Deployment complete, all systems operational
```

### Post-Deployment Announcement

**Email to:** All users
**Subject:** SEKAR Phase 2 Live - New Features Available

**Content:**
```
SEKAR Phase 2 is now live!

🔔 Push Notifications
You'll now receive notifications for:
- Task assignments
- Shift reminders (30 min before)
- Shift ending alerts
- Report status updates

📋 Task Management
Supervisors can now:
- Create and assign tasks
- Set deadlines and priorities
- Track task completion

Workers can:
- View assigned tasks
- Start and complete tasks
- Add completion notes

🗺️ Area Import (Supervisors/Admin)
Import multiple areas at once from KMZ files

Update Your App:
Download v2.0.0 from GitHub Releases:
https://github.com/<org>/sekar/releases/latest

Need Help?
Check the user guide: [link]
Contact support: support@sekar.dlhsurabaya.go.id

Thank you,
SEKAR Development Team
```

---

## 13. Success Criteria

Phase 2 deployment is considered successful when:

**Technical Metrics:**
- [ ] All health checks passing
- [ ] Error rate < 1%
- [ ] API response time P95 < 500ms
- [ ] Zero critical alarms triggered
- [ ] All database migrations completed
- [ ] Redis cluster healthy
- [ ] FCM notifications delivering successfully

**Functional Metrics:**
- [ ] 100% of Phase 1 features still working
- [ ] Task creation and assignment working
- [ ] Push notifications delivering to devices
- [ ] KMZ import processing files correctly
- [ ] Area revision history tracking changes

**User Metrics (first week after deployment):**
- [ ] > 80% of workers installed app update
- [ ] > 90% of workers allowed notification permissions
- [ ] > 10 tasks created by supervisors
- [ ] > 50 push notifications sent
- [ ] Zero user-reported critical bugs

**Performance Metrics:**
- [ ] Notification delivery rate > 95%
- [ ] Task creation success rate > 99%
- [ ] KMZ import success rate > 90%
- [ ] Mobile app crash rate < 1%

---

## 14. Known Issues and Workarounds

### Issue 1: FCM Token Not Registering

**Symptoms:** User doesn't receive push notifications
**Cause:** App doesn't have notification permissions
**Workaround:**
1. Go to phone Settings → Apps → SEKAR → Permissions
2. Enable Notifications
3. Restart SEKAR app
4. Login again

### Issue 2: KMZ Import Fails with Large Files

**Symptoms:** Import times out or fails for files > 5MB
**Cause:** Default timeout too short
**Workaround:**
- Split large KMZ files into smaller chunks (< 50 polygons each)
- Or increase timeout (requires backend update)

### Issue 3: Bull Queue Not Processing Jobs

**Symptoms:** Notifications delayed or not sent
**Cause:** Redis connection issue
**Diagnosis:**
```bash
# Check Redis connectivity
redis-cli -h sekar-redis-prod.xxxxx.ng.0001.apse3.cache.amazonaws.com ping

# Check Bull queue status via API
curl http://sekar.wahyutrip.com/admin/queues \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
**Resolution:**
- Restart backend application: `docker-compose restart backend`
- Check Redis security group allows traffic from app servers

---

## 15. Support Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| **DevOps Lead** | ahmad@dlhsurabaya.go.id | Infrastructure, deployment |
| **Backend Lead** | budi@dlhsurabaya.go.id | API, database, integrations |
| **Mobile Lead** | citra@dlhsurabaya.go.id | Mobile app, notifications |
| **QA Lead** | dani@dlhsurabaya.go.id | Testing, bug reports |
| **Product Manager** | eka@dlhsurabaya.go.id | Requirements, priorities |
| **On-Call** | +6281234567890 | Emergency escalation |

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-25
**Status:** Active - Phase 2
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`phase-1-deployment.md`](./phase-1-deployment.md), [`monitoring.md`](./monitoring.md)
