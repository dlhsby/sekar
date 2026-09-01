import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix stale demo-user DISPLAY NAMES left over from the role rename (ADR-044).
 * The role codes + usernames were renamed by `17491700000000`, but the seeded
 * `full_name` text still read "Top Management …" / "Admin Data …". Staging is
 * live and must not be reseeded, so patch the existing rows in place.
 *
 * Targeted (role + prefix match) so only the seeded fixtures are touched — real
 * operators are not named "Admin Data …" / "Top Management …". Idempotent.
 */
export class FixLegacyRoleDisplayNames17492200000000 implements MigrationInterface {
  name = 'FixLegacyRoleDisplayNames17492200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "full_name" = replace("full_name", 'Admin Data', 'Admin Rayon')
       WHERE "role" = 'admin_rayon' AND "full_name" LIKE 'Admin Data%'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "full_name" = replace("full_name", 'Top Management', 'Management')
       WHERE "role" = 'management' AND "full_name" LIKE 'Top Management%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "full_name" = replace("full_name", 'Admin Rayon', 'Admin Data')
       WHERE "role" = 'admin_rayon' AND "full_name" LIKE 'Admin Rayon%'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "full_name" = replace("full_name", 'Management', 'Top Management')
       WHERE "role" = 'management' AND "full_name" LIKE 'Management%'`,
    );
  }
}
