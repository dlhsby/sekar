import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 — pruning_requests.status `converted` → `assigned` (May 10, 2026)
 *
 * Renames the post-disposition status from `converted` to `assigned` for
 * clarity. The previous name was confusing in Indonesian — "Dikonversi"
 * doesn't naturally read as "the task has been assigned to a worker", which
 * is what the status actually means in the workflow.
 *
 * - Status semantics: admin used Konversi ke Tugas → a Task row was created
 *   and assigned to a worker. UI label: "Ditugaskan".
 * - Backwards compatibility: any persisted rows still on `converted` are
 *   updated in place. The column is a plain `text` (no CHECK / no enum), so
 *   no schema-level change is needed.
 * - Migration 17460010 follows up by renaming the FK column
 *   `converted_task_id` → `assigned_task_id` to keep the relationship
 *   self-consistent.
 */
export class PruningRequestStatusAssigned17460009000000 implements MigrationInterface {
  name = 'PruningRequestStatusAssigned17460009000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "pruning_requests" SET status = 'assigned' WHERE status = 'converted'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "pruning_requests" SET status = 'converted' WHERE status = 'assigned'`,
    );
  }
}
