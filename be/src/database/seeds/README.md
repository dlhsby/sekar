# Database Seeders

Five seed scripts cover the full Phase 1–3 dataset.

## Files

| File | Purpose | Safe for prod? |
|------|---------|----------------|
| `seed-phase1.ts` | Wipes core tables + seeds base admin/areas | No (destructive) |
| `seed-phase2.ts` | Seeds Phase 2 data on top of Phase 1 | No (destructive) |
| `seed-phase3.ts` | Seeds Phase 3 data (plant_species, monitoring_configs, service_capacity) | Yes (idempotent) |
| `seed-reference.ts` | Reference/config data only — fully idempotent | Yes |
| `seed-staging.ts` | Staging environment data | No |

## Scripts

```bash
# Development — full reset and reseed (Phase 1 + 2 + 3)
npm run db:seed

# Individual phases
npm run db:seed:phase1    # Phase 1 only (wipes and seeds base data)
npm run db:seed:phase2    # Phase 2 only (run after Phase 1)
npm run db:seed:phase3    # Phase 3 only (idempotent — safe to re-run)
npm run db:seed:reference # Reference data only (idempotent)

# Production / Staging — first deploy
npm run migration:run:prod
npm run db:seed:prod       # Seeds reference data + 1 superadmin only

# Production / Staging — subsequent deploys
npm run migration:run:prod
# Do NOT wipe data in prod! Only run db:seed:prod if new reference data was added.
```

## Dev Workflow

### Full dev reset (clean slate)

```bash
npm run migration:run   # Ensure schema is up to date
npm run db:seed         # Wipes + reseeds Phase 1 → 2 → 3
```

### Full schema reset (drop + recreate)

```bash
# Drop entire schema via Docker
docker exec -i sekar-postgres psql -U postgres -d sekar_db \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

npm run migration:run   # Recreates all tables + records migrations
npm run db:seed         # Seeds all data
```

> **Note:** All Phase 3 tables are covered by migrations. `DATABASE_SYNCHRONIZE=true` is no longer required for a fresh setup.

### Recovery: typeorm_migrations table is empty

If someone ran `db:seed` without running `migration:run` first (or the migrations table was wiped), TypeORM will try to re-run all migrations on the next `migration:run` — including non-idempotent Phase 1 migrations that fail because the tables already exist.

Fix by manually re-inserting the already-applied migration records, then running only pending migrations:

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
  console.log('Done — all 11 migrations marked as applied');
  await ds.destroy();
}).catch(e => { console.error(e.message); process.exit(1); });
"
```

After running the snippet above, `npm run migration:run` will report "No migrations are pending."

## What Each Seeder Creates

### seed-phase1.ts

Clears 21 core tables (via TRUNCATE with explicit list — `typeorm_migrations` is never touched) then seeds:
- 1 user: `admin` (superadmin)
- 4 area types: park, pedestrian, mini_garden, street
- 3 areas: Taman Bungkul, Jalan Raya Darmo, Taman Harmoni

### seed-phase2.ts (Sections A → E)

**Section A** — Core Phase 2 data:
- 7 Rayons, 3 Shift Definitions, 20 Activity Types, 4 Special Day Overrides
- ~40 users covering all 7 rayons and all 8 roles
- 10 areas (incl. Pusat, Timur 1/2, Barat 1/2, Utara, Selatan)
- Staff requirements, notification tokens, schedules, overtimes, shifts

**Section B** — Tasks:
- 8 satgas core tasks + 4 linmas + 3 korlap + 4 rayon-scoped tasks
- 25 extended tasks for scroll/filter testing

**Section C** — Activities:
- 12 satgas + 5 linmas + 3 korlap activities (60-day span)
- 30 extended activities for scroll testing (total: 50)

**Section D** — Monitoring (Phase 2D):
- 5 monitoring configs
- `user_tracking_status` backfilled for all clockable users
- Status variants: active×2, inactive×1, outside_area×1, missing×1, offline×rest

**Section E** — Phase 2E:
- `phone_number` set for all users
- `user_areas` multi-area assignments

### seed-phase3.ts (idempotent, Phase 3)

- **128 plant_species** rows (`ON CONFLICT DO NOTHING`)
- **4 monitoring_configs** (staffing_debounce_seconds, stale_status_sweep_cron, cluster_zoom_threshold, redis_stream_max_len)
- **service_capacity grid** — 7 rayons × next 12 ISO weeks × `service_type='pruning'` with `capacity_units=0`

### seed-reference.ts (Production-safe)

Seeds only idempotent reference data:
- 4 area types, 3 shift definitions, 7 rayons, 20 activity types
- 4 special day overrides, 5 monitoring configs
- 1 default superadmin user

## Test Users (all `password123`)

Login with **username** or **phone number** as identifier.

| Username | Role | Area / Rayon | Monitoring Status |
|----------|------|-------------|-------------------|
| admin | superadmin | — | — |
| admin_system1 | admin_system | — | — |
| top_management1 | top_management | — | — |
| admin_data1 | admin_data | Rayon Pusat | — |
| kepala_rayon_pusat | kepala_rayon | Rayon Pusat | — |
| kepala_rayon_selatan | kepala_rayon | Rayon Selatan | — |
| korlap_bungkul | korlap | Taman Bungkul + Jalan Raya Darmo | — |
| korlap_darmo | korlap | Jalan Raya Darmo | — |
| satgas_pusat_1 | satgas | Taman Pusat + Taman Bungkul | active |
| satgas_pusat_2 | satgas | Taman Pusat | outside_area |
| linmas_bungkul_1 | linmas | Taman Bungkul | active |
| satgas_timur1_1 | satgas | Taman Timur 1 | missing (no ping 3h+) |
| satgas_timur1_2 | satgas | Taman Timur 1 | inactive (35min ago) |

## Staging/Production Deployment

```bash
# First deploy
npm run migration:run:prod
npm run db:seed:prod        # Reference data + 1 superadmin only

# Subsequent deploys
npm run migration:run:prod
# Skip seeding unless new reference data was added

# Optional: seed demo data in staging
npm run db:seed:phase1:prod && npm run db:seed:phase2:prod && npm run db:seed:phase3:prod
```
