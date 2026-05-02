import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — pruning request weekly booking (May 1, 2026)
 *
 * ADR-035 amendment 2026-05-01 + ADR-038.
 *
 * Adds two nullable columns to `pruning_requests` that capture the ISO week the
 * staff_kecamatan submitter chose. The pre-existing `expected_date` column stays
 * — it is populated later (by `admin_data` at convert-to-task, or by the
 * convert auto-pick when the admin doesn't specify a day).
 *
 * Three valid states emerge:
 *   - week set, expected_date NULL   → submitted, awaiting day pick
 *   - week set + expected_date set   → day picked (admin or auto-pick)
 *   - week NULL + expected_date set  → legacy or admin-direct reschedule
 *
 * Both columns are additive and nullable, so no backfill is required and the
 * legacy `detail_date` submission path keeps working through the deprecation
 * window.
 */
export class PruningRequestWeekBooking17460003000000 implements MigrationInterface {
  name = 'PruningRequestWeekBooking17460003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      ADD COLUMN IF NOT EXISTS "expected_year" int,
      ADD COLUMN IF NOT EXISTS "expected_iso_week" int
    `);

    // Sanity constraint — ISO 8601 weeks are 1..53.
    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      ADD CONSTRAINT "ck_pruning_requests_expected_iso_week"
      CHECK ("expected_iso_week" IS NULL OR ("expected_iso_week" >= 1 AND "expected_iso_week" <= 53))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      DROP CONSTRAINT IF EXISTS "ck_pruning_requests_expected_iso_week"
    `);
    await queryRunner.query(`
      ALTER TABLE "pruning_requests"
      DROP COLUMN IF EXISTS "expected_iso_week",
      DROP COLUMN IF EXISTS "expected_year"
    `);
  }
}
