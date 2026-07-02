import type { SeedContext } from '../lib/context';
import { RAYON_ID_BY_CODE } from '../lib/ids';
import { loadKmzAreas, loadTamanAktifAreas } from '../load-seed-data';
import {
  RAYON_PUSAT_AREAS,
  TIMUR2_AREAS,
  parseCoords,
  computeCentroidFromRings,
  computeAreaM2FromRings,
  toGeoJsonGeometry,
  surabayaOutlinePolygon,
  hullPolygonFromRings,
  BUNGKUL_AREA_ID,
  BUNGKUL_COORD_STRINGS,
  TAMAN_FLORA_AREA_ID,
  TAMAN_FLORA_CENTER,
  RAYON_TAMAN_AKTIF_OFFICE,
  type AreaDef,
  type RayonCode,
} from '../kmz-areas';

/**
 * Seed 38 areas: 13 Rayon Pusat + 25 Rayon Timur 2 + Rayon Timur 1 coverage areas
 * + Taman Aktif parks + Taman Flora (city-wide boundary).
 * Empty rayons (Selatan / Utara / Timur 1 / Barat 1 / Barat 2) intentionally
 * have no areas — they exercise the "rayon with no areas" supervisor view.
 */
export async function seedAreas(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding Areas from KMZ...');

  // One area row (boundary + coverage may be null).
  const insertArea = async (
    id: string,
    name: string,
    typeCode: string,
    lat: number,
    lng: number,
    boundaryJson: string | null,
    coverage: number | null,
    rayonId: string,
  ): Promise<void> => {
    await ctx.qr.query(
      `INSERT INTO areas (
        id, name, area_type_id, gps_lat, gps_lng, radius_meters,
        boundary_polygon, coverage_area, rayon_id, is_active
      )
      SELECT
        $1, $2,
        (SELECT id FROM area_types WHERE code = $3 LIMIT 1),
        $4, $5, 100,
        $6::jsonb, $7,
        $8, TRUE
      ON CONFLICT (id) DO NOTHING`,
      [id, name, typeCode, lat, lng, boundaryJson, coverage, rayonId],
    );
  };

  const insertAreaDef = async (areaDef: AreaDef, coordStrings: string[]): Promise<void> => {
    const rings = coordStrings.map((s) => parseCoords(s));
    const { lat, lng } = computeCentroidFromRings(rings);
    await insertArea(
      areaDef.id,
      areaDef.name,
      areaDef.typeCode,
      lat,
      lng,
      JSON.stringify(toGeoJsonGeometry(coordStrings)),
      computeAreaM2FromRings(rings),
      RAYON_ID_BY_CODE[areaDef.rayonCode],
    );
  };

  // Curated Pusat + Timur 2 demo areas, geometry refreshed from the latest KMZ
  // (matched by deterministic id) so ids + dummy assignments stay stable.
  const kmzAll = loadKmzAreas();
  const freshCoordsById = new Map(kmzAll.map((a) => [a.id, a.coordStrings]));
  const ALL_AREA_DEFS: AreaDef[] = [...RAYON_PUSAT_AREAS, ...TIMUR2_AREAS];
  for (const areaDef of ALL_AREA_DEFS) {
    await insertAreaDef(areaDef, freshCoordsById.get(areaDef.id) ?? areaDef.coordStrings);
  }
  ctx.log(`  ✓ Seeded ${ALL_AREA_DEFS.length} areas (13 Rayon Pusat + 25 Rayon Timur 2)`);

  // Rayon Timur 1 coverage areas — full set from the KMZ so local testing has
  // Timur 1 boundaries (staging seeds these too).
  const timur1Areas = kmzAll.filter((a) => a.rayonCode === 'TIMUR1');
  for (const a of timur1Areas) await insertAreaDef(a, a.coordStrings);
  ctx.log(`  ✓ Seeded ${timur1Areas.length} Rayon Timur 1 coverage areas (KMZ)`);

  // Taman Aktif parks with real geofences — match the client park list to the
  // taman-aktif KMZ polygons by normalized name (+ alias bridge for label
  // drift); unmatched parks get a center pin. Flora/Bungkul handled specially.
  const normParkName = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  const tamanBoundaryByName = new Map<string, string[]>();
  for (const a of kmzAll) {
    if (a.rayonCode !== 'TAMAN_AKTIF') continue;
    const key = normParkName(a.name);
    if (!tamanBoundaryByName.has(key)) tamanBoundaryByName.set(key, a.coordStrings);
  }
  const TAMAN_NAME_ALIASES: Record<string, string> = {
    'taman insenerator': 'taman incinerator',
    'taman kb wonorejo': 'taman kebun bibit wonorejo',
    'taman kombes': 'taman kombes pol m duryat',
    'taman kunang2': 'taman kunang kunang',
    'taman tais': 'taman ais nasution',
  };
  for (const [csvNorm, kmzNorm] of Object.entries(TAMAN_NAME_ALIASES)) {
    const coords = tamanBoundaryByName.get(kmzNorm);
    if (coords && !tamanBoundaryByName.has(csvNorm)) tamanBoundaryByName.set(csvNorm, coords);
  }
  let tamanSeeded = 0;
  let tamanWithBoundary = 0;
  for (const a of loadTamanAktifAreas()) {
    if (a.name === 'Taman Flora') continue; // city-wide boundary seeded below
    if (a.name === 'Taman Bungkul') {
      const rings = BUNGKUL_COORD_STRINGS.map((s) => parseCoords(s));
      const { lat, lng } = computeCentroidFromRings(rings);
      await insertArea(
        BUNGKUL_AREA_ID,
        a.name,
        'park',
        lat,
        lng,
        JSON.stringify(toGeoJsonGeometry(BUNGKUL_COORD_STRINGS)),
        computeAreaM2FromRings(rings),
        RAYON_ID_BY_CODE['TAMAN_AKTIF'],
      );
      tamanWithBoundary += 1;
    } else {
      const coordStrings = tamanBoundaryByName.get(normParkName(a.name));
      if (coordStrings && coordStrings.length > 0) {
        const rings = coordStrings.map((s) => parseCoords(s));
        const { lat, lng } = computeCentroidFromRings(rings);
        await insertArea(
          a.id,
          a.name,
          'park',
          lat,
          lng,
          JSON.stringify(toGeoJsonGeometry(coordStrings)),
          computeAreaM2FromRings(rings),
          RAYON_ID_BY_CODE['TAMAN_AKTIF'],
        );
        tamanWithBoundary += 1;
      } else {
        await insertArea(
          a.id,
          a.name,
          'park',
          a.gps_lat ?? RAYON_TAMAN_AKTIF_OFFICE.lat,
          a.gps_lng ?? RAYON_TAMAN_AKTIF_OFFICE.lng,
          null,
          null,
          RAYON_ID_BY_CODE['TAMAN_AKTIF'],
        );
      }
    }
    tamanSeeded += 1;
  }
  ctx.log(`  ✓ Seeded ${tamanSeeded} Taman Aktif parks (${tamanWithBoundary} with KMZ geofences)`);

  // Taman Flora (Rayon Taman Aktif) — GPS pin on the park itself, but its
  // boundary spans the whole-Surabaya outline (hull of all rayon polygons).
  const floraPolygon = surabayaOutlinePolygon();
  const floraRing = floraPolygon.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number]);
  await ctx.qr.query(
    `INSERT INTO areas (
      id, name, area_type_id, gps_lat, gps_lng, radius_meters,
      boundary_polygon, coverage_area, rayon_id, is_active
    )
    SELECT
      $1, $2,
      (SELECT id FROM area_types WHERE code = 'park' LIMIT 1),
      $3, $4, 100,
      $5::jsonb, $6,
      $7, TRUE
    ON CONFLICT (id) DO NOTHING`,
    [
      TAMAN_FLORA_AREA_ID,
      'Taman Flora',
      TAMAN_FLORA_CENTER.lat,
      TAMAN_FLORA_CENTER.lng,
      JSON.stringify(floraPolygon),
      computeAreaM2FromRings([floraRing]),
      RAYON_ID_BY_CODE['TAMAN_AKTIF'],
    ],
  );
  ctx.log('  ✓ Seeded Taman Flora (Rayon Taman Aktif, city-wide boundary)');
}
