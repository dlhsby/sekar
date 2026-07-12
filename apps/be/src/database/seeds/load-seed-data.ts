/**
 * Loaders for the committed seed-data snapshots under `./data/`.
 *
 * These let the staging seeder be re-run from the client's exported sheet data
 * without code edits: update the CSVs (or re-run the KMZ extractor) and reseed.
 *
 *   data/rayons.csv                — 8 rayons master data (name/description/color)
 *   data/locations-kmz.generated.json  — geographic locations (run scripts/extract-kmz-seed-data.js)
 *   data/locations-taman-aktif.csv     — Taman Aktif parks (exported from the sheet)
 *   data/users.csv                 — real roster (exported + merged from the sheet)
 */
import * as fs from 'fs';
import * as path from 'path';
import type { RayonCode } from './kmz-locations';
import { parseCsvRecords, uuidv5 } from './csv-util';

const DATA_DIR = path.join(__dirname, 'data');

// Same namespace sheet-sync uses to mint deterministic user ids, so an id
// derived here from the username is byte-identical to the one the sheet holds.
const USER_NS = 'b7e3c1a0-5d2f-4e8b-9c3a-1f2e3d4c5b6a';

export interface SeedRayonRow {
  id: string;
  name: string;
  description: string;
  /** Hex map colour, or '' when unset. */
  color: string;
  rayon_code: string;
}

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

/** Header-keyed records from a CSV file. Returns [] when the file is absent —
 * some snapshots (e.g. the PII `users.csv`) are gitignored and must be
 * regenerated via `npm run sheet:pull` before seeding. */
function readCsvRecords(file: string): Record<string, string>[] {
  if (!fs.existsSync(file)) return [];
  return parseCsvRecords(fs.readFileSync(file, 'utf8'));
}

/** The 8 rayons — master data (id/name/description/color) editable via the
 * sheet's `rayon` tab. Boundaries are sourced separately from the KMZ
 * (RAYON_BOUNDARIES), not this CSV. */
export function loadRayons(): SeedRayonRow[] {
  return readCsvRecords(path.join(DATA_DIR, 'rayons.csv')).map((r) => ({
    id: r.id?.trim() ?? '',
    name: r.name?.trim() ?? '',
    description: r.description?.trim() ?? '',
    color: r.color?.trim() ?? '',
    rayon_code: r.rayon_code?.trim() ?? '',
  }));
}

export function loadKmzAreas(): KmzAreaRow[] {
  const file = path.join(DATA_DIR, 'locations-kmz.generated.json');
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { areas: KmzAreaRow[] };
  return parsed.areas;
}

export function loadTamanAktifAreas(): TamanAktifAreaRow[] {
  return readCsvRecords(path.join(DATA_DIR, 'locations-taman-aktif.csv')).map((r) => ({
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
    // `id` is optional in the CSV: it is deterministically derivable from the
    // username, so the shipped (secret-sized) roster can omit it to stay under
    // GitHub's env-secret size limit. Derive it when absent.
    id: r.id?.trim() || uuidv5(`USER:${r.username}`, USER_NS),
    full_name: r.full_name,
    username: r.username,
    phone: r.phone,
    role: r.role,
    rayon_code: r.rayon_code,
    area_names: r.area_names ? r.area_names.split('|').filter((s) => s.trim() !== '') : [],
    supervisor_name: r.supervisor_name,
  }));
}
