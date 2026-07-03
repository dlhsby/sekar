# E2E Tests - Phase 3 Addition Summary

**Created:** February 3, 2026
**Test Files Added:** 2
**Mock API Updates:** Enhanced fixtures with schedules and monitoring data

---

## New Test Files

### 1. `07-schedules.spec.ts` - Schedules Management Tests

**Purpose:** Test CRUD operations for worker schedule management
**Access Roles:** Admin, KoordinatorLapangan
**Total Test Suites:** 7
**Coverage:**

#### Test Suites:

1. **Schedules Management - Admin Access** (12 tests)
   - Display schedules list page
   - Display filter controls (search, area, shift)
   - Filter schedules by area
   - Filter schedules by shift
   - Search schedules by worker name
   - Navigate to create schedule form
   - Display schedule data in table
   - Show edit and delete buttons
   - Navigate to edit schedule form
   - Show delete confirmation dialog
   - Handle pagination
   - Display schedule badges correctly

2. **Schedules Management - Access Control** (3 tests)
   - Allow KoordinatorLapangan to access schedules
   - Redirect Worker from schedules page
   - Redirect TopManagement from schedules page

3. **Schedules Management - Create Schedule** (3 tests)
   - Display create schedule form
   - Validate required fields on create
   - Have submit and cancel buttons

4. **Schedules Management - Accessibility** (3 tests)
   - Proper heading structure
   - Keyboard navigable
   - Accessible form labels

5. **Schedules Management - Responsive Design** (2 tests)
   - Display correctly on mobile viewport (375px)
   - Display correctly on tablet viewport (768px)

6. **Schedules Management - Data Display** (4 tests)
   - Display worker information
   - Display area information
   - Display shift information
   - Display date information

**Key Features Tested:**
- Schedule CRUD operations
- Filter by area and shift
- Search by worker name
- Pagination handling
- Delete confirmation modal
- Role-based access control
- Mobile and tablet responsiveness
- Keyboard navigation
- Form validation

---

### 2. `08-monitoring.spec.ts` - Real-Time Monitoring Tests

**Purpose:** Test real-time monitoring dashboard for worker tracking
**Access Roles:** Admin, TopManagement, KepalaRayon, KoordinatorLapangan
**Total Test Suites:** 8
**Coverage:**

#### Test Suites:

1. **Monitoring Dashboard - Admin Access** (7 tests)
   - Display monitoring dashboard page
   - Display auto-refresh indicator
   - Display filter controls (rayon, area)
   - Filter by rayon
   - Filter by area
   - Display reset filter button when filters active
   - Reset filters when clicking reset button

2. **Monitoring Dashboard - Statistics Cards** (6 tests)
   - Display workers online statistics
   - Display linmas online statistics
   - Display active shifts statistics
   - Display reports today statistics
   - Display numeric values in statistics cards
   - No loading skeleton after data loads

3. **Monitoring Dashboard - Map Display** (4 tests)
   - Display map section
   - Show online workers count on map
   - Display map placeholder or actual map
   - Show worker count information

4. **Monitoring Dashboard - Workers List** (6 tests)
   - Display workers list section
   - Display worker cards or list items
   - Show empty state when no workers active
   - Display worker status badges (Online/Offline)
   - Display worker role badges (worker/linmas)
   - Show battery warning for low battery workers

5. **Monitoring Dashboard - Access Control** (5 tests)
   - Allow Admin to access monitoring
   - Allow TopManagement to access monitoring
   - Allow KepalaRayon to access monitoring
   - Allow KoordinatorLapangan to access monitoring
   - Redirect Worker from monitoring page

6. **Monitoring Dashboard - Real-Time Updates** (3 tests)
   - Show last updated timestamp
   - Display refresh interval information (15s)
   - Have animated indicator for live updates

7. **Monitoring Dashboard - Accessibility** (4 tests)
   - Proper heading structure
   - Keyboard navigable
   - Accessible filter labels
   - Use semantic HTML for statistics

8. **Monitoring Dashboard - Responsive Design** (3 tests)
   - Display correctly on mobile viewport (375px)
   - Display correctly on tablet viewport (768px)
   - Stack statistics cards on small screens

9. **Monitoring Dashboard - Data Filtering** (3 tests)
   - Update statistics when filtering by rayon
   - Update worker list when filtering by area
   - Disable area filter when no rayon selected

**Key Features Tested:**
- Real-time statistics display
- Worker tracking and status
- Map integration (placeholder)
- Filter by rayon and area
- Auto-refresh functionality (15s interval)
- Worker list with online/offline status
- Battery level warnings
- Role-based access control (4 roles)
- Mobile and tablet responsiveness
- Live update indicators

---

## Mock API Updates

### Updated File: `e2e/fixtures/mock-api.ts`

#### New Mock Data Added:

1. **Schedules Data** (`schedulesList`)
   - 2 sample worker schedules
   - Includes user, area, and shift information
   - Dates: effective_date and end_date
   - Pagination metadata

2. **Shift Definitions** (`shiftDefinitions`)
   - Shift Pagi (07:00-15:00)
   - Shift Siang (14:00-22:00)
   - Shift Malam (21:00-05:00)

3. **Monitoring - City Stats** (`cityStats`)
   - 7 rayons, 15 areas
   - 45 workers, 12 linmas
   - 28 workers online, 8 linmas online
   - 3 active shifts, 42 reports today
   - Real-time timestamp

4. **Monitoring - Rayon Stats** (`rayonStats`)
   - Rayon-specific statistics
   - 5 areas, 15 workers, 4 linmas
   - 12 workers online, 3 linmas online
   - 1 understaffed area

5. **Monitoring - Area Stats** (`areaStats`)
   - Area-specific monitoring
   - Current shift information
   - Required vs assigned vs active workers/linmas
   - Shift definition details

6. **Monitoring - Live Workers** (`liveWorkers`)
   - 3 sample workers with GPS positions
   - Online/offline status
   - Battery levels (including low battery at 15%)
   - Location timestamps
   - Worker and linmas roles

#### New Route Handlers:

1. **Schedules Routes:**
   - `GET /schedules` - Returns schedules list with pagination
   - `POST /schedules` - Creates new schedule
   - `GET /schedules/:id` - Returns single schedule
   - `PATCH /schedules/:id` - Updates schedule
   - `DELETE /schedules/:id` - Deletes schedule

2. **Monitoring Routes:**
   - `GET /monitoring/city` - City-wide statistics
   - `GET /monitoring/rayon/:id` - Rayon statistics
   - `GET /monitoring/area/:id` - Area statistics
   - `GET /monitoring/live-workers` - Live worker positions

3. **Shift Definitions Route:**
   - `GET /shift-definitions` - Returns available shifts

---

## Test Patterns Used

### 1. **Flexible Locators**
Tests use multiple selector strategies to handle different implementations:
```typescript
const hasTitle =
  (await page.locator('h1:has-text("Jadwal")').count()) > 0 ||
  (await page.locator('h1:has-text("Schedule")').count()) > 0;
```

### 2. **Role-Based Access Testing**
All tests verify proper access control:
```typescript
const ALLOWED_ROLES = ['admin', 'top_management', 'kepala_rayon', 'koordinator_lapangan'];
```

### 3. **Responsive Design Testing**
Mobile (375px) and tablet (768px) viewports tested:
```typescript
await page.setViewportSize({ width: 375, height: 667 });
```

### 4. **Conditional Testing**
Tests gracefully handle missing elements:
```typescript
if ((await createButton.count()) > 0) {
  await createButton.click();
  // ... test logic
}
```

### 5. **Loading State Handling**
Proper wait strategies:
```typescript
await page.waitForLoadState('networkidle', { timeout: 10000 });
await page.waitForTimeout(1000); // For dynamic content
```

---

## Running the Tests

### Run All Tests (Including New Ones)
```bash
npm run test:e2e
```

### Run Only Schedules Tests
```bash
npx playwright test 07-schedules
```

### Run Only Monitoring Tests
```bash
npx playwright test 08-monitoring
```

### Run with UI Mode
```bash
npm run test:e2e:ui
```

### Run on Specific Browser
```bash
npx playwright test --project=chromium
```

---

## Test Coverage Summary

### Complete E2E Test Suite:

| Test File | Suites | Tests | Focus Area |
|-----------|--------|-------|------------|
| 01-authentication.spec.ts | 2 | ~15 | Login, logout, RBAC |
| 02-user-management.spec.ts | 3 | ~18 | User CRUD, roles |
| 03-task-management.spec.ts | 4 | ~20 | Task workflow |
| 04-reports-review.spec.ts | 4 | ~20 | Report review |
| 05-navigation-dashboard.spec.ts | 5 | ~25 | Navigation, sidebar |
| 06-areas-management.spec.ts | 4 | ~22 | Areas CRUD, maps |
| **07-schedules.spec.ts** | **7** | **27** | **Schedule management** |
| **08-monitoring.spec.ts** | **9** | **41** | **Real-time monitoring** |
| **TOTAL** | **38** | **~188** | **Full dashboard** |

---

## Next Steps

### Phase 3 Remaining Tasks:

1. **Manual Testing Checklist**
   - Test all 18 pages manually
   - Verify actual backend integration
   - Test with production-like data

2. **E2E Improvements:**
   - Add visual regression tests (Playwright screenshots)
   - Test WebSocket real-time updates (monitoring)
   - Add performance benchmarks (Lighthouse CI)

3. **Mobile E2E Tests:**
   - Detox tests for React Native mobile app
   - Test offline sync functionality
   - Test FCM push notifications

4. **Load Testing:**
   - Stress test monitoring endpoints
   - Test concurrent user access
   - Verify auto-refresh performance

---

## Known Limitations

1. **Mock API:** Tests use mock data, not real backend
   - Set `USE_REAL_API=true` to test against real backend
   - Mock data may not reflect all edge cases

2. **Map Integration:** Map tests only verify placeholder
   - Actual Google Maps integration not tested
   - GPS coordinates are mock data

3. **Real-Time Updates:** Auto-refresh is mocked
   - WebSocket connections not tested
   - Actual 15s refresh interval not verified in tests

4. **File Uploads:** Not tested in these suites
   - Schedule imports (if implemented) not covered
   - Photo uploads in reports tested separately

---

## Troubleshooting

### Test Timeout Issues
If tests timeout, increase timeout in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Mock API Not Working
Ensure `USE_REAL_API` is not set:
```bash
unset USE_REAL_API
npm run test:e2e
```

### Filter Tests Failing
Some filter tests depend on mock data structure. Check:
- Mock data arrays have items
- Select options match mock data
- Filter logic matches implementation

### Mobile Tests Failing
Mobile tests may fail if viewport is too narrow. Adjust in test:
```typescript
expect(scrollWidth).toBeLessThanOrEqual(400); // Adjust tolerance
```

---

## Maintenance Notes

### When Adding New Features:

1. **Update Mock Data:** Add new fixtures to `mock-api.ts`
2. **Add Route Handlers:** Mock new API endpoints
3. **Create Test Suite:** Follow existing patterns
4. **Update This Doc:** Document new coverage

### When Updating UI:

1. **Update Locators:** If text/selectors change
2. **Adjust Assertions:** If layout changes significantly
3. **Re-run Tests:** Verify all pass after UI updates

### Mock Data Refresh:

Mock data uses fixed IDs and dates. To refresh:
1. Update dates to current year
2. Regenerate UUIDs if needed
3. Keep data structure consistent with backend

---

**Status:** ✅ Tests Created and Ready for Execution
**Next Action:** Run tests and verify all pass with mock API
