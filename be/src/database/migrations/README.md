# Database Migrations

TypeORM migrations for SEKAR database schema changes.

---

## Quick Reference

### Current Migrations

1. **`1737006000000-AddProductionIndexesAndConstraints.ts`**
   - **Status:** Ready for Review - DO NOT RUN YET
   - **Purpose:** Production database hardening
   - **Impact:** Adds 11 indexes, 17 constraints, 6 columns to reports
   - **Duration:** 5s (dev) to 5min (1M records)
   - **See:** `MIGRATION_TESTING_GUIDE.md` for full testing instructions

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

**Last Updated:** 2026-01-16
**Maintainer:** Database Engineer
