# Environment Variables - All Phases

Comprehensive list of all environment variables used across all deployment phases of the SEKAR system.

**Secrets model:** All deploy files (`.env.staging`, `.env.production`, repo-root `.env.production`) are **committed ENCRYPTED via [dotenvx](https://dotenvx.com)** — secret values are `encrypted:…` ciphertext. The only real secret is the per-file private key in gitignored `.env.keys`; decryption keys are GitHub **Environment** secrets `BE_/WEB_/MOBILE_DOTENV_PRIVATE_KEY` (staging+production), or on AWS boxes via SSM `/sekar/staging/BE_DOTENV_PRIVATE_KEY`. **For procedures:** see `README.md` (from-scratch hub) and `encrypted-secrets.md` (dotenvx workflow). This doc is the **variable catalogue**.

**Infrastructure:** **Dev** = local MinIO + Postgres. **Staging** = AWS (region `ap-southeast-3`, shared RDS `dlhsby` db `sekar_staging`, S3 `sekar-media-staging` via instance role). **Production** = on-prem Docker Compose with MinIO. **Backend production env = repo-root `.env.production`** (drives `docker-compose.prod.yml`), NOT `apps/be/.env.production`. FCM is **ENABLED** in staging+production (encrypted Firebase creds). Per-environment Google Maps keys (dev/staging/production) are encrypted in mobile env files.

## File naming convention (standardised Phase 5)

All three application workspaces use the same scheme:

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.local` | Local development (plaintext) | No — gitignored |
| `.env.staging` | Staging deploy (encrypted via dotenvx) | **Yes** |
| `.env.production` | Production deploy (encrypted via dotenvx) | **Yes** (workspace-specific) |
| `.env.keys` | dotenvx private decryption keys | No — gitignored **CRITICAL** |
| `.env.local.example` / `.env.staging.example` / `.env.production.example` | Templates with safe defaults | **Yes** |

**Special:** Backend production env lives at **repo-root `./.env.production`** (not `apps/be/.env.production`); drives `docker-compose.prod.yml`. All other workspace-specific production envs (`apps/be/.env.production`, `apps/web/.env.production`, `apps/mobile/.env.production`) exist for workspace parity but are baked into container images (backend staging) or built at deploy time (web, mobile).

- **Backend** (`apps/be/`): `apps/be/src/config/load-env.ts` loads `.env.local` (dev) or `.env.<NODE_ENV>` (staging/production/test) and decrypts via dotenvx.
- **Web** (`apps/web/`): `npm run build:staging|production` runs `dotenvx run -f .env.<env> -- next …` (decrypts at build).
- **Mobile** (`apps/mobile/`): `scripts/decrypt-env.js` decrypts to a temp `.env.runtime` at build time; `babel.config.js` points `react-native-dotenv` at it.
- **Infra** (`infra/`): keeps plain `.env` (Docker-Compose convention, plaintext). `scripts/setup.sh` reconciles `apps/be/.env.local`'s `DATABASE_PORT` to `infra/.env`'s `POSTGRES_PORT`.

---

## 1. Backend Environment Variables

### Phase 1: MVP (Core System)

```bash
# Application
NODE_ENV=development|staging|production
PORT=3000
APP_NAME=SEKAR

# Database (PostgreSQL)
DATABASE_HOST=localhost|dlhsby.ap-southeast-3.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=postgres|sekar_admin
DATABASE_PASSWORD=<encrypted-secret>
DATABASE_NAME=sekar_db|sekar_staging  # dev=sekar_db, staging=sekar_staging
DATABASE_SYNCHRONIZE=true  # Development only! Set to false in production
DATABASE_LOGGING=false  # Set to true for debugging
DATABASE_SSL=false  # Development + staging localhost. Set to true for production RDS/on-prem

# JWT Authentication
JWT_SECRET=<encrypted-secret>  # 256-bit random string
JWT_EXPIRATION=15m  # Access token
JWT_REFRESH_SECRET=<encrypted-secret>  # Different 256-bit random string
JWT_REFRESH_EXPIRATION=7d  # Refresh token

# S3 / Media Storage
# Dev: MinIO (localhost:9000). Staging: AWS S3 via instance role (no keys). Production: MinIO (docker-compose.prod.yml)
AWS_REGION=ap-southeast-3  # Staging region
AWS_ACCESS_KEY_ID=<encrypted-secret>  # Only if using explicit keys (e.g., local MinIO); use IAM instance role in staging/production
AWS_SECRET_ACCESS_KEY=<encrypted-secret>
AWS_S3_BUCKET=sekar-media-dev|sekar-media-staging|sekar-media-prod
AWS_ENDPOINT_URL=  # Empty for real AWS S3 (staging); http://localhost:9000 for MinIO (dev/prod)
AWS_S3_FORCE_PATH_STYLE=  # Empty for real AWS S3; true for MinIO

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19006,https://sekar.wahyutrip.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_TTL=60  # seconds
RATE_LIMIT_MAX=100  # requests per TTL
RATE_LIMIT_LOGIN_MAX=5  # login attempts per TTL

# Logging
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|simple

# Health Check
HEALTH_CHECK_ENABLED=true
```

### Phase 2: Enhanced Features (Notifications, Tasks)

```bash
# Firebase Cloud Messaging (FCM)
# Creds are encrypted in .env.staging / .env.production via dotenvx; FCM is ENABLED for staging+production
FCM_ENABLED=false  # Dev only; true for staging+production
FCM_PROJECT_ID=<encrypted-secret>  # Firebase project ID
FCM_PRIVATE_KEY_ID=<encrypted-secret>
FCM_PRIVATE_KEY=<encrypted-secret>  # Multiline (keep as single encrypted value)
FCM_CLIENT_EMAIL=<encrypted-secret>
FCM_CLIENT_ID=<encrypted-secret>
FCM_AUTH_URI=<encrypted-secret>
FCM_TOKEN_URI=<encrypted-secret>
FCM_AUTH_PROVIDER_CERT_URL=<encrypted-secret>
FCM_CLIENT_CERT_URL=<encrypted-secret>
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000  # milliseconds
NOTIFICATION_BATCH_SIZE=100  # max devices per batch

# Task Management
TASK_AUTO_ASSIGN_ENABLED=true
TASK_DEADLINE_WARNING_HOURS=24  # hours before deadline to send reminder

# Redis (Bull Queue for Background Jobs)
REDIS_HOST=localhost|localhost  # Staging + prod also use local/container Redis for now
REDIS_PORT=6379
REDIS_PASSWORD=  # Empty for development and compose, encrypted in .env if needed
REDIS_DB=0
REDIS_TLS=false

# KMZ Import
KMZ_MAX_FILE_SIZE=10485760  # 10 MB in bytes
KMZ_MAX_POLYGONS=100  # max polygons per KMZ file
```

### Phase 3: Analytics & Reporting

```bash
# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3001  # Optional separate port, or use same as API
WEBSOCKET_PATH=/socket.io
WEBSOCKET_PING_TIMEOUT=60000  # milliseconds
WEBSOCKET_PING_INTERVAL=25000  # milliseconds
WEBSOCKET_MAX_CONNECTIONS=1000

# Redis Adapter for WebSocket Scaling
REDIS_ADAPTER_ENABLED=true
REDIS_ADAPTER_HOST=localhost
REDIS_ADAPTER_PORT=6379

# Analytics Configuration
ANALYTICS_CACHE_TTL=3600  # seconds (1 hour)
ANALYTICS_MAX_DATE_RANGE=90  # days
ANALYTICS_AGGREGATION_INTERVAL=hourly  # hourly, daily, weekly

# Report Export Configuration
REPORT_EXPORT_S3_BUCKET=sekar-report-exports
REPORT_EXPORT_FORMATS=csv,xlsx,pdf
REPORT_MAX_FILE_SIZE=52428800  # 50 MB
REPORT_RETENTION_DAYS=90

# Scheduled Jobs (Bull Queue)
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Jakarta
SCHEDULER_DAILY_REPORT_TIME=08:00  # Send daily reports at 8 AM WIB
SCHEDULER_WEEKLY_REPORT_DAY=monday
SCHEDULER_MONTHLY_REPORT_DATE=1

# Data Warehouse (Redshift) - Not currently provisioned; for managed-cloud reference only
REDSHIFT_ENABLED=false
REDSHIFT_HOST=<not-provisioned>
REDSHIFT_PORT=5439
REDSHIFT_DATABASE=sekar_dw
REDSHIFT_USER=sekar_etl
REDSHIFT_PASSWORD=<encrypted-secret>
REDSHIFT_SYNC_INTERVAL=daily

# CloudFront CDN - Not currently provisioned; for managed-cloud reference only
CLOUDFRONT_ENABLED=false
CLOUDFRONT_DISTRIBUTION_DOMAIN=<not-provisioned>
CLOUDFRONT_SIGNED_URLS=false
```

### Phase 4: Asset Management

```bash
# QR Code Generation
QR_CODE_ENABLED=true
QR_CODE_S3_BUCKET=sekar-qr-codes-dev|sekar-qr-codes-prod
QR_CODE_SIZE=300  # pixels (300x300)
QR_CODE_ERROR_CORRECTION=M  # L, M, Q, H
QR_CODE_BASE_URL=https://sekar.wahyutrip.com/asset
QR_CODE_FORMAT=png
QR_CODE_ENCRYPTION_KEY=<encrypted-secret>  # dotenvx encrypted

# Asset Management
ASSET_CODE_PREFIX=ASSET-  # Format: ASSET-001, ASSET-002, etc.
ASSET_AUTO_NUMBER_START=1
ASSET_DEPRECIATION_METHOD=straight_line  # straight_line, declining_balance
ASSET_DEFAULT_USEFUL_LIFE=60  # months (5 years)

# Maintenance Scheduling
MAINTENANCE_REMINDER_ADVANCE_DAYS=7  # Send reminder 7 days before due
MAINTENANCE_AUTO_CREATE_TASKS=true
MAINTENANCE_OVERDUE_ESCALATION_DAYS=3

# Equipment Inventory
EQUIPMENT_LOW_STOCK_THRESHOLD=10  # Alert when stock < 10 units
EQUIPMENT_REORDER_POINT=20  # Suggest reorder when stock < 20 units
```

### Phase 5: iOS & Advanced Features

```bash
# APNs (iOS Push Notifications)
APNS_ENABLED=true
APNS_KEY_ID=<encrypted-secret>  # dotenvx encrypted
APNS_TEAM_ID=<encrypted-secret>
APNS_KEY_FILE=<encrypted-secret>  # Private key content, keep as single encrypted value
APNS_BUNDLE_ID=com.wahyutrip.sekar
APNS_PRODUCTION=true  # Use production APNs server

# Fraud Detection
FRAUD_DETECTION_ENABLED=true
FRAUD_GPS_SPOOFING_THRESHOLD=0.8  # 80% confidence to flag
FRAUD_VELOCITY_CHECK_ENABLED=true
FRAUD_MAX_SPEED_KMH=100  # Flag if speed > 100 km/h
FRAUD_GEOFENCE_STRICT_MODE=false  # Don't block, just log

# Machine Learning Model
ML_MODEL_ENABLED=true
ML_MODEL_S3_BUCKET=sekar-ml-models
ML_MODEL_PATH=fraud-detection/model-v1.pkl
ML_MODEL_INFERENCE_TIMEOUT=5000  # milliseconds

# Biometric Authentication
BIOMETRIC_AUTH_REQUIRED=false  # Optional for now
BIOMETRIC_FALLBACK_TO_PIN=true

# Advanced Security
CERTIFICATE_PINNING_ENABLED=true
CERTIFICATE_PINS=sha256/XXXXXX,sha256/YYYYYY  # SHA-256 hashes of SSL certs
SECURITY_HEADERS_STRICT=true
```

### Phase 6: Web Dashboard

```bash
# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_DETAILED=true  # Log request/response payloads
AUDIT_LOG_RETENTION_DAYS=365

# Bulk Operations
BULK_OPERATION_MAX_ITEMS=100
BULK_OPERATION_TIMEOUT=300000  # 5 minutes

# Export Configuration
EXPORT_MAX_ROWS=10000
EXPORT_TIMEOUT=120000  # 2 minutes
EXPORT_S3_BUCKET=sekar-exports
EXPORT_TEMP_DIR=/tmp/sekar-exports
```

---

## 2. Mobile App Environment Variables

### Phase 1: MVP

```bash
# API Configuration (Host URL + Version)
# The app constructs: {API_BASE_URL}/api/{API_VERSION}
API_BASE_URL=http://10.0.2.2:3000  # Android emulator host
# API_BASE_URL=http://<your-ip>:3000  # Physical device host
# API_BASE_URL=https://api.sekar.wahyutrip.com  # Production host
API_VERSION=v1  # API version

# Google Maps (per-environment, encrypted in dotenvx)
# Shared by THREE consumers off one key per environment: (1) mobile (baked),
# (2) backend `seed:geocode`, (3) web client at runtime via GET /config/maps
# (Rayon/Location coordinate drop-pin picker + display modal). Enable both the
# Geocoding API and the Maps JavaScript API; restrict by HTTP referrer.
GOOGLE_MAPS_API_KEY=<encrypted-secret>  # dev/staging/production keys differ, all encrypted

# Location Tracking
LOCATION_TRACKING_ENABLED=true
LOCATION_INTERVAL=30000  # milliseconds (30 seconds)
LOCATION_DISTANCE_FILTER=10  # meters
LOCATION_ACCURACY_THRESHOLD=100  # meters

# Media Upload
PHOTO_COMPRESSION_QUALITY=0.7  # 0.0 to 1.0
PHOTO_MAX_WIDTH=1920
PHOTO_MAX_HEIGHT=1920
VIDEO_MAX_DURATION=180  # seconds (3 minutes)

# Offline Storage
OFFLINE_STORAGE_ENABLED=true
OFFLINE_MAX_QUEUE_SIZE=100  # max items in offline queue

# App Configuration
APP_NAME=SEKAR
APP_VERSION=1.0.0
APP_BUILD_NUMBER=1
```

### Phase 2: Enhanced Features

```bash
# Firebase Cloud Messaging (from google-services.json)
FCM_SENDER_ID=<your-firebase-project-number>

# Notification Settings
NOTIFICATION_SOUND_ENABLED=true
NOTIFICATION_VIBRATE_ENABLED=true
```

### Phase 3: Analytics & Real-time

```bash
# WebSocket Configuration
WEBSOCKET_URL=https://api.sekar.wahyutrip.com
WEBSOCKET_PATH=/socket.io
WEBSOCKET_RECONNECT_ATTEMPTS=5
WEBSOCKET_RECONNECT_DELAY=3000  # milliseconds

# Location Tracking (Real-time)
LOCATION_WEBSOCKET_INTERVAL=30000  # Send location every 30 seconds
LOCATION_WEBSOCKET_DISTANCE_FILTER=10  # meters
```

### Phase 4: Asset Management

```bash
# QR Code Scanner
QR_SCANNER_ENABLED=true
QR_SCANNER_TORCH_ENABLED=true  # Enable flashlight
QR_SCANNER_BEEP_ENABLED=true
QR_SCANNER_VIBRATE_ENABLED=true

# Asset Management
ASSET_PHOTO_REQUIRED=true  # Require photo when adding asset
ASSET_CONDITION_PHOTOS_MAX=3  # Max 3 photos per condition report

# Barcode Scanner Settings
BARCODE_SCAN_TIMEOUT=30000  # milliseconds
BARCODE_FORMATS=QR_CODE,CODE_128,EAN_13  # Supported formats
```

### Phase 5: iOS & Advanced Features

```bash
# iOS Build Configuration
IOS_BUNDLE_ID=com.wahyutrip.sekar
IOS_TEAM_ID=<your-apple-team-id>
IOS_APP_STORE_ID=<your-app-store-id>

# Biometric Authentication
BIOMETRIC_ENABLED=true
BIOMETRIC_REQUIRED=false  # Optional for now
BIOMETRIC_FALLBACK_ENABLED=true

# Security
CERTIFICATE_PINNING_ENABLED=true
SSL_PINNING_HASHES=sha256/XXXXXX,sha256/YYYYYY
ROOT_DETECTION_ENABLED=true  # Detect jailbreak/root
```

---

## 3. Web Dashboard Environment Variables

### Phase 6: Web Dashboard

```bash
# Next.js Configuration
NODE_ENV=development|staging|production
NEXT_PUBLIC_API_URL=https://api.sekar.wahyutrip.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.sekar.wahyutrip.com
NEXT_PUBLIC_APP_NAME=SEKAR Dashboard
NEXT_PUBLIC_APP_VERSION=1.0.0

# Authentication
NEXT_PUBLIC_AUTH_STORAGE_KEY=sekar_auth_token
# NEXTAUTH_URL — DEPRECATED: web auth is AuthContext (httpOnly JWT cookie), not NextAuth
# NEXTAUTH_SECRET — DEPRECATED (NextAuth removed; see web/authentication.md)
JWT_SECRET=<same-as-backend>

# Google Maps (Interactive Maps)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-key>

# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=<your-token>

# Analytics
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX  # Google Analytics 4
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Feature Flags
NEXT_PUBLIC_ENABLE_BULK_ACTIONS=true
NEXT_PUBLIC_ENABLE_AUDIT_LOGS=true
NEXT_PUBLIC_ENABLE_DATA_EXPORT=true
NEXT_PUBLIC_MAX_EXPORT_ROWS=10000

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=10485760  # 10 MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/jpeg,image/png,application/pdf

# Session
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
SESSION_REFRESH_INTERVAL=300000  # 5 minutes
```

---

## 4. Environment-Specific Configurations

### Development Environment

```bash
# Backend (.env.local, plaintext, gitignored)
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=sekar_db
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true
DATABASE_SSL=false
AWS_ENDPOINT_URL=http://localhost:9000  # MinIO
AWS_S3_FORCE_PATH_STYLE=true
AWS_S3_BUCKET=sekar-media-dev
FCM_ENABLED=false
LOG_LEVEL=debug

# Mobile (.env.local, plaintext, gitignored)
API_BASE_URL=http://10.0.2.2:3000  # Android emulator; http://<IP>:3000 for device
API_VERSION=v1
WEBSOCKET_URL=http://10.0.2.2:3000
GOOGLE_MAPS_API_KEY=<dev-key>

# Web (.env.local, plaintext, gitignored)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3000
```

### Staging Environment

```bash
# Backend (.env.staging, encrypted via dotenvx, committed)
NODE_ENV=staging
DATABASE_HOST=dlhsby.ap-southeast-3.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=sekar_staging
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false
DATABASE_SSL=true  # RDS over SSL
DATABASE_PASSWORD=<encrypted>
AWS_REGION=ap-southeast-3
AWS_S3_BUCKET=sekar-media-staging
AWS_ENDPOINT_URL=  # Empty; uses real AWS S3
AWS_S3_FORCE_PATH_STYLE=false
FCM_ENABLED=true
FCM_PROJECT_ID=<encrypted>
FCM_PRIVATE_KEY=<encrypted>
# ... (other FCM fields encrypted)
LOG_LEVEL=info
JWT_SECRET=<encrypted>

# Mobile (.env.staging, encrypted via dotenvx, committed)
API_BASE_URL=https://api.sekar.wahyutrip.com
API_VERSION=v1
WEBSOCKET_URL=wss://api.sekar.wahyutrip.com
GOOGLE_MAPS_API_KEY=<encrypted-staging-key>

# Web (.env.staging, encrypted via dotenvx, committed)
NEXT_PUBLIC_API_URL=https://api-staging.sekar.wahyutrip.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://api-staging.sekar.wahyutrip.com
# NEXTAUTH_URL — DEPRECATED: web auth is AuthContext (httpOnly JWT cookie), not NextAuth
# NEXTAUTH_SECRET — DEPRECATED (NextAuth removed; see web/authentication.md)
```

### Production Environment

```bash
# Backend (repo-root ./.env.production, encrypted via dotenvx, committed; drives docker-compose.prod.yml)
NODE_ENV=production
DATABASE_HOST=localhost  # On-prem PostgreSQL via compose
DATABASE_PORT=5432
DATABASE_NAME=sekar_db
DATABASE_SYNCHRONIZE=false  # CRITICAL: Never auto-sync
DATABASE_LOGGING=false
DATABASE_SSL=true  # On-prem compose with SSL
DATABASE_PASSWORD=<encrypted>
AWS_ENDPOINT_URL=http://localhost:9000  # MinIO (docker-compose.prod.yml)
AWS_S3_FORCE_PATH_STYLE=true
AWS_S3_BUCKET=sekar-media-prod
FCM_ENABLED=true
FCM_PROJECT_ID=<encrypted>
FCM_PRIVATE_KEY=<encrypted>
# ... (other FCM fields encrypted)
LOG_LEVEL=warn
RATE_LIMIT_STRICT=true
JWT_SECRET=<encrypted>

# Mobile (.env.production, encrypted via dotenvx, committed)
API_BASE_URL=https://api.sekar.wahyutrip.com
API_VERSION=v1
WEBSOCKET_URL=wss://api.sekar.wahyutrip.com
GOOGLE_MAPS_API_KEY=<encrypted-production-key>

# Web (.env.production, encrypted via dotenvx, committed)
NEXT_PUBLIC_API_URL=https://api.sekar.wahyutrip.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.sekar.wahyutrip.com
# NEXTAUTH_URL — DEPRECATED: web auth is AuthContext (httpOnly JWT cookie), not NextAuth
# NEXTAUTH_SECRET — DEPRECATED (NextAuth removed; see web/authentication.md)
```

---

## 5. Encrypted Secrets Model (dotenvx)

**All deploy env files (.env.staging, .env.production) are committed ENCRYPTED.** Sensitive values appear as `encrypted:…` ciphertext; only the decryption private key (`.env.keys`) is gitignored. For full procedures, see `encrypted-secrets.md` (the authoritative dotenvx runbook).

### Key Storage

| Key | Storage | Purpose |
|-----|---------|---------|
| `BE_DOTENV_PRIVATE_KEY` | GitHub **Environment** secrets (`staging`, `production`) | Decrypt backend deploy files |
| `WEB_DOTENV_PRIVATE_KEY` | GitHub **Environment** secrets (`staging`, `production`) | Decrypt web deploy files |
| `MOBILE_DOTENV_PRIVATE_KEY` | GitHub **Environment** secrets (`staging`, `production`) | Decrypt mobile deploy files |
| `.env.keys` (local dev) | Gitignored file in repo root | Local decryption; run `dotenvx keys list` to view |

**Staging AWS box:** Reads `BE_DOTENV_PRIVATE_KEY` from AWS SSM Parameter Store (`/sekar/staging/BE_DOTENV_PRIVATE_KEY`) at boot via instance IAM role.

### Example Encrypted Entry

Before encryption (plaintext in editor):
```bash
JWT_SECRET=your-256-bit-random-string-here
```

After encryption (committed):
```bash
JWT_SECRET=encrypted:BaWw9g1Io6Vm+MzP...
```

At runtime, `load-env.ts` (backend) or `dotenvx run` (web/mobile) decrypts using the private key.

### Secrets Common to Multiple Envs

These appear in multiple `.env.*` files (dev/staging/production) but may differ per environment:

- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `DATABASE_PASSWORD`
- `GOOGLE_MAPS_API_KEY`
- `FCM_*` (Firebase creds)
- `APNS_*` (iOS APNs creds)
- `QR_CODE_ENCRYPTION_KEY`
- (removed) `NEXTAUTH_SECRET` — web no longer uses NextAuth (AuthContext + httpOnly cookie)

**Never commit plaintext keys.** Use `npm run env:encrypt` to encrypt, `npm run env:decrypt` to view decrypted values (requires local `.env.keys`).

---

## 6. Environment Variables Checklist

### Pre-Deployment Verification

**Backend:**
- [ ] All required variables set for target environment
- [ ] Database credentials encrypted (dotenvx) and decryption key in GitHub Environment secrets
- [ ] JWT secrets are strong random strings, encrypted
- [ ] CORS origins include production domains
- [ ] Rate limits appropriate for environment
- [ ] Redis host correct for environment
- [ ] S3 bucket names correct; staging uses instance IAM role (no keys in .env)
- [ ] FCM enabled+encrypted for staging/production; disabled for dev
- [ ] No plaintext secrets in committed files; only `encrypted:…` ciphertext
- [ ] `.env.keys` is in `.gitignore`

**Mobile:**
- [ ] API_BASE_URL is host only (no /api path), points to correct environment
- [ ] API_VERSION set correctly (e.g., v1)
- [ ] GOOGLE_MAPS_API_KEY encrypted for staging/production, plaintext for dev
- [ ] App version and build number incremented
- [ ] Certificate pinning hashes match server certificates
- [ ] Feature flags set correctly

**Web:**
- [ ] NEXT_PUBLIC_API_URL points to correct backend
- [ ] (n/a) NEXTAUTH removed — web uses AuthContext
- [ ] Google Analytics ID configured
- [ ] Sentry DSN configured
- [ ] Feature flags enabled/disabled as needed
- [ ] Session timeout appropriate

---

## 7. Security Best Practices

### Never Commit Plaintext Secrets

`.gitignore` enforces (via pre-commit hook):
```
# Environment files
.env
.env.local
.env.*.local
.env.keys  # Private decryption keys — CRITICAL never commit

# Unencrypted build artifacts
apps/mobile/.env.runtime

# Secrets
*.key
*.pem
*.p12
google-services.json
GoogleService-Info.plist
```

**Committed files** (`.env.staging`, `.env.production`) are **encrypted**; plaintext `.env.local` is gitignored.

### Rotate Secrets Every 90 Days

1. Generate new secret (e.g., new JWT_SECRET).
2. Update in `.env.staging` / `.env.production` via `dotenvx set <KEY> <VALUE>` or edit + re-encrypt.
3. Push GitHub Environment secret update (backend/web/mobile `*_DOTENV_PRIVATE_KEY`).
4. Roll out the new decryption key to staging AWS box (SSM Parameter Store).
5. Redeploy services.

### Validate Environment Variables on Startup

**Backend validation (in `load-env.ts` / `main.ts`):**
```typescript
function validateEnv() {
  const required = [
    'DATABASE_HOST',
    'DATABASE_PASSWORD',
    'JWT_SECRET',
    'AWS_S3_BUCKET',
  ];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be >= 32 chars');
  }
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_SYNCHRONIZE === 'true') {
    throw new Error('DATABASE_SYNCHRONIZE must be false in production');
  }
}
validateEnv();
```

---

## 8. Quick Reference

### Most Critical Variables (Must Be Set)

**Backend:**
- `DATABASE_HOST`, `DATABASE_PASSWORD` (encrypted for staging/production)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (encrypted)
- `AWS_S3_BUCKET`, `AWS_ENDPOINT_URL` (MinIO dev/prod; empty for staging AWS S3)

**Mobile:**
- `API_BASE_URL` (host only, e.g., `http://10.0.2.2:3000` or `https://api.sekar.wahyutrip.com`)
- `API_VERSION` (e.g., `v1`)
- `GOOGLE_MAPS_API_KEY` (encrypted for staging/production)

**Web:**
- `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:3000`, `https://api-staging.sekar.wahyutrip.com`)
- (removed) `NEXTAUTH_SECRET` — NextAuth no longer used

### Environment-Specific Overrides

| Variable | Development | Staging | Production |
|----------|------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `DATABASE_HOST` | localhost | dlhsby.ap-southeast-3.rds.amazonaws.com | localhost (on-prem compose) |
| `DATABASE_SYNCHRONIZE` | true | false | false |
| `DATABASE_LOGGING` | true | false | false |
| `DATABASE_SSL` | false | true (RDS) | true (on-prem) |
| `AWS_ENDPOINT_URL` | http://localhost:9000 (MinIO) | (empty; real AWS) | http://localhost:9000 (MinIO) |
| `AWS_S3_BUCKET` | sekar-media-dev | sekar-media-staging | sekar-media-prod |
| `FCM_ENABLED` | false | true | true |
| `APP_RELEASE_PUBLISH_TOKEN` | unset (publish off) | encrypted (= GitHub staging secret) | encrypted |
| `LOG_LEVEL` | debug | info | warn |
| `RATE_LIMIT_STRICT` | false | true | true |

### Deployment Reference

For complete deployment procedures (from-scratch setup, encryption/decryption, CI/CD, rollback): see **`README.md`**.  
For dotenvx workflow details (encrypt, decrypt, set, verify): see **`encrypted-secrets.md`**.

---

**Document Owner:** DevOps / Platform Engineer
**Last Updated:** 2026-06-19
**Status:** Active - All Phases
**Related Docs:** [`README.md`](./README.md), [`encrypted-secrets.md`](./encrypted-secrets.md), [`local-development.md`](./local-development.md)
