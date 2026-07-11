import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename role codes `top_management` → `management` and `admin_data` →
 * `admin_rayon` (UAT). Role/`applicable_roles` values are plain `varchar` (no
 * native PG enum), so the rename is data-only — but THREE live CHECK constraints
 * enumerate the values and must be dropped BEFORE the UPDATEs and re-added after:
 *   - `chk_users_role` (users.role)
 *   - `chk_activity_types_roles` (activity_types.applicable_roles ⊆ set)
 *   - `chk_area_staff_requirements_role` (area_staff_requirements.role)
 *
 * Also renames the per-role "Lainnya" activity-type slug `lainnya_admin_data` →
 * `lainnya_admin_rayon` (activities reference activity_types by id, not slug, so
 * this is reference-safe). Idempotent + guarded — safe on live staging.
 */
export class RenameManagementAndAdminRayonRoles17491700000000 implements MigrationInterface {
  name = 'RenameManagementAndAdminRayonRoles17491700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the three role CHECK constraints so the rows can be renamed.
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`);
    await queryRunner.query(
      `ALTER TABLE activity_types DROP CONSTRAINT IF EXISTS chk_activity_types_roles`,
    );
    await queryRunner.query(
      `ALTER TABLE area_staff_requirements DROP CONSTRAINT IF EXISTS chk_area_staff_requirements_role`,
    );

    // 2. Rename the role codes on existing users + the area-staff-requirement rows.
    await queryRunner.query(`UPDATE users SET role = 'management' WHERE role = 'top_management'`);
    await queryRunner.query(`UPDATE users SET role = 'admin_rayon' WHERE role = 'admin_data'`);
    await queryRunner.query(
      `UPDATE area_staff_requirements SET role = 'management' WHERE role = 'top_management'`,
    );
    await queryRunner.query(
      `UPDATE area_staff_requirements SET role = 'admin_rayon' WHERE role = 'admin_data'`,
    );

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

    // 5. activity_types: applicable_roles arrays + the per-role "Lainnya" slug.
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
    await queryRunner.query(
      `UPDATE activity_types SET code = 'lainnya_admin_rayon' WHERE code = 'lainnya_admin_data'`,
    );

    // 6. Re-add the three CHECK constraints with the new value sets.
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
        role IN ('satgas','linmas','korlap','admin_rayon','kepala_rayon',
                 'management','admin_system','superadmin','staff_kecamatan')
      )
    `);
    await queryRunner.query(`
      ALTER TABLE activity_types ADD CONSTRAINT chk_activity_types_roles CHECK (
        applicable_roles <@ ARRAY['satgas','linmas','korlap','admin_rayon']::text[]
      )
    `);
    await queryRunner.query(`
      ALTER TABLE area_staff_requirements ADD CONSTRAINT chk_area_staff_requirements_role CHECK (
        role IN ('satgas','linmas','korlap','admin_rayon','kepala_rayon',
                 'management','admin_system','superadmin')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`);
    await queryRunner.query(
      `ALTER TABLE activity_types DROP CONSTRAINT IF EXISTS chk_activity_types_roles`,
    );
    await queryRunner.query(
      `ALTER TABLE area_staff_requirements DROP CONSTRAINT IF EXISTS chk_area_staff_requirements_role`,
    );

    await queryRunner.query(
      `UPDATE activity_types SET code = 'lainnya_admin_data' WHERE code = 'lainnya_admin_rayon'`,
    );
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

    await queryRunner.query(
      `UPDATE area_staff_requirements SET role = 'admin_data' WHERE role = 'admin_rayon'`,
    );
    await queryRunner.query(
      `UPDATE area_staff_requirements SET role = 'top_management' WHERE role = 'management'`,
    );
    await queryRunner.query(`UPDATE users SET role = 'admin_data' WHERE role = 'admin_rayon'`);
    await queryRunner.query(`UPDATE users SET role = 'top_management' WHERE role = 'management'`);

    // Restore the previous CHECK constraint value sets.
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
        role IN ('satgas','linmas','korlap','admin_data','kepala_rayon',
                 'top_management','admin_system','superadmin','staff_kecamatan')
      )
    `);
    await queryRunner.query(`
      ALTER TABLE activity_types ADD CONSTRAINT chk_activity_types_roles CHECK (
        applicable_roles <@ ARRAY['satgas','linmas','korlap','admin_data']::text[]
      )
    `);
    await queryRunner.query(`
      ALTER TABLE area_staff_requirements ADD CONSTRAINT chk_area_staff_requirements_role CHECK (
        role IN ('satgas','linmas','korlap','admin_data','kepala_rayon',
                 'top_management','admin_system','superadmin')
      )
    `);
  }
}
