import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `schedule_event_locations` — a recurring assignment can name several lokasi.
 *
 * `schedules` could already hold 0..N lokasi via `schedule_locations`, but the
 * RULE that generates them (`schedule_events`) had a single `location_id`. So
 * the create form could only ever offer one lokasi, and a korlap covering four
 * small taman had to be created and then edited — the multi-lokasi model existed
 * but was unreachable from the flow operators actually use.
 *
 * `schedule_events.location_id` stays the PRIMARY lokasi (it is what
 * `chk_schedule_events_scope` validates and what the drill reads); this table
 * carries the full set, and the materializer fans all of them into
 * `schedule_locations`.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className +
 * timestamp.
 */
export class AddScheduleEventLocations17515000000000 implements MigrationInterface {
  name = 'AddScheduleEventLocations17515000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS schedule_event_locations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        schedule_event_id uuid NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
        location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_schedule_event_locations"
         ON schedule_event_locations (schedule_event_id, location_id)`,
    );
    // Backfill from the single-column representation so both agree from day one.
    await queryRunner.query(`
      INSERT INTO schedule_event_locations (schedule_event_id, location_id)
      SELECT e.id, e.location_id FROM schedule_events e WHERE e.location_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_event_locations`);
  }
}
