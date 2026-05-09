import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — Kecamatans table (May 9, 2026)
 *
 * Promotes kecamatan from free-text on `users.kecamatan_name` /
 * `pruning_requests.kecamatan_name` to a proper table with FK on rayon.
 *
 * - 31 Surabaya kecamatans seeded via seed-reference / seed-phase3 / seed-staging.
 * - `users.kecamatan_id` (nullable) — set for staff_kecamatan only.
 * - `pruning_requests.kecamatan_id` (nullable) — pre-filled at submit time
 *   from the logged-in user's kecamatan_id; falls back to legacy kecamatan_name
 *   text if FK is null (backwards-compatible read path).
 *
 * Existing `kecamatan_name` columns are kept for read-side compatibility and
 * will be removed in a follow-up migration once the UI is fully migrated.
 */
export class KecamatansTable17460007000000 implements MigrationInterface {
  name = 'KecamatansTable17460007000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "kecamatans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(100) NOT NULL UNIQUE,
        "code" varchar(50) NOT NULL UNIQUE,
        "rayon_id" uuid NOT NULL REFERENCES "rayons"("id") ON DELETE RESTRICT,
        "region" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_kecamatans_rayon_id" ON "kecamatans"("rayon_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "kecamatan_id" uuid NULL
        REFERENCES "kecamatans"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_users_kecamatan_id" ON "users"("kecamatan_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      ADD COLUMN IF NOT EXISTS "kecamatan_id" uuid NULL
        REFERENCES "kecamatans"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_pruning_requests_kecamatan_id" ON "pruning_requests"("kecamatan_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_pruning_requests_kecamatan_id"`);
    await queryRunner.query(`ALTER TABLE "pruning_requests" DROP COLUMN IF EXISTS "kecamatan_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_kecamatan_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "kecamatan_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_kecamatans_rayon_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kecamatans"`);
  }
}
