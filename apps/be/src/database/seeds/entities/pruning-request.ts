import type { SeedContext } from '../lib/context';

/**
 * Inline ISO week helper so the entity doesn't depend on the pruning module.
 * Returns the ISO calendar year + week (1..53) for a given date.
 */
function isoWeekOf(date: Date): { year: number; week: number } {
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  const dayNum = target.getUTCDay() || 7; // Monday=1..Sunday=7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

/**
 * Statuses where admin has confirmed a concrete work day.
 * These rows get `scheduled_date` populated; everything else leaves it NULL.
 */
const ADMIN_DATED_STATUSES = new Set(['approved', 'assigned', 'in_progress', 'done']);

/**
 * Seed pruning_requests with sample rows (6 distinct statuses) and bulk volume rows (25 rows).
 * Total: ~31 rows with varied kecamatans, statuses, dates, and contacts.
 */
export async function seedPruningRequests(ctx: SeedContext): Promise<void> {
  ctx.log('✂️  Seeding Pruning Requests…');

  let pruningInserted = 0;

  // Cover every status chip so MyRequestsScreen + ReviewQueueScreen have visible data on first login.
  // 6 rows × distinct statuses. Includes new tree-detail and contact fields for realistic display.
  const sampleRequests = [
    {
      kec: 'Tegalsari',
      addr: 'Jl. Pemuda No. 1',
      status: 'submitted' as const,
      photos: 3,
      count: 5,
      height: '5-7 meter',
      diameter: '30-40 cm',
      reqName: 'Budi Santoso',
      reqPhone: '081234567001',
      rtName: 'Pak Joko',
      rtPhone: '081298765001',
    },
    {
      kec: 'Genteng',
      addr: 'Jl. Tunjungan No. 12',
      status: 'submitted' as const,
      photos: 4,
      count: 8,
      height: '8-10 meter',
      diameter: '40-60 cm',
      reqName: 'Siti Aminah',
      reqPhone: '081234567002',
      rtName: 'Pak Hendra',
      rtPhone: '081298765002',
    },
    {
      kec: 'Wonokromo',
      addr: 'Jl. Raya Darmo No. 99',
      status: 'approved' as const,
      photos: 5,
      count: 12,
      height: '10-12 meter',
      diameter: '50-70 cm',
      reqName: 'Andi Wijaya',
      reqPhone: '081234567003',
      rtName: 'Pak Slamet',
      rtPhone: '081298765003',
    },
    {
      kec: 'Kenjeran',
      addr: 'Jl. Raya Kenjeran No. 50',
      status: 'rejected' as const,
      photos: 3,
      count: 4,
      height: '4-5 meter',
      diameter: '20-30 cm',
      reqName: 'Dewi Lestari',
      reqPhone: '081234567004',
      rtName: 'Pak Budi',
      rtPhone: '081298765004',
    },
    {
      kec: 'Krembangan',
      addr: 'Jl. Tanjungsari No. 100',
      status: 'assigned' as const,
      photos: 4,
      count: 10,
      height: '7-9 meter',
      diameter: '35-50 cm',
      reqName: 'Rina Susanti',
      reqPhone: '081234567005',
      rtName: 'Pak Wahyu',
      rtPhone: '081298765005',
    },
    {
      kec: 'Tegalsari',
      addr: 'Jl. Embong Malang No. 7',
      status: 'in_progress' as const,
      photos: 5,
      count: 6,
      height: '6-8 meter',
      diameter: '30-45 cm',
      reqName: 'Eko Pranoto',
      reqPhone: '081234567006',
      rtName: 'Pak Agus',
      rtPhone: '081298765006',
    },
  ];

  // Prefer all staff_kecamatan users so each user has some requests in their `mine=true` view.
  const staffKecUsers = (await ctx.qr.query(
    `SELECT id, rayon_id, username FROM users
     WHERE role = 'staff_kecamatan' AND is_active = true
     ORDER BY username`,
  )) as Array<{ id: string; rayon_id: string | null; username: string }>;
  const fallbackAdmin =
    staffKecUsers.length === 0
      ? await ctx.qr.query(`SELECT id, rayon_id FROM users WHERE role = 'admin_rayon' LIMIT 1`)
      : [];
  const submitterId = staffKecUsers.length > 0 ? staffKecUsers[0].id : fallbackAdmin[0]?.id;
  // Pick the canonical Pusat staff_kecamatan user for the original 6 sample requests
  const pusatStaff =
    staffKecUsers.find((s) => s.username === 'staff_kecamatan_tegalsari_1') ??
    staffKecUsers.find((s) => s.username === 'staff_kecamatan_pusat_1');
  const sampleSubmitterId = pusatStaff?.id ?? submitterId;
  const reviewer = await ctx.qr.query(
    `SELECT id FROM users WHERE role IN ('admin_rayon','kepala_rayon','superadmin') LIMIT 1`,
  );
  const reviewerId = reviewer.length > 0 ? reviewer[0].id : null;
  const rayonForRequests = await ctx.qr.query(`SELECT id FROM rayons ORDER BY name LIMIT 1`);
  const rayonIdForReq = rayonForRequests[0]?.id ?? null;

  if (!submitterId) {
    ctx.log('  ⚠ No staff_kecamatan or admin_rayon users found, skipping pruning_requests');
  } else {
    // ── Sample requests (6 rows with distinct statuses)
    for (let i = 0; i < sampleRequests.length; i++) {
      const r = sampleRequests[i];
      const refCode = `PR-${Date.now()}-${i}`;
      const photoUrls = Array.from(
        { length: r.photos },
        (_, n) => `https://placehold.co/600x400?text=PR-${i}-${n + 1}`,
      );
      const expectedDate = new Date(Date.now() + (i + 1) * 86400000).toISOString().split('T')[0];
      const reviewedAt = ['approved', 'rejected', 'assigned', 'in_progress'].includes(r.status)
        ? new Date().toISOString()
        : null;

      const result = await ctx.qr.query(
        `INSERT INTO pruning_requests
           (reference_code, submitted_by, kecamatan_name, address, gps_lat, gps_lng,
            expected_date, estimated_plant_count, tree_count,
            tree_height_estimate, tree_diameter_estimate,
            requester_name, requester_phone, rt_leader_name, rt_leader_phone,
            photo_urls, status, rayon_id,
            reviewed_by, reviewed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::text[],$17,$18,$19,$20)
         ON CONFLICT (reference_code) DO NOTHING`,
        [
          refCode,
          sampleSubmitterId,
          r.kec,
          r.addr,
          -7.2575 + i * 0.001,
          112.7521 + i * 0.001,
          expectedDate,
          r.count,
          r.count,
          r.height,
          r.diameter,
          r.reqName,
          r.reqPhone,
          r.rtName,
          r.rtPhone,
          photoUrls,
          r.status,
          rayonIdForReq,
          reviewedAt ? reviewerId : null,
          reviewedAt,
        ],
      );
      if (result && (result as any).rowCount > 0) pruningInserted++;
    }

    // ── Bulk volume rows for list-screen UX testing (25 rows across all statuses + kecamatan + dates)
    const STATUSES = [
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'assigned',
      'in_progress',
      'done',
      'cancelled',
    ] as const;
    const KECS = [
      'Tegalsari',
      'Genteng',
      'Wonokromo',
      'Kenjeran',
      'Krembangan',
      'Sukolilo',
      'Mulyorejo',
      'Gubeng',
      'Bulak',
    ];
    const STREETS = [
      'Jl. Mawar',
      'Jl. Anggrek',
      'Jl. Melati',
      'Jl. Cendana',
      'Jl. Cemara',
      'Jl. Jati',
      'Jl. Kenanga',
      'Jl. Flamboyan',
      'Jl. Beringin',
      'Jl. Kamboja',
      'Jl. Kemuning',
      'Jl. Mahoni',
    ];
    const REQ_NAMES = [
      'Bagas',
      'Citra',
      'Dimas',
      'Endah',
      'Fajar',
      'Galuh',
      'Hanif',
      'Indra',
      'Jihan',
      'Kemal',
      'Laras',
      'Maharani',
    ];
    const RT_NAMES = [
      'Pak Hamid',
      'Pak Yusuf',
      'Pak Rahmat',
      'Pak Bambang',
      'Pak Subagyo',
      'Pak Maulana',
      'Pak Iwan',
      'Pak Darto',
    ];
    const HEIGHTS = [
      '3-5 meter',
      '5-7 meter',
      '7-9 meter',
      '9-12 meter',
      '12-15 meter',
      '15-18 meter',
    ];
    const DIAMETERS = ['15-25 cm', '25-35 cm', '35-50 cm', '50-70 cm', '70-90 cm', '90-110 cm'];

    // Resolve rayon_id from kecamatan name for consistency
    const kecRayonRows = (await ctx.qr.query(`SELECT name, rayon_id FROM kecamatans`)) as Array<{
      name: string;
      rayon_id: string;
    }>;
    const rayonByKec = new Map<string, string>();
    for (const k of kecRayonRows) rayonByKec.set(k.name, k.rayon_id);
    const rayonForKec = (kec: string): string => rayonByKec.get(kec) ?? rayonIdForReq;

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
      const treeCount = (i % 9) + 2;
      const photoCount = (i % 4) + 1;
      const ageDays = i; // 0 → today, 1 → yesterday … 24 → ~3.5 weeks ago
      const createdAt = new Date(Date.now() - ageDays * 86400000).toISOString();
      const targetDate = new Date(Date.now() + ((i % 14) + 1) * 86400000);
      const targetIsoDate = targetDate.toISOString().split('T')[0];
      // May 9, 2026 schema split: kecamatan picks a WEEK on submit; admin confirms the DAY at assign.
      // Populate the kecamatan's week for every row, and only fill `scheduled_date` once admin has acted.
      const isoWk = isoWeekOf(targetDate);
      const scheduledDate = ADMIN_DATED_STATUSES.has(status) ? targetIsoDate : null;
      const reviewedAt = [
        'approved',
        'rejected',
        'assigned',
        'in_progress',
        'done',
        'cancelled',
        'under_review',
      ].includes(status)
        ? new Date(Date.now() - ageDays * 86400000 + 3600 * 1000).toISOString()
        : null;
      const refCode = `PR-BULK-${i.toString().padStart(3, '0')}`;
      const photoUrls = Array.from(
        { length: photoCount },
        (_, n) => `https://placehold.co/600x400?text=PR-BULK-${i}-${n + 1}`,
      );

      const result = await ctx.qr.query(
        `INSERT INTO pruning_requests
           (reference_code, submitted_by, kecamatan_name, address, gps_lat, gps_lng,
            expected_year, expected_iso_week, scheduled_date,
            estimated_plant_count, tree_count,
            tree_height_estimate, tree_diameter_estimate,
            requester_name, requester_phone, rt_leader_name, rt_leader_phone,
            photo_urls, status, rayon_id,
            reviewed_by, reviewed_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::text[],$19,$20,$21,$22,$23)
         ON CONFLICT (reference_code) DO NOTHING`,
        [
          refCode,
          sampleSubmitterId,
          kec,
          `${street} No. ${100 + i}`,
          -7.2575 + i * 0.0007,
          112.7521 + i * 0.0007,
          isoWk.year,
          isoWk.week,
          scheduledDate,
          treeCount,
          treeCount,
          height,
          diameter,
          `${reqName} ${i + 1}`,
          `0812345${(80000 + i).toString().slice(-5)}`,
          rtName,
          `0812987${(60000 + i).toString().slice(-5)}`,
          photoUrls,
          status,
          rayonForKec(kec),
          reviewedAt ? reviewerId : null,
          reviewedAt,
          createdAt,
        ],
      );
      if (result && (result as any).rowCount > 0) bulkInserted++;
    }
    ctx.log(
      `  ✓ ${bulkInserted} additional bulk pruning_requests (volume + status + date variety)`,
    );
    pruningInserted += bulkInserted;

    // Heal existing rows whose kecamatan_name disagrees with rayon_id
    const healed = await ctx.qr.query(`
      UPDATE pruning_requests pr
      SET rayon_id = k.rayon_id
      FROM kecamatans k
      WHERE pr.kecamatan_name = k.name
        AND (pr.rayon_id IS DISTINCT FROM k.rayon_id)
    `);
    const healedCount = (healed as any)?.[1] ?? 0;
    if (healedCount) {
      ctx.log(`  ✓ ${healedCount} existing pruning_requests realigned to their kecamatan's rayon`);
    }
  }
  ctx.log(`  ✓ ${pruningInserted} pruning_requests total (sample + bulk volume rows)`);
}
