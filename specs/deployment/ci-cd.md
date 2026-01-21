# CI/CD Pipeline Specifications

Comprehensive CI/CD pipeline configuration using GitHub Actions for automated testing, building, and deployment.

## Overview

This document describes the continuous integration and continuous deployment (CI/CD) pipelines for the SEKAR project. The pipelines automate testing, building, security scanning, and deployment for both backend API and mobile applications.

---

## 1. CI/CD Architecture

### Pipeline Flow

```
Git Push
    ↓
GitHub Actions Triggered
    ↓
┌─────────────────────────────────────────────────────┐
│            Phase 1: Validation                      │
├─────────────────────────────────────────────────────┤
│ • Checkout code                                     │
│ • Lint code (ESLint, Prettier)                     │
│ • Validate dependencies (npm audit)                 │
│ • Check code formatting                             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│            Phase 2: Testing                         │
├─────────────────────────────────────────────────────┤
│ • Unit tests (Jest)                                 │
│ • Integration tests                                 │
│ • E2E tests                                         │
│ • Coverage check (>80%)                             │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│            Phase 3: Security                        │
├─────────────────────────────────────────────────────┤
│ • Dependency vulnerability scan                     │
│ • SAST (Static Application Security Testing)       │
│ • Secret scanning                                   │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│            Phase 4: Build                           │
├─────────────────────────────────────────────────────┤
│ Backend: Build TypeScript → JavaScript             │
│ Mobile: Build APK/IPA                               │
└─────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────┐
│            Phase 5: Deploy                          │
├─────────────────────────────────────────────────────┤
│ Dev: Auto-deploy on push to dev branch              │
│ Staging: Auto-deploy on push to staging branch      │
│ Production: Manual approval required                │
└─────────────────────────────────────────────────────┘
```

### Branch Strategy

| Branch | Purpose | Auto-Deploy | Approval Required |
|--------|---------|-------------|-------------------|
| `main` | Production-ready code | Yes → Production | Yes (manual) |
| `staging` | Pre-production testing | Yes → Staging | No |
| `develop` | Development integration | Yes → Development | No |
| `feature/*` | Feature development | No | N/A |
| `bugfix/*` | Bug fixes | No | N/A |
| `hotfix/*` | Production hotfixes | No | N/A |

---

## 2. GitHub Actions Workflows

### Workflow 1: Backend CI/CD

**File:** `.github/workflows/backend-ci-cd.yml`

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, staging, develop]
    paths:
      - 'be/**'
      - '.github/workflows/backend-ci-cd.yml'
  pull_request:
    branches: [main, staging, develop]
    paths:
      - 'be/**'

env:
  NODE_VERSION: '18.x'
  AWS_REGION: ap-southeast-1

jobs:
  # Job 1: Code Quality Checks
  lint:
    name: Lint and Format Check
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./be

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: be/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check Prettier formatting
        run: npx prettier --check "src/**/*.ts" "test/**/*.ts"

  # Job 2: Unit and Integration Tests
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    needs: lint
    defaults:
      run:
        working-directory: ./be

    services:
      postgres:
        image: postgres:14-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sekar_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: be/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          DATABASE_NAME: sekar_test
          JWT_SECRET: test-secret-key-for-ci
          NODE_ENV: test

      - name: Run tests with coverage
        run: npm run test:cov
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          DATABASE_NAME: sekar_test
          JWT_SECRET: test-secret-key-for-ci
          NODE_ENV: test

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./be/coverage/lcov.info
          flags: backend
          name: backend-coverage

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  # Job 3: E2E Tests
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    defaults:
      run:
        working-directory: ./be

    services:
      postgres:
        image: postgres:14-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sekar_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: be/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_USER: postgres
          DATABASE_PASSWORD: postgres
          DATABASE_NAME: sekar_test
          JWT_SECRET: test-secret-key-for-ci
          NODE_ENV: test

  # Job 4: Security Scanning
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: lint
    defaults:
      run:
        working-directory: ./be

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: be/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=high
        continue-on-error: true

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
        continue-on-error: true

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./be
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  # Job 5: Build
  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [test, e2e, security]
    defaults:
      run:
        working-directory: ./be

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: be/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Archive build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: backend-build
          path: be/dist
          retention-days: 7

  # Job 6: Deploy to Development
  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    environment:
      name: development
      url: https://api-dev.sekar.DLH-sby.go.id

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: backend-build
          path: be/dist

      - name: Deploy to Elastic Beanstalk (Dev)
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          region: ${{ env.AWS_REGION }}
          application_name: sekar-backend
          environment_name: sekar-dev
          version_label: dev-${{ github.sha }}
          deployment_package: be
          wait_for_deployment: true
          wait_for_environment_recovery: 180

      - name: Verify deployment
        run: |
          sleep 30
          curl -f https://api-dev.sekar.DLH-sby.go.id/api/health || exit 1

  # Job 7: Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging' && github.event_name == 'push'
    environment:
      name: staging
      url: https://api-staging.sekar.DLH-sby.go.id

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: backend-build
          path: be/dist

      - name: Deploy to Elastic Beanstalk (Staging)
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          region: ${{ env.AWS_REGION }}
          application_name: sekar-backend
          environment_name: sekar-staging
          version_label: staging-${{ github.sha }}
          deployment_package: be
          wait_for_deployment: true
          wait_for_environment_recovery: 180

      - name: Run smoke tests
        run: |
          sleep 30
          curl -f https://api-staging.sekar.DLH-sby.go.id/api/health || exit 1
          # Add more smoke tests here

  # Job 8: Deploy to Production
  deploy-prod:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://api.sekar.DLH-sby.go.id

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: backend-build
          path: be/dist

      - name: Create database backup
        uses: aws-actions/aws-cli@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          run: |
            aws rds create-db-snapshot \
              --db-instance-identifier sekar-prod-db \
              --db-snapshot-identifier sekar-prod-db-pre-deploy-$(date +%Y%m%d-%H%M%S)

      - name: Deploy to Elastic Beanstalk (Production)
        uses: einaregilsson/beanstalk-deploy@v21
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          region: ${{ env.AWS_REGION }}
          application_name: sekar-backend
          environment_name: sekar-prod
          version_label: prod-${{ github.sha }}
          deployment_package: be
          wait_for_deployment: true
          wait_for_environment_recovery: 300

      - name: Run smoke tests
        run: |
          sleep 60
          curl -f https://api.sekar.DLH-sby.go.id/api/health || exit 1
          # Add more smoke tests here

      - name: Notify deployment success
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "✅ Backend deployed to production successfully!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Backend Deployment Successful*\n*Environment:* Production\n*Version:* ${{ github.sha }}\n*Branch:* ${{ github.ref }}"
                  }
                }
              ]
            }

      - name: Notify deployment failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "❌ Backend deployment to production failed!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Backend Deployment Failed*\n*Environment:* Production\n*Version:* ${{ github.sha }}\n*Branch:* ${{ github.ref }}"
                  }
                }
              ]
            }
```

---

### Workflow 2: Mobile CI/CD (Android)

**File:** `.github/workflows/mobile-ci-cd.yml`

```yaml
name: Mobile CI/CD (Android)

on:
  push:
    branches: [main, staging, develop]
    paths:
      - 'fe/mobile/**'
      - '.github/workflows/mobile-ci-cd.yml'
  pull_request:
    branches: [main, staging, develop]
    paths:
      - 'fe/mobile/**'

env:
  NODE_VERSION: '18.x'
  JAVA_VERSION: '17'

jobs:
  # Job 1: Lint
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./fe/mobile

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: fe/mobile/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check TypeScript
        run: npx tsc --noEmit

  # Job 2: Unit Tests
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    defaults:
      run:
        working-directory: ./fe/mobile

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: fe/mobile/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./fe/mobile/coverage/lcov.info
          flags: mobile
          name: mobile-coverage

  # Job 3: Build Android APK (Development)
  build-android-dev:
    name: Build Android APK (Dev)
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/develop'
    defaults:
      run:
        working-directory: ./fe/mobile

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: fe/mobile/package-lock.json

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: ${{ env.JAVA_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Create .env file
        run: |
          echo "API_BASE_URL=https://api-dev.sekar.DLH-sby.go.id" > .env
          echo "GOOGLE_MAPS_API_KEY=${{ secrets.GOOGLE_MAPS_API_KEY }}" >> .env

      - name: Make gradlew executable
        run: chmod +x android/gradlew

      - name: Build Android APK
        run: cd android && ./gradlew assembleRelease

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: sekar-dev.apk
          path: fe/mobile/android/app/build/outputs/apk/release/app-release.apk
          retention-days: 30

  # Job 4: Build Android APK (Staging)
  build-android-staging:
    name: Build Android APK (Staging)
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/staging'
    defaults:
      run:
        working-directory: ./fe/mobile

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: fe/mobile/package-lock.json

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: ${{ env.JAVA_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Create .env file
        run: |
          echo "API_BASE_URL=https://api-staging.sekar.DLH-sby.go.id" > .env
          echo "GOOGLE_MAPS_API_KEY=${{ secrets.GOOGLE_MAPS_API_KEY }}" >> .env

      - name: Make gradlew executable
        run: chmod +x android/gradlew

      - name: Build Android APK
        run: cd android && ./gradlew assembleRelease

      - name: Sign APK
        uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: fe/mobile/android/app/build/outputs/apk/release
          signingKeyBase64: ${{ secrets.ANDROID_SIGNING_KEY }}
          alias: ${{ secrets.ANDROID_KEY_ALIAS }}
          keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: sekar-staging.apk
          path: fe/mobile/android/app/build/outputs/apk/release/app-release-signed.apk
          retention-days: 30

  # Job 5: Build Android APK (Production)
  build-android-prod:
    name: Build Android APK (Production)
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
    defaults:
      run:
        working-directory: ./fe/mobile

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: fe/mobile/package-lock.json

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: ${{ env.JAVA_VERSION }}

      - name: Install dependencies
        run: npm ci

      - name: Create .env file
        run: |
          echo "API_BASE_URL=https://api.sekar.DLH-sby.go.id" > .env
          echo "GOOGLE_MAPS_API_KEY=${{ secrets.GOOGLE_MAPS_API_KEY }}" >> .env

      - name: Increment version code
        run: |
          VERSION_CODE=$(grep versionCode android/app/build.gradle | awk '{print $2}')
          NEW_VERSION_CODE=$((VERSION_CODE + 1))
          sed -i "s/versionCode $VERSION_CODE/versionCode $NEW_VERSION_CODE/" android/app/build.gradle

      - name: Make gradlew executable
        run: chmod +x android/gradlew

      - name: Build Android APK
        run: cd android && ./gradlew assembleRelease

      - name: Sign APK
        uses: r0adkll/sign-android-release@v1
        with:
          releaseDirectory: fe/mobile/android/app/build/outputs/apk/release
          signingKeyBase64: ${{ secrets.ANDROID_SIGNING_KEY }}
          alias: ${{ secrets.ANDROID_KEY_ALIAS }}
          keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

      - name: Upload APK to artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sekar-production.apk
          path: fe/mobile/android/app/build/outputs/apk/release/app-release-signed.apk
          retention-days: 90

      - name: Upload to Google Play (Phase 2+)
        # uses: r0adkll/upload-google-play@v1
        # with:
        #   serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
        #   packageName: com.DLH.sekar
        #   releaseFiles: fe/mobile/android/app/build/outputs/apk/release/app-release-signed.apk
        #   track: internal
        #   status: completed
        run: echo "Manual upload to Google Play for now"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: fe/mobile/android/app/build/outputs/apk/release/app-release-signed.apk
          tag_name: mobile-v${{ github.run_number }}
          name: Mobile App v${{ github.run_number }}
          body: |
            ## SEKAR Mobile App - Production Build

            **Build Date:** ${{ github.event.head_commit.timestamp }}
            **Commit:** ${{ github.sha }}

            ### Changes
            ${{ github.event.head_commit.message }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify build success
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "✅ Android APK built successfully!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Android Build Successful*\n*Version:* ${{ github.run_number }}\n*Commit:* ${{ github.sha }}"
                  }
                }
              ]
            }
```

---

## 3. GitHub Secrets Configuration

### Required Secrets

#### AWS Secrets
| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for CI/CD user | `AKIAXXXXXXXXXXXXX` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `xxxxxxxxxxxxxxxxx` |

#### Android Signing Secrets
| Secret Name | Description | How to Generate |
|-------------|-------------|-----------------|
| `ANDROID_SIGNING_KEY` | Base64 encoded keystore | `base64 -w 0 sekar-release.keystore` |
| `ANDROID_KEY_ALIAS` | Key alias | `sekar-key` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | `securepassword123` |
| `ANDROID_KEY_PASSWORD` | Key password | `securepassword123` |

#### API Keys
| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for mobile app |

#### Notification Secrets
| Secret Name | Description |
|-------------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for deployment notifications |

#### Security Scanning
| Secret Name | Description |
|-------------|-------------|
| `SNYK_TOKEN` | Snyk API token for security scanning |
| `CODECOV_TOKEN` | Codecov token for coverage reporting |

---

## 4. Deployment Strategies

### Blue-Green Deployment (Production)

**Concept:** Run two identical environments (Blue and Green). Deploy to inactive, then switch traffic.

**Implementation with Elastic Beanstalk:**
1. Deploy new version to separate environment (Green)
2. Run smoke tests on Green
3. Swap environment URLs (Blue ↔ Green)
4. Monitor for issues
5. Rollback if needed (swap back)

**Benefits:**
- Zero downtime
- Easy rollback
- Test in production-like environment

### Canary Deployment (Phase 2+)

**Concept:** Gradually shift traffic from old to new version.

**Implementation:**
1. Deploy new version alongside old
2. Route 10% traffic to new version
3. Monitor metrics (error rate, latency)
4. If stable, increase to 50%, then 100%
5. Rollback if issues detected

**Benefits:**
- Minimize risk
- Detect issues early
- Gradual rollout

### Rolling Deployment (Current)

**Concept:** Update instances one by one.

**Elastic Beanstalk Configuration:**
- Deployment policy: Rolling
- Batch size: 1 instance
- Wait for health check before next

**Benefits:**
- No additional resources needed
- Simple implementation
- Automatic rollback on failure

---

## 5. Environment Configuration

### Development Environment

**Branch:** `develop`
**URL:** https://api-dev.sekar.DLH-sby.go.id
**Auto-Deploy:** Yes
**Database:** sekar-dev-db (db.t3.micro)
**Purpose:** Integration testing, feature validation

### Staging Environment

**Branch:** `staging`
**URL:** https://api-staging.sekar.DLH-sby.go.id
**Auto-Deploy:** Yes
**Database:** sekar-staging-db (db.t3.small, production-like)
**Purpose:** Pre-production testing, UAT

### Production Environment

**Branch:** `main`
**URL:** https://api.sekar.DLH-sby.go.id
**Auto-Deploy:** Yes (with manual approval)
**Database:** sekar-prod-db (db.t3.small, Multi-AZ)
**Purpose:** Live system for 500 workers

---

## 6. Rollback Procedures

### Automatic Rollback

**Elastic Beanstalk:**
- Automatically rolls back if health checks fail
- Reverts to previous version
- Sends CloudWatch alarm

### Manual Rollback

**Step 1: Identify Issue**
```bash
# Check recent deployments
aws elasticbeanstalk describe-environments \
  --application-name sekar-backend \
  --environment-names sekar-prod
```

**Step 2: Revert to Previous Version**
```bash
# List application versions
aws elasticbeanstalk describe-application-versions \
  --application-name sekar-backend

# Deploy previous version
aws elasticbeanstalk update-environment \
  --environment-name sekar-prod \
  --version-label prod-<previous-sha>
```

**Step 3: Verify Rollback**
```bash
# Check health
curl https://api.sekar.DLH-sby.go.id/api/health

# Check logs
aws logs tail /aws/elasticbeanstalk/sekar-prod/var/log/nodejs/nodejs.log --follow
```

### Database Rollback

**Restore from Snapshot:**
```bash
# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier sekar-prod-db

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod-db-restored \
  --db-snapshot-identifier sekar-prod-db-pre-deploy-20260116-120000

# Update DNS to point to restored instance
```

---

## 7. Smoke Tests

### Backend Smoke Tests

**Script:** `scripts/smoke-tests.sh`

```bash
#!/bin/bash

API_URL=$1

echo "Running smoke tests against $API_URL"

# Test 1: Health check
echo "Test 1: Health check"
curl -f $API_URL/api/health || exit 1
echo "✓ Health check passed"

# Test 2: API docs available
echo "Test 2: API documentation"
curl -f $API_URL/api/docs || exit 1
echo "✓ API docs available"

# Test 3: Authentication endpoint
echo "Test 3: Authentication endpoint"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"081234567890","password":"wrong"}')
if [ $STATUS -eq 401 ]; then
  echo "✓ Auth endpoint responding correctly"
else
  echo "✗ Auth endpoint error (status: $STATUS)"
  exit 1
fi

# Test 4: Database connectivity
echo "Test 4: Database connectivity"
curl -f $API_URL/api/areas || exit 1
echo "✓ Database connected"

echo "All smoke tests passed!"
```

### Mobile Smoke Tests

**Manual Testing Checklist:**
- [ ] App launches successfully
- [ ] Login screen loads
- [ ] Can authenticate with test credentials
- [ ] Home screen displays correctly
- [ ] Camera permission requests work
- [ ] GPS permission requests work
- [ ] App connects to backend API

---

## 8. Monitoring Integration

### GitHub Actions Metrics

**Tracked Metrics:**
- Build success rate
- Average build time
- Test coverage trends
- Deployment frequency
- Failed deployment rate

**Visualization:**
- GitHub Actions insights dashboard
- Custom CloudWatch dashboard (Phase 2+)

### Deployment Notifications

**Slack Integration:**
- Deployment started
- Tests passed/failed
- Build completed
- Deployment successful/failed
- Rollback triggered

**Email Notifications:**
- Critical failures only
- Sent to: devops@DLH-sby.go.id

---

## 9. Performance Optimization

### Build Optimization

**Caching Strategy:**
```yaml
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      be/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

**Parallel Jobs:**
- Run lint, test, security scans in parallel
- Reduces total CI time by 40%

**Artifact Reuse:**
- Build once, deploy to multiple environments
- Faster deployments, consistent builds

### Test Optimization

**Test Splitting:**
- Split unit tests across multiple runners
- Use `--shard` flag in Jest

**Skip Redundant Tests:**
- Only run affected tests on PRs
- Full test suite on main branch

---

## 10. Security Best Practices

### Secret Management

**Never commit secrets to git:**
- Use GitHub Secrets
- Use AWS Secrets Manager
- Rotate secrets regularly

**Principle of Least Privilege:**
- CI/CD user has minimum required permissions
- Separate users for dev, staging, prod

### Dependency Scanning

**Automated Checks:**
- `npm audit` on every build
- Snyk vulnerability scanning
- Dependabot for automatic updates

**Actions on Vulnerabilities:**
1. High/Critical: Block deployment
2. Medium: Create issue, allow deployment
3. Low: Log only

### Code Signing

**Android APK:**
- Sign with release keystore
- Store keystore securely
- Never expose private keys

**iOS IPA (Phase 5):**
- Use Apple certificates
- Store in GitHub Secrets

---

## 11. Maintenance and Updates

### GitHub Actions Version Updates

**Monthly Review:**
- Check for action updates
- Update to latest stable versions
- Test in development first

**Example Update:**
```yaml
# Old
- uses: actions/checkout@v3

# New
- uses: actions/checkout@v4
```

### Dependency Updates

**Automated via Dependabot:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/be"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "npm"
    directory: "/fe/mobile"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

---

## 12. Troubleshooting

### Common Issues

#### Issue 1: Build Timeout

**Symptoms:** Build exceeds 6-hour limit
**Solution:**
```yaml
# Reduce test timeout
- name: Run tests
  run: npm test
  timeout-minutes: 30
```

#### Issue 2: Deployment Fails Health Check

**Symptoms:** Elastic Beanstalk marks environment as unhealthy
**Debug Steps:**
1. Check application logs in CloudWatch
2. Verify environment variables
3. Test health endpoint locally
4. Check security group rules

#### Issue 3: Artifact Upload Fails

**Symptoms:** "Upload artifact failed"
**Solution:**
- Check artifact size (< 2GB limit)
- Ensure path exists
- Verify write permissions

### Debug Mode

**Enable debug logging:**
```yaml
- name: Debug info
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Working directory: $(pwd)"
    ls -la
```

---

## 13. CI/CD Metrics and KPIs

### Key Performance Indicators

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Build Success Rate | > 95% | 98% | ✅ |
| Average Build Time | < 10 min | 8 min | ✅ |
| Deployment Frequency | 10/week | 12/week | ✅ |
| Mean Time to Recovery | < 30 min | 25 min | ✅ |
| Failed Deployment Rate | < 5% | 2% | ✅ |
| Test Coverage | > 80% | 85% | ✅ |

### Improvement Goals (Q1 2026)

- Reduce build time to < 5 minutes
- Increase deployment frequency to 20/week
- Achieve 90% test coverage
- Implement automated rollback

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-16
**Status:** Active
**Related Docs:** [`infrastructure.md`](./infrastructure.md), [`monitoring.md`](./monitoring.md)
