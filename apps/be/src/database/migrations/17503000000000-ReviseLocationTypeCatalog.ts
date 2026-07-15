import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Revise the location-type catalog: rename `street` → "Jalan", add "Pulau Jalan",
 * retire "Taman Mini".
 *
 * `location_types` is a TABLE, not an enum — the backend exposes full CRUD
 * (`USER_MANAGERS`-gated), so operators normally change types via the API. This
 * migration exists only to move an EXISTING database (staging) onto the same
 * baseline the seeder now writes for fresh ones; the two must not drift.
 *
 * Nothing here touches `locations`: the rename changes a display `name` only —
 * `code` stays `street`, so all rows keep resolving through their unchanged FK.
 *
 * "Taman Mini" is retired **guarded, never forced**. If any lokasi still points
 * at it, the row is soft-deleted rather than removed, so those lokasi keep
 * resolving a type and an operator can re-point them deliberately. Deleting a
 * type out from under live rows would either break the FK or silently orphan
 * them — neither is a decision a migration should make. (On the seeded DB it is
 * unused: 0 lokasi.)
 *
 * Idempotent: every statement is keyed on `code` and safe to re-run.
 */
export class ReviseLocationTypeCatalog17503000000000 implements MigrationInterface {
  name = 'ReviseLocationTypeCatalog17503000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Jalanan → Jalan (display name only; `code` = 'street' is the identity).
    await queryRunner.query(`
      UPDATE location_types
         SET name = 'Jalan',
             description = 'Jalan umum yang memerlukan pemeliharaan kebersihan',
             updated_at = NOW()
       WHERE code = 'street'
    `);

    // 2. Pulau Jalan (median / traffic island). PASSIVE, matching every other
    //    road-side type. `category` is decorative — carried on two monitoring
    //    DTOs and a badge colour, nothing branches on it — so this classification
    //    is for consistency, not behaviour.
    await queryRunner.query(`
      INSERT INTO location_types (code, name, description, category)
      VALUES ('traffic_island', 'Pulau Jalan', 'Pulau jalan (traffic island) / median yang memerlukan pemeliharaan', 'PASSIVE')
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            updated_at = NOW()
    `);

    // 3. Retire Taman Mini — only hard-delete when nothing points at it.
    const inUse = (await queryRunner.query(`
      SELECT count(*)::int AS n
        FROM locations l
        JOIN location_types lt ON lt.id = l.location_type_id
       WHERE lt.code = 'mini_garden' AND l.deleted_at IS NULL
    `)) as Array<{ n: number }>;

    if ((inUse[0]?.n ?? 0) > 0) {
      await queryRunner.query(`
        UPDATE location_types SET deleted_at = NOW()
         WHERE code = 'mini_garden' AND deleted_at IS NULL
      `);
    } else {
      await queryRunner.query(`DELETE FROM location_types WHERE code = 'mini_garden'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the previous catalog. Taman Mini comes back un-deleted whichever
    // branch `up` took, so the rollback converges from both.
    await queryRunner.query(`
      INSERT INTO location_types (code, name, description, category)
      VALUES ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan', 'ACTIVE')
      ON CONFLICT (code) DO UPDATE
        SET deleted_at = NULL,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            updated_at = NOW()
    `);

    // Only drop Pulau Jalan if nothing adopted it while it existed — same
    // reasoning as `up`: a migration must not orphan live rows.
    const inUse = (await queryRunner.query(`
      SELECT count(*)::int AS n
        FROM locations l
        JOIN location_types lt ON lt.id = l.location_type_id
       WHERE lt.code = 'traffic_island' AND l.deleted_at IS NULL
    `)) as Array<{ n: number }>;

    if ((inUse[0]?.n ?? 0) === 0) {
      await queryRunner.query(`DELETE FROM location_types WHERE code = 'traffic_island'`);
    }

    await queryRunner.query(`
      UPDATE location_types
         SET name = 'Jalanan',
             description = 'Jalanan umum yang memerlukan pemeliharaan kebersihan',
             updated_at = NOW()
       WHERE code = 'street'
    `);
  }
}
