# Environment Variables - All Phases

Comprehensive list of all environment variables used across all deployment phases of the SEKAR system.

## Overview

This document consolidates all environment variables from Phase 1 (MVP) through Phase 6 (Web Dashboard). Variables are organized by component (Backend, Mobile, Web) and phase.

---

## 1. Backend Environment Variables

### Phase 1: MVP (Core System)

```bash
# Application
NODE_ENV=development|staging|production
PORT=3000
APP_NAME=SEKAR

# Database (PostgreSQL)
DATABASE_HOST=localhost|sekar-prod-db.xxxxx.ap-southeast-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=postgres|sekar_admin
DATABASE_PASSWORD=<secure-password>
DATABASE_NAME=sekar_db
DATABASE_SYNCHRONIZE=true  # Development only! Set to false in production
DATABASE_LOGGING=false  # Set to true for debugging
DATABASE_SSL=false  # Set to true for production RDS

# JWT Authentication
JWT_SECRET=<256-bit-random-string>
JWT_EXPIRATION=15m  # Access token
JWT_REFRESH_SECRET=<different-256-bit-random-string>
JWT_REFRESH_EXPIRATION=7d  # Refresh token

# AWS S3 (Media Storage)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=<from-aws-iam>  # Use IAM role in production
AWS_SECRET_ACCESS_KEY=<from-aws-iam>  # Use IAM role in production
AWS_S3_BUCKET=sekar-prod-media
AWS_ENDPOINT_URL=  # Empty for production AWS, http://localhost:4566 for LocalStack
AWS_S3_FORCE_PATH_STYLE=  # Empty for production, true for LocalStack

# CORS
CORS_ORIGIN=http://localhost:3001,http://localhost:19006,https://sekar.DLH-sby.go.id
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
FCM_SERVER_KEY={{resolve:secretsmanager:sekar/fcm/server-key:SecretString:server_key}}
FCM_ENABLED=true
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000  # milliseconds
NOTIFICATION_BATCH_SIZE=100  # max devices per batch

# Task Management
TASK_AUTO_ASSIGN_ENABLED=true
TASK_DEADLINE_WARNING_HOURS=24  # hours before deadline to send reminder

# Redis (Bull Queue for Background Jobs)
REDIS_HOST=localhost|sekar-redis-prod.xxxxx.ng.0001.apse1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=  # Empty for development, set for production
REDIS_DB=0
REDIS_TLS=false  # Set to true for ElastiCache with TLS

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
REDIS_ADAPTER_HOST=sekar-redis-prod.xxxxx.ng.0001.apse1.cache.amazonaws.com
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

# Data Warehouse (Redshift) - Optional
REDSHIFT_ENABLED=false
REDSHIFT_HOST=sekar-redshift.xxxxx.ap-southeast-1.redshift.amazonaws.com
REDSHIFT_PORT=5439
REDSHIFT_DATABASE=sekar_dw
REDSHIFT_USER=sekar_etl
REDSHIFT_PASSWORD={{resolve:secretsmanager:sekar/redshift/password}}
REDSHIFT_SYNC_INTERVAL=daily  # daily, hourly

# CloudFront CDN
CLOUDFRONT_ENABLED=true
CLOUDFRONT_DISTRIBUTION_DOMAIN=media.sekar.DLH-sby.go.id
CLOUDFRONT_SIGNED_URLS=false  # Set to true for private content
```

### Phase 4: Asset Management

```bash
# QR Code Generation
QR_CODE_ENABLED=true
QR_CODE_S3_BUCKET=sekar-qr-codes-prod
QR_CODE_SIZE=300  # pixels (300x300)
QR_CODE_ERROR_CORRECTION=M  # L, M, Q, H
QR_CODE_BASE_URL=https://sekar.DLH-sby.go.id/asset
QR_CODE_FORMAT=png
QR_CODE_ENCRYPTION_KEY={{resolve:secretsmanager:sekar/qrcode/encryption-key:SecretString:key}}

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
APNS_KEY_ID={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:key_id}}
APNS_TEAM_ID={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:team_id}}
APNS_KEY_FILE={{resolve:secretsmanager:sekar/apns/auth-key:SecretString:key_file}}
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
# API_BASE_URL=https://api.sekar.dlhsurabaya.go.id  # Production host
API_VERSION=v1  # API version

# Google Maps
GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>

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
WEBSOCKET_URL=https://api.sekar.DLH-sby.go.id
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
NEXT_PUBLIC_API_URL=https://api.sekar.DLH-sby.go.id
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.sekar.DLH-sby.go.id
NEXT_PUBLIC_APP_NAME=SEKAR Dashboard
NEXT_PUBLIC_APP_VERSION=1.0.0

# Authentication
NEXT_PUBLIC_AUTH_STORAGE_KEY=sekar_auth_token
NEXTAUTH_URL=https://dashboard.sekar.DLH-sby.go.id
NEXTAUTH_SECRET=<random-32-byte-string>
JWT_SECRET=<same-as-backend>

# Mapbox (Interactive Maps)
NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>

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
# Backend
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true
AWS_ENDPOINT_URL=http://localhost:4566  # LocalStack
AWS_S3_FORCE_PATH_STYLE=true
LOG_LEVEL=debug

# Mobile (Host + Version)
API_BASE_URL=http://10.0.2.2:3000
API_VERSION=v1
WEBSOCKET_URL=http://10.0.2.2:3000

# Web
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Staging Environment

```bash
# Backend
NODE_ENV=staging
DATABASE_HOST=sekar-staging-db.xxxxx.ap-southeast-1.rds.amazonaws.com
DATABASE_SYNCHRONIZE=false
DATABASE_LOGGING=false
AWS_ENDPOINT_URL=  # Empty (use real AWS)
AWS_S3_BUCKET=sekar-staging-media
LOG_LEVEL=info

# Mobile (Host + Version)
API_BASE_URL=https://api-staging.sekar.dlhsurabaya.go.id
API_VERSION=v1
WEBSOCKET_URL=wss://api-staging.sekar.dlhsurabaya.go.id

# Web
NEXT_PUBLIC_API_URL=https://api-staging.sekar.DLH-sby.go.id
NEXTAUTH_URL=https://dashboard-staging.sekar.DLH-sby.go.id
```

### Production Environment

```bash
# Backend
NODE_ENV=production
DATABASE_HOST=sekar-prod-db.xxxxx.ap-southeast-1.rds.amazonaws.com
DATABASE_SYNCHRONIZE=false  # CRITICAL: Never auto-sync in production
DATABASE_LOGGING=false
DATABASE_SSL=true
AWS_ENDPOINT_URL=  # Empty (use real AWS)
AWS_S3_BUCKET=sekar-prod-media
LOG_LEVEL=warn
RATE_LIMIT_STRICT=true

# Mobile (Host + Version)
API_BASE_URL=https://api.sekar.dlhsurabaya.go.id
API_VERSION=v1
WEBSOCKET_URL=wss://api.sekar.dlhsurabaya.go.id

# Web
NEXT_PUBLIC_API_URL=https://api.sekar.DLH-sby.go.id
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.sekar.DLH-sby.go.id
NEXTAUTH_URL=https://dashboard.sekar.DLH-sby.go.id
```

---

## 5. AWS Secrets Manager Configuration

Store sensitive credentials in AWS Secrets Manager:

### Backend Secrets

```bash
# Database password
aws secretsmanager create-secret \
  --name sekar/db/password \
  --secret-string '{"password":"<secure-random-password>"}'

# JWT secrets
aws secretsmanager create-secret \
  --name sekar/jwt/secrets \
  --secret-string '{"access_secret":"<256-bit>","refresh_secret":"<256-bit>"}'

# FCM server key
aws secretsmanager create-secret \
  --name sekar/fcm/server-key \
  --secret-string '{"server_key":"<fcm-key>"}'

# APNs authentication key
aws secretsmanager create-secret \
  --name sekar/apns/auth-key \
  --secret-string '{"key_id":"XXXX","team_id":"YYYY","key_file":"-----BEGIN PRIVATE KEY-----\n..."}'

# QR code encryption key
aws secretsmanager create-secret \
  --name sekar/qrcode/encryption-key \
  --secret-string '{"key":"<256-bit-hex>"}'

# Redshift password (optional)
aws secretsmanager create-secret \
  --name sekar/redshift/password \
  --secret-string '{"password":"<secure-password>"}'
```

### Retrieve Secrets in Code

**Backend (NestJS):**
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function getSecret(secretName: string): Promise<any> {
  const client = new SecretsManagerClient({ region: 'ap-southeast-1' });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  return JSON.parse(response.SecretString);
}

// Usage
const dbSecret = await getSecret('sekar/db/password');
const dbPassword = dbSecret.password;
```

**Elastic Beanstalk (via environment variables):**
```bash
aws elasticbeanstalk update-environment \
  --environment-name sekar-prod \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=DATABASE_PASSWORD,Value={{resolve:secretsmanager:sekar/db/password:SecretString:password}}
```

---

## 6. Environment Variables Checklist

### Pre-Deployment Verification

**Backend:**
- [ ] All required variables set for target environment
- [ ] Database credentials correct and tested
- [ ] AWS credentials configured (IAM role or access keys)
- [ ] JWT secrets are strong random strings
- [ ] CORS origins include production domains
- [ ] Rate limits appropriate for environment
- [ ] Redis host correct for environment
- [ ] S3 bucket names correct
- [ ] Secrets retrieved from Secrets Manager
- [ ] No hardcoded secrets in code

**Mobile:**
- [ ] API_BASE_URL is host only (no /api path), points to correct environment
- [ ] API_VERSION set correctly (e.g., v1)
- [ ] Google Maps API key valid and has correct restrictions
- [ ] FCM configuration matches Firebase project
- [ ] App version and build number incremented
- [ ] Certificate pinning hashes match server certificates
- [ ] Feature flags set correctly

**Web:**
- [ ] NEXT_PUBLIC_API_URL points to correct backend
- [ ] NextAuth secret is unique and secure
- [ ] Google Analytics ID configured
- [ ] Sentry DSN configured
- [ ] Feature flags enabled/disabled as needed
- [ ] Session timeout appropriate

---

## 7. Security Best Practices

### Never Commit to Git

Add to `.gitignore`:
```
# Environment files
.env
.env.local
.env.development
.env.staging
.env.production
.env.*.local

# Secrets
*.key
*.pem
*.p12
google-services.json
GoogleService-Info.plist

# AWS
.aws/
credentials
```

### Use Different Secrets Per Environment

- Never reuse production secrets in dev/staging
- Rotate secrets every 90 days (Phase 2+)
- Use Secrets Manager for all sensitive data in production
- Enable audit logging for secret access

### Validate Environment Variables on Startup

**Backend validation:**
```typescript
// src/main.ts
function validateEnv() {
  const required = [
    'DATABASE_HOST',
    'DATABASE_PASSWORD',
    'JWT_SECRET',
    'AWS_S3_BUCKET',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  // Warn if production uses synchronize
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_SYNCHRONIZE === 'true') {
    throw new Error('DATABASE_SYNCHRONIZE must be false in production');
  }
}

validateEnv();
```

---

## 8. Environment Variables by Phase Summary

| Phase | Backend Vars | Mobile Vars | Web Vars | Total |
|-------|-------------|-------------|----------|-------|
| **Phase 1** | 25 | 11 | - | 36 |
| **Phase 2** | +9 | +2 | - | +11 |
| **Phase 3** | +13 | +3 | - | +16 |
| **Phase 4** | +10 | +5 | - | +15 |
| **Phase 5** | +11 | +6 | - | +17 |
| **Phase 6** | +6 | - | 18 | +24 |
| **Total** | 74 | 27 | 18 | 119 |

---

## 9. Quick Reference

### Most Critical Variables (Must Be Set)

**Backend:**
- `DATABASE_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `AWS_S3_BUCKET`

**Mobile:**
- `API_BASE_URL` (host only, e.g., `http://10.0.2.2:3000`)
- `API_VERSION` (e.g., `v1`)
- `GOOGLE_MAPS_API_KEY`

**Web:**
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_SECRET`

### Environment-Specific Overrides

| Variable | Development | Staging | Production |
|----------|------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `DATABASE_SYNCHRONIZE` | true | false | false |
| `DATABASE_LOGGING` | true | false | false |
| `LOG_LEVEL` | debug | info | warn |
| `RATE_LIMIT_STRICT` | false | true | true |

---

**Document Owner:** DevOps Engineer
**Last Updated:** 2026-01-21
**Status:** Active - All Phases
**Related Docs:** [`infrastructure.md`](./infrastructure.md), All phase deployment guides
