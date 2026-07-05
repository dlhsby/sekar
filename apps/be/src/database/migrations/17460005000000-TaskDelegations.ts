import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — `task_delegations` table (ADR-038, May 2026).
 *
 * Append-only audit trail of every assignment hop on a task. Captures the
 * full chain top_management → kepala_rayon → admin_data → korlap → satgas
 * so the mobile TaskDetail screen can render "who handed this to me".
 *
 * One row per assign() call (initial assignment counts; reassignment after
 * decline counts again). Roles are snapshotted at the moment of delegation
 * so a later role change does not retroactively rewrite history.
 */
export class TaskDelegations17460005000000 implements MigrationInterface {
  name = 'TaskDelegations17460005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_delegations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL,
        "from_user_id" uuid,
        "to_user_id" uuid NOT NULL,
        "from_role" text,
        "to_role" text NOT NULL,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_task_delegations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_delegations_task"
          FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_delegations_from_user"
          FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_task_delegations_to_user"
          FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_delegations_task_id_created"
        ON "task_delegations" ("task_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_delegations_to_user_id"
        ON "task_delegations" ("to_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_delegations_to_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_delegations_task_id_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_delegations"`);
  }
}
