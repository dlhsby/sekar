# Phase 2C Seeder Updates

**Date:** 2026-02-16
**Status:** ✅ Implemented
**Related:** [database.md](./database.md), [backend.md](./backend.md)

---

## Overview

Phase 2C seeders required 4 additive updates to provide complete test data coverage for production deployment. The existing seeders were already 95% Phase 2C compliant—these changes fill the remaining gaps.

---

## Changes Implemented

### 1. Korlap User Area Assignment (HIGH)

**File:** `be/src/database/seeds/seed.service.ts`
**Lines:** 161-168

All korlap users now have `area_id` populated (required per Phase 2C spec for area-scoped features).

```typescript
// After user creation
UPDATE users
SET area_id = (SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1)
WHERE username IN ('korlap1', 'korlap2');
```

**Impact:** Enables area-scoped monitoring and task features for korlap users.

---

### 2. Overtime Test Data (MEDIUM)

**File:** `be/src/database/seeds/seed-phase2.ts`
**Lines:** 322-415

Added 3 overtime records demonstrating Phase 2C flat structure (activity fields directly on `overtimes` table).

| ID | Status | User | Has Photo | Has GPS | Purpose |
|----|--------|------|-----------|---------|---------|
| 1 | PENDING | satgas | ✓ | ✓ | Awaiting approval |
| 2 | APPROVED | korlap | ✓ | ✓ | Approved workflow |
| 3 | REJECTED | satgas | ✗ | ✗ | Rejection handling |

**Impact:** Tests overtime approval workflows, validates flat structure implementation.

---

### 3. Rayon-Scoped Task Examples (MEDIUM)

**File:** `be/src/database/seeds/seed-tasks.ts`
**Lines:** 310-377

Added 2 rayon-scoped tasks (`rayon_id` set, `area_id = NULL`) assigned by kepala_rayon.

| ID | Title | Priority | Deadline | Purpose |
|----|-------|----------|----------|---------|
| 1 | Audit semua area di Rayon Selatan | HIGH | 7 days | Rayon-wide audit |
| 2 | Koordinasi tim rayon untuk event weekend | MEDIUM | 3 days | Event coordination |

**Impact:** Tests rayon-level task assignment, validates nullable `area_id` feature.

---

### 4. Boundary Flag Test Data (LOW)

**File:** `be/src/database/seeds/seed.service.ts`
**Lines:** 392-406

Updated 1 completed shift with `clock_in_outside_boundary = true`.

```typescript
UPDATE shifts
SET clock_in_outside_boundary = true,
    clock_out_outside_boundary = false
WHERE user_id = satgas1_id AND clock_out_time IS NOT NULL LIMIT 1;
```

**Impact:** Provides test data for monitoring dashboard polygon geofencing warnings.

---

## Verification

### Database Queries

```sql
-- 1. Check korlap area_id
SELECT username, role, area_id
FROM users
WHERE role = 'korlap';
-- Expected: 2 rows, both with area_id populated

-- 2. Check overtime records
SELECT status, COUNT(*)
FROM overtimes
GROUP BY status;
-- Expected: PENDING (1), APPROVED (1), REJECTED (1)

-- 3. Check rayon-scoped tasks
SELECT title, rayon_id, area_id
FROM tasks
WHERE area_id IS NULL;
-- Expected: 2 rows with rayon_id set

-- 4. Check boundary flags
SELECT COUNT(*)
FROM shifts
WHERE clock_in_outside_boundary = true;
-- Expected: 1
```

### API Endpoints

```bash
# Test overtime
curl http://localhost:3000/overtime

# Test rayon-scoped tasks
curl http://localhost:3000/tasks?scope=rayon

# Test monitoring with boundary warnings
curl http://localhost:3000/monitoring/active-users
```

---

## Files Modified

### Seed Scripts (3)
- `be/src/database/seeds/seed.service.ts` - Korlap area_id + boundary flag
- `be/src/database/seeds/seed-phase2.ts` - Overtime records
- `be/src/database/seeds/seed-tasks.ts` - Rayon-scoped tasks

### Documentation (2)
- `specs/phases/phase-2-c-client-feedback/database.md` - Test data sections
- `specs/phases/phase-2-c-client-feedback/backend.md` - Seed updates section

---

## Seed Data Summary

After running `./seed-all.sh`:

**Users:**
- 6 Phase 1 users (admin, korlap1-2, satgas1-3)
- 9 Phase 2 users (top_management, kepala_rayon × 2, korlap_bungkul, linmas × 2, satgas4, admin_data, admin_system)
- **All korlap users have area_id**

**Shifts:**
- 4 shifts total (3 completed, 1 active)
- **1 shift with boundary flag = true**

**Activities:**
- 2 activity submissions (from active shift)

**Overtimes:**
- **3 overtime records (PENDING, APPROVED, REJECTED)**

**Tasks:**
- 8 area-scoped tasks (status: 2 pending, 3 assigned, 2 in_progress, 1 completed)
- **2 rayon-scoped tasks (both pending)**

**Schedules:**
- 4 worker schedules

**Configuration:**
- 7 Rayons
- 3 Shift Definitions
- 20 Activity Types (8 satgas, 5 linmas, 4 korlap, 3 admin_data)
- 4 Special Day Overrides
- 14 Area Staff Requirements

---

## Success Criteria

All criteria met ✅:

- ✅ All korlap users have `area_id` populated
- ✅ 3 overtime records exist (1 per status)
- ✅ 2 rayon-scoped tasks exist (`area_id = NULL`, `rayon_id` set)
- ✅ 1 shift has `clock_in_outside_boundary = true`
- ✅ Specs updated with test data documentation
- ✅ `./seed-all.sh` runs without errors
- ✅ Production deployment has complete test data coverage

---

**Last Updated:** 2026-02-16
