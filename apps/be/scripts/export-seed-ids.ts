/**
 * Export sheet-paste-ready id mappings for the two-way-sync groundwork.
 *
 * The committed user roster carries deterministic UUID v5 ids. This emits a
 * trimmed "name → id" mapping the client can paste back into the spreadsheet's
 * `id` column, so a future Apps Script sync (and any re-load) keys on a stable
 * id instead of re-deriving by name. (Geography now comes from the live-staging
 * snapshots, so only the user roster needs this.)
 *
 *   data/users-with-ids.csv  (full_name, username, id, phone, rayon_code)
 *
 * Run: npm run seed:export-ids
 */
import { loadSeedUsers } from '../src/database/seeds/load-seed-data';
import { serializeCsv } from '../src/database/seeds/csv-util';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../src/database/seeds/data');

function writeCsv(file: string, header: string[], rows: string[][]): void {
  fs.writeFileSync(file, serializeCsv([header, ...rows]));
}

const users = loadSeedUsers();
writeCsv(
  path.join(DATA_DIR, 'users-with-ids.csv'),
  ['full_name', 'username', 'id', 'phone', 'rayon_code'],
  users.map((u) => [u.full_name, u.username, u.id, u.phone, u.rayon_code]),
);

console.log(
  `Exported ${users.length} user ids → data/users-with-ids.csv`,
);
