# Phase 2C: Testing Plan

**Last Updated:** 2026-02-10
**Status:** Planning

---

## Testing Strategy

Phase 2C introduces breaking changes that require comprehensive regression testing alongside new feature tests. The testing approach follows:

1. **Role migration verification** (highest priority - blocks everything)
2. **Modified feature regression tests** (GPS removal, aktivitas, tasks)
3. **New feature tests** (overtime, task hierarchy, task tagging)
4. **E2E flow tests** (critical user journeys)

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

  // Old role names should be rejected
  it('should reject worker role');
  it('should reject supervisor role');
  it('should reject admin role');
  it('should reject koordinator_lapangan role');

  // Role-based access control
  it('should allow admin_system to manage users');
  it('should allow superadmin to manage users');
  it('should deny admin_data from managing users');
  it('should deny satgas from managing users');
});
```

### 2. GPS Boundary Removal + ClockIn Changes Tests

```typescript
describe('Shifts - Clock In (Phase 2C)', () => {
  // GPS boundary removed
  it('should allow clock-in regardless of GPS distance');
  it('should still record GPS coordinates on shift record');
  it('should still require selfie photo (base64, max 10MB)');

  // Area auto-detection (ClockInDto.area_id now OPTIONAL)
  it('should auto-detect area from WorkerSchedule (effective_date/end_date range)');
  it('should fallback to WorkerAssignment if no schedule exists');
  it('should allow clock-in with no area assigned (null area_id)');
  it('should accept explicit area_id if provided in DTO');
  it('should use WorkerSchedule.user_id (not worker_id) for schedule lookup');

  // Expanded clockable roles (was only WORKER)
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

### 3. Aktivitas Tests

```typescript
describe('Aktivitas (formerly Reports)', () => {
  // Creation
  it('should create aktivitas with max 3 photos');
  it('should reject aktivitas with more than 3 photos');
  it('should reject aktivitas with 0 photos');
  it('should require activity_type_id (NOT NULL)');
  it('should validate activity_type using applicable_roles array includes check');
  it('should reject aktivitas when user not clocked in (no active shift)');
  it('should auto-associate shift_id from active shift (shift_id already NOT NULL on entity)');
  it('should auto-associate area_id from active shift');
  it('should use worker_id column (not user_id) for report owner');

  // Access
  it('should allow satgas to view own aktivitas');
  it('should allow korlap to view area aktivitas (scoped by korlap area_id)');
  it('should allow kepala_rayon to view rayon aktivitas (scoped by rayon_id)');
  it('should deny admin_data from viewing other users aktivitas');
  it('should allow admin_system and superadmin to view all aktivitas');

  // Route backward compatibility
  it('should respond to /reports route as alias');
  it('should respond to /aktivitas route');
});
```

### 4. Task Hierarchy Tests

```typescript
describe('Task Assignment Hierarchy', () => {
  // Valid assignments
  it('should allow top_management to assign to kepala_rayon');
  it('should allow top_management to assign to korlap');
  it('should allow kepala_rayon to assign to korlap in own rayon');
  it('should allow korlap to assign to satgas in own area');
  it('should allow korlap to assign to linmas in own area');
  it('should allow admin_system to assign to kepala_rayon');
  it('should allow superadmin to assign to korlap');

  // Invalid assignments
  it('should deny satgas from creating tasks');
  it('should deny linmas from creating tasks');
  it('should deny admin_data from creating tasks');
  it('should deny korlap from assigning to kepala_rayon');
  it('should deny kepala_rayon from assigning to satgas directly');
  it('should deny kepala_rayon from assigning outside own rayon');
});
```

### 5. Task Status Simplification + Completion Tests

```typescript
describe('Task Status and Completion (Phase 2C)', () => {
  // Simplified status flow: pending → assigned → in_progress → completed
  it('should only allow 4 statuses: pending, assigned, in_progress, completed');
  it('should reject accept/decline actions (removed workflow)');
  it('should transition: pending → assigned on task creation');
  it('should transition: assigned → in_progress on worker start');
  it('should transition: in_progress → completed on completion');

  // Simplified completion DTO (GPS REMOVED, photo REQUIRED)
  it('should require description on completion (was optional)');
  it('should require completion_photo_url on completion (was optional)');
  it('should NOT require gps_lat/gps_lng on completion (removed)');
  it('should allow area_id to be null on task (rayon-scoped tasks)');
  it('should keep priority enum (low, medium, high, urgent)');
});
```

### 6. Task Tagging Tests

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

### 7. Overtime Tests

```typescript
describe('Overtime Module', () => {
  // Submission
  it('should allow satgas to submit overtime');
  it('should allow linmas to submit overtime');
  it('should deny korlap from submitting overtime');
  it('should require at least 1 aktivitas');
  it('should validate aktivitas photos max 3');
  it('should validate activity_type matches user role');
  it('should validate end_time > start_time');

  // Approval
  it('should allow korlap to approve overtime in own area');
  it('should deny korlap from approving overtime in other area');
  it('should allow korlap to reject with reason');
  it('should deny approval of already approved overtime');

  // Listing
  it('should return own overtimes for satgas/linmas');
  it('should return pending approvals for korlap (area scoped)');
  it('should return all overtimes for admin_system');
});
```

### 8. Monitoring Access Tests

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
});
```

### 9. Activity Types Tests

```typescript
describe('Activity Types by Role', () => {
  it('should return 8 satgas activity types');
  it('should return 5 linmas activity types');
  it('should return 4 korlap activity types');
  it('should return 3 admin_data activity types');
  it('should filter by role parameter');
  it('should not return soft-deleted old types');
});
```

---

## Mobile Test Plan

### Navigation Tests

```typescript
describe('Role-Based Navigation', () => {
  // Tab configuration
  it('should show 5 tabs for satgas: Home, Aktivitas, Tugas, Lembur, Profil');
  it('should show 5 tabs for linmas: Home, Aktivitas, Tugas, Lembur, Profil');
  it('should show 5 tabs for korlap: Home, Aktivitas, Tugas, Monitoring, Profil');
  it('should show 3 tabs for admin_data: Home, Aktivitas, Profil');
  it('should show 4 tabs for kepala_rayon: Home, Tugas, Monitoring, Profil');
  it('should show 3 tabs for top_management: Monitoring, Tugas, Profil');
  it('should show 3 tabs for admin_system: Monitoring, Tugas, Profil');
  it('should show 3 tabs for superadmin: Monitoring, Tugas, Profil');
});
```

### Aktivitas Submission Tests

```typescript
describe('AktivitasSubmissionScreen', () => {
  it('should enforce camera-only photo capture (no gallery)');
  it('should enforce max 3 photos');
  it('should show role-filtered activity types');
  it('should require active shift (clocked in)');
  it('should auto-capture GPS location');
  it('should follow flow: foto → jenis → deskripsi → lokasi');
  it('should disable submit until all required fields filled');
});
```

### Overtime Flow Tests

```typescript
describe('Overtime Screens', () => {
  // Submit
  it('should validate date, start/end time');
  it('should require at least 1 aktivitas');
  it('should allow adding multiple aktivitas');
  it('should enforce max 3 photos per aktivitas');

  // List
  it('should show "Pengajuan Saya" tab for satgas/linmas');
  it('should show "Menunggu Persetujuan" tab for korlap');

  // Approval
  it('should show approve/reject buttons for korlap on pending');
  it('should require reason for rejection');
  it('should update status after approval');
});
```

### Task Creation Tests

```typescript
describe('TaskCreateScreen', () => {
  it('should filter assignees by hierarchy');
  it('should allow adding tagged users');
  it('should support rayon or area scope');
  it('should validate required fields');
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
  it('should restrict korlap to monitoring/tasks/overtime');
  it('should restrict kepala_rayon to monitoring/tasks/overtime');
});
```

### Overtime Page Tests

```typescript
describe('/overtime page', () => {
  it('should display overtime data table');
  it('should filter by status');
  it('should show approve/reject actions for korlap');
  it('should scope results by user role');
  it('should open detail page on row click');
});
```

### User Form Tests

```typescript
describe('UserForm', () => {
  it('should show 8 role options');
  it('should show rayon_id field when kepala_rayon selected');
  it('should show area_id field when korlap selected');
  it('should hide rayon_id/area_id for other roles');
});
```

---

## Integration Test Plan

### E2E Flow 1: Satgas Daily Workflow
1. Login as satgas
2. Clock in (no GPS boundary check)
3. Submit aktivitas (camera → type → description → GPS)
4. View aktivitas list
5. Clock out
6. Verify shift recorded with aktivitas

### E2E Flow 2: Overtime Approval
1. Login as satgas
2. Submit overtime (date, time, 1 aktivitas with photo)
3. Login as korlap (same area)
4. View pending approvals
5. Approve overtime
6. Login as satgas, verify approved status

### E2E Flow 3: Task Assignment
1. Login as top_management
2. Create task assigned to kepala_rayon with tagged korlap
3. Login as kepala_rayon, view assigned task
4. Login as korlap, view tagged task (view only)
5. Login as kepala_rayon, complete task (description + photo)
6. Verify task status updated

### E2E Flow 4: Admin User Management
1. Login as admin_system
2. Create user with each of 8 roles
3. Verify kepala_rayon requires rayon_id
4. Verify korlap requires area_id
5. Login as each created user
6. Verify correct navigation/access per role

---

## Test Coverage Targets

| Component | Phase 2B Baseline | Phase 2C Target | Notes |
|-----------|-------------------|------------------|-------|
| Backend unit | 90.77% | >85% | May dip during new module creation, recover in Phase 6 |
| Backend integration | N/A | New | Add E2E tests for critical flows |
| Mobile unit | 80.31% | >80% | New screens need comprehensive tests |
| Mobile E2E | N/A | New | Detox tests for critical flows |
| Web unit | >80% | >80% | New pages need tests |
| Web E2E | 8 specs | 10+ specs | Add overtime + aktivitas specs |

---

## Migration Verification Queries

After role migration, run these verification queries:

```sql
-- Verify no old role names remain
SELECT role, COUNT(*) FROM users GROUP BY role;
-- Expected: only satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin

-- Verify no orphaned worker → satgas records
SELECT COUNT(*) FROM users WHERE role = 'worker'; -- Expected: 0

-- Verify users.area_id column exists (added in Migration 0)
SELECT area_id FROM users LIMIT 1; -- Should not error

-- Verify activity types using applicable_roles (TEXT[] array, NOT single role column)
SELECT unnest(applicable_roles) AS role, COUNT(*)
FROM activity_types
WHERE deleted_at IS NULL AND is_active = true
GROUP BY role;
-- Expected: satgas=8, linmas=5, korlap=4, admin_data=3

-- Verify applicable_roles uses lowercase values (not PascalCase)
SELECT id, name, applicable_roles FROM activity_types
WHERE deleted_at IS NULL AND applicable_roles && ARRAY['Worker'];
-- Expected: 0 rows (old PascalCase should be migrated)

-- Verify task_tags table created
SELECT COUNT(*) FROM task_tags; -- Should not error

-- Verify overtime tables created
SELECT COUNT(*) FROM overtimes; -- Should not error
SELECT COUNT(*) FROM overtime_aktivitas; -- Should not error

-- Verify tasks table changes
SELECT rayon_id FROM tasks LIMIT 1; -- rayon_id column exists
-- activity_type_id, completion_gps_lat, completion_gps_lng should NOT exist

-- Verify task status constraint (4 values only)
INSERT INTO tasks (id, title, status, created_by, created_at, updated_at)
VALUES (gen_random_uuid(), 'test', 'declined', gen_random_uuid(), NOW(), NOW());
-- Expected: CHECK constraint violation (declined is no longer valid)
```

---

**Last Updated:** 2026-02-10
