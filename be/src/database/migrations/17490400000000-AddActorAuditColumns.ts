import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Actor-audit columns: who created / last-updated / soft-deleted a row.
 * Nullable uuid (system actions / pre-existing rows stay null). Stamped at
 * runtime by AuditSubscriber from the request's acting user. No FK constraint —
 * the actor is a historical reference and must survive user deletion.
 */
export class AddActorAuditColumns17490400000000 implements MigrationInterface {
  name = 'AddActorAuditColumns17490400000000';

  private readonly tables = ['users', 'areas', 'rayons', 'assets'];

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
