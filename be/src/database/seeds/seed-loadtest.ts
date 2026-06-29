import type { DataSource, QueryRunner } from 'typeorm';
import '../../config/load-env';
import { DEFAULT_PASSWORD_HASH } from './constants';

/**
 * Load-test seed (Phase 3 sub-phase 3-14, support for `infra/loadtest/monitoring-500w.js`).
 *
 * Generates `LOADTEST_USERS` satgas accounts named `loadtest_satgas{1..N}` so
 * the k6 harness can log them all in via setup(). Idempotent — safe to re-run.
 *
 * Each user gets:
 *   - role:           'satgas'
 *   - password:       Password123! (shared bcrypt hash with the rest of the seeds)
 *   - rayon_id:       first existing rayon row (queried at runtime)
 *   - area_id:        first existing area row in that rayon
 *   - phone_number:   `0812LT0NNNN` (zero-padded VU index, kept unique by UNIQUE on phone)
 *
 * Usage: LOADTEST_USERS=500 npm run db:seed:loadtest
 *   - LOADTEST_USERS defaults to 50 to keep local seed runs fast.
 *   - Run AFTER `npm run db:seed` so a rayon + area exist.
 */

const PASSWORD_HASH = DEFAULT_PASSWORD_HASH;

const LOADTEST_USER_COUNT = parseInt(process.env.LOADTEST_USERS || '50', 10);
const USERNAME_PREFIX = process.env.LOADTEST_PREFIX || 'loadtest_satgas';

interface SeedTargets {
  rayonId: string;
  areaId: string;
}

async function pickTargets(qr: QueryRunner): Promise<SeedTargets> {
  const rayonRows = await qr.query(`SELECT id FROM rayons ORDER BY created_at ASC LIMIT 1`);
  if (!rayonRows.length) {
    throw new Error('No rayons found — run `npm run db:seed` first.');
  }
  const rayonId = rayonRows[0].id;

  const areaRows = await qr.query(
    `SELECT id FROM areas WHERE rayon_id = $1 ORDER BY created_at ASC LIMIT 1`,
    [rayonId],
  );
  if (!areaRows.length) {
    throw new Error(`No areas found for rayon ${rayonId} — seed broken.`);
  }
  return { rayonId, areaId: areaRows[0].id };
}

export async function seedLoadtest(dataSource: DataSource): Promise<void> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    console.log(
      `🔧 Load-test seed: generating ${LOADTEST_USER_COUNT} ${USERNAME_PREFIX}{N} users…`,
    );
    const { rayonId, areaId } = await pickTargets(qr);
    console.log(`   target rayon=${rayonId} area=${areaId}`);

    let inserted = 0;
    let skipped = 0;
    for (let i = 1; i <= LOADTEST_USER_COUNT; i++) {
      const username = `${USERNAME_PREFIX}${i}`;
      const fullName = `Loadtest Satgas ${i}`;
      // Phone format kept unique + 11+ digits to satisfy the legacy CHECK
      // constraint left over from Phase 2 schema. Encodes the VU index so
      // duplicates can't collide across re-runs.
      const phone = `0812LT${String(i).padStart(5, '0')}`;

      const result = await qr.query(
        `INSERT INTO users
           (username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active)
         VALUES ($1, $2, $3, $4, 'satgas', $5, $6, TRUE)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [username, PASSWORD_HASH, fullName, phone, rayonId, areaId],
      );
      if (result.length > 0) inserted++;
      else skipped++;
    }

    await qr.commitTransaction();
    console.log(
      `✅ Load-test seed done — inserted ${inserted}, skipped ${skipped} (already existed).`,
    );
    console.log(
      `   Run k6: WORKER_COUNT=${LOADTEST_USER_COUNT} WORKER_PREFIX=${USERNAME_PREFIX} k6 run infra/loadtest/monitoring-500w.js`,
    );
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}

async function main(): Promise<void> {
  const { DataSource: DS } = await import('typeorm');
  const dataSource = new DS({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    entities: [],
    synchronize: false,
  });

  await dataSource.initialize();
  try {
    await seedLoadtest(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
