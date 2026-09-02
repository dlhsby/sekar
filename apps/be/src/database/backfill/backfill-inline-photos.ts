/**
 * backfill-inline-photos.ts — F9 tier-2 Phase B (all photo columns).
 *
 * Move EVERY inline base64 photo out of Postgres into object storage (MinIO
 * local/prod, S3 staging) and rewrite the column to the stored URL. Phase A
 * stopped new inline photos on activities; this clears the existing debt across
 * every table that stores an uploaded photo, so the DB stops carrying image
 * bytes in `text`/`text[]` columns.
 *
 * Run co-located with the DB (on the box for staging), AFTER deploy:
 *   npm run backfill:inline-photos -- --dry-run   # report only, writes nothing
 *   npm run backfill:inline-photos                # migrate
 *
 * Properties (per target column):
 * - **Idempotent + rerunnable** — only rows still holding a `data:`/`blob:` value
 *   are selected; once rewritten they no longer match.
 * - **Keyset-paginated by id**, per-row isolated (one row's failure is logged and
 *   skipped, never aborts the run).
 * - **Handles both `text[]` (multi-photo) and `text` (single-photo) columns.**
 * - **Does NOT reclaim disk** — rewriting leaves dead TOAST tuples; run
 *   `VACUUM (FULL) <table>` afterwards (takes a lock — operator's call) to shrink.
 */
import AppDataSource from '../data-source';
import { ConfigService } from '@nestjs/config';
import { S3Service } from '../../shared/services/s3.service';
import {
  rewritePhotoUrls,
  rewritePhotoUrl,
  RewriteStats,
} from '../../modules/activities/photo-backfill.util';
import { createHash, randomUUID } from 'crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH = 25;

interface Target {
  table: string;
  column: string;
  array: boolean;
  folder: string;
}

/** Every column that stores an uploaded photo (see the entity grep). */
const TARGETS: Target[] = [
  { table: 'activities', column: 'photo_urls', array: true, folder: 'activities' },
  { table: 'activities', column: 'photo_before_url', array: false, folder: 'activities' },
  { table: 'activities', column: 'photo_after_url', array: false, folder: 'activities' },
  { table: 'overtimes', column: 'photo_urls', array: true, folder: 'overtime' },
  { table: 'pruning_requests', column: 'photo_urls', array: true, folder: 'pruning' },
  { table: 'tasks', column: 'completion_photo_urls', array: true, folder: 'tasks' },
  { table: 'notable_plants', column: 'photo_urls', array: true, folder: 'plants' },
  { table: 'assets', column: 'photo_url', array: false, folder: 'assets' },
  { table: 'users', column: 'profile_picture_url', array: false, folder: 'profiles' },
  // ADR-055 made `attendance_punches` the immutable record and `shifts` a
  // projection of it, but this list was written before that table existed — so
  // the single biggest column of inline photos was never swept. On the staging
  // clone it is 1,361 rows / 250 MB, larger than every other target combined.
  //
  // Listed BEFORE `shifts` deliberately: the two hold the same bytes, and the
  // dedupe cache makes whichever runs first own the object. The punch is the
  // record, so the projection should point at the punch's object, not the
  // reverse.
  { table: 'attendance_punches', column: 'photo_url', array: false, folder: 'punches' },
  { table: 'shifts', column: 'clock_in_photo_url', array: false, folder: 'clock-in' },
  { table: 'shifts', column: 'clock_out_photo_url', array: false, folder: 'clock-out' },
];

function inlinePredicate(t: Target): string {
  return t.array
    ? `EXISTS (SELECT 1 FROM unnest("${t.column}") u WHERE u LIKE 'data:%' OR u LIKE 'blob:%')`
    : `("${t.column}" LIKE 'data:%' OR "${t.column}" LIKE 'blob:%')`;
}

async function backfillTarget(
  s3: S3Service,
  t: Target,
  stats: RewriteStats,
  dedupe: Map<string, string>,
): Promise<void> {
  // Skip a column absent from this schema (defensive across versions).
  const [{ present }] = (await AppDataSource.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.columns
       WHERE table_name = $1 AND column_name = $2) AS present`,
    [t.table, t.column],
  )) as Array<{ present: boolean }>;
  if (!present) return;

  const where = inlinePredicate(t);
  const [{ n }] = (await AppDataSource.query(
    `SELECT count(*)::int AS n FROM "${t.table}" WHERE ${where}`,
  )) as Array<{ n: number }>;
  if (n === 0) return;

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}${t.table}.${t.column}: ${n} rows with inline photos`);

  const upload = async (buf: Buffer, ext: string, mime: string): Promise<string> => {
    // Identical bytes get one object, not one per row. `shifts` is a projection
    // of `attendance_punches` (ADR-055), so the same selfie is stored in both —
    // 776 byte-identical pairs on the staging clone. Without this they upload
    // twice, and the shift row points at a second copy of its own punch photo.
    const digest = createHash('sha256').update(buf).digest('hex');
    const seen = dedupe.get(digest);
    if (seen) return seen;

    const key = s3.generateKey(t.folder, `${randomUUID()}.${ext}`);
    const url = DRY_RUN ? `dry-run:${key}` : await s3.uploadFile(buf, key, mime);
    dedupe.set(digest, url);
    return url;
  };

  let done = 0;
  let failed = 0;
  let afterId = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const rows = (await AppDataSource.query(
      `SELECT id, "${t.column}" AS val FROM "${t.table}"
        WHERE (${where}) AND id > $1 ORDER BY id ASC LIMIT $2`,
      [afterId, BATCH],
    )) as Array<{ id: string; val: string[] | string | null }>;
    if (rows.length === 0) break;

    for (const row of rows) {
      afterId = row.id;
      try {
        const newVal = t.array
          ? await rewritePhotoUrls((row.val as string[]) ?? [], upload, stats)
          : await rewritePhotoUrl(row.val as string | null, upload, stats);
        if (!DRY_RUN) {
          await AppDataSource.query(`UPDATE "${t.table}" SET "${t.column}" = $1 WHERE id = $2`, [
            newVal,
            row.id,
          ]);
        }
        done += 1;
      } catch (err) {
        failed += 1;
        console.error(`  ${t.table} ${row.id} FAILED: ${(err as Error).message}`);
      }
    }
  }
  console.log(
    `  ${t.table}.${t.column}: ${done}/${n} rows done` + (failed ? ` · ${failed} failed` : ''),
  );
}

/**
 * Connect, retrying transient failures with exponential backoff.
 *
 * The 2026-09-02 staging run died on `Connection terminated due to connection
 * timeout` — memory pressure on db.t4g.micro meant Postgres kept serving
 * EXISTING pooled connections while refusing NEW ones. The condition cleared on
 * its own, but the script exited non-zero on the first attempt, so every
 * restart failed at the starting line despite thousands of photos already
 * being moved.
 *
 * Backoff matters as much as the retry: a supervisor relaunching this every
 * ~10s turned a struggling instance into a connection storm and deepened the
 * outage. Retrying is safe because the backfill is idempotent and
 * keyset-paginated — a rewritten row no longer matches the `data:%` predicate.
 */
export async function connectWithRetry(
  ds: { initialize: () => Promise<unknown> },
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<void> {
  const attempts = opts.attempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 2_000;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await ds.initialize();
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === attempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `connect attempt ${attempt}/${attempts} failed (${(err as Error).message}) — retrying in ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

async function main(): Promise<void> {
  await connectWithRetry(AppDataSource);
  const s3 = new S3Service(new ConfigService(process.env as Record<string, unknown>));
  const stats: RewriteStats = { photosMoved: 0, bytesMoved: 0 };
  // sha256(bytes) -> stored URL, shared across every target so a photo that
  // appears in two columns is uploaded once.
  const dedupe = new Map<string, string>();

  for (const t of TARGETS) {
    await backfillTarget(s3, t, stats, dedupe);
  }

  console.log(
    `${DRY_RUN ? '[DRY RUN] ' : ''}TOTAL — ${stats.photosMoved} photos ` +
      `(${(stats.bytesMoved / 1_048_576).toFixed(1)} MB) moved across ${TARGETS.length} columns, ` +
      `${dedupe.size} distinct objects stored.`,
  );
  if (!DRY_RUN && stats.photosMoved > 0) {
    console.log(
      'Next: VACUUM (FULL) on the affected tables (activities, shifts, users, …) to reclaim disk.',
    );
  }
  await AppDataSource.destroy();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
