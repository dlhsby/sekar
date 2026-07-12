# Database Seeders

## Structure (per-entity refactor, 2026-07)

The team no longer works in "phases". The local dev seed is being reorganised from
per-phase files into **per-entity** modules:

- **`lib/`** — shared plumbing: `context.ts` (`SeedContext` + `runProfile`/`runProfileCli`, owns the
  DataSource/queryRunner lifecycle), `ids.ts` (cross-file deterministic UUIDs), `truncate.ts` (the one
  canonical child-first truncate order).
- **`entities/<table>.ts`** — one `seedX(ctx)` per table (rayon, area, user, task, …). Reference tables
  and demo transaction/plant data all live here.
- **`profiles/<name>.ts`** — orchestrators that compose the entities. `profiles/demo.ts` is the full
  local `db:seed` (destructive: truncate + every entity in FK order).

**Migration status:** COMPLETE — every profile (`demo` / `staging` / `production` / `reference`) is now a
`profiles/*.ts` orchestrator composing the shared `entities/*.ts`, with mode-specific behaviour selected by
`ctx.mode`. The old per-phase / per-mode seeder files are gone. Parity was verified table-by-table against
the pre-refactor seeders (demo, staging, reference).

## Files

| File | Purpose | Safe for prod? |
|------|---------|----------------|
| `profiles/demo.ts` | Local `db:seed` — truncate + full dev dataset (incl. demo transaction + plant data) | No (destructive) |
| `profiles/staging.ts` | Staging/UAT — truncate + real roster from `data/users.csv`, 937 KMZ locations, all-area staffing, materialised daily roster, Phase-3 reference | No |
| `profiles/reference.ts` | Reference/config only — idempotent upsert (128 plant_species, monitoring_configs, capacity grid) | Yes |
| `profiles/production.ts` | Production cold-start — idempotent upsert (rayons, shifts, kecamatans, 2 admins; passwords from env) | Yes |
| `entities/*.ts` | One `seedX(ctx)` per table; `ctx.mode` branches where demo/staging/reference diverge | — |
| `seed-monitoring-demo.ts` · `seed-loadtest.ts` · `db-fix-orphans.ts` | Standalone dev/ops utilities (unchanged) | — |

## Scripts

```bash
# Development — full reset and reseed (per-entity demo profile)
npm run db:seed

# Reference / staging / production
npm run db:seed:reference  # Reference data only (idempotent)
npm run db:seed:staging    # Staging/UAT (destructive; real roster from data/users.csv)

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
npm run db:seed         # Wipes + reseeds the full dev dataset (profiles/demo.ts)
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
- 3 locations: Taman Bungkul, Jalan Raya Darmo, Taman Harmoni

### seed-phase2.ts (Sections A → E)

**Section A** — Core Phase 2 data:
- 7 Rayons, 3 Shift Definitions, 20 Activity Types, 4 Special Day Overrides
- ~40 users covering all 7 rayons and all 8 roles
- 10 locations (incl. Pusat, Timur 1/2, Barat 1/2, Utara, Selatan)
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
- `user_locations` multi-area assignments

### seed-phase3.ts (idempotent, Phase 3)

- **128 plant_species** rows (`ON CONFLICT DO NOTHING`)
- **4 monitoring_configs** (staffing_debounce_seconds, stale_status_sweep_cron, cluster_zoom_threshold, redis_stream_max_len)
- **service_capacity grid** — 7 rayons × next 12 ISO weeks × `service_type='pruning'` with `capacity_units=0`

### seed-reference.ts (Production-safe)

Seeds only idempotent reference data:
- 4 area types, 3 shift definitions, 7 rayons, 20 activity types
- 4 special day overrides, 5 monitoring configs (Phase 2D)
- 4 monitoring configs (Phase 3 — plants/capacity/pruning/seeds)
- 128 plant_species (Phase 3, from CSV catalog)
- service_capacity grid (Phase 3, 7 rayons × 12 ISO weeks, capacity_units=0 — admins set per-rayon)
- 1 default superadmin user

> Phase 3 reference inserts run only if the `plant_species` table exists, so it's safe to call `db:seed:prod` against a database where Phase 3 migrations haven't been applied yet — those steps log a warning and skip.

## Test Users (all `12345678`)

Login with **username** or **phone number** as identifier.

| Username | Role | Area / Rayon | Monitoring Status |
|----------|------|-------------|-------------------|
| admin | superadmin | — | — |
| admin_system_1 | admin_system | — | — |
| top_management_1 | top_management | — | — |
| admin_data_pusat_1 | admin_data | Rayon Pusat | — |
| kepala_rayon_pusat_1 | kepala_rayon | Rayon Pusat | — |
| kepala_rayon_selatan_1 | kepala_rayon | Rayon Selatan | — |
| korlap_pusat_1 | korlap | Taman Bungkul + Jalan Raya Darmo | — |
| korlap_pusat_2 | korlap | Jalan Raya Darmo | — |
| satgas_pusat_1 | satgas | Taman Pusat + Taman Bungkul | active |
| satgas_pusat_2 | satgas | Taman Pusat | outside_area |
| linmas_pusat_1 | linmas | Taman Bungkul | active |
| satgas_timur_1_1 | satgas | Taman Timur 1 | missing (no ping 3h+) |
| satgas_timur_1_2 | satgas | Taman Timur 1 | inactive (35min ago) |
| staff_kecamatan_pusat_1 | staff_kecamatan | Rayon Pusat | — (Phase 3, public intake; staging only) |

## Staging/Production Deployment

```bash
# First deploy
npm run migration:run:prod
npm run db:seed:prod        # Reference data + 1 superadmin only

# Subsequent deploys
npm run migration:run:prod
# Skip seeding unless new reference data was added

# Optional: seed staging/UAT data (destructive — real roster from data/users.csv)
npm run db:seed:staging:prod
```
