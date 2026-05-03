import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — backfill `task_delegations` for tasks created before
 * 17460005000000-TaskDelegations.ts shipped (ADR-038, May 2026).
 *
 * For every task that already has an assignee but no delegation row yet,
 * synthesize a single hop creator → assignee using:
 *   - tasks.created_by  → from_user_id, with that user's role snapshot
 *   - tasks.assigned_to → to_user_id,   with that user's role snapshot
 *   - tasks.assigned_at (or created_at) → created_at
 *
 * Idempotent via the NOT EXISTS guard, so re-running this migration on
 * a database that already has some hops will not duplicate them.
 */
export class BackfillTaskDelegations17460006000000 implements MigrationInterface {
  name = 'BackfillTaskDelegations17460006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "task_delegations" (
        "task_id",
        "from_user_id",
        "from_role",
        "to_user_id",
        "to_role",
        "reason",
        "created_at"
      )
      SELECT
        t."id",
        t."created_by",
        creator."role",
        t."assigned_to",
        assignee."role",
        NULL,
        COALESCE(t."assigned_at", t."created_at")
      FROM "tasks" t
      LEFT JOIN "users" creator  ON creator."id"  = t."created_by"
      LEFT JOIN "users" assignee ON assignee."id" = t."assigned_to"
      WHERE t."assigned_to" IS NOT NULL
        AND t."deleted_at" IS NULL
        AND assignee."role" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "task_delegations" d WHERE d."task_id" = t."id"
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfill rows are indistinguishable from organic rows. The safe
    // revert is to drop only rows whose created_at exactly matches the
    // task's assigned_at (the synthesized timestamp); anything else is
    // post-migration organic data and must stay.
    await queryRunner.query(`
      DELETE FROM "task_delegations" d
      USING "tasks" t
      WHERE d."task_id" = t."id"
        AND d."created_at" = COALESCE(t."assigned_at", t."created_at")
        AND d."reason" IS NULL
    `);
  }
}
