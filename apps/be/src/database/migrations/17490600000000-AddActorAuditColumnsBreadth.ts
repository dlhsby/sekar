import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Actor-audit columns: who created / last-updated / soft-deleted a row.
 * Nullable uuid (system actions / pre-existing rows stay null). Stamped at
 * runtime by AuditSubscriber from the request's acting user. No FK constraint —
 * the actor is a historical reference and must survive user deletion.
 *
 * Breadth migration: adds to 10 entities that were missing these columns.
 */
export class AddActorAuditColumnsBreadth17490600000000 implements MigrationInterface {
  name = 'AddActorAuditColumnsBreadth17490600000000';

  private readonly tables = [
    'schedules',
    'activity_types',
    'activities',
    'shifts',
    'shift_definitions',
    'area_types',
    'area_staff_requirements',
    'tasks',
    'kecamatans',
    'app_releases',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ADD COLUMN IF NOT EXISTS "created_by" uuid,
          ADD COLUMN IF NOT EXISTS "updated_by" uuid,
          ADD COLUMN IF NOT EXISTS "deleted_by" uuid
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          DROP COLUMN IF EXISTS "created_by",
          DROP COLUMN IF EXISTS "updated_by",
          DROP COLUMN IF EXISTS "deleted_by"
      `);
    }
  }
}
