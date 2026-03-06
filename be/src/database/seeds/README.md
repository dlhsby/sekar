# Database Seeders

Three consolidated seeders replace the old 5-file structure.

## Files

| File | Purpose | Safe for prod? |
|------|---------|----------------|
| `seed-phase1.ts` | Wipes DB + seeds base users/areas/shifts/location logs | No (destructive) |
| `seed-phase2.ts` | Seeds Phase 2 data on top of Phase 1 (tasks, activities, monitoring) | No (destructive) |
| `seed-reference.ts` | Reference/config data only — fully idempotent | Yes |

## Scripts

```bash
# Development — full reset and reseed
npm run db:seed           # Phase 1 + Phase 2 (wipes all data first)
npm run db:seed:phase1    # Phase 1 only (wipes and seeds base data)
npm run db:seed:phase2    # Phase 2 only (run after Phase 1)
npm run db:seed:reference # Reference data only (idempotent, safe to re-run)
npm run db:reset          # Alias for db:seed

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
npm run db:seed
```

This runs Phase 1 (wipes all data + seeds 6 base users) then Phase 2 (adds 30 users, tasks, activities, monitoring).

### Full schema reset (drop + recreate)

```bash
# Via Docker (most common)
docker exec -i sekar-postgres psql -U postgres -d sekar_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

npm run migration:run
# Then start app once with synchronize to create any remaining tables
DATABASE_SYNCHRONIZE=true npm run start:dev  # Ctrl+C after startup
npm run db:seed
```

> **Note:** Some tables (notification_tokens, notifications) are created by TypeORM synchronize, not migrations. Either set `DATABASE_SYNCHRONIZE=true` in `.env` for dev, or run the app once to create them before seeding.

## What Each Seeder Creates

### seed-phase1.ts

Clears all tables (in reverse FK order) then seeds:
- 6 users: `admin`, `korlap1`, `korlap2`, `satgas1`, `satgas2`, `satgas3`
- 4 area types: park, pedestrian, mini_garden, street
- 3 areas: Taman Bungkul, Jalan Raya Darmo, Taman Harmoni (with boundary polygons)
- 5 shifts: satgas1 (completed + active), satgas2 (completed + active 4h ago), satgas3 (completed)
- 15 location logs for satgas1 → status: **active**
- 15 location logs for satgas2 (last ping 35min ago) → status: **inactive**
- 5 location logs for satgas3 (outside boundary) → status: **outside_area**

All passwords: `password123`

### seed-phase2.ts (Sections A → D)

**Section A** — Core Phase 2 data:
- 7 Rayons, 3 Shift Definitions, 20 Activity Types, 4 Special Day Overrides
- 15 new users (all 7 rayons covered), 9 Phase 2C role users
- 5 new areas (Taman Pusat, Timur 1/2, Barat 1/2)
- 29 staff requirements, 3 notification tokens
- Schedules, overtimes, Phase 2C shifts

**Section B** — Tasks:
- 8 satgas core tasks covering all 8 statuses
- 4 linmas + 3 korlap + 4 rayon-scoped tasks
- 25 extended tasks for scroll/filter testing

**Section C** — Activities:
- 12 satgas + 5 linmas + 3 korlap activities (60-day span)
- 30 extended activities for scroll testing (total: 50)

**Section D** — Monitoring (Phase 2D):
- 5 monitoring configs
- user_tracking_status backfilled for all clockable users
- Status variants: active×2, inactive×1, outside_area×1, missing×1, offline×rest

### seed-reference.ts (Production-safe)

Seeds only idempotent reference data using `ON CONFLICT DO NOTHING`:
- 4 area types, 3 shift definitions, 7 rayons, 20 activity types
- 4 special day overrides, 5 monitoring configs
- 1 default superadmin user

## Monitoring Status Test Scenarios

After `npm run db:seed`:

| User | Status | Trigger |
|------|--------|---------|
| satgas1 | active | Active shift + location ping 2min ago |
| linmas1 | active | Active shift + location ping 2min ago |
| satgas2 | inactive | Active shift + last ping 35min ago |
| satgas3 | outside_area | Active shift + location outside boundary |
| satgas_timur1_1 | missing | Active shift + no ping for 3h+ |
| All others | offline | No active shift |

## Test Users (all `password123`)

| Username | Role | Notes |
|----------|------|-------|
| admin | superadmin | Full access |
| korlap1 | korlap | Taman Bungkul |
| korlap2 | korlap | Jalan Raya Darmo |
| satgas1 | satgas | Taman Bungkul — active status |
| satgas2 | satgas | Jalan Raya Darmo — inactive status |
| satgas3 | satgas | Taman Harmoni — outside_area status |
| linmas1 | linmas | Taman Bungkul — active status |
| satgas_timur1_1 | satgas | Taman Timur 1 — missing status |
| kepala_rayon_selatan | kepala_rayon | Rayon Selatan |
| top_management1 | top_management | City-wide view |
| admin_data1 | admin_data | Data entry |
| admin_system1 | admin_system | System admin |

## Staging/Production Deployment

```bash
# First deploy
npm run migration:run:prod
npm run db:seed:prod        # Reference data + 1 superadmin only

# Subsequent deploys
npm run migration:run:prod
# Skip seeding unless new reference data was added

# Optional: seed demo data in staging
npm run db:seed:phase1:prod && npm run db:seed:phase2:prod
```
