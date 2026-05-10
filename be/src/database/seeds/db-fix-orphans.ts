/**
 * db-fix-orphans  (DEV ONLY)
 *
 * Standalone helper for the May 9, 2026 `pruning_requests` FK tightening.
 * Adding `@ManyToOne(User, { onDelete: 'CASCADE' })` for `submitted_by`
 * (and matching joins for `reviewed_by`, `rayon_id`) makes synchronize emit
 * `ALTER TABLE … ADD CONSTRAINT FOREIGN KEY …`. ADD CONSTRAINT validates
 * *existing* rows, so any pruning_requests row whose `submitted_by` no
 * longer points to a live user (typical after a previous wipe-by-truncate
 * that didn't cascade through manually-inserted UAT data) blocks the app
 * from starting.
 *
 * The business rule says a pruning request without a submitter is invalid,
 * and `submitted_by` is NOT NULL — so this script DELETEs the offending
 * rows outright. We're in dev; orphan UAT rows are not data worth saving.
 * Re-seed via `npm run db:seed` if you want fresh sample data afterwards.
 *
 * Use cases:
 *   - You hit `FK_…_submitted_by` violation on `npm run start:dev`.
 *   - You don't want to wipe the entire DB via `npm run db:seed`.
 *
 * Run: npm run db:fix-orphans
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

async function fixOrphans(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    synchronize: false,
    entities: [],
    logging: false,
  });

  await dataSource.initialize();

  try {
    console.log('🔍 Scanning pruning_requests for orphan FK references…');

    const submittedOrphans = await dataSource.query<{ count: string }[]>(
      `SELECT count(*)::text AS count
       FROM pruning_requests pr
       WHERE pr.submitted_by IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pr.submitted_by)`,
    );
    const submittedCount = parseInt(submittedOrphans[0]?.count ?? '0', 10);

    const reviewedOrphans = await dataSource.query<{ count: string }[]>(
      `SELECT count(*)::text AS count
       FROM pruning_requests pr
       WHERE pr.reviewed_by IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pr.reviewed_by)`,
    );
    const reviewedCount = parseInt(reviewedOrphans[0]?.count ?? '0', 10);

    const rayonOrphans = await dataSource.query<{ count: string }[]>(
      `SELECT count(*)::text AS count
       FROM pruning_requests pr
       WHERE pr.rayon_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM rayons r WHERE r.id = pr.rayon_id)`,
    );
    const rayonCount = parseInt(rayonOrphans[0]?.count ?? '0', 10);

    if (submittedCount + reviewedCount + rayonCount === 0) {
      console.log('✅ No orphans found. Schema sync should succeed cleanly.');
      return;
    }

    console.log(
      `   Found: submitted_by ${submittedCount} | reviewed_by ${reviewedCount} | rayon_id ${rayonCount}`,
    );

    // submitted_by is NOT NULL + the request is invalid without a submitter,
    // so we DELETE the row outright (cascades to dependent rows via the
    // existing FKs on pruning_requests' children, none of which exist today).
    if (submittedCount > 0) {
      const result = await dataSource.query(
        `DELETE FROM pruning_requests
          WHERE submitted_by IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pruning_requests.submitted_by)`,
      );
      console.log(`   ✓ ${(result as any)[1] ?? 0} orphan rows deleted (missing submitter)`);
    }

    // reviewed_by is nullable — the row stays, we just clear the dangling FK.
    if (reviewedCount > 0) {
      await dataSource.query(
        `UPDATE pruning_requests
            SET reviewed_by = NULL, reviewed_at = NULL, review_notes = NULL
          WHERE reviewed_by IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pruning_requests.reviewed_by)`,
      );
      console.log(`   ✓ reviewed_by NULLed on ${reviewedCount} rows (review history cleared)`);
    }

    // rayon_id is nullable — clear the dangling FK so admins re-derive scope.
    if (rayonCount > 0) {
      await dataSource.query(
        `UPDATE pruning_requests
            SET rayon_id = NULL
          WHERE rayon_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM rayons r WHERE r.id = pruning_requests.rayon_id)`,
      );
      console.log(`   ✓ rayon_id NULLed on ${rayonCount} rows`);
    }

    console.log('✅ Orphans cleaned. You can now run `npm run start:dev`.');
  } finally {
    await dataSource.destroy();
  }
}

fixOrphans()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ db:fix-orphans failed:', err);
    process.exit(1);
  });
