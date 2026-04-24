# Phase 2E: Testing Plan

**Last Updated:** 2026-03-10
**Status:** Not Started
**Related ADRs:** ADR-012, ADR-013, ADR-014, ADR-015
**See also:** [Backend Requirements](./backend.md), [Mobile Requirements](./mobile.md), [Web Requirements](./web.md)

---

## Testing Strategy

Phase 2E testing covers 8 feedback items across all three platforms:

1. **Backend unit tests** — Auth changes, multi-area logic, overtime flow, audit trail (highest priority)
2. **Backend integration tests** — Login flow, clock-in/out with multi-area, overtime lifecycle
3. **Mobile component tests** — Updated screens, new overtime screens, audit trail view
4. **Web E2E tests** — Playwright scenarios for login, user management, monitoring
5. **Cross-platform integration** — WebSocket events with multi-area rooms

---

## Coverage Targets

| Component | Current | Target | Notes |
|-----------|---------|--------|-------|
| Backend overall | 94.55% stmt | >90% stmt | Maintain high coverage |
| Backend branches | 83.65% | >80% | Critical for multi-area logic |
| Mobile overall | 80.31% stmt | >80% stmt | New screens need tests |
| Web overall | 96% stmt | >90% stmt | New components need tests |

---

## Backend Unit Tests

### 1. Auth Module Tests

```typescript
describe('AuthService', () => {
  describe('login()', () => {
    it('should login with username');
    it('should login with phone number');
    it('should login with phone number starting with +62');
    it('should login with phone number starting with 0');
    it('should fail with invalid identifier');
    it('should fail with wrong password');
    it('should fail for deleted user');
    it('should return JWT token with user data');
  });
});

describe('LoginDto', () => {
  it('should validate identifier is required');
  it('should validate password is required');
  it('should accept username as identifier');
  it('should accept phone number as identifier');
});
```

### 2. Users Module Tests

```typescript
describe('UsersService', () => {
  describe('phone number', () => {
    it('should create user with phone_number');
    it('should enforce phone_number uniqueness');
    it('should update phone_number');
    it('should validate Indonesian phone format');
    it('should allow null phone_number for admin_system');
  });

  describe('profile picture', () => {
    it('should upload profile picture to S3');
    it('should replace existing profile picture');
    it('should validate file type (JPEG, PNG, WebP)');
    it('should validate file size (max 5MB)');
    it('should return updated profile_picture_url');
  });
});
```

### 3. User Areas Module Tests

```typescript
describe('UserAreasService', () => {
  describe('getEffectiveAreas()', () => {
    it('should return permanent areas for korlap');
    it('should return permanent + task-based areas for satgas');
    it('should return empty for users without area assignments');
    it('should not include task-based areas from completed tasks');
    it('should include areas from in_progress tasks only');
  });

  describe('assignAreas()', () => {
    it('should assign multiple areas to korlap');
    it('should prevent duplicate assignments');
    it('should validate areas are in same rayon for korlap');
    it('should set assignment_type to permanent');
  });

  describe('syncTaskBasedAreas()', () => {
    it('should create task_based entries for active task areas');
    it('should remove task_based entries for completed tasks');
    it('should not affect permanent assignments');
  });
});
```

### 4. Shifts Module Tests

```typescript
describe('ShiftsService', () => {
  describe('clockIn() - optional selfie', () => {
    it('should clock in without selfie');
    it('should clock in with selfie');
    it('should set clock_in_photo_url to null when no selfie');
  });

  describe('clockIn() - multi-area boundary', () => {
    it('should check all effective area boundaries');
    it('should mark outside_boundary only if outside ALL areas');
    it('should handle rayon-level boundary for admin_data');
    it('should handle rayon-level boundary for kepala_rayon');
  });

  describe('clockInOvertime()', () => {
    it('should create shift with is_overtime = true');
    it('should fail if normal shift still active');
    it('should trigger status update');
    it('should work without selfie');
  });
});
```

### 5. Overtime Module Tests

```typescript
describe('OvertimeService', () => {
  describe('startOvertime()', () => {
    it('should create overtime record and shift');
    it('should link shift_id to overtime');
    it('should fail if normal shift active');
    it('should require reason');
    it('should work for all CLOCKABLE_ROLES');
    it('should fail for non-clockable roles');
  });

  describe('endOvertime()', () => {
    it('should end overtime and clock out shift');
    it('should require activity submission');
    it('should fail without activity');
    it('should update overtime status to pending_approval');
    it('should calculate duration from shift times');
  });

  describe('approval flow', () => {
    it('should maintain existing approval logic');
    it('should allow korlap to approve area overtime');
    it('should allow kepala_rayon to approve rayon overtime');
  });
});
```

### 6. Monitoring Module Tests

```typescript
describe('StatusCalculatorService - multi-area', () => {
  it('should return active when inside any effective area');
  it('should return outside_area when outside ALL effective areas');
  it('should check rayon boundary for admin_data');
  it('should check rayon boundary for kepala_rayon');
  it('should handle rayon with null boundary_polygon gracefully');
  it('should include task-based areas in boundary check');
  it('should emit correct WebSocket events on boundary crossing');
});

describe('MonitoringController - scope changes', () => {
  it('should allow admin_data to access monitoring endpoints');
  it('should scope admin_data to own rayon');
  it('should scope korlap to assigned areas (multiple)');
  it('should allow top_management to filter kepala_rayon');
});
```

### 7. Audit Module Tests

```typescript
describe('AuditLogService', () => {
  describe('log()', () => {
    it('should create audit log entry');
    it('should store old_value and new_value as JSONB');
    it('should store actor_id');
    it('should store metadata');
  });

  describe('getEntityHistory()', () => {
    it('should return logs for entity ordered by created_at');
    it('should include actor details');
    it('should filter by entity_type and entity_id');
  });
});

describe('Task audit integration', () => {
  it('should log task creation');
  it('should log status changes');
  it('should log revision requests with reason');
  it('should log verification');
});

describe('Activity audit integration', () => {
  it('should log activity creation');
  it('should log approval');
  it('should log rejection with reason');
});
```

---

## Mobile Component Tests

### 8. Login Screen Tests

```typescript
describe('LoginScreen', () => {
  it('should render identifier input (not username)');
  it('should accept phone number input');
  it('should accept username input');
  it('should show phone keyboard when phone number detected');
  it('should call login with identifier field');
  it('should show error on invalid credentials');
});
```

### 9. Clock-In/Out Screen Tests

```typescript
describe('ClockInOutScreen - optional selfie', () => {
  it('should show skip button for selfie');
  it('should allow clock-in without selfie');
  it('should allow clock-in with selfie');
  it('should proceed after skipping selfie');
});
```

### 10. Overtime Screen Tests

```typescript
describe('OvertimeClockInScreen', () => {
  it('should render overtime clock-in form');
  it('should require reason input');
  it('should show error if normal shift active');
  it('should show optional selfie');
  it('should call startOvertime API');
});

describe('OvertimeClockOutScreen', () => {
  it('should render overtime clock-out form');
  it('should require activity submission');
  it('should not allow submit without activity');
  it('should show optional selfie');
  it('should call endOvertime API');
});
```

### 11. Audit Trail Tests

```typescript
describe('AuditTrailView', () => {
  it('should render timeline with audit entries');
  it('should show actor name and timestamp');
  it('should show revision reason when present');
  it('should handle empty audit trail');
  it('should order entries chronologically');
});
```

### 12. Profile Picture Tests

```typescript
describe('Profile Picture', () => {
  it('should show upload button in profile screen');
  it('should open image picker');
  it('should upload to API and update state');
  it('should display profile picture in monitoring markers');
  it('should show default avatar when no picture');
});
```

### 13. Monitoring Filter Tests

```typescript
describe('MonitoringFilterModal - multi-area', () => {
  it('should show multi-select for korlap areas');
  it('should only show assigned areas for korlap');
  it('should show admin_data rayon-scoped filter');
  it('should apply multi-area filter');
});
```

---

## Web E2E Tests (Playwright)

### 14. Login E2E

```typescript
test.describe('Login', () => {
  test('should login with username', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="identifier"]', 'korlap1');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should login with phone number', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="identifier"]', '081234567001');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="identifier"]', 'invalid');
    await page.fill('[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error')).toBeVisible();
  });
});
```

### 15. User Management E2E

```typescript
test.describe('User Management', () => {
  test('should upload profile picture', async ({ page }) => {
    // Navigate to user edit
    // Upload image file
    // Verify preview shows
    // Save and verify URL
  });

  test('should assign multiple areas to korlap', async ({ page }) => {
    // Navigate to korlap user edit
    // Select multiple areas
    // Save
    // Verify area badges show
  });
});
```

### 16. Monitoring E2E

```typescript
test.describe('Monitoring - admin_data', () => {
  test('should access monitoring page as admin_data', async ({ page }) => {
    // Login as admin_data user
    // Navigate to monitoring
    // Verify map loads
    // Verify rayon filter is preset
  });
});
```

### 17. Audit Trail E2E

```typescript
test.describe('Audit Trail', () => {
  test('should show revision history on task detail', async ({ page }) => {
    // Navigate to task with revisions
    // Scroll to audit trail section
    // Verify timeline entries present
    // Verify revision reason shown
  });
});
```

---

## Integration Test Scenarios

### 18. Full Overtime Lifecycle

```
1. Login as satgas1
2. Clock in normal shift
3. Complete activities
4. Clock out normal shift
5. Start overtime (clock-in with reason)
6. GPS tracking during overtime
7. End overtime (clock-out + mandatory activity)
8. Verify overtime record has shift_id
9. Login as korlap1
10. Approve overtime
11. Verify audit trail shows all steps
```

### 19. Multi-Area Boundary Tracking

```
1. Assign korlap1 to Area A and Area B
2. Assign satgas1 to Area A (permanent) + task in Area B
3. Satgas1 clocks in from Area A → status: active
4. Satgas1 moves to Area B → status: active (task-based area)
5. Satgas1 moves outside both areas → status: outside_area
6. Task in Area B completes → Area B removed from effective areas
7. Satgas1 in Area B without task → status: outside_area
```

### 20. Phone Number Login Flow

```
1. Create user with phone_number
2. Login with phone_number → success
3. Login with username → success
4. Login with wrong phone → fail
5. Try creating user with duplicate phone → fail
```

---

## Seed Data for Testing

All test scenarios should use seeded data from `seed-phase2e.ts`:

- Users with phone numbers (all clockable roles)
- Multi-area assignments for korlap users
- Sample overtime records (both legacy and new flow)
- Sample audit log entries
- Profile picture URLs (placeholder images)
