import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit trail v2 (ADR-061) — append-only, tamper-evident audit_logs.
 *
 * 1. Columns: actor/entity snapshots, field diff, reason, outcome, source,
 *    request context (ip, user agent, request id), cascade parent, and the
 *    hash chain (seq, prev_hash, hash, sealed_at). actor_id / entity_id become
 *    nullable (system actions; login/denied events without one target row).
 * 2. `seq` — monotonic insertion order the chain follows. Existing rows are
 *    numbered by created_at, then the sequence continues from there.
 * 3. Guard trigger: DELETE and TRUNCATE are refused; UPDATE is allowed ONLY as
 *    the one-time seal of an unsealed row (prev_hash/hash/sealed_at). The seeder
 *    may wipe dev data by setting `sekar.audit_maintenance = 'on'` for its
 *    session — anyone able to do that could also drop the trigger, so the
 *    chain (not the trigger) is the tamper evidence.
 * 4. `audit_seal(batch)` chains unsealed rows (in seq order among those
 *    visible) and gives each the next `chain_pos`:
 *      hash = sha256(prev_hash || canonical(row))
 *    The chain follows `chain_pos`, NOT `seq`: seq is taken at insert, but
 *    transactions commit out of order, so a lower seq can become visible after
 *    a higher one was already sealed. Verifying by seq would flag that as
 *    tampering.
 *    computed entirely in SQL so `audit_verify()` reproduces it byte-for-byte.
 *    Sealing runs out-of-band (a cron), so audited writes never contend on a
 *    global lock; the unsealed window is the cron interval.
 *
 * DO NOT RENAME this class — TypeORM keys applied migrations by className + timestamp.
 */
export class AuditTrailV217544000000000 implements MigrationInterface {
  name = 'AuditTrailV217544000000000';

  public async up(qr: QueryRunner): Promise<void> {
    const cols = [
      'entity_label varchar(200)',
      'actor_role varchar(50)',
      'actor_name varchar(150)',
      'changes jsonb',
      'reason text',
      `outcome varchar(10) NOT NULL DEFAULT 'success'`,
      `source varchar(10) NOT NULL DEFAULT 'api'`,
      'ip varchar(45)',
      'user_agent varchar(300)',
      'request_id varchar(64)',
      'parent_id uuid',
      'seq bigint',
      'chain_pos bigint',
      'prev_hash char(64)',
      'hash char(64)',
      'sealed_at timestamptz',
    ];
    for (const c of cols) {
      await qr.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ${c}`);
    }
    await qr.query(`ALTER TABLE audit_logs ALTER COLUMN actor_id DROP NOT NULL`);
    await qr.query(`ALTER TABLE audit_logs ALTER COLUMN entity_id DROP NOT NULL`);

    // Number existing rows by time, then hand the column to a sequence.
    await qr.query(`CREATE SEQUENCE IF NOT EXISTS audit_logs_seq_seq OWNED BY audit_logs.seq`);
    await qr.query(`
      UPDATE audit_logs a SET seq = n.rn
      FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM audit_logs) n
      WHERE a.id = n.id AND a.seq IS NULL`);
    await qr.query(
      `SELECT setval('audit_logs_seq_seq', GREATEST((SELECT COALESCE(MAX(seq), 0) FROM audit_logs), 1), (SELECT COUNT(*) > 0 FROM audit_logs))`,
    );
    await qr.query(
      `ALTER TABLE audit_logs ALTER COLUMN seq SET DEFAULT nextval('audit_logs_seq_seq')`,
    );
    await qr.query(`ALTER TABLE audit_logs ALTER COLUMN seq SET NOT NULL`);
    await qr.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_logs_seq ON audit_logs (seq)`);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_unsealed ON audit_logs (seq) WHERE hash IS NULL`,
    );
    await qr.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_logs_chain_pos ON audit_logs (chain_pos)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)`,
    );
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time ON audit_logs (actor_id, created_at DESC)`,
    );
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_parent ON audit_logs (parent_id)`);

    await qr.query(`
      CREATE OR REPLACE FUNCTION audit_logs_canonical(r audit_logs) RETURNS text
      LANGUAGE sql IMMUTABLE AS $$
        SELECT jsonb_build_object(
          'seq', r.seq, 'id', r.id,
          'created_at', to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
          'entity_type', r.entity_type, 'entity_id', r.entity_id, 'entity_label', r.entity_label,
          'action', r.action, 'actor_id', r.actor_id, 'actor_role', r.actor_role,
          'actor_name', r.actor_name, 'old_value', r.old_value, 'new_value', r.new_value,
          'changes', r.changes, 'metadata', r.metadata, 'reason', r.reason,
          'outcome', r.outcome, 'source', r.source, 'ip', r.ip, 'user_agent', r.user_agent,
          'request_id', r.request_id, 'parent_id', r.parent_id
        )::text
      $$`);

    await qr.query(`
      CREATE OR REPLACE FUNCTION audit_logs_guard() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('sekar.audit_maintenance', true) = 'on' THEN
          RETURN COALESCE(NEW, OLD);
        END IF;
        IF TG_OP = 'TRUNCATE' OR TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'audit_logs is append-only (% refused)', TG_OP
            USING ERRCODE = 'insufficient_privilege';
        END IF;
        IF OLD.hash IS NOT NULL THEN
          RAISE EXCEPTION 'audit_logs row % is sealed and cannot change', OLD.seq
            USING ERRCODE = 'insufficient_privilege';
        END IF;
        IF (to_jsonb(NEW) - 'prev_hash' - 'hash' - 'sealed_at' - 'chain_pos')
           IS DISTINCT FROM (to_jsonb(OLD) - 'prev_hash' - 'hash' - 'sealed_at' - 'chain_pos') THEN
          RAISE EXCEPTION 'audit_logs rows are immutable; only sealing may update them'
            USING ERRCODE = 'insufficient_privilege';
        END IF;
        RETURN NEW;
      END $$`);
    await qr.query(`DROP TRIGGER IF EXISTS trg_audit_logs_guard_row ON audit_logs`);
    await qr.query(`
      CREATE TRIGGER trg_audit_logs_guard_row BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION audit_logs_guard()`);
    await qr.query(`DROP TRIGGER IF EXISTS trg_audit_logs_guard_truncate ON audit_logs`);
    await qr.query(`
      CREATE TRIGGER trg_audit_logs_guard_truncate BEFORE TRUNCATE ON audit_logs
      FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_guard()`);

    await qr.query(`
      CREATE OR REPLACE FUNCTION audit_seal(batch integer) RETURNS integer
      LANGUAGE plpgsql AS $$
      DECLARE
        prev char(64);
        pos bigint;
        r audit_logs;
        n integer := 0;
      BEGIN
        SELECT hash, chain_pos INTO prev, pos FROM audit_logs
         WHERE hash IS NOT NULL ORDER BY chain_pos DESC LIMIT 1;
        pos := COALESCE(pos, 0);
        FOR r IN
          SELECT * FROM audit_logs WHERE hash IS NULL ORDER BY seq LIMIT batch FOR UPDATE
        LOOP
          UPDATE audit_logs
             SET chain_pos = pos + 1,
                 prev_hash = prev,
                 hash = encode(sha256(convert_to(COALESCE(prev, '') || audit_logs_canonical(r), 'UTF8')), 'hex'),
                 sealed_at = now()
           WHERE id = r.id
           RETURNING hash INTO prev;
          pos := pos + 1;
          n := n + 1;
        END LOOP;
        RETURN n;
      END $$`);

    await qr.query(`
      CREATE OR REPLACE FUNCTION audit_verify()
      RETURNS TABLE (sealed bigint, unsealed bigint, first_broken_seq bigint, last_hash char(64))
      LANGUAGE plpgsql STABLE AS $$
      DECLARE
        prev char(64) := NULL;
        r audit_logs;
        expected char(64);
      BEGIN
        sealed := 0;
        first_broken_seq := NULL;
        FOR r IN SELECT * FROM audit_logs WHERE hash IS NOT NULL ORDER BY chain_pos LOOP
          expected := encode(sha256(convert_to(COALESCE(prev, '') || audit_logs_canonical(r), 'UTF8')), 'hex');
          IF r.prev_hash IS DISTINCT FROM prev OR r.hash <> expected THEN
            first_broken_seq := r.seq;
            EXIT;
          END IF;
          prev := r.hash;
          sealed := sealed + 1;
        END LOOP;
        last_hash := prev;
        SELECT COUNT(*) INTO unsealed FROM audit_logs WHERE hash IS NULL;
        RETURN NEXT;
      END $$`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TRIGGER IF EXISTS trg_audit_logs_guard_row ON audit_logs`);
    await qr.query(`DROP TRIGGER IF EXISTS trg_audit_logs_guard_truncate ON audit_logs`);
    await qr.query(`DROP FUNCTION IF EXISTS audit_verify()`);
    await qr.query(`DROP FUNCTION IF EXISTS audit_seal(integer)`);
    await qr.query(`DROP FUNCTION IF EXISTS audit_logs_guard()`);
    await qr.query(`DROP FUNCTION IF EXISTS audit_logs_canonical(audit_logs)`);
    for (const idx of [
      'uq_audit_logs_seq',
      'uq_audit_logs_chain_pos',
      'idx_audit_logs_unsealed',
      'idx_audit_logs_created_at',
      'idx_audit_logs_actor_time',
      'idx_audit_logs_parent',
    ]) {
      await qr.query(`DROP INDEX IF EXISTS ${idx}`);
    }
    // Rows without an actor/entity (system, login events) cannot satisfy NOT NULL
    // again; they are kept, so the NOT NULLs are intentionally not restored.
    for (const c of [
      'sealed_at',
      'hash',
      'prev_hash',
      'chain_pos',
      'seq',
      'parent_id',
      'request_id',
      'user_agent',
      'ip',
      'source',
      'outcome',
      'reason',
      'changes',
      'actor_name',
      'actor_role',
      'entity_label',
    ]) {
      await qr.query(`ALTER TABLE audit_logs DROP COLUMN IF EXISTS ${c}`);
    }
  }
}
