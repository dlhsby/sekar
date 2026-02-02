# E2E Testing Specifications

**Phase:** 3 - Polishing & E2E Testing
**Status:** Not Started

---

## Overview

End-to-end testing ensures that all user flows work correctly from start to finish. This document specifies E2E testing frameworks, configurations, and test scenarios for SEKAR.

---

## Mobile E2E Testing (Detox)

### Framework Selection

**Recommended:** Detox by Wix

**Why Detox:**
- Native React Native support (gray-box testing)
- Fast and reliable (no flaky waits)
- Excellent CI/CD integration
- Compatible with React Native 0.76.x
- Better than Appium for React Native apps

### Installation

```bash
cd fe/mobile

# Install Detox CLI
npm install -g detox-cli

# Install Detox packages
npm install --save-dev detox @types/detox
npm install --save-dev jest-circus

# Install Android test runner
npm install --save-dev detox-android-instrumentation
```

### Configuration

**File:** `fe/mobile/.detoxrc.js`

```javascript
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release'
    },
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/sekar.app',
      build: 'xcodebuild -workspace ios/sekar.xcworkspace -scheme sekar -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    }
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30'
      }
    },
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    }
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    },
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    }
  }
};
```

### Test Structure

```
fe/mobile/e2e/
├── jest.config.js
├── init.ts
├── flows/
│   ├── auth.e2e.ts
│   ├── clockInOut.e2e.ts
│   ├── workReport.e2e.ts
│   ├── tasks.e2e.ts
│   └── notifications.e2e.ts
├── pages/
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   ├── ClockPage.ts
│   └── ReportPage.ts
└── helpers/
    ├── testData.ts
    └── utils.ts
```

### Critical Test Flows

#### 1. Authentication Flow
```typescript
// e2e/flows/auth.e2e.ts
describe('Authentication', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login successfully with valid credentials', async () => {
    await element(by.id('input-nip')).typeText('worker1');
    await element(by.id('input-password')).typeText('worker123');
    await element(by.id('btn-login')).tap();
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('input-nip')).typeText('invalid');
    await element(by.id('input-password')).typeText('wrong');
    await element(by.id('btn-login')).tap();
    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });

  it('should logout successfully', async () => {
    await element(by.id('tab-profile')).tap();
    await element(by.id('btn-logout')).tap();
    await expect(element(by.id('login-screen'))).toBeVisible();
  });
});
```

#### 2. Clock-In/Out Flow
```typescript
// e2e/flows/clockInOut.e2e.ts
describe('Clock In/Out', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginAsWorker();
  });

  it('should clock in with valid GPS location', async () => {
    await device.setLocation(/* valid location coords */);
    await element(by.id('tab-clock')).tap();
    await element(by.id('btn-clock-in')).tap();
    await expect(element(by.text('Clock in successful'))).toBeVisible();
  });

  it('should show error when outside area', async () => {
    await device.setLocation(/* invalid location coords */);
    await element(by.id('btn-clock-in')).tap();
    await expect(element(by.text('Outside work area'))).toBeVisible();
  });

  it('should clock out successfully', async () => {
    await element(by.id('btn-clock-out')).tap();
    await element(by.id('confirm-clock-out')).tap();
    await expect(element(by.text('Clock out successful'))).toBeVisible();
  });
});
```

#### 3. Work Report Submission
```typescript
// e2e/flows/workReport.e2e.ts
describe('Work Report', () => {
  beforeAll(async () => {
    await device.launchApp();
    await loginAsWorker();
    await clockIn();
  });

  it('should submit report with photo', async () => {
    await element(by.id('tab-report')).tap();
    await element(by.id('btn-add-report')).tap();
    await element(by.id('input-description')).typeText('Cleaned park area');
    await element(by.id('btn-add-photo')).tap();
    // Mock camera/gallery
    await element(by.id('btn-submit-report')).tap();
    await expect(element(by.text('Report submitted'))).toBeVisible();
  });
});
```

---

## Web E2E Testing (Playwright)

### Existing Configuration

Playwright is already configured in `fe/web/playwright.config.ts`.

### Extended Test Flows

```
fe/web/e2e/
├── auth.spec.ts        (existing)
├── dashboard.spec.ts   (existing)
├── users.spec.ts       (to create)
├── areas.spec.ts       (to create)
├── tasks.spec.ts       (to create)
├── reports.spec.ts     (to create)
└── monitoring.spec.ts  (to create)
```

### New Test Specifications

#### User Management Tests
```typescript
// e2e/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', 'admin');
    await page.fill('[data-testid="input-password"]', 'admin123');
    await page.click('[data-testid="btn-login"]');
    await page.goto('/users');
  });

  test('should create new user', async ({ page }) => {
    await page.click('[data-testid="btn-create-user"]');
    await page.fill('[data-testid="input-name"]', 'Test Worker');
    await page.fill('[data-testid="input-nip"]', 'TW001');
    await page.selectOption('[data-testid="select-role"]', 'Worker');
    await page.click('[data-testid="btn-save"]');
    await expect(page.locator('text=User created successfully')).toBeVisible();
  });

  test('should edit existing user', async ({ page }) => {
    await page.click('[data-testid="user-row-1"] [data-testid="btn-edit"]');
    await page.fill('[data-testid="input-name"]', 'Updated Name');
    await page.click('[data-testid="btn-save"]');
    await expect(page.locator('text=User updated successfully')).toBeVisible();
  });

  test('should delete user with confirmation', async ({ page }) => {
    await page.click('[data-testid="user-row-1"] [data-testid="btn-delete"]');
    await page.click('[data-testid="btn-confirm-delete"]');
    await expect(page.locator('text=User deleted successfully')).toBeVisible();
  });
});
```

#### Task Assignment Tests
```typescript
// e2e/tasks.spec.ts
test.describe('Task Management', () => {
  test('should create and assign task', async ({ page }) => {
    await page.goto('/tasks');
    await page.click('[data-testid="btn-create-task"]');
    await page.fill('[data-testid="input-title"]', 'Park Cleanup');
    await page.selectOption('[data-testid="select-area"]', 'Area 1');
    await page.selectOption('[data-testid="select-assignee"]', 'Worker 1');
    await page.click('[data-testid="btn-save"]');
    await expect(page.locator('text=Task created successfully')).toBeVisible();
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  mobile-e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd fe/mobile
          npm ci

      - name: Setup Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          target: google_apis
          arch: x86_64
          profile: Pixel_4

      - name: Build for Detox
        run: |
          cd fe/mobile
          detox build --configuration android.emu.debug

      - name: Run Detox tests
        run: |
          cd fe/mobile
          detox test --configuration android.emu.debug

  web-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd fe/web
          npm ci
          npx playwright install --with-deps

      - name: Run Playwright tests
        run: |
          cd fe/web
          npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: fe/web/playwright-report/
```

---

## Test Data Management

### Seeded Test Data

Use the backend seed script to ensure consistent test data:

```bash
cd be && npm run seed
```

**Test Users:**
- `admin` / `admin123` (Admin role)
- `supervisor1` / `supervisor123` (Supervisor role)
- `worker1`, `worker2`, `worker3` / `worker123` (Worker role)

### Mock Data for E2E

```typescript
// e2e/helpers/testData.ts
export const testLocations = {
  validWorkArea: { latitude: -7.2575, longitude: 112.7521 },
  outsideWorkArea: { latitude: -7.3000, longitude: 112.8000 },
};

export const testUsers = {
  worker: { nip: 'worker1', password: 'worker123' },
  supervisor: { nip: 'supervisor1', password: 'supervisor123' },
  admin: { nip: 'admin', password: 'admin123' },
};
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Mobile E2E pass rate | >95% |
| Web E2E pass rate | >95% |
| Test execution time | <15 minutes |
| Flaky test rate | <5% |
| Code coverage (E2E) | >60% of critical paths |
