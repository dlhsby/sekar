import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 sub-phase 4-3 (M2): extend `notifications.type` enum with the
 * five new triggers wired in this milestone.
 *
 * Uses `ADD VALUE IF NOT EXISTS` so the migration is idempotent and safe
 * to re-run. Postgres requires each ADD VALUE in its own statement (not
 * inside a transaction wrapping multiple ADDs in older versions; modern
 * Postgres ≥12 supports them but we keep them separate for clarity).
 *
 * No rollback: enum values cannot be removed from a Postgres enum without
 * dropping + recreating the type. Down migration left as a no-op with a
 * note — if values must be retired, write a dedicated migration that
 * rewrites referencing rows first.
 */
export class Phase4NotificationTypes17480000000000 implements MigrationInterface {
  name = 'Phase4NotificationTypes17480000000000';

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

    // SAFETY: these are hardcoded literals only. Never interpolate user- or
    // config-supplied values into this DDL string — enum names cannot be
    // parameterized, so any dynamic source would be an injection vector.
    const values = [
      'activity_approved',
      'activity_rejected',
      'overtime_approved',
      'overtime_rejected',
      'missing_worker_alert',
    ];
    for (const v of values) {
      await queryRunner.query(
        `ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS '${v}'`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: see class doc. Enum value removal requires a dedicated migration
    // that first rewrites every row referencing the value.
  }
}
