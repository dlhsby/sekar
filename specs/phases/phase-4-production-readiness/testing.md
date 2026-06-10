# Phase 4: Testing Specifications

**Date:** May 22, 2026 (revamp pass — sections below remain from March 12; new flows in §0)
**Status:** ⏳ Not Started
**Depends On:** Sub-Phases 4-0, 4-R, 4-2 through 4-8
**Related ADRs:** [ADR-017](../../architecture/decisions/ADR-017-maestro-mobile-e2e.md), [ADR-040](../../architecture/decisions/ADR-040-design-system-v2.1.md), [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md), [ADR-042](../../architecture/decisions/ADR-042-onboarding-flow.md), [ADR-043](../../architecture/decisions/ADR-043-production-gap-closure.md)

---

## 0. Revamp-driven E2E additions (May 22, 2026)

### Maestro flows (mobile) — new entry-flow coverage

| Flow file | Scenario | Hi-Fi IDs |
|-----------|----------|-----------|
| `01-welcome-carousel.yaml` | First-launch carousel — swipe through 5 slides + "Lewati" + "Masuk" | WL-1 … WL-5 |
| `02-login-success.yaml` | Login with valid credentials → role-aware home (3 variants: satgas/korlap/admin_data) | AS-1 → HOME-1/2/3 |
| `03-login-validation.yaml` | Empty fields + invalid email + bad password — assert per-field error states + auth-fail toast | AS-1 → AS-2 → AS-3 |
| `04-forgot-password.yaml` | Login → tap "Lupa sandi" → AS-4 → tap admin phone → tel:/wa.me intent fires | AS-1 → AS-4 |
| `05-change-password-forced.yaml` | Login as a user with `password_must_change=true` → routed to AS-5 → submit valid new password → success → home | AS-5 |
| `06-onboarding-first-launch.yaml` | First successful login → OB-1 → OB-2 (request all 6 permissions sequentially) → OB-3 → home | OB-1 → OB-2 → OB-3 |
| `07-onboarding-skip-perms.yaml` | OB-2 skip subset (decline notifications, gallery) — verify app still functional but feature-flagged | OB-2 |
| `08-notifications-inbox.yaml` | Trigger FCM (task assigned) → bell badge increments → tap → NotificationsScreen → mark-read → deep-link to TaskDetail | NOTIF-1 |
| Additional flows 09-15 | clock-in/out, activity submit, task complete, overtime request, perantingan submit (kecamatan) | (existing screens) |

Flows live under `fe/mobile/.maestro/flows/`. CI runs on push to `main` + `workflow_dispatch` (not every PR — per existing ADR-017 strategy).

### Playwright (web) — new revamp coverage

| Spec file | Scenario | Hi-Fi IDs |
|-----------|----------|-----------|
| `auth/login-revamp.spec.ts` | LOG-1 layout + per-field errors + auth-fail toast + "Lupa sandi" link → forgot-password page | LOG-1 |
| `auth/forgot-password.spec.ts` | Forgot-password page renders per-rayon admin contacts; mailto/tel/wa.me links present | — |
| `dashboard/notifications.spec.ts` | Bell icon shows badge; popover lists 5 unread; full notifications page paginates; mark-read works | — |
| `dashboard/sidebar-redesign.spec.ts` | Pinwheel mark renders; section dividers present; active item has primary bg + 1.5px shadow | — |

### Visual regression (4-0 acceptance gate)

Add **storybook-driven snapshot test** in `fe/mobile/__tests__/visual/` + `fe/web/e2e/visual/` for the NB primitives (Button / Card / Pill / Toast / Input / KPI tile) — fails if token re-baseline drifts unexpectedly. Run on push to `main`.

### Accessibility automation

- Mobile: `react-native-accessibility-engine` (or Maestro `assertVisible` with role+label patterns) — assert hit-target ≥ 44 × 44 px on every screen.
- Web: Playwright `@axe-core/playwright` — fail on AA violations on every revamped page. ✅ **Shipped Jun 11** as `fe/web/e2e/14-a11y.spec.ts` (15 pages, serious/critical gate, mapbox canvas excluded; runs in `web-e2e.yml`).

---

## 1. Overview (original March-12 testing strategy below)

---

## Overview

Phase 4 introduces comprehensive E2E testing via Maestro (mobile) and expanded Playwright (web). This replaces the original Detox plan from January 2026 based on Maestro's superior stability with React Native 0.83+ and simpler CI integration (see ADR-017).

---

## Testing Strategies for Phase 4 Infrastructure

### FCM (Firebase Cloud Messaging)

- **Unit tests:** mock `FirebaseMessagingService.sendToUser()` via `jest.fn()`; verify that the notification payload shape (title, body, data fields) and recipient targeting (correct user ID) match expectations
- **Integration test with `FCM_ENABLED=false`:** verify that the notification code path is gracefully skipped (no exception thrown, no attempt to call Firebase SDK) when the FCM feature flag is disabled in `.env`

### Sentry

- Set `SENTRY_DSN=''` in the test environment (`.env.test`) so Sentry does not send events during test runs
- Guard `Sentry.init()` with a DSN presence check: `if (Config.SENTRY_DSN) { Sentry.init(...); }`
- Verify error capture in tests: `jest.spyOn(Sentry, 'captureException')` — assert it is called with the expected error instance after a simulated crash

### Redis

- **Unit tests:** use [`ioredis-mock`](https://github.com/stipsan/ioredis-mock) to simulate Redis operations without a real server
- **Integration tests:** spin up a real Redis instance via docker-compose test profile; tests connect to `redis://localhost:6379` (test port)
- **Graceful fallback:** test that when Redis is unavailable, the WebSocket adapter falls back to the in-memory adapter without throwing; assert that the fallback activation log message is emitted

### Cron Jobs

- Use `jest.useFakeTimers()` to advance time and trigger scheduled execution; avoid real-time waits in test suites
- Test **job execution logic** independently of the cron schedule — extract business logic into a separate method and unit-test that method directly
- Verify cron expressions are syntactically valid using `cron-parser` in unit tests: parse the expression and assert no exception is thrown

---

## A. Mobile E2E Testing (Maestro)

### A1. Why Maestro Over Detox

| Criterion | Detox | Maestro |
|-----------|-------|---------|
| RN 0.83 compatibility | Requires patches | Native YAML, version-agnostic |
| CI setup complexity | macOS runner + emulator build | Ubuntu + APK install |
| Test flakiness | Medium (gray-box timing) | Low (declarative waits) |
| Learning curve | High (JS + native hooks) | Low (YAML flows) |
| Cost (CI minutes) | ~15 min/run (macOS) | ~8 min/run (Ubuntu) |

### A2. Maestro Configuration

**Directory:** `fe/mobile/.maestro/`

```
fe/mobile/.maestro/
├── config.yaml
├── flows/
│   ├── 01-login.yaml
│   ├── 02-clock-in.yaml
│   ├── 03-clock-out.yaml
│   ├── 04-activity-submit.yaml
│   ├── 05-task-complete.yaml
│   ├── 06-notification-tap.yaml
│   ├── 07-overtime-start.yaml
│   ├── 08-overtime-end.yaml
│   ├── 09-map-filter.yaml
│   ├── 10-reassignment.yaml
│   ├── 11-profile-update.yaml
│   ├── 12-logout.yaml
│   ├── 13-offline-clock-in.yaml
│   ├── 14-sync-on-reconnect.yaml
│   └── 15-deep-link.yaml
└── helpers/
    └── login.yaml
```

### A3. Maestro Flow Specifications (15 Flows)

| # | Flow | Precondition | Steps | Verification |
|---|------|-------------|-------|-------------|
| 1 | Login | App launched | Enter identifier + password, tap login | HomeScreen visible |
| 2 | Clock-in | Logged in as satgas | Navigate to clock screen, tap clock-in | Success toast, shift timer visible |
| 3 | Clock-out | Clocked in | Tap clock-out, confirm dialog | Success toast, timer stopped |
| 4 | Activity submit | Clocked in | Tap add activity, fill form, submit | Activity in list |
| 5 | Task complete | Task assigned | Navigate to task, tap complete, add notes | Status changed to completed |
| 6 | Notification tap | Notification received | Tap notification in list | Navigate to entity screen |
| 7 | Overtime start | Normal shift ended | Navigate to overtime, tap start | Overtime timer visible |
| 8 | Overtime end | Overtime active | Tap end, fill activity, submit | Overtime completed |
| 9 | Map filter | Logged in as korlap | Open map, apply area filter | Filtered markers shown |
| 10 | Reassignment | Logged in as kepala_rayon | Tap worker, tap reassign, select area | Confirmation shown |
| 11 | Profile update | Logged in | Navigate to profile, edit name | Updated name visible |
| 12 | Logout | Logged in | Navigate to profile, tap logout | LoginScreen visible |
| 13 | Offline clock-in | Airplane mode on | Clock in while offline | Queued banner shown |
| 14 | Sync on reconnect | Items in queue | Turn off airplane mode | Queue flushed, data synced |
| 15 | Deep link | App installed | Open `sekar://tasks/{id}` | TaskDetailScreen visible |

### A4. Example Flow

**File:** `fe/mobile/.maestro/flows/01-login.yaml`

```yaml
appId: com.sekar
---
- clearState
- launchApp
- assertVisible: "Username / No. HP"
- tapOn: "Username / No. HP"
- inputText: "satgas1"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Masuk"
- assertVisible: "Beranda"
```

---

## B. Web E2E Testing (Playwright)

### B1. Existing Specs (8)

| # | File | Scenarios |
|---|------|-----------|
| 1 | `auth.spec.ts` | Login, logout, session |
| 2 | `dashboard.spec.ts` | Overview cards, charts |
| 3 | `users.spec.ts` | CRUD operations |
| 4 | `areas.spec.ts` | Area management |
| 5 | `tasks.spec.ts` | Task assignment |
| 6 | `monitoring.spec.ts` | Map, markers |
| 7 | `activities.spec.ts` | Activity management |
| 8 | `overtime.spec.ts` | Overtime management |

### B2. New Specs to Add (12+)

| # | File | Scenarios | Sub-Phase |
|---|------|-----------|-----------|
| 9 | `import-kmz.spec.ts` | Upload KMZ, preview, confirm import | 4-5 |
| 10 | `import-csv.spec.ts` | Upload CSV, validate, commit | 4-5 |
| 11 | `export.spec.ts` | Select entity, format, download | 4-5 |
| 12 | `notifications.spec.ts` | Bell click, list, mark-read, filter | 4-3 |
| 13 | `reassignment.spec.ts` | Select worker, reassign, verify | 4-4 |
| 14 | `audit-log.spec.ts` | Filter, view details | 4-4 |
| 15 | `pagination.spec.ts` | Page navigation, limit change | 4-6 |
| 16 | `search.spec.ts` | Search users, areas, tasks | 4-8 |
| 17 | `responsive.spec.ts` | Mobile viewport (375px), tablet (768px) | 4-8 |
| 18 | `a11y.spec.ts` | axe-core automated checks on 5 key pages | 4-8 |
| 19 | `error-handling.spec.ts` | 404, 500, network error | 4-8 |
| 20 | `security.spec.ts` | Rate limiting, CORS, JWT expiry | 4-7 |

### B3. Test Data

```typescript
// fe/web/e2e/helpers/test-data.ts
export const TEST_USERS = {
  admin: { identifier: 'admin', password: 'password123' },
  superadmin: { identifier: 'superadmin', password: 'password123' },
  korlap: { identifier: 'korlap1', password: 'password123' },
  satgas: { identifier: 'satgas1', password: 'password123' },
  kepala_rayon: { identifier: 'kepala_rayon1', password: 'password123' },
};
```

### B4. Accessibility Test Example

**File:** `fe/web/e2e/a11y.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES_TO_AUDIT = [
  '/login',
  '/dashboard',
  '/dashboard/users',
  '/dashboard/tasks',
  '/dashboard/monitoring',
];

for (const page of PAGES_TO_AUDIT) {
  test(`a11y audit: ${page}`, async ({ page: p }) => {
    await p.goto(page);
    const results = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

---

## C. Security Tests (Sub-Phase 4-7)

### C1. Rate Limiting Verification

```typescript
test('rate limiting blocks after threshold', async ({ request }) => {
  // Hit login 6 times in rapid succession
  for (let i = 0; i < 6; i++) {
    const res = await request.post('/api/auth/login', {
      data: { identifier: 'test', password: 'wrong' },
    });
    if (i < 5) expect(res.status()).toBe(401);
    else expect(res.status()).toBe(429);
  }
});
```

### C2. JWT Expiry

```typescript
test('expired access token returns 401', async ({ request }) => {
  // Use a token with past expiry
  const res = await request.get('/api/users', {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  expect(res.status()).toBe(401);
});
```

### C3. CORS Rejection

```typescript
test('CORS rejects unauthorized origin', async ({ request }) => {
  const res = await request.get('/api/health', {
    headers: { Origin: 'https://evil.com' },
  });
  expect(res.headers()['access-control-allow-origin']).toBeUndefined();
});
```

---

## D. CI Integration (Sub-Phase 4-9)

### D1. Updated CI Matrix

| Workflow | Trigger | Runner | Services | Duration |
|----------|---------|--------|----------|----------|
| `backend.yml` | Push to main, PRs | ubuntu-latest | postgres | ~3 min |
| `web.yml` | Push to main, PRs | ubuntu-latest | - | ~2 min |
| `web-e2e.yml` | Push to main, PRs (fe/web/) | ubuntu-latest | postgres, redis | ~5 min |
| `mobile-e2e.yml` | Push to main, PRs (fe/mobile/) | ubuntu-latest | postgres, redis | ~8 min |

### D2. Maestro CI Configuration Details

- **CI runner:** Ubuntu (`runs-on: ubuntu-latest`) — not macOS; saves CI cost significantly; requires `/dev/kvm` device access for hardware-accelerated emulation
- **Emulator:** API 34 (Android 14), x86_64 system image, 2 GB RAM, hardware acceleration via KVM (Linux CI runners support KVM natively)
- **APK:** debug build with test signing (`debug.keystore`), built via `./gradlew assembleDebug` — ProGuard disabled in debug variant for faster builds and readable stack traces
- **Retry:** `--retry-count=2` flag passed to `maestro test` for flaky test mitigation (3 attempts total per flow)
- **Artifacts:** screenshot captured on failure via `maestro test --debug-output=./artifacts`; artifacts directory uploaded as GitHub Actions artifact for post-mortem inspection
- **Per-flow timeout:** 15 minutes maximum per individual flow before Maestro marks it failed
- **Total CI job timeout:** 45 minutes (`timeout-minutes: 45` on the job) — covers emulator boot (~3 min), APK install, and all 15 flows
- **Parallelization:** sequential execution initially (simpler setup, avoids emulator contention); future optimization: shard by flow file across multiple emulator instances using a matrix strategy
- **GitHub Actions KVM setup:**

```yaml
- name: Enable KVM group permissions
  run: |
    echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger --name-match=kvm
```

---

## E. Coverage Targets

| Component | Current | Phase 4 Target | Strategy |
|-----------|---------|---------------|----------|
| Backend unit | 94.51% stmts | ≥94.51% stmts | Must not drop below current; new modules >90% |
| Backend branches | 83.49% | ≥83.49% | Must not drop below current; focus on edge cases |
| Mobile unit | 80.31% | ≥80.31% | Must not drop below current; add NotificationsScreen, connectivity |
| Web unit | 96% | ≥90% | Add tests for import/export/notification pages |
| Web E2E | 8 specs | 20+ specs | Add 12+ new scenarios |
| Mobile E2E | 0 flows | 15+ flows | New Maestro infrastructure |
| Security | 0 | 4+ scenarios | Rate limit, JWT, CORS, input validation |

### E1. Coverage Policy

- **New Phase 4 modules:** >90% statement coverage target (strict)
- **Overall project coverage:** must not drop below current baselines (94.51% stmt / 83.49% branch for backend)
- **Individual existing modules:** must not drop below their current coverage level
- **Absolute floor for any module:** 80% statement coverage — no exceptions
- CI pipeline should fail if any of these thresholds are violated

---

## F. Load & Performance Testing

### F1. Tool

**Primary:** [k6](https://k6.io/) (Grafana k6)
**Alternative:** Artillery (if k6 integration proves difficult)

**Script location:** `tests/load/` directory

### F2. Scenarios

| Actor | Count | Actions per Session |
|-------|-------|-------------------|
| Field workers (satgas) | 500 concurrent | Login → clock-in → send location every 5 min → submit 2 activities → clock-out |
| Supervisors (korlap, kepala_rayon) | 50 concurrent | View monitoring dashboard → filter by area → view worker details → repeat |
| Admins (admin_system, superadmin) | 10 concurrent | Export reports → manage users → view audit logs |

### F3. Performance Targets

| Metric | Target |
|--------|--------|
| API response time P95 | < 500ms |
| API response time P99 | < 1000ms |
| WebSocket event delivery (status-changed, etc.) | < 1s |
| Location update ingestion | 100 req/s sustained |
| Export job creation (sync start) | < 2s |
| Export job async completion | < 5s for job to begin processing |
| Monitoring dashboard load (500 workers) | < 3s full render |

### F4. Test Environment

- **Environment:** staging with production-equivalent database
- **Database seeding:** 6 months of simulated data (location_logs, shifts, activities, audit_logs)
- **Expected data volume:**
  - location_logs: ~43M rows (6 months × 240K/day)
  - audit_logs: ~500K rows
  - shifts: ~90K rows
  - activities: ~180K rows

### F5. Schedule

- Run **before each production deployment** (blocking — deployment halts if targets missed)
- Run **weekly on staging** (non-blocking — results tracked for trend analysis)
- Run **after any database migration** that adds indexes or changes schema

### F6. Example k6 Script Structure

```javascript
// tests/load/worker-flow.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    field_workers: {
      executor: 'constant-vus',
      vus: 500,
      duration: '10m',
    },
    supervisors: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

---

**Last Updated:** 2026-03-12
