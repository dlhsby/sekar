# Phase 5: Testing Specifications

**Date:** March 13, 2026
**Status:** Not Started
**Depends On:** Phase 4 E2E Testing (Complete — 15+ Maestro flows, 20+ Playwright specs)
**Related Sub-Phase:** 5-8

---

## Current Codebase Facts (Post-Phase 4 Expected Values)

| Fact | Value |
|------|-------|
| Backend tests | >1,500 (>90% stmts) |
| Mobile tests | >4,000 (>80% coverage) |
| Web unit tests | 505+ (96%+ stmts) |
| Playwright E2E | 20+ specs |
| Maestro flows | 15+ flows |
| CI/CD | Maestro on push to main, Playwright on PR + main |

---

## A. E2E Testing Extension — Maestro (Mobile)

### A1. New Flows for Reporting (Sub-Phase 5-1)

| # | Flow | Description | Roles |
|---|------|-------------|-------|
| 1 | `report-generate.yaml` | Generate a daily operations report as PDF | korlap |
| 2 | `report-view.yaml` | View generated report list, download one | korlap |
| 3 | `report-filter.yaml` | Filter reports by type and date range | kepala_rayon |

### A2. New Flows for Analytics (Sub-Phase 5-2)

| # | Flow | Description | Roles |
|---|------|-------------|-------|
| 4 | `analytics-worker.yaml` | View own performance analytics as satgas | satgas |
| 5 | `analytics-team.yaml` | View team analytics as korlap | korlap |
| 6 | `analytics-dashboard.yaml` | View analytics dashboard KPI cards | kepala_rayon |

### A3. New Flows for Assets (Sub-Phase 5-3)

| # | Flow | Description | Roles |
|---|------|-------------|-------|
| 7 | `asset-browse.yaml` | Browse assets list, filter by category | satgas |
| 8 | `asset-checkout.yaml` | Scan QR code, checkout asset | satgas |
| 9 | `asset-return.yaml` | Return checked-out asset with condition | satgas |
| 10 | `asset-maintenance.yaml` | Create maintenance record for asset | korlap |
| 11 | `asset-qr-manual.yaml` | Enter asset code manually (QR fallback) | satgas |

### A4. iOS-Specific Flows (Sub-Phase 5-4)

| # | Flow | Description | Device |
|---|------|-------------|--------|
| 12 | `ios-apple-signin.yaml` | Apple Sign-In flow | iPhone (simulator) |
| 13 | `ios-biometric.yaml` | Biometric unlock after background | iPhone (simulator) |

> **Note:** iOS Maestro flows run on macOS CI runners only. Skip on Linux CI.

---

## B. E2E Testing Extension — Playwright (Web)

### B1. New Specs for Reporting (Sub-Phase 5-1)

| # | Spec | Description |
|---|------|-------------|
| 1 | `reports-dashboard.spec.ts` | Reports list page, filter, download |
| 2 | `reports-builder.spec.ts` | Generate report via builder form |
| 3 | `reports-schedules.spec.ts` | CRUD report schedules (admin only) |

### B2. New Specs for Analytics (Sub-Phase 5-2)

| # | Spec | Description |
|---|------|-------------|
| 4 | `analytics-dashboard.spec.ts` | Dashboard KPI cards, chart rendering |
| 5 | `analytics-workers.spec.ts` | Worker ranking table, filters |
| 6 | `analytics-areas.spec.ts` | Area comparison, rayon filter |

### B3. New Specs for Assets (Sub-Phase 5-3)

| # | Spec | Description |
|---|------|-------------|
| 7 | `assets-list.spec.ts` | Assets list with category/status filters |
| 8 | `assets-detail.spec.ts` | Asset detail page, assignment history |
| 9 | `assets-form.spec.ts` | Create/edit asset form validation |
| 10 | `assets-qr.spec.ts` | QR bulk generator, print preview |
| 11 | `assets-maintenance.spec.ts` | Maintenance calendar, create/complete |

---

## C. Performance Testing

### C1. Response Time Targets

| Endpoint | Target | Method |
|----------|--------|--------|
| `GET /analytics/dashboard` | <1s | Playwright + timing API |
| `GET /analytics/workers` (100 workers) | <2s | k6 load test |
| `POST /reporting/generate` (PDF) | <30s | Backend integration test |
| `POST /reporting/generate` (CSV) | <5s | Backend integration test |
| `GET /assets` (500 assets) | <1s | k6 load test |
| `POST /assets/:id/qr` (single) | <2s | Backend integration test |
| `POST /assets/qr/bulk` (50 assets) | <30s | Backend integration test |

### C2. Load Testing (k6)

```javascript
// k6 script for analytics endpoints
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 50 },    // Stay at 50
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95th percentile <2s
    http_req_failed: ['rate<0.01'],     // <1% error rate
  },
};

export default function () {
  const res = http.get('https://api-staging.sekar.wahyutrip.com/analytics/dashboard', {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## D. iOS Testing Matrix

### D1. Device Coverage

| Device | iOS Version | Features to Test |
|--------|-------------|-----------------|
| iPhone 16 Pro Max | iOS 18 | Face ID, latest features |
| iPhone 14 | iOS 17 | Standard testing |
| iPhone SE (3rd gen) | iOS 16 | Touch ID, small screen |
| iPhone 12 | iOS 15 | Minimum supported version |
| iPad Air (5th gen) | iOS 16 | Tablet layout (optional) |

### D2. iOS-Specific Test Cases

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Apple Sign-In (new user) | Creates account, returns token |
| 2 | Apple Sign-In (existing user) | Links Apple ID, returns token |
| 3 | Face ID unlock | App unlocks without password |
| 4 | Touch ID unlock | App unlocks without password |
| 5 | APNs notification received | Notification appears, tappable |
| 6 | Deep link from notification | Opens correct screen |
| 7 | Background location tracking | Continues during shift |
| 8 | Camera permissions (QR scan) | Permission dialog, camera works |
| 9 | Camera permissions (selfie) | Permission dialog, camera works |
| 10 | App backgrounded >5 min | Biometric prompt on return |

---

## E. Coverage Targets

### E1. Unit Test Coverage

| Component | Current (Post-P4) | Phase 5 Target |
|-----------|-------------------|----------------|
| Backend overall | >90% stmts | >90% maintained |
| Backend reporting | 0% | >80% |
| Backend analytics | 0% | >80% |
| Backend assets | 0% | >80% |
| Mobile overall | >80% stmts | >80% maintained |
| Mobile new screens | 0% | >75% |
| Web overall | 96%+ stmts | >90% maintained |
| Web new pages | 0% | >75% |

### E2. E2E Coverage

| Platform | Current (Post-P4) | Phase 5 Target |
|----------|-------------------|----------------|
| Maestro flows | 15+ | 25+ (+13 new) |
| Playwright specs | 20+ | 31+ (+11 new) |

---

## F. Test Data Strategy

### F1. E2E Test Seeds

E2E tests require consistent seed data:

```typescript
// test-seed-phase4.ts
// Add to existing test seed:
// - 3 report templates (daily, weekly, worker)
// - 6 asset categories
// - 20 sample assets across 3 areas
// - 5 asset assignments (2 active, 3 returned)
// - 3 maintenance records (1 scheduled, 1 completed, 1 overdue)
```

### F2. Playwright Test Fixtures

```typescript
// apps/web/e2e/fixtures/phase4.ts
export const phase4Fixtures = {
  adminUser: { username: 'admin', password: 'Password123!' },
  korlapUser: { username: 'korlap1', password: 'Password123!' },
  satgasUser: { username: 'satgas1', password: 'Password123!' },
  sampleAsset: { code: 'AK-RU-001', name: 'Sapu Lidi #1' },
};
```

---

**Last Updated:** 2026-03-13
