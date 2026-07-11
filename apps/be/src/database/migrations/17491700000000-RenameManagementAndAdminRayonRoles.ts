import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename role codes `top_management` → `management` and `admin_data` →
 * `admin_rayon` (UAT). The role code is stored as a plain `varchar` (no native
 * PG enum), so the rename is data-only, but the live `chk_users_role` CHECK
 * constraint enumerates the values and must be relaxed BEFORE any UPDATE.
 *
 * Renames, in order: the users.role CHECK constraint, `users.role`, the
 * `top_management_*` / `admin_data_*` login usernames, the RBAC `roles.code`
 * (added in AddRbacTables), and `activity_types.applicable_roles` arrays.
 * Idempotent + guarded — safe to re-run and safe on live staging.
 */
export class RenameManagementAndAdminRayonRoles17491700000000 implements MigrationInterface {
  name = 'RenameManagementAndAdminRayonRoles17491700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Relax the users.role CHECK constraint to the new value set.
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
        ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
          role IN ('satgas','linmas','korlap','admin_rayon','kepala_rayon',
                   'management','admin_system','superadmin','staff_kecamatan')
        );
      END $$;
    `);

    // 2. Rename the role codes on existing users.
    await queryRunner.query(`UPDATE users SET role = 'management' WHERE role = 'top_management'`);
    await queryRunner.query(`UPDATE users SET role = 'admin_rayon' WHERE role = 'admin_data'`);

    // 3. Rename login usernames carrying the old role prefix (e.g. admin_data_pusat_1).
    await queryRunner.query(
      `UPDATE users SET username = 'management' || substring(username FROM 15)
       WHERE username LIKE 'top_management%'`,
    );
    await queryRunner.query(
      `UPDATE users SET username = 'admin_rayon' || substring(username FROM 11)
       WHERE username LIKE 'admin_data%'`,
    );

    // 4. RBAC roles catalog (table + code column exist only after AddRbacTables).
    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.roles') IS NOT NULL THEN
          UPDATE roles SET code = 'management' WHERE code = 'top_management';
          UPDATE roles SET code = 'admin_rayon' WHERE code = 'admin_data';
        END IF;
      END $$;
    `);

    // 5. activity_types.applicable_roles arrays that reference the old codes.
    await queryRunner.query(
      `UPDATE activity_types
         SET applicable_roles = array_replace(applicable_roles, 'top_management', 'management')
       WHERE 'top_management' = ANY(applicable_roles)`,
    );
    await queryRunner.query(
      `UPDATE activity_types
         SET applicable_roles = array_replace(applicable_roles, 'admin_data', 'admin_rayon')
       WHERE 'admin_data' = ANY(applicable_roles)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE activity_types
         SET applicable_roles = array_replace(applicable_roles, 'admin_rayon', 'admin_data')
       WHERE 'admin_rayon' = ANY(applicable_roles)`,
    );
    await queryRunner.query(
      `UPDATE activity_types
         SET applicable_roles = array_replace(applicable_roles, 'management', 'top_management')
       WHERE 'management' = ANY(applicable_roles)`,
    );

    await queryRunner.query(`
      DO $$ BEGIN
        IF to_regclass('public.roles') IS NOT NULL THEN
          UPDATE roles SET code = 'top_management' WHERE code = 'management';
          UPDATE roles SET code = 'admin_data' WHERE code = 'admin_rayon';
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `UPDATE users SET username = 'admin_data' || substring(username FROM 12)
       WHERE username LIKE 'admin_rayon%'`,
    );
    await queryRunner.query(
      `UPDATE users SET username = 'top_management' || substring(username FROM 11)
       WHERE username LIKE 'management%'`,
    );

    await queryRunner.query(`UPDATE users SET role = 'admin_data' WHERE role = 'admin_rayon'`);
    await queryRunner.query(`UPDATE users SET role = 'top_management' WHERE role = 'management'`);

    // Restore the previous CHECK constraint value set.
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;
        ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
          role IN ('satgas','linmas','korlap','admin_data','kepala_rayon',
                   'top_management','admin_system','superadmin','staff_kecamatan')
        );
      END $$;
    `);
  }
}
