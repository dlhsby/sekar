# Phase 4: Infrastructure & Deployment Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 3 Infrastructure (Complete — Redis, Sentry, structured logging)
**Related Sub-Phase:** 4-5
**Related ADRs:** [ADR-028](../../architecture/decisions/ADR-028-staging-environment.md)

---

## Current Codebase Facts (Post-Phase 3 Expected Values)

| Fact | Value |
|------|-------|
| Production | api.sekar.wahyutrip.com + sekar.wahyutrip.com |
| Staging | Not configured |
| CI/CD | 3 pipelines (backend, mobile, web) — GitHub Actions |
| Docker | PostgreSQL 14, Redis 7, LocalStack S3 (dev) |
| Monitoring | Sentry (backend + mobile), structured logging |
| SSL | Let's Encrypt via Caddy/Nginx |
| Hosting | AWS EC2 (backend), Vercel (web) |

---

## A. Staging Environment (ADR-028)

### A1. Infrastructure Overview

```
┌─────────────────────────────────────────────────┐
│  Staging Environment (staging.sekar.wahyutrip.com)
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ EC2 (t3.small) ──────────────────────────┐ │
│  │  NestJS Backend (port 3000)                │ │
│  │  PostgreSQL 14 (sekar_staging_db)          │ │
│  │  Redis 7 (shared instance, DB 1)           │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌─ Vercel (Preview) ────────────────────────┐  │
│  │  Next.js Web (staging.sekar.wahyutrip.com) │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ S3 ──────────────────────────────────────┐  │
│  │  sekar-media-staging (separate bucket)     │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### A2. Environment Variables (Staging)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=sekar_staging
DATABASE_PASSWORD=${STAGING_DB_PASSWORD}
DATABASE_NAME=sekar_staging_db

# Redis (shared instance, different DB)
REDIS_URL=redis://localhost:6379/1

# Auth
JWT_SECRET=${STAGING_JWT_SECRET}
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# S3
AWS_S3_BUCKET=sekar-media-staging
AWS_REGION=ap-southeast-1

# Sentry
SENTRY_DSN=${STAGING_SENTRY_DSN}
SENTRY_ENVIRONMENT=staging

# FCM
FCM_ENABLED=true

# Puppeteer (for PDF generation)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### A3. Staging vs Production Parity

| Aspect | Staging | Production |
|--------|---------|------------|
| Database | sekar_staging_db (same server or RDS) | sekar_db |
| Redis | DB 1 on same instance | DB 0 |
| S3 bucket | sekar-media-staging | sekar-media-prod |
| Sentry | Separate project | Separate project |
| Domain | staging.sekar.wahyutrip.com | sekar.wahyutrip.com |
| API domain | api-staging.sekar.wahyutrip.com | api.sekar.wahyutrip.com |
| Data | Subset of production (anonymized) | Real data |
| Scaling | Single instance | Auto-scaling |
| Chromium | Installed for Puppeteer | Installed for Puppeteer |

---

## B. CI/CD Pipeline Updates

### B1. Backend Pipeline

**File:** `.github/workflows/backend.yml`

```yaml
# Add staging deployment job
deploy-staging:
  needs: [test]
  if: github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to staging
      run: |
        ssh $STAGING_HOST "cd /app/sekar && git pull && npm ci && npm run migration:run && pm2 restart sekar-api"

deploy-production:
  needs: [deploy-staging]
  if: github.ref == 'refs/heads/main'
  environment: production  # Requires manual approval
  runs-on: ubuntu-latest
  steps:
    - name: Deploy to production
      run: |
        ssh $PROD_HOST "cd /app/sekar && git pull && npm ci && npm run migration:run && pm2 restart sekar-api"
```

### B2. Web Pipeline

**File:** `.github/workflows/web.yml`

```yaml
# Vercel automatically deploys:
# - Preview: on PR (maps to staging.sekar.wahyutrip.com)
# - Production: on merge to main (maps to sekar.wahyutrip.com)
```

### B3. iOS Pipeline

See [ios.md](./ios.md) section G3 for iOS CI/CD.

---

## C. Deployment Procedures

### C1. Backend Deployment Checklist

1. **Pre-deployment:**
   - [ ] All tests passing on CI
   - [ ] Migration tested on staging
   - [ ] Environment variables updated
   - [ ] Puppeteer/Chromium available on server
   - [ ] S3 buckets configured for new features

2. **Deployment:**
   - [ ] Deploy to staging first
   - [ ] Run migrations: `npm run migration:run`
   - [ ] Verify health endpoint: `GET /health`
   - [ ] Smoke test critical endpoints
   - [ ] Deploy to production (manual approval)
   - [ ] Verify production health
   - [ ] Monitor Sentry for errors (30 min)

3. **Post-deployment:**
   - [ ] Verify scheduled reports generating
   - [ ] Verify analytics views refreshed
   - [ ] Verify asset QR generation working
   - [ ] Check Sentry error rate

### C2. Database Migration Procedure

```bash
# 1. Backup production database
pg_dump -h $DB_HOST -U postgres sekar_db > backup_$(date +%Y%m%d).sql

# 2. Test migration on staging
cd be && npm run migration:run

# 3. Verify staging data integrity
npm run test:e2e  # Run E2E against staging

# 4. Apply to production (during maintenance window)
cd be && npm run migration:run

# 5. Verify production data integrity
curl https://api.sekar.wahyutrip.com/health/full
```

### C3. Rollback Procedure

```bash
# 1. Revert last migration
cd be && npm run migration:revert

# 2. Restore from backup if needed
psql -h $DB_HOST -U postgres sekar_db < backup_YYYYMMDD.sql

# 3. Deploy previous version
git revert HEAD && git push
```

---

## D. Monitoring & Alerting

### D1. Health Checks

| Check | Endpoint | Frequency | Alert Threshold |
|-------|----------|-----------|-----------------|
| API Health | `GET /health` | 1 min | 3 consecutive failures |
| Full Health | `GET /health/full` | 5 min | DB or Redis down |
| Web App | `GET /` | 1 min | Response >5s or 5xx |
| SSL Certificate | N/A | Daily | Expiry <14 days |

### D2. Sentry Alert Rules

| Rule | Condition | Notify |
|------|-----------|--------|
| High error rate | >50 events/hour | Slack + Email |
| New error type | First occurrence | Slack |
| Performance degradation | P95 >2s | Email |
| Unhandled exception | Any | Slack |

### D3. Infrastructure Monitoring

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU usage | >70% for 5 min | >90% for 2 min |
| Memory usage | >80% | >95% |
| Disk usage | >80% | >90% |
| DB connections | >80% pool | >95% pool |
| Redis memory | >80% maxmemory | >95% |

---

## E. Backup & Recovery

### E1. Automated Backups

| Component | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| PostgreSQL | Daily 02:00 WIB | 30 days | S3 (sekar-backups) |
| Redis | Daily 03:00 WIB (RDB) | 7 days | S3 |
| S3 media | Cross-region replication | Continuous | ap-southeast-2 |
| Configuration | Git repository | Indefinite | GitHub |

### E2. Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Application crash | 5 min (PM2 auto-restart) | 0 (no data loss) |
| Database corruption | 1 hour (restore from backup) | 24 hours (last backup) |
| Full server failure | 2 hours (new instance + restore) | 24 hours |
| Region outage | 4 hours (failover to backup region) | 24 hours |

---

**Last Updated:** 2026-03-13
