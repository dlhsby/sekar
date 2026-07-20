import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename the domain term `rayon` → `district` at the DB level (2026-07-20).
 *
 * Code/DB/English-UI standardise on **district**; the Indonesian UI keeps
 * showing "Rayon" (i18n only). This migration renames the `rayons` table →
 * `districts` and every `rayon_id` / `to_rayon_id` FK column → `district_id` /
 * `to_district_id` across the 14 tables that carry it. Data is untouched — the
 * district *names* ("Rayon Pusat", …) remain as stored (they're Indonesian
 * display labels).
 *
 * FK constraint + index NAMES that embed "rayon" are intentionally left as-is
 * (cosmetic; renaming them is not worth the churn and TypeORM matches on the
 * explicit names the entities declare). Idempotent + reversible.
 */
export class RenameRayonToDistrict17510000000000 implements MigrationInterface {
  name = 'RenameRayonToDistrict17510000000000';

  // (table, column) pairs to rename rayon_id → district_id. `seed_transactions`
  // uses `to_rayon_id` and is handled separately below.
  private readonly cols: Array<[string, string, string]> = [
    ['assets', 'rayon_id', 'district_id'],
    ['kecamatans', 'rayon_id', 'district_id'],
    ['location_daily_summaries', 'rayon_id', 'district_id'],
    ['location_staff_requirements', 'rayon_id', 'district_id'],
    ['locations', 'rayon_id', 'district_id'],
    ['pruning_requests', 'rayon_id', 'district_id'],
    ['regions', 'rayon_id', 'district_id'],
    ['schedule_events', 'rayon_id', 'district_id'],
    ['schedules', 'rayon_id', 'district_id'],
    ['service_capacity', 'rayon_id', 'district_id'],
    ['tasks', 'rayon_id', 'district_id'],
    ['user_tracking_status', 'rayon_id', 'district_id'],
    ['users', 'rayon_id', 'district_id'],
    ['seed_transactions', 'to_rayon_id', 'to_district_id'],
  ];

  private async tableExists(qr: QueryRunner, table: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [table],
    );
    return rows?.length > 0;
  }

  private async columnExists(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, column],
    );
    return rows?.length > 0;
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, from, to] of this.cols) {
      await this.renameColumn(queryRunner, table, from, to);
    }
    if (
      (await this.tableExists(queryRunner, 'rayons')) &&
      !(await this.tableExists(queryRunner, 'districts'))
    ) {
      await queryRunner.query(`ALTER TABLE "rayons" RENAME TO "districts"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      (await this.tableExists(queryRunner, 'districts')) &&
      !(await this.tableExists(queryRunner, 'rayons'))
    ) {
      await queryRunner.query(`ALTER TABLE "districts" RENAME TO "rayons"`);
    }
    for (const [table, from, to] of this.cols) {
      // reverse: to → from
      await this.renameColumn(queryRunner, table, to, from);
    }
  }
}
