import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — pruning_requests.scheduled_date (May 9, 2026)
 *
 * Splits the previously overloaded `expected_date` column into two roles:
 *
 *   - `expected_year` + `expected_iso_week`  (kecamatan submitter's
 *     preferred week — already on the table since ADR-035 amendment)
 *   - `scheduled_date`                       (NEW — admin-confirmed work
 *     day, set at assign-to-task or via the "Atur Jadwal" reschedule
 *     endpoint)
 *
 * `expected_date` stays on the schema as a legacy column (NULL going
 * forward) in case a future iteration needs single-day kecamatan
 * preferences again. Existing non-null rows are migrated to
 * `scheduled_date` to preserve historical admin decisions.
 *
 * Related ADRs: ADR-035 (capacity model), ADR-038 (week-based intake).
 */
export class PruningRequestScheduledDate17460008000000
  implements MigrationInterface
{
  name = 'PruningRequestScheduledDate17460008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add the new column.
    await queryRunner.query(
      `ALTER TABLE "pruning_requests"
         ADD COLUMN IF NOT EXISTS "scheduled_date" date`,
    );

    // 2. Backfill from `expected_date` for any rows where an admin had
    //    already set a date under the old overloaded semantics. We only
    //    consider rows whose status indicates an admin acted on them
    //    (approved / converted / in_progress / done) — submitted /
    //    under_review rows pre-amendment were ambiguous and we leave
    //    them NULL on the new column.
    await queryRunner.query(`
      UPDATE "pruning_requests"
         SET "scheduled_date" = "expected_date"
       WHERE "expected_date" IS NOT NULL
         AND "scheduled_date" IS NULL
         AND status IN ('approved', 'converted', 'assigned', 'in_progress', 'done')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pruning_requests" DROP COLUMN IF EXISTS "scheduled_date"`,
    );
  }
}
