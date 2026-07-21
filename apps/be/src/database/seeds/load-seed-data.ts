/**
 * Loaders for the committed seed-data snapshots under `./data/`.
 *
 * The geography snapshots (districts/kawasan/areas) are pulled live from staging —
 * the source of truth. The real user roster still comes from the exported sheet.
 *
 *   data/districts.snapshot.json   — 8 districts pulled live from staging (name/desc/colour/geometry)
 *   data/kawasan.snapshot.json  — kawasan (regions) from the client's workbook
 *   data/areas.snapshot.json    — ~953 locations pulled live from staging
 *   data/users.csv              — real roster (exported + merged from the sheet)
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvRecords, uuidv5 } from './csv-util';

const DATA_DIR = path.join(__dirname, 'data');

// Same namespace sheet-sync uses to mint deterministic user ids, so an id
// derived here from the username is byte-identical to the one the sheet holds.
const USER_NS = 'b7e3c1a0-5d2f-4e8b-9c3a-1f2e3d4c5b6a';

export interface SeedDistrictRow {
  id: string;
  name: string;
  description: string;
  /** Hex map colour, or '' when unset. */
  color: string;
  rayon_code: string;
}

/** GeoJSON Polygon (the only shape district boundaries use). */
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * Full district snapshot pulled live from staging (the source of truth — the client
 * validated names/colours/boundaries there via the UI). Supersedes the initial
 * `data/districts.csv` + KMZ-derived boundaries. Regenerate with the data-pull
 * script when staging changes.
 */
export interface DistrictSnapshotRow extends SeedDistrictRow {
  center_lat: number | null;
  center_lng: number | null;
  boundary_polygon: GeoJsonPolygon;
  /** Tier its staffing requirements attach to: region (kawasan) | location | district. */
  staffing_level: 'region' | 'location' | 'district';
}

/** The 8 districts as they currently live in staging (master data + geometry). */
export function loadDistrictSnapshot(): DistrictSnapshotRow[] {
  const file = path.join(DATA_DIR, 'districts.snapshot.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as DistrictSnapshotRow[];
}

/**
 * A Kawasan (Region) — name + parent district. Extracted from the client's
 * "Kebutuhan Satgas" workbook (column K "NAMA RTH", cells prefixed "Kawasan…"),
 * grouped under the district each tab belongs to. Boundaries are drawn fresh in the
 * UI, so only name + district_id are seeded (id is deterministic for idempotency).
 */
export interface KawasanSnapshotRow {
  id: string;
  name: string;
  district_id: string;
  /** Rayon display name at extraction time — documentation only. */
  district_name: string;
}

/**
 * The Kawasan (regions) grouped by district, from the client's workbook.
 *
 * The snapshot file still carries the pre-ADR-052 `rayon_id`/`rayon_name` keys;
 * normalise them to `district_id`/`district_name` here so callers see one shape
 * regardless of when the file was regenerated.
 */
export function loadKawasanSnapshot(): KawasanSnapshotRow[] {
  const file = path.join(DATA_DIR, 'kawasan.snapshot.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<
    Partial<KawasanSnapshotRow> & { rayon_id?: string; rayon_name?: string }
  >;
  return raw.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    district_id: (r.district_id ?? r.rayon_id) as string,
    district_name: (r.district_name ?? r.rayon_name) as string,
  }));
}

/**
 * One area (location) as it lives in staging — the source of truth (client
 * validated names/boundaries/district there). Pulled verbatim; boundaries are
 * GeoJSON. `region_id` is intentionally absent (staging predates the Kawasan
 * tier; areas are re-parented later).
 */
export interface AreaSnapshotRow {
  id: string;
  name: string;
  district_id: string;
  /** location-type code: park | pedestrian | mini_garden | street. */
  area_type_code: string;
  gps_lat: number | null;
  gps_lng: number | null;
  /** Snapshot-only: retired as a column, still the source for a derived ring. */
  radius_meters: number | null;
  address: string | null;
  is_active: boolean;
  coverage_area: number | null;
  boundary_polygon: GeoJsonPolygon | null;
}

/** All areas (locations) as they currently live in staging. */
export function loadAreaSnapshot(): AreaSnapshotRow[] {
  const file = path.join(DATA_DIR, 'areas.snapshot.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AreaSnapshotRow[];
}

/**
 * area id → kawasan (region) id — the confident name matches between the
 * workbook's per-kawasan RTH lists and staging area names. Areas without a
 * confident match are absent (left unassigned for UI remediation).
 */
export function loadAreaRegionMap(): Record<string, string> {
  const file = path.join(DATA_DIR, 'area-region.snapshot.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

/**
 * A staffing requirement (KEBUTUHAN) extracted from the client workbook: satgas
 * headcount per subject × shift × day_type. `subject_type` says which id column
 * it fills (`region` for the 7 grouped districts' kawasan, `location` for Taman
 * Aktif parks). Deterministic id → idempotent seed + migration.
 */
export interface StaffingSnapshotRow {
  id: string;
  subject_type: 'region' | 'location' | 'district';
  subject_id: string;
  shift_definition_id: string;
  role: 'satgas' | 'linmas';
  day_type: 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';
  required_count: number;
}

/** Staffing requirements (satgas KEBUTUHAN) from the client workbook. */
export function loadStaffingSnapshot(): StaffingSnapshotRow[] {
  const file = path.join(DATA_DIR, 'staffing.snapshot.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')) as StaffingSnapshotRow[];
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
