import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Staffing capacity per location + shift (target satgas+linmas headcount).
 * Drives the understaffed indicator on the schedule board + monitoring.
 * Idempotent.
 */
export class LocationShiftCapacity17494100000000 implements MigrationInterface {
  name = 'LocationShiftCapacity17494100000000';

  private async tableExists(qr: QueryRunner, name: string): Promise<boolean> {
    const rows = await qr.query(`SELECT to_regclass($1) AS reg`, [`public.${name}`]);
    return rows?.[0]?.reg != null;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await this.tableExists(queryRunner, 'location_shift_capacity')) return;
    await queryRunner.query(`
      CREATE TABLE "location_shift_capacity" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
        "shift_definition_id" uuid NOT NULL REFERENCES "shift_definitions"("id") ON DELETE CASCADE,
        "target_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_location_shift_capacity" UNIQUE ("location_id", "shift_definition_id"),
        CONSTRAINT "chk_location_shift_capacity_target" CHECK ("target_count" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_location_shift_capacity_location" ON "location_shift_capacity" ("location_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "location_shift_capacity"`);
  }
}
