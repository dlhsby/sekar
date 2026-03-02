import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Task Seeder Script
 *
 * Seeds dummy tasks for testing worker task list view.
 * Phase 2C: Uses 4 statuses (pending, assigned, in_progress, completed).
 *
 * Usage: npm run seed:tasks
 */

// Real UUID v4 IDs for tasks
const TASK_1_ID = '099757d2-ab32-4384-83e7-22a35b0510ec';
const TASK_2_ID = 'f69ce06b-d253-4455-bf11-6e695eb028f3';
const TASK_3_ID = '809869e9-6ffd-4015-bb02-45d0ff71f344';
const TASK_4_ID = '63abcff4-3294-4643-9eb4-c25127d5bfd0';
const TASK_5_ID = 'a94b846b-ebbf-41df-bcbf-340187c50b5a';
const TASK_6_ID = 'a1de5361-6619-454d-af2a-360fe5cc18bc';
const TASK_7_ID = 'cee9877b-5d88-4528-b339-9bed9a8fb06b';
const TASK_8_ID = '8ec6c9c4-981c-412d-a1e8-a6c2c80ed189';

// Linmas task UUIDs
const LINMAS_TASK_1_ID = '11111111-1111-1111-1111-111111111111';
const LINMAS_TASK_2_ID = '22222222-2222-2222-2222-222222222222';
const LINMAS_TASK_3_ID = '33333333-3333-3333-3333-333333333333';
const LINMAS_TASK_4_ID = '44444444-4444-4444-4444-444444444444';

// Korlap task UUIDs
const KORLAP_TASK_1_ID = '55555555-5555-5555-5555-555555555555';
const KORLAP_TASK_2_ID = '66666666-6666-6666-6666-666666666666';
const KORLAP_TASK_3_ID = '77777777-7777-7777-7777-777777777777';

// Extended task UUIDs (for scroll test coverage)
const TASK_E1_ID = 'e1000000-e100-e100-e100-e10000000001';
const TASK_E2_ID = 'e2000000-e200-e200-e200-e20000000002';
const TASK_E3_ID = 'e3000000-e300-e300-e300-e30000000003';
const TASK_E4_ID = 'e4000000-e400-e400-e400-e40000000004';
const TASK_E5_ID = 'e5000000-e500-e500-e500-e50000000005';
const TASK_E6_ID = 'e6000000-e600-e600-e600-e60000000006';
const TASK_E7_ID = 'e7000000-e700-e700-e700-e70000000007';
const TASK_E8_ID = 'e8000000-e800-e800-e800-e80000000008';
const TASK_E9_ID = 'e9000000-e900-e900-e900-e90000000009';
const TASK_E10_ID = 'ea000000-ea00-ea00-ea00-ea0000000010';
const TASK_E11_ID = 'eb000000-eb00-eb00-eb00-eb0000000011';
const TASK_E12_ID = 'ec000000-ec00-ec00-ec00-ec0000000012';
const TASK_E13_ID = 'ed000000-ed00-ed00-ed00-ed0000000013';
const TASK_E14_ID = 'ee000000-ee00-ee00-ee00-ee0000000014';
const TASK_E15_ID = 'ef000000-ef00-ef00-ef00-ef0000000015';
const TASK_E16_ID = 'f0000000-f000-f000-f000-f00000000016';
const TASK_E17_ID = 'f1000000-f100-f100-f100-f10000000017';
const TASK_E18_ID = 'f2000000-f200-f200-f200-f20000000018';
const TASK_E19_ID = 'f3000000-f300-f300-f300-f30000000019';
const TASK_E20_ID = 'f4000000-f400-f400-f400-f40000000020';
const TASK_E21_ID = 'f5000000-f500-f500-f500-f50000000021';
const TASK_E22_ID = 'f6000000-f600-f600-f600-f60000000022';
const TASK_E23_ID = 'f7000000-f700-f700-f700-f70000000023';
const TASK_E24_ID = 'f8000000-f800-f800-f800-f80000000024';
const TASK_E25_ID = 'f9000000-f900-f900-f900-f90000000025';

async function seedTasks() {
  console.log('🎯 Task Seeding Started...');
  console.log('');

  // Create a direct connection using TypeORM
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // Get required references
    console.log('🔍 Fetching references...');

    // Get area IDs
    const areas = await queryRunner.query(`SELECT id FROM areas LIMIT 3`);
    if (areas.length === 0) {
      throw new Error('No areas found. Please run main seeder first.');
    }
    const [area1, area2, area3] = areas.map((a: any) => a.id);

    // Get user IDs (creator - korlap or fallback)
    let creator = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'korlap' LIMIT 1`,
    );
    if (creator.length === 0) {
      creator = await queryRunner.query(`SELECT id FROM users WHERE role = 'admin_system' LIMIT 1`);
    }
    if (creator.length === 0) {
      creator = await queryRunner.query(`SELECT id FROM users WHERE role = 'superadmin' LIMIT 1`);
    }
    if (creator.length === 0) {
      throw new Error('No users found to create tasks. Please run seeder first.');
    }
    const creatorId = creator[0].id;
    console.log('  ✓ Found task creator');

    const workers = await queryRunner.query(`SELECT id FROM users WHERE role = 'satgas' LIMIT 3`);
    if (workers.length === 0) {
      throw new Error('No satgas workers found. Please run seeder first.');
    }
    const [satgas1Id, satgas2Id, satgas3Id] = workers.map((w: any) => w.id);

    // Get linmas users
    const linmasUsers = await queryRunner.query(`SELECT id FROM users WHERE role = 'linmas' LIMIT 2`);
    const linmas1Id = linmasUsers.length > 0 ? linmasUsers[0].id : null;
    const linmas2Id = linmasUsers.length > 1 ? linmasUsers[1].id : null;

    // Get korlap user
    const korlapUsers = await queryRunner.query(`SELECT id FROM users WHERE role = 'korlap' LIMIT 1`);
    const korlapId = korlapUsers.length > 0 ? korlapUsers[0].id : null;

    // Get kepala rayon for task creation
    const kepalaRayonUsers = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'kepala_rayon' LIMIT 1`,
    );
    const kepalaRayonId = kepalaRayonUsers.length > 0 ? kepalaRayonUsers[0].id : null;

    console.log('  ✓ Found required references');

    // Clear existing tasks (cascade to task_tags)
    console.log('🗑️  Clearing existing tasks...');
    await queryRunner.query(`DELETE FROM task_tags`);
    await queryRunner.query(`DELETE FROM tasks`);
    console.log('  ✓ Cleared tasks and task_tags tables');

    // ==========================================
    // Seed Tasks with 4 Valid Statuses
    // ==========================================
    console.log('🎯 Seeding Tasks...');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Task 1: PENDING - High Priority Watering
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        created_at, updated_at
      ) VALUES (
        '${TASK_1_ID}',
        'Penyiraman Taman Pagi',
        'Menyiram seluruh area taman pada pagi hari. Fokus pada tanaman baru yang memerlukan perhatian ekstra.',
        'pending',
        'high',
        $1,
        $2,
        NULL,
        $3,
        NOW(),
        NOW()
      )
    `,
      [tomorrow.toISOString(), area1, creatorId],
    );

    // Task 2: ASSIGNED - Medium Priority Planting
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, created_at, updated_at
      ) VALUES (
        '${TASK_2_ID}',
        'Penanaman Bunga Musiman',
        'Menanam bunga musiman di area taman. Total 50 pot bunga.',
        'assigned',
        'medium',
        $1,
        $2,
        $3,
        $4,
        NOW() - INTERVAL '1 hour',
        NOW(),
        NOW()
      )
    `,
      [nextWeek.toISOString(), area2, satgas1Id, creatorId],
    );

    // Task 3: ASSIGNED - Urgent Pruning (previously accepted)
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, created_at, updated_at
      ) VALUES (
        '${TASK_3_ID}',
        'Pemangkasan Pohon Tinggi',
        'Memangkas dahan pohon yang menghalangi jalur pejalan kaki.',
        'assigned',
        'urgent',
        $1,
        $2,
        $3,
        $4,
        NOW() - INTERVAL '2 hours',
        NOW(),
        NOW()
      )
    `,
      [tomorrow.toISOString(), area3, satgas2Id, creatorId],
    );

    // Task 4: IN_PROGRESS - Cleaning
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, started_at, created_at, updated_at
      ) VALUES (
        '${TASK_4_ID}',
        'Pembersihan Area Playground',
        'Membersihkan area playground dari sampah dan dedaunan.',
        'in_progress',
        'medium',
        $1,
        $2,
        $3,
        $4,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '30 minutes',
        NOW(),
        NOW()
      )
    `,
      [now.toISOString(), area1, satgas3Id, creatorId],
    );

    // Task 5: COMPLETED - Watering Task
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, started_at, completed_at,
        completion_notes, completion_photo_urls,
        created_at, updated_at
      ) VALUES (
        '${TASK_5_ID}',
        'Penyiraman Taman Sore',
        'Menyiram taman pada sore hari',
        'completed',
        'low',
        $1,
        $2,
        $3,
        $4,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '2 hours',
        'Penyiraman selesai. Semua tanaman sudah disiram dengan baik.',
        ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/completion-photo-sample.jpg'],
        NOW(),
        NOW()
      )
    `,
      [yesterday.toISOString(), area2, satgas1Id, creatorId],
    );

    // Task 6: IN_PROGRESS - Another task (previously declined, now in progress)
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, started_at, created_at, updated_at
      ) VALUES (
        '${TASK_6_ID}',
        'Pemangkasan Semak Belukar',
        'Memangkas semak belukar di area belakang taman',
        'in_progress',
        'low',
        $1,
        $2,
        $3,
        $4,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '1 hour',
        NOW(),
        NOW()
      )
    `,
      [nextWeek.toISOString(), area3, satgas2Id, creatorId],
    );

    // Task 7: PENDING - Another High Priority
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        created_at, updated_at
      ) VALUES (
        '${TASK_7_ID}',
        'Pembersihan Jalur Jogging',
        'Membersihkan jalur jogging dari dedaunan dan sampah',
        'pending',
        'high',
        $1,
        $2,
        NULL,
        $3,
        NOW(),
        NOW()
      )
    `,
      [tomorrow.toISOString(), area1, creatorId],
    );

    // Task 8: ASSIGNED - Low Priority
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, created_at, updated_at
      ) VALUES (
        '${TASK_8_ID}',
        'Perawatan Rumput Taman',
        'Memeriksa dan merawat kondisi rumput di area taman',
        'assigned',
        'low',
        $1,
        $2,
        $3,
        $4,
        NOW() - INTERVAL '30 minutes',
        NOW(),
        NOW()
      )
    `,
      [nextWeek.toISOString(), area2, satgas3Id, creatorId],
    );

    console.log('  ✓ Created 8 satgas area-scoped tasks with 4 statuses:');
    console.log('    - 2 PENDING tasks');
    console.log('    - 3 ASSIGNED tasks');
    console.log('    - 2 IN_PROGRESS tasks');
    console.log('    - 1 COMPLETED task');

    // ==========================================
    // Seed Linmas Tasks (Security/Patrol)
    // ==========================================
    if (linmas1Id && linmas2Id && korlapId) {
      console.log('');
      console.log('🛡️  Seeding Linmas Tasks...');

      const dayAfterTomorrow = new Date(now);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      // Linmas Task 1: PENDING - Security patrol
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          created_at, updated_at
        ) VALUES (
          '${LINMAS_TASK_1_ID}',
          'Patroli Keamanan Malam',
          'Patroli area taman dari pukul 20:00-22:00. Cek kondisi lampu taman dan area parkir.',
          'pending',
          'high',
          $1,
          $2,
          NULL,
          $3,
          NOW(),
          NOW()
        )
      `,
        [dayAfterTomorrow.toISOString(), area1, korlapId],
      );

      // Linmas Task 2: ASSIGNED - Facility check
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          assigned_at, created_at, updated_at
        ) VALUES (
          '${LINMAS_TASK_2_ID}',
          'Pengecekan Fasilitas Taman',
          'Cek kondisi lampu, bangku, pagar, dan fasilitas umum lainnya.',
          'assigned',
          'medium',
          $1,
          $2,
          $3,
          $4,
          NOW() - INTERVAL '1 day',
          NOW(),
          NOW()
        )
      `,
        [tomorrow.toISOString(), area1, linmas1Id, korlapId],
      );

      // Linmas Task 3: IN_PROGRESS - Event security
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          assigned_at, started_at, created_at, updated_at
        ) VALUES (
          '${LINMAS_TASK_3_ID}',
          'Pengawasan Event Weekend',
          'Jaga keamanan selama event komunitas. Atur lalu lintas pengunjung.',
          'in_progress',
          'urgent',
          $1,
          $2,
          $3,
          $4,
          NOW() - INTERVAL '2 hours',
          NOW() - INTERVAL '1 hour',
          NOW(),
          NOW()
        )
      `,
        [now.toISOString(), area2, linmas2Id, korlapId],
      );

      // Linmas Task 4: COMPLETED - Incident report
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          assigned_at, started_at, completed_at,
          completion_notes, completion_photo_urls,
          created_at, updated_at
        ) VALUES (
          '${LINMAS_TASK_4_ID}',
          'Laporan Insiden PKL',
          'Dokumentasi dan pelaporan PKL ilegal di area taman',
          'completed',
          'high',
          $1,
          $2,
          $3,
          $4,
          NOW() - INTERVAL '2 days',
          NOW() - INTERVAL '1 day',
          NOW() - INTERVAL '12 hours',
          'Laporan insiden PKL selesai. Sudah dikoordinasikan dengan satpol PP.',
          ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/linmas-incident-report.jpg'],
          NOW(),
          NOW()
        )
      `,
        [yesterday.toISOString(), area3, linmas1Id, korlapId],
      );

      console.log('  ✓ Created 4 linmas tasks (security/patrol)');
    } else {
      console.log('  ⚠ Linmas users or korlap not found, skipping linmas tasks');
    }

    // ==========================================
    // Seed Korlap Tasks (Coordination)
    // ==========================================
    if (korlapId && kepalaRayonId) {
      console.log('');
      console.log('📋 Seeding Korlap Tasks...');

      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Korlap Task 1: ASSIGNED - Weekly coordination
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          assigned_at, created_at, updated_at
        ) VALUES (
          '${KORLAP_TASK_1_ID}',
          'Koordinasi Tim Mingguan',
          'Meeting koordinasi dengan satgas dan linmas. Review progress minggu ini.',
          'assigned',
          'medium',
          $1,
          $2,
          $3,
          $4,
          NOW() - INTERVAL '1 day',
          NOW(),
          NOW()
        )
      `,
        [threeDaysFromNow.toISOString(), area1, korlapId, kepalaRayonId],
      );

      // Korlap Task 2: IN_PROGRESS - Equipment check (rayon-scoped)
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          assigned_at, started_at, created_at, updated_at
        ) VALUES (
          '${KORLAP_TASK_2_ID}',
          'Pengecekan Kendaraan Operasional',
          'Cek kondisi kendaraan dan perlengkapan operasional',
          'in_progress',
          'medium',
          $1,
          NULL,
          $2,
          $3,
          NOW() - INTERVAL '3 hours',
          NOW() - INTERVAL '2 hours',
          NOW(),
          NOW()
        )
      `,
        [now.toISOString(), korlapId, kepalaRayonId],
      );

      // Korlap Task 3: COMPLETED - Supervision task
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description, status, priority, deadline,
          area_id, assigned_to, created_by,
          assigned_at, started_at, completed_at,
          completion_notes, completion_photo_urls,
          created_at, updated_at
        ) VALUES (
          '${KORLAP_TASK_3_ID}',
          'Supervisi Penanaman Pohon',
          'Supervisi kegiatan penanaman 50 pohon di area taman',
          'completed',
          'high',
          $1,
          $2,
          $3,
          $4,
          NOW() - INTERVAL '3 days',
          NOW() - INTERVAL '2 days',
          NOW() - INTERVAL '1 day',
          'Supervisi selesai. Penanaman 50 pohon berhasil dilakukan dengan baik.',
          ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/korlap-supervision.jpg'],
          NOW(),
          NOW()
        )
      `,
        [yesterday.toISOString(), area2, korlapId, kepalaRayonId],
      );

      console.log('  ✓ Created 3 korlap tasks (coordination/supervision)');
    } else {
      console.log('  ⚠ Korlap or kepala rayon not found, skipping korlap tasks');
    }

    // ==========================================
    // Seed Rayon-Scoped Tasks (Phase 2C)
    // ==========================================
    console.log('');
    console.log('🌐 Seeding Rayon-Scoped Tasks...');

    // Get kepala rayon user
    const kepalaRayonResult = await queryRunner.query(`
      SELECT id FROM users WHERE role = 'kepala_rayon' LIMIT 1
    `);

    // Get rayon
    const rayonResult = await queryRunner.query(`
      SELECT id FROM rayons WHERE name = 'Rayon Selatan' LIMIT 1
    `);

    if (kepalaRayonResult.length > 0 && rayonResult.length > 0) {
      const kepalaRayonId = kepalaRayonResult[0].id;
      const rayonId = rayonResult[0].id;

      const RAYON_TASK_1_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const RAYON_TASK_2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

      // Rayon-scoped tasks: rayon_id is set, area_id is NULL
      await queryRunner.query(
        `
        INSERT INTO tasks (
          id, title, description,
          rayon_id, area_id,
          created_by, priority, status,
          deadline, created_at, updated_at
        ) VALUES
          (
            '${RAYON_TASK_1_ID}',
            'Audit semua area di Rayon Selatan',
            'Periksa kondisi fasilitas di seluruh area dalam rayon',
            $1,
            NULL,
            $2,
            'high',
            'pending',
            $3,
            NOW(),
            NOW()
          ),
          (
            '${RAYON_TASK_2_ID}',
            'Koordinasi tim rayon untuk event weekend',
            'Persiapan event di semua taman dalam rayon',
            $1,
            NULL,
            $2,
            'medium',
            'pending',
            $4,
            NOW(),
            NOW()
          )
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          rayonId,
          kepalaRayonId,
          new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
        ],
      );

      console.log('  ✓ Created 2 rayon-scoped tasks (rayon_id set, area_id = NULL)');

      // Kepala Rayon-assigned tasks (created by top_management)
      const topMgmtResult = await queryRunner.query(
        `SELECT id FROM users WHERE role = 'top_management' LIMIT 1`,
      );
      if (topMgmtResult.length > 0) {
        const topMgmtId = topMgmtResult[0].id;
        const KEPALA_TASK_1_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
        const KEPALA_TASK_2_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

        await queryRunner.query(
          `
          INSERT INTO tasks (
            id, title, description, status, priority, deadline,
            rayon_id, area_id, assigned_to, created_by,
            assigned_at, created_at, updated_at
          ) VALUES
            (
              '${KEPALA_TASK_1_ID}',
              'Laporan Bulanan Rayon Selatan',
              'Compile laporan bulanan dari semua area di rayon',
              'assigned', 'high', $3,
              $1, NULL, $2, $4,
              NOW() - INTERVAL '1 day', NOW(), NOW()
            ),
            (
              '${KEPALA_TASK_2_ID}',
              'Review Kinerja Korlap',
              'Evaluasi kinerja semua korlap di rayon untuk kuartal ini',
              'in_progress', 'medium', $3,
              $1, NULL, $2, $4,
              NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW()
            )
          ON CONFLICT (id) DO NOTHING;
          `,
          [
            rayonId,
            kepalaRayonId,
            new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            topMgmtId,
          ],
        );
        console.log('  ✓ Created 2 kepala_rayon-assigned tasks (created by top_management)');
      }
    } else {
      console.log('  ⚠ Kepala Rayon or Rayon not found, skipping rayon-scoped tasks');
    }

    // ==========================================
    // Extended Tasks for Scroll/Filter Testing
    // ==========================================
    console.log('');
    console.log('📦 Seeding Extended Tasks for Scroll Testing...');

    // Get all available areas for variety
    const allAreas = await queryRunner.query(`SELECT id FROM areas LIMIT 5`);
    const areaIds = allAreas.map((a: any) => a.id);
    const getArea = (idx: number) => areaIds[idx % areaIds.length];

    // Date helpers: tasks spread over 60 days (past and future)
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

    // 25 additional tasks for scroll testing
    // area IDs are interpolated directly (safe: UUIDs from our own DB query)
    const a1 = areaIds[0];
    const a2 = areaIds[1] ?? areaIds[0];
    const a3 = areaIds[2] ?? areaIds[0];

    await queryRunner.query(`
      INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, created_at, updated_at)
      VALUES
        -- SATGAS additional tasks (varied statuses, spread over past weeks)
        ('${TASK_E1_ID}',  'Pemangkasan Pohon Minggu Lalu', 'Pemangkasan pohon di jalur pedestrian selesai dilakukan', 'completed',   'medium', $1, '${a1}', $8,  $12, $1, $1),
        ('${TASK_E2_ID}',  'Pengecatan Pagar Taman',        'Pengecatan pagar area bermain anak-anak',                'completed',   'low',    $2, '${a1}', $9,  $12, $2, $2),
        ('${TASK_E3_ID}',  'Pembersihan Kolam',             'Pembersihan dan pergantian air kolam hias',              'completed',   'high',   $3, '${a1}', $8,  $12, $3, $3),
        ('${TASK_E4_ID}',  'Perbaikan Jalan Setapak',       'Perbaikan jalan setapak yang rusak di area jogging',    'completed',   'urgent', $4, '${a2}', $9,  $13, $4, $4),
        ('${TASK_E5_ID}',  'Pemasangan Papan Informasi',    'Pemasangan papan informasi baru di pintu masuk',         'in_progress', 'medium', $5, '${a2}', $9,  $12, $5, $5),
        ('${TASK_E6_ID}',  'Penyemprotan Hama',             'Penyemprotan hama pada semua tanaman',                  'in_progress', 'high',   $6, '${a1}', $8,  $12, $6, $6),
        ('${TASK_E7_ID}',  'Inventarisasi Peralatan',       'Cek dan catat seluruh peralatan taman',                 'assigned',    'low',    $7, '${a1}', $9,  $12, $7, $7),
        ('${TASK_E8_ID}',  'Pemupukan Tanaman Hias',        'Pemupukan rutin seluruh tanaman hias di taman',         'assigned',    'medium', $7, '${a2}', $10, $12, $7, $7),
        ('${TASK_E9_ID}',  'Perbaikan Saluran Air',         'Perbaikan saluran drainase yang tersumbat',             'pending',     'urgent', $7, '${a1}', NULL,$12, $7, $7),
        ('${TASK_E10_ID}', 'Pemasangan Tanaman Merambat',   'Pemasangan tanaman merambat di pagar depan',            'pending',     'low',    $7, '${a2}', NULL,$13, $7, $7),
        -- LINMAS additional tasks (past 2 weeks)
        ('${TASK_E11_ID}', 'Patroli Subuh',                 'Patroli keamanan pukul 04:00-06:00',                    'completed',   'high',   $1, '${a1}', $10, $12, $1, $1),
        ('${TASK_E12_ID}', 'Pengamanan Car Free Day',       'Pengamanan area taman saat car free day',               'completed',   'urgent', $2, '${a1}', $11, $12, $2, $2),
        ('${TASK_E13_ID}', 'Laporan Keamanan Harian',       'Dokumentasi laporan keamanan harian taman',             'in_progress', 'medium', $6, '${a2}', $10, $12, $6, $6),
        ('${TASK_E14_ID}', 'Patroli Sore Hari',             'Patroli area taman pukul 17:00-19:00',                  'assigned',    'high',   $7, '${a1}', $11, $12, $7, $7),
        ('${TASK_E15_ID}', 'Penertiban Pedagang Liar',      'Koordinasi dengan satpol PP untuk penertiban PKL',      'pending',     'urgent', $7, '${a3}', NULL,$12, $7, $7),
        -- KORLAP additional tasks
        ('${TASK_E16_ID}', 'Evaluasi Kinerja Tim',          'Evaluasi dan penilaian kinerja seluruh tim lapangan',   'completed',   'high',   $3, '${a1}', $12, $13, $3, $3),
        ('${TASK_E17_ID}', 'Briefing Prosedur Keselamatan', 'Briefing SOP keselamatan kerja untuk satgas dan linmas','in_progress', 'medium', $6, '${a2}', $12, $13, $6, $6),
        ('${TASK_E18_ID}', 'Koordinasi Event Bulanan',      'Persiapan dan koordinasi event bulanan rayon',          'assigned',    'high',   $7, '${a1}', $12, $13, $7, $7),
        ('${TASK_E19_ID}', 'Audit Penggunaan Anggaran',     'Review penggunaan anggaran operasional bulan ini',      'pending',     'low',    $7, '${a3}', NULL,$13, $7, $7),
        -- Extra satgas for week 3-4 date range testing
        ('${TASK_E20_ID}', 'Perawatan Taman Tema',          'Perawatan khusus taman tema mini di area pusat',        'pending',     'medium', $7, '${a1}', NULL,$12, $7, $7),
        ('${TASK_E21_ID}', 'Pengadaan Benih Tanaman',       'Koordinasi pengadaan benih tanaman untuk bulan depan',  'assigned',    'low',    $7, '${a2}', $9,  $13, $7, $7),
        ('${TASK_E22_ID}', 'Renovasi Tempat Duduk',         'Pengecatan dan perbaikan tempat duduk taman',           'in_progress', 'medium', $7, '${a1}', $8,  $12, $7, $7),
        ('${TASK_E23_ID}', 'Dokumentasi Kondisi Taman',     'Foto dan dokumentasi kondisi taman untuk laporan',      'completed',   'low',    $1, '${a3}', $9,  $12, $1, $1),
        ('${TASK_E24_ID}', 'Pembersihan Pasca Event',       'Pembersihan area taman setelah event weekend',          'completed',   'high',   $2, '${a1}', $8,  $13, $2, $2),
        ('${TASK_E25_ID}', 'Pengecatan Mural Taman',        'Pengecatan mural seni pada dinding taman',              'pending',     'medium', $7, '${a2}', NULL,$12, $7, $7)
      ON CONFLICT (id) DO NOTHING;
    `, [
      // $1-$7: date params
      daysAgo(30),    // $1
      daysAgo(21),    // $2
      daysAgo(14),    // $3
      daysAgo(7),     // $4
      daysAgo(3),     // $5
      daysAgo(1),     // $6
      daysFromNow(7), // $7
      // $8-$13: user IDs (no satgas3 - not a valid task creator)
      satgas1Id,                     // $8
      satgas2Id,                     // $9
      linmas1Id || satgas1Id,        // $10
      linmas2Id || satgas1Id,        // $11
      korlapId || creatorId,         // $12
      kepalaRayonId || creatorId,    // $13
    ]);

    console.log('  ✓ Created 25 extended tasks for scroll/filter testing');

    // ==========================================
    // Phase 9: Update tasks to cover all 8 statuses
    // (accepted, declined, verified, revision_needed)
    // ==========================================
    console.log('');
    console.log('🔄 Updating tasks with Phase 9 statuses...');

    const verifierId = korlapId || creatorId;

    // Task 3: ASSIGNED → ACCEPTED (assignee accepted the task)
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'accepted',
        accepted_at = NOW() - INTERVAL '1 hour'
      WHERE id = '${TASK_3_ID}'
    `);

    // Task 6: IN_PROGRESS → DECLINED (assignee declined with reason)
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'declined',
        declined_at = NOW() - INTERVAL '2 hours',
        decline_reason = 'Alat pemangkas tidak tersedia saat ini, perlu diservis terlebih dahulu'
      WHERE id = '${TASK_6_ID}'
    `);

    // Task 5: COMPLETED → VERIFIED (supervisor verified completion)
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'verified',
        verified_by = $1,
        verified_at = NOW() - INTERVAL '1 hour'
      WHERE id = '${TASK_5_ID}'
    `, [verifierId]);

    // Task 7: PENDING → REVISION_NEEDED (completed then revision requested)
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'revision_needed',
        assigned_to = $1,
        assigned_at = NOW() - INTERVAL '3 days',
        accepted_at = NOW() - INTERVAL '2 days',
        started_at = NOW() - INTERVAL '1 day',
        completed_at = NOW() - INTERVAL '6 hours',
        completion_notes = 'Jalur jogging sudah dibersihkan dari dedaunan',
        completion_photo_urls = ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/revision-sample.jpg'],
        revision_reason = 'Masih ada sampah di area tikungan, perlu dibersihkan ulang'
      WHERE id = '${TASK_7_ID}'
    `, [satgas1Id]);

    // Extended tasks: mix in more new statuses
    // E7, E8: ASSIGNED → ACCEPTED
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'accepted',
        accepted_at = NOW() - INTERVAL '2 hours'
      WHERE id IN ('${TASK_E7_ID}', '${TASK_E8_ID}')
    `);

    // E1, E2, E11, E16: COMPLETED → VERIFIED
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'verified',
        verified_by = $1,
        verified_at = NOW() - INTERVAL '12 hours'
      WHERE id IN ('${TASK_E1_ID}', '${TASK_E2_ID}', '${TASK_E11_ID}', '${TASK_E16_ID}')
    `, [verifierId]);

    // E15: PENDING → DECLINED
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'declined',
        assigned_to = $1,
        assigned_at = NOW() - INTERVAL '2 days',
        declined_at = NOW() - INTERVAL '1 day',
        decline_reason = 'Jadwal bentrok dengan tugas lain yang lebih mendesak'
      WHERE id = '${TASK_E15_ID}'
    `, [linmas1Id || satgas1Id]);

    // E18: ASSIGNED → REVISION_NEEDED
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'revision_needed',
        accepted_at = NOW() - INTERVAL '2 days',
        started_at = NOW() - INTERVAL '1 day',
        completed_at = NOW() - INTERVAL '3 hours',
        completion_notes = 'Koordinasi event sudah dilakukan',
        completion_photo_urls = ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/revision-event.jpg'],
        revision_reason = 'Detail jadwal event belum lengkap, perlu tambahkan timeline per area'
      WHERE id = '${TASK_E18_ID}'
    `);

    // Linmas Task 4: COMPLETED → VERIFIED
    await queryRunner.query(`
      UPDATE tasks SET
        status = 'verified',
        verified_by = $1,
        verified_at = NOW() - INTERVAL '10 hours'
      WHERE id = '${LINMAS_TASK_4_ID}'
    `, [verifierId]);

    console.log('  ✓ Updated tasks with all 8 Phase 9 statuses:');
    console.log('    - ACCEPTED: Task 3, E7, E8 (3 tasks)');
    console.log('    - DECLINED: Task 6, E15 (2 tasks)');
    console.log('    - VERIFIED: Task 5, Linmas 4, E1, E2, E11, E16 (6 tasks)');
    console.log('    - REVISION_NEEDED: Task 7, E18 (2 tasks)');

    console.log('');
    console.log('✅ Task seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 8 satgas area-scoped tasks');
    console.log('   - 4 linmas tasks (security/patrol)');
    console.log('   - 3 korlap tasks (coordination/supervision)');
    console.log('   - 2 rayon-scoped tasks (assigned to rayon, area_id = NULL)');
    console.log('   - 25 extended tasks (scroll/filter testing)');
    console.log('   Total: ~42 tasks');
    console.log('');
    console.log('📝 Test Users:');
    console.log('   - satgas1, satgas2, satgas3 (field workers)');
    console.log('   - linmas1, linmas2 (security officers)');
    console.log('   - korlap (field coordinator)');
    console.log('');
    console.log('🔍 Task Status Distribution (all 8 statuses):');
    console.log('   - PENDING: ~8 tasks');
    console.log('   - ASSIGNED: ~5 tasks');
    console.log('   - ACCEPTED: 3 tasks');
    console.log('   - DECLINED: 2 tasks');
    console.log('   - IN_PROGRESS: ~6 tasks');
    console.log('   - COMPLETED: ~5 tasks');
    console.log('   - VERIFIED: 6 tasks');
    console.log('   - REVISION_NEEDED: 2 tasks');
  } catch (error) {
    console.error('❌ Error seeding tasks:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run the seeder
seedTasks()
  .then(() => {
    console.log('✨ Task seeding script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Task seeding script failed:', error);
    process.exit(1);
  });
