import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4-3 (ADR-038): add the `activity_tagged` value to `notifications.type`
 * so users tagged on someone else's activity get a push.
 *
 * Idempotent via `ADD VALUE IF NOT EXISTS`. No rollback — enum values cannot be
 * dropped from a Postgres enum without rewriting referencing rows (see the
 * sibling Phase4NotificationTypes migration for the rationale).
 */
export class ActivityTaggedNotificationType17480400000000 implements MigrationInterface {
  name = 'ActivityTaggedNotificationType17480400000000';

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
      `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'activity_tagged'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: see class doc. Enum value removal requires a dedicated migration.
  }
}
