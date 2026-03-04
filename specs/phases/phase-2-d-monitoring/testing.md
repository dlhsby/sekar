# Phase 2D: Testing Plan

**Last Updated:** 2026-03-03
**Status:** Planning
**Related ADR:** ADR-011 (new)
**See also:** [Backend Requirements](./backend.md), [Mobile Requirements](./mobile.md), [Web Requirements](./web.md)

---

## Testing Strategy

Phase 2D testing covers the monitoring reimplementation across all three platforms:

1. **Backend unit tests** — New services, status algorithm, cache, scheduler (highest priority)
2. **Backend integration tests** — End-to-end status update flow
3. **Mobile component tests** — New map components, detail sheet, filter modal
4. **Web E2E tests** — Playwright scenarios for monitoring page
5. **Cross-platform integration** — WebSocket event propagation

---

## Backend Unit Tests

### 1. StatusCalculatorService Tests

```typescript
describe('StatusCalculatorService', () => {
  describe('calculateStatus()', () => {
    // No active shift
    it('should return offline when no active shift and not scheduled');
    it('should return missing when no active shift but scheduled now');

    // Active shift, no GPS data
    it('should return missing when active shift but no GPS data ever');

    // Active shift, GPS age > missing threshold
    it('should return missing when GPS age exceeds missing_threshold_seconds');

    // Active shift, GPS age between inactive and missing thresholds
    it('should return inactive when GPS age between inactive and missing thresholds');

    // Active shift, GPS age <= active_max_age, inside boundary
    it('should return active when GPS fresh and inside area polygon');
    it('should return active when GPS fresh and inside area radius (no polygon)');
    it('should return active when GPS fresh and no area boundary defined');

    // Active shift, GPS age <= active_max_age, outside boundary
    it('should return outside_area when GPS fresh but outside area polygon');
    it('should return outside_area when GPS fresh but outside area radius');

    // Active shift, GPS age 5-15 min
    it('should return inactive when GPS age between active_max and inactive threshold');

    // Edge cases
    it('should use configurable thresholds from MonitoringCacheService');
    it('should handle null latitude/longitude as missing');
    it('should handle boundary_polygon with no coordinates as no boundary');
  });

  describe('recalculate()', () => {
    it('should upsert tracking status for user');
    it('should return changed=true when status changes');
    it('should return changed=false when status stays the same');
    it('should emit WebSocket event when status changes');
  });

  describe('onClockIn()', () => {
    it('should set status to active with shift and area info');
    it('should create tracking status row if not exists');
    it('should update existing tracking status row');
  });

  describe('onClockOut()', () => {
    it('should set status to offline');
    it('should clear shift_id and shift_definition_id');
  });

  describe('onLocationPing()', () => {
    it('should update last_latitude, last_longitude, last_location_at');
    it('should recalculate status based on new location');
    it('should update is_within_area based on boundary check');
    it('should emit user:left-area when transitioning from inside to outside');
    it('should emit user:entered-area when transitioning from outside to inside');
    it('should emit user:status-changed when status transitions');
    it('should update battery_level and accuracy');
  });
});
```

### 2. MonitoringSchedulerService Tests

```typescript
describe('MonitoringSchedulerService', () => {
  describe('reevaluateStaleStatuses()', () => {
    it('should find users with stale GPS data (last_location_at older than active_max_age)');
    it('should transition active users to inactive when GPS becomes stale');
    it('should transition inactive users to missing when GPS exceeds missing threshold');
    it('should not re-evaluate offline users');
    it('should process users in batches of 50');
    it('should emit status change events for each transition');
    it('should handle empty result set gracefully');
    it('should use configurable thresholds from cache');
  });
});
```

### 3. MonitoringCacheService Tests

```typescript
describe('MonitoringCacheService', () => {
  describe('getThresholds()', () => {
    it('should return cached thresholds within TTL');
    it('should fetch from database when cache expired');
    it('should return defaults when no config in database');
  });

  describe('getAreaBoundary()', () => {
    it('should return cached boundary within TTL');
    it('should fetch from database when cache expired');
    it('should handle area with no boundary');
  });

  describe('invalidateAreaBoundary()', () => {
    it('should remove area from cache');
  });

  describe('invalidateThresholds()', () => {
    it('should clear threshold cache');
  });
});
```

### 4. MonitoringConfigService Tests

```typescript
describe('MonitoringConfigService', () => {
  describe('getAll()', () => {
    it('should return all monitoring configs');
  });

  describe('getByKey()', () => {
    it('should return config by key');
    it('should throw NotFoundException for unknown key');
  });

  describe('update()', () => {
    it('should update config value with valid data');
    it('should reject invalid status_thresholds values (Zod validation)');
    it('should reject active_max_age_seconds < 60');
    it('should reject active_max_age_seconds > 600');
    it('should reject inactive_threshold_seconds < 300');
    it('should reject missing_threshold_seconds < 1800');
    it('should invalidate cache after update');
    it('should reject unknown config keys');
  });
});
```

### 5. Enhanced Monitoring Endpoints

```typescript
describe('MonitoringController', () => {
  describe('GET /monitoring/live-users', () => {
    it('should return four-status counts (total_active, total_inactive, total_outside_area, total_missing)');
    it('should include computed is_within_area (not hardcoded true)');
    it('should include shift_name from shift_definitions (not hardcoded Active Shift)');
    it('should include phone field on LiveUserDto');
    it('should filter by status query parameter');
    it('should filter by role query parameter');
    it('should filter by rayon_id');
    it('should filter by area_id');
    it('should scope korlap to own area');
    it('should scope kepala_rayon to own rayon');
    it('should allow top_management to view all');
    it('should deny satgas from accessing');
    it('should deny linmas from accessing');
  });

  describe('GET /monitoring/area/:id', () => {
    it('should return per-role staff requirement counts');
    it('should include active_count, inactive_count, outside_area_count, missing_count');
    it('should compute is_met based on active + idle counts vs required');
  });

  describe('GET /monitoring/users/:userId/location-history', () => {
    it('should return location points for a specific date');
    it('should compute is_within_area per point against area boundary');
    it('should calculate total_distance_meters between consecutive points');
    it('should calculate time_inside_area_minutes and time_outside_area_minutes');
    it('should filter by optional shift_id');
    it('should restrict to single-day queries (reject multi-day)');
    it('should scope korlap to own area users only');
    it('should return 403 when korlap accesses user in different area');
    it('should handle user with no location logs for date');
  });

  describe('GET /monitoring/users/:userId/day-summary', () => {
    it('should return user info, shift, location, activities, tasks');
    it('should compute WhatsApp links from phone number');
    it('should handle user with no active shift');
    it('should scope by role hierarchy');
  });

  describe('GET /monitoring/config', () => {
    it('should return all configs for admin_system');
    it('should return all configs for superadmin');
    it('should deny korlap from accessing');
    it('should deny kepala_rayon from accessing');
  });

  describe('PATCH /monitoring/config/:key', () => {
    it('should update valid config');
    it('should reject invalid values');
    it('should invalidate cache');
    it('should deny non-admin roles');
  });

  describe('GET /monitoring/staffing-summary', () => {
    it('should return per-role breakdown for each area/rayon');
    it('should calculate is_fully_staffed per area');
    it('should filter by rayon_id');
    it('should filter by area_id');
    it('should scope by role hierarchy');
  });
});
```

### 6. Area Boundary Endpoints

```typescript
describe('AreasController - Boundary', () => {
  describe('GET /areas/:id/boundary', () => {
    it('should return boundary_polygon GeoJSON');
    it('should return null when no polygon defined');
    it('should include radius_meters and center coords');
  });

  describe('PUT /areas/:id/boundary', () => {
    it('should update boundary_polygon with valid GeoJSON');
    it('should reject polygon with < 4 points');
    it('should reject unclosed ring');
    it('should reject coordinates outside Surabaya bounds');
    it('should auto-compute coverage_area');
    it('should invalidate monitoring cache for area');
    it('should trigger status recalculation for area users');
    it('should deny non-admin roles');
  });
});
```

### 7. GeoJSON Validator Tests

```typescript
describe('GeoJsonValidator', () => {
  describe('validatePolygon()', () => {
    it('should accept valid polygon');
    it('should reject missing type');
    it('should reject wrong type');
    it('should reject empty coordinates');
    it('should reject ring with < 4 points');
    it('should reject unclosed ring');
    it('should reject coordinates outside Surabaya bounds');
    it('should accept coordinates at Surabaya bounds edge');
  });

  describe('computeAreaSqMeters()', () => {
    it('should compute area for simple rectangle');
    it('should compute area for complex polygon');
    it('should return 0 for degenerate polygon');
  });

  describe('isClosedRing()', () => {
    it('should return true when first === last point');
    it('should return false when not closed');
  });

  describe('isWithinSurabayaBounds()', () => {
    it('should return true for Surabaya coordinates');
    it('should return false for Jakarta coordinates');
    it('should return false for negative coordinates outside range');
  });
});
```

### 8. WebSocket Gateway Tests

```typescript
describe('EventsGateway - Phase 2D', () => {
  describe('handleConnection()', () => {
    it('should auto-join city room for superadmin');
    it('should auto-join city room for admin_system');
    it('should auto-join city room for top_management');
    it('should auto-join rayon room for kepala_rayon');
    it('should auto-join area room for korlap');
    it('should NOT use PascalCase role checks (no Admin, no TopManagement)');
    it('should join personal user room');
  });

  describe('event emission', () => {
    it('should emit user:status-changed to appropriate rooms');
    it('should emit user:left-area to area and rayon rooms');
    it('should emit user:entered-area to area and rayon rooms');
    it('should include new fields in user:location event (status, is_within_area, shift_name)');
  });
});
```

### 9. Location Module Integration

```typescript
describe('LocationService - Phase 2D Integration', () => {
  describe('createBatchLogs()', () => {
    it('should trigger status recalculation after batch upload');
    it('should use latest location from batch for status update');
    it('should handle empty batch gracefully');
  });
});
```

### 10. Shifts Module Integration

```typescript
describe('ShiftsService - Phase 2D Integration', () => {
  describe('clockIn()', () => {
    it('should resolve and store shift_definition_id');
    it('should trigger StatusCalculatorService.onClockIn()');
    it('should handle null shift definition');
  });

  describe('clockOut()', () => {
    it('should trigger StatusCalculatorService.onClockOut()');
  });
});
```

---

## Backend Integration Tests

### Flow 1: Location Ping → Status Change → WebSocket

```typescript
describe('Integration: Location → Status → WebSocket', () => {
  it('should transition user from idle to active when fresh GPS ping arrives');
  it('should transition user from active to outside_area when GPS outside boundary');
  it('should broadcast user:status-changed event to area room');
  it('should update user_tracking_status table');
  it('should update live-users response counts');
});
```

### Flow 2: Clock-In → Status → Monitoring

```typescript
describe('Integration: Clock-In → Monitoring', () => {
  it('should set user status to active on clock-in');
  it('should appear in live-users response');
  it('should increment area staff count');
});
```

### Flow 3: Scheduler → Stale Status Transition

```typescript
describe('Integration: Scheduler → Status Decay', () => {
  it('should transition active user to inactive after 5 minutes without GPS');
  it('should transition inactive user to missing after 1 hour without GPS');
  it('should emit events for each transition');
});
```

---

## Mobile Component Tests

### 1. MapDashboardScreen Tests

```typescript
describe('MapDashboardScreen', () => {
  it('should render MapView with markers');
  it('should render status summary bar with four statuses');
  it('should render user list strip at bottom');
  it('should render FAB control column');
  it('should render area polygons when boundary_polygon exists');
  it('should render area circles as fallback when no polygon');
  it('should filter markers when summary chip tapped');
  it('should open filter modal when filter FAB tapped');
  it('should open user detail sheet when marker tapped');
  it('should center map on user when list card tapped');
});
```

### 2. UserMarker Tests

```typescript
describe('UserMarker', () => {
  it('should render with active status color (green)');
  it('should render with inactive status color (amber)');
  it('should render with outside_area status color (purple)');
  it('should render with missing status color (red)');
  it('should render satgas role icon');
  it('should render linmas role icon');
  it('should render korlap role icon');
  it('should show name label when showLabel is true');
  it('should hide name label when showLabel is false');
  it('should call onPress when tapped');
});
```

### 3. UserDetailSheet Tests

```typescript
describe('UserDetailSheet', () => {
  it('should display user name and role');
  it('should display shift info when shift exists');
  it('should display "No shift" when shift is null');
  it('should display last location with accuracy');
  it('should display battery level');
  it('should display activities today count');
  it('should display tasks today');
  it('should show WhatsApp button when phone exists');
  it('should hide WhatsApp button when phone is null');
  it('should open WhatsApp deeplink on tap');
  it('should show Trail button');
});
```

### 4. MonitoringFilterModal Tests

```typescript
describe('MonitoringFilterModal', () => {
  it('should render status filter chips');
  it('should render rayon select for top_management');
  it('should hide rayon select for korlap');
  it('should show fixed rayon for kepala_rayon');
  it('should cascade area options from rayon selection');
  it('should render role filter chips');
  it('should render user search input');
  it('should show staffing summary when area selected');
  it('should call onApply with selected filters');
  it('should reset all filters on reset tap');
});
```

### 5. LocationTrail Tests

```typescript
describe('LocationTrail', () => {
  it('should render polyline with location points');
  it('should render start marker at first point');
  it('should render end marker at last point');
  it('should color segments green for inside-area points');
  it('should color segments purple for outside-area points');
  it('should show summary bar with distance and time');
  it('should dismiss on close tap');
});
```

### 6. mapUtils Tests

```typescript
describe('mapUtils - Phase 2D', () => {
  describe('getStatusColor()', () => {
    it('should return green for active');
    it('should return amber for inactive');
    it('should return purple for outside_area');
    it('should return red for missing');
    it('should return gray for offline');
  });

  describe('getStatusLabel()', () => {
    it('should return "Aktif" for active');
    it('should return "Idle" for inactive');
    it('should return "Di Luar Area" for outside_area');
    it('should return "Tidak Terdeteksi" for missing');
    it('should return "Offline" for offline');
  });

  describe('getRoleIcon()', () => {
    it('should return account-circle for satgas');
    it('should return shield-account for linmas');
    it('should return star-circle for korlap');
    it('should return default for unknown role');
  });
});
```

---

## Web E2E Tests (Playwright)

### 1. Monitoring Page Load

```typescript
test.describe('Monitoring Page', () => {
  test('should load map and user markers', async ({ page }) => {
    await page.goto('/monitoring');
    await expect(page.locator('[data-testid="monitoring-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-card-active"]')).toBeVisible();
  });

  test('should display status cards with counts', async ({ page }) => {
    await page.goto('/monitoring');
    await expect(page.locator('[data-testid="status-card-active"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="status-card-idle"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="status-card-outside"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="status-card-missing"]')).toContainText(/\d+/);
  });

  test('should display user list in side panel', async ({ page }) => {
    await page.goto('/monitoring');
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-list-item"]').first()).toBeVisible();
  });
});
```

### 2. Filter Interaction

```typescript
test.describe('Monitoring Filters', () => {
  test('should filter users by status chip', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('[data-testid="status-card-active"]');
    // Verify only active users shown in list
    const users = page.locator('[data-testid="user-list-item"]');
    for (const user of await users.all()) {
      await expect(user.locator('[data-testid="status-dot"]')).toHaveClass(/active/);
    }
  });

  test('should filter by rayon select', async ({ page }) => {
    await page.goto('/monitoring');
    await page.selectOption('[data-testid="rayon-filter"]', { index: 1 });
    // Verify area select options cascade
    await expect(page.locator('[data-testid="area-filter"] option')).toHaveCount.greaterThan(1);
  });

  test('should reset filters', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('[data-testid="status-card-active"]');
    await page.click('[data-testid="filter-reset"]');
    // Verify all users visible again
  });
});
```

### 3. User Detail Panel

```typescript
test.describe('User Detail Panel', () => {
  test('should open detail panel on user click', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('[data-testid="user-list-item"]');
    await expect(page.locator('[data-testid="user-detail-panel"]')).toBeVisible();
  });

  test('should show shift info in detail panel', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('[data-testid="user-list-item"]');
    await expect(page.locator('[data-testid="shift-info"]')).toBeVisible();
  });

  test('should show WhatsApp button when phone exists', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('[data-testid="user-list-item"]');
    await expect(page.locator('[data-testid="whatsapp-btn"]')).toBeVisible();
  });

  test('should navigate to location history', async ({ page }) => {
    await page.goto('/monitoring');
    await page.click('[data-testid="user-list-item"]');
    await page.click('[data-testid="location-history-btn"]');
    await expect(page.locator('[data-testid="location-timeline"]')).toBeVisible();
  });
});
```

### 4. Responsive Layout

```typescript
test.describe('Monitoring Responsive', () => {
  test('should show side-by-side on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/monitoring');
    await expect(page.locator('[data-testid="monitoring-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="side-panel"]')).toBeVisible();
  });

  test('should stack layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/monitoring');
    await expect(page.locator('[data-testid="bottom-drawer"]')).toBeVisible();
  });
});
```

### 5. Admin Config Page

```typescript
test.describe('Monitoring Config', () => {
  test('should load config page for admin_system', async ({ page }) => {
    // Login as admin_system
    await page.goto('/monitoring/config');
    await expect(page.locator('[data-testid="config-form"]')).toBeVisible();
  });

  test('should update threshold values', async ({ page }) => {
    await page.goto('/monitoring/config');
    await page.fill('[data-testid="active-max-age"]', '600');
    await page.click('[data-testid="save-config"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  });

  test('should reject invalid values', async ({ page }) => {
    await page.goto('/monitoring/config');
    await page.fill('[data-testid="active-max-age"]', '10'); // Below minimum
    await page.click('[data-testid="save-config"]');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should deny access for non-admin roles', async ({ page }) => {
    // Login as korlap
    await page.goto('/monitoring/config');
    await expect(page).toHaveURL('/monitoring'); // Redirected
  });
});
```

---

## Test Coverage Targets

| Component | Phase 2C Baseline | Phase 2D Target | Notes |
|-----------|-------------------|------------------|-------|
| Backend unit | 89.57% stmts | >85% stmts | New services add coverage; may dip during refactor |
| Backend branch | 81.64% | >80% | Status algorithm has many branches |
| Mobile unit | 80.31% | >80% | New components need tests |
| Web E2E | ~14 specs | +8 specs | Monitoring-specific E2E tests |

### Per-Module Coverage Targets

| Module | Target | Key Metric |
|--------|--------|------------|
| `StatusCalculatorService` | >90% | Pure algorithm, high testability |
| `MonitoringSchedulerService` | >85% | Cron behavior, batch processing |
| `MonitoringCacheService` | >85% | TTL logic, invalidation |
| `MonitoringConfigService` | >80% | CRUD + Zod validation |
| `GeoJsonValidator` | >95% | Pure utility, no dependencies |
| Mobile `UserMarker` | >80% | Render variations |
| Mobile `mapUtils` | >95% | Pure functions |

---

## Test Data: Seed Scenarios

### Status Type Scenarios

```typescript
// Seed data for testing each status
const testUsers = [
  // Active: has shift, GPS < 5 min, inside area
  { username: 'test-active', role: 'satgas', hasShift: true, gpsAge: 60, insideArea: true },

  // Inactive: has shift, GPS 10 min ago
  { username: 'test-inactive', role: 'satgas', hasShift: true, gpsAge: 600, insideArea: true },

  // Outside area: has shift, GPS < 5 min, outside boundary
  { username: 'test-outside', role: 'linmas', hasShift: true, gpsAge: 120, insideArea: false },

  // Missing: scheduled but no clock-in
  { username: 'test-missing', role: 'satgas', hasShift: false, isScheduled: true },

  // Missing: has shift, GPS > 1 hour
  { username: 'test-missing-stale', role: 'korlap', hasShift: true, gpsAge: 7200 },

  // Offline: no shift, not scheduled
  { username: 'test-offline', role: 'satgas', hasShift: false, isScheduled: false },
];
```

### Area Boundary Scenarios

```typescript
const testAreas = [
  // Area with polygon boundary
  {
    name: 'Kebun Bibit',
    boundary_polygon: {
      type: 'Polygon',
      coordinates: [[[112.74, -7.28], [112.76, -7.28], [112.76, -7.30], [112.74, -7.30], [112.74, -7.28]]],
    },
  },

  // Area with radius only (no polygon)
  { name: 'Taman Bungkul', radius_meters: 200, gps_lat: -7.2916, gps_lng: 112.7385 },

  // Area with no boundary
  { name: 'Taman Flora', boundary_polygon: null, radius_meters: null },
];
```

---

## Test Commands

```bash
# Backend
cd be
npm test                          # All tests
npm run test:cov                  # With coverage
npm test -- --testPathPattern monitoring  # Monitoring module only
npm test -- --testPathPattern gps        # GpsUtil + GeoJsonValidator

# Mobile
cd fe/mobile
npm test                          # All tests
npm test -- --testPathPattern monitoring  # Monitoring components
npm test -- --testPathPattern mapUtils   # Map utilities

# Web
cd fe/web
npm run test:e2e                  # All Playwright tests
npm run test:e2e -- --grep monitoring  # Monitoring E2E only
npm run test:e2e:ui               # With Playwright UI
```

---

**Last Updated:** 2026-03-03
