import type { SeedContext } from '../lib/context';
import {
  ADMIN_USER_ID,
  RESET_TEST_USER_ID,
  RAYON_SELATAN_ID,
  RAYON_UTARA_ID,
  RAYON_PUSAT_ID,
  RAYON_TIMUR1_ID,
  RAYON_TIMUR2_ID,
  RAYON_BARAT1_ID,
  RAYON_BARAT2_ID,
  RAYON_TAMAN_AKTIF_ID,
  RAYON_ID_BY_CODE,
  SHIFT_1_ID,
  SHIFT_2_ID,
  SHIFT_3_ID,
} from '../lib/ids';
import { DEFAULT_PASSWORD_HASH, superadminPasswordHash } from '../constants';
import { loadSeedUsers } from '../load-seed-data';
import {
  DARMO_P1_AREA_ID,
  DARMO_P2_AREA_ID,
  DARMO_P3_AREA_ID,
  DARMO_P4_AREA_ID,
  DARMO_P5_AREA_ID,
  DARMO_BCA_AREA_ID,
  BUNGKUL_AREA_ID,
  TAMAN_FLORA_AREA_ID,
  TAMAN_BUK_TONG_ID,
} from '../kmz-locations';

/**
 * Seed users (mode-dependent):
 *
 * Demo: ~60 users (Phase 1 + Phase 2 + Phase 3 test users). Combines superadmin,
 * resettest, per-rayon managers (korlap/admin_data), field workers (satgas/linmas),
 * and 31 staff_kecamatan users.
 *
 * Staging: 1125 users. Superadmin + admin system + top management + per-rayon
 * dummies (14 test per rayon = ~140) + real roster from CSV (~1041) + 31
 * staff_kecamatan. Full UAT dataset.
 */
export async function seedUsers(ctx: SeedContext): Promise<void> {
  ctx.log('👤 Seeding Users…');

  if (ctx.mode === 'staging') {
    // ============================================================
    // STAGING: system + scenario dummies + real roster + staff_kecamatan.
    // Faithful port of the original seed-staging.ts STEP 9 + 9b + 10.
    // ============================================================
    const PASSWORD_HASH = DEFAULT_PASSWORD_HASH;
    const AREA_BUNGKUL_ID = BUNGKUL_AREA_ID;

    // Stable staging user UUIDs.
    const USER_SUPERADMIN_ID = '53b4c5d6-e7f8-4690-1234-567879809102';
    const USER_ADMIN_SYS_ID = '53c5d6e7-f8a9-4701-2345-678980910213';
    const USER_TOP_MGMT_ID = '53d6e7f8-a9b0-4812-3456-789091021324';
    const USER_KEPALA_RAYON_ID = '53e7f8a9-b0c1-4923-4567-890102132435';
    const USER_ADMIN_DATA_ID = '53f8a9b0-c1d2-4a34-5678-901213243546';
    const USER_KORLAP_PUSAT1_ID = '54a9b0c1-d2e3-4b45-6789-012324354657';
    const USER_KORLAP_PUSAT2_ID = '54b0c1d2-e3f4-4c56-7890-123435465768';
    const USER_KORLAP_BUNGKUL_ID = '54c1d2e3-f4a5-4d67-8901-234546576879';
    const USER_SATGAS_PUSAT1_ID = '54d2e3f4-a5b6-4e78-9012-345657687980';
    const USER_SATGAS_PUSAT2_ID = '54e3f4a5-b6c7-4f89-0123-456768798091';
    const USER_LINMAS_PUSAT1_ID = '54f4a5b6-c7d8-4090-1234-567879809102';
    const USER_LINMAS_PUSAT2_ID = '55a5b6c7-d8e9-4101-2345-678980910213';
    const USER_SATGAS_BUNGKUL_ID = '55b6c7d8-e9f0-4212-3456-789091021324';
    const USER_STAFF_KECAMATAN_PUSAT_ID = '55b6c7d8-e9f0-4212-3456-789091021325';
    const USER_PRAMUDITA_ID = '55c7d8e9-f0a1-4323-4567-890102132435';
    const USER_WAHYU_ID = '55d8e9f0-a1b2-4434-5678-901213243546';
    const USER_BUDI_ID = '55e9f0a1-b2c3-4545-6789-012324354657';
    const USER_PONCO_ID = '55f0a1b2-c3d4-4656-7890-123435465768';
    const USER_RAKHMAT_ID = '56a1b2c3-d4e5-4767-8901-234546576879';
    const USER_ROY_ID = '56b2c3d4-e5f6-4878-9012-345657687980';
    const USER_EDI_ID = '56c3d4e5-f6a7-4989-0123-456768798091';
    const USER_JIHAN_ID = '56d4e5f6-a7b8-4090-1234-567879809102';
    const USER_DENI_ID = '56e5f6a7-b8c9-4101-2345-678980910213';
    const USER_AGUS_ID = '56f6a7b8-c9d0-4212-3456-789091021324';
    // Per-rayon dummies: 5 roles × 6 non-Pusat rayons = 30 stable ids.
    const PER_RAYON_USER_IDS = [
      '5a010101-0000-4001-8001-000000000001',
      '5a010102-0000-4001-8001-000000000002',
      '5a010103-0000-4001-8001-000000000003',
      '5a010104-0000-4001-8001-000000000004',
      '5a010105-0000-4001-8001-000000000005',
      '5a010106-0000-4001-8001-000000000006',
      '5a010201-0000-4001-8002-000000000007',
      '5a010202-0000-4001-8002-000000000008',
      '5a010203-0000-4001-8002-000000000009',
      '5a010204-0000-4001-8002-00000000000a',
      '5a010205-0000-4001-8002-00000000000b',
      '5a010206-0000-4001-8002-00000000000c',
      '5a010301-0000-4001-8003-00000000000d',
      '5a010302-0000-4001-8003-00000000000e',
      '5a010303-0000-4001-8003-00000000000f',
      '5a010304-0000-4001-8003-000000000010',
      '5a010305-0000-4001-8003-000000000011',
      '5a010306-0000-4001-8003-000000000012',
      '5a010401-0000-4001-8004-000000000013',
      '5a010402-0000-4001-8004-000000000014',
      '5a010403-0000-4001-8004-000000000015',
      '5a010404-0000-4001-8004-000000000016',
      '5a010405-0000-4001-8004-000000000017',
      '5a010406-0000-4001-8004-000000000018',
      '5a010501-0000-4001-8005-000000000019',
      '5a010502-0000-4001-8005-00000000001a',
      '5a010503-0000-4001-8005-00000000001b',
      '5a010504-0000-4001-8005-00000000001c',
      '5a010505-0000-4001-8005-00000000001d',
      '5a010506-0000-4001-8005-00000000001e',
    ];

    // Resolve real Pusat + Timur 2 areas for the dummy assignments.
    const pusatDummyAreaIds: string[] = (
      (await ctx.qr.query(
        `SELECT id FROM areas WHERE rayon_id = $1 AND deleted_at IS NULL ORDER BY name LIMIT 12`,
        [RAYON_PUSAT_ID],
      )) as Array<{ id: string }>
    ).map((r) => r.id);
    const pusatDummyAreaId = pusatDummyAreaIds[0] ?? null;
    const timur2DummyAreaId =
      (
        (await ctx.qr.query(
          `SELECT id FROM areas WHERE rayon_id = $1 AND deleted_at IS NULL ORDER BY name LIMIT 1`,
          [RAYON_TIMUR2_ID],
        )) as Array<{ id: string }>
      )[0]?.id ?? null;

    let usersInserted = 0;
    let usersExisting = 0;
    const insertUser = async (
      id: string,
      username: string,
      fullName: string,
      role: string,
      phone: string,
      rayonId: string | null = null,
      locationId: string | null = null,
      kecamatanName: string | null = null,
      opts: { passwordHash?: string; mustChange?: boolean } = {},
    ) => {
      const result = await ctx.qr.query(
        `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, location_id, kecamatan_name, is_active, password_must_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [
          id,
          username,
          opts.passwordHash ?? PASSWORD_HASH,
          fullName,
          phone,
          role,
          rayonId,
          locationId,
          kecamatanName,
          opts.mustChange ?? true,
        ],
      );
      if (Array.isArray(result) && result.length > 0) usersInserted += 1;
      else usersExisting += 1;
    };

    // System-wide.
    await insertUser(
      USER_SUPERADMIN_ID,
      'superadmin',
      'Super Admin',
      'superadmin',
      '081200000010',
      null,
      null,
      null,
      { passwordHash: superadminPasswordHash(), mustChange: false },
    );
    await insertUser(
      USER_ADMIN_SYS_ID,
      'admin_system_1',
      'Admin Sistem Satu',
      'admin_system',
      '081200000011',
    );
    await insertUser(
      USER_TOP_MGMT_ID,
      'top_management_1',
      'Top Management Satu',
      'top_management',
      '081200000012',
    );
    // Rayon Pusat management.
    await insertUser(
      USER_KEPALA_RAYON_ID,
      'kepala_rayon_pusat_1',
      'Kepala Rayon Pusat Satu',
      'kepala_rayon',
      '081200000013',
      RAYON_PUSAT_ID,
    );
    await insertUser(
      USER_ADMIN_DATA_ID,
      'admin_data_pusat_1',
      'Admin Data Pusat Satu',
      'admin_data',
      '081200000014',
      RAYON_PUSAT_ID,
    );
    // Rayon Pusat korlap.
    await insertUser(
      USER_KORLAP_PUSAT1_ID,
      'korlap_pusat_1',
      'Korlap Pusat Satu',
      'korlap',
      '081200000015',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_KORLAP_PUSAT2_ID,
      'korlap_pusat_2',
      'Korlap Pusat Dua',
      'korlap',
      '081200000016',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_KORLAP_BUNGKUL_ID,
      'korlap_pusat_3',
      'Korlap Pusat Tiga',
      'korlap',
      '081200000017',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // Rayon Pusat satgas / linmas.
    await insertUser(
      USER_SATGAS_PUSAT1_ID,
      'satgas_pusat_1',
      'Satgas Pusat Satu',
      'satgas',
      '081200000018',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_SATGAS_PUSAT2_ID,
      'satgas_pusat_2',
      'Satgas Pusat Dua',
      'satgas',
      '081200000019',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_LINMAS_PUSAT1_ID,
      'linmas_pusat_1',
      'Linmas Pusat Satu',
      'linmas',
      '081200000020',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_LINMAS_PUSAT2_ID,
      'linmas_pusat_2',
      'Linmas Pusat Dua',
      'linmas',
      '081200000021',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_SATGAS_BUNGKUL_ID,
      'satgas_pusat_3',
      'Satgas Pusat Tiga',
      'satgas',
      '081200000022',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // Rayon Taman Aktif full role matrix.
    await insertUser(
      '5a0b0001-0000-4002-8003-000000000002',
      'satgas_taman_bungkul_1',
      'Satgas Taman Bungkul Satu',
      'satgas',
      '081200000060',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000001',
      'korlap_taman_aktif_1',
      'Korlap Taman Aktif Satu',
      'korlap',
      '081200000061',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000002',
      'linmas_taman_aktif_1',
      'Linmas Taman Aktif Satu',
      'linmas',
      '081200000062',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000003',
      'kepala_rayon_taman_aktif_1',
      'Kepala Rayon Taman Aktif Satu',
      'kepala_rayon',
      '081200000063',
      RAYON_TAMAN_AKTIF_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000004',
      'admin_data_taman_aktif_1',
      'Admin Data Taman Aktif Satu',
      'admin_data',
      '081200000064',
      RAYON_TAMAN_AKTIF_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000005',
      'satgas_taman_flora_1',
      'Satgas Taman Flora Satu',
      'satgas',
      '081200000065',
      RAYON_TAMAN_AKTIF_ID,
      TAMAN_FLORA_AREA_ID,
    );
    // staff_kecamatan_pusat_1 (scoped to Rayon Pusat for pruning workflow).
    await insertUser(
      USER_STAFF_KECAMATAN_PUSAT_ID,
      'staff_kecamatan_pusat_1',
      'Staff Kecamatan Pusat Satu',
      'staff_kecamatan',
      '081200000023',
      RAYON_PUSAT_ID,
      null,
      'Tegalsari',
    );

    // Per-rayon dummy matrix (5 roles × 6 non-Pusat rayons = 30).
    const perRayonRoster: Array<{
      slug: string;
      rayonId: string;
      label: string;
      defaultAreaId: string | null;
    }> = [
      { slug: 'selatan', rayonId: RAYON_SELATAN_ID, label: 'Selatan', defaultAreaId: null },
      { slug: 'utara', rayonId: RAYON_UTARA_ID, label: 'Utara', defaultAreaId: null },
      { slug: 'timur_1', rayonId: RAYON_TIMUR1_ID, label: 'Timur 1', defaultAreaId: null },
      {
        slug: 'timur_2',
        rayonId: RAYON_TIMUR2_ID,
        label: 'Timur 2',
        defaultAreaId: timur2DummyAreaId,
      },
      { slug: 'barat_1', rayonId: RAYON_BARAT1_ID, label: 'Barat 1', defaultAreaId: null },
      { slug: 'barat_2', rayonId: RAYON_BARAT2_ID, label: 'Barat 2', defaultAreaId: null },
    ];
    const PER_RAYON_ROLES: Array<{
      role: string;
      usernamePrefix: string;
      fullNamePrefix: string;
      assignArea: boolean;
    }> = [
      {
        role: 'kepala_rayon',
        usernamePrefix: 'kepala_rayon',
        fullNamePrefix: 'Kepala Rayon',
        assignArea: false,
      },
      {
        role: 'admin_data',
        usernamePrefix: 'admin_data',
        fullNamePrefix: 'Admin Data',
        assignArea: false,
      },
      { role: 'korlap', usernamePrefix: 'korlap', fullNamePrefix: 'Korlap', assignArea: true },
      { role: 'satgas', usernamePrefix: 'satgas', fullNamePrefix: 'Satgas', assignArea: true },
      { role: 'linmas', usernamePrefix: 'linmas', fullNamePrefix: 'Linmas', assignArea: true },
    ];
    let perRayonIdx = 0;
    let perRayonPhone = 30;
    for (const roleDef of PER_RAYON_ROLES) {
      for (const r of perRayonRoster) {
        const username = `${roleDef.usernamePrefix}_${r.slug}_1`;
        const fullName = `${roleDef.fullNamePrefix} ${r.label} Satu`;
        const phone = `0812000${String(perRayonPhone).padStart(5, '0')}`;
        const locationId = roleDef.assignArea ? r.defaultAreaId : null;
        await insertUser(
          PER_RAYON_USER_IDS[perRayonIdx],
          username,
          fullName,
          roleDef.role,
          phone,
          r.rayonId,
          locationId,
        );
        perRayonIdx += 1;
        perRayonPhone += 1;
      }
    }

    // Hardcoded real users (also present in the roster; deduped by username).
    await insertUser(
      USER_PRAMUDITA_ID,
      'pramudita_yustiani',
      'Pramudita Yustiani',
      'top_management',
      '08563302643',
    );
    await insertUser(USER_WAHYU_ID, 'wahyu_tri_p', 'Wahyu Tri P', 'superadmin', '081232939377');
    await insertUser(
      USER_BUDI_ID,
      'budi_setyo_utomo',
      'Budi Setyo Utomo',
      'kepala_rayon',
      '081200000001',
      RAYON_PUSAT_ID,
    );
    await insertUser(
      USER_PONCO_ID,
      'ponco_adi_prabowo',
      'Ponco Adi Prabowo',
      'admin_data',
      '081200000002',
      RAYON_PUSAT_ID,
    );
    await insertUser(
      USER_RAKHMAT_ID,
      'rakhmat_novianto',
      'RAKHMAT NOVIANTO',
      'satgas',
      '087825841818',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_ROY_ID,
      'roy_junaidi',
      'ROY JUNAIDI',
      'satgas',
      '083854355341',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_EDI_ID,
      'edi_santoso',
      'EDI SANTOSO',
      'satgas',
      '085855434561',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      USER_JIHAN_ID,
      'jihan_nabila_safitri',
      'JIHAN NABILA SAFITRI',
      'satgas',
      '08970900786',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      USER_DENI_ID,
      'deni_purwanto',
      'DENI PURWANTO',
      'linmas',
      '081554017822',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      USER_AGUS_ID,
      'agus_ramadhan',
      'AGUS RAMADHAN',
      'linmas',
      '083831353889',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    ctx.log(`  ✓ ${usersInserted} system/dummy users inserted, ${usersExisting} already existed`);

    // Real roster from data/users.csv (login by phone or username; forced reset).
    const roster = loadSeedUsers();
    if (roster.length === 0) {
      ctx.log(
        '  ⚠️  users.csv missing/empty — run `npm run sheet:pull`. Continuing with dummies only.',
      );
    }
    const existingPhones = new Set(
      (
        (await ctx.qr.query(
          `SELECT phone_number FROM users WHERE phone_number IS NOT NULL`,
        )) as Array<{ phone_number: string }>
      ).map((r) => r.phone_number),
    );
    const tamanAktifAreaIdByName = new Map<string, string>(
      (
        (await ctx.qr.query(`SELECT id, name FROM areas WHERE rayon_id = $1`, [
          RAYON_TAMAN_AKTIF_ID,
        ])) as Array<{ id: string; name: string }>
      ).map((r) => [r.name, r.id]),
    );
    for (const u of roster) {
      const rayonId = RAYON_ID_BY_CODE[u.rayon_code] ?? null;
      let phone: string | null = u.phone || null;
      if (phone && existingPhones.has(phone)) phone = null;
      if (phone) existingPhones.add(phone);
      const locationIds = u.area_names
        .map((n) => tamanAktifAreaIdByName.get(n))
        .filter((x): x is string => Boolean(x));
      const primaryAreaId = locationIds[0] ?? null;
      // A roster id can collide with a system/dummy row's id when the client
      // sheet was reconciled against the live DB (a roster user may have adopted
      // a seeded-dummy id under a different username). users.csv is gitignored
      // and regenerated, so the seeder must be robust: if this id is already held
      // by a DIFFERENT username, mint a fresh one instead of hitting users_pkey.
      // Non-colliding rows keep their deterministic id.
      await ctx.qr.query(
        `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, location_id, is_active, password_must_change)
         VALUES (
           CASE WHEN EXISTS (SELECT 1 FROM users WHERE id = $1::uuid AND username <> $2)
                THEN gen_random_uuid() ELSE $1::uuid END,
           $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [u.id, u.username, PASSWORD_HASH, u.full_name, phone, u.role, rayonId, primaryAreaId],
      );
      const uidRows = (await ctx.qr.query(`SELECT id FROM users WHERE username = $1`, [
        u.username,
      ])) as Array<{ id: string }>;
      const uid = uidRows[0]?.id;
      if (uid) {
        for (const aid of locationIds) {
          await ctx.qr.query(
            `INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
             VALUES ($1, $2, 'permanent', $3) ON CONFLICT DO NOTHING`,
            [uid, aid, USER_SUPERADMIN_ID],
          );
        }
      }
    }
    ctx.log(`  ✓ roster: ${roster.length} processed from data/users.csv`);

    // Per-kecamatan staff_kecamatan_<code>_1 (31), from the seeded kecamatans.
    const kecRows = (await ctx.qr.query(
      `SELECT id, name, code, rayon_id FROM kecamatans ORDER BY name`,
    )) as Array<{ id: string; name: string; code: string; rayon_id: string }>;
    let kecPhoneSeq = 100;
    for (const k of kecRows) {
      const username = `staff_kecamatan_${k.code}_1`;
      const phone = `0812000${String(kecPhoneSeq).padStart(5, '0')}`;
      kecPhoneSeq += 1;
      await ctx.qr.query(
        `INSERT INTO users (username, password_hash, full_name, phone_number, role, rayon_id, location_id, kecamatan_name, kecamatan_id, is_active, password_must_change)
         VALUES ($1, $2, $3, $4, 'staff_kecamatan', $5, NULL, $6, $7, TRUE, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [
          username,
          PASSWORD_HASH,
          `Staff Kecamatan ${k.name} Satu`,
          phone,
          k.rayon_id,
          k.name,
          k.id,
        ],
      );
    }
    await ctx.qr.query(
      `UPDATE users u SET kecamatan_id = k.id FROM kecamatans k WHERE u.role = 'staff_kecamatan' AND u.kecamatan_id IS NULL AND u.kecamatan_name IS NOT NULL AND lower(k.name) = lower(u.kecamatan_name)`,
    );
    await ctx.qr.query(
      `UPDATE users u SET rayon_id = k.rayon_id FROM kecamatans k WHERE u.role = 'staff_kecamatan' AND u.kecamatan_id = k.id AND (u.rayon_id IS DISTINCT FROM k.rayon_id)`,
    );
    ctx.log('  ✓ 31 per-kecamatan staff_kecamatan users');

    // STEP 9b: field workers (satgas/linmas/korlap) → Shift 1; others NULL.
    await ctx.qr.query(
      `UPDATE users SET shift_definition_id = $1 WHERE role IN ('satgas', 'linmas', 'korlap') AND deleted_at IS NULL`,
      [SHIFT_1_ID],
    );
    // STEP 10: derive rayon_id for field workers from their area.
    await ctx.qr.query(
      `UPDATE users u SET rayon_id = a.rayon_id FROM areas a WHERE u.location_id = a.id AND u.rayon_id IS NULL AND u.role IN ('satgas', 'linmas', 'korlap')`,
    );
    ctx.log('✅ Staging users seeding complete');
  } else {
    // ==========================================
    // DEMO: Test users (Phase 1 + Phase 2 + Phase 3)
    // ==========================================
    const passwordHash = DEFAULT_PASSWORD_HASH;

    // Canonical superadmin — username `superadmin`, password from
    // SEED_SUPERADMIN_PASSWORD (12345678 locally), password_must_change=FALSE
    // (no forced reset) so it is always a reliable break-glass login.
    await ctx.qr.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, is_active, password_must_change) VALUES
        ('${ADMIN_USER_ID}', 'superadmin', '${superadminPasswordHash()}', 'Super Admin', '081200000000', 'superadmin', TRUE, FALSE)
      ON CONFLICT (username) DO NOTHING
    `);

    // Dummy account to exercise the forced password-change flow (AS-5). Temp
    // password is "12345678"; password_must_change=TRUE forces the change
    // screen on first login. Remove/disable before production.
    await ctx.qr.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, is_active, password_must_change) VALUES
        ('${RESET_TEST_USER_ID}', 'resettest', '${passwordHash}', 'Reset Test User', '081200000099', 'satgas', TRUE, TRUE)
      ON CONFLICT (username) DO NOTHING
    `);

    ctx.log('  ✓ Seeded 2 Phase 1 users (superadmin + resettest)');

    // ==========================================
    // PHASE 2: Users with Phase 2 roles (STEP 8)
    // ==========================================

    // Local user UUIDs (not in lib/ids)
    const USER_PHASE2_1_ID = '72a9cad5-bc9f-44a6-a982-e714080c1643';
    const USER_PHASE2_2_ID = '8dd46350-3bad-4232-be54-23d144c8aefb';
    const USER_PHASE2_3_ID = '1db260a1-446a-41dc-9215-e934ec5eb14f';
    const USER_PHASE2_4_ID = '83ee0766-9cf1-471f-812f-d9b41a5397e3';
    const USER_PHASE2_8_ID = '9da22bbf-ea00-4e7a-b2fb-f22339690eb9';
    const USER_PHASE2_9_ID = 'b8c6c6a4-7270-4790-8b2f-ba5e8aec5a7a';

    const USER_NEW_1_ID = '3f7b4a2e-8c91-4d56-b3e7-9a1f2c4d6e8f';
    const USER_NEW_2_ID = '7a2e9d4f-1b3c-4e8a-9f7b-2c6d0e5f8a1b';
    const USER_NEW_3_ID = '5c8f3a1d-4e7b-4f2c-8a9d-1b6e0f4c7d2e';
    const USER_NEW_4_ID = '2d9b7e6f-3c4a-4d8e-b1f7-9e0c2a8b4d6f';
    const USER_NEW_5_ID = '8f1c4a7d-6e2b-4f9c-a3d8-7b0e5f1c3a9d';
    const USER_NEW_6_ID = '4a7d9e2f-8b1c-4a6d-b5e9-3f7c0a4d2b8e';
    const USER_NEW_7_ID = '6e3f1b9a-7c4d-4e2f-a8b5-1d9c7e3f0a6b';
    const USER_NEW_8_ID = '9b4e7c2f-1a8d-4b3e-a6f9-4d0b8e2c7f1a';
    const USER_NEW_9_ID = '1f8b5e3c-4d7a-4c9e-b2f8-6a1b5e9c4d7f';
    const USER_NEW_10_ID = '7c2a8f4d-9e1b-4d7c-a5a2-8e4c1f7b3d9a';
    const USER_NEW_11_ID = '3e9f6b1c-5d8a-4e4f-b7c1-9f3d6a0e8b5c';
    const USER_NEW_12_ID = 'a5d2e9f7-6b3c-4f1a-b8e5-2f7d4b9e0a6c';
    const USER_NEW_13_ID = 'd8c5f3a9-2e7b-4c8d-a1f6-5b3e9d2c7f4a';
    const USER_NEW_14_ID = '2f7a4d8e-9c1b-4d6f-b3a7-8c5e2f0d4b9e';
    const USER_NEW_15_ID = 'b4e8a3f1-7c2d-4b5e-a9f4-1d6a8e3b5f7c';

    const USER_LINMAS_BUNGKUL_1_ID = 'c6d1f4b8-3a7e-4c9d-a5f2-7b4a1e6d9c3f';
    const USER_LINMAS_DARMO_1_ID = 'e9b3a7f2-6d4c-4e1b-b8a5-3c7d0b9e2a6f';
    const USER_KORLAP_DARMO_ID = 'f1d4e7a3-2b8c-4f5d-a9e6-4c1b7e3f0d8a';

    const USER_SATGAS_BUNGKUL_1_ID = 'a3c9e7f2-1d5b-4a8e-b6c4-9f2e7a3c5d1b';
    const USER_SATGAS_BUNGKUL_2_ID = 'd7b4f1e9-3c6a-4d2f-a8e5-2b9f4d7c1e6a';

    const USER_ADMIN_DATA_SELATAN_ID = '1a4c7e9b-2d5f-4a8c-93e6-7f9a1c4e7b2d';
    const USER_ADMIN_DATA_UTARA_ID = '2b5d8f0c-3e6a-4b9d-a4f7-8a0b2d5f8c3e';
    const USER_ADMIN_DATA_TIMUR1_ID = '3c6e9a1d-4f7b-4c0e-b5a8-9b1c3e6a9d4f';
    const USER_ADMIN_DATA_TIMUR2_ID = '4d7f0b2e-5a8c-4d1f-86b9-0c2d4f7b0e5a';
    const USER_ADMIN_DATA_BARAT1_ID = '5e8a1c3f-6b9d-4e2a-97c0-1d3e5a8c1f6b';
    const USER_ADMIN_DATA_BARAT2_ID = '6f9b2d4a-7c0e-4f3b-a8d1-2e4f6b9d2a7c';

    const USER_KORLAP_HARMONI_ID = '7a0c3e5b-8d1f-4a4c-b9e2-3f5a7c0e3b8d';
    const USER_KORLAP_UTARA_ID = '8b1d4f6c-9e2a-4b5d-a0f3-4a6b8d1f4c9e';
    const USER_KORLAP_TIMUR1_ID = '9c2e5a7d-0f3b-4c6e-b1a4-5b7c9e2a5d0f';
    const USER_KORLAP_TIMUR2_ID = 'ad3f6b8e-1a4c-4d7f-82b5-6c8d0f3b6e1a';
    const USER_KORLAP_BARAT1_ID = 'be4a7c9f-2b5d-4e8a-93c6-7d9e1a4c7f2b';
    const USER_KORLAP_BARAT2_ID = 'cf5b8d0a-3c6e-4f9b-a4d7-8e0f2b5d8a3c';

    // Initial Phase 2C users (11)
    await ctx.qr.query(`
    INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, location_id, is_active) VALUES
      ('${USER_PHASE2_1_ID}', 'top_management_1', '${passwordHash}', 'Top Management Satu', '081234567890', 'top_management', NULL, NULL, TRUE),
      ('${USER_PHASE2_2_ID}', 'kepala_rayon_selatan_1', '${passwordHash}', 'Kepala Rayon Selatan Satu', '081234567891', 'kepala_rayon', '${RAYON_SELATAN_ID}', NULL, TRUE),
      ('${USER_PHASE2_3_ID}', 'kepala_rayon_utara_1', '${passwordHash}', 'Kepala Rayon Utara Satu', '081234567892', 'kepala_rayon', '${RAYON_UTARA_ID}', NULL, TRUE),
      ('${USER_PHASE2_4_ID}', 'korlap_pusat_1', '${passwordHash}', 'Korlap Pusat Satu', '081234567893', 'korlap', NULL, '${DARMO_P3_AREA_ID}', TRUE),
      ('${USER_LINMAS_BUNGKUL_1_ID}', 'linmas_pusat_1', '${passwordHash}', 'Linmas Pusat Satu', '081234567894', 'linmas', NULL, NULL, TRUE),
      ('${USER_LINMAS_DARMO_1_ID}',   'linmas_pusat_2',   '${passwordHash}', 'Linmas Pusat Dua',   '081234567895', 'linmas', NULL, NULL, TRUE),
      ('${USER_KORLAP_DARMO_ID}',     'korlap_pusat_2',     '${passwordHash}', 'Korlap Pusat Dua',  '081234567896', 'korlap', NULL, NULL, TRUE),
      ('${USER_PHASE2_8_ID}', 'admin_data_pusat_1', '${passwordHash}', 'Admin Data Pusat Satu', '081234567897', 'admin_data', '${RAYON_PUSAT_ID}', NULL, TRUE),
      ('${USER_PHASE2_9_ID}', 'admin_system_1', '${passwordHash}', 'Admin Sistem Satu', '081234567898', 'admin_system', NULL, NULL, TRUE),
      ('${USER_SATGAS_BUNGKUL_1_ID}', 'satgas_pusat_3', '${passwordHash}', 'Satgas Pusat Tiga', '081300000016', 'satgas', '${RAYON_PUSAT_ID}', '${DARMO_P4_AREA_ID}', TRUE),
      ('${USER_SATGAS_BUNGKUL_2_ID}', 'satgas_pusat_4', '${passwordHash}', 'Satgas Pusat Empat',  '081300000017', 'satgas', '${RAYON_PUSAT_ID}', '${DARMO_P5_AREA_ID}', TRUE),
      ('5a0b0001-0000-4002-8003-000000000001', 'satgas_taman_bungkul_1', '${passwordHash}', 'Satgas Taman Bungkul Satu', '081300000040', 'satgas', '${RAYON_TAMAN_AKTIF_ID}', '${BUNGKUL_AREA_ID}', TRUE),
      ('5a0b0001-0000-4002-8003-000000000003', 'korlap_taman_aktif_1', '${passwordHash}', 'Korlap Taman Aktif Satu', '081300000041', 'korlap', '${RAYON_TAMAN_AKTIF_ID}', '${BUNGKUL_AREA_ID}', TRUE),
      ('5a0b0001-0000-4002-8003-000000000004', 'linmas_taman_aktif_1', '${passwordHash}', 'Linmas Taman Aktif Satu', '081300000042', 'linmas', '${RAYON_TAMAN_AKTIF_ID}', '${BUNGKUL_AREA_ID}', TRUE),
      ('5a0b0001-0000-4002-8003-000000000005', 'kepala_rayon_taman_aktif_1', '${passwordHash}', 'Kepala Rayon Taman Aktif Satu', '081300000043', 'kepala_rayon', '${RAYON_TAMAN_AKTIF_ID}', NULL, TRUE),
      ('5a0b0001-0000-4002-8003-000000000006', 'admin_data_taman_aktif_1', '${passwordHash}', 'Admin Data Taman Aktif Satu', '081300000044', 'admin_data', '${RAYON_TAMAN_AKTIF_ID}', NULL, TRUE),
      ('5a0b0001-0000-4002-8003-000000000007', 'satgas_taman_flora_1', '${passwordHash}', 'Satgas Taman Flora Satu', '081300000045', 'satgas', '${RAYON_TAMAN_AKTIF_ID}', '${TAMAN_FLORA_AREA_ID}', TRUE)
    ON CONFLICT (username) DO NOTHING;
  `);

    ctx.log('  ✓ Seeded 17 Phase 2C users (incl. taman_aktif role matrix)');

    // 15 users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)
    await ctx.qr.query(`
    INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, location_id, is_active) VALUES
      ('${USER_NEW_1_ID}',  'kepala_rayon_pusat_1',  '${passwordHash}', 'Kepala Rayon Pusat Satu',   '081300000001', 'kepala_rayon', '${RAYON_PUSAT_ID}', NULL, TRUE),
      ('${USER_NEW_2_ID}',  'satgas_pusat_1',      '${passwordHash}', 'Satgas Pusat Satu',    '081300000002', 'satgas',       '${RAYON_PUSAT_ID}', NULL, TRUE),
      ('${USER_NEW_3_ID}',  'satgas_pusat_2',      '${passwordHash}', 'Satgas Pusat Dua',     '081300000003', 'satgas',       '${RAYON_PUSAT_ID}', NULL, TRUE),
      ('${USER_NEW_4_ID}',  'kepala_rayon_timur_1_1', '${passwordHash}', 'Kepala Rayon Timur 1 Satu', '081300000004', 'kepala_rayon', '${RAYON_TIMUR1_ID}', NULL, TRUE),
      ('${USER_NEW_5_ID}',  'satgas_timur_1_1',     '${passwordHash}', 'Satgas Timur 1 Satu',   '081300000005', 'satgas',       '${RAYON_TIMUR1_ID}', NULL, TRUE),
      ('${USER_NEW_6_ID}',  'satgas_timur_1_2',     '${passwordHash}', 'Satgas Timur 1 Dua',    '081300000006', 'satgas',       '${RAYON_TIMUR1_ID}', NULL, TRUE),
      ('${USER_NEW_7_ID}',  'kepala_rayon_timur_2_1', '${passwordHash}', 'Kepala Rayon Timur 2 Satu', '081300000007', 'kepala_rayon', '${RAYON_TIMUR2_ID}', NULL, TRUE),
      ('${USER_NEW_8_ID}',  'satgas_timur_2_1',     '${passwordHash}', 'Satgas Timur 2 Satu',   '081300000008', 'satgas',       '${RAYON_TIMUR2_ID}', NULL, TRUE),
      ('${USER_NEW_9_ID}',  'satgas_timur_2_2',     '${passwordHash}', 'Satgas Timur 2 Dua',    '081300000009', 'satgas',       '${RAYON_TIMUR2_ID}', NULL, TRUE),
      ('${USER_NEW_10_ID}', 'kepala_rayon_barat_1_1', '${passwordHash}', 'Kepala Rayon Barat 1 Satu', '081300000010', 'kepala_rayon', '${RAYON_BARAT1_ID}', NULL, TRUE),
      ('${USER_NEW_11_ID}', 'satgas_barat_1_1',     '${passwordHash}', 'Satgas Barat 1 Satu',   '081300000011', 'satgas',       '${RAYON_BARAT1_ID}', NULL, TRUE),
      ('${USER_NEW_12_ID}', 'satgas_barat_1_2',     '${passwordHash}', 'Satgas Barat 1 Dua',    '081300000012', 'satgas',       '${RAYON_BARAT1_ID}', NULL, TRUE),
      ('${USER_NEW_13_ID}', 'kepala_rayon_barat_2_1', '${passwordHash}', 'Kepala Rayon Barat 2 Satu', '081300000013', 'kepala_rayon', '${RAYON_BARAT2_ID}', NULL, TRUE),
      ('${USER_NEW_14_ID}', 'satgas_barat_2_1',     '${passwordHash}', 'Satgas Barat 2 Satu',   '081300000014', 'satgas',       '${RAYON_BARAT2_ID}', NULL, TRUE),
      ('${USER_NEW_15_ID}', 'satgas_barat_2_2',     '${passwordHash}', 'Satgas Barat 2 Dua',    '081300000015', 'satgas',       '${RAYON_BARAT2_ID}', NULL, TRUE)
    ON CONFLICT (username) DO NOTHING;
  `);

    ctx.log('  ✓ Seeded 15 users for missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)');

    // 12 users: admin_data + korlap for 6 remaining rayons
    await ctx.qr.query(`
    INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, location_id, is_active) VALUES
      ('${USER_ADMIN_DATA_SELATAN_ID}', 'admin_data_selatan_1', '${passwordHash}', 'Admin Data Selatan Satu', '081300000018', 'admin_data', '${RAYON_SELATAN_ID}', NULL, TRUE),
      ('${USER_ADMIN_DATA_UTARA_ID}',   'admin_data_utara_1',   '${passwordHash}', 'Admin Data Utara Satu',   '081300000019', 'admin_data', '${RAYON_UTARA_ID}', NULL, TRUE),
      ('${USER_ADMIN_DATA_TIMUR1_ID}',  'admin_data_timur_1_1',  '${passwordHash}', 'Admin Data Timur 1 Satu', '081300000020', 'admin_data', '${RAYON_TIMUR1_ID}', NULL, TRUE),
      ('${USER_ADMIN_DATA_TIMUR2_ID}',  'admin_data_timur_2_1',  '${passwordHash}', 'Admin Data Timur 2 Satu', '081300000021', 'admin_data', '${RAYON_TIMUR2_ID}', NULL, TRUE),
      ('${USER_ADMIN_DATA_BARAT1_ID}',  'admin_data_barat_1_1',  '${passwordHash}', 'Admin Data Barat 1 Satu', '081300000022', 'admin_data', '${RAYON_BARAT1_ID}', NULL, TRUE),
      ('${USER_ADMIN_DATA_BARAT2_ID}',  'admin_data_barat_2_1',  '${passwordHash}', 'Admin Data Barat 2 Satu', '081300000023', 'admin_data', '${RAYON_BARAT2_ID}', NULL, TRUE),
      ('${USER_KORLAP_HARMONI_ID}', 'korlap_selatan_1', '${passwordHash}', 'Korlap Selatan Satu', '081300000024', 'korlap', '${RAYON_SELATAN_ID}', NULL, TRUE),
      ('${USER_KORLAP_UTARA_ID}',   'korlap_utara_1',   '${passwordHash}', 'Korlap Utara Satu',   '081300000025', 'korlap', '${RAYON_UTARA_ID}', NULL, TRUE),
      ('${USER_KORLAP_TIMUR1_ID}',  'korlap_timur_1_1',  '${passwordHash}', 'Korlap Timur 1 Satu', '081300000026', 'korlap', '${RAYON_TIMUR1_ID}', NULL, TRUE),
      ('${USER_KORLAP_TIMUR2_ID}',  'korlap_timur_2_1',  '${passwordHash}', 'Korlap Timur 2 Satu', '081300000027', 'korlap', '${RAYON_TIMUR2_ID}', NULL, TRUE),
      ('${USER_KORLAP_BARAT1_ID}',  'korlap_barat_1_1',  '${passwordHash}', 'Korlap Barat 1 Satu', '081300000028', 'korlap', '${RAYON_BARAT1_ID}', NULL, TRUE),
      ('${USER_KORLAP_BARAT2_ID}',  'korlap_barat_2_1',  '${passwordHash}', 'Korlap Barat 2 Satu', '081300000029', 'korlap', '${RAYON_BARAT2_ID}', NULL, TRUE)
    ON CONFLICT (username) DO NOTHING;
  `);

    ctx.log('  ✓ Seeded 12 admin_data + korlap users for 6 remaining rayons');

    // 8 fill-in users: satgas Selatan/Utara + linmas for all 6 non-Pusat rayons
    await ctx.qr.query(`
    INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, location_id, is_active) VALUES
      ('5a020001-0000-4002-8001-000000000001', 'satgas_selatan_1',  '${passwordHash}', 'Satgas Selatan Satu',  '081300000030', 'satgas', '${RAYON_SELATAN_ID}', NULL, TRUE),
      ('5a020002-0000-4002-8001-000000000002', 'satgas_utara_1',    '${passwordHash}', 'Satgas Utara Satu',    '081300000031', 'satgas', '${RAYON_UTARA_ID}', NULL, TRUE),
      ('5a020003-0000-4002-8002-000000000003', 'linmas_selatan_1',  '${passwordHash}', 'Linmas Selatan Satu',  '081300000032', 'linmas', '${RAYON_SELATAN_ID}', NULL, TRUE),
      ('5a020004-0000-4002-8002-000000000004', 'linmas_utara_1',    '${passwordHash}', 'Linmas Utara Satu',    '081300000033', 'linmas', '${RAYON_UTARA_ID}', NULL, TRUE),
      ('5a020005-0000-4002-8002-000000000005', 'linmas_timur_1_1',  '${passwordHash}', 'Linmas Timur 1 Satu',  '081300000034', 'linmas', '${RAYON_TIMUR1_ID}', NULL, TRUE),
      ('5a020006-0000-4002-8002-000000000006', 'linmas_timur_2_1',  '${passwordHash}', 'Linmas Timur 2 Satu',  '081300000035', 'linmas', '${RAYON_TIMUR2_ID}', '${TAMAN_BUK_TONG_ID}', TRUE),
      ('5a020007-0000-4002-8002-000000000007', 'linmas_barat_1_1',  '${passwordHash}', 'Linmas Barat 1 Satu',  '081300000036', 'linmas', '${RAYON_BARAT1_ID}', NULL, TRUE),
      ('5a020008-0000-4002-8002-000000000008', 'linmas_barat_2_1',  '${passwordHash}', 'Linmas Barat 2 Satu',  '081300000037', 'linmas', '${RAYON_BARAT2_ID}', NULL, TRUE)
    ON CONFLICT (username) DO NOTHING;
  `);

    ctx.log('  ✓ Seeded 8 fill-in satgas + linmas users');

    // ==========================================
    // PHASE 3: staff_kecamatan users (31 total)
    // ==========================================
    const STAFF_KEC_PWD_HASH = DEFAULT_PASSWORD_HASH;

    // May 2026 — one staff_kecamatan user per kecamatan (31 total) so the
    // submit form can pre-fill rayon + kecamatan from the logged-in user.
    // Username pattern: `staff_kecamatan_<code>_<n>` (e.g.
    // `staff_kecamatan_tegalsari_1`)
    const kecBlueprint: Array<[string, string, string, string]> = [
      // [name, code, rayon_code, region]
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

    // Build map from rayon code to rayon ID for lookups
    const codeToRayonId: Record<string, string> = {
      SELATAN: RAYON_SELATAN_ID,
      UTARA: RAYON_UTARA_ID,
      PUSAT: RAYON_PUSAT_ID,
      TIMUR1: RAYON_TIMUR1_ID,
      TIMUR2: RAYON_TIMUR2_ID,
      BARAT1: RAYON_BARAT1_ID,
      BARAT2: RAYON_BARAT2_ID,
    };

    let phoneSeq = 100;
    for (const [_name, code, rcode, _region] of kecBlueprint) {
      const username = `staff_kecamatan_${code}_1`;
      const fullName = `Staff Kecamatan ${_name} Satu`;
      const phone = `0812000${String(phoneSeq).padStart(5, '0')}`;
      phoneSeq += 1;
      const rayonId = codeToRayonId[rcode];

      await ctx.qr.query(
        `INSERT INTO users
         (username, password_hash, full_name, phone_number,
          role, rayon_id, location_id, kecamatan_name, is_active)
       VALUES ($1, $2, $3, $4, 'staff_kecamatan', $5, NULL, $6, TRUE)
       ON CONFLICT (username) DO NOTHING`,
        [username, STAFF_KEC_PWD_HASH, fullName, phone, rayonId, _name],
      );
    }

    ctx.log('  ✓ Seeded 31 staff_kecamatan users (one per kecamatan)');

    // ==========================================
    // STEP 8.1: Scenario remap — repoint legacy dev users onto real KMZ areas.
    // ==========================================
    ctx.log('🌳 Remapping legacy dev users onto KMZ areas...');
    await ctx.qr.query(
      `UPDATE users SET location_id = '${DARMO_P1_AREA_ID}' WHERE username = 'satgas_pusat_1';`,
    );
    await ctx.qr.query(
      `UPDATE users SET location_id = '${DARMO_P2_AREA_ID}' WHERE username = 'satgas_pusat_2';`,
    );
    await ctx.qr.query(`
    UPDATE users SET rayon_id = '${RAYON_TIMUR2_ID}', location_id = '${TAMAN_BUK_TONG_ID}'
    WHERE username = 'satgas_timur_1_2';
  `);
    await ctx.qr.query(`
    UPDATE users SET location_id = NULL
    WHERE username = 'satgas_timur_1_1';
  `);
    await ctx.qr.query(`
    UPDATE users SET location_id = '${TAMAN_BUK_TONG_ID}'
    WHERE username IN ('satgas_timur_2_1', 'satgas_timur_2_2');
  `);
    ctx.log(
      '  ✓ Scenario remap done — Pusat users → Darmo, Timur 1 users → Rayon Timur 2 (Taman Buk Tong)',
    );

    // ==========================================
    // STEP 8.5: Assign location_id + rayon_id to field workers missing them.
    // ==========================================
    ctx.log('📍 Assigning location_id and rayon_id to field workers...');
    await ctx.qr.query(
      `UPDATE users SET location_id = $1
     WHERE username IN ('korlap_pusat_1', 'linmas_pusat_1')
       AND location_id IS NULL`,
      [DARMO_BCA_AREA_ID],
    );
    await ctx.qr.query(
      `UPDATE users SET location_id = $1
     WHERE username IN ('korlap_pusat_2', 'linmas_pusat_2')
       AND location_id IS NULL`,
      [DARMO_P1_AREA_ID],
    );
    await ctx.qr.query(`
    UPDATE users u
    SET rayon_id = a.rayon_id
    FROM areas a
    WHERE u.location_id = a.id
      AND u.rayon_id IS NULL
      AND u.role IN ('satgas', 'linmas', 'korlap');
  `);
    await ctx.qr.query(
      `UPDATE users SET location_id = $1
     WHERE username = 'korlap_timur_2_1' AND location_id IS NULL`,
      [TAMAN_BUK_TONG_ID],
    );
    ctx.log('  ✓ Assigned location_id + rayon_id to field workers');

    // ==========================================
    // STEP 9: Assign each worker a default shift
    // ==========================================
    // (ADR-013) A worker's shift lives on the user now (`users.shift_definition_id`);
    // the daily roster is materialized from that + `user_areas`. Round-robin across
    // the 3 shift definitions for all clockable roles (korlap is clockable too).
    ctx.log('📅 Assigning worker shifts...');
    const workerResult = await ctx.qr.query(`
    SELECT id FROM users WHERE role IN ('satgas', 'linmas', 'korlap');
  `);
    if (workerResult.length > 0) {
      for (let i = 0; i < workerResult.length; i++) {
        const shiftId = i % 3 === 0 ? SHIFT_1_ID : i % 3 === 1 ? SHIFT_2_ID : SHIFT_3_ID;
        await ctx.qr.query(`
        UPDATE users SET shift_definition_id = '${shiftId}' WHERE id = '${workerResult[i].id}';
      `);
      }
      ctx.log(`  ✓ Assigned shifts to ${workerResult.length} workers (satgas, linmas, korlap)`);
    } else {
      ctx.log('  ⚠ No workers found, skipping shift assignment');
    }

    ctx.log('✅ Users seeding complete');
  }
}
