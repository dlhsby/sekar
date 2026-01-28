# E2E Tests for SEKAR Web Dashboard

Comprehensive end-to-end tests using Playwright for the SEKAR web dashboard application.

## Test Structure

```
e2e/
├── auth.setup.ts                    # Authentication helpers and test users
├── 01-authentication.spec.ts        # Login, logout, session management
├── 02-user-management.spec.ts       # User CRUD operations
├── 03-task-management.spec.ts       # Task creation and workflows
├── 04-reports-review.spec.ts        # Reports viewing and review
├── 05-navigation-dashboard.spec.ts  # Navigation, dashboard, UX
└── README.md                        # This file
```

## Prerequisites

1. **Backend API running** at `http://localhost:3000`
2. **Test users seeded** in database:
   - `admin@sekar.com` / `admin123` (Admin role)
   - `koordinator@sekar.com` / `koordinator123` (KoordinatorLapangan role)
   - `kepala@sekar.com` / `kepala123` (KepalaRayon role)
   - `worker@sekar.com` / `worker123` (Worker role)

## Running Tests

### Run all E2E tests
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

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
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
- **Base URL:** `http://localhost:3000`
- **Browsers:** Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
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
- ✅ Edit existing user
- ✅ Delete user with confirmation
- ✅ Pagination
- ✅ Access control (Admin only)

### 3. Task Management (03-task-management.spec.ts)
- ✅ Display tasks list
- ✅ Filter by status
- ✅ Filter by priority
- ✅ Create new task
- ✅ Field validation
- ✅ Search tasks
- ✅ Pagination
- ✅ Cancel task creation
- ✅ Access control (Admin, KepalaRayon, Koordinator)

### 4. Reports Review (04-reports-review.spec.ts)
- ✅ Display reports list
- ✅ Filter by report type
- ✅ Filter by date range
- ✅ Search by worker/area
- ✅ View report detail
- ✅ Review unreviewed reports
- ✅ Display photo and GPS data
- ✅ Statistics display
- ✅ Pagination
- ✅ Navigation back from detail
- ✅ Access control (Admin, TopManagement, KepalaRayon, Koordinator)

### 5. Navigation & Dashboard (05-navigation-dashboard.spec.ts)
- ✅ Sidebar menu display
- ✅ Navigation between pages
- ✅ Active menu highlighting
- ✅ Mobile menu toggle
- ✅ Dashboard statistics cards
- ✅ Quick action buttons
- ✅ Role-specific dashboards
- ✅ Breadcrumbs on nested pages
- ✅ Browser back button navigation
- ✅ Responsive design (tablet, mobile)
- ✅ Loading states
- ✅ Error handling
- ✅ Accessibility (heading hierarchy, keyboard navigation, ARIA labels)

## Writing New Tests

### Test Structure Template
```typescript
import { test, expect } from '@playwright/test';
import { login, testUsers } from './auth.setup';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    await page.goto('/your-page');
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

1. **Use data-testid** for stable selectors:
   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```

2. **Wait for network idle** after navigation:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use fallback selectors** for robustness:
   ```typescript
   const button = page.locator('button:has-text("Submit")')
     .or(page.locator('[data-testid="submit"]'));
   ```

4. **Check element exists before interacting**:
   ```typescript
   if (await button.count() > 0) {
     await button.click();
   }
   ```

5. **Set appropriate timeouts**:
   ```typescript
   await expect(element).toBeVisible({ timeout: 5000 });
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

## Maintenance

### Update test users
Edit `auth.setup.ts` if test user credentials change in the backend.

### Add new test file
1. Create file: `e2e/06-new-feature.spec.ts`
2. Follow naming convention: `##-feature-name.spec.ts`
3. Import auth helpers: `import { login, testUsers } from './auth.setup';`
4. Write tests following existing patterns

### Update Playwright
```bash
npm install -D @playwright/test@latest
npx playwright install
```

## Troubleshooting

### Tests fail with "timeout"
- Increase timeout in test: `{ timeout: 10000 }`
- Check backend is running: `curl http://localhost:3000/api/health`
- Check network: `await page.waitForLoadState('networkidle')`

### Tests fail with "element not found"
- Check selector: `await page.locator('selector').count()`
- Use Playwright Inspector: `npx playwright test --debug`
- Add fallback selectors: `.or(page.locator('alternative'))`

### Tests pass locally but fail in CI
- Check CI has test users seeded
- Verify environment variables are set
- Check for timing issues (add waits)
- Review CI logs for API errors

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
