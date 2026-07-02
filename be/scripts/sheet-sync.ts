/**
 * Two-way sync between the SEKAR input spreadsheet and the committed seed data,
 * using a Google service account (Sheets API v4). No SDK dependency — the
 * service-account JWT is signed with Node's crypto and exchanged for an access
 * token directly.
 *
 * Auth: share the sheet with the service-account email (Editor), download its
 * JSON key, and set in be/.env.local:
 *   GOOGLE_SHEETS_SA_KEYFILE=secrets/sheets-sa.json
 *   SEKAR_SHEET_ID=<spreadsheet id>
 *
 * Usage:
 *   npm run sheet:sync -- --list     # inspect tabs + detected tables (start here)
 *   npm run sheet:pull               # sheet → regenerate areas-taman-aktif.csv + users.csv + rayons.csv
 *   npm run sheet:push               # write generated ids + gps + rayon master data back into the sheet
 *
 * Pull preserves the `id` and `username` already on the sheet (only minting a
 * deterministic one when the cell is blank), so ids authored elsewhere — e.g. a
 * user created via the API, or synced from the live DB — survive a round-trip
 * instead of being overwritten by the username-derived v5 id.
 *
 * After a pull: `npm run db:seed:staging`.
 */
import '../src/config/load-env';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  parseCsvRecords,
  serializeCsv,
  uuidv5 as uuidv5Shared,
} from '../src/database/seeds/csv-util';

const DATA_DIR = path.join(__dirname, '../src/database/seeds/data');
const KEYFILE = path.resolve(
  process.cwd(),
  process.env.GOOGLE_SHEETS_SA_KEYFILE || 'secrets/sheets-sa.json',
);
const SHEET_ID = process.env.SEKAR_SHEET_ID;
// Preferred transport: an Apps Script Web App (no service-account key needed —
// works under the iam.disableServiceAccountKeyCreation org policy). See
// scripts/sheet-apps-script.gs. Falls back to the Sheets API + SA key if unset.
const WEBAPP_URL = process.env.SEKAR_SHEET_WEBAPP_URL?.trim();
const WEBAPP_TOKEN = process.env.SEKAR_SHEET_WEBAPP_TOKEN?.trim();
const NS = 'b7e3c1a0-5d2f-4e8b-9c3a-1f2e3d4c5b6a'; // same namespace as the extractor/generator
const mode = process.argv.includes('--list')
  ? 'list'
  : process.argv.includes('--push')
    ? 'push'
    : 'pull';

// ─── deterministic ids + value normalisers (mirror gen + extractor) ──────────
const uuidv5 = (name: string): string => uuidv5Shared(name, NS);
// Guards a sheet-provided id: only trust a well-formed UUID, else regenerate.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JAB: Record<string, string> = {
  'kepala rayon': 'kepala_rayon',
  korlap: 'korlap',
  satgas: 'satgas',
  linmas: 'linmas',
  'admin data': 'admin_data',
  'top management': 'top_management',
  top_management: 'top_management',
};

// Each client user tab is a single rayon; derive its code from the TAB TITLE
// (the in-row "Rayon" column is inconsistently filled). Matches the codes in
// seed-staging's RAYON_ID_BY_CODE (no underscore before the number). Patroli
// (city-wide security) folds into the lintas-rayon TAMAN_AKTIF bucket; tabs
// with no rayon (top management, merged) resolve to '' → null rayon.
const RAYON_BY_TITLE: Array<[RegExp, string]> = [
  [/taman aktif/, 'TAMAN_AKTIF'],
  [/timur 1/, 'TIMUR1'],
  [/timur 2/, 'TIMUR2'],
  [/barat 1/, 'BARAT1'],
  [/barat 2/, 'BARAT2'],
  [/selatan/, 'SELATAN'],
  [/utara/, 'UTARA'],
  [/pusat/, 'PUSAT'],
  [/patroli/, 'TAMAN_AKTIF'],
];
function rayonFromTitle(title: string): string {
  const t = title.toLowerCase();
  for (const [re, code] of RAYON_BY_TITLE) if (re.test(t)) return code;
  return '';
}
function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'user'
  );
}
function normPhone(p: string): string {
  if (!p) return '';
  for (const tok of p.trim().split(/[\s/,;|]+/)) {
    let d = tok.replace(/\D/g, '');
    if (d.length < 9) continue;
    if (d.startsWith('62')) d = '0' + d.slice(2);
    else if (!d.startsWith('0')) d = '0' + d;
    if (d.length > 13) d = d.slice(0, 13);
    if (d.length >= 10 && d.length <= 13) return d;
  }
  return '';
}

// ─── Google auth + Sheets REST ───────────────────────────────────────────────
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function getAccessToken(): Promise<string> {
  if (!fs.existsSync(KEYFILE)) {
    throw new Error(`Service-account key not found at ${KEYFILE} (set GOOGLE_SHEETS_SA_KEYFILE).`);
  }
  const sa = JSON.parse(fs.readFileSync(KEYFILE, 'utf8')) as {
    client_email: string;
    private_key: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const sig = b64url(crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claim}`), sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${sig}`,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new Error(`Token exchange failed: ${data.error_description ?? 'unknown'}`);
  return data.access_token;
}
async function api<T>(token: string, method: string, p: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${p}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Sheets API ${method} ${p} → ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}
const A1 = (col: number): string => {
  let s = '';
  for (let n = col + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// ─── table detection ─────────────────────────────────────────────────────────
type Grid = { title: string; rows: string[][] };
const norm = (s: string): string => (s ?? '').trim().toLowerCase();
const isAreaHeader = (r: string[]): boolean => {
  const c = r.map(norm);
  return c.includes('name') && c.includes('jenis') && c.includes('rayon') && c.includes('korlap');
};
const isUserHeader = (r: string[]): boolean => {
  const c = r.map(norm);
  return c.includes('nama') && c.includes('jabatan') && (c.includes('no hp') || c.includes('area'));
};
// Rayon master-data tab: has name + description + boundary/center columns, and
// is neither a user tab ('nama'/'jabatan') nor an area tab ('korlap'/'jenis').
const isRayonHeader = (r: string[]): boolean => {
  const c = r.map(norm);
  return (
    c.includes('name') &&
    c.includes('description') &&
    (c.includes('boundary_polygon') || c.includes('center_lat')) &&
    !c.includes('jabatan') &&
    !c.includes('korlap')
  );
};
/** Header row index + column map for the first matching table in a grid. */
function findTable(rows: string[][], match: (r: string[]) => boolean): { hdr: number; col: Record<string, number> } | null {
  for (let i = 0; i < rows.length; i++) {
    if (match(rows[i])) {
      const col: Record<string, number> = {};
      rows[i].forEach((h, j) => (col[norm(h)] = j));
      return { hdr: i, col };
    }
  }
  return null;
}

async function fetchGridsSA(token: string): Promise<Grid[]> {
  const meta = await api<{ sheets: { properties: { title: string } }[] }>(token, 'GET', '?fields=sheets.properties.title');
  const titles = meta.sheets.map((s) => s.properties.title);
  if (titles.length === 0) return [];
  // One batchGet for every tab (ordered) instead of one GET per tab.
  const ranges = titles.map((t) => `ranges=${encodeURIComponent(`'${t}'`)}`).join('&');
  const res = await api<{ valueRanges?: { values?: string[][] }[] }>(
    token,
    'GET',
    `/values:batchGet?${ranges}`,
  );
  const vr = res.valueRanges ?? [];
  return titles.map((title, i) => ({ title, rows: vr[i]?.values ?? [] }));
}

type Update = { range: string; values: string[][] };

// Prefer the service account when a key is present; fall back to the Apps Script
// web app (which works under the org policy that blocks SA keys).
const useSA = (): boolean => fs.existsSync(KEYFILE);

/** Read every tab — via the service account when keyed, else the web app. */
async function readAllTabs(): Promise<Grid[]> {
  if (useSA()) return fetchGridsSA(await getAccessToken());
  const res = await fetch(`${WEBAPP_URL}?token=${encodeURIComponent(WEBAPP_TOKEN ?? '')}`);
  const data = (await res.json()) as { tabs?: Grid[]; error?: string };
  if (data.error) throw new Error(`Apps Script web app: ${data.error}`);
  return (data.tabs ?? []).map((t) => ({ title: t.title, rows: t.rows ?? [] }));
}

/** Apply cell updates — via the service account when keyed, else the web app. */
async function writeUpdates(updates: Update[]): Promise<number> {
  if (!updates.length) return 0;
  if (useSA()) {
    await api(await getAccessToken(), 'POST', '/values:batchUpdate', { valueInputOption: 'RAW', data: updates });
    return updates.length;
  }
  const res = await fetch(WEBAPP_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: WEBAPP_TOKEN, updates }),
  });
  const data = (await res.json()) as { applied?: number; error?: string };
  if (data.error) throw new Error(`Apps Script web app: ${data.error}`);
  return data.applied ?? 0;
}

// ─── CSV helpers (shared with the seeder via ../src/database/seeds/csv-util) ──
const writeCsv = (file: string, header: string[], rows: string[][]): void =>
  fs.writeFileSync(file, serializeCsv([header, ...rows]));
const readCsv = (file: string): Record<string, string>[] =>
  fs.existsSync(file) ? parseCsvRecords(fs.readFileSync(file, 'utf8')) : [];

// ─── PULL: sheet → CSVs ──────────────────────────────────────────────────────
async function pull(): Promise<void> {
  const grids = await readAllTabs();

  // Areas (taman aktif) — from the first tab carrying an area-shaped table.
  const parks = new Map<string, string>(); // name → korlap
  // gps coming straight from the sheet, if those columns exist.
  const sheetGps = new Map<string, [string, string]>();
  for (const g of grids) {
    const t = findTable(g.rows, isAreaHeader);
    if (!t) continue;
    const { col } = t;
    for (let i = t.hdr + 1; i < g.rows.length; i++) {
      const r = g.rows[i];
      const name = (r[col['name']] ?? '').trim();
      if (!name) continue;
      if (norm(r[col['jenis']]) !== 'taman aktif') continue;
      if (!parks.has(name)) parks.set(name, (r[col['korlap']] ?? '').trim());
      const la = col['gps_lat'] != null ? (r[col['gps_lat']] ?? '').trim() : '';
      const lo = col['gps_lng'] != null ? (r[col['gps_lng']] ?? '').trim() : '';
      if (la && lo) sheetGps.set(name, [la, lo]);
    }
  }

  // Real users — across every user-shaped table; a real person row has a blank
  // username (synthetic dummy tables have usernames filled → skipped).
  const users = new Map<
    string,
    {
      full_name: string;
      role: string;
      phone: string;
      rayon_code: string;
      areas: string;
      supervisor: string;
      // `id`/`username` captured from the sheet (written back by push /
      // --push-from-db). Preferred over regeneration so a pull never clobbers a
      // DB-authored id (e.g. users created through the API get a v4 id that is
      // NOT the deterministic v5 the username would mint).
      id: string;
      username: string;
    }
  >();
  const cell = (r: string[], col: Record<string, number>, name: string): string =>
    (col[name] != null ? (r[col[name]] ?? '') : '').trim();
  const order: string[] = [];
  for (const g of grids) {
    const t = findTable(g.rows, isUserHeader);
    // Skip the synthetic reference tab (its rows are the code-generated dummies,
    // not client input). Real rows are identified by name + a mappable jabatan —
    // NOT by a blank username, since `sheet:push` fills usernames back in.
    if (!t || /\bdemo\b/i.test(g.title)) continue;
    const { col } = t;
    for (let i = t.hdr + 1; i < g.rows.length; i++) {
      const r = g.rows[i];
      const name = (r[col['nama']] ?? '').replace(/\s+/g, ' ').trim();
      if (!name) continue;
      const role = JAB[norm(r[col['jabatan']])];
      if (!role) continue;
      const areaRaw = (col['area'] != null ? r[col['area']] : '') || '';
      const rayon = rayonFromTitle(g.title);
      const key = name.toLowerCase();
      if (users.has(key)) {
        // Merge additional cells found on a later row for the same person.
        const u = users.get(key)!;
        if (!u.phone) u.phone = normPhone(col['no hp'] != null ? r[col['no hp']] : '');
        if (!u.id) u.id = cell(r, col, 'id');
        if (!u.username) u.username = cell(r, col, 'username');
        continue;
      }
      users.set(key, {
        full_name: name,
        role,
        phone: normPhone(col['no hp'] != null ? r[col['no hp']] : ''),
        rayon_code: rayon,
        areas: rayon === 'TAMAN_AKTIF' ? areaRaw : '',
        supervisor: cell(r, col, 'pengawas').replace(/\s+/g, ' '),
        id: cell(r, col, 'id'),
        username: cell(r, col, 'username'),
      });
      order.push(key);
    }
  }

  // Preserve existing coordinates (sheet → existing CSV → manual) so a pull
  // never wipes geocoded pins.
  const existing = new Map(readCsv(path.join(DATA_DIR, 'areas-taman-aktif.csv')).map((r) => [r.name, r]));
  const manualFile = path.join(DATA_DIR, 'manual-park-coords.json');
  const manual: Record<string, [number, number]> = fs.existsSync(manualFile)
    ? JSON.parse(fs.readFileSync(manualFile, 'utf8'))
    : {};

  const validArea = new Set([...parks.keys()].map((n) => n.toLowerCase()));
  const areaRows = [...parks.keys()].sort().map((name) => {
    const g = sheetGps.get(name) ?? (manual[name] ? [String(manual[name][0]), String(manual[name][1])] : null) ??
      (existing.get(name) ? [existing.get(name)!.gps_lat, existing.get(name)!.gps_lng] : ['', '']);
    return [uuidv5(`TAMAN_AKTIF:${name}:1`), name, parks.get(name)!, 'TAMAN_AKTIF', g[0] || '', g[1] || ''];
  });
  writeCsv(path.join(DATA_DIR, 'areas-taman-aktif.csv'), ['id', 'name', 'korlap', 'rayon_code', 'gps_lat', 'gps_lng'], areaRows);

  // username allocation + phone de-dup (mirror the generator)
  const usedNames = new Set<string>();
  const seenPhone = new Set<string>();
  for (let n = 10; n < 110; n++) seenPhone.add(`0812${String(n).padStart(8, '0')}`.slice(0, 20));
  // Reserve every username the sheet already holds up front, so a regenerated
  // username for a blank row can never collide with a preserved one.
  for (const key of order) {
    const un = users.get(key)!.username;
    if (un) usedNames.add(un);
  }
  const userRows = order.map((key) => {
    const u = users.get(key)!;
    // Prefer the username already on the sheet; only mint one when blank.
    let uname = u.username;
    if (!uname) {
      uname = slug(u.full_name);
      let k = 1;
      while (usedNames.has(uname)) uname = `${slug(u.full_name)}_${++k}`.slice(0, 50);
      usedNames.add(uname);
    }
    let phone = u.phone;
    if (phone && seenPhone.has(phone)) phone = '';
    if (phone) seenPhone.add(phone);
    const areas = u.areas
      ? u.areas.split(',').map((s) => s.trim()).filter((s) => validArea.has(s.toLowerCase()))
      : [];
    // Prefer the id already on the sheet (kept in sync with the live DB) so a
    // pull never clobbers a DB-authored id; fall back to the deterministic id.
    const id = UUID_RE.test(u.id) ? u.id : uuidv5(`USER:${uname}`);
    return [id, u.full_name, uname, phone, u.role, u.rayon_code, [...new Set(areas)].join('|'), u.supervisor];
  });
  writeCsv(
    path.join(DATA_DIR, 'users.csv'),
    ['id', 'full_name', 'username', 'phone', 'role', 'rayon_code', 'area_names', 'supervisor_name'],
    userRows,
  );

  // Rayons — master data (id/name/description/color) from the `rayon` tab.
  // Boundaries/center are NOT pulled (they come from the KMZ, not the sheet).
  // The tab is a DB export, so cells can be dirty: literal "NULL", or values
  // truncated with a trailing ellipsis. Fall back to the existing committed
  // rayons.csv for those so a pull never degrades clean master data.
  const rayonExisting = new Map(
    readCsv(path.join(DATA_DIR, 'rayons.csv')).map((r) => [r.rayon_code || r.name.toLowerCase(), r]),
  );
  // Trim, drop literal "NULL", and reject ellipsis-truncated cells.
  const cleanCell = (v: string | undefined): string => {
    const s = (v ?? '').replace(/\s+/g, ' ').trim();
    if (!s || /^null$/i.test(s)) return '';
    if (/[…]$|\.\.\.$/.test(s)) return ''; // truncated export → treat as blank
    return s;
  };
  const rayonRows: string[][] = [];
  for (const g of grids) {
    const t = findTable(g.rows, isRayonHeader);
    if (!t) continue;
    const { col } = t;
    for (let i = t.hdr + 1; i < g.rows.length; i++) {
      const r = g.rows[i];
      const name = (r[col['name']] ?? '').replace(/\s+/g, ' ').trim();
      if (!name) continue;
      const code = rayonFromTitle(name); // regex-matches the rayon name too
      const prev = rayonExisting.get(code || name.toLowerCase());
      const sheetId = (col['id'] != null ? (r[col['id']] ?? '') : '').trim();
      const desc = cleanCell(col['description'] != null ? r[col['description']] : '');
      const color = cleanCell(col['color'] != null ? r[col['color']] : '');
      rayonRows.push([
        // Preserve the id already on the sheet (the stable DB id); mint a
        // deterministic fallback only if the cell is blank/invalid.
        UUID_RE.test(sheetId) ? sheetId : (prev?.id ?? uuidv5(`RAYON:${code || name}`)),
        name,
        desc || (prev?.description ?? ''),
        color || (prev?.color ?? ''),
        code,
      ]);
    }
    break; // only the first rayon table
  }
  if (rayonRows.length) {
    rayonRows.sort((a, b) => a[4].localeCompare(b[4])); // stable order by rayon_code
    writeCsv(
      path.join(DATA_DIR, 'rayons.csv'),
      ['id', 'name', 'description', 'color', 'rayon_code'],
      rayonRows,
    );
  }

  console.log(
    `Pulled ${areaRows.length} parks + ${userRows.length} users + ${rayonRows.length} rayons from the sheet → seed CSVs.`,
  );
  console.log('Next: npm run db:seed:staging');
}

// ─── PUSH: ids + gps → sheet ─────────────────────────────────────────────────
async function push(): Promise<void> {
  const grids = await readAllTabs();
  const updates: Update[] = [];

  // Areas: write id + gps_lat/gps_lng (matched by name); add columns if absent.
  const areaCsv = new Map(readCsv(path.join(DATA_DIR, 'areas-taman-aktif.csv')).map((r) => [r.name, r]));
  for (const g of grids) {
    const t = findTable(g.rows, isAreaHeader);
    if (!t) continue;
    const hdrRow = g.rows[t.hdr];
    const ensure = (name: string): number => {
      if (t.col[name] != null) return t.col[name];
      const idx = hdrRow.length;
      hdrRow.push(name);
      t.col[name] = idx;
      updates.push({ range: `'${g.title}'!${A1(idx)}${t.hdr + 1}`, values: [[name]] });
      return idx;
    };
    const cId = ensure('id'), cLat = ensure('gps_lat'), cLng = ensure('gps_lng');
    for (let i = t.hdr + 1; i < g.rows.length; i++) {
      const name = (g.rows[i][t.col['name']] ?? '').trim();
      const rec = areaCsv.get(name);
      if (!rec) continue;
      const rowNo = i + 1;
      updates.push({ range: `'${g.title}'!${A1(cId)}${rowNo}`, values: [[rec.id]] });
      if (rec.gps_lat) updates.push({ range: `'${g.title}'!${A1(cLat)}${rowNo}:${A1(cLng)}${rowNo}`, values: [[rec.gps_lat, rec.gps_lng]] });
    }
    break; // only the first area table
  }

  // Users: write id (+ username) per real person, matched by name — across
  // every user tab (e.g. both "user - taman aktif" and "user - timur 2").
  const userCsv = new Map(readCsv(path.join(DATA_DIR, 'users.csv')).map((r) => [r.full_name.toLowerCase(), r]));
  for (const g of grids) {
    const t = findTable(g.rows, isUserHeader);
    if (!t || t.col['username'] == null) continue;
    // Lazily add an `id` column only if this tab actually has a matched row,
    // so empty/synthetic tabs are left untouched.
    let cId = t.col['id'] ?? -1;
    const ensureIdCol = (): number => {
      if (cId >= 0) return cId;
      cId = g.rows[t.hdr].length;
      updates.push({ range: `'${g.title}'!${A1(cId)}${t.hdr + 1}`, values: [['id']] });
      return cId;
    };
    for (let i = t.hdr + 1; i < g.rows.length; i++) {
      const name = (g.rows[i][t.col['nama']] ?? '').replace(/\s+/g, ' ').trim();
      const uname = (g.rows[i][t.col['username']] ?? '').trim();
      if (!name || uname) continue; // only real (blank-username) rows
      const rec = userCsv.get(name.toLowerCase());
      if (!rec) continue;
      const rowNo = i + 1;
      updates.push({ range: `'${g.title}'!${A1(ensureIdCol())}${rowNo}`, values: [[rec.id]] });
      updates.push({ range: `'${g.title}'!${A1(t.col['username'])}${rowNo}`, values: [[rec.username]] });
    }
  }

  // Rayons: write the stable id back into the `rayon` tab, matched by name —
  // the machine field only, mirroring how the user push writes id/username but
  // never overwrites human-edited cells (name/description/color stay sheet-owned
  // and are read on pull).
  const rayonCsv = new Map(
    readCsv(path.join(DATA_DIR, 'rayons.csv')).map((r) => [r.name.toLowerCase(), r]),
  );
  for (const g of grids) {
    const t = findTable(g.rows, isRayonHeader);
    if (!t) continue;
    const cId = t.col['id'] ?? -1;
    if (cId < 0) break; // rayon tab always ships an id column
    for (let i = t.hdr + 1; i < g.rows.length; i++) {
      const name = (g.rows[i][t.col['name']] ?? '').replace(/\s+/g, ' ').trim();
      if (!name) continue;
      const rec = rayonCsv.get(name.toLowerCase());
      if (!rec) continue;
      updates.push({ range: `'${g.title}'!${A1(cId)}${i + 1}`, values: [[rec.id]] });
    }
    break; // only the first rayon table
  }

  if (!updates.length) {
    console.log('Nothing to push (no matching tables/rows found).');
    return;
  }
  const applied = await writeUpdates(updates);
  console.log(`Pushed ${applied} cell ranges (ids + gps + usernames + rayons) into the sheet.`);
}

// ─── --list: inspect structure ───────────────────────────────────────────────
async function list(): Promise<void> {
  const grids = await readAllTabs();
  console.log(`${grids.length} tabs:`);
  for (const g of grids) {
    const a = findTable(g.rows, isAreaHeader);
    const u = findTable(g.rows, isUserHeader);
    const ry = findTable(g.rows, isRayonHeader);
    const kind = a ? 'AREA table' : u ? 'USER table' : ry ? 'RAYON table' : '—';
    console.log(`  • ${g.title.padEnd(28)} ${g.rows.length} rows  ${kind}`);
  }
}

async function main(): Promise<void> {
  if (!SHEET_ID) throw new Error('SEKAR_SHEET_ID is not set (be/.env.local).');
  if (useSA()) {
    console.log('Transport: Sheets API (service account)');
  } else if (WEBAPP_URL) {
    console.log('Transport: Apps Script web app');
  } else {
    throw new Error(
      `No sheet transport configured. Provide a service-account key at ${KEYFILE}, ` +
        'or set SEKAR_SHEET_WEBAPP_URL + SEKAR_SHEET_WEBAPP_TOKEN (Apps Script web app).',
    );
  }
  if (mode === 'list') await list();
  else if (mode === 'push') await push();
  else await pull();
}
main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
