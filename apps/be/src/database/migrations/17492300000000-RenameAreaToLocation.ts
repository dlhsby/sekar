import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename Area → Location across all tables and columns.
 *
 * Renames (old → new):
 * - Tables: areas → locations · area_types → location_types ·
 *   area_staff_requirements → location_staff_requirements ·
 *   user_areas → user_locations · schedule_areas → schedule_locations ·
 *   area_plants → location_plants
 * - Columns: area_id → location_id (locations FKs across 8 tables) ·
 *   area_type_id → location_type_id (locations)
 * - Adds locations.region_id (nullable; the Region/Kawasan tier is not built
 *   yet — column exists so the entity + monitoring reads resolve).
 *
 * IDEMPOTENT BY DESIGN. Every step is guarded so it only fires when the old
 * name still exists and the new name does not. This is required because parts
 * of this rename already reached some databases through TypeORM `synchronize`
 * (dev historically ran with synchronize) or through earlier migrations that
 * were edited to the new names. The guards let a single run converge ANY of
 * those starting states — fresh-migrated, half-renamed, or synchronize-built —
 * to the identical target schema. Never rely on synchronize for prod/staging;
 * `migration:run` alone now produces the full schema.
 *
 * Backward compatibility: mobile/web keep the old routes via controller array
 * paths, e.g. @Controller(['locations', 'areas']).
 */
export class RenameAreaToLocation17492300000000 implements MigrationInterface {
  name = 'RenameAreaToLocation17492300000000';

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

  /** Rename a table only when the old name exists and the new one does not. */
  private async renameTable(qr: QueryRunner, from: string, to: string): Promise<void> {
    if ((await this.tableExists(qr, from)) && !(await this.tableExists(qr, to))) {
      await qr.query(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    }
  }

  /** Rename a column only when the old name exists and the new one does not. */
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Core tables.
    await this.renameTable(queryRunner, 'area_types', 'location_types');
    await this.renameTable(queryRunner, 'areas', 'locations');
    await this.renameColumn(queryRunner, 'locations', 'area_type_id', 'location_type_id');

    // Dependent tables + their area_id FK column.
    await this.renameTable(queryRunner, 'area_staff_requirements', 'location_staff_requirements');
    await this.renameColumn(queryRunner, 'location_staff_requirements', 'area_id', 'location_id');

    await this.renameTable(queryRunner, 'user_areas', 'user_locations');
    await this.renameColumn(queryRunner, 'user_locations', 'area_id', 'location_id');

    await this.renameTable(queryRunner, 'schedule_areas', 'schedule_locations');
    await this.renameColumn(queryRunner, 'schedule_locations', 'area_id', 'location_id');

    await this.renameTable(queryRunner, 'area_plants', 'location_plants');
    await this.renameColumn(queryRunner, 'location_plants', 'area_id', 'location_id');

    // Remaining tables that carry an area_id FK to areas/locations.
    for (const table of ['users', 'overtimes', 'user_tracking_status', 'assets']) {
      await this.renameColumn(queryRunner, table, 'area_id', 'location_id');
    }

    // The Region/Kawasan tier (ADR-045) isn't built yet, but the Location
    // entity + monitoring already read region_id — add it as a nullable column
    // (no FK: no regions table yet). IF NOT EXISTS keeps this idempotent.
    if (await this.tableExists(queryRunner, 'locations')) {
      await queryRunner.query(`ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "region_id" uuid`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'locations')) {
      await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN IF EXISTS "region_id"`);
    }

    for (const table of ['assets', 'user_tracking_status', 'overtimes', 'users']) {
      await this.renameColumn(queryRunner, table, 'location_id', 'area_id');
    }

    await this.renameColumn(queryRunner, 'location_plants', 'location_id', 'area_id');
    await this.renameTable(queryRunner, 'location_plants', 'area_plants');

    await this.renameColumn(queryRunner, 'schedule_locations', 'location_id', 'area_id');
    await this.renameTable(queryRunner, 'schedule_locations', 'schedule_areas');

    await this.renameColumn(queryRunner, 'user_locations', 'location_id', 'area_id');
    await this.renameTable(queryRunner, 'user_locations', 'user_areas');

    await this.renameColumn(queryRunner, 'location_staff_requirements', 'location_id', 'area_id');
    await this.renameTable(queryRunner, 'location_staff_requirements', 'area_staff_requirements');

    await this.renameColumn(queryRunner, 'locations', 'location_type_id', 'area_type_id');
    await this.renameTable(queryRunner, 'locations', 'areas');

    await this.renameTable(queryRunner, 'location_types', 'area_types');
  }
}
