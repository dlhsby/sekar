/* eslint-disable */
/**
 * KMZ → seed-data extractor.
 *
 * Parses the per-rayon KMZ files committed under
 *   src/database/seeds/data/kmz/*.kmz
 * and regenerates
 *   src/database/seeds/data/areas-kmz.generated.json
 * an `AreaDef[]`-shaped list the staging seeder loads (it reuses the geometry
 * helpers in `kmz-areas.ts` via the raw `coordStrings`).
 *
 * Only Polygon / MultiGeometry placemarks are kept (Point / LineString markers
 * are skipped). Area IDs are deterministic UUID v5 keyed on
 * `rayonCode:name:occurrence`, so re-running on the same KMZ yields stable IDs
 * (idempotent reloads) and renamed/added placemarks only affect their own rows.
 *
 * Re-load workflow when the client sends new KMZ:
 *   1. drop the new files into src/database/seeds/data/kmz/ (same filenames),
 *   2. `npm run seed:extract-kmz`,
 *   3. `npm run db:seed:staging`.
 *
 * Usage: node scripts/extract-kmz-seed-data.js [kmzDir] [outFile]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');
const { parseStringPromise } = require('xml2js');

const KMZ_DIR = process.argv[2] || path.resolve(__dirname, '../src/database/seeds/data/kmz');
const OUT_FILE =
  process.argv[3] || path.resolve(__dirname, '../src/database/seeds/data/areas-kmz.generated.json');

// Fixed namespace for deterministic area IDs (do not change — IDs depend on it).
const AREA_ID_NAMESPACE = 'b7e3c1a0-5d2f-4e8b-9c3a-1f2e3d4c5b6a';

// KMZ filename → rayon code + human label (for synthesized names).
const FILE_TO_RAYON = {
  'Rayon Utara.kmz': { code: 'UTARA', label: 'Rayon Utara' },
  'Rayon Selatan.kmz': { code: 'SELATAN', label: 'Rayon Selatan' },
  'Rayon Timur 2.kmz': { code: 'TIMUR2', label: 'Rayon Timur 2' },
  'Rayon Pusat.kmz': { code: 'PUSAT', label: 'Rayon Pusat' },
  'Rayon Barat 1.kmz': { code: 'BARAT1', label: 'Rayon Barat 1' },
  'Rayon Barat 2.kmz': { code: 'BARAT2', label: 'Rayon Barat 2' },
};

/** Deterministic UUID v5 (SHA-1) — dependency-free so the script can't drift. */
function uuidv5(name, namespace) {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = crypto.createHash('sha1');
  hash.update(nsBytes);
  hash.update(Buffer.from(name, 'utf8'));
  const bytes = hash.digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Buffer.from(bytes).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Collapse all whitespace runs so a KML coordinate blob → single-line string. */
function normalizeCoordStr(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

/** Tidy a placemark name: trim + collapse inner whitespace. */
function cleanName(raw) {
  if (raw == null) return '';
  const text = typeof raw === 'object' ? (raw._ ?? '') : raw;
  return String(text).replace(/\s+/g, ' ').trim();
}

/** Recursively collect every `Placemark` node anywhere in the parsed tree. */
function collectPlacemarks(node, acc) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectPlacemarks(n, acc));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'Placemark') {
      (Array.isArray(value) ? value : [value]).forEach((pm) => acc.push(pm));
    } else {
      collectPlacemarks(value, acc);
    }
  }
}

/** Recursively collect every `Polygon` node within a single placemark subtree. */
function collectPolygons(node, acc) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectPolygons(n, acc));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'Polygon') {
      (Array.isArray(value) ? value : [value]).forEach((p) => acc.push(p));
    } else {
      collectPolygons(value, acc);
    }
  }
}

/** Outer-ring coordinate strings for a placemark (one per Polygon, multi → MultiPolygon). */
function polygonCoordStrings(pm) {
  const polys = [];
  collectPolygons(pm, polys);
  const rings = [];
  for (const poly of polys) {
    const ring = poly?.outerBoundaryIs?.[0]?.LinearRing?.[0]?.coordinates?.[0];
    if (ring && String(ring).trim()) rings.push(normalizeCoordStr(ring));
  }
  return rings;
}

function inferTypeCode(name) {
  const n = name.toLowerCase();
  if (n.startsWith('taman')) return 'park';
  if (n.includes('pendestrian') || n.includes('pedestrian')) return 'pedestrian';
  return 'street';
}

async function extractFile(filePath, rayon) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  const kmlEntry =
    zip.file('doc.kml') || zip.file(Object.keys(zip.files).find((f) => f.endsWith('.kml')));
  const kml = await kmlEntry.async('string');
  const parsed = await parseStringPromise(kml, { explicitArray: true });

  const placemarks = [];
  collectPlacemarks(parsed, placemarks);

  const rows = [];
  const nameCounts = new Map(); // name → running occurrence count (for stable IDs + de-dup of synth names)
  let unnamedSeq = 0;
  let skipped = 0;

  for (const pm of placemarks) {
    const coordStrings = polygonCoordStrings(pm);
    if (coordStrings.length === 0) {
      skipped += 1; // Point / LineString only — not an area boundary.
      continue;
    }
    let name = cleanName(pm.name?.[0]);
    if (!name) {
      unnamedSeq += 1;
      name = `${rayon.label} Area ${unnamedSeq}`;
    }
    const occ = (nameCounts.get(name) || 0) + 1;
    nameCounts.set(name, occ);
    const idKey = `${rayon.code}:${name}:${occ}`;
    rows.push({
      id: uuidv5(idKey, AREA_ID_NAMESPACE),
      name,
      typeCode: inferTypeCode(name),
      rayonCode: rayon.code,
      coordStrings,
    });
  }
  return { rows, skipped, total: placemarks.length };
}

async function main() {
  if (!fs.existsSync(KMZ_DIR)) {
    throw new Error(`KMZ directory not found: ${KMZ_DIR}`);
  }
  const files = fs
    .readdirSync(KMZ_DIR)
    .filter((f) => f.toLowerCase().endsWith('.kmz'))
    .sort();

  const all = [];
  const summary = [];
  for (const file of files) {
    const rayon = FILE_TO_RAYON[file];
    if (!rayon) {
      console.warn(`  ⚠️  Skipping unmapped KMZ file: ${file}`);
      continue;
    }
    const { rows, skipped, total } = await extractFile(path.join(KMZ_DIR, file), rayon);
    all.push(...rows);
    summary.push({ file, rayon: rayon.code, areas: rows.length, skippedNonPolygon: skipped, total });
  }

  // Guard: deterministic IDs must be unique across the whole set.
  const seen = new Set();
  for (const r of all) {
    if (seen.has(r.id)) throw new Error(`Duplicate area id ${r.id} (${r.rayonCode} / ${r.name})`);
    seen.add(r.id);
  }

  const header = {
    _generated: 'scripts/extract-kmz-seed-data.js — do not hand-edit; re-run the extractor.',
    _source: 'src/database/seeds/data/kmz/*.kmz',
    count: all.length,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify({ ...header, areas: all }, null, 2) + '\n');

  console.log('KMZ extraction summary:');
  for (const s of summary) {
    console.log(
      `  ${s.rayon.padEnd(8)} ${String(s.areas).padStart(4)} areas  (skipped ${s.skippedNonPolygon} non-polygon of ${s.total})`,
    );
  }
  console.log(`  ${'TOTAL'.padEnd(8)} ${String(all.length).padStart(4)} areas → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
