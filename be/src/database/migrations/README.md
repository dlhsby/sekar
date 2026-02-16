# Database Migrations

TypeORM migrations for SEKAR database schema changes.

---

## Quick Reference

### Current Migrations

1. **`1737000000000-InitialSchema.ts`**
   - **Status:** Complete (Phase 1)
   - **Purpose:** Initial database schema
   - **Impact:** Creates base tables (users, areas, shifts, work_reports, location_logs)

2. **`1737720000000-Phase2DatabaseSchema.ts`**
   - **Status:** Complete (Phase 2)
   - **Purpose:** Phase 2 enhanced features
   - **Impact:** Creates 6 new tables (rayons, shift_definitions, activity_types, area_staff_requirements, worker_schedules, special_day_overrides), updates users/areas/work_reports

3. **`1739390400000-Phase2CSchema.ts`**
   - **Status:** Ready for Phase 2C Implementation
   - **Purpose:** Phase 2C role system overhaul + terminology cleanup + schema refinements
   - **Impact:**
     - Role system: 7 → 8 roles, adds users.area_id
     - Activity types: PascalCase → lowercase, 10 → 20 types
     - Terminology: 2 tables renamed (worker_schedules → schedules, work_reports → activities)
     - Terminology: 2 tables dropped (worker_assignments, overtime_aktivitas)
     - Terminology: 3 column renames (worker_id → user_id across tables)
     - Tasks: +rayon_id, area_id nullable, 6 → 4 statuses, task_tags table
     - Activities: multi-photo support, activity_type_id required
   - **Duration:** 10-30s (dev), 2-5min (production with 100k+ records)
   - **Rollback:** Partial (some dropped data cannot be restored)
   - **See:** `specs/phases/phase-2-c-client-feedback/database.md` for full spec

4. **`1737006000000-AddProductionIndexesAndConstraints.ts.disabled`**
   - **Status:** Disabled (optional production hardening)
   - **Purpose:** Production database hardening
   - **Impact:** Adds 11 indexes, 17 constraints, 6 columns to reports
   - **Duration:** 5s (dev) to 5min (1M records)

---

## Commands

```bash
# Show migration status
npm run migration:show

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate new migration (after entity changes)
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create -- -n MigrationName
```

---

## Before Running ANY Migration

1. **Backup Database**
   ```bash
   docker exec sekar-postgres pg_dump -U postgres -d sekar_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on Staging First**
   - Never run untested migrations in production
   - Create test database with production data copy

3. **Check Migration Files**
   - Review up() and down() methods
   - Verify SQL is correct
   - Check for data loss risks

---

## Migration Best Practices

### DO:
✅ Test migrations on staging with production data
✅ Create backups before running migrations
✅ Write reversible down() methods
✅ Use transactions (TypeORM default)
✅ Add helpful console.log() messages
✅ Document breaking changes

### DON'T:
❌ Run migrations directly in production without testing
❌ Forget to implement down() method
❌ Use DROP TABLE without backups
❌ Change existing migration files (create new ones instead)
❌ Mix schema and data changes in same migration

---

## File Structure

```
migrations/
├── README.md                              # This file
├── MIGRATION_TESTING_GUIDE.md             # Detailed testing procedures
├── MIGRATION_ANALYSIS.md                  # Risk assessment & concerns
└── 1737006000000-AddProductionIndexesAndConstraints.ts  # Migration file
```

---

## Migration Naming Convention

Format: `TIMESTAMP-DescriptiveName.ts`

Examples:
- `1737006000000-AddProductionIndexes.ts`
- `1737010000000-AddSoftDeleteToShifts.ts`
- `1737020000000-CreateNotificationsTable.ts`

**Timestamp:** Unix milliseconds (13 digits)
**Name:** PascalCase, descriptive, verb-first

---

## TypeORM Configuration

Migrations configured in:
- `be/src/config/database.config.ts` - Database connection
- `be/package.json` - Migration commands

**Migration Path:** `src/database/migrations/**/*.ts`

---

## Troubleshooting

### Migration Won't Run

**Error:** "No pending migrations"
**Solution:** Check if migration already ran with `npm run migration:show`

**Error:** "Query failed: syntax error"
**Solution:** Check SQL syntax in migration file

### Can't Revert Migration

**Error:** "No executed migrations"
**Solution:** Migration was never run, nothing to revert

**Error:** "Query failed during revert"
**Solution:** down() method has errors, fix and retry or restore backup

### Application Won't Start After Migration

**Error:** "Column X does not exist"
**Solution:** Entity file not updated to match schema, update entity or revert migration

**Error:** "Relation does not exist"
**Solution:** Migration partially failed, check database state manually

---

## Emergency Rollback

If migration causes critical issues:

```bash
# 1. Stop application
docker-compose stop backend

# 2. Revert migration
cd be
npm run migration:revert

# 3. Verify revert
npm run migration:show

# 4. If revert fails, restore backup
docker exec sekar-postgres psql -U postgres -d sekar_db < backup_TIMESTAMP.sql

# 5. Restart application
docker-compose start backend
```

---

## Production Deployment Checklist

Before deploying migration to production:

- [ ] Migration tested successfully on staging
- [ ] Performance benchmarks meet targets
- [ ] Rollback tested and verified
- [ ] Database backup created and verified
- [ ] Team notified of maintenance window (if needed)
- [ ] Documentation updated (API docs, schema docs)
- [ ] Monitoring alerts configured
- [ ] Post-deployment tests prepared

---

## Getting Help

**For this migration specifically:**
- Read `MIGRATION_TESTING_GUIDE.md` - Step-by-step testing
- Read `MIGRATION_ANALYSIS.md` - Risk assessment

**General migration questions:**
- TypeORM Migrations: https://typeorm.io/migrations
- Project lead: See `CLAUDE.md`
- Database specs: `/home/wahyutrip/wahyutrip/dlhsby/taman/projects/sekar/specs/database/schema.md`

---

**Last Updated:** 2026-02-11 (Added Phase 2C migration)
**Maintainer:** Database Engineer
