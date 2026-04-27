import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — staff_kecamatan redesign (Apr 27, 2026)
 *
 * Adds the new fields the redesigned mobile submit form collects:
 *   - users.kecamatan_name: each staff_kecamatan user is attributed to one kecamatan;
 *     pruning_requests inherit kecamatan_name + rayon_id from the user at submit time.
 *   - pruning_requests gains tree-detail + contact fields:
 *     tree_count, tree_height_estimate, tree_diameter_estimate,
 *     requester_name, requester_phone, rt_leader_name, rt_leader_phone.
 *
 * All new columns are nullable so existing rows (and other roles) are unaffected.
 */
export class StaffKecamatanRedesign17460002000000 implements MigrationInterface {
  name = 'StaffKecamatanRedesign17460002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "kecamatan_name" varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      ADD COLUMN IF NOT EXISTS "tree_count" int,
      ADD COLUMN IF NOT EXISTS "tree_height_estimate" text,
      ADD COLUMN IF NOT EXISTS "tree_diameter_estimate" text,
      ADD COLUMN IF NOT EXISTS "requester_name" varchar(100),
      ADD COLUMN IF NOT EXISTS "requester_phone" varchar(30),
      ADD COLUMN IF NOT EXISTS "rt_leader_name" varchar(100),
      ADD COLUMN IF NOT EXISTS "rt_leader_phone" varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      DROP COLUMN IF EXISTS "rt_leader_phone",
      DROP COLUMN IF EXISTS "rt_leader_name",
      DROP COLUMN IF EXISTS "requester_phone",
      DROP COLUMN IF EXISTS "requester_name",
      DROP COLUMN IF EXISTS "tree_diameter_estimate",
      DROP COLUMN IF EXISTS "tree_height_estimate",
      DROP COLUMN IF EXISTS "tree_count"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "kecamatan_name"
    `);
  }
}
