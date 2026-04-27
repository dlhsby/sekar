# Database Migrations

TypeORM migrations for SEKAR database schema changes.

**Last Updated:** 2026-04-27 (Phase 3 complete)

---

## Current Migrations (11 total)

| # | File | Phase | Purpose |
|---|------|-------|---------|
| 1 | `1737000000000-InitialSchema.ts` | 1 | Base tables: users, areas, shifts, location_logs |
| 2 | `1737720000000-Phase2DatabaseSchema.ts` | 2 | Rayons, shift_definitions, activity_types, worker_schedules |
| 3 | `1739390400000-Phase2CSchema.ts` | 2C | 8-role system, terminology cleanup (activities, schedules), tasks |
| 4 | `1741000000000-Phase2DMonitoringSchema.ts` | 2D | Monitoring tables: user_tracking_status, monitoring_configs |
| 5 | `1741100000000-Phase2DGapFixes.ts` | 2D | Gap fixes and index corrections |
| 6 | `1741200000000-Phase2EClientFeedback.ts` | 2E | Client feedback II schema changes |
| 7 | `1741300000000-DropLegacyPhoneColumn.ts` | 2E | Drop legacy phone column |
| 8 | `1741400000000-FixIndexesAndConstraints.ts` | 2E | Index and constraint fixes |
| 9 | `1741500000000-AddOvertimeReason.ts` | 2E | Add reason column to overtimes |
| 10 | `17460000000000-Phase3Schema.ts` | 3 | 8 new tables (plants, pruning, seeds), activity/task/user extensions |
| 11 | `17460001000000-Phase3BackfillIndexes.ts` | 3 | CONCURRENTLY indexes on location_logs |

### Phase 3 Schema (migration #10) — new tables

| Table | Purpose |
|-------|---------|
| `plant_species` | Species catalogue (128 rows seeded) |
| `area_plants` | Species × area aggregate inventory |
| `notable_plants` | GPS-pinned landmark trees |
| `activity_plant_items` | Per-activity species × count line items |
| `pruning_requests` | Public intake workflow |
| `service_capacity` | Rayon × week × service booking model |
| `plant_seeds` | Seed/nursery stock ledger |
| `seed_transactions` | Purchase / distribution / adjustment log |

### Phase 3 Schema — altered tables

| Table | Changes |
|-------|---------|
| `activities` | +`case_type`, +`custom_fields` JSONB, +`photo_before_url`, +`photo_after_url`, +`reference_code` UNIQUE, +`pruning_request_id` FK |
| `tasks` | +`task_type`, +`custom_fields` JSONB, +`parent_task_id` FK, +`target_plant_count`, +`completed_plant_count` |
| `users.role` CHECK | Extended to include `staff_kecamatan` (9th role) |
| `user_tracking_status` | +2 indexes (area_id/updated_at, is_within_area/area_id) |

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

## Standard Dev Setup (fresh checkout)

```bash
# 1. Start infrastructure
cd infra && ./start.sh

# 2. Install + configure backend
cd be
npm install
cp .env.example .env   # Edit database credentials if needed

# 3. Run all migrations (creates all 22 tables, records in typeorm_migrations)
npm run migration:run

# 4. Seed all data
npm run db:seed        # Phase 1 → 2 → 3

# 5. Start server
npm run start:dev
```

> **Note:** `DATABASE_SYNCHRONIZE=true` is no longer required. All tables — including Phase 3 tables — are covered by migrations.

---

## Before Running ANY Migration in Production

1. **Backup database first**
   ```bash
   docker exec sekar-postgres pg_dump -U postgres -d sekar_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on staging with production data copy first**

3. **Review `up()` and `down()` methods** for data-loss risk

---

## Troubleshooting

### "No pending migrations" but tables are missing

TypeORM thinks all migrations ran (they're recorded), but a table is absent. Usually means the migration file was added after the `typeorm_migrations` row was inserted.

```bash
npm run migration:show   # See which migrations are recorded vs pending
```

### "Error: relation X already exists" on migration:run

The `typeorm_migrations` table is **empty** but the database schema already exists (common after a full `db:seed` on a previously seeded DB where the migrations table was cleared).

Repopulate `typeorm_migrations` with all already-applied migrations, then run only pending ones:

```bash
node -e "
const { DataSource } = require('typeorm');
require('dotenv').config();
const ds = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'sekar_db',
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: false,
});
ds.initialize().then(async () => {
  const migrations = [
    [1737000000000,  'InitialSchema1737000000000'],
    [1737720000000,  'Phase2DatabaseSchema1737720000000'],
    [1739390400000,  'Phase2CSchema1739390400000'],
    [1741000000000,  'Phase2DMonitoringSchema1741000000000'],
    [1741100000000,  'Phase2DGapFixes1741100000000'],
    [1741200000000,  'Phase2EClientFeedback1741200000000'],
    [1741300000000,  'DropLegacyPhoneColumn1741300000000'],
    [1741400000000,  'FixIndexesAndConstraints1741400000000'],
    [1741500000000,  'AddOvertimeReason1741500000000'],
    [17460000000000, 'Phase3Schema17460000000000'],
    [17460001000000, 'Phase3BackfillIndexes17460001000000'],
  ];
  for (const [ts, name] of migrations) {
    await ds.query('INSERT INTO typeorm_migrations (timestamp, name) VALUES (\$1, \$2) ON CONFLICT DO NOTHING', [ts, name]);
  }
  console.log('Done');
  await ds.destroy();
}).catch(e => { console.error(e.message); process.exit(1); });
"
npm run migration:run   # Now only truly pending migrations will run
```

### "No migrations were found in the database. Nothing to revert!"

Same root cause as above — `typeorm_migrations` is empty. Use the snippet above to restore migration history before reverting.

### Application won't start after migration

**"Column X does not exist"** — Entity file not updated to match schema. Update the entity or revert the migration.

**"Relation does not exist"** — Migration partially failed. Check database state manually, then restore from backup if needed.

---

## Migration Best Practices

- All new migrations must use `CREATE TABLE IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DO $$ BEGIN ... EXCEPTION WHEN ... THEN NULL; END $$` blocks to be **idempotent**
- Inline `UNIQUE (...)` in `CREATE TABLE IF NOT EXISTS` is a no-op when the table already exists — always add unique constraints as a separate idempotent `ALTER TABLE ... ADD CONSTRAINT` DO block immediately after the CREATE statement
- `CONCURRENTLY` indexes cannot run inside a transaction — put them in a separate migration file (see `Phase3BackfillIndexes`)
- Never modify existing migration files. Create a new one instead.

---

## Emergency Rollback

```bash
# 1. Stop application
docker-compose stop backend

# 2. Revert last migration
cd be && npm run migration:revert

# 3. If revert fails, restore backup
docker exec sekar-postgres psql -U postgres -d sekar_db < backup_TIMESTAMP.sql

# 4. Restart application
docker-compose start backend
```

---

## Production Deployment Checklist

- [ ] Migration tested on staging with production data copy
- [ ] `down()` rollback tested and verified
- [ ] Database backup created and verified
- [ ] `npm run migration:show` confirms correct pending migrations
- [ ] Post-deployment smoke tests prepared
