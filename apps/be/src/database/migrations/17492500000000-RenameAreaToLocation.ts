import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename Area → Location across all tables and columns.
 *
 * This runs AFTER the phase 0-3 migrations (RBAC, regions + per-level styling,
 * teams). Regions/styling already added `region_id` + styling columns to the
 * `areas` table via 17491500000000, so this migration only renames — it adds
 * nothing.
 *
 * Renames (old → new):
 * - Tables: areas → locations · area_types → location_types ·
 *   area_staff_requirements → location_staff_requirements ·
 *   user_areas → user_locations · schedule_areas → schedule_locations ·
 *   area_plants → location_plants
 * - Columns: area_id → location_id (across every table that carries it) ·
 *   area_type_id → location_type_id (locations) · seed_transactions.to_area_id →
 *   to_location_id
 *
 * NOT renamed (kept by design): metric/domain columns area_name,
 * is_within_area, coverage_area, outside_area_pings, within_area_pings; and the
 * legacy constraint/index names (e.g. chk_areas_opacity, fk_areas_region,
 * idx_areas_rayon) — Postgres keeps them attached to the renamed objects and
 * their names are internal-only, so leaving them is harmless and avoids a large
 * fragile block of ALTER … RENAME CONSTRAINT/INDEX statements. Dependent views
 * (matview area_metrics_daily) auto-follow the table rename.
 *
 * IDEMPOTENT BY DESIGN — every step only fires when the old name still exists
 * and the new one does not, so a single run converges any starting state
 * (migration-built, synchronize-built, or half-renamed) to the same target.
 * `migration:run` alone produces the full schema; never rely on synchronize for
 * staging/prod. Back-compat: controllers keep old routes via array paths, e.g.
 * @Controller(['locations', 'areas']).
 */
export class RenameAreaToLocation17492500000000 implements MigrationInterface {
  name = 'RenameAreaToLocation17492500000000';

  private async tableExists(qr: QueryRunner, name: string): Promise<boolean> {
    const rows = await qr.query(`SELECT to_regclass('public.${name}') AS reg`);
    return rows?.[0]?.reg != null;
  }

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [table, column],
    );
    return rows?.length > 0;
  }

  private async renameTable(qr: QueryRunner, from: string, to: string): Promise<void> {
    if ((await this.tableExists(qr, from)) && !(await this.tableExists(qr, to))) {
      await qr.query(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    }
  }

  private async renameColumn(
    qr: QueryRunner,
    table: string,
    from: string,
    to: string,
  ): Promise<void> {
    if (
      (await this.tableExists(qr, table)) &&
      (await this.columnExists(qr, table, from)) &&
      !(await this.columnExists(qr, table, to))
    ) {
      await qr.query(`ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}"`);
    }
  }

  // Tables that carry an area_id FK, addressed by their POST-rename name.
  private static readonly LOCATION_ID_TABLES = [
    'activities',
    'assets',
    'location_daily_summaries',
    'notable_plants',
    'overtimes',
    'shifts',
    'tasks',
    'user_tracking_status',
    'users',
    'location_plants',
    'location_staff_requirements',
    'schedule_locations',
    'user_locations',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename tables first so the column renames below can target new names.
    await this.renameTable(queryRunner, 'area_types', 'location_types');
    await this.renameTable(queryRunner, 'areas', 'locations');
    await this.renameTable(queryRunner, 'area_staff_requirements', 'location_staff_requirements');
    await this.renameTable(queryRunner, 'user_areas', 'user_locations');
    await this.renameTable(queryRunner, 'schedule_areas', 'schedule_locations');
    await this.renameTable(queryRunner, 'area_plants', 'location_plants');

    // 2. Rename the type FK on locations.
    await this.renameColumn(queryRunner, 'locations', 'area_type_id', 'location_type_id');

    // 3. Rename area_id → location_id everywhere it appears.
    for (const table of RenameAreaToLocation17492500000000.LOCATION_ID_TABLES) {
      await this.renameColumn(queryRunner, table, 'area_id', 'location_id');
    }

    // 4. seed_transactions.to_area_id → to_location_id (distinct column name).
    await this.renameColumn(queryRunner, 'seed_transactions', 'to_area_id', 'to_location_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.renameColumn(queryRunner, 'seed_transactions', 'to_location_id', 'to_area_id');

    for (const table of RenameAreaToLocation17492500000000.LOCATION_ID_TABLES) {
      await this.renameColumn(queryRunner, table, 'location_id', 'area_id');
    }

    await this.renameColumn(queryRunner, 'locations', 'location_type_id', 'area_type_id');

    await this.renameTable(queryRunner, 'location_plants', 'area_plants');
    await this.renameTable(queryRunner, 'schedule_locations', 'schedule_areas');
    await this.renameTable(queryRunner, 'user_locations', 'user_areas');
    await this.renameTable(queryRunner, 'location_staff_requirements', 'area_staff_requirements');
    await this.renameTable(queryRunner, 'locations', 'areas');
    await this.renameTable(queryRunner, 'location_types', 'area_types');
  }
}
