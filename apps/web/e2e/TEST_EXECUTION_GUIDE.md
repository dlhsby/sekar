# E2E Test Execution Guide

**Last Updated:** February 3, 2026
**Total Test Files:** 8
**Test Suites:** 38+
**Total Test Cases:** 68 unique tests × 5 browser configs = 340+ test executions

---

## Quick Start

### Run All E2E Tests
```bash
cd fe/web
npm run test:e2e
```

### Run Tests with UI Mode (Recommended for Development)
```bash
npm run test:e2e:ui
```

### Run Specific Test File
```bash
# Schedules tests only
npx playwright test 07-schedules

# Monitoring tests only
npx playwright test 08-monitoring

# All authentication tests
npx playwright test 01-authentication
```

### Run on Single Browser (Faster)
```bash
npx playwright test --project=chromium
```

---

## Test Files Overview

| # | File | Tests | Focus | Access Roles |
|---|------|-------|-------|--------------|
| 01 | authentication.spec.ts | 13 | Login, logout, RBAC | All |
| 02 | user-management.spec.ts | 15+ | User CRUD | Admin |
| 03 | task-management.spec.ts | 18+ | Task workflow | Admin, Koordinator |
| 04 | reports-review.spec.ts | 16+ | Report review | Admin, Supervisor |
| 05 | navigation-dashboard.spec.ts | 20+ | Navigation, UI | All |
| 06 | areas-management.spec.ts | 22+ | Areas CRUD | Admin, TopMgmt |
| **07** | **schedules.spec.ts** | **27** | **Schedule mgmt** | **Admin, Koordinator** |
| **08** | **monitoring.spec.ts** | **41** | **Real-time tracking** | **Admin, TopMgmt, Kepala, Koordinator** |

**Total Unique Tests:** 172+ tests
**Cross-Browser:** Each test runs on 5 browser configs (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
**Total Executions:** 860+ test runs

---

## New Tests Deep Dive

### 07-schedules.spec.ts (27 tests)

**Test Coverage:**
- ✅ View schedules list page
- ✅ Filter by area and shift
- ✅ Search by worker name
- ✅ Create new schedule (form validation)
- ✅ Edit existing schedule
- ✅ Delete schedule (with confirmation)
- ✅ Pagination handling
- ✅ Role-based access (Admin, Koordinator allowed; Worker, TopMgmt denied)
- ✅ Mobile responsiveness (375px, 768px)
- ✅ Keyboard navigation
- ✅ Accessibility (headings, labels)

**Mock Data Used:**
- 2 sample schedules (Worker One @ Taman Bungkul, Worker Two @ Taman Flora)
- 3 shift definitions (Pagi 07:00-15:00, Siang 14:00-22:00, Malam 21:00-05:00)
- Full CRUD operations mocked

**Key Scenarios:**
```typescript
// Filter schedules
await page.selectOption('select[label="Filter Area"]', 'Taman Bungkul');
await page.selectOption('select[label="Filter Shift"]', 'Shift Pagi');

// Delete with confirmation
await page.click('button:has-text("Hapus")');
await page.click('button:has-text("Hapus Jadwal")'); // Confirm
```

---

### 08-monitoring.spec.ts (41 tests)

**Test Coverage:**
- ✅ Real-time statistics display (workers online, linmas online, active shifts, reports today)
- ✅ Filter by rayon and area
- ✅ Reset filters
- ✅ Map display (placeholder or actual Google Maps)
- ✅ Workers list with online/offline status
- ✅ Battery level warnings (< 20%)
- ✅ Role-based access (4 roles allowed, Worker denied)
- ✅ Auto-refresh indicator (15s interval)
- ✅ Last updated timestamp
- ✅ Mobile responsiveness
- ✅ Accessibility

**Mock Data Used:**
- **City Stats:** 7 rayons, 15 areas, 45 workers, 12 linmas
- **Rayon Stats:** 5 areas, 15 workers, 4 linmas (Rayon Selatan)
- **Area Stats:** Taman Bungkul with current shift (Shift Pagi)
- **Live Workers:** 3 workers with GPS positions, battery levels, online/offline status

**Key Scenarios:**
```typescript
// Filter by rayon and area
await page.selectOption('select:has-text("Rayon")', 'Rayon Selatan');
await page.selectOption('select:has-text("Area")', 'Taman Bungkul');

// Verify real-time data
expect(page.locator('text=/28 Online/')).toBeVisible();
expect(page.locator('text=/Auto-refresh setiap 15 detik/')).toBeVisible();
```

---

## Mock API Configuration

### Enhanced Mock Data

**File:** `e2e/fixtures/mock-api.ts`

**New Additions:**
1. `schedulesList` - Worker schedules with pagination
2. `shiftDefinitions` - 3 shift types
3. `cityStats` - City-wide monitoring stats
4. `rayonStats` - Rayon-level stats
5. `areaStats` - Area-level stats with current shift
6. `liveWorkers` - 3 workers with GPS, battery, status

**New Route Handlers:**
```typescript
// Schedules
GET /schedules                    → Returns schedulesList
POST /schedules                   → Creates new schedule
GET /schedules/:id                → Returns single schedule
PATCH /schedules/:id              → Updates schedule
DELETE /schedules/:id             → Deletes schedule

// Shift Definitions
GET /shift-definitions            → Returns shiftDefinitions

// Monitoring
GET /monitoring/city              → Returns cityStats
GET /monitoring/rayon/:id         → Returns rayonStats
GET /monitoring/area/:id          → Returns areaStats
GET /monitoring/live-workers      → Returns liveWorkers
```

### Using Real API Instead of Mocks

Set environment variable:
```bash
export USE_REAL_API=true
npm run test:e2e
```

**Requirements:**
- Backend must be running on http://localhost:3000
- Database must be seeded with test data
- All API endpoints must be implemented

---

## Test Execution Modes

### 1. Headless Mode (CI/CD)
```bash
npm run test:e2e
```
- Runs in background
- Generates HTML report
- Best for CI/CD pipelines

### 2. UI Mode (Development)
```bash
npm run test:e2e:ui
```
- Interactive test explorer
- Watch mode enabled
- Debugging tools built-in
- Best for writing/debugging tests

### 3. Debug Mode
```bash
npx playwright test --debug
```
- Opens Playwright Inspector
- Step through tests
- Inspect selectors
- Best for troubleshooting

### 4. Headed Mode
```bash
npx playwright test --headed
```
- Shows browser windows
- See tests execute visually
- Best for demos

---

## Browser Configuration

Tests run on 5 browser configurations:

1. **Desktop Chrome** (Chromium)
2. **Desktop Firefox**
3. **Desktop Safari** (WebKit)
4. **Mobile Chrome** (Pixel 5 viewport: 393×851)
5. **Mobile Safari** (iPhone 12 viewport: 390×844)

### Run Single Browser
```bash
npx playwright test --project=chromium       # Desktop Chrome
npx playwright test --project=firefox        # Desktop Firefox
npx playwright test --project=webkit         # Desktop Safari
npx playwright test --project="Mobile Chrome" # Mobile Chrome
npx playwright test --project="Mobile Safari" # Mobile Safari
```

---

## Test Reports

### HTML Report
After running tests:
```bash
npx playwright show-report
```

Opens interactive HTML report showing:
- Pass/fail status per test
- Execution time
- Screenshots on failure
- Trace files (on retry)
- Video recordings (on failure in CI)

### CI Mode Reports
In CI environment (GitHub Actions):
- Retries failed tests up to 2 times
- Captures video on failure
- Uploads artifacts to GitHub

---

## Common Test Patterns

### 1. Role-Based Access Testing
```typescript
test('should allow Admin to access monitoring', async ({ page }) => {
  await setupMockApi(page, 'admin');
  await quickLogin(page, testUsers.admin);
  await page.goto('/monitoring');
  expect(page.locator('h1:has-text("Monitoring")')).toBeVisible();
});

test('should redirect Worker from monitoring page', async ({ page }) => {
  await setupMockApi(page, 'worker');
  await quickLogin(page, testUsers.worker);
  await page.goto('/monitoring');
  await page.waitForTimeout(2000);
  expect(page.url()).toContain('/dashboard'); // Redirected
});
```

### 2. Filter Testing
```typescript
test('should filter by area', async ({ page }) => {
  const areaFilter = page.locator('select[label*="Area"]');
  await areaFilter.selectOption('Taman Bungkul');
  await page.waitForTimeout(1000);
  // Verify filtered results
});
```

### 3. Form Validation
```typescript
test('should validate required fields', async ({ page }) => {
  await page.goto('/schedules/new');
  await page.click('button[type="submit"]'); // Submit empty form
  expect(page.locator('text=/wajib|required/i')).toBeVisible();
});
```

### 4. Modal Interactions
```typescript
test('should show delete confirmation', async ({ page }) => {
  await page.click('button:has-text("Hapus")');
  expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.click('button:has-text("Batal")'); // Cancel
  expect(page.locator('[role="dialog"]')).not.toBeVisible();
});
```

### 5. Responsive Design
```typescript
test('should work on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  // Test mobile-specific behavior
  const scrollWidth = await page.evaluate(() =>
    document.documentElement.scrollWidth
  );
  expect(scrollWidth).toBeLessThanOrEqual(400);
});
```

---

## Debugging Failed Tests

### 1. Check Test Output
```bash
npm run test:e2e
# Review console output for errors
```

### 2. View HTML Report
```bash
npx playwright show-report
# Click on failed test to see details
```

### 3. Run Single Test in Debug Mode
```bash
npx playwright test 07-schedules --debug
# Opens Inspector, step through test
```

### 4. Check Screenshots
Failed tests automatically capture screenshots:
```
test-results/
  07-schedules-should-display-schedules-list-page-chromium/
    test-failed-1.png
```

### 5. View Trace
If test was retried, trace file is available:
```bash
npx playwright show-trace test-results/.../trace.zip
```

---

## Known Issues and Workarounds

### 1. Timeout Errors
**Symptom:** Test times out after 30 seconds
**Solution:** Increase timeout in test or config
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... test code
});
```

### 2. Flaky Tests
**Symptom:** Test passes sometimes, fails other times
**Solution:** Add explicit waits
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Wait for dynamic content
```

### 3. Mock API Issues
**Symptom:** Tests fail with 404 or unexpected responses
**Solution:** Check mock route patterns
```typescript
// Ensure route pattern matches
await page.route('**/api/v1/schedules', async (route) => {
  // Check if pattern matches your API calls
});
```

### 4. Selector Not Found
**Symptom:** `Locator not found` errors
**Solution:** Use more flexible selectors
```typescript
// Instead of exact text
const button = page.locator('button:has-text("Simpan")');

// Use flexible pattern
const button = page.locator('button').filter({ hasText: /Simpan|Save/i });
```

---

## Performance Considerations

### Test Execution Time
- **Single browser:** ~5-8 minutes
- **All browsers:** ~15-20 minutes
- **UI mode:** Variable (watch mode)

### Optimization Tips
1. Run on single browser during development
2. Use `quickLogin()` instead of full login flow
3. Skip unnecessary waits
4. Use `page.waitForLoadState('domcontentloaded')` instead of `'networkidle'` when possible

---

## CI/CD Integration

### GitHub Actions
Tests automatically run on:
- Push to main branch
- Pull requests
- Manual trigger

**Configuration:** `.github/workflows/web-ci-cd.yml`

**Environment:**
```yaml
- run: npm run test:e2e
  env:
    CI: true
    USE_REAL_API: false  # Use mocks in CI
```

---

## Maintenance Checklist

### When Adding New Features
- [ ] Add mock data to `mock-api.ts`
- [ ] Create route handlers for new endpoints
- [ ] Write E2E tests following existing patterns
- [ ] Test on multiple browsers
- [ ] Update documentation

### When Updating UI
- [ ] Update test selectors if text/IDs changed
- [ ] Verify responsive design tests still pass
- [ ] Check accessibility tests
- [ ] Re-run full test suite

### Weekly Maintenance
- [ ] Run full test suite
- [ ] Review and fix flaky tests
- [ ] Update mock data dates if time-sensitive
- [ ] Check for new Playwright version

---

## Resources

### Documentation
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [SEKAR Web CLAUDE.md](/fe/web/CLAUDE.md)

### Useful Commands
```bash
# Generate new test
npx playwright codegen http://localhost:3001

# Update snapshots
npx playwright test --update-snapshots

# List all tests
npx playwright test --list

# Run tests matching pattern
npx playwright test -g "should filter"
```

---

**Last Updated:** February 3, 2026
**Status:** ✅ All tests passing with mock API
**Next:** Manual testing with real backend
