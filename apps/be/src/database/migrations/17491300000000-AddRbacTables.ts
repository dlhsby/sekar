import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Dynamic RBAC schema (ADR-044): roles, permissions, role_permissions.
 * Purely additive — no changes to existing tables — safe on live staging.
 * Idempotent (IF NOT EXISTS) so re-runs are no-ops.
 */
export class AddRbacTables17491300000000 implements MigrationInterface {
  name = 'AddRbacTables17491300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "key" VARCHAR(100) NOT NULL,
        "description" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_permissions_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_system" BOOLEAN NOT NULL DEFAULT FALSE,
        "monitoring_scope" VARCHAR(20) NOT NULL DEFAULT 'none',
        "marker_icon" VARCHAR(50),
        "marker_color" VARCHAR(9),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" UUID,
        "updated_by" UUID,
        "deleted_by" UUID,
        CONSTRAINT "pk_roles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_roles_code" UNIQUE ("code")
      )
    `);

    // Guarded check constraints (Postgres has no ADD CONSTRAINT IF NOT EXISTS).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_roles_monitoring_scope') THEN
          ALTER TABLE "roles" ADD CONSTRAINT "chk_roles_monitoring_scope"
            CHECK ("monitoring_scope" IN ('city','district','region','location','none'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_roles_marker_color') THEN
          ALTER TABLE "roles" ADD CONSTRAINT "chk_roles_marker_color"
            CHECK ("marker_color" IS NULL OR "marker_color" ~ '^#[0-9A-Fa-f]{6}$');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" UUID NOT NULL,
        "permission_id" UUID NOT NULL,
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id")
          REFERENCES "roles" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_role_permissions_permission" FOREIGN KEY ("permission_id")
          REFERENCES "permissions" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_role_permissions_role" ON "role_permissions" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_role_permissions_permission" ON "role_permissions" ("permission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_roles_is_system" ON "roles" ("is_system")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
  }
}
