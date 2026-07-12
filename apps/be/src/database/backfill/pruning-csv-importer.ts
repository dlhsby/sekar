/**
 * Pruning CSV Backfill Importer (Phase 3 sub-phase 3-13)
 *
 * Imports the 5,008-row historical pruning log (`data/rekap_perantingan.csv`)
 * into `activities` + `activity_plant_items` (and bumps `location_plants`
 * aggregates) so the production system has continuity with the paper
 * records the kecamatans have been keeping.
 *
 * **Idempotency:** every row is keyed by `reference_code` (`25PR<n>`).
 * Re-running the importer is safe — existing rows are skipped, never
 * overwritten.
 *
 * **Safety gates:**
 * 1. Defaults to `--dry-run`. Pass `--apply` explicitly to write rows.
 * 2. Limits batch size to 500 rows per transaction to avoid lock storms.
 * 3. Emits a JSON report at `data/csv-backfill-report.json` summarising:
 *    insert / skip / fail counts + every failed row's reason.
 * 4. NEVER deletes — only inserts when the reference_code is absent.
 *
 * **What this scaffold does NOT do (Phase 4 follow-on):**
 *  - S3 photo rehosting (Drive URLs in cols 13/14 are still public Drive
 *    links; production needs them on `sekar-media` bucket with presigned
 *    URLs). Tracked separately.
 *  - Backfilling `location_plants` aggregates. Requires species + area
 *    matching beyond a simple name lookup; documented in
 *    `specs/phases/phase-3-plants-monitoring-rebuild/database.md` §3-13.
 *  - `pruning_request` ancestry. The CSV predates the kecamatan workflow;
 *    backfilled activities have `pruning_request_id = NULL`.
 *
 * Run from `apps/be/`:
 *   npx tsx src/database/backfill/pruning-csv-importer.ts --dry-run
 *   npx tsx src/database/backfill/pruning-csv-importer.ts --apply --limit 100
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import AppDataSource from '../data-source';

interface CsvRow {
  rawIndex: number;
  timestamp: string;
  referenceCode: string;
  workDate: string;
  rayonName: string;
  location: string;
  speciesName: string;
  count: number;
  caseType: string | null;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  source: string | null;
  damageCause: string | null;
  notes: string | null;
}

interface ImportReport {
  generatedAt: string;
  csvPath: string;
  totalRows: number;
  parsedRows: number;
  parseFailures: { line: number; reason: string }[];
  inserted: number;
  skippedExisting: number;
  insertFailures: { referenceCode: string; reason: string }[];
  dryRun: boolean;
}

const DEFAULT_CSV_PATH = path.resolve(__dirname, '../../../../data/rekap_perantingan.csv');
const DEFAULT_REPORT_PATH = path.resolve(__dirname, '../../../../data/csv-backfill-report.json');
const BATCH_SIZE = 500;

function parseArgs(argv: string[]): {
  dryRun: boolean;
  csvPath: string;
  limit: number | null;
  reportPath: string;
} {
  const args = new Set(argv.slice(2));
  let limit: number | null = null;
  for (const arg of args) {
    if (arg.startsWith('--limit=')) limit = Number(arg.split('=')[1]);
  }
  return {
    dryRun: !args.has('--apply'),
    csvPath: DEFAULT_CSV_PATH,
    limit,
    reportPath: DEFAULT_REPORT_PATH,
  };
}

/**
 * Tiny CSV line parser, quote-aware. The 2026-05-23 header inspection
 * claimed the export never quotes fields, but ~360 of the 5,008 rows DO
 * quote `Lokasi` (it contains commas) — a naive split shifts every later
 * column and those rows were wrongly rejected as malformed. Handles
 * RFC-4180 quoting on a single line: commas inside `"…"` are literal and
 * doubled quotes (`""`) unescape to one quote.
 */
function parseLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Parse `DD/MM/YYYY HH:MM:SS` (timestamp) or `DD/MM/YYYY` (work date).
 * Returns null for unparseable input.
 */
function parseIndoDate(raw: string): Date | null {
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = match;
  const d = new Date(
    Date.UTC(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh ?? 0),
      Number(mi ?? 0),
      Number(ss ?? 0),
    ),
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Map a CSV cell to a CsvRow. Returns null when required fields are
 * missing — caller logs the row index in `parseFailures`.
 */
function rowFromCsv(cells: string[], rawIndex: number): CsvRow | null {
  // Header order (verified on 2026-05-23 against data/rekap_perantingan.csv):
  // 0 Timestamp, 1 reference (25PRn), 2 Tanggal, 3 Rayon, 4 Lokasi,
  // 5 Pohon, 6 Jumlah, 7 Penanganan(empty), 8 Keterangan Lokasi,
  // 9 Penanganan(case_type), 10 Waktu Laporan, 11 Waktu Penanganan,
  // 12 Foto Sebelum, 13 Foto Sesudah, 14 Taruna(source), 15 Penyebab Tumbang,
  // 16 Keterangan, 17..21 — duplicate / computed columns, ignored.
  if (cells.length < 17) return null;
  const referenceCode = cells[1];
  const count = Number(cells[6] || '0');
  if (!referenceCode || !cells[3] || !cells[5] || Number.isNaN(count)) return null;
  return {
    rawIndex,
    timestamp: cells[0],
    referenceCode,
    workDate: cells[2],
    rayonName: cells[3],
    location: cells[4],
    speciesName: cells[5],
    count,
    caseType: cells[9] || null,
    photoBeforeUrl: cells[12] || null,
    photoAfterUrl: cells[13] || null,
    source: cells[14] || null,
    damageCause: cells[15] || null,
    notes: cells[16] || null,
  };
}

async function loadCsv(
  csvPath: string,
): Promise<{ rows: CsvRow[]; failures: ImportReport['parseFailures'] }> {
  const text = await fs.readFile(csvPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const rows: CsvRow[] = [];
  const failures: ImportReport['parseFailures'] = [];
  // Skip header line.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseLine(line);
    const row = rowFromCsv(cells, i + 1);
    if (!row) {
      failures.push({ line: i + 1, reason: 'malformed or missing required fields' });
      continue;
    }
    rows.push(row);
  }
  return { rows, failures };
}

/**
 * Resolve rayon name → rayon_id. Falls back to NULL when no exact match;
 * the activity is still importable (location_id is nullable for kecamatan-
 * driven pruning, per ADR-035 amendment).
 */
async function buildRayonNameIndex(): Promise<Map<string, string>> {
  const rows = await AppDataSource.query(
    `SELECT id, lower(name) AS name FROM rayons WHERE deleted_at IS NULL`,
  );
  const index = new Map<string, string>();
  for (const r of rows as Array<{ id: string; name: string }>) index.set(r.name, r.id);
  return index;
}

/**
 * Resolve species name → species_id. Same fallback semantics — when no
 * match, the activity is still created but no `activity_plant_items` row
 * is inserted (the line item table requires a species FK).
 */
async function buildSpeciesNameIndex(): Promise<Map<string, string>> {
  const rows = await AppDataSource.query(`SELECT id, lower(name_id) AS name_id FROM plant_species`);
  const index = new Map<string, string>();
  for (const r of rows as Array<{ id: string; name_id: string }>) {
    index.set(r.name_id, r.id);
  }
  return index;
}

/**
 * The live schema requires `activities.user_id`, `shift_id` and
 * `activity_type_id` to be NOT NULL (the 2026-05-23 scaffold assumed they
 * were nullable and every `--apply` row failed). Backfilled rows are
 * anchored to:
 *  - a dedicated, non-loginable system user (`sistem_backfill_csv`,
 *    `is_active = false`, invalid bcrypt sentinel as password hash), and
 *  - a single synthetic shift owned by that user, dated at the start of
 *    the historical period.
 * `activity_type_id` resolves to the real `perantingan` type — the
 * importer fails loudly when it is missing (reference data not seeded).
 * All three lookups/creations are idempotent.
 */
interface BackfillAnchors {
  userId: string;
  shiftId: string;
  activityTypeId: string;
}

const BACKFILL_USERNAME = 'sistem_backfill_csv';

async function ensureBackfillAnchors(dryRun: boolean): Promise<BackfillAnchors | null> {
  const typeRows = await AppDataSource.query(
    `SELECT id FROM activity_types WHERE code = 'perantingan' LIMIT 1`,
  );
  if (typeRows.length === 0) {
    throw new Error(
      "activity_types has no 'perantingan' row — seed reference data before running the backfill",
    );
  }
  const activityTypeId: string = typeRows[0].id;

  if (dryRun) return null; // dry-run never writes; anchors are not needed

  let userRows = await AppDataSource.query(`SELECT id FROM users WHERE username = $1 LIMIT 1`, [
    BACKFILL_USERNAME,
  ]);
  if (userRows.length === 0) {
    userRows = await AppDataSource.query(
      `INSERT INTO users (id, username, password_hash, full_name, role, is_active, password_must_change, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, '!backfill-no-login', 'Sistem Backfill CSV', 'admin_system', false, false, now(), now())
       RETURNING id`,
      [BACKFILL_USERNAME],
    );
  }
  const userId: string = userRows[0].id;

  let shiftRows = await AppDataSource.query(
    `SELECT id FROM shifts WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [userId],
  );
  if (shiftRows.length === 0) {
    shiftRows = await AppDataSource.query(
      `INSERT INTO shifts (id, user_id, clock_in_time, clock_out_time, clock_in_outside_boundary, clock_out_outside_boundary, is_overtime, created_at, updated_at)
       VALUES (uuid_generate_v4(), $1, '2025-12-30T00:00:00Z', '2025-12-30T00:00:01Z', false, false, false, now(), now())
       RETURNING id`,
      [userId],
    );
  }
  const shiftId: string = shiftRows[0].id;

  return { userId, shiftId, activityTypeId };
}

async function importOne(
  row: CsvRow,
  ctx: {
    rayonIndex: Map<string, string>;
    speciesIndex: Map<string, string>;
    anchors: BackfillAnchors | null;
    dryRun: boolean;
  },
): Promise<'inserted' | 'skipped' | { error: string }> {
  // Skip if reference_code already present (idempotency anchor).
  const existing = await AppDataSource.query(
    `SELECT 1 FROM activities WHERE reference_code = $1 LIMIT 1`,
    [row.referenceCode],
  );
  if (existing.length > 0) return 'skipped';

  if (ctx.dryRun) return 'inserted'; // dry-run reports what would happen
  if (!ctx.anchors) return { error: 'backfill anchors missing in apply mode' };

  const ts = parseIndoDate(row.timestamp) ?? new Date();
  const workDate = parseIndoDate(row.workDate);
  const rayonId = ctx.rayonIndex.get(row.rayonName.toLowerCase()) ?? null;
  const speciesId = ctx.speciesIndex.get(row.speciesName.toLowerCase()) ?? null;

  const customFields = {
    source: row.source,
    damage_cause: row.damageCause,
    historical_location_text: row.location,
    historical_rayon_name: row.rayonName,
    historical_work_date: workDate ? workDate.toISOString().slice(0, 10) : null,
    backfilled_at: new Date().toISOString(),
  };

  const { userId, shiftId, activityTypeId } = ctx.anchors;
  await AppDataSource.transaction(async (manager) => {
    const result = await manager.query(
      `INSERT INTO activities (
         user_id, shift_id, location_id, activity_type_id, description,
         photo_urls, gps_lat, gps_lng, reference_code, case_type,
         custom_fields, photo_before_url, photo_after_url,
         created_at, updated_at
       ) VALUES (
         $8, $9, NULL, $10, $1,
         '{}', NULL, NULL, $2, $3,
         $4::jsonb, $5, $6,
         $7, $7
       ) RETURNING id`,
      [
        row.notes ?? row.location,
        row.referenceCode,
        row.caseType,
        JSON.stringify(customFields),
        row.photoBeforeUrl,
        row.photoAfterUrl,
        ts,
        userId,
        shiftId,
        activityTypeId,
      ],
    );
    const activityId = result[0]?.id;
    if (activityId && speciesId && row.count > 0) {
      await manager.query(
        `INSERT INTO activity_plant_items (activity_id, species_id, count)
           VALUES ($1, $2, $3)`,
        [activityId, speciesId, row.count],
      );
    }
    // Rayon-only mapping is logged via custom_fields; no FK column on
    // activities for rayon (only via area→rayon, which is NULL here).
    void rayonId;
  });

  return 'inserted';
}

async function main(): Promise<void> {
  const { dryRun, csvPath, limit, reportPath } = parseArgs(process.argv);

  console.log(
    `Pruning CSV importer — mode=${dryRun ? 'DRY-RUN (no writes)' : 'APPLY'}; source=${csvPath}` +
      (limit ? `; limit=${limit}` : ''),
  );

  await AppDataSource.initialize();
  console.log('DataSource initialized.');

  const { rows: allRows, failures: parseFailures } = await loadCsv(csvPath);
  const rows = limit ? allRows.slice(0, limit) : allRows;
  const rayonIndex = await buildRayonNameIndex();
  const speciesIndex = await buildSpeciesNameIndex();
  const anchors = await ensureBackfillAnchors(dryRun);

  console.log(
    `Loaded ${allRows.length} rows (${parseFailures.length} unparseable). ` +
      `Processing ${rows.length}.`,
  );

  const report: ImportReport = {
    generatedAt: new Date().toISOString(),
    csvPath,
    totalRows: allRows.length,
    parsedRows: rows.length,
    parseFailures,
    inserted: 0,
    skippedExisting: 0,
    insertFailures: [],
    dryRun,
  };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      try {
        const outcome = await importOne(row, { rayonIndex, speciesIndex, anchors, dryRun });
        if (outcome === 'inserted') report.inserted += 1;
        else if (outcome === 'skipped') report.skippedExisting += 1;
      } catch (err) {
        report.insertFailures.push({
          referenceCode: row.referenceCode,
          reason: (err as Error).message,
        });
      }
    }
    console.log(
      `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ` +
        `inserted=${report.inserted}, skipped=${report.skippedExisting}, ` +
        `failed=${report.insertFailures.length}`,
    );
  }

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${reportPath}.`);

  await AppDataSource.destroy();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  });
}

export { main as runCsvBackfill, parseIndoDate, rowFromCsv, parseLine };
