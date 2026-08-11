#!/usr/bin/env npx ts-node
/**
 * E2E scenario runner — arranges the catalog, then asserts it over the real API.
 *
 * Two modes:
 *   --mode=local   the dev DB. Subjects are dedicated e2e_* users; a re-run
 *                  wipes their prior rows so the outcome is exact.
 *   --mode=clone   the staging clone. Same catalog, same e2e_* users, layered on
 *                  top of real data and removable with --purge.
 *
 * Assertions go over HTTP, not the service layer, so guards, DTO serialization
 * and the drill endpoints are all in the path — an arrange that succeeds while
 * the API answers wrongly is exactly the failure worth catching.
 *
 * Usage:
 *   npx ts-node scripts/e2e-scenarios/runner.ts --mode=local
 *   npx ts-node scripts/e2e-scenarios/runner.ts --only=ATT-12,MON-18
 *   npx ts-node scripts/e2e-scenarios/runner.ts --verify-only
 *   npx ts-node scripts/e2e-scenarios/runner.ts --purge
 */

import type { DataSource } from 'typeorm';
import { CATALOG, assertCatalogIsSound } from './catalog';
import { arrangeDemoFixtures, clearDemoFixtures } from './fixtures';
import { buildHelpers, wibToday } from './helpers';
import type { Mode, ResolvedSubject, Scenario } from './types';

/**
 * Resolved after the mode is known, because `data-source.ts` reads `process.env`
 * at IMPORT time — a static import would bind the local DB before clone mode
 * could redirect it.
 */
let AppDataSource!: DataSource;

/** Connection defaults for the throwaway staging clone (`staging-clone.sh`). */
const CLONE_DEFAULTS = {
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '15544',
  DATABASE_NAME: 'sekar_staging_clone',
  DATABASE_USER: 'postgres',
  DATABASE_PASSWORD: 'clone',
  DATABASE_SSL: 'false',
};

/**
 * Databases this script must never touch, whatever flags it is given.
 *
 * `sekar_staging` is the LIVE operational database — the clone is
 * `sekar_staging_clone`. One tunnel left open and one mistyped port is all it
 * would take to seed synthetic workers into the system the client is using.
 */
const FORBIDDEN_DATABASES = new Set(['sekar_staging', 'sekar_prod', 'sekar_production']);

/**
 * Point the process at the clone before `data-source.ts` is imported.
 *
 * Overrides are applied to `process.env` rather than passed as options because
 * the DataSource is constructed at import time from exactly those keys — this is
 * the only seam that works without duplicating its entity configuration.
 */
function applyCloneEnv(): void {
  for (const [key, value] of Object.entries(CLONE_DEFAULTS)) {
    // An explicitly-exported value wins, so a differently-provisioned clone
    // (another port, another container) needs no code change.
    if (!process.env[`E2E_${key}`] && !isExplicit(key)) process.env[key] = value;
    else if (process.env[`E2E_${key}`]) process.env[key] = process.env[`E2E_${key}`] as string;
  }
}

/** Was this DB setting deliberately exported for this run? */
const EXPLICIT_DB_KEYS = new Set(
  Object.keys(CLONE_DEFAULTS).filter((k) => process.env[k] !== undefined),
);
function isExplicit(key: string): boolean {
  return EXPLICIT_DB_KEYS.has(key);
}

const args = process.argv.slice(2);
const flag = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const has = (name: string): boolean => args.includes(`--${name}`);

const MODE: Mode = (flag('mode') as Mode) ?? 'local';
const ONLY = flag('only')?.split(',').map((s) => s.trim().toUpperCase());
const VERIFY_ONLY = has('verify-only');
/** Seed the scenarios without asserting — for topping up a demo DB with no API running. */
const ARRANGE_ONLY = has('arrange-only');
const PURGE = has('purge');
const API = process.env.E2E_API ?? 'http://localhost:4110/api/v1';
const ADMIN = process.env.E2E_ADMIN ?? 'superadmin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '12345678';
/** Every subject this catalog owns carries this prefix, so cleanup is exact. */
const PREFIX = 'e2e_';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

interface Result {
  scenario: Scenario;
  failures: string[];
}

async function login(identifier: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${identifier}: HTTP ${res.status}`);
  const body = (await res.json()) as { access_token?: string; data?: { access_token?: string } };
  const token = body.access_token ?? body.data?.access_token;
  if (!token) throw new Error(`login for ${identifier} returned no access_token`);
  return token;
}

/**
 * Provision the subject for a scenario.
 *
 * Dedicated `e2e_*` accounts in BOTH modes, not just clone: it keeps the two
 * runs identical, and it means a local run never mutates a demo persona whose
 * state another test depends on.
 */
async function resolveSubject(s: Scenario): Promise<ResolvedSubject> {
  const ds = AppDataSource;

  // Adopted persona: seeder-owned, so use it as it stands rather than creating
  // anything. Its own lokasi/rayon are the ones the tester sees in manual-uat.
  if (s.subject.adopt) {
    const [row] = (await ds.query(
      `SELECT u.id, u.username, u.location_id, u.district_id, l.region_id
         FROM users u
         LEFT JOIN locations l ON l.id = u.location_id
        WHERE u.username = $1`,
      [s.subject.adopt],
    )) as Array<{
      id: string;
      username: string;
      location_id: string | null;
      district_id: string | null;
      region_id: string | null;
    }>;
    if (!row) {
      throw new Error(
        `${s.id} adopts "${s.subject.adopt}", which does not exist — run \`npm run db:seed\` first.`,
      );
    }
    return {
      userId: row.id,
      username: row.username,
      locationId: row.location_id,
      regionId: row.region_id,
      districtId: row.district_id,
    };
  }

  const username = `${PREFIX}${s.subject.handle}`;

  // The lokasi must be able to SUPPORT the scope the scenario declares. A
  // region-scoped scenario needs one that is actually re-parented under a
  // kawasan — only 590 of 953 are, so picking blind silently produced a
  // district-scoped occurrence and the scenario failed for the wrong reason.
  const needsRegion = s.subject.scope === 'region';
  const [place] = (await ds.query(
    `SELECT l.id AS location_id, l.district_id, l.region_id
       FROM locations l
      WHERE l.deleted_at IS NULL AND l.district_id IS NOT NULL
        AND ($2::boolean IS NOT TRUE OR l.region_id IS NOT NULL)
      ORDER BY l.name
      OFFSET $1 LIMIT 1`,
    [Math.abs(hash(s.id)) % 50, needsRegion],
  )) as Array<{ location_id: string; district_id: string; region_id: string | null }>;
  if (!place) {
    throw new Error(
      needsRegion
        ? 'no lokasi is re-parented under a kawasan — cannot place a region-scoped subject'
        : 'no locations available — seed the demo profile first',
    );
  }

  const [existing] = (await ds.query(`SELECT id FROM users WHERE username = $1`, [
    username,
  ])) as Array<{ id: string }>;

  if (existing) {
    return {
      userId: existing.id,
      username,
      locationId: place.location_id,
      regionId: place.region_id,
      districtId: place.district_id,
    };
  }

  // bcrypt("12345678", 10) — the repo-wide dev password. Never used in prod:
  // this whole script refuses to run outside local/clone.
  const HASH = '$2b$10$Mf79DcCvB/foxuO1uqA0rO5mS5X3o8Md2qw5asY2cB7xDRDQMQL7W';
  const [created] = (await ds.query(
    `INSERT INTO users (id, username, full_name, password_hash, role, is_active,
                        district_id, location_id, password_must_change)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, $6, false)
     RETURNING id`,
    [
      username,
      `E2E ${s.subject.handle}`,
      HASH,
      s.subject.role,
      place.district_id,
      place.location_id,
    ],
  )) as Array<{ id: string }>;

  return {
    userId: created.id,
    username,
    locationId: place.location_id,
    regionId: place.region_id,
    districtId: place.district_id,
  };
}

/** Spread subjects across lokasi deterministically, so a re-run is identical. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Remove every trace of previous runs. Scoped to e2e_* users only. */
async function purge(): Promise<number> {
  const ds = AppDataSource;
  // Rows for adopted personas are cleared too; their ACCOUNTS are seeder-owned
  // and deliberately survive (only e2e_* users are dropped, below).
  const adopted = CATALOG.map((s) => s.subject.adopt).filter((u): u is string => Boolean(u));
  const users = (await ds.query(
    `SELECT id FROM users WHERE username LIKE $1 OR username = ANY($2)`,
    [`${PREFIX}%`, adopted],
  )) as Array<{ id: string }>;
  if (users.length === 0) return 0;
  const ids = users.map((u) => u.id);
  await ds.query(`DELETE FROM location_logs WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM attendance_punches WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM user_tracking_status WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM shifts WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM schedules WHERE user_id = ANY($1)`, [ids]);
  return users.length;
}

/**
 * Delete only the rows a re-run would otherwise duplicate; keep the accounts.
 *
 * Covers BOTH the catalog's own `e2e_*` users and any adopted persona, because
 * an adopted one accumulates a fresh session on every run otherwise. The
 * accounts themselves are never touched here.
 */
async function resetSubjectData(adopted: string[] = []): Promise<void> {
  const ds = AppDataSource;
  const users = (await ds.query(
    `SELECT id FROM users WHERE username LIKE $1 OR username = ANY($2)`,
    [`${PREFIX}%`, adopted],
  )) as Array<{ id: string }>;
  if (users.length === 0) return;
  const ids = users.map((u) => u.id);
  await ds.query(`DELETE FROM location_logs WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM attendance_punches WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM user_tracking_status WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM shifts WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM schedules WHERE user_id = ANY($1)`, [ids]);
}

/**
 * Refuse to run against a database this script has no business writing to.
 *
 * Checked AFTER the connection is configured and BEFORE anything is written, so
 * a mistyped port or a forgotten SSM tunnel aborts rather than seeding synthetic
 * workers into the live system.
 */
function assertDatabaseIsWritable(): void {
  const name = process.env.DATABASE_NAME ?? '';
  if (FORBIDDEN_DATABASES.has(name)) {
    throw new Error(
      `Refusing to run against "${name}" — that is a live database. ` +
        `Clone mode expects "${CLONE_DEFAULTS.DATABASE_NAME}".`,
    );
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run with NODE_ENV=production.');
  }
}

/**
 * Confirm the API is reading the SAME database the runner is about to seed.
 *
 * Without this the failure mode is baffling: every scenario arranges cleanly and
 * every assertion fails, because the API is serving a different database. Ask
 * both sides for a cheap invariant and compare. Runs before any write.
 */
async function assertApiAndDbAgree(token: string): Promise<void> {
  const [{ count }] = (await AppDataSource.query(
    `SELECT count(*)::int AS count FROM districts WHERE deleted_at IS NULL`,
  )) as Array<{ count: number }>;

  const res = await fetch(`${API}/districts`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`preflight: GET /districts → HTTP ${res.status}`);
  const body = (await res.json()) as unknown;
  const rows = Array.isArray(body)
    ? body
    : ((body as { data?: unknown[] })?.data ?? []);
  const apiCount = Array.isArray(rows) ? rows.length : -1;

  if (apiCount !== count) {
    throw new Error(
      `The API and the runner are looking at DIFFERENT databases.\n` +
        `  runner  → ${process.env.DATABASE_NAME}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT} — ${count} districts\n` +
        `  api     → ${API} — ${apiCount} districts\n` +
        `Point the backend at the same database and re-run.`,
    );
  }
}

async function main(): Promise<void> {
  assertCatalogIsSound();

  if (MODE === 'clone') applyCloneEnv();
  assertDatabaseIsWritable();

  // Dynamic import: `data-source.ts` builds its DataSource from process.env at
  // import time, so the clone overrides above have to land first.
  AppDataSource = (await import('../../src/database/data-source')).default;
  await AppDataSource.initialize();

  if (PURGE) {
    const n = await purge();
    await AppDataSource.query(`DELETE FROM users WHERE username LIKE $1`, [`${PREFIX}%`]);
    console.log(`Purged ${n} e2e_* subjects and all their rows.`);
    await AppDataSource.destroy();
    return;
  }

  const scenarios = ONLY
    ? CATALOG.filter((s) => ONLY.some((f) => s.id === f || s.id.startsWith(f)))
    : CATALOG;
  if (scenarios.length === 0) {
    console.error(`No scenarios matched --only=${ONLY?.join(',')}`);
    process.exit(1);
  }

  const now = new Date();
  const today = wibToday(now);
  const helpers = buildHelpers(AppDataSource);

  console.log(`\nmode=${MODE}  service day=${today}  scenarios=${scenarios.length}`);
  console.log(
    `db=${process.env.DATABASE_NAME}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}`,
  );
  console.log(`api=${API}\n`);

  // ── Preflight ──
  // Before ANY write: prove the API reads the same database the runner seeds.
  // `--arrange-only` skips it because that path makes no API call at all.
  const adminToken = ARRANGE_ONLY ? '' : await login(ADMIN, ADMIN_PASSWORD);
  if (!ARRANGE_ONLY) await assertApiAndDbAgree(adminToken);

  // ── Arrange ──
  const subjects = new Map<string, ResolvedSubject>();
  if (!VERIFY_ONLY) {
    await resetSubjectData(
      scenarios.map((s) => s.subject.adopt).filter((u): u is string => Boolean(u)),
    );
    for (const s of scenarios) {
      const subject = await resolveSubject(s);
      subjects.set(s.id, subject);
      await s.arrange({ ds: AppDataSource, mode: MODE, today, now, subject, helpers });
    }
    // Demo roster fixtures: the half of the retired stager that carried no
    // assertion. Only on a FULL run — a --only run is a targeted check and has
    // no business rewriting the whole board.
    if (!ONLY) {
      const owned = CATALOG.map((s) => s.subject.adopt).filter((u): u is string => Boolean(u));
      await clearDemoFixtures(AppDataSource, today, owned);
      const fx = await arrangeDemoFixtures(AppDataSource, helpers, today, owned);
      console.log(
        `${DIM}Arranged ${scenarios.length} scenarios + ${fx.rosterRows} demo roster rows` +
          `${fx.skipped.length ? ` (${fx.skipped.length} accounts absent)` : ''}.${RESET}\n`,
      );
    } else {
      console.log(`${DIM}Arranged ${scenarios.length} scenarios.${RESET}\n`);
    }
    if (ARRANGE_ONLY) {
      console.log('arrange-only: skipping verification (no API call made).\n');
      await AppDataSource.destroy();
      return;
    }
  } else {
    for (const s of scenarios) subjects.set(s.id, await resolveSubject(s));
  }

  // ── Verify ── (adminToken was obtained during preflight)
  const results: Result[] = [];
  const skipped: Array<{ scenario: Scenario; reason: string }> = [];

  for (const s of scenarios) {
    const skip = s.skipIf?.() ?? null;
    if (skip) {
      skipped.push({ scenario: s, reason: skip });
      console.log(`${DIM}  SKIP  ${s.id}  ${s.title}\n        ↳ ${skip}${RESET}`);
      continue;
    }
    const subject = subjects.get(s.id)!;
    const ctx = { subject, today, mode: MODE };
    const failures: string[] = [];

    for (const e of s.expect) {
      const path = e.get(ctx);
      let token = adminToken;
      if (e.as === 'worker') {
        try {
          token = await login(subject.username, '12345678');
        } catch (err) {
          failures.push(`${e.what}: could not log in as ${subject.username} — ${String(err)}`);
          continue;
        }
      }
      const isPost = typeof e.post === 'function';
      const res = await fetch(`${API}${path}`, {
        method: isPost ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isPost ? { 'Content-Type': 'application/json' } : {}),
        },
        body: isPost ? JSON.stringify(e.post!(ctx)) : undefined,
      });
      // A POST expectation asserts the REFUSAL, so a non-2xx is the result to
      // inspect rather than a transport failure to report.
      if (!isPost && !res.ok) {
        failures.push(`${e.what}: GET ${path} → HTTP ${res.status}`);
        continue;
      }
      const body: unknown = await res.json().catch(() => ({}));
      const reason = e.check(body, { ...ctx, status: res.status });
      if (reason) failures.push(`${e.what}: ${reason}`);
    }

    results.push({ scenario: s, failures });
    const ok = failures.length === 0;
    console.log(
      `${ok ? GREEN + '  PASS' : RED + '  FAIL'}${RESET}  ${s.id}  ${s.title}` +
        `${s.guards ? `  ${DIM}[guard]${RESET}` : ''}`,
    );
    for (const f of failures) console.log(`        ${RED}↳ ${f}${RESET}`);
  }

  // ── Coverage ──
  const failed = results.filter((r) => r.failures.length > 0);
  const byDomain = new Map<string, { pass: number; total: number }>();
  for (const r of results) {
    const d = byDomain.get(r.scenario.domain) ?? { pass: 0, total: 0 };
    d.total += 1;
    if (r.failures.length === 0) d.pass += 1;
    byDomain.set(r.scenario.domain, d);
  }
  console.log('\nCoverage');
  for (const [domain, d] of byDomain) {
    console.log(`  ${domain.padEnd(12)} ${d.pass}/${d.total}`);
  }
  if (skipped.length > 0) {
    console.log(`  ${DIM}skipped      ${skipped.length} (${skipped.map((s) => s.scenario.id).join(', ')})${RESET}`);
  }
  console.log(
    `\n${failed.length === 0 ? GREEN + 'All scenarios passed.' : RED + `${failed.length} scenario(s) failed.`}${RESET}\n`,
  );

  await AppDataSource.destroy();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  // A refusal guard fires BEFORE the dynamic import, so the DataSource may not
  // exist yet — reading `.isInitialized` off undefined would replace the useful
  // message with a TypeError.
  if (AppDataSource?.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
