import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the static `chk_users_role` CHECK constraint (ADR-044): roles are now
 * data-driven, so `users.role` is validated against the `roles` table at the
 * application layer (UsersService.assertRoleValid) instead of a hard-coded value
 * list. This lets operators assign custom roles created in Role Management.
 */
export class DropUsersRoleCheck17492000000000 implements MigrationInterface {
  name = 'DropUsersRoleCheck17492000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the constraint with the current system-role set (best-effort; any
    // custom roles assigned while it was absent would block the rollback).
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
        ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
          role IN ('satgas','linmas','korlap','admin_rayon','kepala_rayon',
                   'management','admin_system','superadmin','staff_kecamatan')
        );
      END $$;
    `);
  }
}
