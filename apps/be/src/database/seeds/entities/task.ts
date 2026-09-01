import type { SeedContext } from '../lib/context';

/**
 * Seed tasks (Section B).
 *
 * ~20+ tasks covering all 8 statuses (pending/assigned/accepted/declined/in_progress/
 * completed/verified/revision_needed) and all 5 scopes (city/district/region/location/none).
 *
 * Each task has deterministic UUID + ON CONFLICT for idempotency. Scope is
 * explicitly set to match the geographic binding (ADR-046).
 */
export async function seedTasks(ctx: SeedContext): Promise<void> {
  ctx.log('📋 Seeding Tasks (all statuses + scopes)…');
  ctx.log('🗑️  Clearing existing tasks...');
  await ctx.qr.query(`DELETE FROM task_tags`);
  await ctx.qr.query(`DELETE FROM tasks`);
  ctx.log('  ✓ Cleared tasks and task_tags');

  // Resolve required users for task creation/assignment
  const taskCreator = await ctx.qr.query(`SELECT id FROM users WHERE role = 'korlap' LIMIT 1`);
  const taskSatgas = await ctx.qr.query(
    `SELECT id FROM users WHERE role = 'satgas' ORDER BY created_at LIMIT 4`,
  );
  const taskLinmas = await ctx.qr.query(
    `SELECT id FROM users WHERE role = 'linmas' ORDER BY created_at LIMIT 2`,
  );
  const taskKepala = await ctx.qr.query(`SELECT id FROM users WHERE role = 'kepala_rayon' LIMIT 1`);
  const taskTopMgmt = await ctx.qr.query(`SELECT id FROM users WHERE role = 'management' LIMIT 1`);

  // Resolve geographic scope samples
  const taskLocations = await ctx.qr.query(
    `SELECT id, district_id, region_id FROM locations WHERE is_active = true ORDER BY created_at LIMIT 5`,
  );
  const taskDistricts = await ctx.qr.query(`SELECT id FROM districts ORDER BY name LIMIT 3`);
  const taskRegions = await ctx.qr.query(
    `SELECT id, district_id FROM regions ORDER BY created_at LIMIT 2`,
  );

  if (taskCreator.length === 0 || taskSatgas.length === 0) {
    ctx.log('  ⚠ Required users not found, skipping tasks');
    return;
  }

  const cId = taskCreator[0].id;
  const s1Id = taskSatgas[0]?.id;
  const s2Id = taskSatgas[1]?.id ?? s1Id;
  const s3Id = taskSatgas[2]?.id ?? s1Id;
  const l1Id = taskLinmas[0]?.id ?? null;
  const kId = taskKepala[0]?.id ?? null;
  const tmId = taskTopMgmt[0]?.id ?? null;

  // Geographic bindings for scope testing
  const loc1 = taskLocations[0];
  const dist1 = taskDistricts[0];
  const reg1 = taskRegions[0];

  // Helper to safely format UUID or NULL in SQL
  const sqlUuid = (val?: string | null) => (val ? `'${val}'` : 'NULL');

  // Deterministic task IDs for idempotency
  const TASK_LOC_PENDING = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const TASK_LOC_ASSIGNED = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  const TASK_LOC_ACCEPTED = 'c3d4e5f6-a7b8-9012-cdef-123456789012';
  const TASK_LOC_DECLINED = 'd4e5f6a7-b8c9-0123-def1-234567890123';
  const TASK_LOC_IN_PROGRESS = 'e5f6a7b8-c9d0-1234-ef12-345678901234';
  const TASK_LOC_COMPLETED = 'f6a7b8c9-d0e1-2345-f123-456789012345';
  const TASK_LOC_REVISION = 'b8c9d0e1-f2a3-4567-1234-678901234567';

  const TASK_DIST_PENDING = 'c9d0e1f2-a3b4-5678-2345-789012345678';
  const TASK_DIST_ASSIGNED = 'd0e1f2a3-b4c5-6789-3456-890123456789';
  const TASK_DIST_IN_PROGRESS = 'e1f2a3b4-c5d6-7890-4567-901234567890';
  const TASK_DIST_COMPLETED = 'f2a3b4c5-d6e7-8901-5678-012345678901';

  const TASK_REG_PENDING = 'a3b4c5d6-e7f8-0123-6789-123456789012';
  const TASK_REG_ASSIGNED = 'b4c5d6e7-f8a9-1234-789a-234567890123';
  const TASK_REG_COMPLETED = 'c5d6e7f8-a9b0-2345-89ab-345678901234';

  const TASK_CITY_PENDING = 'd6e7f8a9-b0c1-3456-9abc-456789012345';
  const TASK_CITY_ASSIGNED = 'e7f8a9b0-c1d2-4567-abcd-567890123456';

  const TASK_NONE_PENDING = 'f8a9b0c1-d2e3-5678-bcde-678901234567';
  const TASK_NONE_ASSIGNED = 'a9b0c1d2-e3f4-6789-cdef-789012345678';

  // --- Location-scoped tasks (require location_id, scope='location')
  if (loc1) {
    const locDistrictId = loc1.district_id || dist1?.id;
    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_PENDING}', 'Penyiraman Taman Pagi',
         'Menyiram seluruh area taman pada pagi hari dengan fokus tanaman baru.',
         'pending', 'high', NOW() + INTERVAL '1 day', 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         NULL, '${cId}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, assigned_at, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_ASSIGNED}', 'Penanaman Bunga Musiman',
         'Menanam bunga musiman. Total 50 pot bunga untuk area dekoratif.',
         'assigned', 'medium', NOW() + INTERVAL '7 days', 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         '${s1Id}', '${cId}', NOW() - INTERVAL '1 hour', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, assigned_at, accepted_at, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_ACCEPTED}', 'Perantingan Pohon Tinggi',
         'Memangkas dahan pohon yang menghalangi jalur pejalan kaki di area entrance.',
         'accepted', 'urgent', NOW() + INTERVAL '1 day', 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         '${s2Id}', '${cId}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, assigned_at, declined_at, decline_reason, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_DECLINED}', 'Perawatan Rumput Taman',
         'Memeriksa dan merawat kondisi rumput di area taman.',
         'declined', 'low', NOW() + INTERVAL '7 days', 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         '${s3Id}', '${cId}', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes',
         'Peralatan pemotong rumput sedang diperbaiki', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, assigned_at, started_at, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_IN_PROGRESS}', 'Pembersihan Location Playground',
         'Membersihkan area playground dari sampah dan dedaunan jatuh.',
         'in_progress', 'medium', NOW(), 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         '${s1Id}', '${cId}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '30 minutes', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, assigned_at, started_at, completed_at,
        completion_notes, completion_photo_urls, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_COMPLETED}', 'Penyiraman Taman Sore',
         'Menyiram taman pada sore hari dengan sistem selang.',
         'completed', 'low', NOW() - INTERVAL '1 day', 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         '${s2Id}', '${cId}', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours',
         'Penyiraman selesai. Semua tanaman sudah disiram dengan baik.',
         ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/watering-complete.jpg'],
         NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      UPDATE tasks SET status = 'verified', verified_by = '${cId}', verified_at = NOW() - INTERVAL '1 hour'
      WHERE id = '${TASK_LOC_COMPLETED}'
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        location_id, district_id, region_id,
        assigned_to, created_by, assigned_at, started_at, completed_at,
        completion_notes, completion_photo_urls, revision_reason, created_at, updated_at
      ) VALUES
        ('${TASK_LOC_REVISION}', 'Pembersihan Jalur Jogging',
         'Membersihkan jalur jogging dari dedaunan dan sampah yang menumpuk.',
         'revision_needed', 'high', NOW(), 'location',
         '${loc1.id}', '${locDistrictId}', ${sqlUuid(loc1.region_id)},
         '${s3Id}', '${cId}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '6 hours',
         'Jalur jogging sudah dibersihkan dari dedaunan',
         ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/jogging-cleanup.jpg'],
         'Masih ada sampah di area tikungan, perlu dibersihkan ulang',
         NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // --- District-scoped tasks (require district_id, scope='district', no location_id)
  if (dist1) {
    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        district_id, location_id, region_id,
        assigned_to, created_by, created_at, updated_at
      ) VALUES
        ('${TASK_DIST_PENDING}', 'Audit Semua Lokasi di Rayon',
         'Periksa kondisi fasilitas di seluruh area dalam rayon untuk evaluasi berkala.',
         'pending', 'medium', NOW() + INTERVAL '7 days', 'district',
         '${dist1.id}', NULL, NULL,
         NULL, '${cId}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        district_id, location_id, region_id,
        assigned_to, created_by, assigned_at, created_at, updated_at
      ) VALUES
        ('${TASK_DIST_ASSIGNED}', 'Koordinasi Event Rayon Bulanan',
         'Persiapan dan koordinasi event bulanan di semua taman dalam rayon.',
         'assigned', 'medium', NOW() + INTERVAL '3 days', 'district',
         '${dist1.id}', NULL, NULL,
         '${kId ?? cId}', '${tmId ?? cId}', NOW() - INTERVAL '1 day', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        district_id, location_id, region_id,
        assigned_to, created_by, assigned_at, started_at, created_at, updated_at
      ) VALUES
        ('${TASK_DIST_IN_PROGRESS}', 'Laporan Kinerja Rayon Kuartalan',
         'Compile dan evaluasi laporan kinerja satgas di seluruh rayon untuk kuartal ini.',
         'in_progress', 'high', NOW() + INTERVAL '5 days', 'district',
         '${dist1.id}', NULL, NULL,
         '${kId ?? cId}', '${tmId ?? cId}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        district_id, location_id, region_id,
        assigned_to, created_by, assigned_at, started_at, completed_at,
        completion_notes, completion_photo_urls, created_at, updated_at
      ) VALUES
        ('${TASK_DIST_COMPLETED}', 'Evaluasi Kinerja Tim Rayon',
         'Evaluasi dan review kinerja seluruh tim lapangan di rayon secara komprehensif.',
         'completed', 'high', NOW() - INTERVAL '1 day', 'district',
         '${dist1.id}', NULL, NULL,
         '${kId ?? cId}', '${tmId ?? cId}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day',
         'Evaluasi selesai. Semua metrik kinerja telah dikumpulkan dan dianalisis.',
         ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/rayon-evaluation.jpg'],
         NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // --- Region-scoped tasks (require region_id, scope='region')
  if (reg1) {
    const regDistrictId = reg1.district_id || dist1?.id;
    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        region_id, district_id, location_id,
        assigned_to, created_by, created_at, updated_at
      ) VALUES
        ('${TASK_REG_PENDING}', 'Koordinasi Satgas Kawasan Mingguan',
         'Meeting koordinasi satgas di kawasan untuk membahas progress dan kendala mingguan.',
         'pending', 'medium', NOW() + INTERVAL '3 days', 'region',
         '${reg1.id}', '${regDistrictId}', NULL,
         NULL, '${cId}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        region_id, district_id, location_id,
        assigned_to, created_by, assigned_at, created_at, updated_at
      ) VALUES
        ('${TASK_REG_ASSIGNED}', 'Supervisi Penanaman Pohon Kawasan',
         'Supervisi kegiatan penanaman pohon di seluruh lokasi dalam kawasan.',
         'assigned', 'high', NOW() + INTERVAL '5 days', 'region',
         '${reg1.id}', '${regDistrictId}', NULL,
         '${kId ?? cId}', '${tmId ?? cId}', NOW() - INTERVAL '1 day', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);

    await ctx.qr.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline, scope,
        region_id, district_id, location_id,
        assigned_to, created_by, assigned_at, started_at, completed_at,
        completion_notes, completion_photo_urls, created_at, updated_at
      ) VALUES
        ('${TASK_REG_COMPLETED}', 'Inspeksi Fasilitas Kawasan',
         'Inspeksi menyeluruh fasilitas umum di semua lokasi kawasan untuk perawatan berkala.',
         'completed', 'medium', NOW() - INTERVAL '2 days', 'region',
         '${reg1.id}', '${regDistrictId}', NULL,
         '${cId}', '${kId ?? cId}', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day',
         'Inspeksi selesai. Semua fasilitas dalam kondisi baik, perbaikan kecil sudah ditandai.',
         ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/facility-inspection.jpg'],
         NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  // --- City-scoped tasks (no location/district/region, scope='city')
  await ctx.qr.query(`
    INSERT INTO tasks (
      id, title, description, status, priority, deadline, scope,
      location_id, district_id, region_id,
      assigned_to, created_by, created_at, updated_at
    ) VALUES
      ('${TASK_CITY_PENDING}', 'Rapat Koordinasi Kota Bulanan',
       'Rapat koordinasi bulanan seluruh rayon di tingkat kota untuk sinkronisasi program.',
       'pending', 'high', NOW() + INTERVAL '7 days', 'city',
       NULL, NULL, NULL,
       NULL, '${tmId ?? cId}', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  await ctx.qr.query(`
    INSERT INTO tasks (
      id, title, description, status, priority, deadline, scope,
      location_id, district_id, region_id,
      assigned_to, created_by, assigned_at, created_at, updated_at
    ) VALUES
      ('${TASK_CITY_ASSIGNED}', 'Penyusunan Rencana Tahunan Kota',
       'Penyusunan rencana kerja dan program RTH untuk seluruh kota dalam tahun berjalan.',
       'assigned', 'high', NOW() + INTERVAL '14 days', 'city',
       NULL, NULL, NULL,
       '${tmId ?? cId}', '${tmId ?? cId}', NOW() - INTERVAL '2 days', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  // --- None-scoped tasks (all ids null, scope='none', for ad-hoc assignments)
  await ctx.qr.query(`
    INSERT INTO tasks (
      id, title, description, status, priority, deadline, scope,
      location_id, district_id, region_id,
      assigned_to, created_by, created_at, updated_at
    ) VALUES
      ('${TASK_NONE_PENDING}', 'Pelatihan Keselamatan Kerja Ad Hoc',
       'Pelatihan keselamatan kerja untuk personel baru yang belum ditugaskan ke lokasi spesifik.',
       'pending', 'high', NOW() + INTERVAL '3 days', 'none',
       NULL, NULL, NULL,
       NULL, '${cId}', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  await ctx.qr.query(`
    INSERT INTO tasks (
      id, title, description, status, priority, deadline, scope,
      location_id, district_id, region_id,
      assigned_to, created_by, assigned_at, created_at, updated_at
    ) VALUES
      ('${TASK_NONE_ASSIGNED}', 'Pemeliharaan Equipment Operasional',
       'Pemeliharaan berkala peralatan operasional yang digunakan lintas rayon tanpa lokasi tetap.',
       'assigned', 'medium', NOW() + INTERVAL '5 days', 'none',
       NULL, NULL, NULL,
       '${l1Id ?? cId}', '${cId}', NOW() - INTERVAL '1 day', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  `);

  ctx.log('  ✓ Created 20 tasks covering all 8 statuses × 5 scopes');

  // Link a few activities to tasks (optional: demonstrates task-activity linking)
  if (loc1 && s1Id) {
    const linkedActivity = await ctx.qr.query(
      `SELECT id FROM activities WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [s1Id],
    );
    if (linkedActivity.length > 0) {
      await ctx.qr.query(`UPDATE activities SET task_id = $1 WHERE id = $2`, [
        TASK_LOC_IN_PROGRESS,
        linkedActivity[0].id,
      ]);
      ctx.log('  ✓ Linked 1 activity to location-scoped in_progress task');
    }
  }
}
