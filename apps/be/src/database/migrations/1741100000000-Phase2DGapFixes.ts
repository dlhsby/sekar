import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2DGapFixes1741100000000 implements MigrationInterface {
  name = 'Phase2DGapFixes1741100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // DB-1: Add rayon boundary columns
    await queryRunner.query(`
      ALTER TABLE rayons ADD COLUMN IF NOT EXISTS boundary_polygon JSONB NULL
    `);
    await queryRunner.query(`
      ALTER TABLE rayons ADD COLUMN IF NOT EXISTS center_lat DECIMAL(10,8) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE rayons ADD COLUMN IF NOT EXISTS center_lng DECIMAL(11,8) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE rayons ADD COLUMN IF NOT EXISTS boundary_computed_at TIMESTAMPTZ NULL
    `);

    // DB-3: GIN index on areas.boundary_polygon
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_areas_boundary_polygon ON areas USING GIN (boundary_polygon)
    `);

    // GIN index on rayons.boundary_polygon
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rayons_boundary_polygon ON rayons USING GIN (boundary_polygon)
    `);

    // DB-4: Fix composite index column order (status, location_id) instead of (location_id, status)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_uts_area_status
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_uts_status_area ON user_tracking_status (status, location_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_uts_status_area`);
    await queryRunner.query(`
      CREATE INDEX idx_uts_area_status ON user_tracking_status (location_id, status)
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_rayons_boundary_polygon`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_areas_boundary_polygon`);
    await queryRunner.query(`ALTER TABLE rayons DROP COLUMN IF EXISTS boundary_computed_at`);
    await queryRunner.query(`ALTER TABLE rayons DROP COLUMN IF EXISTS center_lng`);
    await queryRunner.query(`ALTER TABLE rayons DROP COLUMN IF EXISTS center_lat`);
    await queryRunner.query(`ALTER TABLE rayons DROP COLUMN IF EXISTS boundary_polygon`);
  }
}
