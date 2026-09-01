import type { SeedContext } from '../lib/context';

// Plant species reference data — 124 species across tree/shrub/flower categories
const PLANT_SPECIES: Array<{ nameId: string; category: string }> = [
  { nameId: 'AKASIA', category: 'tree' },
  { nameId: 'ALIANDER', category: 'shrub' },
  { nameId: 'ALPUKAT', category: 'tree' },
  { nameId: 'AMBAR', category: 'tree' },
  { nameId: 'ASEM', category: 'tree' },
  { nameId: 'ASEM LONDO', category: 'tree' },
  { nameId: 'AWAR - AWAR', category: 'shrub' },
  { nameId: 'BAMBU', category: 'shrub' },
  { nameId: 'BATTER CUP', category: 'flower' },
  { nameId: 'BERINGIN', category: 'tree' },
  { nameId: 'BIDARA', category: 'tree' },
  { nameId: 'BINTARO', category: 'tree' },
  { nameId: 'BIOLA CANTIK', category: 'tree' },
  { nameId: 'BISBUL', category: 'tree' },
  { nameId: 'BLIMBING', category: 'tree' },
  { nameId: 'BLIMBING WULO', category: 'tree' },
  { nameId: 'BOGENVIL', category: 'shrub' },
  { nameId: 'BOUBAB', category: 'tree' },
  { nameId: 'BUNGUR', category: 'tree' },
  { nameId: 'BUTTER CUP', category: 'flower' },
  { nameId: 'CEMARA', category: 'tree' },
  { nameId: 'CEMARA UDANG', category: 'tree' },
  { nameId: 'COOKTREE', category: 'tree' },
  { nameId: 'DADAP MERAH', category: 'tree' },
  { nameId: 'FLAMBOYANT', category: 'tree' },
  { nameId: 'GAMAL', category: 'tree' },
  { nameId: 'GAYAM', category: 'tree' },
  { nameId: 'GEMPOL', category: 'tree' },
  { nameId: 'GLODOKAN', category: 'tree' },
  { nameId: 'GLODOKAN TIYANG', category: 'tree' },
  { nameId: 'IPRIK', category: 'tree' },
  { nameId: 'JABON', category: 'tree' },
  { nameId: 'JAKARANDA', category: 'tree' },
  { nameId: 'JAMBU', category: 'tree' },
  { nameId: 'JAMBU AIR', category: 'tree' },
  { nameId: 'JAMBU DARSONO', category: 'tree' },
  { nameId: 'JARANAN', category: 'tree' },
  { nameId: 'JATI', category: 'tree' },
  { nameId: 'JATIMAS', category: 'tree' },
  { nameId: 'JERUK NIPIS', category: 'tree' },
  { nameId: 'JOHAR', category: 'tree' },
  { nameId: 'JUAR', category: 'tree' },
  { nameId: 'JUWET', category: 'tree' },
  { nameId: 'KAMBOJA', category: 'tree' },
  { nameId: 'KARET', category: 'tree' },
  { nameId: 'KAYAK', category: 'tree' },
  { nameId: 'KAYU HITAM', category: 'tree' },
  { nameId: 'KAYU PUTIH', category: 'tree' },
  { nameId: 'KECACIL', category: 'shrub' },
  { nameId: 'KEDINDING', category: 'shrub' },
  { nameId: 'KEDONDONG', category: 'tree' },
  { nameId: 'KELAPA', category: 'tree' },
  { nameId: 'KELAPA SAWIT', category: 'tree' },
  { nameId: 'KELENGKENG', category: 'tree' },
  { nameId: 'KELOR', category: 'tree' },
  { nameId: 'KEMIRI', category: 'tree' },
  { nameId: 'KENANGGA', category: 'tree' },
  { nameId: 'KENITU', category: 'tree' },
  { nameId: 'KEPOH', category: 'tree' },
  { nameId: 'KERES', category: 'tree' },
  { nameId: 'KERTAS', category: 'shrub' },
  { nameId: 'KESAMBI', category: 'tree' },
  { nameId: 'KETEPENG', category: 'shrub' },
  { nameId: 'KETEPENG KENCANA', category: 'shrub' },
  { nameId: 'KIGELIA PINNATA / SOSIS', category: 'tree' },
  { nameId: 'KINCAU', category: 'tree' },
  { nameId: 'KLUWEH', category: 'tree' },
  { nameId: 'KUPU KUPU', category: 'tree' },
  { nameId: 'KURMA', category: 'tree' },
  { nameId: 'LAMTORO', category: 'tree' },
  { nameId: 'MAHONI', category: 'tree' },
  { nameId: 'MANGGA', category: 'tree' },
  { nameId: 'MATOA', category: 'tree' },
  { nameId: 'MENGKUDU', category: 'tree' },
  { nameId: 'MIMBO', category: 'tree' },
  { nameId: 'MORES', category: 'tree' },
  { nameId: 'MURBEI', category: 'tree' },
  { nameId: 'NANGKA', category: 'tree' },
  { nameId: 'NYAMPLUNG', category: 'tree' },
  { nameId: 'PACE', category: 'tree' },
  { nameId: 'PALEM', category: 'tree' },
  { nameId: 'PALEM BISMAKIA', category: 'tree' },
  { nameId: 'PALEM EKOR TUPAI', category: 'tree' },
  { nameId: 'PALEM KIPAS', category: 'tree' },
  { nameId: 'PALEM KURMA', category: 'tree' },
  { nameId: 'PALEM PERAK', category: 'tree' },
  { nameId: 'PALEM PUTRI', category: 'tree' },
  { nameId: 'PALEM RAJA', category: 'tree' },
  { nameId: 'PALEM ROJO', category: 'tree' },
  { nameId: 'PALEM SELEDRI', category: 'tree' },
  { nameId: 'PALEM WASHINGTON', category: 'tree' },
  { nameId: 'PANDAN BALI', category: 'shrub' },
  { nameId: 'PINANG 10', category: 'tree' },
  { nameId: 'PISANG', category: 'shrub' },
  { nameId: 'PLOSO', category: 'tree' },
  { nameId: 'PUCUK MERAH', category: 'shrub' },
  { nameId: 'PULE', category: 'tree' },
  { nameId: 'RANDU', category: 'tree' },
  { nameId: 'SALAM', category: 'tree' },
  { nameId: 'SAPU TANGAN', category: 'tree' },
  { nameId: 'SAWIT', category: 'tree' },
  { nameId: 'SAWO', category: 'tree' },
  { nameId: 'SAWO KECIK', category: 'tree' },
  { nameId: 'SEMBIRIT', category: 'tree' },
  { nameId: 'SENGON', category: 'tree' },
  { nameId: 'SENGON LAUT', category: 'tree' },
  { nameId: 'SEPATU DEA', category: 'flower' },
  { nameId: 'SIKAT BOTOL', category: 'shrub' },
  { nameId: 'SOGO', category: 'tree' },
  { nameId: 'SOGO TELIK', category: 'tree' },
  { nameId: 'SONO', category: 'tree' },
  { nameId: 'SONO AIR', category: 'tree' },
  { nameId: 'SONO KELLING', category: 'tree' },
  { nameId: 'SRIKAYA', category: 'tree' },
  { nameId: 'SUKUN', category: 'tree' },
  { nameId: 'TABEBUYA', category: 'tree' },
  { nameId: 'TABEBUYA KUNING', category: 'tree' },
  { nameId: 'TABEBUYA MERAH', category: 'tree' },
  { nameId: 'TABEBUYA PINK', category: 'tree' },
  { nameId: 'TABEBUYA ROSELLA', category: 'tree' },
  { nameId: 'TANJUNG', category: 'tree' },
  { nameId: 'TIARA PAYUNG', category: 'tree' },
  { nameId: 'TREMBESI', category: 'tree' },
  { nameId: 'TRENGGULI', category: 'tree' },
  { nameId: 'TURI', category: 'tree' },
  { nameId: 'WALISONGO', category: 'shrub' },
  { nameId: 'WARU', category: 'tree' },
  { nameId: 'WUNI', category: 'tree' },
];

/**
 * Seed 124 plant species (reference data).
 * Builds ctx.maps.speciesIdByName for downstream location_plants/notable_plants lookups.
 */
export async function seedPlantSpecies(ctx: SeedContext): Promise<void> {
  ctx.log('🌳 Seeding Plant Species…');

  let inserted = 0;
  for (const species of PLANT_SPECIES) {
    const result = await ctx.qr.query(
      // The unique index on name_id is partial (WHERE deleted_at IS NULL, added
      // with plant_species.deleted_at) — the arbiter must repeat that predicate.
      `INSERT INTO plant_species (name_id, category)
       VALUES ($1, $2)
       ON CONFLICT (name_id) WHERE deleted_at IS NULL DO NOTHING
       RETURNING id`,
      [species.nameId, species.category],
    );
    if (result.length > 0) {
      inserted++;
      // Populate the species ID map for downstream lookups
      if (result[0]?.id) {
        ctx.maps.speciesIdByName.set(species.nameId, result[0].id);
      }
    } else {
      // Row already exists — fetch its ID for the map
      const existing = await ctx.qr.query(
        `SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`,
        [species.nameId],
      );
      if (existing.length > 0) {
        ctx.maps.speciesIdByName.set(species.nameId, existing[0].id);
      }
    }
  }
  ctx.log(
    `  ✓ ${inserted} new plant_species inserted (${PLANT_SPECIES.length - inserted} already existed); ${ctx.maps.speciesIdByName.size} total in map`,
  );
}
