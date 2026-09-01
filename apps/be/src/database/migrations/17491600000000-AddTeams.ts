import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teams (ADR-048): `team_types` catalog + `teams` master data. Additive +
 * idempotent — safe on live staging. Seeds the four initial crew types.
 */
export class AddTeams17491600000000 implements MigrationInterface {
  name = 'AddTeams17491600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "team_types" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(60) NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_team_types" PRIMARY KEY ("id"),
        CONSTRAINT "uq_team_types_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "name" VARCHAR(100) NOT NULL,
        "team_type_id" UUID NOT NULL,
        "marker_icon" VARCHAR(50),
        "marker_color" VARCHAR(9),
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID, "updated_by" UUID, "deleted_by" UUID,
        CONSTRAINT "pk_teams" PRIMARY KEY ("id"),
        CONSTRAINT "fk_teams_type" FOREIGN KEY ("team_type_id") REFERENCES "team_types" ("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_teams_type" ON "teams" ("team_type_id")`,
    );

    // Seed the four initial crew types (idempotent).
    await queryRunner.query(`
      INSERT INTO "team_types" ("name") VALUES
        ('Perawatan'), ('Penyiraman'), ('Penanaman'), ('Penyapuan')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "teams"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "team_types"`);
  }
}
