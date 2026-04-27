import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3Schema17460000000000 implements MigrationInterface {
  name = 'Phase3Schema17460000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. plant_species
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plant_species (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name_id TEXT NOT NULL,
        name_latin TEXT NULL,
        category TEXT NOT NULL DEFAULT 'tree',
        default_pruning_cycle_days INT NULL,
        notes TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uidx_plant_species_name_id ON plant_species (name_id)`);

    // 2. area_plants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS area_plants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
        species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
        count INT NOT NULL DEFAULT 0,
        last_pruned_at TIMESTAMPTZ NULL,
        next_due_at TIMESTAMPTZ NULL,
        status TEXT NOT NULL DEFAULT 'ok',
        override_cycle_days INT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (area_id, species_id)
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE area_plants ADD CONSTRAINT uq_area_plants_area_species UNIQUE (area_id, species_id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_area_plants_area_status ON area_plants (area_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_area_plants_next_due ON area_plants (next_due_at)`);

    // 3. notable_plants
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notable_plants (
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
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notable_plants_area ON notable_plants (area_id)`);

    // 4. pruning_requests (converted_task_id nullable to avoid circular FK)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pruning_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference_code TEXT UNIQUE NOT NULL,
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
        rayon_id UUID NULL REFERENCES rayons(id) ON DELETE SET NULL,
        reviewed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ NULL,
        review_notes TEXT NULL,
        converted_task_id UUID NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pruning_requests_status_rayon ON pruning_requests (status, rayon_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pruning_requests_submitter ON pruning_requests (submitted_by, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_pruning_requests_ref ON pruning_requests (reference_code)`);

    // 5. activity_plant_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS activity_plant_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
        species_id UUID NOT NULL REFERENCES plant_species(id) ON DELETE RESTRICT,
        count INT NOT NULL CHECK (count > 0),
        notes TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_activity_plant_items_activity ON activity_plant_items (activity_id)`);

    // 6. service_capacity
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_capacity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rayon_id UUID NOT NULL REFERENCES rayons(id) ON DELETE CASCADE,
        year INT NOT NULL,
        iso_week INT NOT NULL CHECK (iso_week BETWEEN 1 AND 53),
        service_type TEXT NOT NULL,
        capacity_units INT NOT NULL DEFAULT 0,
        booked_units INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (rayon_id, year, iso_week, service_type),
        CHECK (booked_units >= 0 AND booked_units <= capacity_units + 10)
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE service_capacity ADD CONSTRAINT uq_service_capacity UNIQUE (rayon_id, year, iso_week, service_type);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_service_capacity_rayon_week ON service_capacity (rayon_id, year, iso_week)`);

    // 7. plant_seeds
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plant_seeds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name_id TEXT NOT NULL,
        species_id UUID NULL REFERENCES plant_species(id) ON DELETE SET NULL,
        unit TEXT NOT NULL CHECK (unit IN ('gram', 'piece', 'packet')),
        stock_qty NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
        last_counted_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE plant_seeds ADD CONSTRAINT uq_plant_seeds_name_id UNIQUE (name_id);
      EXCEPTION WHEN duplicate_table THEN NULL;
      END $$
    `);

    // 8. seed_transactions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS seed_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seed_id UUID NOT NULL REFERENCES plant_seeds(id) ON DELETE RESTRICT,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase','distribution','adjustment')),
        qty NUMERIC(12, 2) NOT NULL,
        unit_price NUMERIC(12, 2) NULL,
        supplier TEXT NULL,
        receipt_url TEXT NULL,
        to_rayon_id UUID NULL REFERENCES rayons(id) ON DELETE SET NULL,
        to_area_id UUID NULL REFERENCES areas(id) ON DELETE SET NULL,
        recipient_name TEXT NULL,
        occurred_at DATE NOT NULL,
        recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        notes TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_seed_tx_seed_occurred ON seed_transactions (seed_id, occurred_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_seed_tx_type_occurred ON seed_transactions (transaction_type, occurred_at DESC)`);

    // 9. ALTER activities (all IF NOT EXISTS via DO block for columns)
    await queryRunner.query(`
      DO $$ BEGIN
        BEGIN ALTER TABLE activities ADD COLUMN case_type TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE activities ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE activities ADD COLUMN photo_before_url TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE activities ADD COLUMN photo_after_url TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE activities ADD COLUMN reference_code TEXT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE activities ADD COLUMN pruning_request_id UUID NULL REFERENCES pruning_requests(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_reference_unique ON activities (reference_code) WHERE reference_code IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_activities_case_type ON activities (case_type) WHERE case_type IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_activities_pruning_req ON activities (pruning_request_id) WHERE pruning_request_id IS NOT NULL`);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE activities ADD CONSTRAINT chk_pruning_case_type
          CHECK (
            (custom_fields->>'task_type' IS NULL OR custom_fields->>'task_type' <> 'pruning')
            OR (case_type IN ('GT', 'PT', 'PS', 'PD', 'PK'))
          );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // 10. ALTER tasks
    await queryRunner.query(`
      DO $$ BEGIN
        BEGIN ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'generic'; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE tasks ADD COLUMN custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE tasks ADD COLUMN parent_task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE tasks ADD COLUMN target_plant_count INT NULL; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE tasks ADD COLUMN completed_plant_count INT NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD CONSTRAINT chk_completed_plant_count CHECK (completed_plant_count >= 0);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_type_status ON tasks (task_type, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks (parent_task_id) WHERE parent_task_id IS NOT NULL`);

    // 11. Extend users.role CHECK constraint to include staff_kecamatan
    // (role column is varchar(30), not a native PG enum — Phase2C used CHECK constraint)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
        ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
          role IN ('satgas','linmas','korlap','admin_data','kepala_rayon',
                   'top_management','admin_system','superadmin','staff_kecamatan')
        );
      END $$
    `);

    // 12. user_tracking_status indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_tracking_area_updated ON user_tracking_status (area_id, updated_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_tracking_within_area ON user_tracking_status (is_within_area, area_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_tracking_within_area`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_tracking_area_updated`);

    // Restore users.role CHECK constraint to 8-role set (without staff_kecamatan)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
        ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
          role IN ('satgas','linmas','korlap','admin_data','kepala_rayon',
                   'top_management','admin_system','superadmin')
        );
      END $$
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_parent`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_type_status`);
    await queryRunner.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_completed_plant_count`);
    await queryRunner.query(`
      ALTER TABLE tasks
        DROP COLUMN IF EXISTS task_type,
        DROP COLUMN IF EXISTS custom_fields,
        DROP COLUMN IF EXISTS parent_task_id,
        DROP COLUMN IF EXISTS target_plant_count,
        DROP COLUMN IF EXISTS completed_plant_count
    `);

    await queryRunner.query(`ALTER TABLE activities DROP CONSTRAINT IF EXISTS chk_pruning_case_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_pruning_req`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_case_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activities_reference_unique`);
    await queryRunner.query(`
      ALTER TABLE activities
        DROP COLUMN IF EXISTS case_type,
        DROP COLUMN IF EXISTS custom_fields,
        DROP COLUMN IF EXISTS photo_before_url,
        DROP COLUMN IF EXISTS photo_after_url,
        DROP COLUMN IF EXISTS reference_code,
        DROP COLUMN IF EXISTS pruning_request_id
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_seed_tx_type_occurred`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_seed_tx_seed_occurred`);
    await queryRunner.query(`DROP TABLE IF EXISTS seed_transactions`);
    await queryRunner.query(`DROP TABLE IF EXISTS plant_seeds`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_service_capacity_rayon_week`);
    await queryRunner.query(`DROP TABLE IF EXISTS service_capacity`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_activity_plant_items_activity`);
    await queryRunner.query(`DROP TABLE IF EXISTS activity_plant_items`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pruning_requests_ref`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pruning_requests_submitter`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_pruning_requests_status_rayon`);
    await queryRunner.query(`DROP TABLE IF EXISTS pruning_requests`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notable_plants_area`);
    await queryRunner.query(`DROP TABLE IF EXISTS notable_plants`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_plants_next_due`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_area_plants_area_status`);
    await queryRunner.query(`DROP TABLE IF EXISTS area_plants`);
    await queryRunner.query(`DROP INDEX IF EXISTS uidx_plant_species_name_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS plant_species`);
  }
}
