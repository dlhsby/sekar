import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-055 — the append-only attendance punch log + a faithful backfill from the
 * existing `shifts` rows.
 *
 * Punches become the source of truth for attendance; the `shifts` table stays a
 * maintained session-projection (one row per session, stable id) so the four FKs
 * that point at `shifts.id` and every field-reader keep working untouched.
 *
 * Backfill is idempotent: each historical `shifts` row emits deterministic
 * punch ids `md5(shift_id || ':in'|':out')`, so re-running the migration (or the
 * companion backfill script) inserts nothing new. Historical `shifts` rows are
 * left AS-IS — they are already valid closed sessions; only NEW clock cycles go
 * through the punch → projection path. Both punches of a session carry the
 * clock-in's WIB `service_day`, so a cross-midnight clock-out pairs correctly.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class CreateAttendancePunches17520000000000 implements MigrationInterface {
  name = 'CreateAttendancePunches17520000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attendance_punches (
        id                 uuid PRIMARY KEY,
        user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        punched_at         timestamptz NOT NULL,
        label              varchar(16) NOT NULL,
        service_day        date NOT NULL,
        shift_definition_id uuid NULL,
        location_id        uuid NULL,
        gps_lat            decimal(10, 8) NULL,
        gps_lng            decimal(11, 8) NULL,
        accuracy_m         decimal(8, 2) NULL,
        outside_boundary   boolean NOT NULL DEFAULT false,
        photo_url          text NULL,
        is_overtime        boolean NOT NULL DEFAULT false,
        created_at         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_attendance_punches_label CHECK (label IN ('clock_in', 'clock_out'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_punches_user ON attendance_punches (user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_punches_user_service_day ON attendance_punches (user_id, service_day)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_attendance_punches_session ON attendance_punches (user_id, service_day, shift_definition_id, is_overtime)`,
    );

    // --- Backfill: clock-in punches (one per shift row) ---
    await queryRunner.query(`
      INSERT INTO attendance_punches
        (id, user_id, punched_at, label, service_day, shift_definition_id, location_id,
         gps_lat, gps_lng, outside_boundary, photo_url, is_overtime, created_at)
      SELECT
        (md5(s.id::text || ':in'))::uuid,
        s.user_id,
        s.clock_in_time,
        'clock_in',
        (s.clock_in_time AT TIME ZONE 'Asia/Jakarta')::date,
        s.shift_definition_id,
        s.location_id,
        s.clock_in_gps_lat,
        s.clock_in_gps_lng,
        COALESCE(s.clock_in_outside_boundary, false),
        s.clock_in_photo_url,
        COALESCE(s.is_overtime, false),
        COALESCE(s.created_at, s.clock_in_time)
      FROM shifts s
      WHERE s.deleted_at IS NULL AND s.clock_in_time IS NOT NULL
      ON CONFLICT (id) DO NOTHING
    `);

    // --- Backfill: clock-out punches (only closed shifts) ---
    // service_day = the clock-IN's WIB day, so a cross-midnight pair shares a key.
    await queryRunner.query(`
      INSERT INTO attendance_punches
        (id, user_id, punched_at, label, service_day, shift_definition_id, location_id,
         gps_lat, gps_lng, outside_boundary, photo_url, is_overtime, created_at)
      SELECT
        (md5(s.id::text || ':out'))::uuid,
        s.user_id,
        s.clock_out_time,
        'clock_out',
        (s.clock_in_time AT TIME ZONE 'Asia/Jakarta')::date,
        s.shift_definition_id,
        s.location_id,
        s.clock_out_gps_lat,
        s.clock_out_gps_lng,
        COALESCE(s.clock_out_outside_boundary, false),
        s.clock_out_photo_url,
        COALESCE(s.is_overtime, false),
        COALESCE(s.updated_at, s.clock_out_time)
      FROM shifts s
      WHERE s.deleted_at IS NULL AND s.clock_out_time IS NOT NULL
      ON CONFLICT (id) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The projection (`shifts`) is untouched by this migration, so dropping the
    // log is a clean rollback — no data on the old read path is lost.
    await queryRunner.query(`DROP TABLE IF EXISTS attendance_punches`);
  }
}
