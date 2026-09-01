import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `rayons.staffing_level` — the tier a rayon's staffing requirements attach
 * to (`region` = kawasan / `location` / `rayon`). Drives where the "Kebutuhan
 * Petugas" editor + day-board understaffing pills sit (polymorphic staffing).
 *
 * Additive + idempotent. Defaults every rayon to `region` (kawasan-level, the
 * majority), then flips **Taman Aktif** to `location` (its parks carry per-park
 * requirements, no kawasan) by its stable seed id — no name matching.
 */
export class AddRayonStaffingLevel17497000000000 implements MigrationInterface {
  name = 'AddRayonStaffingLevel17497000000000';

  private static readonly TAMAN_AKTIF_ID = '8a8a8a8a-1111-4222-9333-444444444444';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rayons" ADD COLUMN IF NOT EXISTS "staffing_level" varchar(20) NOT NULL DEFAULT 'region'`,
    );
    await queryRunner.query(`UPDATE "rayons" SET "staffing_level" = 'location' WHERE id = $1`, [
      AddRayonStaffingLevel17497000000000.TAMAN_AKTIF_ID,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rayons" DROP COLUMN IF EXISTS "staffing_level"`);
  }
}
