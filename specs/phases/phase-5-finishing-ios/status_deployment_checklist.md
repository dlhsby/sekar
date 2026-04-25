# Phase 5: Deployment Checklist

**Last Updated:** March 13, 2026
**Status:** Not Started

---

## Pre-Deployment (Staging)

### Code Readiness

- [ ] All Phase 5 features merged to main branch
- [ ] All unit tests passing (`npm test` in be/, fe/mobile/, fe/web/)
- [ ] Backend coverage >90% statements
- [ ] Mobile coverage >80% statements
- [ ] Web coverage >90% statements
- [ ] ESLint: 0 errors across all packages
- [ ] TypeScript: 0 strict errors
- [ ] No console.log in production code
- [ ] No hardcoded secrets in codebase

### Database

- [ ] All migrations tested locally
- [ ] Migration rollback tested locally
- [ ] Seed data updated for Phase 5 tables
- [ ] Materialized views created and refreshed

### Infrastructure

- [ ] Staging EC2 instance provisioned (t3.small minimum)
- [ ] Staging PostgreSQL database created (sekar_staging_db)
- [ ] Staging Redis configured (DB 1)
- [ ] Staging S3 bucket created (sekar-media-staging)
- [ ] Staging environment variables configured
- [ ] Staging Sentry project created
- [ ] Staging domain DNS configured (api-staging.sekar.wahyutrip.com)
- [ ] Staging SSL certificate issued
- [ ] Staging Vercel preview deployment configured

### iOS (First Time Only)

- [ ] Apple Developer account active
- [ ] Provisioning profiles created (development + distribution)
- [ ] APNs key generated and uploaded to Firebase
- [ ] App Store Connect listing created
- [ ] Privacy policy page published (sekar.wahyutrip.com/privacy)

---

## Staging Deployment

### Backend

- [ ] Deploy backend to staging server
- [ ] Run migrations: `npm run migration:run`
- [ ] Run seed data: `npm run db:seed`
- [ ] Verify health: `GET /health` returns 200
- [ ] Verify full health: `GET /health/full` returns all green
- [ ] Verify Swagger: `GET /api/docs` loads

### Staging Smoke Tests

- [ ] Login with test credentials
- [ ] Clock-in flow works (GPS + selfie)
- [ ] Clock-out flow works
- [ ] Task create/assign/complete workflow
- [ ] Activity submit/approve workflow
- [ ] Monitoring map shows worker locations
- [ ] Report generation (PDF) completes
- [ ] Report generation (CSV) completes
- [ ] Analytics dashboard loads with data
- [ ] Asset CRUD operations work
- [ ] QR code generates and scans
- [ ] Asset checkout/return flow
- [ ] Push notification received (Android)
- [ ] Push notification received (iOS)
- [ ] WebSocket events delivered
- [ ] Offline sync works (disconnect/reconnect)

### E2E Tests on Staging

- [ ] Maestro flows pass (25+ flows)
- [ ] Playwright specs pass (31+ specs)
- [ ] k6 load tests within thresholds

### Web Staging

- [ ] Vercel preview deployment active
- [ ] All pages load without errors
- [ ] Map dashboard renders correctly
- [ ] Reports and analytics pages functional
- [ ] Asset management pages functional

### Mobile Staging

- [ ] Android APK tested on staging API
- [ ] iOS TestFlight build tested on staging API
- [ ] All screens navigate correctly
- [ ] QR scanner works on device

---

## Pre-Deployment (Production)

### Sign-Off

- [ ] QA sign-off on staging
- [ ] Product owner (DLH) approval
- [ ] Technical lead approval

### Production Preparation

- [ ] Production database backed up
- [ ] Maintenance window communicated (if needed)
- [ ] Rollback plan documented and tested
- [ ] Production environment variables updated for Phase 5
- [ ] S3 production bucket updated (if new paths needed)
- [ ] Chromium/Puppeteer available on production server

---

## Production Deployment

### Backend

- [ ] Deploy to production: `git pull && npm ci && npm run build`
- [ ] Run migrations: `npm run migration:run`
- [ ] Reload application: `pm2 reload sekar-api`
- [ ] Verify health: `GET https://api.sekar.wahyutrip.com/health`
- [ ] Verify full health: `GET https://api.sekar.wahyutrip.com/health/full`

### Web

- [ ] Vercel production deployment triggered (auto on merge to main)
- [ ] Verify: `https://sekar.wahyutrip.com` loads
- [ ] Verify new pages accessible

### Mobile

- [ ] Android: Upload to Google Play (staged rollout 10% → 50% → 100%)
- [ ] iOS: Upload to App Store Connect, submit for review
- [ ] iOS: Release after approval

### Post-Deployment Verification

- [ ] Login works for all 8 roles
- [ ] Clock-in/out works
- [ ] Monitoring map shows live data
- [ ] Reports generate correctly
- [ ] Analytics dashboard loads
- [ ] Asset management functional
- [ ] Push notifications delivered
- [ ] No Sentry errors (monitor 1 hour)

---

## Post-Deployment (24-Hour Watch)

- [ ] Monitor Sentry error rate (<5 events/hour)
- [ ] Monitor API response times (P95 <500ms)
- [ ] Monitor database connections (<80% pool)
- [ ] Monitor Redis memory (<80%)
- [ ] Monitor server CPU (<70%)
- [ ] Monitor server memory (<80%)
- [ ] Verify nightly analytics refresh ran (02:00 WIB)
- [ ] Verify daily report generation ran (06:00 WIB)
- [ ] Verify database backup ran (02:00 WIB)
- [ ] No user-reported issues

---

## Rollback Triggers

Immediately rollback if:

- [ ] Health endpoint returns non-200 for >5 minutes
- [ ] Error rate >50 events/hour sustained
- [ ] P95 response time >5 seconds sustained
- [ ] Data corruption detected
- [ ] Authentication broken for any role
- [ ] Database migration caused data loss

**Rollback command:**
```bash
# 1. Revert code
git revert HEAD --no-edit && git push

# 2. Revert migration (if applicable)
cd be && npm run migration:revert

# 3. Restart
pm2 reload sekar-api

# 4. Restore database (if needed)
gunzip < /var/backups/sekar/sekar_db_latest.sql.gz | psql -U sekar_prod sekar_db
```

---

**Deployment Performed By:** _________________
**Date:** _________________
**Result:** ⬜ Success / ⬜ Rolled Back
