# Phase 4: Infrastructure Specifications

**Date:** May 22, 2026 (revamp pass — sections below remain from March 12; updated facts in §0)
**Status:** ⏳ Not Started
**Depends On:** Phase 3 complete (Redis 7 + Socket.IO adapter live)
**Related Sub-Phases:** 4-1 (trimmed), 4-3 (BullMQ on Redis), 4-9 (CI/CD)

---

## 0. Reality check — May 22, 2026 (overrides March-12 facts)

| Fact | Updated value |
|------|---------------|
| Docker Compose | PostgreSQL 14, Adminer, LocalStack S3, **Redis 7-alpine** (shipped Phase 3 sub-phase 3-3) |
| Redis | **Installed and live** — drives monitoring Streams + Socket.IO adapter |
| Sentry | Still not configured — 4-1 B3/B4 |
| Monitoring | No APM, no structured logs — 4-1 |
| Production | api.sekar.wahyutrip.com + sekar.wahyutrip.com |

---

## ⊕ Revamp-driven infra changes (May 22, 2026)

### I1. BullMQ on existing Redis (no new infra)

Per [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md), Phase 4 adds BullMQ as a job-queue layer over the existing Redis 7 instance. **No new docker-compose service, no new prod cluster.** Implementation lives in `be/`; see [`backend.md § R2`](./backend.md#r2-bullmq-retry-queue-on-existing-redis-per-adr-043).

**Operational notes:**

- BullMQ uses a separate ioredis connection per queue (BullMQ guidance) — set `connection: { ...redisConfig, maxRetriesPerRequest: null }`.
- Reserve ≥ 64 MB Redis memory headroom for queues (current monitoring Streams uses ≤ 128 MB at full load — total Redis sizing requirement ≈ 256 MB minimum; 512 MB recommended).
- Add Bull Board dashboard at `/admin/queues` (admin-only) for ops visibility; behind JWT + RolesGuard.

### I2. Sentry release tagging with rebrand version

When Sentry ships in 4-1 B3/B4, the release tag should peg to the rebrand cutover for cohort separation:

- Backend release tag: `sekar-be@1.0.0-rebrand`
- Mobile release tag: `sekar-mobile@1.0.0-rebrand+{build}` — Android `versionCode`, iOS `CFBundleVersion`
- Web release tag: `sekar-web@1.0.0-rebrand` (uploaded via `@sentry/nextjs` build step)

### I3. App-store re-submission for rebrand

App icon + splash change → **app-store re-submission required** (not just OTA / bundle update):

- **Google Play:** Upload new APK / AAB with updated icon. Listing graphics + screenshots also need refresh to match v2.1 brand.
- **iOS App Store (Phase 5+):** Same — new icon + screenshots.

Plan **2-week store-review buffer** before launch. Listing assets (feature graphic, screenshots) regenerated from hi-fi screenshots (`design/project/hifi-mobile.html` rendered + masked).

### I4. Web PWA manifest update (in 4-0, deployed via 4-8 F-tasks)

- `theme_color`: `#7FBC8C` (sage primary)
- `background_color`: `#F5F0EB` (warm stone)
- Icons: maskable pinwheel SVG → 192 + 512 PNG derivatives
- Add `share_target` for kecamatan flow (future)

---

## 1. Current Codebase Facts (Verified March 12, 2026 — refreshed May 22 in §0)

---

## Current Codebase Facts (Verified March 12, 2026)

| Fact | Value |
|------|-------|
| Docker Compose | PostgreSQL 14, Adminer, LocalStack S3 |
| CI/CD | 3 GitHub Actions workflows (backend, web, mobile) |
| Redis | Not installed anywhere |
| Sentry | Not configured |
| Monitoring | No APM, no structured logs |
| Production | api.sekar.wahyutrip.com + sekar.wahyutrip.com |
| SSL | Let's Encrypt via deployment platform |

---

## A. Redis Adoption (Sub-Phase 4-1)

### A1. Docker Compose Addition

**File:** `infra/docker-compose.yml`

```yaml
services:
  # ... existing services ...

  redis:
    image: redis:7-alpine
    container_name: sekar-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy volatile-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  # ... existing volumes ...
  redis-data:
```

> **Eviction policy:** Uses `volatile-lru` (not `allkeys-lru`). Rationale: `allkeys-lru` can evict JWT blacklist entries that have no TTL set, creating a security hole. All cache keys already have TTL set, so `volatile-lru` only evicts TTL-bearing keys under memory pressure. Alternative: increase `maxmemory` from 256MB to 512MB if eviction is too aggressive.

### A2. Backend Redis Configuration

**File:** `be/src/config/redis.config.ts`

```typescript
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryDelayMs: 1000,
};
```

### A3. Environment Variables

```env
# Redis (add to .env)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=              # Empty for local dev

# Sentry (add to .env)
SENTRY_DSN=                  # Backend DSN from Sentry dashboard
SENTRY_MOBILE_DSN=           # Mobile DSN from Sentry dashboard
SENTRY_ENVIRONMENT=development

# Health check
HEALTH_CHECK_TIMEOUT_MS=5000
```

### A4. Redis Usage Map

| Use Case | Key Pattern | TTL | Sub-Phase |
|----------|------------|-----|-----------|
| Socket.IO adapter | Internal (managed by adapter) | N/A | 4-1 |
| Monitoring thresholds | `monitoring:thresholds` | 60s | 4-7 |
| Staffing summary | `monitoring:staffing:{areaId}` | 30s | 4-7 |
| User role cache | `auth:role:{userId}` | 30s | 4-7 |
| JWT blacklist | `auth:blacklist:{tokenHash}` | Variable (remaining TTL) | 4-7 |
| Shift reminder dedup | `shift-reminder:{date}:{userId}` | 24h | 4-3 |
| Export job status | `export:job:{jobId}` | 1h | 4-5 |
| Rate limiting | `ratelimit:{userId}:{endpoint}` | 60s | 4-7 |

### A5. Redis Unavailability Behavior

> **IMPORTANT:** `emitToUser()` must be refactored to room-based pattern BEFORE Redis adapter activation. See backend.md section H4 for details.

**At startup (Redis unavailable at boot):**
- Socket.IO falls back to in-memory adapter (single-instance only)
- Cache returns null, forcing DB reads (degraded performance, not broken)
- Rate limiting falls back to in-memory `@nestjs/throttler`
- JWT blacklist skips check (tokens valid until natural expiry)
- Log warning: "Redis unavailable at startup — running in degraded mode"

**Mid-flight Redis failure (Redis goes down while running):**
- "Graceful fallback to in-memory" is NOT possible mid-flight — do not rely on this
- Redis restart causes **complete loss of room subscriptions** on all Socket.IO instances
- Clients MUST implement reconnection logic: on disconnect, re-authenticate and rejoin rooms
- Server-side: on Redis reconnect, log warning but do NOT attempt automatic room rebuild
- Cache reads return errors → catch and fall through to DB (same as startup fallback)
- JWT blacklist checks fail → log error, allow request (fail-open, same as startup)

---

## B. Sentry Integration (Sub-Phase 4-1)

### B1. Backend Sentry

**File:** `be/src/main.ts`

```typescript
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
}
```

**Global exception filter integration:**
- Capture all unhandled exceptions in Sentry
- Attach X-Request-ID as Sentry tag
- Attach user ID and role as Sentry user context
- Do NOT send 4xx errors to Sentry (only 5xx)

### B2. Mobile Sentry

**Dependencies:** `@sentry/react-native`

**File:** `fe/mobile/src/services/crashReporting.ts`

- Initialize before any other code in App.tsx
- Set user context on login, clear on logout
- Breadcrumbs: navigation events, API calls, Redux actions
- Source maps uploaded during release build

### B3. Sentry Project Structure

```
Sentry Organization: sekar
├── sekar-backend     (NestJS errors, transactions)
├── sekar-mobile      (React Native crashes, ANRs)
└── sekar-web         (optional — Next.js client errors)
```

---

## C. CI/CD Updates (Sub-Phase 4-9)

### C1. Mobile E2E Workflow

**File:** `.github/workflows/mobile-e2e.yml`

```yaml
name: Mobile E2E (Maestro)

on:
  push:
    branches: [main]
    paths: ['fe/mobile/**']
  workflow_dispatch:  # Manual trigger for on-demand runs

jobs:
  maestro-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: cd fe/mobile && npm ci

      - name: Build release APK
        run: cd fe/mobile/android && ./gradlew assembleRelease

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: Run Maestro flows
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: |
            adb install fe/mobile/android/app/build/outputs/apk/release/app-release.apk
            ~/.maestro/bin/maestro test fe/mobile/.maestro/flows/ --retry-count=2

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-results
          path: ~/.maestro/tests/
```

> **Trigger rationale:** Maestro E2E with Android emulator takes 8+ minutes, too slow for PR feedback loop. Run on push to `main` only (or manual trigger via `workflow_dispatch`). Keep unit tests on PR, E2E on main merge.

### C2. Web E2E with Redis

**Update:** `.github/workflows/web-e2e.yml`

Add Redis service container for E2E tests that exercise caching:

```yaml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_DB: sekar_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - 5432:5432
  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
```

---

## D. Production Checklist

### D1. Pre-Deployment

| # | Check | Status |
|---|-------|--------|
| 1 | Redis instance provisioned (production) | ⏳ |
| 2 | Sentry projects created (backend + mobile) | ⏳ |
| 3 | CORS origins set to production domains only | ⏳ |
| 4 | JWT_ACCESS_EXPIRATION=15m and JWT_REFRESH_EXPIRATION=7d set (see backend.md G2 migration plan) | ⏳ |
| 5 | REDIS_PASSWORD set to strong value | ⏳ |
| 6 | SENTRY_DSN configured | ⏳ |
| 7 | Helmet.js enabled | ⏳ |
| 8 | Rate limiting configured per endpoint | ⏳ |
| 9 | FCM_ENABLED=true with valid Firebase credentials | ⏳ |
| 10 | Production seeder run with real data | ⏳ |
| 11 | Database migration executed | ⏳ |
| 12 | Index audit migration applied | ⏳ |
| 13 | ProGuard/R8 release APK tested | ⏳ |
| 14 | Deep linking verified (App Links) | ⏳ |
| 15 | PWA manifest and service worker deployed | ⏳ |

### D2. Post-Deployment Verification

| # | Check | How |
|---|-------|-----|
| 1 | Health endpoint responds | `curl https://api.sekar.wahyutrip.com/health` |
| 2 | Redis connected | Check `/health/full` response |
| 3 | Sentry receiving events | Trigger test error, verify in dashboard |
| 4 | FCM notifications working | Assign task, verify push arrives |
| 5 | WebSocket connections stable | Open monitoring dashboard, verify real-time updates |
| 6 | Rate limiting active | Hit login >5 times in 1 min, expect 429 |
| 7 | CORS blocking non-allowed origins | curl with wrong Origin header |
| 8 | Export working | Download CSV from /dashboard/export |
| 9 | Structured logs flowing | Check log aggregator for JSON format |
| 10 | Cron jobs executing | Check shift reminder and retention logs |

---

## E. Infrastructure Diagram (After Phase 4)

```
┌─────────────────────────────────────────────────────┐
│                    Production                        │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐               │
│  │  Mobile App  │   │   Web App    │               │
│  │  (RN 0.83)   │   │  (Next 16)   │               │
│  │  + Sentry    │   │  + PWA SW    │               │
│  │  + FCM       │   │              │               │
│  └──────┬───────┘   └──────┬───────┘               │
│         │                   │                       │
│         └──────┬────────────┘                       │
│                │ HTTPS                              │
│         ┌──────▼───────┐                            │
│         │   NestJS     │                            │
│         │   Backend    │──── Sentry (errors)        │
│         │   + Helmet   │                            │
│         │   + Logger   │                            │
│         └──┬───┬───┬───┘                            │
│            │   │   │                                │
│     ┌──────┘   │   └──────┐                         │
│     │          │          │                         │
│  ┌──▼───┐  ┌──▼───┐  ┌───▼──┐                      │
│  │ PG14 │  │Redis7│  │  S3  │                      │
│  │      │  │      │  │      │                      │
│  └──────┘  └──────┘  └──────┘                      │
│                                                     │
│  Redis roles: Cache, Socket.IO adapter,             │
│  JWT blacklist, rate limiting, notification retry   │
└─────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2026-03-12
