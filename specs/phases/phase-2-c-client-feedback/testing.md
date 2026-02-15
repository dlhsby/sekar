# Phase 2C: Testing Plan

**Last Updated:** 2026-02-11
**Status:** Spec Rewrite (Terminology Cleanup + Schema Redesign)
**Related ADR:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)

---

## Testing Strategy

Phase 2C introduces breaking changes requiring comprehensive regression testing alongside new feature tests:

1. **Role migration verification** (highest priority)
2. **Terminology cleanup regression** (renamed modules, entities, columns)
3. **Modified feature tests** (geofencing, activities, tasks)
4. **New feature tests** (overtime flat, task hierarchy, polygon geofencing)
5. **E2E flow tests** (critical user journeys)

---

## Backend Test Plan

### 1. Role Migration Tests

```typescript
describe('Role Migration', () => {
  // Authentication with all 8 new roles
  it('should authenticate satgas user');
  it('should authenticate linmas user');
  it('should authenticate korlap user');
  it('should authenticate admin_data user');
  it('should authenticate kepala_rayon user');
  it('should authenticate top_management user');
  it('should authenticate admin_system user');
  it('should authenticate superadmin user');

  // Old role names rejected
  it('should reject worker role');
  it('should reject supervisor role');
  it('should reject admin role');
  it('should reject koordinator_lapangan role');

  // RBAC
  it('should allow admin_system to manage users');
  it('should allow superadmin to manage users');
  it('should deny admin_data from managing users');
  it('should deny satgas from managing users');
});
```

### 2. Terminology Cleanup Tests

```typescript
describe('Terminology Cleanup', () => {
  // Entity renames
  it('should use Activity entity (not Report)');
  it('should use Schedule entity (not WorkerSchedule)');
  it('should not have WorkerAssignment entity');
  it('should not have OvertimeAktivitas entity');

  // Column renames
  it('shifts.user_id should reference users (not worker_id)');
  it('activities.user_id should reference users (not worker_id)');
  it('location_logs.user_id should reference users (not worker_id)');

  // Route renames
  it('GET /activities should return 200 (not /reports or /aktivitas)');
  it('GET /schedules should return 200 (not /worker-schedules)');
  it('GET /reports should return 404 (old route removed)');
  it('GET /aktivitas should return 404 (old route removed)');
  it('GET /worker-schedules should return 404 (old route removed)');
});
```

### 3. GPS Boundary + Polygon Geofencing Tests

```typescript
describe('Shifts - Clock In (Phase 2C)', () => {
  // GPS boundary removal + soft geofencing
  it('should allow clock-in regardless of GPS distance');
  it('should still record GPS coordinates on shift record');
  it('should still require selfie photo');

  // Polygon geofencing (soft warning)
  it('should set clock_in_outside_boundary=true when GPS outside area polygon');
  it('should set clock_in_outside_boundary=false when GPS inside area polygon');
  it('should fallback to radius check when no polygon defined');
  it('should set clock_in_outside_boundary=false when no boundary defined');
  it('should set clock_out_outside_boundary on clock-out');
  it('should NEVER block clock-in (soft validation only)');

  // Area auto-detection (updated: Schedule only, no WorkerAssignment fallback)
  it('should auto-detect area from Schedule (effective_date/end_date range)');
  it('should allow clock-in with no area assigned (null area_id)');
  it('should accept explicit area_id if provided in DTO');
  it('should NOT fallback to WorkerAssignment (dropped)');

  // Expanded clockable roles
  it('should allow satgas to clock in');
  it('should allow linmas to clock in');
  it('should allow korlap to clock in');
  it('should allow admin_data to clock in');
  it('should allow kepala_rayon to clock in');
  it('should deny top_management from clocking in');
  it('should deny admin_system from clocking in');
  it('should deny superadmin from clocking in');
});
```

### 4. GpsUtil Polygon Tests (NEW)

```typescript
describe('GpsUtil.isPointInPolygon()', () => {
  it('should return true for point inside simple rectangle');
  it('should return false for point outside simple rectangle');
  it('should return true for point inside complex polygon');
  it('should return false for point outside complex polygon');
  it('should handle point on polygon edge');
  it('should handle point on polygon vertex');
  it('should work with large polygons (real KMZ data)');
  it('should handle counter-clockwise winding');
});

describe('GpsUtil.isWithinAreaBoundary()', () => {
  it('should use polygon when boundary_polygon exists');
  it('should fallback to radius when no polygon');
  it('should return true when no boundary defined');
  it('should handle null area gracefully');
});
```

### 5. Activities Tests (renamed from Aktivitas/Reports)

```typescript
describe('Activities (renamed from Reports)', () => {
  // Creation
  it('should create activity with max 3 photos');
  it('should reject activity with more than 3 photos');
  it('should reject activity with 0 photos');
  it('should require activity_type_id (NOT NULL)');
  it('should validate activity_type using applicable_roles array');
  it('should reject activity when user not clocked in');
  it('should auto-associate shift_id from active shift');
  it('should use user_id column (renamed from worker_id)');

  // Access
  it('should allow satgas to view own activities');
  it('should allow korlap to view area activities (scoped)');
  it('should allow kepala_rayon to view rayon activities (scoped)');
  it('should deny admin_data from viewing other users activities');
  it('should allow admin_system and superadmin to view all activities');

  // Routes
  it('should respond to /activities route');
  it('should NOT respond to /reports route (removed)');
  it('should NOT respond to /aktivitas route (removed)');
});
```

### 6. Task Hierarchy Tests

```typescript
describe('Task Assignment Hierarchy', () => {
  it('should allow top_management to assign to kepala_rayon');
  it('should allow top_management to assign to korlap');
  it('should allow kepala_rayon to assign to korlap in own rayon');
  it('should allow korlap to assign to satgas in own area');
  it('should allow korlap to assign to linmas in own area');
  it('should allow admin_system to assign to kepala_rayon');
  it('should allow superadmin to assign to korlap');

  it('should deny satgas from creating tasks');
  it('should deny linmas from creating tasks');
  it('should deny admin_data from creating tasks');
  it('should deny korlap from assigning to kepala_rayon');
  it('should deny kepala_rayon from assigning outside own rayon');
});
```

### 7. Task Status + Completion Tests

```typescript
describe('Task Status and Completion (Phase 2C)', () => {
  it('should only allow 4 statuses: pending, assigned, in_progress, completed');
  it('should reject accept/decline actions (removed)');
  it('should transition: assigned → in_progress on start');
  it('should transition: in_progress → completed on completion');
  it('should require description on completion');
  it('should require completion_photo_url on completion');
  it('should NOT require gps_lat/gps_lng on completion');
  it('should allow area_id to be null (rayon-scoped tasks)');
});
```

### 8. Task Tagging Tests

```typescript
describe('Task Tagging', () => {
  it('should add tagged users to task');
  it('should remove tagged user from task');
  it('should list tasks where user is tagged');
  it('should allow tagged user to view task detail');
  it('should deny tagged user from completing task');
  it('should prevent duplicate tags (UNIQUE constraint)');
  it('should cascade delete tags when task deleted');
});
```

### 9. Overtime Tests (Flat Structure)

```typescript
describe('Overtime Module (Flat)', () => {
  // Submission (flat — 1 overtime = 1 activity)
  it('should allow satgas to submit overtime with activity fields');
  it('should allow linmas to submit overtime');
  it('should deny korlap from submitting overtime');
  it('should require activity_type_id (flat, not nested)');
  it('should require description');
  it('should validate 1-3 photo_urls');
  it('should validate activity_type matches user role');
  it('should validate end_time > start_time');
  it('should NOT accept nested aktivitas array (removed)');

  // Approval
  it('should allow korlap to approve overtime in own area');
  it('should deny korlap from approving overtime in other area');
  it('should allow korlap to reject with reason');
  it('should deny approval of already-approved overtime');

  // Listing
  it('should return own overtimes for satgas/linmas');
  it('should return pending approvals for korlap (area scoped)');
  it('should return all overtimes for admin_system');
});
```

### 10. Monitoring Access Tests

```typescript
describe('Monitoring Access Control', () => {
  it('should allow top_management city monitoring');
  it('should allow admin_system city monitoring');
  it('should allow superadmin city monitoring');
  it('should allow kepala_rayon own rayon monitoring');
  it('should deny kepala_rayon other rayon monitoring');
  it('should allow korlap own area monitoring');
  it('should deny korlap other area monitoring');
  it('should deny satgas from monitoring');
  it('should deny linmas from monitoring');
  it('should deny admin_data from monitoring');
  it('should include outside_boundary flag in getLiveUsers response');
});
```

### 11. Activity Types Tests

```typescript
describe('Activity Types by Role', () => {
  it('should return 8 satgas activity types');
  it('should return 5 linmas activity types');
  it('should return 4 korlap activity types');
  it('should return 3 admin_data activity types');
  it('should filter by role parameter');
  it('should not return soft-deleted old types');
  it('should use lowercase applicable_roles values');
});
```

---

## Mobile Test Plan

### Navigation Tests

```typescript
describe('Role-Based Navigation', () => {
  it('should show 5 tabs for satgas: Home, Aktivitas, Tugas, Lembur, Profil');
  it('should show 5 tabs for linmas');
  it('should show 5 tabs for korlap: Home, Aktivitas, Tugas, Lembur, Monitoring');
  it('should show 3 tabs for admin_data: Home, Aktivitas, Profil');
  it('should show 4 tabs for kepala_rayon');
  it('should show 3 tabs for top_management, admin_system, superadmin');
});
```

### Activity Submission Tests

```typescript
describe('ActivitySubmissionScreen', () => {
  it('should enforce camera-only photo capture (no gallery)');
  it('should enforce max 3 photos');
  it('should show role-filtered activity types');
  it('should require active shift (clocked in)');
  it('should follow flow: foto → jenis → deskripsi → lokasi');
});
```

### Overtime Flow Tests (Flat)

```typescript
describe('Overtime Screens (Flat)', () => {
  it('should validate date, start/end time');
  it('should require activity type and description (flat form)');
  it('should enforce 1-3 photos');
  it('should NOT show nested aktivitas add button (flat)');
  it('should show approve/reject for korlap on pending');
  it('should require reason for rejection');
});
```

### Geofencing UI Tests

```typescript
describe('Geofencing UI', () => {
  it('should show warning banner when outside area boundary');
  it('should NOT disable clock-in button when outside boundary');
  it('should show boundary warning indicator on monitoring map');
});
```

---

## Web Test Plan

### Role Access Tests

```typescript
describe('Web Role-Based Access', () => {
  it('should allow admin_system to access /users');
  it('should allow superadmin to access /settings/system');
  it('should redirect satgas from web dashboard');
  it('should redirect linmas from web dashboard');
  it('should redirect admin_data from web dashboard');
  it('should allow korlap to access /monitoring, /tasks, /overtime only');
});
```

### Activities Page Tests

```typescript
describe('/activities page', () => {
  it('should display activities data table');
  it('should NOT respond to /reports or /aktivitas routes');
  it('should show photo thumbnails (up to 3)');
  it('should scope results by user role');
});
```

### Overtime Page Tests

```typescript
describe('/overtime page', () => {
  it('should display flat overtime data (single activity per record)');
  it('should filter by status');
  it('should show approve/reject actions for korlap');
});
```

---

## Integration Test Plan

### E2E Flow 1: Satgas Daily Workflow
1. Login as satgas → Clock in (no boundary block, warning if outside)
2. Submit activity (camera → type → description → GPS)
3. View activities list → Clock out
4. Submit overtime (flat: type, description, photos)
5. View overtime list

### E2E Flow 2: Overtime Approval (Flat)
1. Login as satgas → Submit overtime (single activity, flat)
2. Login as korlap (same area) → View pending → Approve
3. Login as satgas → Verify approved status

### E2E Flow 3: Task Assignment
1. Login as top_management → Create task assigned to kepala_rayon
2. Tag korlap → Login as kepala_rayon, view assigned task
3. Login as korlap, view tagged task (view only)
4. Login as kepala_rayon, complete task (description + photo)

### E2E Flow 4: Geofencing
1. Login as satgas → Clock in from outside area polygon
2. Verify `clock_in_outside_boundary = true` on shift record
3. Login as korlap → View monitoring → Verify boundary warning indicator
4. Clock out from inside area → Verify `clock_out_outside_boundary = false`

---

## Test Coverage Targets

| Component | Phase 2B Baseline | Phase 2C Target | Notes |
|-----------|-------------------|------------------|-------|
| Backend unit | 90.77% | >85% | May dip during renames, recover in Phase 6 |
| Backend integration | N/A | New | E2E tests for critical flows |
| Mobile unit | 80.31% | >80% | New screens + renamed imports |
| Web E2E | 8 specs | 10+ specs | Add overtime + activities specs |

---

## Test File Renames (Backend)

All test files referencing old names need find-and-replace:

| Pattern | Replacement |
|---------|-------------|
| `worker_id` | `user_id` (in entity/DTO contexts) |
| `Report` (entity) | `Activity` |
| `WorkerSchedule` | `Schedule` |
| `WorkerAssignment` | _(remove all references)_ |
| `OvertimeAktivitas` | _(remove — merged into Overtime)_ |
| `ReportsService` | `ActivitiesService` |
| `ReportsController` | `ActivitiesController` |
| `/reports` (route) | `/activities` |
| `/aktivitas` (route) | `/activities` |
| `/worker-schedules` (route) | `/schedules` |
| `AKTIVITAS_SUBMITTERS` | `ACTIVITY_SUBMITTERS` |
| `createAktivitas` | `createActivity` |
| `findAllPaginated` (reports) | `findAllPaginated` (activities) |

---

## Migration Verification Queries

```sql
-- Verify terminology cleanup
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('worker_schedules', 'work_reports', 'worker_assignments', 'overtime_aktivitas');
-- Expected: 0 rows (all renamed or dropped)

SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('schedules', 'activities');
-- Expected: 2 rows

-- Verify column renames
SELECT column_name FROM information_schema.columns
WHERE table_name = 'shifts' AND column_name = 'user_id';
-- Expected: 1 row (renamed from worker_id)

-- Verify boundary columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'shifts' AND column_name LIKE 'clock_%_outside_boundary';
-- Expected: 2 rows

-- Verify overtime has flat activity columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'overtimes' AND column_name IN ('activity_type_id', 'description', 'photo_urls');
-- Expected: 3 rows

-- Verify no old role names
SELECT role, COUNT(*) FROM users GROUP BY role;
-- Expected: only satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin
```

---

## Test Data Standards (Phase 2C)

### Role Values in Tests

**CRITICAL:** Always use Phase 2C role values in all test data and mocks.

**Correct Role Values:**

```typescript
// ✅ CORRECT - Phase 2C roles
const mockUser = {
  id: 1,
  username: 'test-satgas',
  role: 'satgas' as const,  // Field worker (was 'worker')
};

const mockKorlap = {
  id: 2,
  username: 'test-korlap',
  role: 'korlap' as const,  // Field coordinator (was 'supervisor')
};

const mockAdmin = {
  id: 3,
  username: 'test-admin',
  role: 'admin_system' as const,  // System admin (was 'admin')
};
```

**Incorrect (Old) Values:**

```typescript
// ❌ WRONG - Old Phase 2 roles (backend will reject with 400 validation error)
const mockUser = {
  id: 1,
  username: 'test-worker',
  role: 'worker',  // NO LONGER VALID
};

const mockSupervisor = {
  id: 2,
  username: 'test-supervisor',
  role: 'supervisor',  // NO LONGER VALID
};
```

### Role Mapping Reference

| Old Role (Phase 2B) | New Role (Phase 2C) | Description |
|---------------------|---------------------|-------------|
| `worker` | `satgas` | Field worker (DLH organizational term) |
| `supervisor` | `korlap` | Field coordinator (shortened) |
| `admin` | `admin_system` or `superadmin` | System administrator (split) |
| `koordinator_lapangan` | `korlap` | Field coordinator (shortened) |
| (new) | `linmas` | Security officer |
| (new) | `admin_data` | Data administrator |
| (existing) | `kepala_rayon` | Rayon manager |
| (existing) | `top_management` | City-wide management |

### Helper Functions for Tests

Import from `constants/roles.ts` (mobile) or `constants/role-groups.ts` (backend):

```typescript
import { isClockableRole, canSubmitActivities, canCreateTasks } from '../../constants/roles';

// Use in test assertions
expect(isClockableRole('satgas')).toBe(true);
expect(isClockableRole('top_management')).toBe(false);
expect(canSubmitActivities('korlap')).toBe(true);
expect(canCreateTasks('satgas')).toBe(false);
```

### Common Test Scenarios

**Clockable vs Non-Clockable Roles:**

```typescript
// Clockable roles (can clock in/out, have shifts, assigned areas)
const clockableRoles = ['satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon'];

// Non-clockable roles (monitoring only, no shifts)
const nonClockableRoles = ['top_management', 'admin_system', 'superadmin'];

// Test pattern
it('should fetch assigned area for clockable users', () => {
  const user = { role: 'satgas' };  // Use clockable role
  // ... test area fetching
});

it('should not fetch assigned area for non-clockable users', () => {
  const user = { role: 'top_management' };  // Use non-clockable role
  // ... verify no area fetch
});
```

### Validation Rules

**Backend will reject old role values with 400 errors:**
- Authentication endpoints validate against 8-role enum
- All DTOs with role fields use enum validation
- Database foreign key constraints enforce valid roles
- Seed data uses only Phase 2C role values

**Test failure indicators:**
- `400 Bad Request` with validation error → Check role values in test data
- `Cannot find role 'worker'` error → Update to 'satgas'
- Enum mismatch errors → Verify `as const` type assertion used

### Migration Checklist for Test Files

When updating test files:
- [ ] Replace `'worker'` with `'satgas'`
- [ ] Replace `'supervisor'` with `'korlap'`
- [ ] Replace `'admin'` with `'admin_system'` or `'superadmin'`
- [ ] Use `as const` for type safety
- [ ] Update test descriptions to use new terminology
- [ ] Verify helper functions used instead of hardcoded role checks
- [ ] Check array fields (e.g., `target_roles: ['satgas', 'linmas']`)

---

**Last Updated:** 2026-02-15
