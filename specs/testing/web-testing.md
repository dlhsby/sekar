# SEKAR Web Testing Guide

**Component:** SEKAR Web Dashboard
**Framework:** Next.js 16.1.4 + React 19
**Testing Stack:** Jest, React Testing Library, Playwright
**Last Updated:** February 4, 2026
**Status:** ✅ 83.99% Coverage (All Metrics >80%)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Organization](#test-organization)
4. [Unit Tests](#unit-tests)
5. [E2E Tests](#e2e-tests)
6. [Test Patterns](#test-patterns)
7. [Configuration](#configuration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [References](#references)

---

## Overview

### Test Coverage Summary

| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| **Statements** | 83.99% | 80% | ✅ PASS |
| **Branches** | 92.67% | 80% | ✅ PASS |
| **Functions** | 90.82% | 80% | ✅ PASS |
| **Lines** | 83.99% | 80% | ✅ PASS |

**Test Count:**
- Unit Tests: 975 passing, 14 skipped (51 suites)
- E2E Tests: 172 tests across 8 spec files
- **Total:** 1,147 tests

### Coverage by Module

| Module | Coverage | Test Files | Status |
|--------|----------|------------|--------|
| `components/ui` | 99.87% | 15 test files | ✅ Excellent |
| `lib/auth` | 100% | 2 test files | ✅ Perfect |
| `lib/api` | 92.42% | 10 test files | ✅ Excellent |
| `lib/utils` | 95.1% | 3 test files | ✅ Excellent |
| `components/areas` | 100% | 2 test files | ✅ Perfect |
| `components/users` | 99.34% | 2 test files | ✅ Excellent |
| `components/rayons` | 100% | 2 test files | ✅ Perfect |
| `components/layout` | 94.11% | 2 test files | ✅ Excellent |

---

## Quick Start

### Prerequisites

- Node.js >= 24.13.0
- npm >= 10.0.0
- Backend API running at http://localhost:3000 (for real API E2E tests)
- Web dev server will run at http://localhost:3001

### Installation

```bash
cd apps/web

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install

# Install user event library (if not already installed)
npm install --save-dev @testing-library/user-event
```

### Running Tests

```bash
# Unit Tests
npm test                 # Run all unit tests
npm run test:watch       # Watch mode
npm run test:cov         # With coverage report

# E2E Tests
npm run test:e2e         # Headless (uses mock API)
npm run test:e2e:ui      # With UI mode
npx playwright test 01-authentication  # Specific spec

# Type Checking
npm run type-check

# Lint
npm run lint
```

---

## Test Organization

### Directory Structure

```
apps/web/
├── src/
│   ├── lib/
│   │   ├── api/__tests__/          # 10 API test files (103 tests)
│   │   ├── auth/__tests__/         # 2 auth test files (36 tests)
│   │   ├── utils/__tests__/        # 3 utility test files (52 tests)
│   │   └── __tests__/              # 1 navigation test (29 tests)
│   ├── components/
│   │   ├── ui/__tests__/           # 15 UI component tests (505 tests)
│   │   ├── areas/__tests__/        # 2 area component tests (25 tests)
│   │   ├── users/__tests__/        # 2 user component tests (10 tests)
│   │   ├── layout/__tests__/       # 2 layout tests (22 tests)
│   │   └── rayons/__tests__/       # 2 rayon tests (19 tests)
│   ├── stores/__tests__/           # 1 store test (10 tests)
│   └── app/                        # Pages excluded (tested via E2E)
├── e2e/
│   ├── fixtures/
│   │   └── mock-api.ts             # Mock API system
│   ├── auth.setup.ts               # Authentication helpers
│   ├── 01-authentication.spec.ts   # 22 tests
│   ├── 02-user-management.spec.ts  # 24 tests
│   ├── 03-task-management.spec.ts  # 18 tests
│   ├── 04-reports-review.spec.ts   # 16 tests
│   ├── 05-navigation-dashboard.spec.ts # 14 tests
│   ├── 06-areas-management.spec.ts # 20 tests
│   ├── 07-schedules.spec.ts        # 27 tests
│   └── 08-monitoring.spec.ts       # 41 tests
├── jest.config.ts                  # Jest configuration
├── jest.setup.ts                   # Test setup
└── playwright.config.ts            # Playwright configuration
```

---

## Unit Tests

### Configuration

Unit test configuration in `jest.config.ts`:

```typescript
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/app/**/page.tsx',      // Exclude Next.js pages
    '!src/app/**/layout.tsx',    // Exclude layouts
    '!src/app/**/loading.tsx',   // Exclude loading states
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Why Pages Are Excluded

Next.js pages (`page.tsx`, `layout.tsx`) are excluded from unit test coverage because:
1. They're server components with complex Next.js-specific logic
2. They're already covered by Playwright E2E tests (172 tests)
3. Unit testing them requires complex mocking with low value
4. E2E tests provide better coverage for page-level functionality

### Running Unit Tests

```bash
# Run all tests
npm test

# Run in watch mode (recommended during development)
npm run test:watch

# Run with coverage report
npm run test:cov

# Run specific test file
npm test -- button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"
```

Coverage reports are generated in `coverage/` directory. Open `coverage/lcov-report/index.html` to view detailed report.

### Test Structure

Unit tests follow the Arrange-Act-Assert pattern:

```typescript
describe('Component', () => {
  describe('Feature Group', () => {
    it('should do something when condition', () => {
      // Arrange: Setup
      render(<Component prop="value" />);

      // Act: User interaction
      const button = screen.getByRole('button');
      await user.click(button);

      // Assert: Verify outcome
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
```

---

## E2E Tests

### Mock API System

E2E tests use a mock API system that intercepts all API calls, providing:

- **No Backend Required**: Tests run without backend server
- **Fast Execution**: Instant responses, no network delays
- **Deterministic Results**: Same data every run
- **CI/CD Ready**: Works in any environment

### Test Users (Mock)

| Key | Username | Password | Role |
|-----|----------|----------|------|
| admin | admin | Password123! | admin |
| koordinator | koordinator_bungkul | Password123! | koordinator_lapangan |
| kepalaRayon | kepala_rayon_selatan | Password123! | kepala_rayon |
| worker | worker1 | Password123! | worker |
| topManagement | management1 | Password123! | management |

### Running E2E Tests

```bash
# Run all E2E tests (headless, uses mock API)
npm run test:e2e

# Run with UI mode (recommended for debugging)
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/01-authentication.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run against real backend
# Terminal 1: Start backend
cd be && npm run start:dev

# Terminal 2: Run tests with real API
USE_REAL_API=true npm run test:e2e
```

### E2E Configuration

Configured in `playwright.config.ts`:

- **Base URL:** http://localhost:3001
- **Auto-starts dev server** if not running
- **Browsers:** Chromium, Firefox, WebKit
- **Screenshots:** Captured on failure
- **Traces:** Recorded on first retry
- **Retries:** 2 in CI, 0 locally

### E2E Test Coverage

#### 1. Authentication (01-authentication.spec.ts)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Field validation
- ✅ Logout functionality
- ✅ Session persistence
- ✅ Role-based access control

#### 2. User Management (02-user-management.spec.ts)
- ✅ Display users list
- ✅ Search users by name
- ✅ Filter users by role
- ✅ Create new user
- ✅ Field validation
- ✅ Access control (Admin only)

#### 3. Task Management (03-task-management.spec.ts)
- ✅ Display tasks list
- ✅ Filter by status/priority
- ✅ Create new task
- ✅ Field validation
- ✅ Search tasks
- ✅ Access control

#### 4. Reports Review (04-reports-review.spec.ts)
- ✅ Display reports list
- ✅ Filter by type/date
- ✅ Search by worker/area
- ✅ View report detail
- ✅ Access control

#### 5. Navigation & Dashboard (05-navigation-dashboard.spec.ts)
- ✅ Sidebar menu display
- ✅ Navigation between pages
- ✅ Mobile menu toggle
- ✅ Dashboard statistics
- ✅ Breadcrumbs
- ✅ Responsive design
- ✅ Accessibility (ARIA, keyboard)

#### 6. Areas Management (06-areas-management.spec.ts)
- ✅ Display areas list
- ✅ CRUD operations
- ✅ Field validation
- ✅ Filter by rayon
- ✅ Search by name
- ✅ Access control

#### 7. Schedules (07-schedules.spec.ts)
- ✅ Schedule list display
- ✅ Create/edit schedules
- ✅ Date/time validation
- ✅ Worker assignment
- ✅ Bulk operations

#### 8. Monitoring (08-monitoring.spec.ts)
- ✅ Real-time worker status
- ✅ Live location tracking
- ✅ Dashboard statistics
- ✅ Filter by rayon/area
- ✅ Performance metrics

### Phase 2D Monitoring Component Tests

| Component | Test File | Key Test Cases |
|-----------|----------|----------------|
| MonitoringMap | MonitoringMap.test.tsx | Map initialization, marker rendering by status, polygon rendering, cluster behavior, marker click events, fly-to animation |
| MonitoringSidePanel | MonitoringSidePanel.test.tsx | User list rendering, status filter chips, search filtering, empty state, loading skeleton, virtual scroll |
| UserDetailPanel | UserDetailPanel.test.tsx | User info display, shift details, WhatsApp/call buttons, location history link, reassign action |
| LocationTimeline | LocationTimeline.test.tsx | GPS point list, date picker, map sync on point click, empty state, distance calculation display |
| StatusCard | StatusCard.test.tsx | Count display, status color, click filter action, loading state, accessibility labels |
| UserListItem | UserListItem.test.tsx | Name/role display, status indicator, battery warning, last seen time, click navigation |
| MonitoringConfigPage | config/page.test.tsx | Threshold inputs, validation ranges, save mutation, role gate (admin only), error display |

### Monitoring E2E Tests (Playwright)
- Dashboard load with mock WebSocket
- Filter by status → verify list updates
- Click marker → side panel shows user detail
- Navigate to location history → verify GPS trail
- Admin config page → modify threshold → save

---

## Test Patterns

### 1. API Client Testing (TanStack Query)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { useUsers } from '@/lib/api/users';
import { apiClient } from '@/lib/api/client';

describe('Users API', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  it('should fetch users', async () => {
    mockAxios.onGet('/users').reply(200, {
      data: [{ id: '1', username: 'admin' }],
      meta: { total: 1 },
    });

    const { result } = renderHook(() => useUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});
```

### 2. Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AreaCard } from '@/components/areas/AreaCard';

describe('AreaCard', () => {
  const mockArea = {
    id: '1',
    name: 'Taman Bungkul',
    area_type: { name: 'Taman' },
    rayon: { name: 'Rayon Selatan' },
    area_m2: 15000,
  };

  it('should display area information', () => {
    render(<AreaCard area={mockArea} />);

    expect(screen.getByText('Taman Bungkul')).toBeInTheDocument();
    expect(screen.getByText('Taman')).toBeInTheDocument();
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();

    render(<AreaCard area={mockArea} onEdit={onEdit} />);
    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

### 3. Auth Hook Testing

```typescript
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/lib/auth/hooks';
import { AuthProvider } from '@/lib/auth/context';

describe('Auth Hooks', () => {
  it('should return auth context', () => {
    const mockUser = { id: '1', username: 'admin', role: 'admin' };

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider mockUser={mockUser}>{children}</AuthProvider>
      ),
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### 4. E2E Test Template

```typescript
import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock API for specific user role
    await setupMockApi(page, 'admin');

    // Quick login (sets cookies, bypasses form)
    await quickLogin(page, testUsers.admin);

    // Navigate to page
    await page.goto('/your-page');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('button:has-text("Click Me")');

    // Act
    await button.click();

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

---

## Best Practices

### Testing Library Query Priority

Use queries in this order (accessibility-first):

1. **getByRole** - Accessibility-first (preferred)
2. **getByLabelText** - Form inputs and labels
3. **getByPlaceholderText** - When labels aren't available
4. **getByText** - Content-based queries
5. **getByTestId** - Last resort only

```typescript
// ✅ Good
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/username/i)

// ❌ Avoid
screen.getByTestId('submit-button')
```

### User Interactions

Always use `userEvent` instead of `fireEvent`:

```typescript
// ✅ GOOD: Use userEvent (async, realistic)
const user = userEvent.setup();
await user.type(input, 'text');
await user.click(button);

// ❌ BAD: Use fireEvent (sync, unrealistic)
fireEvent.change(input, { target: { value: 'text' } });
fireEvent.click(button);
```

### Async Operations

```typescript
// ✅ GOOD: Use findBy* for async elements
const element = await screen.findByText(/loaded/i);

// ✅ GOOD: Use waitFor for assertions
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});

// ❌ BAD: Use getBy* for async elements
const element = screen.getByText(/loaded/i); // May fail
```

### Accessibility Testing

Every component test should include accessibility checks:

```typescript
it('should be accessible', () => {
  render(<Component />);

  // Check for proper roles
  expect(screen.getByRole('button')).toBeInTheDocument();

  // Check for labels
  expect(screen.getByLabelText('Username')).toBeInTheDocument();

  // Check minimum touch target (48px)
  const button = screen.getByRole('button');
  expect(button).toHaveClass('min-h-[48px]');
});
```

### E2E Best Practices

1. **Always use mock API** for consistent tests:
   ```typescript
   await setupMockApi(page, 'admin');
   await quickLogin(page, testUsers.admin);
   ```

2. **Use fallback selectors** for robustness:
   ```typescript
   const button = page.locator('button:has-text("Submit")')
     .or(page.locator('[data-testid="submit"]'));
   ```

3. **Check element exists before interacting**:
   ```typescript
   if (await button.count() > 0) {
     await button.click();
   }
   ```

4. **Set appropriate timeouts**:
   ```typescript
   await page.waitForLoadState('networkidle', { timeout: 5000 });
   await expect(element).toBeVisible({ timeout: 5000 });
   ```

5. **Use flexible assertions** for varying content:
   ```typescript
   const hasTitle =
     (await page.locator('h1:has-text("Users")').count()) > 0 ||
     (await page.locator('h1:has-text("Pengguna")').count()) > 0;
   expect(hasTitle).toBeTruthy();
   ```

---

## Configuration

### Jest Configuration

Key settings in `jest.config.ts`:

- **Test environment:** jsdom
- **Setup file:** `jest.setup.ts`
- **Module mapper:** `@/` → `src/`
- **Coverage threshold:** 80% across all metrics
- **Excluded from coverage:** Next.js pages, layouts, loading states

### Playwright Configuration

Key settings in `playwright.config.ts`:

- **Base URL:** http://localhost:3001
- **Test directory:** `./e2e`
- **Browsers:** Chromium, Firefox, WebKit
- **Screenshots:** On failure
- **Traces:** On first retry
- **Retries:** 2 in CI, 0 locally
- **Workers:** 1 in CI (parallel disabled)

---

## Troubleshooting

### Unit Tests

#### Issue: "Cannot find module '@testing-library/user-event'"

**Solution:** Install the package:
```bash
npm install --save-dev @testing-library/user-event
```

#### Issue: "ReferenceError: TextEncoder is not defined"

**Solution:** Already configured in `jest.setup.ts`. If issue persists, check Node.js version (need >= 18).

#### Issue: Mock not working

**Solution:** Ensure mock is setup before importing component:
```typescript
jest.mock('../utils/api', () => ({
  fetchData: jest.fn()
}));

import { Component } from '../Component';
```

#### Issue: "Act warnings" in console

**Solution:** Wrap state updates in `waitFor`:
```typescript
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

#### Issue: "Not implemented: navigation"

**Solution:**
```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/current-path',
}));
```

#### Issue: TanStack Query needs provider

**Solution:** Always wrap hooks with QueryClientProvider (see API testing pattern above).

#### Issue: Auth context not available

**Solution:**
```typescript
import * as AuthContext from '@/lib/auth/context';

jest.spyOn(AuthContext, 'useAuth').mockReturnValue({
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
});
```

### E2E Tests

#### Issue: "Target page, context or browser has been closed"

**Solution:** Ensure backend is running (if using real API):
```bash
cd be
npm run start:dev
```

Or use mock API mode (default):
```bash
npm run test:e2e
```

#### Issue: "Navigation timeout"

**Solution:** Increase timeout or check if page loads correctly:
```typescript
await page.goto('/login', { timeout: 10000 });
await page.waitForLoadState('networkidle');
```

#### Issue: Login tests failing with "input not found"

**Solution:** Check if login page uses `username` field:
```typescript
// ✅ Correct
await page.fill('input[name="username"]', 'admin');

// ❌ Incorrect
await page.fill('input[name="email"]', 'admin');
```

#### Issue: "Port 3001 already in use"

**Solution:**
```bash
lsof -ti:3001 | xargs kill -9
```

#### Issue: Tests fail with "timeout"

**Solutions:**
- Check selector: `await page.locator('selector').count()`
- Increase timeout: `{ timeout: 10000 }`
- Add wait: `await page.waitForLoadState('networkidle')`

#### Issue: Tests fail with "element not found"

**Solutions:**
- Use Playwright Inspector: `npx playwright test --debug`
- Add fallback selectors: `.or(page.locator('alternative'))`
- Check mock API is setup: `await setupMockApi(page, 'admin')`

#### Issue: Tests pass locally but fail in CI

**Solutions:**
- Ensure mock API is used (not real backend)
- Check for timing issues (add waits)
- Review CI logs for errors
- Check environment variables are set

### General

#### Issue: Tests passing locally but failing in CI

**Solutions:**
- Check for hardcoded timeouts (use longer timeouts in CI)
- Look for race conditions (use proper `waitFor` and `findBy*`)
- Ensure environment variables are set in CI

#### Issue: Flaky tests

**Solutions:**
- Avoid fixed timeouts (`waitForTimeout`)
- Use `waitFor` and `findBy*` queries
- Ensure proper cleanup between tests
- Check for shared state between tests

---

## References

### Documentation
- **Jest Config:** `/apps/web/jest.config.ts`
- **Playwright Config:** `/apps/web/playwright.config.ts`
- **Testing Strategy:** `/specs/testing/strategy.md`
- **Web Guide:** `/apps/web/CLAUDE.md`
- **Project Status:** `/specs/COMPLETION_STATUS.md`

### External Resources
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library Documentation](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library Query Priority](https://testing-library.com/docs/queries/about/#priority)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Writing New Tests

### Adding Tests for New Features

1. **Create test file** alongside the component/module
2. **Follow existing patterns** (see test files for examples)
3. **Run coverage** to verify >80% on new code
4. **Update this doc** if introducing new patterns

### Updating Tests

1. **Run affected tests** after code changes
2. **Update snapshots** if UI changed intentionally: `npm test -- -u`
3. **Maintain coverage** - don't let it drop below 80%

---

**Last Updated:** 2026-06-20
**Current E2E Status:** 45 Playwright tests passing (chromium), 1 staging-gated; 15 visreg baseline masks @ 375/768/1280 responsive
**Phase Status:** Phase 4 UI/UX revamp (4-R) 100% shipped + all hifi-web revamp frames delivered; Phase 5 feature modules shipped (Assets/Reporting/Analytics: 11 pages built; export/import pending)
**Next:** Phase 5-5 Release & Deployment, Phase 5-6 User Guides
