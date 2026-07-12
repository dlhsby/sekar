import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconcile schema artifacts that had only ever been created by TypeORM
 * `synchronize` (dev historically ran with synchronize) and were never
 * captured by a migration. Without these, `migration:run` alone
 * (staging/prod, synchronize=false) produces a schema that fails at runtime:
 *
 * 1. locations per-level map-styling columns (ADR-045) — the /locations query
 *    selects border_color/fill_color/…; missing them → "column area.border_color
 *    does not exist".
 * 2. UNIQUE constraints the seed's ON CONFLICT relies on:
 *    - plant_species(name_id)  — @Unique(['nameId'])
 *    - activities(reference_code) — @Column({ unique: true })
 *    Missing them → "no unique or exclusion constraint matching the ON CONFLICT
 *    specification".
 *
 * IDEMPOTENT: ADD COLUMN IF NOT EXISTS + guarded constraint adds, so this is a
 * no-op on databases already built (or partially built) by synchronize.
 * Companion to 17492300000000 (RenameAreaToLocation); together they make the
 * migration path self-sufficient — never rely on synchronize for prod/staging.
 */
export class ReconcileSyncOnlyArtifacts17492400000000 implements MigrationInterface {
  name = 'ReconcileSyncOnlyArtifacts17492400000000';

  private async tableExists(qr: QueryRunner, name: string): Promise<boolean> {
    const rows = await qr.query(`SELECT to_regclass('public.${name}') AS reg`);
    return rows?.[0]?.reg != null;
  }

  /** True when some single-column UNIQUE constraint already covers [column]. */
  private async hasUniqueOn(qr: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = await qr.query(
      `SELECT 1
       FROM pg_constraint con
       JOIN pg_class rel ON rel.oid = con.conrelid
       JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
       WHERE con.contype = 'u'
         AND rel.relname = $1
         AND array_length(con.conkey, 1) = 1
         AND att.attname = $2`,
      [table, column],
    );
    return rows?.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. locations per-level map-styling columns (all nullable) ──
    if (await this.tableExists(queryRunner, 'locations')) {
      const columns: Array<[string, string]> = [
        ['border_color', 'character varying(9)'],
        ['fill_color', 'character varying(9)'],
        ['border_opacity', 'numeric(3,2)'],
        ['fill_opacity', 'numeric(3,2)'],
        ['marker_icon', 'character varying(50)'],
        ['marker_image_url', 'text'],
      ];
      for (const [name, type] of columns) {
        await queryRunner.query(
          `ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "${name}" ${type}`,
        );
      }
    }

    // ── 2. UNIQUE constraints the seed's ON CONFLICT arbitrates on ──
    if (
      (await this.tableExists(queryRunner, 'plant_species')) &&
      !(await this.hasUniqueOn(queryRunner, 'plant_species', 'name_id'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "plant_species" ADD CONSTRAINT "UQ_plant_species_name_id" UNIQUE ("name_id")`,
      );
    }
    if (
      (await this.tableExists(queryRunner, 'activities')) &&
      !(await this.hasUniqueOn(queryRunner, 'activities', 'reference_code'))
    ) {
      await queryRunner.query(
        `ALTER TABLE "activities" ADD CONSTRAINT "UQ_activities_reference_code" UNIQUE ("reference_code")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "UQ_activities_reference_code"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plant_species" DROP CONSTRAINT IF EXISTS "UQ_plant_species_name_id"`,
    );
    for (const name of [
      'border_color',
      'fill_color',
      'border_opacity',
      'fill_opacity',
      'marker_icon',
      'marker_image_url',
    ]) {
      await queryRunner.query(`ALTER TABLE "locations" DROP COLUMN IF EXISTS "${name}"`);
    }
  }
}
