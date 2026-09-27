import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Role-level user-form scope + assignment limits (ADR-044 amendment, UAT).
 *
 * 1. `roles.home_scope` (`none` | `district`) — whether a user of this role must
 *    have a home rayon. Until now the backend derived it from
 *    `monitoring_scope IN ('district','region')`, which made **korlap**
 *    (monitoring_scope = region) require a rayon while the web form hides the
 *    field for korlap — so saving a korlap failed. Monitoring reach and org
 *    membership are different facts; this column states the second one.
 *    Backfill: kepala_rayon / admin_rayon → district; custom roles keep what the
 *    old rule implied for monitoring_scope = district; everything else → none.
 * 2. `roles.max_places_per_shift` / `roles.max_teams_per_shift` — how many
 *    individual places and team memberships one person of this role may hold in
 *    the SAME shift (NULL = unlimited). Seeded: satgas/linmas 1 place + 1 team;
 *    korlap unlimited. Enforced by the unified assignment policy (next PR).
 *
 * Idempotent. DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class RoleHomeScopeAndLimits17545000000000 implements MigrationInterface {
  name = 'RoleHomeScopeAndLimits17545000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE roles ADD COLUMN IF NOT EXISTS home_scope varchar(10) NOT NULL DEFAULT 'none'`,
    );
    await qr.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_places_per_shift integer NULL`);
    await qr.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_teams_per_shift integer NULL`);

    await qr.query(`
      DO $$ BEGIN
        ALTER TABLE roles ADD CONSTRAINT chk_roles_home_scope CHECK (home_scope IN ('none', 'district'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await qr.query(`
      DO $$ BEGIN
        ALTER TABLE roles ADD CONSTRAINT chk_roles_assignment_limits
          CHECK ((max_places_per_shift IS NULL OR max_places_per_shift >= 1)
             AND (max_teams_per_shift IS NULL OR max_teams_per_shift >= 0));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`);

    await qr.query(`
      UPDATE roles SET home_scope = 'district'
       WHERE code IN ('kepala_rayon', 'admin_rayon')
          OR (is_system = false AND monitoring_scope = 'district')`);
    await qr.query(`
      UPDATE roles SET max_places_per_shift = 1, max_teams_per_shift = 1
       WHERE code IN ('satgas', 'linmas')
         AND max_places_per_shift IS NULL AND max_teams_per_shift IS NULL`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_assignment_limits`);
    await qr.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_home_scope`);
    await qr.query(`ALTER TABLE roles DROP COLUMN IF EXISTS max_teams_per_shift`);
    await qr.query(`ALTER TABLE roles DROP COLUMN IF EXISTS max_places_per_shift`);
    await qr.query(`ALTER TABLE roles DROP COLUMN IF EXISTS home_scope`);
  }
}
