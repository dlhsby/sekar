import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Re-add `roles.marker_color` (ADR-044). It was created with the RBAC tables,
 * then dropped by `DropMarkerColor17491900000000` when per-entity marker colours
 * were removed in favour of image markers. The role **accent colour** is a
 * distinct concern — it drives the user pill/avatar tint (not a map marker) —
 * so roles keep this column while geo levels (rayons/regions/areas) do not.
 * Additive-safe + idempotent.
 */
export class AddRoleMarkerColor17492100000000 implements MigrationInterface {
  name = 'AddRoleMarkerColor17492100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "marker_color" VARCHAR(9)`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_roles_marker_color'
        ) THEN
          ALTER TABLE "roles" ADD CONSTRAINT "chk_roles_marker_color"
            CHECK ("marker_color" IS NULL OR "marker_color" ~ '^#[0-9A-Fa-f]{6}$');
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "chk_roles_marker_color"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN IF EXISTS "marker_color"`);
  }
}
