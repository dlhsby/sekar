import type { SeedContext } from '../lib/context';

type NotableSeed = {
  areaName: string;
  species: string;
  lat: number;
  lng: number;
  heritage: boolean;
  label: string;
  notes: string;
};

// Phase 3 heritage trees pinned on the map (3 rows for showcase).
const NOTABLES: NotableSeed[] = [
  {
    areaName: 'Taman Bungkul',
    species: 'TREMBESI',
    lat: -7.2906,
    lng: 112.7378,
    heritage: true,
    label: 'Trembesi Heritage 1924',
    notes: 'Pohon trembesi peninggalan kolonial, lingkar batang ±4.2 m',
  },
  {
    areaName: 'Taman Bungkul',
    species: 'BERINGIN',
    lat: -7.2911,
    lng: 112.7382,
    heritage: true,
    label: 'Beringin Tua Selatan Bungkul',
    notes: 'Beringin tua dengan akar gantung, masuk daftar pohon dilindungi',
  },
  {
    areaName: 'Jl. Raya Darmo Pulau 1 (Depan Taman Bungkul)',
    species: 'TABEBUYA PINK',
    lat: -7.2901,
    lng: 112.7405,
    heritage: false,
    label: 'Tabebuya Pink Jalur Darmo',
    notes: 'Penanda musim semi Surabaya — mekar serentak sekitar Mei',
  },
];

/**
 * Seed 3 notable/heritage plants with GPS coordinates.
 * Uses ctx.maps.speciesIdByName from plant-species seeding.
 * Idempotent via (location_id, species_id, label) check.
 */
export async function seedNotablePlants(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding Notable Plants…');

  let notableInserted = 0;
  for (const n of NOTABLES) {
    const areaRow = await ctx.qr.query(`SELECT id FROM locations WHERE name = $1 LIMIT 1`, [
      n.areaName,
    ]);
    if (areaRow.length === 0) continue;
    const speciesId = ctx.maps.speciesIdByName.get(n.species);
    if (!speciesId) continue;
    const existing = await ctx.qr.query(
      `SELECT id FROM notable_plants
       WHERE location_id = $1 AND species_id = $2 AND label = $3 LIMIT 1`,
      [areaRow[0].id, speciesId, n.label],
    );
    if (existing.length > 0) continue;
    await ctx.qr.query(
      `INSERT INTO notable_plants
         (location_id, species_id, gps_lat, gps_lng, label, heritage, notes, photo_urls)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [areaRow[0].id, speciesId, n.lat, n.lng, n.label, n.heritage, n.notes, []],
    );
    notableInserted += 1;
  }
  ctx.log(`  ✓ ${notableInserted} notable_plants inserted`);
}
