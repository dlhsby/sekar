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

import AppDataSource from '../../src/database/data-source';
import { CATALOG, assertCatalogIsSound } from './catalog';
import { buildHelpers, wibToday } from './helpers';
import type { Mode, ResolvedSubject, Scenario } from './types';

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
  const username = `${PREFIX}${s.subject.handle}`;
  const ds = AppDataSource;

  // A lokasi that actually has a rayon, so every drill tier is reachable.
  const [place] = (await ds.query(
    `SELECT l.id AS location_id, l.district_id, l.region_id
       FROM locations l
      WHERE l.deleted_at IS NULL AND l.district_id IS NOT NULL
      ORDER BY l.name
      OFFSET $1 LIMIT 1`,
    [Math.abs(hash(s.id)) % 50],
  )) as Array<{ location_id: string; district_id: string; region_id: string | null }>;
  if (!place) throw new Error('no locations available — seed the demo profile first');

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
  const users = (await ds.query(`SELECT id FROM users WHERE username LIKE $1`, [
    `${PREFIX}%`,
  ])) as Array<{ id: string }>;
  if (users.length === 0) return 0;
  const ids = users.map((u) => u.id);
  await ds.query(`DELETE FROM location_logs WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM attendance_punches WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM user_tracking_status WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM shifts WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM schedules WHERE user_id = ANY($1)`, [ids]);
  return users.length;
}

/** Delete only the rows a re-run would otherwise duplicate; keep the accounts. */
async function resetSubjectData(): Promise<void> {
  const ds = AppDataSource;
  const users = (await ds.query(`SELECT id FROM users WHERE username LIKE $1`, [
    `${PREFIX}%`,
  ])) as Array<{ id: string }>;
  if (users.length === 0) return;
  const ids = users.map((u) => u.id);
  await ds.query(`DELETE FROM location_logs WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM attendance_punches WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM user_tracking_status WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM shifts WHERE user_id = ANY($1)`, [ids]);
  await ds.query(`DELETE FROM schedules WHERE user_id = ANY($1)`, [ids]);
}

async function main(): Promise<void> {
  assertCatalogIsSound();
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
  console.log(`api=${API}\n`);

  // ── Arrange ──
  const subjects = new Map<string, ResolvedSubject>();
  if (!VERIFY_ONLY) {
    await resetSubjectData();
    for (const s of scenarios) {
      const subject = await resolveSubject(s);
      subjects.set(s.id, subject);
      await s.arrange({ ds: AppDataSource, mode: MODE, today, now, subject, helpers });
    }
    console.log(`${DIM}Arranged ${scenarios.length} scenarios.${RESET}\n`);
    if (ARRANGE_ONLY) {
      console.log('arrange-only: skipping verification (no API call made).\n');
      await AppDataSource.destroy();
      return;
    }
  } else {
    for (const s of scenarios) subjects.set(s.id, await resolveSubject(s));
  }

  // ── Verify ──
  const adminToken = await login(ADMIN, ADMIN_PASSWORD);
  const results: Result[] = [];

  for (const s of scenarios) {
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
      const res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        failures.push(`${e.what}: GET ${path} → HTTP ${res.status}`);
        continue;
      }
      const body: unknown = await res.json();
      const reason = e.check(body, ctx);
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
  console.log(
    `\n${failed.length === 0 ? GREEN + 'All scenarios passed.' : RED + `${failed.length} scenario(s) failed.`}${RESET}\n`,
  );

  await AppDataSource.destroy();
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(1);
});
