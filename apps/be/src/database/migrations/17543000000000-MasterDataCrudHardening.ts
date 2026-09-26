import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Master-data CRUD hardening (fix/master-data-crud).
 *
 * 1. `team_categories` becomes soft-deletable (deleted_at) and actor-stamped
 *    (created_by/updated_by/deleted_by) like every other catalog table.
 * 2. Name/code uniqueness is enforced among LIVE rows only. A full UNIQUE on a
 *    soft-deleted table means a deleted "Rayon Timur" can never be re-created —
 *    the insert collides with the tombstone and surfaces as "already exists".
 *    Each full constraint/index on the single column is replaced by a partial
 *    unique index `WHERE deleted_at IS NULL`. A constraint that backs a foreign
 *    key cannot be replaced by a partial index, so those are left alone.
 * 3. Permission catalog changes:
 *    - new `shift-definition:*` / `holiday:*` keys (city-wide scheduling config, split from
 *      `schedule:*` which rayon roles hold) granted to management;
 *    - `team:manage` retired in favour of team:create/update/delete — roles that
 *      held it get those three first, so nobody loses access;
 *    - kepala_rayon/admin_rayon lose user/area write grants: the services have
 *      no own-district scoping yet, so those grants meant city-wide writes.
 *
 * Idempotent. DO NOT RENAME this class — TypeORM keys applied migrations by
 * className + timestamp.
 */
const LIVE_UNIQUE: Array<{ table: string; column: string; index: string }> = [
  { table: 'team_categories', column: 'name', index: 'uq_team_categories_name_live' },
  { table: 'districts', column: 'name', index: 'uq_districts_name_live' },
  { table: 'location_types', column: 'code', index: 'uq_location_types_code_live' },
  { table: 'shift_definitions', column: 'name', index: 'uq_shift_definitions_name_live' },
];

const NEW_PERMISSIONS: Array<[string, string]> = [
  ['shift-definition:create', 'Tambah Definisi Shift'],
  ['shift-definition:update', 'Ubah Definisi Shift'],
  ['shift-definition:delete', 'Hapus Definisi Shift'],
  ['shift-definition:*', 'Semua aksi Definisi Shift'],
  ['holiday:create', 'Tambah Hari Libur'],
  ['holiday:update', 'Ubah Hari Libur'],
  ['holiday:delete', 'Hapus Hari Libur'],
  ['holiday:*', 'Semua aksi Hari Libur'],
];

const RAYON_REVOKED = ['user:create', 'user:update', 'area:create', 'area:update', 'area:delete'];

export class MasterDataCrudHardening17543000000000 implements MigrationInterface {
  name = 'MasterDataCrudHardening17543000000000';

  public async up(qr: QueryRunner): Promise<void> {
    for (const col of [
      'deleted_at timestamptz',
      'created_by uuid',
      'updated_by uuid',
      'deleted_by uuid',
    ]) {
      await qr.query(`ALTER TABLE team_categories ADD COLUMN IF NOT EXISTS ${col} NULL`);
    }

    for (const u of LIVE_UNIQUE) {
      await this.replaceWithLiveUnique(qr, u.table, u.column, u.index);
    }

    await this.migratePermissions(qr);
  }

  public async down(qr: QueryRunner): Promise<void> {
    // Permission grants are operator data once applied; not reverted.
    for (const u of LIVE_UNIQUE) {
      await qr.query(`DROP INDEX IF EXISTS "${u.index}"`);
      // Re-adding a full UNIQUE can fail if tombstones share a name; that is the
      // point of this migration, so down() restores it best-effort only.
      await qr.query(
        `DO $$ BEGIN
           ALTER TABLE "${u.table}" ADD CONSTRAINT "UQ_${u.table}_${u.column}" UNIQUE ("${u.column}");
         EXCEPTION WHEN others THEN RAISE NOTICE 'skip UNIQUE ${u.table}.${u.column}: %', SQLERRM;
         END $$`,
      );
    }
    for (const col of ['deleted_by', 'updated_by', 'created_by', 'deleted_at']) {
      await qr.query(`ALTER TABLE team_categories DROP COLUMN IF EXISTS ${col}`);
    }
  }

  /** Drop every full single-column unique constraint/index on table.column
   *  (unless an FK depends on it), then create the partial live-row index. */
  private async replaceWithLiveUnique(
    qr: QueryRunner,
    table: string,
    column: string,
    index: string,
  ): Promise<void> {
    await qr.query(
      `DO $$
       DECLARE r record;
       BEGIN
         FOR r IN
           SELECT c.conname
           FROM pg_constraint c
           JOIN pg_class t ON t.oid = c.conrelid
           JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
           WHERE t.relname = '${table}' AND c.contype = 'u'
             AND array_length(c.conkey, 1) = 1 AND a.attname = '${column}'
             AND NOT EXISTS (SELECT 1 FROM pg_constraint f WHERE f.contype = 'f' AND f.conindid = c.conindid)
         LOOP
           EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', '${table}', r.conname);
         END LOOP;
         FOR r IN
           SELECT i.relname AS idx
           FROM pg_index x
           JOIN pg_class i ON i.oid = x.indexrelid
           JOIN pg_class t ON t.oid = x.indrelid
           JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = x.indkey[0]
           WHERE t.relname = '${table}' AND x.indisunique AND NOT x.indisprimary
             AND x.indnatts = 1 AND x.indpred IS NULL AND a.attname = '${column}'
             AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
         LOOP
           EXECUTE format('DROP INDEX %I', r.idx);
         END LOOP;
       END $$`,
    );
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${index}" ON "${table}" ("${column}") WHERE deleted_at IS NULL`,
    );
  }

  private async migratePermissions(qr: QueryRunner): Promise<void> {
    for (const [key, description] of NEW_PERMISSIONS) {
      await qr.query(
        `INSERT INTO permissions (key, description) VALUES ($1, $2)
         ON CONFLICT (key) DO NOTHING`,
        [key, description],
      );
    }
    await this.grant(qr, 'management', ['shift-definition:*', 'holiday:*']);

    // Roles holding team:manage keep equivalent access before it is retired.
    await qr.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT rp.role_id, p2.id
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id AND p.key = 'team:manage'
       JOIN permissions p2 ON p2.key IN ('team:create', 'team:update', 'team:delete')
       ON CONFLICT DO NOTHING`,
    );
    await qr.query(`DELETE FROM permissions WHERE key = 'team:manage'`); // cascades grants

    await qr.query(
      `DELETE FROM role_permissions rp
       USING roles r, permissions p
       WHERE rp.role_id = r.id AND rp.permission_id = p.id
         AND r.code IN ('kepala_rayon', 'admin_rayon')
         AND p.key = ANY ($1)`,
      [RAYON_REVOKED],
    );
  }

  private async grant(qr: QueryRunner, roleCode: string, keys: string[]): Promise<void> {
    await qr.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key = ANY ($2)
       WHERE r.code = $1
       ON CONFLICT DO NOTHING`,
      [roleCode, keys],
    );
  }
}
