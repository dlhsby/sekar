import type { SeedContext } from '../lib/context';
import { TASK_1_ID, DISTRICT_SELATAN_ID } from '../lib/ids';

/**
 * Seed tasks (Section B).
 *
 * ~50 tasks across satgas (8+25), linmas (4), korlap (3), and district-scoped (4).
 * Covers all task statuses (pending, assigned, accepted, in_progress, completed, declined, verified, revision_needed).
 */
export async function seedTasks(ctx: SeedContext): Promise<void> {
  ctx.log('📋 ======== SECTION B: Tasks ========');
  ctx.log('🗑️  Clearing existing tasks...');
  await ctx.qr.query(`DELETE FROM task_tags`);
  await ctx.qr.query(`DELETE FROM tasks`);
  ctx.log('  ✓ Cleared tasks and task_tags');

  // May 9, 2026 — bias the seeded tasks to Rayon Pusat so the
  // korlap_pusat_1 / satgas_pusat_* / linmas_pusat_* users (the canonical
  // UAT actors documented in seed-staging) actually have inboxes to work
  // through. Falls back to any user if Pusat isn't populated yet (e.g.
  // someone runs phase2 in isolation against a stripped DB).
  const taskCreator = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'korlap_pusat_1'
     UNION ALL SELECT id FROM users WHERE role = 'korlap' LIMIT 1`,
  );
  const taskSatgas = await ctx.qr.query(
    `SELECT id FROM users
     WHERE username IN ('satgas_pusat_1','satgas_pusat_2','satgas_pusat_3','satgas_pusat_4')
     ORDER BY username
     LIMIT 3`,
  );
  const taskLinmas = await ctx.qr.query(
    `SELECT id FROM users
     WHERE username IN ('linmas_pusat_1','linmas_pusat_2')
     ORDER BY username
     LIMIT 2`,
  );
  const taskKepala = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'kepala_rayon_pusat_1' LIMIT 1`,
  );
  const taskTopMgmt = await ctx.qr.query(`SELECT id FROM users WHERE role = 'management' LIMIT 1`);
  const taskAreas = await ctx.qr.query(
    `SELECT id FROM locations WHERE district_id = (SELECT id FROM districts WHERE name = 'Rayon Pusat')
     ORDER BY name LIMIT 5`,
  );

  if (taskCreator.length === 0 || taskSatgas.length === 0 || taskAreas.length === 0) {
    ctx.log('  ⚠ Required users/locations not found, skipping tasks');
  } else {
    const cId = taskCreator[0].id;
    const s1Id = taskSatgas[0]?.id;
    const s2Id = taskSatgas[1]?.id ?? s1Id;
    const s3Id = taskSatgas[2]?.id ?? s1Id;
    const l1Id = taskLinmas[0]?.id ?? null;
    const l2Id = taskLinmas[1]?.id ?? l1Id;
    const kId = taskKepala[0]?.id ?? null;
    const tmId = taskTopMgmt[0]?.id ?? null;
    const a1 = taskAreas[0]?.id;
    const a2 = taskAreas[1]?.id ?? a1;
    const a3 = taskAreas[2]?.id ?? a1;

    // Local task ID consts (TASK_1_ID is imported from lib/ids)
    const TASK_2_ID = 'f69ce06b-d253-4455-bf11-6e695eb028f3';
    const TASK_3_ID = '809869e9-6ffd-4015-bb02-45d0ff71f344';
    const TASK_4_ID = '63abcff4-3294-4643-9eb4-c25127d5bfd0';
    const TASK_5_ID = 'a94b846b-ebbf-41df-bcbf-340187c50b5a';
    const TASK_6_ID = 'a1de5361-6619-454d-af2a-360fe5cc18bc';
    const TASK_7_ID = 'cee9877b-5d88-4528-b339-9bed9a8fb06b';
    const TASK_8_ID = '8ec6c9c4-981c-412d-a1e8-a6c2c80ed189';

    const LINMAS_TASK_1_ID = 'f5e4d3c2-b1a0-4f9e-8d7c-6b5a4c3d2e1f';
    const LINMAS_TASK_2_ID = 'a0b1c2d3-e4f5-4a6b-9c7d-8e9f0a1b2c3d';
    const LINMAS_TASK_3_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-9f0a1b2c3d4e';
    const LINMAS_TASK_4_ID = 'c2d3e4f5-a6b7-4c8d-ae0f-0a1b2c3d4e5f';

    const KORLAP_TASK_1_ID = 'd3e4f5a6-b7c8-4d9e-bf1a-1b2c3d4e5f6a';
    const KORLAP_TASK_2_ID = 'e4f5a6b7-c8d9-4e0f-9a2b-2c3d4e5f6a7b';
    const KORLAP_TASK_3_ID = 'f5a6b7c8-d9e0-4f1a-8b3c-3d4e5f6a7b8c';

    const DISTRICT_TASK_1_ID = 'a6b7c8d9-e0f1-4a2b-9c4d-4e5f6a7b8c9d';
    const DISTRICT_TASK_2_ID = 'b7c8d9e0-f1a2-4b3c-8d5e-5f6a7b8c9d0e';
    const RAYON_TASK_3_ID = 'c8d9e0f1-a2b3-4c4d-ae6f-6a7b8c9d0e1f';
    const RAYON_TASK_4_ID = 'd9e0f1a2-b3c4-4d5e-bf7a-7b8c9d0e1f2a';

    // 8 core satgas tasks — covers all 8 statuses after UPDATE pass below
    await ctx.qr.query(`
      INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, created_at, updated_at) VALUES
        ('${TASK_1_ID}', 'Penyiraman Taman Pagi', 'Menyiram seluruh area taman pada pagi hari. Fokus tanaman baru.', 'pending', 'high', NOW() + INTERVAL '1 day', '${a1}', NULL, '${cId}', NOW(), NOW()),
        ('${TASK_7_ID}', 'Pembersihan Jalur Jogging', 'Membersihkan jalur jogging dari dedaunan dan sampah.', 'pending', 'high', NOW() + INTERVAL '1 day', '${a1}', NULL, '${cId}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    await ctx.qr.query(`
      INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
        ('${TASK_2_ID}', 'Penanaman Bunga Musiman', 'Menanam bunga musiman. Total 50 pot bunga.', 'assigned', 'medium', NOW() + INTERVAL '7 days', '${a2}', '${s1Id}', '${cId}', NOW() - INTERVAL '1 hour', NOW(), NOW()),
        ('${TASK_3_ID}', 'Perantingan Pohon Tinggi', 'Memangkas dahan pohon yang menghalangi jalur pejalan kaki.', 'assigned', 'urgent', NOW() + INTERVAL '1 day', '${a3}', '${s2Id}', '${cId}', NOW() - INTERVAL '2 hours', NOW(), NOW()),
        ('${TASK_8_ID}', 'Perawatan Rumput Taman', 'Memeriksa dan merawat kondisi rumput di area taman.', 'assigned', 'low', NOW() + INTERVAL '7 days', '${a2}', '${s3Id}', '${cId}', NOW() - INTERVAL '30 minutes', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    await ctx.qr.query(`
      INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, started_at, created_at, updated_at) VALUES
        ('${TASK_4_ID}', 'Pembersihan Location Playground', 'Membersihkan area playground dari sampah dan dedaunan.', 'in_progress', 'medium', NOW(), '${a1}', '${s3Id}', '${cId}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '30 minutes', NOW(), NOW()),
        ('${TASK_6_ID}', 'Perantingan Semak Belukar', 'Memangkas semak belukar di area belakang taman.', 'in_progress', 'low', NOW() + INTERVAL '7 days', '${a3}', '${s2Id}', '${cId}', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    await ctx.qr.query(`
      INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, started_at, completed_at, completion_notes, completion_photo_urls, created_at, updated_at) VALUES
        ('${TASK_5_ID}', 'Penyiraman Taman Sore', 'Menyiram taman pada sore hari.', 'completed', 'low', NOW() - INTERVAL '1 day', '${a2}', '${s1Id}', '${cId}', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 'Penyiraman selesai. Semua tanaman sudah disiram dengan baik.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/sat-watering-complete.jpg'], NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    ctx.log('  ✓ Created 8 satgas core tasks');

    // Update tasks to cover all 8 statuses
    await ctx.qr.query(`
      UPDATE tasks SET status = 'accepted', accepted_at = NOW() - INTERVAL '1 hour'
      WHERE id = '${TASK_3_ID}'
    `);
    await ctx.qr.query(`
      UPDATE tasks SET status = 'declined', declined_at = NOW() - INTERVAL '2 hours',
        decline_reason = 'Alat pemangkas tidak tersedia saat ini, perlu diservis terlebih dahulu'
      WHERE id = '${TASK_6_ID}'
    `);
    await ctx.qr.query(`
      UPDATE tasks SET status = 'verified', verified_by = '${cId}', verified_at = NOW() - INTERVAL '1 hour'
      WHERE id = '${TASK_5_ID}'
    `);
    await ctx.qr.query(`
      UPDATE tasks SET
        status = 'revision_needed',
        assigned_to = '${s2Id}',
        assigned_at = NOW() - INTERVAL '3 days',
        accepted_at = NOW() - INTERVAL '2 days',
        started_at = NOW() - INTERVAL '1 day',
        completed_at = NOW() - INTERVAL '6 hours',
        completion_notes = 'Jalur jogging sudah dibersihkan dari dedaunan',
        completion_photo_urls = ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/jogging-cleanup.jpg'],
        revision_reason = 'Masih ada sampah di area tikungan, perlu dibersihkan ulang'
      WHERE id = '${TASK_7_ID}'
    `);
    ctx.log('  ✓ Updated 4 tasks to cover statuses: accepted, declined, verified, revision_needed');

    // Linmas tasks (4)
    if (l1Id) {
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, created_at, updated_at) VALUES
          ('${LINMAS_TASK_1_ID}', 'Patroli Keamanan Malam', 'Patroli area taman 20:00-22:00. Cek lampu dan parkir.', 'pending', 'high', NOW() + INTERVAL '2 days', '${a1}', NULL, '${cId}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
          ('${LINMAS_TASK_2_ID}', 'Pengecekan Fasilitas Taman', 'Cek kondisi lampu, bangku, pagar, dan fasilitas umum.', 'assigned', 'medium', NOW() + INTERVAL '1 day', '${a1}', '${l1Id}', '${cId}', NOW() - INTERVAL '1 day', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, started_at, created_at, updated_at) VALUES
          ('${LINMAS_TASK_3_ID}', 'Pengawasan Event Weekend', 'Jaga keamanan selama event komunitas. Atur lalu lintas pengunjung.', 'in_progress', 'urgent', NOW(), '${a2}', '${l2Id ?? l1Id}', '${cId}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, started_at, completed_at, completion_notes, completion_photo_urls, created_at, updated_at) VALUES
          ('${LINMAS_TASK_4_ID}', 'Laporan Insiden PKL', 'Dokumentasi dan pelaporan PKL ilegal di area taman.', 'completed', 'high', NOW() - INTERVAL '1 day', '${a3}', '${l1Id}', '${cId}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', 'Laporan insiden PKL selesai. Sudah dikoordinasikan dengan satpol PP.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/linmas-incident.jpg'], NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 4 linmas tasks');
    }

    // Korlap tasks (3)
    if (kId) {
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
          ('${KORLAP_TASK_1_ID}', 'Koordinasi Tim Mingguan', 'Meeting koordinasi dengan satgas dan linmas. Review progress minggu ini.', 'assigned', 'medium', NOW() + INTERVAL '3 days', '${a1}', '${cId}', '${kId}', NOW() - INTERVAL '1 day', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, started_at, created_at, updated_at) VALUES
          ('${KORLAP_TASK_2_ID}', 'Pengecekan Kendaraan Operasional', 'Cek kondisi kendaraan dan perlengkapan operasional.', 'in_progress', 'medium', NOW(), NULL, '${cId}', '${kId}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, assigned_at, started_at, completed_at, completion_notes, completion_photo_urls, created_at, updated_at) VALUES
          ('${KORLAP_TASK_3_ID}', 'Supervisi Penanaman Pohon', 'Supervisi kegiatan penanaman 50 pohon di area taman.', 'completed', 'high', NOW() - INTERVAL '1 day', '${a2}', '${cId}', '${kId}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'Supervisi selesai. Penanaman 50 pohon berhasil.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/korlap-supervision.jpg'], NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 3 korlap tasks');
    }

    // Rayon-scoped + kepala_rayon tasks (2+2)
    await ctx.qr.query(`
      INSERT INTO tasks (id, title, description, status, priority, deadline, district_id, location_id, assigned_to, created_by, created_at, updated_at) VALUES
        ('${DISTRICT_TASK_1_ID}', 'Audit Semua Location di Rayon Selatan', 'Periksa kondisi fasilitas di seluruh area dalam rayon.', 'pending', 'medium', NOW() + INTERVAL '7 days', '${DISTRICT_SELATAN_ID}', NULL, NULL, '${cId}', NOW(), NOW()),
        ('${DISTRICT_TASK_2_ID}', 'Koordinasi Event Weekend Rayon', 'Persiapan event di semua taman dalam rayon.', 'pending', 'medium', NOW() + INTERVAL '3 days', '${DISTRICT_SELATAN_ID}', NULL, NULL, '${cId}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    if (kId && tmId) {
      await ctx.qr.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, district_id, location_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
          ('${RAYON_TASK_3_ID}', 'Laporan Bulanan Rayon Selatan', 'Compile laporan bulanan dari semua area di district.', 'assigned', 'high', NOW() + INTERVAL '5 days', '${DISTRICT_SELATAN_ID}', NULL, '${kId}', '${tmId}', NOW() - INTERVAL '1 day', NOW(), NOW()),
          ('${RAYON_TASK_4_ID}', 'Review Kinerja Korlap', 'Evaluasi kinerja korlap di district untuk kuartal ini.', 'in_progress', 'medium', NOW() + INTERVAL '5 days', '${DISTRICT_SELATAN_ID}', NULL, '${kId}', '${tmId}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 4 district-scoped tasks (2 plain + 2 kepala_rayon)');
    } else {
      ctx.log('  ✓ Created 2 district-scoped tasks');
    }

    // 25 extended tasks for scroll/filter testing (IDs via gen_random_uuid — Section B DELETE clears first)
    await ctx.qr.query(
      `
      INSERT INTO tasks (id, title, description, status, priority, deadline, location_id, assigned_to, created_by, created_at, updated_at)
      VALUES
        (gen_random_uuid(), 'Perantingan Pohon Minggu Lalu',   'Perantingan pohon di jalur pedestrian.',         'completed',   'medium', $1,  '${a1}', '${s1Id}', '${cId}', $1,  $1 ),
        (gen_random_uuid(), 'Pengecatan Pagar Taman',           'Pengecatan pagar area bermain anak.',            'completed',   'low',    $2,  '${a1}', '${s2Id}', '${cId}', $2,  $2 ),
        (gen_random_uuid(), 'Pembersihan Kolam',                'Pembersihan dan pergantian air kolam hias.',     'completed',   'high',   $3,  '${a1}', '${s1Id}', '${cId}', $3,  $3 ),
        (gen_random_uuid(), 'Perbaikan Jalan Setapak',          'Perbaikan jalan setapak yang rusak.',            'completed',   'urgent', $4,  '${a2}', '${s2Id}', '${cId}', $4,  $4 ),
        (gen_random_uuid(), 'Pemasangan Papan Informasi',       'Pemasangan papan informasi baru di pintu masuk.','in_progress', 'medium', $5,  '${a2}', '${s2Id}', '${cId}', $5,  $5 ),
        (gen_random_uuid(), 'Penyemprotan Hama',                'Penyemprotan hama pada semua tanaman.',          'in_progress', 'high',   $6,  '${a1}', '${s1Id}', '${cId}', $6,  $6 ),
        (gen_random_uuid(), 'Inventarisasi Peralatan',          'Cek dan catat seluruh peralatan taman.',         'assigned',    'low',    $7,  '${a1}', '${s2Id}', '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Pemupukan Tanaman Hias',           'Pemupukan rutin seluruh tanaman hias.',          'assigned',    'medium', $7,  '${a2}', '${s3Id}', '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Perbaikan Saluran Air',            'Perbaikan saluran drainase yang tersumbat.',     'pending',     'urgent', $7,  '${a1}', NULL,      '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Pemasangan Tanaman Merambat',      'Pemasangan tanaman merambat di pagar depan.',   'pending',     'low',    $7,  '${a2}', NULL,      '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Patroli Subuh',                    'Patroli keamanan pukul 04:00-06:00.',           'completed',   'high',   $1,  '${a1}', '${l1Id ?? s1Id}', '${cId}', $1, $1),
        (gen_random_uuid(), 'Pengamanan Car Free Day',          'Pengamanan area taman saat car free day.',      'completed',   'urgent', $2,  '${a1}', '${l2Id ?? s1Id}', '${cId}', $2, $2),
        (gen_random_uuid(), 'Laporan Keamanan Harian',          'Dokumentasi laporan keamanan harian.',          'in_progress', 'medium', $6,  '${a2}', '${l1Id ?? s1Id}', '${cId}', $6, $6),
        (gen_random_uuid(), 'Patroli Sore Hari',                'Patroli area taman pukul 17:00-19:00.',         'assigned',    'high',   $7,  '${a1}', '${l2Id ?? s1Id}', '${cId}', $7, $7),
        (gen_random_uuid(), 'Penertiban Pedagang Liar',         'Koordinasi dengan satpol PP untuk penertiban.',  'pending',     'urgent', $7,  '${a3}', NULL,      '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Evaluasi Kinerja Tim',             'Evaluasi kinerja seluruh tim lapangan.',         'completed',   'high',   $3,  '${a1}', '${cId}',  '${kId ?? cId}', $3, $3),
        (gen_random_uuid(), 'Briefing Prosedur Keselamatan',    'Briefing SOP keselamatan kerja tim.',            'in_progress', 'medium', $6,  '${a2}', '${cId}',  '${kId ?? cId}', $6, $6),
        (gen_random_uuid(), 'Koordinasi Event Bulanan',         'Persiapan dan koordinasi event bulanan.',        'assigned',    'high',   $7,  '${a1}', '${cId}',  '${kId ?? cId}', $7, $7),
        (gen_random_uuid(), 'Audit Penggunaan Anggaran',        'Review penggunaan anggaran operasional.',        'pending',     'low',    $7,  '${a3}', NULL,      '${kId ?? cId}', $7, $7),
        (gen_random_uuid(), 'Perawatan Taman Tema',             'Perawatan khusus taman tema mini.',              'pending',     'medium', $7,  '${a1}', NULL,      '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Pengadaan Benih Tanaman',          'Koordinasi pengadaan benih untuk bulan depan.', 'assigned',    'low',    $7,  '${a2}', '${s1Id}', '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Renovasi Tempat Duduk',            'Pengecatan dan perbaikan tempat duduk.',         'in_progress', 'medium', $7,  '${a1}', '${s2Id}', '${cId}', $7,  $7 ),
        (gen_random_uuid(), 'Dokumentasi Kondisi Taman',        'Foto dan dokumentasi kondisi taman.',            'completed',   'low',    $1,  '${a3}', '${s1Id}', '${cId}', $1,  $1 ),
        (gen_random_uuid(), 'Pembersihan Pasca Event',          'Pembersihan area taman setelah event.',          'completed',   'high',   $2,  '${a1}', '${s2Id}', '${cId}', $2,  $2 ),
        (gen_random_uuid(), 'Pengecatan Mural Taman',           'Pengecatan mural seni pada dinding taman.',     'pending',     'medium', $7,  '${a2}', NULL,      '${cId}', $7,  $7 )
      ;
      `,
      [
        new Date(Date.now() - 30 * 86400000).toISOString(), // $1 30 days ago
        new Date(Date.now() - 21 * 86400000).toISOString(), // $2 21 days ago
        new Date(Date.now() - 14 * 86400000).toISOString(), // $3 14 days ago
        new Date(Date.now() - 7 * 86400000).toISOString(), // $4  7 days ago
        new Date(Date.now() - 3 * 86400000).toISOString(), // $5  3 days ago
        new Date(Date.now() - 1 * 86400000).toISOString(), // $6  1 day ago
        new Date(Date.now() + 7 * 86400000).toISOString(), // $7  7 days from now
      ],
    );
    ctx.log('  ✓ Created 25 extended tasks for scroll/filter testing');
  }
}
