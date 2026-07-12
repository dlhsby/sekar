import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5AssetsTables17490000000000 implements MigrationInterface {
  name = 'Phase5AssetsTables17490000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create asset_categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL UNIQUE,
        "slug" varchar(50) NOT NULL UNIQUE,
        "code_prefix" varchar(4) NOT NULL UNIQUE,
        "description" text,
        "icon" varchar(50),
        "sort_order" integer DEFAULT 0,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
      )
    `);

    // Create assets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL REFERENCES "asset_categories"("id"),
        "location_id" uuid REFERENCES "areas"("id") ON DELETE SET NULL,
        "rayon_id" uuid REFERENCES "rayons"("id") ON DELETE SET NULL,
        "name" varchar(200) NOT NULL,
        "asset_code" varchar(50) NOT NULL UNIQUE,
        "description" text,
        "status" varchar(20) DEFAULT 'available',
        "condition" varchar(20) DEFAULT 'good',
        "purchase_date" date,
        "purchase_price" decimal(15,2),
        "qr_code_url" text,
        "photo_url" text,
        "last_maintenance_at" timestamptz,
        "next_maintenance_at" timestamptz,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW(),
        "deleted_at" timestamptz
      )
    `);

    // Create indexes on assets
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_assets_status" ON "assets"("status")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_assets_location_id" ON "assets"("location_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_assets_rayon_id" ON "assets"("rayon_id")`,
    );

    // Create asset_assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL REFERENCES "assets"("id"),
        "assigned_to" uuid NOT NULL REFERENCES "users"("id"),
        "assigned_by" uuid NOT NULL REFERENCES "users"("id"),
        "checked_out_at" timestamptz DEFAULT NOW(),
        "expected_return_at" timestamptz,
        "returned_at" timestamptz,
        "returned_to" uuid REFERENCES "users"("id"),
        "condition_at_checkout" varchar(20) NOT NULL,
        "condition_at_return" varchar(20),
        "notes" text,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
      )
    `);

    // Create indexes on asset_assignments
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_asset_assignments_asset_id" ON "asset_assignments"("asset_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_asset_assignments_assigned_to" ON "asset_assignments"("assigned_to")`,
    );
    // Partial unique index: at most one active assignment per asset
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_asset_assignments_unique_active"
      ON "asset_assignments"("asset_id")
      WHERE "returned_at" IS NULL
    `);

    // Create asset_maintenances table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "asset_maintenances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "asset_id" uuid NOT NULL REFERENCES "assets"("id"),
        "maintenance_type" varchar(30) NOT NULL,
        "scheduled_at" timestamptz NOT NULL,
        "completed_at" timestamptz,
        "performed_by" uuid REFERENCES "users"("id"),
        "status" varchar(20) DEFAULT 'scheduled',
        "description" text,
        "cost" decimal(15,2),
        "notes" text,
        "created_at" timestamptz DEFAULT NOW(),
        "updated_at" timestamptz DEFAULT NOW()
      )
    `);

    // Create indexes on asset_maintenances
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_asset_maintenances_asset_id" ON "asset_maintenances"("asset_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_asset_maintenances_status_scheduled" ON "asset_maintenances"("status", "scheduled_at")`,
    );

    // Seed 6 categories
    await queryRunner.query(`
      INSERT INTO "asset_categories" (name, slug, code_prefix, icon, sort_order)
      VALUES
        ('Alat Kebersihan', 'alat-kebersihan', 'AK', 'broom', 0),
        ('Alat Pertamanan', 'alat-pertamanan', 'AP', 'scissors', 1),
        ('Kendaraan Operasional', 'kendaraan-operasional', 'KO', 'truck', 2),
        ('Peralatan Keamanan', 'peralatan-keamanan', 'PK', 'shield', 3),
        ('Peralatan Irigasi', 'peralatan-irigasi', 'PI', 'droplet', 4),
        ('Perlengkapan Umum', 'perlengkapan-umum', 'PU', 'box', 5)
      ON CONFLICT (code_prefix) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "asset_maintenances"`);
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "asset_assignments"`);
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "assets"`);
    await queryRunner.query(`DROP TABLE IF NOT EXISTS "asset_categories"`);
  }
}
