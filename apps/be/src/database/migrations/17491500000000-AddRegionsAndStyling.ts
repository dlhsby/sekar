import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Four-level location hierarchy (ADR-045): new `regions` (Kawasan) table between
 * rayon and area, per-level map styling on rayons/regions/areas, `areas.region_id`
 * (FK → regions, SET NULL) and `users.region_id`. Additive + idempotent — safe on
 * live staging.
 */
export class AddRegionsAndStyling17491500000000 implements MigrationInterface {
  name = 'AddRegionsAndStyling17491500000000';

  // Shared per-level styling columns (border/fill color + opacity + marker).
  private stylingColumns(table: string): string {
    return `
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "border_color" VARCHAR(9);
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "fill_color" VARCHAR(9);
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "border_opacity" NUMERIC(3,2);
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "fill_opacity" NUMERIC(3,2);
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "marker_icon" VARCHAR(50);
      ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "marker_color" VARCHAR(9);
    `;
  }

  private opacityCheck(table: string): string {
    return `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_${table}_opacity') THEN
          ALTER TABLE "${table}" ADD CONSTRAINT "chk_${table}_opacity" CHECK (
            ("border_opacity" IS NULL OR ("border_opacity" >= 0 AND "border_opacity" <= 1)) AND
            ("fill_opacity" IS NULL OR ("fill_opacity" >= 0 AND "fill_opacity" <= 1))
          );
        END IF;
      END $$;
    `;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "regions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "rayon_id" UUID NOT NULL,
        "description" TEXT,
        "boundary_polygon" JSONB,
        "center_lat" NUMERIC(10,8),
        "center_lng" NUMERIC(11,8),
        "border_color" VARCHAR(9),
        "fill_color" VARCHAR(9),
        "border_opacity" NUMERIC(3,2),
        "fill_opacity" NUMERIC(3,2),
        "marker_icon" VARCHAR(50),
        "marker_color" VARCHAR(9),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "deleted_by" UUID,
        CONSTRAINT "pk_regions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_regions_rayon" FOREIGN KEY ("rayon_id") REFERENCES "rayons" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_regions_opacity" CHECK (
          ("border_opacity" IS NULL OR ("border_opacity" >= 0 AND "border_opacity" <= 1)) AND
          ("fill_opacity" IS NULL OR ("fill_opacity" >= 0 AND "fill_opacity" <= 1))
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_regions_rayon" ON "regions" ("rayon_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uidx_regions_rayon_name" ON "regions" ("rayon_id", "name") WHERE "deleted_at" IS NULL`,
    );

    // Per-level styling on the existing tiers.
    await queryRunner.query(this.stylingColumns('rayons'));
    await queryRunner.query(this.opacityCheck('rayons'));
    await queryRunner.query(this.stylingColumns('areas'));
    await queryRunner.query(this.opacityCheck('areas'));

    // areas.region_id (nullable FK → regions, SET NULL on delete).
    await queryRunner.query(`ALTER TABLE "areas" ADD COLUMN IF NOT EXISTS "region_id" UUID`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_areas_region') THEN
          ALTER TABLE "areas" ADD CONSTRAINT "fk_areas_region"
            FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_areas_region" ON "areas" ("region_id")`,
    );

    // users.region_id (nullable, no FK — matches users.rayon_id convention).
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "region_id" UUID`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "region_id"`);
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "fk_areas_region"`);
    await queryRunner.query(`ALTER TABLE "areas" DROP COLUMN IF EXISTS "region_id"`);
    await queryRunner.query(`ALTER TABLE "areas" DROP CONSTRAINT IF EXISTS "chk_areas_opacity"`);
    await queryRunner.query(`ALTER TABLE "rayons" DROP CONSTRAINT IF EXISTS "chk_rayons_opacity"`);
    for (const table of ['rayons', 'areas']) {
      for (const col of [
        'border_color',
        'fill_color',
        'border_opacity',
        'fill_opacity',
        'marker_icon',
        'marker_color',
      ]) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${col}"`);
      }
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "regions"`);
  }
}
