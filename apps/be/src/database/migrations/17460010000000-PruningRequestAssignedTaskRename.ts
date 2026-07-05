import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — pruning_requests.converted_task_id → assigned_task_id (May 10, 2026)
 *
 * Follow-up to 17460009 (`status: converted → assigned`). Aligns the FK
 * column name with the renamed status so the model is self-consistent
 * across both directions of the relationship.
 *
 * The column carries the same datum (resulting Task UUID); only the name
 * changes. PostgreSQL does the rename in place — no data move, no FK drop
 * since the column was created without an explicit ON-DELETE constraint
 * referencing tasks (Phase3Schema 17460000 left it as a plain UUID).
 *
 * Idempotency: dev environments running with `synchronize: true` may have
 * auto-added `assigned_task_id` from the renamed entity before this
 * migration ran. We branch on the actual schema state so the migration is
 * safe regardless of which (or both) columns exist:
 *   • only old              → RENAME
 *   • only new              → no-op (sync already did it)
 *   • both (sync collision) → backfill new from old, then DROP old
 *   • neither (impossible)  → no-op
 */
export class PruningRequestAssignedTaskRename17460010000000 implements MigrationInterface {
  name = 'PruningRequestAssignedTaskRename17460010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        has_old boolean;
        has_new boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'pruning_requests'
            AND column_name = 'converted_task_id'
        ) INTO has_old;
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'pruning_requests'
            AND column_name = 'assigned_task_id'
        ) INTO has_new;

        IF has_old AND NOT has_new THEN
          EXECUTE 'ALTER TABLE "pruning_requests"
                     RENAME COLUMN "converted_task_id" TO "assigned_task_id"';
        ELSIF has_old AND has_new THEN
          -- Sync auto-created the new column empty; copy the legacy values
          -- over before we drop the old one.
          EXECUTE 'UPDATE "pruning_requests"
                      SET "assigned_task_id" = COALESCE("assigned_task_id", "converted_task_id")
                    WHERE "converted_task_id" IS NOT NULL';
          EXECUTE 'ALTER TABLE "pruning_requests"
                     DROP COLUMN "converted_task_id"';
        END IF;
        -- only-new or neither: nothing to do.
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        has_old boolean;
        has_new boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'pruning_requests'
            AND column_name = 'converted_task_id'
        ) INTO has_old;
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'pruning_requests'
            AND column_name = 'assigned_task_id'
        ) INTO has_new;

        IF has_new AND NOT has_old THEN
          EXECUTE 'ALTER TABLE "pruning_requests"
                     RENAME COLUMN "assigned_task_id" TO "converted_task_id"';
        END IF;
      END $$;
    `);
  }
}
