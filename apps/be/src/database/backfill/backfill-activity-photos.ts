/**
 * backfill-activity-photos.ts — F9 tier-2 Phase B.
 *
 * Move EXISTING activity photos out of Postgres and into object storage.
 * Phase A stopped new data-URIs from being written; this migrates the ~5.8 GB
 * of inline base64 already in `activities.photo_urls` to storage (MinIO local/
 * prod, S3 staging) and rewrites each row's `photo_urls` to the stored URLs.
 *
 * Run co-located with the DB (on the box for staging), AFTER Phase A is deployed:
 *   npm run backfill:activity-photos -- --dry-run   # report only, writes nothing
 *   npm run backfill:activity-photos                # migrate
 *
 * Properties:
 * - **Idempotent + rerunnable.** Only rows still holding a `data:`/`blob:` entry
 *   are selected; once rewritten they no longer match, so a second run is a no-op
 *   and a failed row is retried next run.
 * - **Batched + keyset-paginated** by id, so memory stays bounded on a big table.
 * - **Per-row isolation.** One row's failure is logged and skipped, never aborts
 *   the run.
 * - **Does NOT reclaim disk.** Rewriting leaves dead TOAST tuples; run
 *   `VACUUM (FULL) activities` (or pg_repack) separately once this completes to
 *   shrink the table — that step takes a lock and is the operator's call.
 */
import AppDataSource from '../data-source';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../shared/services/s3.service';
import { rewritePhotoUrls, RewriteStats } from '../../modules/activities/photo-backfill.util';
import { randomUUID } from 'crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH = 25; // rows per page — each may hold up to 3 × ~0.5 MB of base64

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const s3 = new S3Service(new ConfigService(process.env as Record<string, unknown>));

  const hasInline = `EXISTS (SELECT 1 FROM unnest(photo_urls) u WHERE u LIKE 'data:%' OR u LIKE 'blob:%')`;

  const [{ n }] = (await AppDataSource.query(
    `SELECT count(*)::int AS n FROM activities WHERE ${hasInline}`,
  )) as Array<{ n: number }>;
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}activities with inline photos: ${n}`);
  if (n === 0) {
    await AppDataSource.destroy();
    return;
  }

  const stats: RewriteStats = { photosMoved: 0, bytesMoved: 0 };
  let rowsDone = 0;
  let failed = 0;
  let afterId = '00000000-0000-0000-0000-000000000000';

  // Keyset pagination by id. A migrated row no longer matches `hasInline`, so the
  // window naturally advances; we still track afterId to skip rows that FAILED
  // (they keep their data: entries and would otherwise loop forever).
  for (;;) {
    const rows = (await AppDataSource.query(
      `SELECT id, photo_urls FROM activities
        WHERE ${hasInline} AND id > $1
        ORDER BY id ASC LIMIT $2`,
      [afterId, BATCH],
    )) as Array<{ id: string; photo_urls: string[] }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      afterId = row.id;
      try {
        const newUrls = await rewritePhotoUrls(
          row.photo_urls,
          async (buf, ext, mime) => {
            const key = s3.generateKey('activities', `${randomUUID()}.${ext}`);
            if (DRY_RUN) return `dry-run:${key}`;
            return s3.uploadFile(buf, key, mime);
          },
          stats,
        );
        if (!DRY_RUN) {
          await AppDataSource.query(`UPDATE activities SET photo_urls = $1 WHERE id = $2`, [
            newUrls,
            row.id,
          ]);
        }
        rowsDone += 1;
      } catch (err) {
        failed += 1;
        console.error(`  row ${row.id} FAILED: ${(err as Error).message}`);
      }
    }
    console.log(
      `  progress: ${rowsDone}/${n} rows · ${stats.photosMoved} photos · ` +
        `${(stats.bytesMoved / 1_048_576).toFixed(1)} MB${failed ? ` · ${failed} failed` : ''}`,
    );
  }

  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}done — ${rowsDone} rows rewritten, ${stats.photosMoved} photos ` +
      `(${(stats.bytesMoved / 1_048_576).toFixed(1)} MB) moved, ${failed} failed.`,
  );
  if (!DRY_RUN && failed === 0) {
    console.log('Next: VACUUM (FULL) activities  (locks the table) to reclaim the dead tuples.');
  }
  await AppDataSource.destroy();
}

// Only run when invoked directly (not when imported by the unit test).
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
