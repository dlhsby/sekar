/**
 * Export sheet-paste-ready id mappings for the two-way-sync groundwork.
 *
 * The committed seed CSVs already carry deterministic UUID v5 ids. This emits
 * trimmed "name → id" mappings the client can paste back into the spreadsheet's
 * `id` columns, so a future Apps Script sync (and any re-load) keys on a stable
 * id instead of re-deriving by name.
 *
 *   data/areas-taman-aktif-with-ids.csv  (name, id)
 *   data/users-with-ids.csv              (full_name, username, id, phone, rayon_code)
 *
 * Run: npm run seed:export-ids
 */
import { loadTamanAktifAreas, loadSeedUsers } from '../src/database/seeds/load-seed-data';
import { serializeCsv } from '../src/database/seeds/csv-util';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../src/database/seeds/data');

function writeCsv(file: string, header: string[], rows: string[][]): void {
  fs.writeFileSync(file, serializeCsv([header, ...rows]));
}

const areas = loadTamanAktifAreas();
writeCsv(
  path.join(DATA_DIR, 'areas-taman-aktif-with-ids.csv'),
  ['name', 'id'],
  areas.map((a) => [a.name, a.id]),
);

const users = loadSeedUsers();
writeCsv(
  path.join(DATA_DIR, 'users-with-ids.csv'),
  ['full_name', 'username', 'id', 'phone', 'rayon_code'],
  users.map((u) => [u.full_name, u.username, u.id, u.phone, u.rayon_code]),
);

console.log(
  `Exported ${areas.length} area ids + ${users.length} user ids → ` +
    `data/areas-taman-aktif-with-ids.csv, data/users-with-ids.csv`,
);
