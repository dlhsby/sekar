import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `users.shift_definition_id` — the worker's single default working shift.
 *
 * Part of the simplified assignment model: rayon + permanent areas + one shift
 * are set in user management and drive the derived roster / clock-in lateness,
 * replacing per-day schedule rows for the common case. Nullable (management /
 * no-shift roles); FK SET NULL so removing a shift definition won't block.
 */
export class AddUserShiftDefinition17490300000000 implements MigrationInterface {
  name = 'AddUserShiftDefinition17490300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "shift_definition_id" uuid`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_users_shift_definition'
        ) THEN
          ALTER TABLE "users"
            ADD CONSTRAINT "FK_users_shift_definition"
            FOREIGN KEY ("shift_definition_id") REFERENCES "shift_definitions"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_shift_definition_id" ON "users" ("shift_definition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_shift_definition_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_shift_definition"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "shift_definition_id"`);
  }
}
