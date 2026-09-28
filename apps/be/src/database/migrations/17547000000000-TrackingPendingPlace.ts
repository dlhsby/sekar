import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Live place attribution with hysteresis (ADR-064). A worker who holds several
 * places in one shift (ADR-063) is attributed to the one they are actually at;
 * a switch to another assigned place lands only after they stay inside it for
 * REATTRIBUTE_AFTER_MS. These two columns hold that pending switch.
 *
 * Additive, nullable, idempotent. DO NOT RENAME this class.
 */
export class TrackingPendingPlace17547000000000 implements MigrationInterface {
  name = 'TrackingPendingPlace17547000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE user_tracking_status ADD COLUMN IF NOT EXISTS pending_location_id uuid NULL`,
    );
    await qr.query(
      `ALTER TABLE user_tracking_status ADD COLUMN IF NOT EXISTS pending_since timestamptz NULL`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE user_tracking_status DROP COLUMN IF EXISTS pending_since`);
    await qr.query(`ALTER TABLE user_tracking_status DROP COLUMN IF EXISTS pending_location_id`);
  }
}
