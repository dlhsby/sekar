# Phase 2C Migration Guide

**Migration File:** `1739390400000-Phase2CSchema.ts`
**Created:** 2026-02-11
**Related Spec:** `specs/phases/phase-2-c-client-feedback/database.md`
**Related ADRs:** ADR-009 (Role System), ADR-010 (Terminology Cleanup)

---

## Overview

This single comprehensive migration implements ALL Phase 2C database changes in one atomic transaction:

1. **Migration 0:** Role system overhaul (7 → 8 roles) + users.area_id
2. **Migration 1:** Activity types update (PascalCase → lowercase, 10 → 20 types)
3. **Migration 2:** Terminology cleanup (table/column renames, drops)
4. **Migration 3:** Tasks schema refinements (rayon-scoped, status simplification)
5. **Migration 4:** Activities table updates (multi-photo support)

---

## Pre-Migration Checklist

### 1. Backup Database

```bash
# Create backup with timestamp
docker exec sekar-postgres pg_dump -U postgres -d sekar_db > backup_phase2c_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size
ls -lh backup_phase2c_*.sql
```

### 2. Verify Current State

```bash
cd be

# Check migration status
npm run migration:show

# Expected output:
# [X] 1737000000000-InitialSchema
# [X] 1737720000000-Phase2DatabaseSchema
# [ ] 1739390400000-Phase2CSchema  <-- Should be pending
```

### 3. Review Entity Changes

**CRITICAL:** Ensure entity files match migration target state:

- [ ] `users.entity.ts` - role enum has 8 values, area_id exists
- [ ] `activity-type.entity.ts` - applicable_roles lowercase
- [ ] `shift.entity.ts` - user_id (not worker_id), boundary flags
- [ ] `report.entity.ts` → `activity.entity.ts` - renamed with photo_urls
- [ ] `worker-schedule.entity.ts` → `schedule.entity.ts` - renamed
- [ ] `location-log.entity.ts` - user_id (not worker_id)
- [ ] `task.entity.ts` - rayon_id, area_id nullable, 4 statuses
- [ ] `overtime.entity.ts` - activity columns added
- [ ] `task-tag.entity.ts` - new entity

### 4. Review Seed Data

- [ ] `seed-phase2.ts` - table references updated (schedules, activities)
- [ ] `seed-phase2.ts` - column references updated (user_id not worker_id)
- [ ] `seed-phase2.ts` - activity types use lowercase applicable_roles
- [ ] `seed-phase2.ts` - overtime seeds use flat structure (no nested aktivitas)

---

## Running the Migration

### Development Environment

```bash
cd be

# 1. Stop backend if running
# (Ctrl+C or docker-compose stop backend)

# 2. Run migration
npm run migration:run

# 3. Verify success
npm run migration:show

# Expected output:
# [X] 1737000000000-InitialSchema
# [X] 1737720000000-Phase2DatabaseSchema
# [X] 1739390400000-Phase2CSchema  <-- Now executed

# 4. Check database state
npm run db:check

# 5. Re-seed database
npm run seed

# 6. Start backend and test
npm run start:dev
```

### Production Environment

```bash
# 1. Schedule maintenance window (2-5 min downtime)

# 2. Backup database (see above)

# 3. Stop all backend instances
pm2 stop sekar-backend

# 4. Run migration
cd /var/www/sekar/be
npm run migration:run

# 5. Verify migration success
npm run migration:show
psql -U postgres -d sekar_db -c "SELECT COUNT(*) FROM activities;"  # Should show row count
psql -U postgres -d sekar_db -c "SELECT COUNT(*) FROM schedules;"  # Should show row count

# 6. Start backend
pm2 start sekar-backend

# 7. Smoke test critical endpoints
curl http://localhost:3000/api/health
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/users/me

# 8. Monitor logs for errors
pm2 logs sekar-backend --lines 100
```

---

## Post-Migration Tasks

### 1. Invalidate All Tokens (Force Re-Authentication)

```bash
# Option A: Clear refresh_tokens table (if exists)
psql -U postgres -d sekar_db -c "DELETE FROM refresh_tokens;"

# Option B: Update JWT_SECRET in .env and restart backend
# This invalidates all existing tokens
```

### 2. Populate users.area_id for Existing Korlap

```sql
-- Manual SQL to assign korlap users to areas
-- Replace with actual user IDs and area IDs
UPDATE users
SET area_id = '<area_uuid>'
WHERE role = 'korlap' AND username = 'korlap1';

-- Verify
SELECT username, role, area_id FROM users WHERE role = 'korlap';
```

### 3. Run Tests

```bash
cd be
npm test

# Focus on affected modules
npm test -- users
npm test -- shifts
npm test -- reports  # Now activities
npm test -- worker-schedules  # Now schedules
npm test -- tasks
npm test -- overtimes
```

### 4. Verify API Endpoints

Using Swagger UI (http://localhost:3000/api/docs):

- [ ] GET /api/v1/users - Returns 8-role users
- [ ] GET /api/v1/activities - Uses new table name
- [ ] GET /api/v1/schedules - Uses new table name
- [ ] GET /api/v1/tasks - Supports rayon_id, 4 statuses
- [ ] GET /api/v1/activity-types - Returns 20 types with lowercase roles
- [ ] POST /api/v1/activities - Accepts photo_urls array (max 3)
- [ ] GET /api/v1/overtimes - Shows activity columns

---

## Rollback Procedure

**WARNING:** Rollback is **partially destructive**. Some data cannot be restored:

- Dropped tables: `worker_assignments`, `overtime_aktivitas` (schema unknown)
- Dropped columns: `activities.report_type`, `activities.condition`, `activities.photo_url`, review columns
- Dropped columns: `tasks.activity_type_id`, GPS/accept/decline columns
- Users with new-only roles (`admin_data`, `admin_system`) will be deleted

### Rollback Steps

```bash
cd be

# 1. Stop backend
# (Ctrl+C or pm2 stop sekar-backend)

# 2. Revert migration
npm run migration:revert

# 3. Verify rollback
npm run migration:show

# Expected output:
# [X] 1737000000000-InitialSchema
# [X] 1737720000000-Phase2DatabaseSchema
# [ ] 1739390400000-Phase2CSchema  <-- Now reverted

# 4. Restore backup if rollback failed
docker exec sekar-postgres psql -U postgres -d sekar_db < backup_phase2c_TIMESTAMP.sql

# 5. Verify database state
psql -U postgres -d sekar_db -c "\dt"  # List tables (should show work_reports, worker_schedules)

# 6. Restart backend
npm run start:dev  # or pm2 start sekar-backend
```

---

## Common Issues & Solutions

### Issue: Migration Fails with "relation already exists"

**Cause:** Migration already partially ran or entities created tables via auto-sync.

**Solution:**
```bash
# Check which step failed by reading error message
# Manually fix the conflicting state, then re-run or skip that step
```

### Issue: Backend won't start after migration

**Error:** `QueryFailedError: column "worker_id" does not exist`

**Cause:** Entity files not updated to use new column names (user_id).

**Solution:**
```bash
# Update entity files to match migrated schema:
# - shifts.entity.ts: worker_id → user_id
# - reports/activity.entity.ts: worker_id → user_id
# - location-logs.entity.ts: worker_id → user_id
```

### Issue: Seed fails after migration

**Error:** `QueryFailedError: relation "work_reports" does not exist`

**Cause:** Seed files still reference old table names.

**Solution:**
```bash
# Update seed files:
# - worker_schedules → schedules
# - work_reports → activities
# - worker_id → user_id
```

### Issue: Tests fail with role validation errors

**Error:** `Check constraint "chk_users_role" failed`

**Cause:** Test data uses old role values (worker, supervisor, admin).

**Solution:**
```typescript
// Update test data to use new roles:
// worker → satgas
// supervisor/koordinator_lapangan → korlap
// admin → superadmin
```

---

## Migration Performance

### Expected Duration

| Environment | Records | Duration |
|-------------|---------|----------|
| Development (empty DB) | 0-1K | 5-10s |
| Staging (test data) | 1K-10K | 15-30s |
| Production (real data) | 50K-100K | 1-3min |
| Production (large) | 100K-500K | 3-5min |

### Bottlenecks

1. **Table renames** - Acquires exclusive locks, fast but blocks writes
2. **Column renames** - Similar to table renames
3. **Data migrations** - photo_url → photo_urls, role value updates
4. **Index creation** - GiST/GIN indexes on large tables

### Optimization Tips

- Schedule during low-traffic hours
- Close all open connections before migration
- Monitor `pg_stat_activity` during execution
- Use fast SSD storage for temp files

---

## Verification Queries

After migration, verify critical changes:

```sql
-- 1. Check users table
SELECT role, COUNT(*) FROM users GROUP BY role;
-- Expected: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin

SELECT COUNT(*) FROM users WHERE area_id IS NOT NULL;
-- Expected: Some korlap users have area_id

-- 2. Check renamed tables
SELECT COUNT(*) FROM activities;  -- Should match old work_reports count
SELECT COUNT(*) FROM schedules;   -- Should match old worker_schedules count

-- 3. Check activity types
SELECT code, applicable_roles FROM activity_types WHERE deleted_at IS NULL;
-- Expected: 20 types with lowercase roles

-- 4. Check tasks
SELECT status, COUNT(*) FROM tasks GROUP BY status;
-- Expected: Only pending, assigned, in_progress, completed (no accepted/declined)

SELECT COUNT(*) FROM task_tags;
-- Expected: 0 (new table, empty)

-- 5. Check activities
SELECT COUNT(*) FROM activities WHERE array_length(photo_urls, 1) > 0;
-- Expected: Migrated from photo_url column

-- 6. Check overtimes
SELECT COUNT(*) FROM overtimes WHERE activity_type_id IS NOT NULL;
-- Expected: 0 initially (new column, nullable)

-- 7. Check shifts
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN clock_in_outside_boundary THEN 1 ELSE 0 END) AS outside_boundary
FROM shifts;
-- Expected: total > 0, outside_boundary = 0 (default false)
```

---

## Additional Resources

- **Database Spec:** `specs/phases/phase-2-c-client-feedback/database.md`
- **ADR-009:** Role system overhaul rationale
- **ADR-010:** Terminology cleanup rationale
- **Entity Files:** `be/src/modules/*/entities/*.entity.ts`
- **Seed Files:** `be/src/database/seeds/`

---

**Last Updated:** 2026-02-11
**Migration Author:** Database Engineer (via Claude Code)
