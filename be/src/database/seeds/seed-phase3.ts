import type { DataSource, QueryRunner } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Phase 3 Seed Script
 *
 * Seeds Phase 3 foundation data (additive — does NOT wipe existing data):
 * 1. plant_species      — 124 species (idempotent on name_id)
 * 2. monitoring_configs — 4 new config rows (idempotent on key)
 * 3. service_capacity   — 7 rayons × 12 ISO weeks × 'pruning' (idempotent on unique constraint)
 *
 * Usage: npm run db:seed:phase3
 */

export const PLANT_SPECIES: Array<{ nameId: string; category: string }> = [
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
 * Compute ISO week number for a given date.
 * Uses the standard ISO 8601 definition (week containing the first Thursday).
 */
export function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // 1=Mon ... 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // align to Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

async function seedPhase3(dataSource: DataSource): Promise<void> {
  // Guard: skip gracefully if Phase 3 migration hasn't been run yet
  const check = await dataSource.query(
    `SELECT to_regclass('public.plant_species') AS exists`,
  );
  if (!check[0]?.exists) {
    console.log('');
    console.log('⚠️  Phase 3 tables not found — skipping Phase 3 seed.');
    console.log('   Run `npm run migration:run` first, then re-run the seeder.');
    return;
  }

  const queryRunner: QueryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('');
    console.log('🌱 ======== Phase 3 Seed ========');

    // ==========================================
    // SECTION 1: plant_species
    // ==========================================
    console.log('');
    console.log('🌳 ======== SECTION 1: Plant Species ========');
    let inserted = 0;
    for (const species of PLANT_SPECIES) {
      const result = await queryRunner.query(
        `INSERT INTO plant_species (name_id, category)
         VALUES ($1, $2)
         ON CONFLICT (name_id) DO NOTHING`,
        [species.nameId, species.category],
      );
      if (result && (result as any).rowCount > 0) inserted++;
    }
    console.log(`  ✓ ${inserted} new plant_species inserted (${PLANT_SPECIES.length - inserted} already existed)`);

    // ==========================================
    // SECTION 2: monitoring_configs (new Phase 3 configs)
    // ==========================================
    console.log('');
    console.log('📡 ======== SECTION 2: Monitoring Configs ========');
    const phase3MonitoringConfigs = [
      {
        key: 'plants_forecast',
        value: JSON.stringify({
          default_pruning_cycle_days: 90,
          overdue_threshold_days: 30,
          due_soon_window_days: 14,
        }),
        description: 'Plant pruning forecast configuration (Phase 3)',
      },
      {
        key: 'service_capacity_defaults',
        value: JSON.stringify({
          default_capacity_per_week: 5,
          overbooking_tolerance: 10,
          booking_window_weeks: 12,
        }),
        description: 'Service capacity booking defaults (Phase 3)',
      },
      {
        key: 'pruning_request_workflow',
        value: JSON.stringify({
          auto_assign_to_rayon: false,
          review_deadline_days: 7,
          reference_code_prefix: 'PR',
        }),
        description: 'Pruning request workflow settings (Phase 3)',
      },
      {
        key: 'seed_inventory',
        value: JSON.stringify({
          low_stock_threshold_grams: 500,
          low_stock_threshold_pieces: 50,
          reorder_notification: true,
        }),
        description: 'Seed inventory alert thresholds (Phase 3)',
      },
    ];

    let configsInserted = 0;
    for (const cfg of phase3MonitoringConfigs) {
      const result = await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
      if (result && (result as any).rowCount > 0) configsInserted++;
    }
    console.log(`  ✓ ${configsInserted} monitoring_configs processed (idempotent)`);

    // ==========================================
    // SECTION 3: area_plants (link areas to plant species)
    // ==========================================
    console.log('');
    console.log('🌿 ======== SECTION 3: Area Plants ========');
    const areas = await queryRunner.query(`SELECT id FROM areas WHERE is_active = true LIMIT 6`);
    if (areas.length === 0) {
      console.log('  ⚠ No active areas found, skipping area_plants seed');
    } else {
      let areaPlantInserted = 0;
      const areaPlantMappings = [
        { speciesName: 'AKASIA', quantityRange: [5, 15] },
        { speciesName: 'MAHONI', quantityRange: [3, 8] },
        { speciesName: 'BUNGUR', quantityRange: [2, 6] },
        { speciesName: 'SENGON', quantityRange: [4, 12] },
        { speciesName: 'JATI', quantityRange: [2, 5] },
      ];

      for (const area of areas.slice(0, 6)) {
        for (const mapping of areaPlantMappings) {
          const species = await queryRunner.query(
            `SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`,
            [mapping.speciesName],
          );
          if (species.length > 0) {
            const quantity =
              Math.floor(Math.random() * (mapping.quantityRange[1] - mapping.quantityRange[0])) +
              mapping.quantityRange[0];
            const result = await queryRunner.query(
              `INSERT INTO area_plants (area_id, species_id, count)
               VALUES ($1, $2, $3)
               ON CONFLICT (area_id, species_id) DO NOTHING`,
              [area.id, species[0].id, quantity],
            );
            if (result && (result as any).rowCount > 0) areaPlantInserted++;
          }
        }
      }
      console.log(`  ✓ ${areaPlantInserted} area_plants inserted`);
    }

    // ==========================================
    // SECTION 4: pruning_requests (sample workflow data)
    // ==========================================
    console.log('');
    console.log('✂️  ======== SECTION 4: Pruning Requests ========');
    let pruningInserted = 0;

    // Cover every status chip so MyRequestsScreen + ReviewQueueScreen
    // have visible data on first login. 6 rows × distinct statuses.
    // Phase 3 Apr 27 redesign — sample rows now include the new tree-detail
    // and contact fields so MyRequestsScreen / RequestDetailScreen show realistic
    // data on first login.
    const sampleRequests = [
      { kec: 'Tegalsari', addr: 'Jl. Pemuda No. 1',         status: 'submitted',   photos: 3, count: 5,
        height: '5-7 meter',  diameter: '30-40 cm', reqName: 'Budi Santoso',  reqPhone: '081234567001', rtName: 'Pak Joko',  rtPhone: '081298765001' },
      { kec: 'Genteng',   addr: 'Jl. Tunjungan No. 12',     status: 'submitted',   photos: 4, count: 8,
        height: '8-10 meter', diameter: '40-60 cm', reqName: 'Siti Aminah',   reqPhone: '081234567002', rtName: 'Pak Hendra',rtPhone: '081298765002' },
      { kec: 'Wonokromo', addr: 'Jl. Raya Darmo No. 99',    status: 'approved',    photos: 5, count: 12,
        height: '10-12 meter',diameter: '50-70 cm', reqName: 'Andi Wijaya',   reqPhone: '081234567003', rtName: 'Pak Slamet',rtPhone: '081298765003' },
      { kec: 'Kenjeran',  addr: 'Jl. Raya Kenjeran No. 50', status: 'rejected',    photos: 3, count: 4,
        height: '4-5 meter',  diameter: '20-30 cm', reqName: 'Dewi Lestari',  reqPhone: '081234567004', rtName: 'Pak Budi',  rtPhone: '081298765004' },
      { kec: 'Krembangan',addr: 'Jl. Tanjungsari No. 100',  status: 'converted',   photos: 4, count: 10,
        height: '7-9 meter',  diameter: '35-50 cm', reqName: 'Rina Susanti',  reqPhone: '081234567005', rtName: 'Pak Wahyu', rtPhone: '081298765005' },
      { kec: 'Tegalsari', addr: 'Jl. Embong Malang No. 7',  status: 'in_progress', photos: 5, count: 6,
        height: '6-8 meter',  diameter: '30-45 cm', reqName: 'Eko Pranoto',   reqPhone: '081234567006', rtName: 'Pak Agus',  rtPhone: '081298765006' },
    ];

    const staff = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'staff_kecamatan' LIMIT 1`,
    );
    const submitterId = staff.length > 0 ? staff[0].id : (
      await queryRunner.query(`SELECT id FROM users WHERE role = 'admin_data' LIMIT 1`)
    )[0]?.id;
    const reviewer = await queryRunner.query(
      `SELECT id FROM users WHERE role IN ('admin_data','kepala_rayon','superadmin') LIMIT 1`,
    );
    const reviewerId = reviewer.length > 0 ? reviewer[0].id : null;
    const rayonForRequests = await queryRunner.query(`SELECT id FROM rayons ORDER BY name LIMIT 1`);
    const rayonIdForReq = rayonForRequests[0]?.id ?? null;

    if (!submitterId) {
      console.log('  ⚠ No staff_kecamatan or admin_data users found, skipping pruning_requests');
    } else {
      for (let i = 0; i < sampleRequests.length; i++) {
        const r = sampleRequests[i];
        const refCode = `PR-${Date.now()}-${i}`;
        const photoUrls = Array.from({ length: r.photos }, (_, n) =>
          `https://placehold.co/600x400?text=PR-${i}-${n + 1}`,
        );
        const expectedDate = new Date(Date.now() + (i + 1) * 86400000)
          .toISOString().split('T')[0];
        const reviewedAt = ['approved', 'rejected', 'converted', 'in_progress'].includes(r.status)
          ? new Date().toISOString() : null;

        const result = await queryRunner.query(
          `INSERT INTO pruning_requests
             (reference_code, submitted_by, kecamatan_name, address, gps_lat, gps_lng,
              expected_date, estimated_plant_count, tree_count,
              tree_height_estimate, tree_diameter_estimate,
              requester_name, requester_phone, rt_leader_name, rt_leader_phone,
              photo_urls, status, rayon_id,
              reviewed_by, reviewed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::text[],$17,$18,$19,$20)
           ON CONFLICT (reference_code) DO NOTHING`,
          [refCode, submitterId, r.kec, r.addr,
           -7.2575 + (i * 0.001), 112.7521 + (i * 0.001),
           expectedDate, r.count, r.count,
           r.height, r.diameter,
           r.reqName, r.reqPhone, r.rtName, r.rtPhone,
           photoUrls, r.status, rayonIdForReq,
           reviewedAt ? reviewerId : null, reviewedAt],
        );
        if (result && (result as any).rowCount > 0) pruningInserted++;
      }

      // ── Bulk volume rows for list-screen UX testing (scroll + filter + sort).
      // Generates ~25 additional requests across all statuses + kecamatan +
      // calendar dates so PerantinganListScreen / ReviewQueueScreen exercise
      // every chip and both sort orders without being seeded against a single
      // status bucket. Stays idempotent via reference_code.
      const STATUSES = ['submitted', 'under_review', 'approved', 'rejected',
                         'converted', 'in_progress', 'done', 'cancelled'] as const;
      const KECS = ['Tegalsari', 'Genteng', 'Wonokromo', 'Kenjeran',
                    'Krembangan', 'Sukolilo', 'Mulyorejo', 'Gubeng', 'Bulak'];
      const STREETS = ['Jl. Mawar', 'Jl. Anggrek', 'Jl. Melati', 'Jl. Cendana',
                       'Jl. Cemara', 'Jl. Jati', 'Jl. Kenanga', 'Jl. Flamboyan',
                       'Jl. Beringin', 'Jl. Kamboja', 'Jl. Kemuning', 'Jl. Mahoni'];
      const REQ_NAMES = ['Bagas', 'Citra', 'Dimas', 'Endah', 'Fajar', 'Galuh',
                         'Hanif', 'Indra', 'Jihan', 'Kemal', 'Laras', 'Maharani'];
      const RT_NAMES = ['Pak Hamid', 'Pak Yusuf', 'Pak Rahmat', 'Pak Bambang',
                        'Pak Subagyo', 'Pak Maulana', 'Pak Iwan', 'Pak Darto'];
      const HEIGHTS = ['3-5 meter', '5-7 meter', '7-9 meter', '9-12 meter',
                       '12-15 meter', '15-18 meter'];
      const DIAMETERS = ['15-25 cm', '25-35 cm', '35-50 cm', '50-70 cm',
                         '70-90 cm', '90-110 cm'];

      // Distribute rayons across the bulk volume so admin_data filter testing
      // also has variety — fall back to first rayon if none available.
      const allRayons = await queryRunner.query(`SELECT id FROM rayons ORDER BY name`);
      const rayonIds: string[] = (allRayons as Array<{ id: string }>).map((r) => r.id);
      const pickRayon = (idx: number) => rayonIds.length > 0
        ? rayonIds[idx % rayonIds.length]
        : rayonIdForReq;

      const BULK_COUNT = 25;
      let bulkInserted = 0;
      for (let i = 0; i < BULK_COUNT; i++) {
        const status = STATUSES[i % STATUSES.length];
        const kec = KECS[i % KECS.length];
        const street = STREETS[i % STREETS.length];
        const reqName = REQ_NAMES[i % REQ_NAMES.length];
        const rtName = RT_NAMES[i % RT_NAMES.length];
        const height = HEIGHTS[i % HEIGHTS.length];
        const diameter = DIAMETERS[i % DIAMETERS.length];
        const treeCount = ((i % 9) + 2);
        const photoCount = ((i % 4) + 1);
        const ageDays = i; // 0 → today, 1 → yesterday … 24 → ~3.5 weeks ago
        const createdAt = new Date(Date.now() - ageDays * 86400000).toISOString();
        const expectedDate = new Date(Date.now() + ((i % 14) + 1) * 86400000)
          .toISOString().split('T')[0];
        const reviewedAt = ['approved', 'rejected', 'converted', 'in_progress',
                             'done', 'cancelled', 'under_review'].includes(status)
          ? new Date(Date.now() - ageDays * 86400000 + 3600 * 1000).toISOString()
          : null;
        const refCode = `PR-BULK-${i.toString().padStart(3, '0')}`;
        const photoUrls = Array.from({ length: photoCount }, (_, n) =>
          `https://placehold.co/600x400?text=PR-BULK-${i}-${n + 1}`,
        );

        const result = await queryRunner.query(
          `INSERT INTO pruning_requests
             (reference_code, submitted_by, kecamatan_name, address, gps_lat, gps_lng,
              expected_date, estimated_plant_count, tree_count,
              tree_height_estimate, tree_diameter_estimate,
              requester_name, requester_phone, rt_leader_name, rt_leader_phone,
              photo_urls, status, rayon_id,
              reviewed_by, reviewed_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::text[],$17,$18,$19,$20,$21)
           ON CONFLICT (reference_code) DO NOTHING`,
          [refCode, submitterId, kec, `${street} No. ${100 + i}`,
           -7.2575 + (i * 0.0007), 112.7521 + (i * 0.0007),
           expectedDate, treeCount, treeCount,
           height, diameter,
           `${reqName} ${i + 1}`, `0812345${(80000 + i).toString().slice(-5)}`,
           rtName, `0812987${(60000 + i).toString().slice(-5)}`,
           photoUrls, status, pickRayon(i),
           reviewedAt ? reviewerId : null, reviewedAt,
           createdAt],
        );
        if (result && (result as any).rowCount > 0) bulkInserted++;
      }
      console.log(`  ✓ ${bulkInserted} additional bulk pruning_requests inserted (volume + status + date variety)`);
      pruningInserted += bulkInserted;
    }
    console.log(`  ✓ ${pruningInserted} pruning_requests total (sample + bulk volume rows)`);

    // ==========================================
    // SECTION 5: plant_seeds + seed_transactions
    // ==========================================
    console.log('');
    console.log('🌱 ======== SECTION 5: Plant Seeds & Transactions ========');
    const seedSpecies = [
      { nameId: 'AKASIA_SEEDS', unit: 'gram', qty: 1000 },
      { nameId: 'MAHONI_SEEDS', unit: 'gram', qty: 800 },
      { nameId: 'BUNGUR_SEEDS', unit: 'piece', qty: 500 },
      { nameId: 'SENGON_SEEDS', unit: 'gram', qty: 600 },
      { nameId: 'JATI_SEEDS', unit: 'piece', qty: 300 },
    ];

    let seedsInserted = 0;
    let transactionsInserted = 0;

    for (const seedSpec of seedSpecies) {
      const seedResult = await queryRunner.query(
        `INSERT INTO plant_seeds (name_id, unit, stock_qty)
         VALUES ($1, $2, $3)
         ON CONFLICT (name_id) DO NOTHING
         RETURNING id`,
        [seedSpec.nameId, seedSpec.unit, seedSpec.qty],
      );

      if (seedResult.length > 0) {
        seedsInserted++;
        const seedId = seedResult[0].id;

        // Add initial transaction (purchase/stock)
        const recorder = await queryRunner.query(`SELECT id FROM users LIMIT 1`);
        if (recorder.length > 0) {
          const txResult = await queryRunner.query(
            `INSERT INTO seed_transactions (seed_id, transaction_type, qty, supplier, occurred_at, recorded_by)
             VALUES ($1, 'purchase', $2, 'Nursery A', $3, $4)`,
            [seedId, seedSpec.qty, new Date().toISOString().split('T')[0], recorder[0].id],
          );
          if (txResult && (txResult as any).rowCount > 0) transactionsInserted++;
        }
      }
    }
    console.log(`  ✓ ${seedsInserted} plant_seeds inserted`);
    console.log(`  ✓ ${transactionsInserted} seed_transactions inserted`);

    // ==========================================
    // SECTION 6: service_capacity
    // ==========================================
    console.log('');
    console.log('📅 ======== SECTION 6: Service Capacity ========');

    const rayons = await queryRunner.query(`SELECT id, name FROM rayons ORDER BY name`);
    if (rayons.length === 0) {
      console.log('  ⚠ No rayons found, skipping service_capacity seed');
    } else {
      // Seed 12 weeks starting from the current ISO week.
      const currentDate = new Date();
      const { year: startYear, week: startWeek } = getIsoWeek(currentDate);

      const weeksToSeed: Array<{ year: number; week: number }> = [];
      let yr = startYear;
      let wk = startWeek;
      for (let i = 0; i < 12; i++) {
        weeksToSeed.push({ year: yr, week: wk });
        wk++;
        // ISO weeks max is 52 or 53 — advance year when needed
        const maxWeek = getMaxIsoWeek(yr);
        if (wk > maxWeek) {
          wk = 1;
          yr++;
        }
      }

      let capacityInserted = 0;
      for (const rayon of rayons) {
        for (const { year, week } of weeksToSeed) {
          const result = await queryRunner.query(
            `INSERT INTO service_capacity (rayon_id, year, iso_week, service_type, capacity_units, booked_units)
             VALUES ($1, $2, $3, 'pruning', 0, 0)
             ON CONFLICT (rayon_id, year, iso_week, service_type) DO NOTHING`,
            [rayon.id, year, week],
          );
          if (result && (result as any).rowCount > 0) capacityInserted++;
        }
      }
      console.log(`  ✓ ${capacityInserted} service_capacity rows inserted`);
      console.log(`    Rayons: ${rayons.length}, Weeks: ${weeksToSeed.length} (${startYear}-W${startWeek} to ${weeksToSeed[weeksToSeed.length - 1].year}-W${weeksToSeed[weeksToSeed.length - 1].week})`);
    }

    await queryRunner.commitTransaction();
    console.log('');
    console.log('✅ Phase 3 seed completed successfully');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Phase 3 seed failed, rolling back:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Returns the maximum ISO week number for a given year.
 * A year has 53 ISO weeks if Jan 1 is Thursday, or if it is a leap year and Jan 1 is Wednesday.
 */
export function getMaxIsoWeek(year: number): number {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7;
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay() || 7;
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}

// ==========================================
// Reusable embeddable helpers (no transaction management — caller owns it)
// ==========================================

/**
 * Phase 3 reference data — fully idempotent, no FK requirements beyond migrations.
 * Seeds: plant_species (128), Phase 3 monitoring_configs (4 keys).
 * Safe for production cold-start.
 */
export async function seedPhase3Reference(queryRunner: QueryRunner): Promise<void> {
  let speciesInserted = 0;
  for (const species of PLANT_SPECIES) {
    const rows = await queryRunner.query(
      `INSERT INTO plant_species (name_id, category)
       VALUES ($1, $2)
       ON CONFLICT (name_id) DO NOTHING
       RETURNING id`,
      [species.nameId, species.category],
    );
    if (rows.length > 0) speciesInserted++;
  }
  console.log(`  ✓ ${speciesInserted} new plant_species inserted (${PLANT_SPECIES.length - speciesInserted} already existed)`);

  const phase3Configs = [
    { key: 'plants_forecast', value: { default_pruning_cycle_days: 90, overdue_threshold_days: 30, due_soon_window_days: 14 }, description: 'Plant pruning forecast configuration (Phase 3)' },
    { key: 'service_capacity_defaults', value: { default_capacity_per_week: 5, overbooking_tolerance: 10, booking_window_weeks: 12 }, description: 'Service capacity booking defaults (Phase 3)' },
    { key: 'pruning_request_workflow', value: { auto_assign_to_rayon: false, review_deadline_days: 7, reference_code_prefix: 'PR' }, description: 'Pruning request workflow settings (Phase 3)' },
    { key: 'seed_inventory', value: { low_stock_threshold_grams: 500, low_stock_threshold_pieces: 50, reorder_notification: true }, description: 'Seed inventory alert thresholds (Phase 3)' },
  ];
  let configsInserted = 0;
  for (const cfg of phase3Configs) {
    const rows = await queryRunner.query(
      `INSERT INTO monitoring_configs (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING
       RETURNING key`,
      [cfg.key, JSON.stringify(cfg.value), cfg.description],
    );
    if (rows.length > 0) configsInserted++;
  }
  console.log(`  ✓ ${configsInserted} new Phase 3 monitoring_configs inserted (${phase3Configs.length - configsInserted} already existed)`);
}

/**
 * Service capacity grid — 12 ISO weeks ahead × N rayons × service_type='pruning'.
 * Idempotent. Requires `rayons` to be seeded first.
 *
 * @param capacityUnits initial capacity per row (default 0; UAT may pass 5 to enable booking demos).
 */
export async function seedPhase3ServiceCapacity(
  queryRunner: QueryRunner,
  capacityUnits = 0,
): Promise<void> {
  const rayons = await queryRunner.query(`SELECT id FROM rayons ORDER BY name`);
  if (rayons.length === 0) {
    console.log('  ⚠ No rayons found, skipping service_capacity seed');
    return;
  }
  const today = new Date();
  const { year: startYear, week: startWeek } = getIsoWeek(today);
  const weeks: Array<{ year: number; week: number }> = [];
  let yr = startYear;
  let wk = startWeek;
  for (let i = 0; i < 12; i++) {
    weeks.push({ year: yr, week: wk });
    wk++;
    if (wk > getMaxIsoWeek(yr)) { wk = 1; yr++; }
  }
  let inserted = 0;
  for (const r of rayons) {
    for (const { year, week } of weeks) {
      const rows = await queryRunner.query(
        `INSERT INTO service_capacity (rayon_id, year, iso_week, service_type, capacity_units, booked_units)
         VALUES ($1, $2, $3, 'pruning', $4, 0)
         ON CONFLICT (rayon_id, year, iso_week, service_type) DO NOTHING
         RETURNING id`,
        [r.id, year, week, capacityUnits],
      );
      if (rows.length > 0) inserted++;
    }
  }
  console.log(`  ✓ ${inserted} new service_capacity rows (${rayons.length} rayons × ${weeks.length} weeks, capacity_units=${capacityUnits})`);
}

/**
 * Phase 3 sample/UAT data — area_plants, notable_plants, pruning_requests (with task lineage),
 * plant_seeds, and seed_transactions.
 * Requires existing users (admin_data or staff_kecamatan), areas, and rayons.
 * Idempotent on natural keys; safe to re-run.
 */
export async function seedPhase3SampleData(queryRunner: QueryRunner): Promise<void> {
  // Sample area_plants — link first up-to-6 active areas to common species
  const areas = await queryRunner.query(`SELECT id FROM areas WHERE is_active = true LIMIT 6`);
  if (areas.length > 0) {
    const mappings = [
      { speciesName: 'AKASIA', count: 10 },
      { speciesName: 'MAHONI', count: 6 },
      { speciesName: 'BUNGUR', count: 4 },
      { speciesName: 'SENGON', count: 8 },
      { speciesName: 'JATI', count: 3 },
    ];
    let inserted = 0;
    for (const area of areas) {
      for (const m of mappings) {
        const sp = await queryRunner.query(`SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`, [m.speciesName]);
        if (sp.length > 0) {
          const rows = await queryRunner.query(
            `INSERT INTO area_plants (area_id, species_id, count)
             VALUES ($1, $2, $3)
             ON CONFLICT (area_id, species_id) DO NOTHING
             RETURNING id`,
            [area.id, sp[0].id, m.count],
          );
          if (rows.length > 0) inserted++;
        }
      }
    }
    console.log(`  ✓ ${inserted} area_plants inserted across ${areas.length} areas`);
  } else {
    console.log('  ⚠ No active areas found, skipping area_plants');
  }

  // Sample notable_plants — heritage specimens (heritage=true) linked to areas
  if (areas.length > 0) {
    const notablePlantSamples = [
      { areaIndex: 0, speciesName: 'BERINGIN', lat: -7.2506, lng: 112.7508, heritage: true, label: 'Pohon Beringin Tua Keramat', notes: 'Pohon bersejarah usia 150 tahun' },
      { areaIndex: 1, speciesName: 'MAHONI', lat: -7.2575, lng: 112.7665, heritage: true, label: 'Mahoni Koleksi 1990', notes: 'Specimen dari Jepang, perlu perawatan khusus' },
      { areaIndex: 2, speciesName: 'JATI', lat: -7.2450, lng: 112.7450, heritage: false, label: 'Jati Benih Unggul', notes: 'Jati dari proyek hutan tanaman 2020' },
    ];
    let notableInserted = 0;
    for (const notable of notablePlantSamples) {
      if (notable.areaIndex < areas.length) {
        const sp = await queryRunner.query(
          `SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`,
          [notable.speciesName],
        );
        if (sp.length > 0) {
          // notable_plants has no natural unique constraint — idempotency via label match
          const existing = await queryRunner.query(
            `SELECT id FROM notable_plants WHERE area_id = $1 AND species_id = $2 AND label = $3 LIMIT 1`,
            [areas[notable.areaIndex].id, sp[0].id, notable.label],
          );
          if (existing.length === 0) {
            await queryRunner.query(
              `INSERT INTO notable_plants (area_id, species_id, gps_lat, gps_lng, label, heritage, notes, photo_urls)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [areas[notable.areaIndex].id, sp[0].id, notable.lat, notable.lng, notable.label, notable.heritage, notable.notes, []],
            );
            notableInserted++;
          }
        }
      }
    }
    console.log(`  ✓ ${notableInserted} notable_plants (heritage) inserted`);
  }

  // Sample pruning_requests — various statuses with optional task lineage
  const submitter = await queryRunner.query(
    `SELECT id FROM users WHERE role IN ('staff_kecamatan','admin_data') ORDER BY role LIMIT 1`,
  );
  const admin = await queryRunner.query(
    `SELECT id FROM users WHERE role IN ('admin_system', 'superadmin') ORDER BY role LIMIT 1`,
  );
  const rayon = await queryRunner.query(`SELECT id FROM rayons LIMIT 1`);

  if (submitter.length > 0) {
    const submitterId = submitter[0].id;
    const adminId = admin.length > 0 ? admin[0].id : submitterId;
    const rayonId = rayon.length > 0 ? rayon[0].id : null;

    // 6 samples covering every status chip used in MyRequestsScreen
    // and ReviewQueueScreen so each visual variant is on screen on
    // first login.
    // Phase 3 Apr 27 redesign — sample rows now include the new tree-detail
    // and contact fields populated by the redesigned mobile submit form.
    const samples = [
      { kecamatan: 'Tegalsari',  address: 'Jl. Pemuda No. 1',         status: 'submitted'   as const, estimatedCount: 12, daysFromNow: 30,
        height: '8-10 meter', diameter: '40-60 cm',  reqName: 'Budi Santoso',   reqPhone: '081234567001', rtName: 'Pak Joko',  rtPhone: '081298765001' },
      { kecamatan: 'Wonokromo',  address: 'Jl. Raya Darmo No. 50',    status: 'submitted'   as const, estimatedCount: 8,  daysFromNow: 45,
        height: '6-8 meter',  diameter: '30-45 cm',  reqName: 'Siti Aminah',    reqPhone: '081234567002', rtName: 'Pak Hendra',rtPhone: '081298765002' },
      { kecamatan: 'Kenjeran',   address: 'Jl. Kenjeran No. 100',     status: 'approved'    as const, estimatedCount: 15, daysFromNow: 14,
        height: '10-12 meter',diameter: '50-70 cm',  reqName: 'Andi Wijaya',    reqPhone: '081234567003', rtName: 'Pak Slamet',rtPhone: '081298765003' },
      { kecamatan: 'Krembangan', address: 'Jl. Tanjungsari No. 25',   status: 'rejected'    as const, estimatedCount: 6,  daysFromNow: -5,
        height: '4-5 meter',  diameter: '20-30 cm',  reqName: 'Dewi Lestari',   reqPhone: '081234567004', rtName: 'Pak Budi',  rtPhone: '081298765004' },
      { kecamatan: 'Genteng',    address: 'Jl. Tunjungan No. 12',     status: 'converted'   as const, estimatedCount: 10, daysFromNow: 7,
        height: '7-9 meter',  diameter: '35-50 cm',  reqName: 'Rina Susanti',   reqPhone: '081234567005', rtName: 'Pak Wahyu', rtPhone: '081298765005' },
      { kecamatan: 'Tegalsari',  address: 'Jl. Embong Malang No. 7',  status: 'in_progress' as const, estimatedCount: 6,  daysFromNow: 3,
        height: '5-7 meter',  diameter: '30-40 cm',  reqName: 'Eko Pranoto',    reqPhone: '081234567006', rtName: 'Pak Agus',  rtPhone: '081298765006' },
    ];
    let inserted = 0;
    for (let i = 0; i < samples.length; i++) {
      const refCode = `PR-2026-STAGING-${String(i + 1).padStart(4, '0')}`;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + samples[i].daysFromNow);

      const photoUrls = Array.from({ length: 3 + (i % 3) }, (_, n) =>
        `https://placehold.co/600x400?text=PR-${i + 1}-${n + 1}`,
      );

      const s = samples[i];
      const insertParams: any[] = [
        refCode,
        submitterId,
        s.kecamatan,
        s.address,
        s.status,
        expectedDate.toISOString().split('T')[0],
        s.estimatedCount,
        s.estimatedCount,            // tree_count mirrors estimated_plant_count
        s.height,
        s.diameter,
        s.reqName,
        s.reqPhone,
        s.rtName,
        s.rtPhone,
        rayonId,
        photoUrls,
      ];

      // Add review metadata for any reviewed/post-review status
      const reviewed = ['approved', 'rejected', 'converted', 'in_progress'].includes(s.status);
      if (reviewed) {
        insertParams.push(adminId, new Date().toISOString(), `Reviewed by admin on ${new Date().toLocaleDateString()}`);
      } else {
        insertParams.push(null, null, null);
      }

      const rows = await queryRunner.query(
        `INSERT INTO pruning_requests
           (reference_code, submitted_by, kecamatan_name, address, status, expected_date,
            estimated_plant_count, tree_count, tree_height_estimate, tree_diameter_estimate,
            requester_name, requester_phone, rt_leader_name, rt_leader_phone,
            rayon_id, photo_urls,
            reviewed_by, reviewed_at, review_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::text[], $17, $18, $19)
         ON CONFLICT (reference_code) DO NOTHING
         RETURNING id`,
        insertParams,
      );
      if (rows.length > 0) inserted++;
    }
    console.log(`  ✓ ${inserted} pruning_requests inserted (mixed statuses + tree details + contacts)`);
  } else {
    console.log('  ⚠ No staff_kecamatan/admin_data user found, skipping pruning_requests');
  }

  // Sample plant_seeds + seed_transactions
  const recorder = await queryRunner.query(`SELECT id FROM users WHERE role = 'admin_data' LIMIT 1`);
  const recorderId = recorder.length > 0 ? recorder[0].id : null;
  const seeds = [
    { nameId: 'AKASIA_SEEDS', unit: 'gram', qty: 1000 },
    { nameId: 'MAHONI_SEEDS', unit: 'gram', qty: 800 },
    { nameId: 'BUNGUR_SEEDS', unit: 'piece', qty: 500 },
    { nameId: 'SENGON_SEEDS', unit: 'gram', qty: 600 },
    { nameId: 'JATI_SEEDS', unit: 'piece', qty: 300 },
  ];
  let seedsInserted = 0;
  let txInserted = 0;
  for (const s of seeds) {
    const seedResult = await queryRunner.query(
      `INSERT INTO plant_seeds (name_id, unit, stock_qty)
       VALUES ($1, $2, $3)
       ON CONFLICT (name_id) DO NOTHING
       RETURNING id`,
      [s.nameId, s.unit, s.qty],
    );
    if (seedResult.length > 0) {
      seedsInserted++;
      if (recorderId) {
        const tx = await queryRunner.query(
          `INSERT INTO seed_transactions (seed_id, transaction_type, qty, supplier, occurred_at, recorded_by)
           VALUES ($1, 'purchase', $2, 'Dinas Lingkungan Hidup', $3, $4)
           RETURNING id`,
          [seedResult[0].id, s.qty, new Date().toISOString().split('T')[0], recorderId],
        );
        if (tx.length > 0) txInserted++;
      }
    }
  }
  console.log(`  ✓ ${seedsInserted} plant_seeds + ${txInserted} seed_transactions`);
}

// ==========================================
// Standalone entry point
// ==========================================
async function main(): Promise<void> {
  const { DataSource: DS } = await import('typeorm');
  const dataSource = new DS({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    entities: [],
    synchronize: false,
  });

  await dataSource.initialize();
  try {
    await seedPhase3(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

// Only run main() when this file is the entry point (npm run db:seed:phase3).
// Without this guard, importing the helpers from seed-reference.ts or
// seed-staging.ts would trigger a second full Phase 3 seed.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { seedPhase3 };
