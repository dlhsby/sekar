import type { SeedContext } from '../lib/context';

/**
 * Seed 31 kecamatans (administrative districts of Surabaya).
 * Maps each kecamatan to its district and region using runtime district lookup.
 * Uses ON CONFLICT DO UPDATE to heal misaligned district assignments (May 9 realignment).
 */
export async function seedKecamatans(ctx: SeedContext): Promise<void> {
  ctx.log('🏘️  Seeding Kecamatans…');

  // Build district lookup: district_code → district_id via database query
  const districtIdByName = (await ctx.qr.query(
    `SELECT id, name FROM districts ORDER BY name`,
  )) as Array<{
    id: string;
    name: string;
  }>;

  // Map district code to district name (static reference)
  const codeToDistrictName: Record<string, string> = {
    SELATAN: 'Rayon Selatan',
    UTARA: 'Rayon Utara',
    PUSAT: 'Rayon Pusat',
    TIMUR1: 'Rayon Timur 1',
    TIMUR2: 'Rayon Timur 2',
    BARAT1: 'Rayon Barat 1',
    BARAT2: 'Rayon Barat 2',
    TAMAN_AKTIF: 'Rayon Taman Aktif',
  };

  // Build reverse lookup: code → district_id
  const rIdx: Record<string, string> = {};
  for (const r of districtIdByName) {
    for (const [code, name] of Object.entries(codeToDistrictName)) {
      if (name === r.name) {
        rIdx[code] = r.id;
      }
    }
  }

  // Kecamatan blueprint: [name, code, district_code, region]
  const kecBlueprint: Array<[string, string, string, string]> = [
    // ── Surabaya Pusat (4) ──
    ['Bubutan', 'bubutan', 'PUSAT', 'pusat'],
    ['Genteng', 'genteng', 'PUSAT', 'pusat'],
    ['Simokerto', 'simokerto', 'PUSAT', 'pusat'],
    ['Tegalsari', 'tegalsari', 'PUSAT', 'pusat'],
    // ── Surabaya Timur (7 — split across Rayon Timur 1 + Timur 2) ──
    ['Tambaksari', 'tambaksari', 'TIMUR1', 'timur'],
    ['Gubeng', 'gubeng', 'TIMUR1', 'timur'],
    ['Sukolilo', 'sukolilo', 'TIMUR1', 'timur'],
    ['Mulyorejo', 'mulyorejo', 'TIMUR2', 'timur'],
    ['Rungkut', 'rungkut', 'TIMUR2', 'timur'],
    ['Tenggilis Mejoyo', 'tenggilis_mejoyo', 'TIMUR2', 'timur'],
    ['Gunung Anyar', 'gunung_anyar', 'TIMUR2', 'timur'],
    // ── Surabaya Barat (7 — split across Rayon Barat 1 + Barat 2) ──
    ['Sukomanunggal', 'sukomanunggal', 'BARAT1', 'barat'],
    ['Tandes', 'tandes', 'BARAT1', 'barat'],
    ['Asemrowo', 'asemrowo', 'BARAT1', 'barat'],
    ['Benowo', 'benowo', 'BARAT1', 'barat'],
    ['Pakal', 'pakal', 'BARAT1', 'barat'],
    ['Sambikerep', 'sambikerep', 'BARAT2', 'barat'],
    ['Lakarsantri', 'lakarsantri', 'BARAT2', 'barat'],
    // ── Surabaya Utara (5) ──
    ['Krembangan', 'krembangan', 'UTARA', 'utara'],
    ['Pabean Cantian', 'pabean_cantian', 'UTARA', 'utara'],
    ['Semampir', 'semampir', 'UTARA', 'utara'],
    ['Kenjeran', 'kenjeran', 'UTARA', 'utara'],
    ['Bulak', 'bulak', 'UTARA', 'utara'],
    // ── Surabaya Selatan (8 — all in Rayon Selatan) ──
    ['Wonokromo', 'wonokromo', 'SELATAN', 'selatan'],
    ['Wonocolo', 'wonocolo', 'SELATAN', 'selatan'],
    ['Gayungan', 'gayungan', 'SELATAN', 'selatan'],
    ['Jambangan', 'jambangan', 'SELATAN', 'selatan'],
    ['Sawahan', 'sawahan', 'SELATAN', 'selatan'],
    ['Dukuh Pakis', 'dukuh_pakis', 'SELATAN', 'selatan'],
    ['Wiyung', 'wiyung', 'SELATAN', 'selatan'],
    ['Karang Pilang', 'karang_pilang', 'SELATAN', 'selatan'],
  ];

  let kecUpserted = 0;
  for (const [name, code, rcode, region] of kecBlueprint) {
    const rid = rIdx[rcode];
    if (!rid) continue;
    const r = await ctx.qr.query(
      `INSERT INTO kecamatans (name, code, district_id, region)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
         SET district_id = EXCLUDED.district_id,
             region   = EXCLUDED.region,
             name     = EXCLUDED.name`,
      [name, code, rid, region],
    );
    if (r && (r as any).rowCount > 0) kecUpserted++;
  }
  ctx.log(`  ✓ ${kecUpserted} kecamatans upserted (31 total when fresh)`);
}
