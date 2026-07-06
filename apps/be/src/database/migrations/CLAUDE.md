# Database Migrations - Claude Guide

## Phase 2C Migration

**File:** `1739390400000-Phase2CSchema.ts`
**Created:** 2026-02-11
**Status:** Ready for implementation

### What It Does

Single comprehensive migration implementing all Phase 2C database changes:

1. **Migration 0:** Role system (7 → 8 roles) + users.area_id
2. **Migration 1:** Activity types (lowercase, 20 types)
3. **Migration 2:** Terminology cleanup (table/column renames)
4. **Migration 3:** Tasks schema (rayon-scoped, 4 statuses)
5. **Migration 4:** Activities table (multi-photo support)

### Key Changes

**Tables Renamed:**
- `worker_schedules` → `schedules`
- `work_reports` → `activities`

**Tables Dropped:**
- `worker_assignments`
- `overtime_aktivitas`

**Columns Renamed:**
- `worker_id` → `user_id` (shifts, activities, location_logs)

**New Columns:**
- `users.area_id` (UUID FK to areas)
- `overtimes`: activity_type_id, description, photo_urls, gps_lat, gps_lng
- `shifts`: clock_in_outside_boundary, clock_out_outside_boundary
- `tasks.rayon_id` (UUID FK to rayons)
- `activities.photo_urls` (TEXT[], max 3 photos)

**Enum Changes:**
- Users role: 8 values (satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)
- TaskStatus: 4 values (pending, assigned, in_progress, completed)
- Activity types: 20 types with lowercase applicable_roles

### Before Running

1. **Update entity files** to match target schema (user_id not worker_id, new table names)
2. **Update seed files** to use new table/column names
3. **Create database backup** (`pg_dump`)
4. **Review** `PHASE2C_MIGRATION_GUIDE.md` for detailed instructions

### Quick Run (Development)

```bash
cd be
npm run migration:run
npm run seed
npm test
```

### Rollback Warning

Rollback is **partially destructive**:
- Cannot restore dropped tables (worker_assignments, overtime_aktivitas)
- Cannot restore dropped columns (report_type, condition, etc.)
- Users with new-only roles (admin_data, admin_system) will be deleted

### Resources

- **Full Guide:** `PHASE2C_MIGRATION_GUIDE.md`
- **Spec:** `specs/phases/phase-2-c-client-feedback/database.md`
- **ADRs:** ADR-009 (roles), ADR-010 (terminology)

## Phase 3 Planning (Apr 24, 2026)

Upcoming migration prefix: `17460000*-Phase3*.ts` (additive only). See `specs/phases/phase-3-plants-monitoring-rebuild/database.md`.

**New tables (8):** `plant_species`, `area_plants`, `notable_plants`, `activity_plant_items`, `pruning_requests`, `service_capacity`, `plant_seeds`, `seed_transactions`.

**Altered tables (5):**
- `activities` +custom_fields JSONB, +photo_before_url, +photo_after_url, +reference_code UNIQUE, +pruning_request_id FK
- `tasks` +task_type, +custom_fields JSONB, +parent_task_id FK, +target_plant_count, +completed_plant_count
- `users.role` enum: +`staff_kecamatan` (ADR-033). No new `admin_rayon` role.
- `location_logs` +idx (user_id, logged_at DESC), (shift_id, logged_at), (user_id, shift_id, logged_at)
- `user_tracking_status` +idx (area_id, updated_at DESC), (is_within_area, area_id)

All additive; rollback not required (flag-gated feature rollout). Related ADRs: 029–035.
