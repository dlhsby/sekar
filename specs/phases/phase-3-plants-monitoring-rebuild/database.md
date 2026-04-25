# Phase 3: Database Schema Changes

**Last Updated:** 2026-04-24
**Status:** ⏳ Not Started
**Migration Prefix:** `17460000*-Phase3*.ts` (all additive; no reverse dependencies beyond drops)
**Related ADRs:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md), [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md), [ADR-031](../../architecture/decisions/ADR-031-task-typing-custom-fields.md), [ADR-033](../../architecture/decisions/ADR-033-staff-kecamatan-role.md), [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md)
**See also:** [Backend Requirements](./backend.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| Fact | Actual Value | File |
|------|-------------|------|
| `activities` table | Phase 2C canonical work-record entity | `be/src/modules/activities/entities/activity.entity.ts` |
| `tasks` table | 8 statuses (ADR-009 debt — deferred to Phase 4); no `task_type`, no `parent_task_id`, no partial-completion columns | `be/src/modules/tasks/entities/task.entity.ts` |
| `user_tracking_status` | Indexed on PK + `(status)`, `(area_id)`, `(shift_id)` — missing composite on `(area_id, updated_at DESC)` | `be/src/modules/monitoring/entities/user-tracking-status.entity.ts` |
| `location_logs` | Range-partitioned by `logged_at` month (ADR-006); no composite indexes beyond PK | `be/src/modules/location/entities/location-log.entity.ts` |
| `users.role` enum | 8 values (ADR-009) | `be/src/modules/users/enums/role.enum.ts` |
| Migration count | 8 existing; Phase 3 adds 1 primary + optional follow-up | `be/src/database/migrations/` |

---

## Migration Overview

| # | File | Type | Scope |
|---|------|------|-------|
| 1 | `17460000000000-Phase3Schema.ts` | CREATE + ALTER | 8 new tables, 5 altered tables, enum extension, 5 new indexes |
| 2 | `17460001000000-Phase3BackfillIndexes.ts` | CREATE INDEX CONCURRENTLY | Large-table indexes built without lock (location_logs) |

All changes are **additive**. Rollback is implemented as a `down()` but is not required for production rollback — the Phase 3 feature flag (`PHASE3_FEATURES_ENABLED`) suffices.

---

## New Tables

### 1. `plant_species`

**Purpose:** Catalog of plant species covered by DLH (trees, shrubs, small plants). Populated from the 131 distinct species in the CSV historical log. `default_pruning_cycle_days` feeds [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md) forecasting.

```sql
CREATE TABLE plant_species (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_id TEXT NOT NULL,              -- Indonesian common name (raw from CSV)
    name_latin TEXT NULL,
    category TEXT NOT NULL,             -- 'tree' | 'shrub' | 'groundcover' | 'flower'
    default_pruning_cycle_days INT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_plant_species_name_id ON plant_species (name_id);
```

```typescript
@Entity('plant_species')
export class PlantSpecies {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'text' }) name_id: string;
  @Column({ type: 'text', nullable: true }) name_latin: string | null;
  @Column({ type: 'text' }) category: 'tree' | 'shrub' | 'groundcover' | 'flower';
  @Column({ type: 'int', nullable: true }) default_pruning_cycle_days: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) created_at: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updated_at: Date;
}
```

**Seed:** 131 rows from CSV column 6, deduped; `default_pruning_cycle_days = NULL` (admin fills later).

---

### 2. `area_plants`

**Purpose:** Area-aggregate plant inventory per [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md). One row per `(area_id, species_id)`; `status` computed by `PlantDueDateRecalculator` daily.

```sql
CREATE TABLE area_plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
    count INT NOT NULL DEFAULT 0,
    last_pruned_at TIMESTAMPTZ NULL,
    next_due_at TIMESTAMPTZ NULL,
    status TEXT NOT NULL DEFAULT 'ok',  -- 'ok' | 'due' | 'overdue'
    override_cycle_days INT NULL,       -- manual override of forecast
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (area_id, species_id)
);
CREATE INDEX idx_area_plants_area_status ON area_plants (area_id, status);
CREATE INDEX idx_area_plants_next_due ON area_plants (next_due_at);
```

---

### 3. `notable_plants`

**Purpose:** Optional individual records for heritage / flagged plants (per [ADR-030](../../architecture/decisions/ADR-030-area-aggregate-plant-inventory.md)). Not required for routine inventory.

```sql
CREATE TABLE notable_plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
    species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
    gps_lat NUMERIC(10, 8) NOT NULL,
    gps_lng NUMERIC(11, 8) NOT NULL,
    label TEXT NULL,
    heritage BOOLEAN NOT NULL DEFAULT FALSE,
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notable_plants_area ON notable_plants (area_id);
```

---

### 4. `activity_plant_items`

**Purpose:** Species line items attached to an activity (how many of which species were pruned / planted / watered). Replaces the rejected parallel `pruning_activities` table per ADR-010 (reuse `activities`).

```sql
CREATE TABLE activity_plant_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
    count INT NOT NULL CHECK (count > 0),
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_activity_plant_items_activity ON activity_plant_items (activity_id);
```

---

### 5. `pruning_requests`

**Purpose:** Public intake entity for kecamatan staff submissions. Replaces paper letters. Review gate uses the `PRUNING_REQUEST_REVIEWERS` role group (extended `admin_data` per [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md)).

```sql
CREATE TABLE pruning_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT UNIQUE NOT NULL,    -- e.g., 'KC-2026-0001'
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    kecamatan_name TEXT NOT NULL,
    address TEXT NOT NULL,
    gps_lat NUMERIC(10, 8) NULL,
    gps_lng NUMERIC(11, 8) NULL,
    expected_date DATE NULL,
    estimated_plant_count INT NULL,
    photo_urls TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
      -- 'submitted'|'under_review'|'approved'|'rejected'|'converted'|'in_progress'|'done'|'cancelled'
    rayon_id UUID NULL REFERENCES rayons(id) ON DELETE SET NULL,
    reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    review_notes TEXT NULL,
    converted_task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pruning_requests_status_rayon ON pruning_requests (status, rayon_id);
CREATE INDEX idx_pruning_requests_submitter ON pruning_requests (submitted_by, status);
CREATE INDEX idx_pruning_requests_ref ON pruning_requests (reference_code);
```

---

### 6. `service_capacity`

**Purpose:** Generic weekly capacity grid per rayon × ISO-week × service type. Reusable for future DLH services (watering, planting, street-sweeping once that module lands). See [ADR-035](../../architecture/decisions/ADR-035-service-capacity-model.md).

```sql
CREATE TABLE service_capacity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rayon_id UUID NOT NULL REFERENCES rayons(id) ON DELETE CASCADE,
    year INT NOT NULL,
    iso_week INT NOT NULL CHECK (iso_week BETWEEN 1 AND 53),
    service_type TEXT NOT NULL,    -- 'pruning' | 'watering' | 'planting' | ...
    capacity_units INT NOT NULL DEFAULT 0,
    booked_units INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (rayon_id, year, iso_week, service_type),
    CHECK (booked_units >= 0 AND booked_units <= capacity_units + 10)  -- +10 overbook grace
);
CREATE INDEX idx_service_capacity_rayon_week ON service_capacity (rayon_id, year, iso_week);
```

**Seed:** 7 rayons × next 12 ISO weeks × `service_type='pruning'` with `capacity_units=NULL` (admin fills).

---

### 7. `plant_seeds`

**Purpose:** Inventory master for seed stock at rayon Taman Aktif and city-wide.

```sql
CREATE TABLE plant_seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_id TEXT NOT NULL,
    species_id UUID NULL REFERENCES plant_species(id) ON DELETE SET NULL,
    unit TEXT NOT NULL CHECK (unit IN ('gram', 'piece', 'packet')),
    stock_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    last_counted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 8. `seed_transactions`

**Purpose:** Unified ledger (purchase / distribution / adjustment). Balance = `stock_qty` on `plant_seeds`, updated atomically with insert.

```sql
CREATE TABLE seed_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed_id UUID NOT NULL REFERENCES plant_seeds(id) ON DELETE RESTRICT,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase','distribution','adjustment')),
    qty NUMERIC(12, 2) NOT NULL,   -- signed by type (purchase +, distribution -, adjustment +/-)
    unit_price NUMERIC(12, 2) NULL,         -- purchase only
    supplier TEXT NULL,                     -- purchase only
    receipt_url TEXT NULL,                  -- purchase only
    to_rayon_id UUID NULL REFERENCES rayons(id) ON DELETE SET NULL,   -- distribution only
    to_area_id UUID NULL REFERENCES areas(id) ON DELETE SET NULL,     -- distribution only
    recipient_name TEXT NULL,                                         -- distribution only
    occurred_at DATE NOT NULL,
    recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_seed_tx_seed_occurred ON seed_transactions (seed_id, occurred_at DESC);
CREATE INDEX idx_seed_tx_type_occurred ON seed_transactions (transaction_type, occurred_at DESC);
```

---

## Altered Tables

### `activities` (additive)

```sql
ALTER TABLE activities
  ADD COLUMN case_type TEXT NULL,                  -- 'GT' | 'PT' | 'PS' | 'PD' | 'PK' (required when task_type='pruning')
  ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN photo_before_url TEXT NULL,
  ADD COLUMN photo_after_url TEXT NULL,
  ADD COLUMN reference_code TEXT NULL UNIQUE,
  ADD COLUMN pruning_request_id UUID NULL REFERENCES pruning_requests(id) ON DELETE SET NULL;

ALTER TABLE activities ADD CONSTRAINT chk_pruning_case_type
  CHECK (
    (custom_fields->>'task_type' <> 'pruning')
    OR (case_type IN ('GT', 'PT', 'PS', 'PD', 'PK'))
  );

CREATE INDEX idx_activities_case_type ON activities (case_type) WHERE case_type IS NOT NULL;
CREATE INDEX idx_activities_reference ON activities (reference_code) WHERE reference_code IS NOT NULL;
CREATE INDEX idx_activities_pruning_req ON activities (pruning_request_id) WHERE pruning_request_id IS NOT NULL;
```

**Pruning vocabulary (locked Apr 25, 2026 — client Q1 answer; full glossary in [README §Pruning Vocabulary](./README.md#pruning-vocabulary-q1--locked-apr-25-2026)):**

- `case_type` (column on `activities`): `GT` Giat Perantingan · `PT` Pohon Tumbang · `PS` Pohon Sempal · `PD` Pohon Doyong/Miring · `PK` Pohon Kropos/Mati. Required for pruning activities; `NULL` for other task types.
- `pruning_action` (in `custom_fields`): `PM` Pangkas Meja · `PB` Potong Bawah · `PC` Pangkas Cantik. Required for pruning.
- `source` (in `custom_fields`): `TIW` Taruna Walikota · `TS` Taruna Senior · `CC` Command Center · `PW` Permintaan Warga (paper) · `Wk` Aplikasi Wargaku. Required for pruning. Auto-populated when `pruning_request_id` is set.

**`custom_fields` JSONB shape for `task_type = 'pruning'` (per ADR-031):**

```json
{
  "task_type": "pruning",
  "pruning_action": "PC",            // PM | PB | PC (required)
  "source": "Wk",                    // TIW | TS | CC | PW | Wk (required)
  "road_context": "JT",              // JT | JH | ST (optional)
  "damage_cause": "natural_fall",    // free-text (optional)
  "notes": "..."                     // free-text (optional, used by CSV backfill for unmapped rows)
}
```

> **Migration note for existing Phase 2 activities:** Phase 2 activities pre-date this enum. They are NOT pruning activities (`task_type` defaults to `'generic'` after the migration adds the column to `tasks`), so the CHECK constraint passes with `case_type = NULL`. No backfill required.

**`reference_code` preserves CSV IDs** (`25PR0…`) and future external references (e.g., pruning_request linkage). Unique only when non-null so existing activities don't need backfill.

---

### `tasks` (additive)

```sql
ALTER TABLE tasks
  ADD COLUMN task_type TEXT NOT NULL DEFAULT 'generic',
    -- 'generic' | 'pruning' | 'watering' | 'planting' | 'removal' | 'inspection'
  ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN parent_task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN target_plant_count INT NULL,
  ADD COLUMN completed_plant_count INT NOT NULL DEFAULT 0
    CHECK (completed_plant_count >= 0);

CREATE INDEX idx_tasks_type_status ON tasks (task_type, status);
CREATE INDEX idx_tasks_parent ON tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;
```

**Validation:** Per-type `custom_fields` schema enforced by `TaskTypeRegistry` (backend), not database. See [backend.md §Task typing](./backend.md#task-typing).

---

### `users` (enum extension)

```sql
-- 9-role enum: add staff_kecamatan (per ADR-033)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff_kecamatan';
```

**No new `admin_rayon` role** — `admin_data` is capability-extended via `PRUNING_REQUEST_REVIEWERS` role group (policy, not schema) per [ADR-032](../../architecture/decisions/ADR-032-admin-data-pruning-disposition.md).

---

### `location_logs` (missing indexes)

```sql
CREATE INDEX CONCURRENTLY idx_location_logs_user_logged
  ON location_logs (user_id, logged_at DESC);
CREATE INDEX CONCURRENTLY idx_location_logs_shift_logged
  ON location_logs (shift_id, logged_at);
CREATE INDEX CONCURRENTLY idx_location_logs_user_shift_logged
  ON location_logs (user_id, shift_id, logged_at);
```

Built `CONCURRENTLY` in `17460001000000-Phase3BackfillIndexes.ts` to avoid locking the partitioned hot table.

---

### `user_tracking_status` (missing indexes)

```sql
CREATE INDEX idx_user_tracking_area_updated
  ON user_tracking_status (area_id, updated_at DESC);
CREATE INDEX idx_user_tracking_within_area
  ON user_tracking_status (is_within_area, area_id);
```

Needed for the new `getSnapshot()` query path in `MonitoringService` v2.

---

### `monitoring_configs` (new rows)

```sql
INSERT INTO monitoring_configs (key, value, description) VALUES
  ('staffing_debounce_seconds', '30'::jsonb,
   'Debounce window for AREA_STAFFING_CHANGED events to prevent GPS-flap storms'),
  ('stale_status_sweep_cron', '"*/5 * * * *"'::jsonb,
   'Cron expression for StaleStatusSweeperService'),
  ('cluster_zoom_threshold', '14'::jsonb,
   'Mapbox zoom level above which per-user markers replace clusters'),
  ('redis_stream_max_len', '100000'::jsonb,
   'MAXLEN ~ for location→status Redis Stream trimming');
```

---

## Seed Data Summary

| Table | Rows | Source | Idempotency key |
|-------|------|--------|-----------------|
| `plant_species` | 131 | CSV column 6, deduped | `name_id` |
| `service_capacity` | 7 rayons × 12 weeks | synthetic | `(rayon_id, year, iso_week, service_type)` |
| `monitoring_configs` | +4 | see above | `key` (already unique) |
| `activities` (backfill) | 5,008 | CSV rows | `reference_code` |
| `activity_plant_items` | ~7,000 | derived from CSV | `(activity_id, species_id)` |
| `area_plants` | ~500 | aggregated from CSV | `(area_id, species_id)` |

Handling-status and worker-org lookup tables are **not modeled as FKs** in this phase — raw codes live in `activities.custom_fields` and labels in a client-side lookup JSON (loaded from `/api/v1/meta/lookups`) so labels can be changed without a migration.

---

## Rollback Notes

All changes are additive. In the rare case the entire phase needs reverting:

```sql
-- order matters (reverse FK dependencies)
DROP TABLE seed_transactions, plant_seeds,
           service_capacity,
           activity_plant_items,
           notable_plants, area_plants,
           pruning_requests,
           plant_species CASCADE;

ALTER TABLE activities
  DROP COLUMN custom_fields,
  DROP COLUMN photo_before_url,
  DROP COLUMN photo_after_url,
  DROP COLUMN reference_code,
  DROP COLUMN pruning_request_id;

ALTER TABLE tasks
  DROP COLUMN task_type,
  DROP COLUMN custom_fields,
  DROP COLUMN parent_task_id,
  DROP COLUMN target_plant_count,
  DROP COLUMN completed_plant_count;
```

The `staff_kecamatan` enum value is **not removed** on rollback — PostgreSQL doesn't support removing enum members without rewriting the type. Accounts remain; endpoints are gated by `PHASE3_FEATURES_ENABLED`.

---

**Last Updated:** 2026-04-24
