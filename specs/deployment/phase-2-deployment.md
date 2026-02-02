# Phase 2 Deployment Guide - Complete

**SEKAR Phase 2 Production Deployment**
**Last Updated:** February 2, 2026
**Status:** Production Ready
**Estimated Time:** 2-3 hours (including monitoring)

---

## Quick Reference

**What's Different from Phase 1:**
- ✅ **Automated CI/CD** - GitHub Actions replaces manual ECR deployment
- ✅ **Zero-Downtime** - Rolling updates via Docker Compose
- ✅ **Unified Seeder** - Single `npm run seed` for all phases
- ✅ **Automatic Migrations** - Runs during deployment
- ✅ **Backup Tagging** - Auto-backup before production deployment

**Prerequisites:**
- [ ] GitHub Secrets configured (11 secrets required)
- [ ] Firebase project created with FCM
- [ ] All tests passing (845/845, 90.77% coverage)
- [ ] Migration tested locally
- [ ] Deployment window scheduled

**Key Changes:**
- 6 new database tables (rayons, shift_definitions, tasks, etc.)
- 43 new API endpoints (83 total)
- Phase 2 environment variables
- Firebase/FCM integration (optional, can disable)

---

## Part 1: Pre-Deployment Setup (45 min)

### 1.1 Verify Local Environment (15 min)

**IMPORTANT:** Migrations are designed for production upgrades (adding Phase 2 to existing Phase 1). For fresh local testing, follow this sequence:

\`\`\`bash
# 1. Verify all tests pass
cd be
npm test
# Expected: 845/845 passing, 90.77% coverage

# 2. Fresh database setup
cd ../infra
./stop.sh
./start.sh  # Fresh PostgreSQL, empty sekar_db
cd ../be

# 3. Enable synchronize temporarily (creates tables from entities)
sed -i 's/DATABASE_SYNCHRONIZE=false/DATABASE_SYNCHRONIZE=true/' .env

# Verify
grep DATABASE_SYNCHRONIZE .env
# Should show: DATABASE_SYNCHRONIZE=true

# 4. Run unified seeder (creates ALL tables + data)
npm run seed
# Expected:
# ✅ Phase 1 seeding complete
# ✅ Phase 2 seeding complete
# ✅ Tasks seeding complete

# 5. Verify 16 tables created
docker exec -it sekar-postgres psql -U postgres -d sekar_db -c "\\dt" | grep -E "users|areas|rayons"
# Should show: users, areas, shifts, reports, rayons, shift_definitions, etc.

# 6. Switch to production mode (migrations only)
sed -i 's/DATABASE_SYNCHRONIZE=true/DATABASE_SYNCHRONIZE=false/' .env

# 7. Mark migrations as executed (tables already exist from seeder)
docker exec -i sekar-postgres psql -U postgres -d sekar_db << 'SQL'
INSERT INTO typeorm_migrations (timestamp, name)
VALUES
  (1737006000000, 'AddProductionIndexesAndConstraints1737006000000'),
  (1737720000000, 'Phase2DatabaseSchema1737720000000')
ON CONFLICT DO NOTHING;
SQL

# 8. Verify no pending migrations
npm run migration:run
# Expected: "No migrations are pending"

# 9. Start backend and test
npm run start:dev &
sleep 5
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected"}
\`\`\`

**Why This Approach:**
- **Fresh setup:** Seeder creates all tables at once (faster, simpler)
- **Production:** Migrations upgrade existing Phase 1 → Phase 2
- **Both migrations marked as executed** because tables were created by seeder

**Checklist:**
- [x] All 845 tests passing
- [x] Coverage ≥90% (90.77%)
- [x] No console.log or debug code
- [x] 16 tables exist in database
- [x] Both migrations marked as executed
- [x] `npm run migration:run` shows "No migrations are pending"
- [x] Health check returns OK

---

### 1.2 Set Up GitHub Secrets (30 min)

**Required for CI/CD Automation**

GitHub Secrets store sensitive credentials used by CI/CD workflows. This section guides you step-by-step through creating and adding 11 required secrets.

**⚠️ RECOMMENDATION: Use Environment Secrets (Not Repository Secrets)**

Environment secrets provide better security and organization for multi-environment deployments:
- ✅ Different values per environment (dev/staging/prod)
- ✅ Protection rules for production deployments
- ✅ Scoped access control
- ✅ Clear organization

---

#### Navigate to GitHub Environment Settings

**1. Open your repository in GitHub:**
```
https://github.com/your-username/sekar
```

**2. Create Environments:**
- Click **"Settings"** tab (top navigation)
- Scroll down left sidebar → Click **"Environments"**
- Click **"New environment"**
- Create three environments:
  - `development` (for develop branch)
  - `staging` (for staging branch)
  - `production` (for main branch)

**3. Configure Production Protection (Recommended):**
- Click **"production"** environment
- Enable **"Required reviewers"**
- Add yourself and/or team members as reviewers
- Enable **"Wait timer"** (optional, e.g., 5 minutes)
- This prevents accidental production deployments

**4. For each environment, you'll add secrets using "Add secret" button**

**Note:** Repository secrets are still useful for values that are the same across all environments (like `AWS_REGION`). Use environment secrets for values that differ per environment.

---

#### AWS & ECR Secrets (Existing IAM User)

**Note:** The `sekar-cicd-user` IAM user was created in Phase 1 deployment. If you haven't set it up yet, see `specs/deployment/phase-1-deployment.md` section 2.4.

**Verify IAM User Exists:**

**⚠️ IMPORTANT:** You need **admin/root credentials** to verify IAM users. If you get "AccessDenied", you're likely using `sekar-cicd-user` credentials (which is correct - it shouldn't have IAM permissions).

**Method 1: AWS Console (Recommended)**
```
1. Go to: https://console.aws.amazon.com/iam/home#/users
2. Login with your root/admin account
3. Search for "sekar-cicd-user"
4. If found: Click user → View "Permissions" tab
```

**Method 2: AWS CLI (with admin profile)**
```bash
# Check current identity
aws sts get-caller-identity

# If you're using sekar-cicd-user, switch to admin profile
aws iam get-user --user-name sekar-cicd-user --profile admin

# List attached policies
aws iam list-attached-user-policies --user-name sekar-cicd-user --profile admin
```

**Expected policies:**
- `AmazonEC2ContainerRegistryPowerUser`
- `AmazonS3FullAccess`

**If you see "AccessDenied: User sekar-cicd-user is not authorized":**
This is **correct behavior** - the CI/CD user doesn't need IAM permissions. The error message actually confirms the user exists (shows the ARN). You can proceed to the next step.

**If user doesn't exist, create it:**
```bash
# Create IAM user
aws iam create-user --user-name sekar-cicd-user

# Attach ECR policy (for pushing Docker images)
aws iam attach-user-policy \
  --user-name sekar-cicd-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# Attach S3 policy (for media uploads)
aws iam attach-user-policy \
  --user-name sekar-cicd-user \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

**Generate Access Keys (if not already done):**

**⚠️ Use admin/root credentials for this command:**
```bash
# Switch to admin profile (or use root account)
aws configure --profile admin
# Then generate access keys
aws iam create-access-key --user-name sekar-cicd-user --profile admin

# Or if you only have one profile with admin rights:
aws iam create-access-key --user-name sekar-cicd-user
```

**Save the output:**
```json
{
  "AccessKey": {
    "AccessKeyId": "AKIA...",        ← Save this
    "SecretAccessKey": "wJa...",     ← Save this (shown once only!)
    "Status": "Active"
  }
}
```

**⚠️ IMPORTANT:** The `SecretAccessKey` is shown **once only**. Save it immediately! If you lose it, you must delete and create a new access key.

**Add to GitHub Environment Secrets:**

**For EACH environment (development, staging, production):**

**Secret 1: AWS_ACCESS_KEY_ID** (Environment Secret)
1. Go to Settings → Environments → Select environment (e.g., `production`)
2. Click **"Add environment secret"**
3. Name: `AWS_ACCESS_KEY_ID`
4. Value: Paste the `AccessKeyId` for this environment
5. Click **"Add secret"**
6. Repeat for `development` and `staging` (can use same IAM user or different ones)

**Secret 2: AWS_SECRET_ACCESS_KEY** (Environment Secret)
1. Click **"Add environment secret"**
2. Name: `AWS_SECRET_ACCESS_KEY`
3. Value: Paste the `SecretAccessKey` for this environment
4. Click **"Add secret"**
5. Repeat for other environments

**Secret 3: AWS_REGION** (Repository Secret - Same for All Environments)
1. Go to Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `AWS_REGION`
4. Value: `ap-southeast-3`
5. Click **"Add secret"**

**Note:** If using the same AWS account/IAM user for all environments, you can use repository secrets for AWS credentials. However, environment secrets are recommended if you have separate AWS accounts or want additional security layers.

**Verify AWS secrets:**
```bash
# Test ECR login with these credentials
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
aws ecr describe-repositories --region ap-southeast-3

# Expected: Should list your sekar-backend repository
```

---

#### EC2 SSH Secrets

**For EACH environment (different EC2 instances per environment):**

**Secret 4: EC2_HOST** (Environment Secret)
1. Get your EC2 Elastic IP for each environment:
   ```bash
   # Development EC2
   aws ec2 describe-addresses --region ap-southeast-3 \
     --filters "Name=tag:Name,Values=sekar-dev" \
     --query 'Addresses[0].PublicIp' --output text

   # Staging EC2
   aws ec2 describe-addresses --region ap-southeast-3 \
     --filters "Name=tag:Name,Values=sekar-staging" \
     --query 'Addresses[0].PublicIp' --output text

   # Production EC2
   aws ec2 describe-addresses --region ap-southeast-3 \
     --filters "Name=tag:Name,Values=sekar-prod" \
     --query 'Addresses[0].PublicIp' --output text
   ```
2. For each environment (development, staging, production):
   - Go to Settings → Environments → Select environment
   - Click **"Add environment secret"**
   - Name: `EC2_HOST`
   - Value: Paste the IP address for this environment
   - Click **"Add secret"**

**Secret 5: EC2_USER** (Repository Secret - Same for All)
1. Go to Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `EC2_USER`
4. Value: `ec2-user` (default for Amazon Linux)
5. Click **"Add secret"**

**Secret 6: EC2_SSH_KEY** (Environment Secret - Different Keys per Environment)
1. Get your SSH private key content for each environment:
   ```bash
   # Development key
   cat ~/.ssh/sekar-dev-key.pem

   # Staging key
   cat ~/.ssh/sekar-staging-key.pem

   # Production key
   cat ~/.ssh/sekar-prod-key.pem
   ```
2. For each environment:
   - Go to Settings → Environments → Select environment
   - Click **"Add environment secret"**
   - Name: `EC2_SSH_KEY`
   - Value: Paste the entire key content (with BEGIN/END lines)
   - Click **"Add secret"**

**Note:** If using the same EC2 instance for all environments (NOT recommended for production), you can use repository secrets instead.

**Verify EC2 SSH access:**
```bash
# Test SSH connection
ssh -i ~/.ssh/sekar-key.pem ec2-user@<your-ec2-ip> "echo 'SSH works'"
# Expected: "SSH works"
```

---

#### Android Signing Secrets

**Generate Android Keystore (if not already done):**
```bash
# Navigate to a secure location
cd ~/sekar-credentials
mkdir -p android-signing
cd android-signing

# Create keystore for signing APK
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore sekar-release.keystore \
  -alias sekar-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (create strong password, save it!)
# - Key password (can be same as keystore password)
# - Your name, organization, etc. (fill as needed)
```

**Save the passwords securely!** You'll need them in the next steps.

**Convert keystore to base64:**
```bash
# Create base64 version (single line, no line breaks)
base64 sekar-release.keystore | tr -d '\n' > keystore.base64

# Verify it's a single line
wc -l keystore.base64
# Expected: 0 (no newlines)

# View content
cat keystore.base64
```

**Secret 7: ANDROID_SIGNING_KEY** (Repository Secret - Same Keystore for All Builds)
1. Go to Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `ANDROID_SIGNING_KEY`
4. Value: Paste the entire content from `keystore.base64` (should be ~3000+ characters)
5. Click **"Add secret"**

**Secret 8: ANDROID_KEY_ALIAS** (Repository Secret)
1. Click **"New repository secret"**
2. Name: `ANDROID_KEY_ALIAS`
3. Value: `sekar-key` (the alias you used in keytool command)
4. Click **"Add secret"**

**Secret 9: ANDROID_KEYSTORE_PASSWORD** (Repository Secret)
1. Click **"New repository secret"**
2. Name: `ANDROID_KEYSTORE_PASSWORD`
3. Value: Paste the keystore password you created
4. Click **"Add secret"**

**Secret 10: ANDROID_KEY_PASSWORD** (Repository Secret)
1. Click **"New repository secret"**
2. Name: `ANDROID_KEY_PASSWORD`
3. Value: Paste the key password (often same as keystore password)
4. Click **"Add secret"**

**Note:** Android signing uses the same keystore for all builds because apps signed with different keys cannot update each other on the Play Store.

**Verify keystore:**
```bash
# List keystore contents
keytool -list -v -keystore sekar-release.keystore
# Enter password when prompted
# Expected: Shows alias "sekar-key", validity dates, etc.
```

---

#### API Keys

**Secret 11: GOOGLE_MAPS_API_KEY**

**Create Google Maps API Key:**
1. Go to: https://console.cloud.google.com/google/maps-apis/credentials
2. Click **"Create Credentials"** → **"API key"**
3. Copy the generated API key
4. Click **"Edit API key"** (pencil icon)
5. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Search and enable: **"Maps SDK for Android"**
6. Under **"Application restrictions"** (optional but recommended):
   - Select **"Android apps"**
   - Click **"Add an item"**
   - Package name: `com.wahyutrip.sekar`
   - SHA-1 certificate fingerprint: Get from your keystore (see below)
7. Click **"Save"**

**Get SHA-1 fingerprint from your keystore:**
```bash
keytool -list -v -keystore sekar-release.keystore | grep SHA1
# Copy the SHA1 value and paste in Google Console
```

**Add to GitHub:**

**Option A: Same API Key for All Environments (Repository Secret)**
1. Go to Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `GOOGLE_MAPS_API_KEY`
4. Value: Paste your Google Maps API key (e.g., `AIzaSyD...`)
5. Click **"Add secret"**

**Option B: Different API Keys per Environment (Environment Secret - Recommended)**
1. Create separate API keys in Google Cloud Console for each environment
2. For each environment (development, staging, production):
   - Go to Settings → Environments → Select environment
   - Click **"Add environment secret"**
   - Name: `GOOGLE_MAPS_API_KEY`
   - Value: Paste the API key for this environment
   - Click **"Add secret"**

**Recommendation:** Use separate API keys with proper restrictions per environment for better security and quota management.

**Verify API key:**
```bash
# Test API key with a simple request
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Surabaya&key=<your-api-key>"
# Expected: Should return JSON with Surabaya coordinates
```

---

#### Verification Checklist

**Verify all secrets are added:**

**Repository Secrets** (Settings → Secrets and variables → Actions):
| Secret Name | Status |
|------------|--------|
| AWS_REGION | ✅ Added |
| EC2_USER | ✅ Added |
| ANDROID_SIGNING_KEY | ✅ Added |
| ANDROID_KEY_ALIAS | ✅ Added |
| ANDROID_KEYSTORE_PASSWORD | ✅ Added |
| ANDROID_KEY_PASSWORD | ✅ Added |

**Environment Secrets** (Settings → Environments → [environment] → Secrets):

For **development** environment:
| Secret Name | Status |
|------------|--------|
| AWS_ACCESS_KEY_ID | ✅ Added |
| AWS_SECRET_ACCESS_KEY | ✅ Added |
| EC2_HOST | ✅ Added |
| EC2_SSH_KEY | ✅ Added |
| GOOGLE_MAPS_API_KEY | ✅ Added (optional) |

For **staging** environment:
| Secret Name | Status |
|------------|--------|
| AWS_ACCESS_KEY_ID | ✅ Added |
| AWS_SECRET_ACCESS_KEY | ✅ Added |
| EC2_HOST | ✅ Added |
| EC2_SSH_KEY | ✅ Added |
| GOOGLE_MAPS_API_KEY | ✅ Added (optional) |

For **production** environment:
| Secret Name | Status |
|------------|--------|
| AWS_ACCESS_KEY_ID | ✅ Added |
| AWS_SECRET_ACCESS_KEY | ✅ Added |
| EC2_HOST | ✅ Added |
| EC2_SSH_KEY | ✅ Added |
| GOOGLE_MAPS_API_KEY | ✅ Added (optional) |

**Test GitHub Actions can access secrets:**
```bash
# Commit a small change to trigger CI/CD
cd /path/to/sekar
git checkout -b test-secrets
echo "# Test secrets" >> README.md
git add README.md
git commit -m "test: verify GitHub secrets"
git push origin test-secrets

# Go to: GitHub → Actions tab
# Check if workflows start running (they should fail if secrets are wrong)
```

**Common Issues:**

**Issue 1: AWS secret rejected**
```
Error: The security token included in the request is invalid
```
**Fix:** Regenerate access keys, ensure no extra spaces when copying

**Issue 2: SSH connection failed**
```
Error: Permission denied (publickey)
```
**Fix:** Verify entire SSH key copied including BEGIN/END lines, check EC2_HOST is correct IP

**Issue 3: Android signing failed**
```
Error: Keystore was tampered with, or password was incorrect
```
**Fix:** Verify base64 conversion has no line breaks (`tr -d '\n'`), check passwords are correct

**Complete Secrets Reference Table:**

| Secret Name | Type | Example Value | Description |
|------------|------|---------------|-------------|
| `AWS_ACCESS_KEY_ID` | Environment | `AKIAIOSFODNN7...` | AWS IAM access key (20 chars) - Different per environment |
| `AWS_SECRET_ACCESS_KEY` | Environment | `wJalrXUtnFEMI...` | AWS IAM secret key (40 chars) - Different per environment |
| `AWS_REGION` | Repository | `ap-southeast-3` | AWS region (Jakarta) - Same for all |
| `EC2_HOST` | Environment | `13.229.123.45` | EC2 Elastic IP - Different per environment |
| `EC2_USER` | Repository | `ec2-user` | EC2 SSH username - Same for all |
| `EC2_SSH_KEY` | Environment | `-----BEGIN RSA...` | SSH private key - Different per environment |
| `ANDROID_SIGNING_KEY` | Repository | `MIIJKQIBAzCC...` | Base64 keystore - Same for all (Play Store requirement) |
| `ANDROID_KEY_ALIAS` | Repository | `sekar-key` | Keystore alias - Same for all |
| `ANDROID_KEYSTORE_PASSWORD` | Repository | `******` | Keystore password - Same for all |
| `ANDROID_KEY_PASSWORD` | Repository | `******` | Key password - Same for all |
| `GOOGLE_MAPS_API_KEY` | Env/Repo | `AIzaSyD...` | Google Maps API key - Can be same or different |

**Security Best Practices:**

1. **Never commit secrets to git** - Use `.gitignore` for `.keystore`, `.pem`, credentials
2. **Use strong passwords** - Minimum 16 characters for keystore/key passwords
3. **Rotate credentials regularly** - Consider rotating AWS keys every 90 days
4. **Restrict API keys** - Use application and API restrictions on Google Maps key
5. **Backup keystore securely** - Loss of keystore = can't update app on Play Store

---

### 1.3 Set Up Firebase/FCM (15 min)

**Note:** FCM is optional. You can deploy with \`FCM_ENABLED=false\` and enable later.

#### Create Firebase Project

**1. Firebase Console:**
\`\`\`
1. Go to: https://console.firebase.google.com/
2. Click "Add Project"
3. Project name: "SEKAR-Production"
4. Disable Google Analytics (optional)
5. Click "Create Project"
\`\`\`

**2. Register Android App:**
\`\`\`
1. In Firebase project → "Add App" → Android
2. Android package name: com.wahyutrip.sekar
3. Download google-services.json
4. Place in: fe/mobile/android/app/google-services.json
5. Add to .gitignore: **/google-services.json
\`\`\`

**3. Generate Service Account Key:**
\`\`\`
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file (firebase-service-account.json)
4. Store securely (needed for deployment)
\`\`\`

**4. Enable FCM API:**
\`\`\`
1. Go to: https://console.cloud.google.com/
2. Select your Firebase project
3. APIs & Services → Enable "Firebase Cloud Messaging API"
\`\`\`

---

## Part 2: Deployment Execution (30 min)

### 2.1 Create Database Backup (5 min)

**CRITICAL:** Always backup before deployment.

\`\`\`bash
# SSH to production EC2
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>

# Create backup directory
mkdir -p ~/backups/\$(date +%Y%m%d)

# Backup database
docker exec sekar-postgres pg_dump -U postgres sekar_db > \\
  ~/backups/\$(date +%Y%m%d)/sekar_db_pre_phase2_\$(date +%H%M%S).sql

# Verify backup (should be >1MB)
ls -lh ~/backups/\$(date +%Y%m%d)/
# Expected: -rw-r--r-- 1 ec2-user ec2-user 5.2M Feb  2 14:30 sekar_db_pre_phase2_143045.sql
\`\`\`

**Checklist:**
- [ ] Backup file created
- [ ] File size >1MB (verify not empty)
- [ ] Backup path saved for rollback

---

### 2.2 Update Environment Variables (10 min)

**Edit production .env file:**

\`\`\`bash
# SSH to production
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar
nano .env
\`\`\`

**Add Phase 2 variables:**

\`\`\`env
# ============================================
# PHASE 2 ADDITIONS
# ============================================

# Firebase Cloud Messaging
FCM_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# Notification Settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_BATCH_SIZE=100

# Task Management
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

# JWT (verify existing)
JWT_SECRET=<production-secret-at-least-32-chars>
JWT_EXPIRATION=7d
\`\`\`

**Save:** Ctrl+X, Y, Enter

**If disabling FCM:**
\`\`\`env
FCM_ENABLED=false
# Skip Firebase config upload
\`\`\`

---

### 2.3 Upload Firebase Configuration (5 min)

**Skip if \`FCM_ENABLED=false\`**

\`\`\`bash
# From local machine
scp -i ~/.ssh/sekar-prod.pem \\
  /path/to/firebase-service-account.json \\
  ec2-user@<ELASTIC_IP>:~/sekar/config/

# Verify upload
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
ls -l ~/sekar/config/firebase-service-account.json
# Expected: -rw-r--r-- 1 ec2-user ec2-user 2419 Feb  2 14:35 firebase-service-account.json
\`\`\`

---

### 2.4 Deploy via GitHub Actions (5-8 min)

**Option A: Automatic Deployment** (Recommended)

\`\`\`bash
# On local machine
cd /path/to/sekar

# Ensure on main branch
git checkout main
git pull origin main

# Merge latest changes from develop
git merge develop

# Push to trigger CI/CD
git push origin main

# GitHub Actions will automatically:
# 1. Run lint (2 min)
# 2. Run 845 tests with PostgreSQL (3 min)
# 3. Run security scan (npm audit, secret scanning)
# 4. Build Docker image
# 5. Push to ECR with "latest" and "backup-TIMESTAMP" tags
# 6. SSH to production EC2
# 7. Pull latest image
# 8. Run database migration
# 9. Restart containers with zero-downtime
# 10. Run smoke tests
\`\`\`

**Option B: Manual Trigger**

\`\`\`
1. Go to: https://github.com/<YOUR_ORG>/sekar/actions
2. Select "Backend CI/CD" workflow
3. Click "Run workflow"
4. Branch: main
5. Environment: production
6. Click "Run workflow"
\`\`\`

---

### 2.5 Monitor Deployment (5 min)

**Watch GitHub Actions:**

\`\`\`
Pipeline Stages (5-8 minutes total):

✓ Lint and Format Check         (2 min)
✓ Unit Tests                     (3 min)  ← 845 tests
✓ Security Scan                  (1 min)  ← npm audit, secrets
✓ Build                          (1 min)
✓ Deploy to Production:
  ├─ Login to ECR
  ├─ Create backup tag          ← Rollback point
  ├─ Pull latest image
  ├─ Run migrations             ← CRITICAL
  ├─ Restart containers         ← Zero-downtime
  └─ Show logs
✓ Smoke Tests                    (30s)
\`\`\`

**If migration fails:** Deployment aborts, no changes applied.

**Monitor logs:**
\`\`\`bash
# In separate terminal
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar
docker-compose logs -f backend
\`\`\`

---

## Part 3: Verification (15 min)

### 3.1 Health Checks (2 min)

\`\`\`bash
# API Health
curl http://<SERVER_IP>:3000/api/health
# Expected: {"status":"ok","database":"connected"}

# Swagger Documentation
# Open browser: http://<SERVER_IP>:3000/api/docs
# Expected: 83 endpoints (40 Phase 1 + 43 Phase 2)
\`\`\`

---

### 3.2 Test Authentication (2 min)

\`\`\`bash
# Login
curl -X POST http://<SERVER_IP>:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# Save the access_token
TOKEN="<jwt_token_from_response>"
\`\`\`

---

### 3.3 Test Phase 2 Endpoints (5 min)

\`\`\`bash
# Rayons
curl http://<SERVER_IP>:3000/api/rayons \\
  -H "Authorization: Bearer \$TOKEN"
# Expected: [] (empty, no data seeded yet)

# Activity Types
curl http://<SERVER_IP>:3000/api/activity-types \\
  -H "Authorization: Bearer \$TOKEN"
# Expected: [] (empty)

# Tasks
curl http://<SERVER_IP>:3000/api/tasks \\
  -H "Authorization: Bearer \$TOKEN"
# Expected: [] (empty)

# Notifications
curl http://<SERVER_IP>:3000/api/notifications/my \\
  -H "Authorization: Bearer \$TOKEN"
# Expected: [] (empty)

# All returning 200 = SUCCESS
# Returning 404 = Deployment issue, check logs
\`\`\`

---

### 3.4 Verify Database Migration (3 min)

\`\`\`bash
# SSH to production
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>

# Connect to database
docker exec -it sekar-postgres psql -U postgres -d sekar_db

# Check migration status
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;
# Expected: Phase2DatabaseSchema1737720000000 | <timestamp>

# Verify 16 tables exist
\\dt
# Expected:
# - 10 Phase 1 tables: users, areas, shifts, reports, etc.
# - 6 Phase 2 tables: rayons, shift_definitions, activity_types,
#                     special_day_overrides, area_staff_requirements, worker_schedules

# Exit PostgreSQL
\\q
exit
\`\`\`

---

### 3.5 Monitor Application Logs (3 min)

\`\`\`bash
# SSH to production
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar

# Watch for errors
docker-compose logs --tail=100 backend | grep -E "(ERROR|WARN)"

# Should see:
# ✓ "Nest application successfully started"
# ✓ "Mapped {/api/rayons, GET}" (and other Phase 2 routes)
# ✗ NO ERROR messages

# Watch logs for 5 minutes
docker-compose logs -f backend
# Press Ctrl+C to exit
\`\`\`

---

## Part 4: Post-Deployment (1 hour)

### 4.1 Immediate Testing (30 min)

**Mobile App:**
\`\`\`bash
# 1. Install latest APK from GitHub Releases
# Download from: https://github.com/<ORG>/sekar/releases/latest

# 2. Login with test credentials
# Username: worker1 / Password: worker123

# 3. Test GPS tracking
# - Start shift
# - Verify location updates
# - Submit test report with photo

# 4. Test notifications (if FCM enabled)
# - Allow notification permissions when prompted
# - Send test notification from Swagger
\`\`\`

**Web Dashboard:**
\`\`\`bash
# Open browser: http://<SERVER_IP>:3001

# 1. Login
# Username: admin / Password: admin123

# 2. Navigate to new pages
# - Rayons page (should load, empty)
# - Tasks page (should load, empty)
# - Monitoring page (should show real-time stats)

# 3. Verify no console errors (F12 → Console)
\`\`\`

---

### 4.2 Data Setup (30 min)

**IMPORTANT:** Use UI, not seeders for production data.

**1. Import Production Areas (if KMZ available):**
\`\`\`bash
# Via Swagger UI or curl
curl -X POST http://<SERVER_IP>:3000/api/areas/import-kmz \\
  -H "Authorization: Bearer \$TOKEN" \\
  -F "file=@production-areas.kmz"

# Expected response: { "imported": 45, "failed": 0, "total": 45 }
\`\`\`

**2. Create Rayons via Admin UI:**
\`\`\`
1. Login to web dashboard as admin
2. Navigate to: Rayons → Create New
3. Create 7 rayons:
   - Rayon 1 (North)
   - Rayon 2 (South)
   - Rayon 3 (East)
   - Rayon 4 (West)
   - Rayon 5 (Central)
   - Rayon 6 (Industrial)
   - Rayon 7 (Parks)
4. Assign areas to each rayon
\`\`\`

**3. Create Shift Definitions:**
\`\`\`
1. Navigate to: Settings → Shift Definitions
2. Create default shifts:
   - Morning Shift: 07:00 - 15:00
   - Afternoon Shift: 15:00 - 23:00
3. Configure for each rayon
\`\`\`

---

## Part 5: Troubleshooting

### Issue 1: Migration Fails

**Symptoms:**
- "relation 'reports' does not exist" (fresh database)
- "relation 'rayons' already exists" (after running seeder)

**Diagnosis:**
\`\`\`bash
# Check if this is production or local
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>  # Production
# OR
docker-compose logs backend | grep -i migration     # Local

# Check what tables exist
docker exec -it sekar-postgres psql -U postgres -d sekar_db -c "\\dt"
\`\`\`

**Common Causes:**

**A. Fresh Database (Local Testing)**
- Migrations expect existing Phase 1 tables
- **Solution:** Follow section 1.1 - use seeder + mark migrations as executed

\`\`\`bash
# Enable synchronize, run seeder, then mark migrations
sed -i 's/DATABASE_SYNCHRONIZE=false/DATABASE_SYNCHRONIZE=true/' .env
npm run seed
sed -i 's/DATABASE_SYNCHRONIZE=true/DATABASE_SYNCHRONIZE=false/' .env

# Mark both migrations as executed
docker exec -i sekar-postgres psql -U postgres -d sekar_db << 'SQL'
INSERT INTO typeorm_migrations (timestamp, name)
VALUES
  (1737006000000, 'AddProductionIndexesAndConstraints1737006000000'),
  (1737720000000, 'Phase2DatabaseSchema1737720000000')
ON CONFLICT DO NOTHING;
SQL
\`\`\`

**B. Production Deployment**
1. **Table already exists** → Migration ran before, revert and retry
2. **Foreign key constraint** → Check data integrity
3. **Permission denied** → Verify DATABASE_USER has CREATE TABLE rights

\`\`\`bash
# Production: Revert and re-run
docker-compose run --rm backend npm run migration:revert:prod
docker-compose run --rm backend npm run migration:run:prod
\`\`\`

---

### Issue 2: Health Check Returns 500

**Symptoms:** \`curl http://IP:3000/api/health\` returns error

**Diagnosis:**
\`\`\`bash
docker-compose logs --tail=100 backend
\`\`\`

**Common Causes:**
1. **Database connection failed** → Check DATABASE_* env vars
2. **Missing env vars** → Verify .env file complete
3. **Port conflict** → Verify port 3000 not in use

**Resolution:**
\`\`\`bash
# Check environment
docker-compose exec backend printenv | grep DATABASE

# Restart application
docker-compose restart backend
\`\`\`

---

### Issue 3: FCM Notifications Not Working

**Symptoms:** No notifications received on mobile

**Diagnosis:**
\`\`\`bash
# Verify FCM enabled
grep FCM_ENABLED ~/sekar/.env

# Verify service account exists
ls -l ~/sekar/config/firebase-service-account.json

# Check logs for FCM errors
docker-compose logs backend | grep -i firebase
\`\`\`

**Resolution:**
\`\`\`bash
# Test notification manually via Swagger
# http://IP:3000/api/docs → POST /api/notifications/send

# Check mobile app has FCM token registered
# Backend logs should show: "FCM token registered for user: ..."
\`\`\`

---

### Issue 4: Endpoints Return 401 Unauthorized

**Symptoms:** All API calls return 401

**Diagnosis:**
\`\`\`bash
# Verify JWT_SECRET set
grep JWT_SECRET ~/sekar/.env
\`\`\`

**Resolution:**
\`\`\`bash
# Re-login to get fresh token
curl -X POST http://<SERVER_IP>:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# Use new token for subsequent requests
\`\`\`

---

### Issue 5: Containers Not Starting

**Symptoms:** \`docker ps\` shows no containers running

**Diagnosis:**
\`\`\`bash
docker-compose logs
docker-compose ps -a
\`\`\`

**Common Causes:**
1. **Invalid .env syntax** → Check for unquoted special characters
2. **Port already in use** → Check \`lsof -i:3000\`
3. **Out of disk space** → Check \`df -h\`

**Resolution:**
\`\`\`bash
# Fix .env syntax
nano .env

# Stop conflicting processes
sudo lsof -ti:3000 | xargs kill -9

# Clean up disk space
docker system prune -a

# Restart
docker-compose up -d
\`\`\`

---

## Part 6: Rollback Procedure

### When to Rollback

**Rollback immediately if:**
- ✗ API completely unresponsive
- ✗ Migration failed and can't be fixed quickly
- ✗ Error rate >10% persists after 15 minutes
- ✗ Data loss detected
- ✗ Critical security vulnerability introduced

**DON'T rollback for:**
- ✓ Slow performance (optimize instead)
- ✓ Single endpoint failing (can be fixed)
- ✓ Minor UI glitches
- ✓ Non-critical errors

---

### Rollback Steps

**Step 1: Stop Current Deployment**

\`\`\`bash
ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>
cd ~/sekar
docker-compose down
\`\`\`

**Step 2: Revert Migration (if needed)**

\`\`\`bash
# Revert Phase 2 migration
docker-compose run --rm backend npm run migration:revert:prod

# Verify reversion
docker exec -it sekar-postgres psql -U postgres -d sekar_db
SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;
# Should NOT show Phase2DatabaseSchema1737720000000
\\q
\`\`\`

**Step 3: Restore Previous Image**

GitHub Actions created backup tag before deployment:

\`\`\`bash
# List backup tags
aws ecr describe-images \\
  --repository-name sekar-backend \\
  --region ap-southeast-3 \\
  --query 'imageDetails[?contains(imageTags[0], \`backup\`)].imageTags[0]' \\
  --output text

# Expected: backup-20260202-140530

# Pull backup image
docker pull <ECR_REGISTRY>/sekar-backend:backup-20260202-140530

# Tag as latest
docker tag <ECR_REGISTRY>/sekar-backend:backup-20260202-140530 \\
  <ECR_REGISTRY>/sekar-backend:latest

# Restart
docker-compose up -d

# Wait and verify
sleep 30
curl http://<SERVER_IP>:3000/api/health
\`\`\`

**Step 4: Verify Rollback**

\`\`\`bash
# Should return Phase 1 functionality only
curl http://<SERVER_IP>:3000/api/docs
# Endpoint count should be ~40 (not 83)

# Phase 2 endpoints should return 404
curl http://<SERVER_IP>:3000/api/rayons \\
  -H "Authorization: Bearer \$TOKEN"
# Expected: 404 Not Found (as expected after rollback)

# Phase 1 endpoints should work
curl http://<SERVER_IP>:3000/api/areas \\
  -H "Authorization: Bearer \$TOKEN"
# Expected: 200 with areas data
\`\`\`

**Rollback Complete ✓**

---

## Appendices

### Appendix A: Complete GitHub Secrets Reference

| Secret | Type | Required | How to Get |
|--------|------|----------|-----------|
| \`AWS_ACCESS_KEY_ID\` | Environment | ✓ | Create IAM user per environment or use same for all |
| \`AWS_SECRET_ACCESS_KEY\` | Environment | ✓ | From IAM access key creation |
| \`AWS_REGION\` | Repository | ✓ | Always \`ap-southeast-3\` for Jakarta region |
| \`EC2_HOST\` | Environment | ✓ | Elastic IP for each environment's EC2 instance |
| \`EC2_USER\` | Repository | ✓ | Always \`ec2-user\` for Amazon Linux |
| \`EC2_SSH_KEY\` | Environment | ✓ | Content of \`~/.ssh/sekar-{env}-key.pem\` |
| \`ANDROID_SIGNING_KEY\` | Repository | ✓ | \`keytool -genkeypair\`, then \`base64 keystore\` |
| \`ANDROID_KEY_ALIAS\` | Repository | ✓ | Alias used in keytool (e.g., \`sekar-key\`) |
| \`ANDROID_KEYSTORE_PASSWORD\` | Repository | ✓ | Password set during keytool |
| \`ANDROID_KEY_PASSWORD\` | Repository | ✓ | Same as keystore password usually |
| \`GOOGLE_MAPS_API_KEY\` | Env/Repo | ✓ | Google Cloud Console → APIs & Services |

**Secret Types:**
- **Repository Secret:** Same value across all environments (Settings → Secrets and variables → Actions)
- **Environment Secret:** Different value per environment (Settings → Environments → [env] → Secrets)

**Recommended Strategy:**
- Use **Environment Secrets** for credentials that differ per environment (AWS keys, EC2 hosts, SSH keys)
- Use **Repository Secrets** for values that are the same everywhere (Android signing, AWS region, EC2 user)
- This provides better security, protection rules for production, and clearer organization

---

### Appendix B: Phase 2 Environment Variables

**New variables to add to production .env:**

\`\`\`env
# Firebase/FCM
FCM_ENABLED=true
FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json

# Notifications
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_BATCH_SIZE=100

# Tasks
TASK_AUTO_ASSIGN_ENABLED=false
TASK_DEADLINE_WARNING_HOURS=24

# KMZ Import
KMZ_MAX_FILE_SIZE_MB=10
KMZ_MAX_POLYGONS=100

# Database (CRITICAL)
DATABASE_SYNCHRONIZE=false
DATABASE_MIGRATIONS_RUN=false
\`\`\`

**FCM disabled configuration:**
\`\`\`env
FCM_ENABLED=false
# Skip all Firebase setup
\`\`\`

---

### Appendix C: CI/CD Pipeline Details

**Backend Workflow (\`.github/workflows/backend-ci-cd.yml\`):**

**Triggers:**
- Push to \`develop\` → Deploy to Development
- Push to \`staging\` → Deploy to Staging
- Push to \`main\` → Deploy to Production (creates backup tag)

**Pipeline Stages:**
1. **Lint** - ESLint + Prettier (2 min)
2. **Test** - Jest with PostgreSQL service (3 min, 845 tests)
3. **Security** - npm audit + secret scanning (1 min)
4. **Build** - TypeScript compilation + Docker image (1 min)
5. **Deploy** - ECR push + EC2 SSH + migration + restart (2 min)

**Key Features:**
- Zero-downtime via Docker Compose graceful shutdown
- Automatic backup tag: \`backup-YYYYMMDD-HHMMSS\`
- Migration runs before restart
- Smoke tests after deployment
- Artifact retention: 7 days

**Mobile Workflow (\`.github/workflows/mobile-ci-cd.yml\`):**

**Triggers:**
- Push to \`develop\` → Debug APK
- Push to \`staging\` → Signed Release APK
- Push to \`main\` → Signed Release APK + GitHub Release

**Build Process:**
1. Lint + Test (Jest)
2. Create \`.env\` with environment-specific \`API_BASE_URL\`
3. Build APK (debug or release)
4. Sign APK with keystore (staging/prod only)
5. Upload to GitHub Artifacts
6. Create GitHub Release (prod only)

---

### Appendix D: Migration & Seeder Notes

**Database Migrations:**

**Phase 2 adds 6 tables:**
1. \`rayons\` - Geographic sectors (7 rayons)
2. \`shift_definitions\` - Configurable shift times
3. \`activity_types\` - Work categories
4. \`special_day_overrides\` - Holiday exceptions
5. \`area_staff_requirements\` - Staffing rules
6. \`worker_schedules\` - Shift assignments

**Phase 2 modifies 4 tables:**
- \`areas\` - Adds \`boundary\` (GeoJSON), \`rayon_id\`
- \`shifts\` - Adds \`area_id\`, \`worker_id\`
- \`reports\` - Adds \`task_id\`
- \`users\` - Adds indexes for role filtering

**Seeder Strategy:**

**Development/Staging:**
\`\`\`bash
npm run seed  # Creates test data
\`\`\`

**Production:**
- ✗ **NEVER run \`npm run seed\` on production**
- ✓ Import areas via KMZ (API endpoint)
- ✓ Create rayons via admin UI
- ✓ Create shift definitions via admin UI
- ✓ Let users create tasks naturally

**Why no production seeding:**
- Seeders create test users with weak passwords
- Seeders create unrealistic data
- Production data should be organic and real

---

## Success Criteria

**✅ Deployment successful when all true:**

**Technical Metrics:**
- [ ] Health check returns \`{"status":"ok","database":"connected"}\`
- [ ] Swagger shows 83 endpoints (40 + 43)
- [ ] Phase 2 endpoints return 200 (empty arrays OK)
- [ ] 16 tables in database (verified with \`\\dt\`)
- [ ] Migration \`Phase2DatabaseSchema1737720000000\` in migrations table
- [ ] No ERROR logs for 30 minutes

**Functional Metrics:**
- [ ] Authentication works (JWT token generated)
- [ ] Phase 1 features work (areas, shifts, reports)
- [ ] Mobile app connects successfully
- [ ] Web dashboard loads without errors
- [ ] 845 tests passed in CI/CD

**Optional (if FCM enabled):**
- [ ] FCM token registration works
- [ ] Test notification delivers to device
- [ ] Notifications appear in mobile app list

---

## Quick Command Reference

\`\`\`bash
# Backup database
docker exec sekar-postgres pg_dump -U postgres sekar_db > backup.sql

# Run migration
docker-compose run --rm backend npm run migration:run:prod

# Check migration status
docker exec -it sekar-postgres psql -U postgres -d sekar_db \\
  -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1;"

# View logs
docker-compose logs -f backend

# Restart application
docker-compose restart backend

# Check health
curl http://<IP>:3000/api/health

# Login
curl -X POST http://<IP>:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# Test Phase 2 endpoint
curl http://<IP>:3000/api/rayons -H "Authorization: Bearer \$TOKEN"

# Rollback to backup
docker pull <ECR>/sekar-backend:backup-<TIMESTAMP>
docker tag <ECR>/sekar-backend:backup-<TIMESTAMP> <ECR>/sekar-backend:latest
docker-compose up -d
\`\`\`

---

## Additional Resources

- **Complete Status:** \`/specs/COMPLETION_STATUS.md\`
- **Phase 2 Details:** \`/specs/phases/phase-2-enhanced/STATUS.md\`
- **API Contracts:** \`/specs/api/contracts.md\`
- **Database Schema:** \`/specs/database/schema.md\`
- **AWS S3 Setup:** \`/specs/deployment/aws-s3-setup.md\`
- **Infrastructure:** \`/specs/deployment/infrastructure-setup.md\`
- **GitHub Actions:** \`.github/workflows/backend-ci-cd.yml\`

---

## Notes

**Important Reminders:**
- Always backup before deployment
- Never run seeders on production
- Test migration locally first
- Monitor logs for at least 30 minutes post-deployment
- Have rollback plan ready
- FCM setup is optional (can disable with \`FCM_ENABLED=false\`)
- GitHub Actions handles zero-downtime deployment
- Backup image automatically created before production deployment

**Support:**
- **GitHub Actions:** https://github.com/<YOUR_ORG>/sekar/actions
- **Swagger UI:** http://<SERVER_IP>:3000/api/docs
- **Production Server:** \`ssh -i ~/.ssh/sekar-prod.pem ec2-user@<ELASTIC_IP>\`

---

**Last Updated:** February 2, 2026
**Version:** Phase 2 Enhanced Features
**Status:** Production Ready ✅
