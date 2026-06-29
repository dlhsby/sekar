/**
 * Geocode Taman Aktif parks → write gps_lat/gps_lng into
 * `src/database/seeds/data/areas-taman-aktif.csv`.
 *
 * Provider: Google Geocoding API when `GOOGLE_MAPS_API_KEY` is set (the same
 * key is shared by the mobile app; ensure the Geocoding API is enabled on it),
 * else the free OpenStreetMap Nominatim service.
 *
 * Usage:
 *   npm run seed:geocode          # only parks still missing coordinates
 *   npm run seed:geocode -- --all # re-geocode every park (e.g. switch provider)
 *
 * After running, reseed: `npm run db:seed:staging`.
 */
import '../src/config/load-env';
import * as fs from 'fs';
import * as path from 'path';

const CSV = path.join(__dirname, '../src/database/seeds/data/areas-taman-aktif.csv');
const MANUAL_FILE = path.join(__dirname, '../src/database/seeds/data/manual-park-coords.json');
const KEY = process.env.GOOGLE_MAPS_API_KEY?.trim();
const ALL = process.argv.includes('--all');

// Hand-provided coordinates that always win and are never cleared.
const MANUAL: Record<string, [number, number]> = fs.existsSync(MANUAL_FILE)
  ? (Object.fromEntries(
      Object.entries(JSON.parse(fs.readFileSync(MANUAL_FILE, 'utf8')) as Record<string, unknown>).filter(
        ([k, v]) => !k.startsWith('_') && Array.isArray(v),
      ),
    ) as Record<string, [number, number]>)
  : {};

// Surabaya bounding box (reject results that land outside the city).
const inSurabaya = (lat: number, lng: number): boolean =>
  lat >= -7.4 && lat <= -7.15 && lng >= 112.55 && lng <= 112.95;

// Name cleanups that geocode better.
const FIX: Record<string, string> = {
  'Taman KB. Wonorejo': 'Kebun Bibit Wonorejo',
  'Taman Kunang2': 'Taman Kunang Kunang',
  'Taman Bmx': 'Taman BMX',
  'Taman 10 Nopember': 'Taman 10 November',
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// A confident park hit must be an actual place — not a street/area centroid.
// Names like "Taman Bmx" otherwise resolve to a random `route` far away.
const PLACE_TYPES = new Set([
  'park',
  'point_of_interest',
  'establishment',
  'tourist_attraction',
  'premise',
  'natural_feature',
  'landmark',
]);

async function geocodeGoogle(name: string): Promise<[number, number] | null> {
  const q = encodeURIComponent(`${FIX[name] ?? name}, Surabaya, Indonesia`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&region=id&key=${KEY}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{ types?: string[]; geometry: { location: { lat: number; lng: number } } }>;
    error_message?: string;
  };
  if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
    throw new Error(`Google Geocoding: ${data.status} — ${data.error_message ?? ''}`);
  }
  // First result that is a real place inside Surabaya (skip bare routes/areas).
  for (const r of data.results ?? []) {
    const loc = r.geometry?.location;
    if (!loc || !inSurabaya(loc.lat, loc.lng)) continue;
    if ((r.types ?? []).some((t) => PLACE_TYPES.has(t))) return [loc.lat, loc.lng];
  }
  return null; // no confident place match → caller falls back to Nominatim
}

async function geocodeNominatim(name: string): Promise<[number, number] | null> {
  const q = encodeURIComponent(`${FIX[name] ?? name}, Surabaya`);
  const url =
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=3` +
    `&countrycodes=id&viewbox=112.55,-7.15,112.95,-7.40`;
  const res = await fetch(url, { headers: { 'User-Agent': 'sekar-seed/1.0 (admin@wahyutrip.com)' } });
  const arr = (await res.json()) as Array<{ lat: string; lon: string; class?: string; type?: string }>;
  const parky = arr.filter((x) => x.class === 'leisure' || (x.type ?? '').includes('park'));
  for (const x of [...parky, ...arr]) {
    const lat = Number(x.lat);
    const lng = Number(x.lon);
    if (inSurabaya(lat, lng)) return [lat, lng];
  }
  return null;
}

// Minimal CSV round-trip (these files are controlled, simple-quoted).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        f += '"';
        i++;
      } else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n') {
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else if (c !== '\r') f += c;
  }
  if (f.length || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
const cell = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

async function main(): Promise<void> {
  const provider = KEY ? 'Google Geocoding API' : 'Nominatim (no GOOGLE_MAPS_API_KEY set)';
  console.log(`Geocoding Taman Aktif parks via ${provider}${ALL ? ' [--all]' : ''}…`);

  const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
  const header = rows[0];
  const col = (n: string): number => header.indexOf(n);
  const iName = col('name');
  const iLat = col('gps_lat');
  const iLng = col('gps_lng');
  if (iName < 0 || iLat < 0 || iLng < 0) throw new Error('CSV missing name/gps_lat/gps_lng columns');

  let filled = 0;
  let miss = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = row[iName];
    if (!ALL && row[iLat]) continue; // already has coords
    // Google first (retrying transient REQUEST_DENIED while a just-enabled key
    // propagates); fall back to OSM Nominatim when Google has no confident place
    // match. Skipping keeps any existing coordinate rather than aborting.
    let hit: [number, number] | null = null;
    let source = '';
    if (MANUAL[name]) {
      hit = MANUAL[name];
      source = 'manual';
    } else if (KEY) {
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          hit = await geocodeGoogle(name);
          await sleep(150);
          break;
        } catch (err) {
          if (attempt === 4) console.error(`  ! ${name}: ${(err as Error).message.slice(0, 90)}`);
          else await sleep(900 * attempt);
        }
      }
      source = hit ? 'g' : '';
      if (!hit) {
        try {
          hit = await geocodeNominatim(name);
          source = hit ? 'osm' : '';
        } catch {
          /* ignore */
        }
        await sleep(1100); // Nominatim asks ≤1 req/s
      }
    } else {
      try {
        hit = await geocodeNominatim(name);
        source = hit ? 'osm' : '';
      } catch {
        /* ignore */
      }
      await sleep(1100);
    }
    if (hit) {
      row[iLat] = hit[0].toFixed(7);
      row[iLng] = hit[1].toFixed(7);
      filled++;
      console.log(`  ✓ ${name.padEnd(26)} ${hit[0].toFixed(5)},${hit[1].toFixed(5)}  [${source}]`);
    } else {
      miss++;
      if (ALL) {
        // Clear any stale coordinate so the seeder uses a placeholder pin
        // rather than a low-confidence (wrong) match.
        row[iLat] = '';
        row[iLng] = '';
      }
      console.log(`  · ${name.padEnd(26)} (no confident place match)`);
    }
  }

  fs.writeFileSync(CSV, [header, ...rows.slice(1)].map((r) => r.map(cell).join(',')).join('\n') + '\n');
  const withCoords = rows.slice(1).filter((r) => r[iLat]).length;
  console.log(`\nUpdated ${filled} parks (${miss} unresolved). ${withCoords}/${rows.length - 1} now have coordinates.`);
  console.log('Next: npm run db:seed:staging');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
