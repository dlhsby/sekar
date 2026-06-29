# Phase 4 - Deployment & Testing Checklist

**Purpose:** Comprehensive deployment procedures, environment setup, manual testing, **rebrand cutover** for Phase 4 verification.
**Last Updated:** May 22, 2026 (extended with §0 rebrand cutover; March-12 base preserved below)
**Deployment Status:** ⏳ NOT STARTED
**Related ADRs:** [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-017](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md), [ADR-018](../../architecture/decisions/ADR-018-export-format-strategy.md), [ADR-019](../../architecture/decisions/ADR-019-offline-connectivity-model.md), **NEW** [ADR-040](../../architecture/decisions/ADR-040-design-system-v2.1.md), [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md), [ADR-042](../../architecture/decisions/ADR-042-onboarding-flow.md), [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md)

---

## 0. Rebrand cutover (Sub-Phase 4-0 + 4-R deployment items)

### A · Code + asset readiness

| Item | Status | Notes |
|------|--------|-------|
| `design/` bundle vendored to repo | [x] | Done May 22 |
| `specs/ui-ux/tokens.json` regenerated from v2.1 | [ ] | 4-0 A2 |
| `npm run tokens:build` produces clean diff (commit) | [ ] | Verify regenerated `tokens.css` + `tokens.ts` reflect sage primary |
| Pinwheel SVG shipped (mobile + web) | [ ] | 4-0 B1 |
| 6 empty-state illustrations | [ ] | 4-0 B4 |
| 3 onboarding scene SVGs | [ ] | 4-0 B5 |
| iOS AppIcon updated | [ ] | 4-0 B2 |
| Android adaptive icon updated | [ ] | 4-0 B2 |
| Mobile splash variants (light/dark/green) | [ ] | 4-0 B3 |
| PWA manifest theme_color = `#7FBC8C`, maskable icon | [ ] | 4-0 B6 |
| Favicon (pinwheel) | [ ] | — |
| `eslint-plugin-sekar-design` clean (no token literals) | [ ] | 4-0 C1 |
| Visual regression snapshots match hi-fi | [ ] | 4-0 A5 |

### B · App-store readiness (mobile)

| Item | Status | Notes |
|------|--------|-------|
| Google Play listing graphics regenerated from hi-fi | [ ] | Feature graphic + screenshots + icon |
| AAB built with new icon + splash | [ ] | Release build via Fastlane |
| Listing description updated for v1.0 rebrand | [ ] | Indonesian copy |
| **2-week store-review buffer scheduled** | [ ] | Block on review approval before launch |
| Version bump `1.0.0-rebrand` | [ ] | `android/app/build.gradle` versionName + versionCode |
| Sentry release tag matches version | [ ] | `sekar-mobile@1.0.0-rebrand+{build}` |

### C · Web rebrand deployment

| Item | Status | Notes |
|------|--------|-------|
| `manifest.webmanifest` deployed | [ ] | Verify `sekar.wahyutrip.com` |
| Favicon visible in browser tab | [ ] | |
| PWA install prompt shows new icon | [ ] | Cold install on Chrome desktop + iOS Safari |
| `<head>` meta theme-color | [ ] | Mobile-web status-bar tint |
| OG image (1200×630) updated | [ ] | Pinwheel + tagline |
| Lighthouse ≥ 90 / 95 / 95 / 90 (Perf/A11y/BP/SEO) | [ ] | Post-deploy audit |
| Sentry release `sekar-web@1.0.0-rebrand` | [ ] | Source maps uploaded |

### D · Backend support for new flows

| Item | Status | Notes |
|------|--------|-------|
| `users.password_must_change` column migrated | [ ] | Migration shipped by 4-R support |
| Admin reset-password sets the flag | [ ] | Verify on staging |
| `/auth/me` response includes the flag | [ ] | Verify on staging |
| FCM staging project mirrors prod | [ ] | Same FCM sender ID config |
| BullMQ queues registered + Bull Board at `/admin/queues` | [ ] | 4-3 R2 |

### E · Onboarding + permissions content review

| Item | Status | Notes |
|------|--------|-------|
| Permission justification copy reviewed by legal | [ ] | OB-2 — 6 permissions |
| App-store privacy nutrition labels updated | [ ] | All 6 permissions disclosed |
| Per-rayon admin contact list current (AS-4) | [ ] | Phone + WhatsApp deep-link tested |

### F · Cutover smoke (post-deploy)

| Item | Status | Notes |
|------|--------|-------|
| Walks A–J from `manual-testing.md § 0` pass on production | [ ] | All ✅ before public announce |
| Sentry no rebrand-tagged error spike (24-h watch) | [ ] | |
| FCM delivery latency p99 < 2 s | [ ] | Sampling during cutover |
| Gap 1–4 audit results captured in `status_reviews.md` | [ ] | 4-V deliverable |

---

## 1. Legend (original March-12)

---

## Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| `[ ]` | Not tested | Test case not yet executed |
| `[x]` | Passed | Test case passed |
| `[!]` | Failed | Test case failed (needs fix) |
| `[-]` | Skipped | Test case skipped (not applicable) |

---

## Pre-Deployment Prerequisites

### 1. Infrastructure Provisioning

| Prerequisite | Status | Notes |
|-------------|--------|-------|
| Redis 7 server provisioned | [ ] | AWS ElastiCache or Railway Redis; 256MB+ RAM, `volatile-lru` eviction |
| Sentry projects created | [ ] | 2 projects: `sekar-backend` (Node.js), `sekar-mobile` (React Native) |
| Sentry DSN keys obtained | [ ] | Backend DSN + Mobile DSN → env vars |
| FCM service account key configured | [ ] | `firebase-service-account.json` in secure storage |
| S3 bucket permissions for exports | [ ] | `sekar-media-{env}` bucket allows `PutObject` for export files |

### 2. Environment Variables (New in Phase 4)

```env
# Redis (Sub-Phase 4-1)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                          # Empty for local dev
REDIS_MAX_MEMORY=256mb
REDIS_EVICTION_POLICY=volatile-lru

# Sentry (Sub-Phase 4-1)
SENTRY_DSN=https://xxx@sentry.io/xxx     # Backend DSN
SENTRY_TRACES_SAMPLE_RATE=0.1            # 10% of transactions
SENTRY_ENVIRONMENT=production

# JWT Refresh (Sub-Phase 4-7)
JWT_ACCESS_EXPIRATION=15m                 # MUST be set — module default is 7d
JWT_REFRESH_EXPIRATION=7d
JWT_REFRESH_SECRET=change-in-production   # Different from JWT_SECRET

# FCM Activation (Sub-Phase 4-3)
FCM_ENABLED=true                          # Was false
FCM_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json

# Rate Limiting (Sub-Phase 4-7)
RATE_LIMIT_GLOBAL=100                     # req/min global
RATE_LIMIT_LOGIN=5                        # req/min login
RATE_LIMIT_EXPORT=5                       # req/min/user export
RATE_LIMIT_FILE_UPLOAD=10                 # req/min file upload

# CORS (Sub-Phase 4-7)
CORS_ORIGINS=https://sekar.wahyutrip.com,https://sekar.dlhsurabaya.go.id
```

### 3. Database Migration Execution

**Migration A: Tables (transactional)**
```bash
cd be && npm run typeorm migration:run
# Creates: notification_preferences, export_jobs, location_daily_summaries
# Adds: CHECK constraints, FK constraints
```

**Migration B: Indexes (non-transactional, CONCURRENTLY)**
```bash
# This migration uses transaction = false for CONCURRENTLY support
# Run AFTER Migration A completes successfully
cd be && npm run typeorm migration:run
# Creates indexes CONCURRENTLY on large tables (location_logs, audit_logs)
# Safe for production — does not lock tables
```

**New Tables:**
| Table | Columns | Purpose |
|-------|---------|---------|
| `notification_preferences` | `id`, `user_id`, `notification_type`, `enabled`, `created_at`, `updated_at` | Per-user notification opt-out |
| `export_jobs` | `id`, `user_id`, `entity_type`, `format`, `status`, `file_url`, `row_count`, `error_message`, `retry_count`, `created_at`, `updated_at` | Async export job tracking |
| `location_daily_summaries` | `id`, `user_id`, `area_id`, `rayon_id`, `date`, `total_pings`, `within_area_pings`, `outside_area_pings`, `total_distance_meters`, `first_ping_at`, `last_ping_at`, `is_backfilled`, `created_at` | Aggregated location data for retention |

**New Indexes (CONCURRENTLY):**
| Index | Table | Columns | Notes |
|-------|-------|---------|-------|
| `idx_location_logs_user_logged` | `location_logs` | `(user_id, logged_at DESC)` | Replaces incorrect `created_at` reference |
| `idx_audit_actor` | `audit_logs` | `(actor_id, created_at DESC)` | DROP existing single-column first |
| `idx_export_jobs_user_status` | `export_jobs` | `(user_id, status)` | Job polling queries |
| `idx_daily_summary_user_date` | `location_daily_summaries` | `(user_id, date DESC)` | Summary queries |
| `idx_daily_summary_area_date` | `location_daily_summaries` | `(area_id, date)` | Area aggregation |

### 4. Docker Compose Update

```bash
# Start all services including Redis
cd infra && docker-compose up -d

# Verify Redis is running
docker-compose exec redis redis-cli ping
# Expected: PONG
```

### 5. Feature Flag Rollout Strategy

| Flag/Config | Sub-Phase | Initial State | Activation Condition |
|-------------|-----------|---------------|---------------------|
| `FCM_ENABLED` | 4-3 | `false` | Set `true` after all 8 triggers wired + preferences table seeded |
| Redis adapter | 4-1 | Disabled | Enable after `emitToUser()` refactored to room-based pattern |
| JWT refresh | 4-7 | Disabled | Enable after mobile/web clients deployed with refresh support |
| PWA service worker | 4-8 | Disabled | Enable after cache scope exclusions tested |
| Per-endpoint rate limits | 4-7 | Global only | Enable after load testing confirms thresholds |

### 6. Build & Deploy

```bash
# Backend
cd be && npm run build
# Deploy container (same as Phase 2D + Redis connection)

# Web
cd fe/web && npm run build
# Deploy container

# Mobile
cd fe/mobile
npm run android:release    # Release APK with ProGuard
# Distribute via internal testing track
```

---

## Test Environment Setup

### Test Credentials

| Role | Username | Password | Scope |
|------|----------|----------|-------|
| superadmin | admin | Password123! | All endpoints |
| admin_system | admin_system1 | Password123! | Config, export, import |
| admin_data | admin_data1 | Password123! | Data management |
| top_management | top_mgmt1 | Password123! | City-wide monitoring |
| kepala_rayon | kepalarayon1 | Password123! | Rayon-scoped |
| korlap | korlap1 | Password123! | Area-scoped |
| satgas | satgas1 | Password123! | Worker (tracked) |
| linmas | linmas1 | Password123! | Worker (tracked) |

### API Testing Tools

- **Swagger UI:** http://localhost:3000/api/docs
- **Postman:** `postman/SEKAR.postman_collection.json`
- **Adminer (DB):** http://localhost:8080
- **WebSocket:** ws://localhost:3000/events (JWT auth required)
- **Redis CLI:** `docker-compose exec redis redis-cli`

### Setup Commands

```bash
# Start infrastructure (PostgreSQL, Adminer, LocalStack, Redis)
./scripts/infra.sh start

# Backend
cd be && npm run start:dev

# Seed all data
cd be && npm run db:seed

# Web dashboard
cd fe/web && npm run dev

# Mobile app
cd fe/mobile && npm run android
```

---

## Automated Test Verification

```bash
# Backend — all tests must pass
cd be && npm test
# Expected: >1,500 passing, 0 failing

# Backend coverage
cd be && npm run test:cov
# Expected: >94% stmt (must not drop below 94.51%), >83% branch

# Mobile — all tests must pass
cd fe/mobile && npm test
# Expected: >4,000 passing

# Web unit tests
cd fe/web && npm test
# Expected: >550 passing

# Web E2E tests (requires running backend + web)
cd fe/web && npm run test:e2e
# Expected: 20+ specs passing

# Mobile E2E tests (requires running backend + emulator)
cd fe/mobile && maestro test .maestro/flows/
# Expected: 15+ flows passing

# Load tests (staging only)
cd tests/load && k6 run scenario-500-workers.js
# Expected: P95 <500ms, 0 errors
```

---

## Manual Testing Checklist

### Section 1: Infrastructure (Sub-Phase 4-1)

#### 1.1 Redis
- [ ] Redis container running: `docker-compose exec redis redis-cli ping` → `PONG`
- [ ] Redis eviction policy: `CONFIG GET maxmemory-policy` → `volatile-lru`
- [ ] Redis maxmemory: `CONFIG GET maxmemory` → `268435456` (256MB)
- [ ] Backend connects to Redis on startup (no connection errors in logs)

#### 1.2 Health Endpoints
- [ ] `GET /health` — returns `{ status: 'ok' }` within <10ms
- [ ] `GET /health/full` — returns DB status, Redis status, uptime
- [ ] `GET /health/full` with Redis down — returns `{ redis: 'down' }` but still 200
- [ ] `GET /health` excluded from rate limiting
- [ ] `GET /health` excluded from request logging

#### 1.3 Structured Logging
- [ ] Logs in JSON format in production mode
- [ ] Each log line has `requestId` (X-Request-ID)
- [ ] No request/response bodies in logs (PII policy)
- [ ] Slow queries (>500ms) logged with query plan
- [ ] `console.log` statements removed (use Logger)

#### 1.4 Sentry
- [ ] Backend: throw test error → appears in Sentry dashboard
- [ ] Mobile: force crash → appears in Sentry dashboard
- [ ] Source maps uploaded for both platforms
- [ ] Breadcrumbs include navigation events

### Section 2: Offline Sync (Sub-Phase 4-2)

- [ ] Toggle airplane mode → yellow banner "Tidak ada koneksi internet" (#F59E0B)
- [ ] Server down (stop backend) → orange banner "Server tidak dapat dihubungi" (#F97316)
- [ ] Reconnect → green banner "Terhubung kembali" (#22C55E) → auto-dismiss 3s
- [ ] Queue count shows "X menunggu" during offline
- [ ] Offline actions queued: clock-in, clock-out, location, activity, overtime-start, overtime-end, task-completion
- [ ] Queue flushes on reconnect (server-wins conflict resolution)
- [ ] All queued timestamps use Asia/Jakarta timezone
- [ ] Health polling: 30s interval when SERVER_UNREACHABLE
- [ ] No polling when NO_INTERNET (conserve battery)

### Section 3: Push Notifications (Sub-Phase 4-3)

#### 3.1 FCM Triggers
- [ ] Task assigned → worker receives push notification
- [ ] Task completed → supervisor receives notification
- [ ] Task revision requested → worker receives notification
- [ ] Activity approved → worker receives notification
- [ ] Activity rejected → worker receives notification
- [ ] Overtime approved → worker receives notification
- [ ] Overtime rejected → worker receives notification
- [ ] Missing worker alert → korlap(s) for area + kepala_rayon receive notification

#### 3.2 Cron Jobs
- [ ] Shift reminder fires 15 minutes before shift start
- [ ] Shift reminder dedup: same user doesn't get duplicate reminders (check Redis key)
- [ ] Stale status cleanup: stale entries SET to 'offline' (not deleted)
- [ ] Stale cleanup: users with active shifts set to 'missing' (not 'offline')

#### 3.3 Notification Preferences
- [ ] `GET /notifications/preferences` — returns user's preference list
- [ ] `PATCH /notifications/preferences/:type` — toggle specific notification type
- [ ] Disabled notification type → FCM NOT sent for that trigger
- [ ] Default: all notifications enabled

#### 3.4 Mobile Notifications
- [ ] NotificationsScreen (22nd screen) loads with notification list
- [ ] Filter tabs work (All, Unread, Tasks, Activities, Overtime)
- [ ] Mark individual notification as read
- [ ] Mark all as read
- [ ] Tap notification → deep link to relevant screen
- [ ] Foreground notification shows toast (not system notification)

#### 3.5 Web Notifications
- [ ] Notification bell in nav header shows unread count badge
- [ ] Click bell → popover with last 5 unread notifications
- [ ] Click "View All" → /dashboard/notifications page
- [ ] Notifications page shows full list with pagination
- [ ] Mark as read functionality works

### Section 4: Worker Reassignment (Sub-Phase 4-4)

- [ ] ReassignWorkerModal opens from UserDetailSheet
- [ ] Confirmation dialog before reassignment executes
- [ ] Reassignment works offline (queued)
- [ ] Reassignment history visible in UserDetailSheet
- [ ] Web: bulk reassignment modal (select multiple workers)
- [ ] Web: area capacity indicator shows current/required staffing
- [ ] Audit trail logs all reassignment actions
- [ ] Multi-area korlap: reassignment respects user_areas

### Section 5: Export & Import (Sub-Phase 4-5)

#### 5.1 Export
- [ ] `POST /export` with `{ entityType: 'users', format: 'csv' }` → 200 with streamed CSV (≤5000 rows)
- [ ] `POST /export` with large dataset → 202 with `{ jobId }` (>5000 rows)
- [ ] `GET /export/jobs/:jobId` → returns job status with presigned URL (15-min TTL)
- [ ] Only job creator can access their jobs (403 for other users)
- [ ] Rate limit: 5 exports/minute/user
- [ ] Date range filter max 366 days
- [ ] 7 entity types: users, areas, rayons, tasks, activities, overtime, schedules
- [ ] CSV format: comma-separated, UTF-8 BOM
- [ ] Excel format: formatted headers, auto-width columns, date formatting
- [ ] KMZ format: area boundaries as KMZ (areas only)
- [ ] Export job stuck >10min retried by cron (max 3 retries)

#### 5.2 Import
- [ ] `POST /import/users/csv` — upload CSV, get validation results
- [ ] `POST /import/confirm/:sessionId` — execute validated import
- [ ] Import session expires after 1 hour
- [ ] Only session creator can confirm (403 for other users)
- [ ] Web KMZ import page (/dashboard/import) works
- [ ] Web export page (/dashboard/export) shows entity picker + format selector
- [ ] Web CSV import page shows upload + validation + confirm flow
- [ ] Export poll: 3s interval, 5-minute timeout with error message

### Section 6: Data Management (Sub-Phase 4-6)

- [ ] Production seeder creates 7 real rayons with area boundaries
- [ ] Production seeder includes `monitoring_configs` defaults
- [ ] Location log retention cron: records >90 days purged
- [ ] Location daily summaries created by daily cron
- [ ] Location daily summaries retained for 2 years
- [ ] Notifications retention: read >90 days deleted, unread >180 days deleted
- [ ] Soft-deleted users >180 days: permanent delete only if NO audit_logs as actor
- [ ] Pagination standardized: default 20, max 100 (500 for monitoring)

### Section 7: Security & Refactoring (Sub-Phase 4-7)

#### 7.1 JWT Refresh
- [ ] `POST /auth/login` returns `{ accessToken, refreshToken }`
- [ ] `POST /auth/refresh` with `{ refreshToken }` → new token pair
- [ ] Refresh token single-use: using same refresh token twice → 401
- [ ] `POST /auth/logout` with `{ refreshToken }` in body → both tokens blacklisted
- [ ] Access token expires in 15m (verify: JWT decode exp claim)
- [ ] Refresh token expires in 7d
- [ ] Redis blacklist entries have correct TTL (remaining token validity)

#### 7.2 Rate Limiting
- [ ] Global: 100 req/min
- [ ] Login: 5 req/min → 429 on 6th attempt
- [ ] Export: 5 req/min per user
- [ ] File upload: 10 req/min
- [ ] Health endpoint excluded from rate limiting

#### 7.3 Security Headers
- [ ] Helmet.js active (check response headers: X-Content-Type-Options, X-Frame-Options, etc.)
- [ ] Swagger UI (`/api/docs`) still works with Helmet.js (CSP excluded)
- [ ] CORS only allows configured origins

#### 7.4 Service Extractions
- [ ] BoundaryCheckService extracted (from shifts.service.ts + status-calculator.service.ts)
- [ ] UserValidationService extracted (from users.service.ts)
- [ ] RoomJoinService extracted (from events.gateway.ts → EventsModule)
- [ ] All existing tests still pass after extractions

#### 7.5 Redis Caching
- [ ] Monitoring thresholds cached (TTL 60s)
- [ ] Staffing summaries cached (TTL 30s)
- [ ] Role cache invalidated on user role/is_active change
- [ ] Redis down → graceful fallback to direct DB query (no crash)

### Section 8: UI/UX Polish (Sub-Phase 4-8)

- [ ] Neo Brutalism audit complete — all screens follow NB 2.0 design system
- [ ] Empty states on all list pages (9 web variants)
- [ ] Skeleton loaders on all data-fetching pages
- [ ] Error boundaries per screen (mobile) and route segment (web)
- [ ] Button press animation (scale 0.97)
- [ ] Screen transitions smooth (no janky navigation)
- [ ] Accessibility: all interactive elements have aria-labels
- [ ] Accessibility: focus traps on modals
- [ ] ProGuard enabled for release APK (app still works correctly)
- [ ] Deep linking: `sekar://tasks/:id` opens correct screen
- [ ] Splash screen loads in <2s
- [ ] PWA: service worker caches static assets (not auth/API)
- [ ] SEO: meta tags on public pages
- [ ] Web bundle size: no unexpected large imports

### Section 9: E2E Testing (Sub-Phase 4-9)

- [ ] Maestro CLI installed and configured
- [ ] 15+ Maestro flows passing locally
- [ ] CI: Maestro runs on push-to-main (GitHub Actions with KVM)
- [ ] 20+ Playwright specs passing
- [ ] CI: Playwright runs on every PR
- [ ] Security E2E: rate limiting, JWT expiry, CORS verified

### Section 10: Documentation (Sub-Phase 4-10)

- [ ] `COMPLETION_STATUS.md` updated with Phase 4 metrics
- [ ] `system-overview.md` reflects Phase 4 additions (Redis, Sentry, export, health)
- [ ] `contracts.md` includes all new endpoints
- [ ] `schema.md` includes 3 new tables
- [ ] ADR index updated (ADR-012 through ADR-019)
- [ ] All specs consistent — no conflicting information
- [ ] Role names correct throughout all spec files

---

## Post-Deployment Verification (15 items)

After deploying to production:

1. [ ] `GET /health` returns 200 with `{ status: 'ok' }`
2. [ ] `GET /health/full` shows Redis connected, DB connected
3. [ ] Redis `INFO server` shows Redis 7.x
4. [ ] Clock in as satgas → tracking status created, FCM notification NOT sent (no assignment trigger)
5. [ ] Upload location batch → real-time marker update on web + mobile
6. [ ] Assign task to worker → FCM push notification received
7. [ ] `POST /export` with `{ entityType: 'users', format: 'xlsx' }` → file downloads correctly
8. [ ] Toggle airplane mode on mobile → yellow connectivity banner appears
9. [ ] JWT access token expires in 15m (not 7d) — decode token to verify
10. [ ] `POST /auth/refresh` rotates tokens correctly
11. [ ] Rate limit: 6th login attempt in 1 minute → 429
12. [ ] Sentry: trigger test error → appears in dashboard within 30s
13. [ ] Maestro CI workflow: check last run passed on main branch
14. [ ] Playwright CI workflow: check last run passed
15. [ ] All spec cross-references in `specs/` resolve correctly

---

## Rollback Procedures

### Per Sub-Phase Rollback

| Sub-Phase | Rollback Strategy | Risk Level |
|-----------|-------------------|------------|
| 4-1 (Infrastructure) | Remove Redis config, revert to in-memory; disable Sentry DSN | Low |
| 4-2 (Offline Sync) | Revert to binary online/offline; remove new queue types | Low |
| 4-3 (Push Notifications) | Set `FCM_ENABLED=false`; drop notification_preferences table | Low |
| 4-4 (Reassignment) | Disable reassignment UI; audit logs remain | Low |
| 4-5 (Export/Import) | Disable export endpoints; drop export_jobs table | Low |
| 4-6 (Data Management) | Stop cron jobs; keep existing data | Low |
| 4-7 (Refactor/Security) | **HIGH RISK** — JWT change is breaking; keep 7d expiry if rollback needed | High |
| 4-8 (UI/UX) | Cosmetic only; no data risk | Low |
| 4-9 (E2E Testing) | No production impact — CI only | None |
| 4-10 (Documentation) | No production impact | None |

### Full Phase 4 Rollback

```bash
# Revert to Phase 2E
git revert <merge-commit-hash>
git push origin main

# Database: Drop new tables (safe — no Phase 2E dependencies)
DROP TABLE IF EXISTS location_daily_summaries;
DROP TABLE IF EXISTS export_jobs;
DROP TABLE IF EXISTS notification_preferences;

# Environment: Remove Phase 4 env vars
# Revert FCM_ENABLED to false
# Remove Redis config
# Remove Sentry DSN
# Remove JWT_REFRESH_* vars

# Redis: Stop container (optional — no data dependency)
docker-compose stop redis
```

---

## Production Seeder Execution

```bash
# After migration, seed production data
cd be && npm run seed:production

# Verify seeded data
# 7 rayons with real Surabaya park data
# Area boundaries (GeoJSON polygons)
# Shift definitions (Pagi 06:00-14:00, Siang 14:00-22:00, Malam 22:00-06:00)
# Monitoring configs (5 default entries)
# Notification preferences (defaults: all enabled)
```

---

## Monitoring Dashboard Checks

After deployment, verify these dashboards:

| Dashboard | URL | Check |
|-----------|-----|-------|
| Sentry (Backend) | sentry.io/sekar-backend | No new errors in 1 hour |
| Sentry (Mobile) | sentry.io/sekar-mobile | No new crashes in 1 hour |
| Redis | `redis-cli INFO stats` | Connected clients, memory usage stable |
| PostgreSQL | Adminer / RDS console | No slow queries >1s, connection pool <80% |
| Application logs | CloudWatch / container logs | No ERROR level logs; structured JSON format |

---

*Phase 4 Production Readiness: Deployment & Testing Checklist*
*Last Updated: March 12, 2026*
