import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Collapse `user_tracking_status.status` from five values to three:
 * **active · offline · absent** (ADR-046 amendment).
 *
 * Inside/outside an area stops being a *status* and becomes an axis shown
 * alongside active/offline — `is_within_area` already carries it.
 *
 * ⚠️ **`offline` inverts meaning.** Today it means *not clocked in*; afterwards
 * it means *clocked in but unreachable*, and today's `offline` becomes `absent`:
 *
 * | before        | means                          | after     |
 * |---------------|--------------------------------|-----------|
 * | `active`      | clocked in, fresh fix          | `active`  |
 * | `outside_area`| clocked in, fresh fix, outside | `active`  (the location axis carries "outside") |
 * | `inactive`    | fix stale past active_max_age   | `offline` |
 * | `missing`     | clocked in, no/very stale fix   | `offline` |
 * | `offline`     | **not clocked in**             | `absent`  |
 *
 * That inversion is why the remap is **one UPDATE with a CASE**, not a sequence
 * of them: `missing→offline` followed by `offline→absent` would re-migrate the
 * rows the first statement had just written, silently turning unreachable
 * workers into absent ones. A single pass evaluates every row against its
 * ORIGINAL value.
 */
export class CollapseTrackingStatusToThree17505000000000 implements MigrationInterface {
  name = 'CollapseTrackingStatusToThree17505000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE user_tracking_status DROP CONSTRAINT IF EXISTS chk_uts_status`,
    );

    // ONE pass — see the class comment. Order-independent by construction.
    await queryRunner.query(`
      UPDATE user_tracking_status
         SET status = CASE status
           WHEN 'offline'      THEN 'absent'
           WHEN 'missing'      THEN 'offline'
           WHEN 'inactive'     THEN 'offline'
           WHEN 'outside_area' THEN 'active'
           ELSE status
         END
    `);

    await queryRunner.query(`
      ALTER TABLE user_tracking_status
        ADD CONSTRAINT chk_uts_status
        CHECK (status IN ('active', 'offline', 'absent'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE user_tracking_status DROP CONSTRAINT IF EXISTS chk_uts_status`,
    );

    // Lossy, and deliberately so. `active` covered both inside and outside-area,
    // and `offline` covered both inactive and missing — the distinctions are gone
    // and cannot be recovered from the data. This restores the OLD VOCABULARY so
    // the old constraint holds; it does not restore the old information. The
    // recomputed status is correct again within a threshold window anyway
    // (status-calculator re-derives it from last_location_at on the next ping).
    await queryRunner.query(`
      UPDATE user_tracking_status
         SET status = CASE status
           WHEN 'absent'  THEN 'offline'
           WHEN 'offline' THEN 'missing'
           ELSE status
         END
    `);

    await queryRunner.query(`
      ALTER TABLE user_tracking_status
        ADD CONSTRAINT chk_uts_status
        CHECK (status IN ('active', 'inactive', 'outside_area', 'missing', 'offline'))
    `);
  }
}
