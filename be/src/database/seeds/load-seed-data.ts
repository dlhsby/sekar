/**
 * Loaders for the committed seed-data snapshots under `./data/`.
 *
 * These let the staging seeder be re-run from the client's exported sheet data
 * without code edits: update the CSVs (or re-run the KMZ extractor) and reseed.
 *
 *   data/areas-kmz.generated.json  — geographic areas (run scripts/extract-kmz-seed-data.js)
 *   data/areas-taman-aktif.csv     — Taman Aktif parks (exported from the sheet)
 *   data/users.csv                 — real roster (exported + merged from the sheet)
 */
import * as fs from 'fs';
import * as path from 'path';
import type { RayonCode } from './kmz-areas';

const DATA_DIR = path.join(__dirname, 'data');

export interface KmzAreaRow {
  id: string;
  name: string;
  typeCode: 'park' | 'pedestrian' | 'mini_garden' | 'street';
  rayonCode: RayonCode;
  coordStrings: string[];
}

export interface TamanAktifAreaRow {
  id: string;
  name: string;
  korlap: string;
  rayon_code: string;
  /** Geocoded park centre (null until sourced); empty in CSV → null. */
  gps_lat: number | null;
  gps_lng: number | null;
}

export interface SeedUserRow {
  id: string;
  full_name: string;
  username: string;
  phone: string;
  role: string;
  rayon_code: string;
  /** Taman Aktif park names this user is assigned to (first = primary). */
  area_names: string[];
  supervisor_name: string;
}

/** Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas, "" escapes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // ignore
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse a CSV file into header-keyed records, skipping blank trailing rows.
 * Returns [] when the file is absent — some snapshots (e.g. the PII `users.csv`)
 * are gitignored and must be regenerated via `npm run sheet:pull` before seeding. */
function readCsvRecords(file: string): Record<string, string>[] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h.trim()] = (r[i] ?? '').trim()));
    return rec;
  });
}

export function loadKmzAreas(): KmzAreaRow[] {
  const file = path.join(DATA_DIR, 'areas-kmz.generated.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { areas: KmzAreaRow[] };
  return parsed.areas;
}

export function loadTamanAktifAreas(): TamanAktifAreaRow[] {
  return readCsvRecords(path.join(DATA_DIR, 'areas-taman-aktif.csv')).map((r) => ({
    id: r.id,
    name: r.name,
    korlap: r.korlap,
    rayon_code: r.rayon_code,
    gps_lat: r.gps_lat ? Number(r.gps_lat) : null,
    gps_lng: r.gps_lng ? Number(r.gps_lng) : null,
  }));
}

export function loadSeedUsers(): SeedUserRow[] {
  return readCsvRecords(path.join(DATA_DIR, 'users.csv')).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    username: r.username,
    phone: r.phone,
    role: r.role,
    rayon_code: r.rayon_code,
    area_names: r.area_names ? r.area_names.split('|').filter((s) => s.trim() !== '') : [],
    supervisor_name: r.supervisor_name,
  }));
}
