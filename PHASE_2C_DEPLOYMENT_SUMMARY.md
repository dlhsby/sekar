# Phase 2C Production Deployment Summary

**Created:** February 16, 2026
**Status:** Infrastructure Ready | Awaiting Deployment Window
**Estimated Time:** 8 hours over 3 days (mostly automated)
**Breaking Changes:** Yes (see below)

---

## Quick Overview

**Current State:**
- ✅ Backend deployed (Phase 2B, http://16.79.183.240:3000)
- ✅ Infrastructure ready (EC2, RDS, S3, ECR, CI/CD)
- ❌ Web dashboard NOT deployed yet
- ⚠️ Phase 2C code complete, READY for deployment

**Deployment Complexity:** **HIGH** (breaking schema + API changes)

**Estimated Time:** ~8 hours (spread over 3 days)

---

## Critical Infrastructure Gaps

### 1. Web CI/CD Pipeline (MISSING)

**Current:** Only backend has automated deployment
**Need:** Create `.github/workflows/web-ci-cd.yml`

**Action:** See section 4.1 in full deployment plan

### 2. Web ECR Repository (MISSING)

**Current:** No Docker registry for web app
**Need:** Create `sekar-web` ECR repository

```bash
aws ecr create-repository --repository-name sekar-web --region ap-southeast-3
```

### 3. Nginx Configuration (MISSING)

**Current:** Backend has proxy, web does not
**Need:** Create `/etc/nginx/conf.d/sekar-web.conf`

**Action:** See section 4.2 in full deployment plan

### 4. GitHub Secrets (MISSING)

**Current:** Only backend secrets configured
**Need:** Add to `production` environment:
- `NEXT_PUBLIC_API_URL` = `http://api.sekar.wahyutrip.com`
- `MAPBOX_TOKEN` = (from https://account.mapbox.com/)

---

## Recommended Deployment Approach

**Strategy:** Staged Zero-Downtime Deployment with Manual Gates

**Phases:**
1. **Preparation (T-2 days):** Create missing infrastructure, test locally
2. **Backend Deploy (T-Day 22:00):** Push to main, monitor CI/CD, verify migration
3. **Backend Verify (T-Day 22:30):** Run seeds, test endpoints, smoke tests
4. **Web Deploy (T-Day 23:00):** Build image, deploy container, configure Nginx
5. **Web Verify (T-Day 23:20):** Manual testing, health checks
6. **Monitor (T-Day 23:30-01:30):** 2-hour soak test, watch logs
7. **Document (T+1 day):** Update status, notify stakeholders

**Manual Gates:** 6 verification checkpoints with rollback decisions

---

## Key Changes in Phase 2C

### Database Migration

**File:** `be/src/database/migrations/1739390400000-Phase2CSchema.ts`

**Changes:**
- **Roles:** 3 → 8 (satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)
- **Tables Renamed:** worker_schedules → schedules, work_reports → activities
- **Tables Dropped:** worker_assignments, overtime_aktivitas
- **Columns Renamed:** worker_id → user_id (shifts, activities, location_logs)
- **New Columns:** users.area_id, overtimes (flat structure), shifts.clock_in_outside_boundary
- **Enum Updates:** TaskStatus 6 → 4 values (remove accepted/declined)

### API Changes

**Routes Removed:**
- `/api/v1/aktivitas` → `/api/v1/activities`
- `/api/v1/reports` → `/api/v1/activities`
- `/api/v1/worker-schedules` → `/api/v1/schedules`

**New Endpoints:**
- `GET /api/v1/tasks/tagged` - Tasks where user is tagged
- `POST /api/v1/tasks/:id/tag` - Add user tags
- `DELETE /api/v1/tasks/:id/tag/:userId` - Remove tag
- `GET /api/v1/activities/my` - User's own activities
- `GET /api/v1/schedules` - Renamed from worker-schedules
- `POST /api/v1/overtime` - Flat structure (no nested aktivitas)

---

## Rollback Strategy

### Backend Rollback (if deployment fails)

```bash
# Option 1: Revert Docker image
ssh -i ~/.ssh/sekar-key.pem ec2-user@16.79.183.240
cd ~/sekar/backend
docker pull $ECR_REGISTRY/sekar-backend:<PREVIOUS_SHA>
docker tag $ECR_REGISTRY/sekar-backend:<PREVIOUS_SHA> $ECR_REGISTRY/sekar-backend:latest
docker-compose -f docker-compose.prod.yml up -d backend
```

### Database Rollback (if migration fails BEFORE completion)

```bash
# Restore RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier sekar-prod-db-restored \
  --db-snapshot-identifier sekar-prod-db-pre-phase2c-$(date +%Y%m%d)
```

**WARNING:** Database rollback is **partially destructive**:
- Dropped tables (worker_assignments, overtime_aktivitas) cannot be restored
- Users with new-only roles (admin_data, admin_system) will be deleted
- Multi-photo data (activities.photo_urls) will be lost

---

## Pre-Deployment Checklist

### Infrastructure (Complete First)

- [ ] Create `sekar-web` ECR repository
- [ ] Add GitHub Secrets: NEXT_PUBLIC_API_URL, MAPBOX_TOKEN
- [ ] Create `.github/workflows/web-ci-cd.yml`
- [ ] Create Nginx config for web
- [ ] Test Nginx config: `sudo nginx -t`

### Testing

- [ ] Run local migration test (Docker)
- [ ] Run backend tests: `cd be && npm test`
- [ ] Run web tests: `cd fe/web && npm test`
- [ ] Run E2E tests: `cd fe/web && npm run test:e2e`
- [ ] Build web locally: `npm run build`

### Backup

- [ ] Create RDS snapshot: `sekar-prod-db-pre-phase2c-$(date +%Y%m%d)`
- [ ] Verify snapshot created successfully
- [ ] Document snapshot ID

### Communication

- [ ] Notify stakeholders of deployment window
- [ ] Prepare rollback runbook
- [ ] Schedule 2-hour monitoring window

---

## Success Criteria

**Backend:**
- ✅ Health check returns OK
- ✅ Login works with 8 new roles
- ✅ Phase 2C endpoints functional
- ✅ Old routes return 404
- ✅ 18 tables in database
- ✅ 10 test users seeded
- ✅ 0 errors for 2 hours

**Web:**
- ✅ Dashboard loads at http://sekar.wahyutrip.com
- ✅ Login functional
- ✅ All pages accessible
- ✅ Mapbox map works
- ✅ Data displays correctly
- ✅ 0 errors for 2 hours

**Database:**
- ✅ Migration executed successfully
- ✅ Tables renamed (schedules, activities)
- ✅ Users migrated to new roles
- ✅ Activity types updated (20 types)

---

## Files to Create (Before Deployment)

### 1. `.github/workflows/web-ci-cd.yml`

**Purpose:** Automated web deployment pipeline
**Template:** Based on `backend-ci-cd.yml`
**Key Steps:**
- Lint + type check
- Run tests (Jest + Playwright)
- Build Docker image with build args (NEXT_PUBLIC_API_URL, MAPBOX_TOKEN)
- Push to ECR (sekar-web:latest + sekar-web:SHA)
- SSH deploy to EC2 (start container on port 3001)
- Health check

**See:** Full deployment plan, section 4.1

### 2. `/etc/nginx/conf.d/sekar-web.conf` (on EC2)

**Purpose:** Nginx reverse proxy for web dashboard
**Proxies:** sekar.wahyutrip.com → localhost:3001
**Features:**
- Static asset caching (/_next/static)
- Image optimization (/_next/image)
- Health check passthrough
- 10MB upload limit

**See:** Full deployment plan, section 4.2

### 3. `fe/web/Dockerfile` (if missing)

**Purpose:** Multi-stage build for Next.js production
**Build Args:** NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN
**Output:** Optimized production image (~150MB)

**Template:**
```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

FROM node:24-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Timeline

| Phase | Duration | When |
|-------|----------|------|
| Preparation | 4 hours | T-2 days |
| Backend Deploy | 30 min | T-Day 22:00 |
| Backend Verify | 30 min | 22:30 |
| Web Deploy | 20 min | 23:00 |
| Web Verify | 10 min | 23:20 |
| Monitoring | 2 hours | 23:30-01:30 |
| Documentation | 30 min | T+1 day |

**Total:** ~8 hours over 3 days

---

## Risk Level

**Before Mitigation:** HIGH
**After Mitigation:** MEDIUM
**Confidence:** HIGH

**Top Risks:**
1. Database migration fails (partially) → Restore RDS snapshot
2. Backend crashes post-deploy → Rollback Docker image
3. Old mobile apps break → Expected, rebuild mobile with Phase 2C
4. Performance degradation → Monitor metrics, scale RDS if needed

---

## Next Actions

1. **Review full deployment plan** (`.claude/plans/...`)
2. **Create missing infrastructure** (ECR, CI/CD, Nginx)
3. **Test locally** (migration, backend, web)
4. **Schedule deployment window** (low-usage time)
5. **Execute preparation checklist**
6. **Deploy backend** (push to main)
7. **Deploy web** (after backend verified)
8. **Monitor for 2 hours**
9. **Document and communicate**

---

## Resources

- **Full Deployment Plan:** `.claude/plans/swirling-spinning-marble-agent-af4189a.md`
- **Migration Guide:** `be/src/database/migrations/PHASE2C_MIGRATION_GUIDE.md`
- **Deployment Checklist:** `specs/phases/phase-2-c-client-feedback/status_deployment_checklist.md`
- **Current Deployment Status:** `specs/deployment/DEPLOYMENT_STATUS.md`
- **Phase 2 Deployment Guide:** `specs/deployment/phase-2-deployment.md`

---

**Status:** READY FOR REVIEW
**Next Step:** Address infrastructure gaps, then execute deployment

**Created by:** Claude Sonnet 4.5 (DevOps Agent)
**Last Updated:** February 16, 2026
