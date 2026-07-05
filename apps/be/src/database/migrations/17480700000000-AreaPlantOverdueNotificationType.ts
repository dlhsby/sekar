import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3-8 close-out: add the `area_plant_overdue` value to
 * `notifications.type` so the daily plant-overdue digest can be delivered.
 *
 * Idempotent via `ADD VALUE IF NOT EXISTS`. No rollback — enum values cannot
 * be dropped from a Postgres enum without rewriting referencing rows (see
 * Phase4NotificationTypes for the rationale).
 */
export class AreaPlantOverdueNotificationType17480700000000 implements MigrationInterface {
  name = 'AreaPlantOverdueNotificationType17480700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fresh-database guard (June 2026, found by scripts/setup.sh): the
    // `notifications` table + its enum are created by TypeORM synchronize on
    // first boot (no migration creates them), and the entity already includes
    // every value added here. On a fresh DB the type doesn't exist yet — skip
    // and let the initial-setup sync create the complete enum.
    const [{ exists }] = (await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS "exists"`,
    )) as Array<{ exists: boolean }>;
    if (!exists) return;

    // SAFETY: hardcoded literal only — enum names cannot be parameterized.
    await queryRunner.query(
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'area_plant_overdue'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: see class doc. Enum value removal requires a dedicated migration.
  }
}
