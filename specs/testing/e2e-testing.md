# E2E Tests for SEKAR Web Dashboard

Comprehensive end-to-end tests using Playwright for the SEKAR web dashboard application.

**Last Updated:** February 3, 2026
**Status:** Enhanced with Mock API System

## Test Structure

```
e2e/
├── fixtures/
│   └── mock-api.ts                  # Mock API responses and route handlers
├── auth.setup.ts                    # Authentication helpers and test users
├── 01-authentication.spec.ts        # Login, logout, session management
├── 02-user-management.spec.ts       # User CRUD operations
├── 03-task-management.spec.ts       # Task creation and workflows
├── 04-reports-review.spec.ts        # Reports viewing and review
├── 05-navigation-dashboard.spec.ts  # Navigation, dashboard, UX
└── 06-areas-management.spec.ts      # Areas CRUD operations
```

## Mock API System

E2E tests use a mock API system that intercepts all API calls, providing:

- **No Backend Required**: Tests run without backend server
- **Fast Execution**: Instant responses, no network delays
- **Deterministic Results**: Same data every run
- **CI/CD Ready**: Works in any environment

### Test Users (Mock)

| Key | Username | Password | Role |
|-----|----------|----------|------|
| admin | admin | admin123 | admin |
| koordinator | koordinator_bungkul | password123 | koordinator_lapangan |
| kepalaRayon | kepala_rayon_selatan | password123 | kepala_rayon |
| worker | worker1 | worker123 | worker |
| topManagement | top_management1 | password123 | top_management |

## Running Tests

### Run all E2E tests (uses mock API)
```bash
npm run test:e2e
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test e2e/01-authentication.spec.ts
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run against real backend
```bash
# Terminal 1: Start backend
cd be && npm run start:dev

# Terminal 2: Run tests with real API
USE_REAL_API=true npm run test:e2e
```

### Debug tests
```bash
npx playwright test --debug
```

### Generate test report
```bash
npx playwright show-report
```

## Test Configurations

Configured in `playwright.config.ts`:

- **Test Directory:** `./e2e`
- **Base URL:** `http://localhost:3001`
- **Browsers:** Chrome, Firefox, Safari
- **Screenshots:** Captured on failure
- **Traces:** Captured on first retry
- **Retries:** 2 retries in CI, 0 locally

## Test Coverage

### 1. Authentication (01-authentication.spec.ts)
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Field validation
- ✅ Logout functionality
- ✅ Session persistence
- ✅ Role-based access control for all roles

### 2. User Management (02-user-management.spec.ts)
- ✅ Display users list
- ✅ Search users by name
- ✅ Filter users by role
- ✅ Create new user
- ✅ Field validation on create
- ✅ Email format validation
- ✅ Access control (Admin only)

### 3. Task Management (03-task-management.spec.ts)
- ✅ Display tasks list
- ✅ Filter by status
- ✅ Filter by priority
- ✅ Create new task
- ✅ Field validation
- ✅ Search tasks
- ✅ Access control (Admin, Koordinator)

### 4. Reports Review (04-reports-review.spec.ts)
- ✅ Display reports list
- ✅ Filter by report type
- ✅ Filter by date range
- ✅ Search by worker/area
- ✅ View report detail
- ✅ Access control (Admin, Koordinator)

### 5. Navigation & Dashboard (05-navigation-dashboard.spec.ts)
- ✅ Sidebar menu display
- ✅ Navigation between pages
- ✅ Active menu highlighting
- ✅ Mobile menu toggle
- ✅ Dashboard statistics cards
- ✅ Role-specific dashboards
- ✅ Breadcrumbs on nested pages
- ✅ Browser back button navigation
- ✅ Responsive design (tablet, mobile)
- ✅ Accessibility (heading, keyboard, ARIA)

### 6. Areas Management (06-areas-management.spec.ts)
- ✅ Display areas list
- ✅ Navigate to area detail
- ✅ Navigate to create form
- ✅ Field validation
- ✅ Navigate to edit form
- ✅ Delete confirmation modal
- ✅ Filter by rayon
- ✅ Search by name
- ✅ Access control (Admin, TopManagement)
- ✅ Responsive design
- ✅ Accessibility

## Writing New Tests

### Test Structure Template

```typescript
import { test, expect } from '@playwright/test';
import { quickLogin, testUsers } from './auth.setup';
import { setupMockApi } from './fixtures/mock-api';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock API for the user role
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

### Best Practices

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

## Mock API Details

### Files

- `e2e/fixtures/mock-api.ts` - Mock data and route handlers
- `e2e/auth.setup.ts` - Authentication helpers using mocks

### Available Mock Endpoints

| Endpoint | Methods | Description |
|----------|---------|-------------|
| /api/v1/auth/login | POST | User login |
| /api/v1/auth/refresh | POST | Token refresh |
| /api/v1/auth/me | GET | Current user |
| /api/v1/users | GET, POST | User list/create |
| /api/v1/users/:id | GET, PUT, DELETE | User detail/update/delete |
| /api/v1/tasks | GET, POST | Task list/create |
| /api/v1/tasks/:id | GET, PUT, DELETE | Task detail/update/delete |
| /api/v1/reports | GET | Report list |
| /api/v1/reports/:id | GET, PATCH | Report detail/update |
| /api/v1/areas | GET, POST | Area list/create |
| /api/v1/areas/:id | GET, PUT, DELETE | Area detail/update/delete |
| /api/v1/rayons | GET | Rayon list |
| /api/v1/monitoring | GET | Monitoring data |
| /api/v1/dashboard/stats | GET | Dashboard statistics |

### Adding New Mock Endpoints

```typescript
// In mock-api.ts setupMockApi function
await page.route('**/api/v1/your-endpoint**', async (route) => {
  const method = route.request().method();

  if (method === 'GET') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: yourMockData }),
    });
  }
});
```

## Debugging Failed Tests

### View test trace
```bash
npx playwright show-trace trace.zip
```

### Run with console logs
```bash
DEBUG=pw:api npx playwright test
```

### Take screenshot manually
```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### Pause execution
```typescript
await page.pause();
```

## CI/CD Integration

Tests run automatically in CI with:
- **Parallel execution:** Disabled in CI (workers: 1)
- **Retries:** 2 attempts per test
- **Report:** HTML report generated
- **Screenshots:** Captured on failure

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests fail with "timeout"
- Check selector: `await page.locator('selector').count()`
- Increase timeout: `{ timeout: 10000 }`
- Add wait: `await page.waitForLoadState('networkidle')`

### Tests fail with "element not found"
- Use Playwright Inspector: `npx playwright test --debug`
- Add fallback selectors: `.or(page.locator('alternative'))`
- Check mock API is setup: `await setupMockApi(page, 'admin')`

### Tests pass locally but fail in CI
- Ensure mock API is used (not real backend)
- Check for timing issues (add waits)
- Review CI logs for errors

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [fe/web/TEST_SETUP.md](../../fe/web/TEST_SETUP.md) - Complete testing guide
