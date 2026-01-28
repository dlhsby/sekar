import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Task Seeder Script
 *
 * Seeds dummy tasks for testing worker task list view
 *
 * Usage: npm run seed:tasks
 */
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

    // Get activity type IDs (optional - Phase 2 feature)
    const activityTypes = await queryRunner.query(`SELECT id, code FROM activity_types WHERE is_active = TRUE LIMIT 5`);
    let wateringType = null;
    let plantingType = null;
    let pruningType = null;
    let cleaningType = null;

    if (activityTypes.length > 0) {
      wateringType = activityTypes.find((at: any) => at.code === 'WATERING')?.id || activityTypes[0].id;
      plantingType = activityTypes.find((at: any) => at.code === 'PLANTING')?.id || activityTypes[1]?.id || activityTypes[0].id;
      pruningType = activityTypes.find((at: any) => at.code === 'PRUNING')?.id || activityTypes[2]?.id || activityTypes[0].id;
      cleaningType = activityTypes.find((at: any) => at.code === 'CLEANING')?.id || activityTypes[3]?.id || activityTypes[0].id;
      console.log('  ✓ Found activity types');
    } else {
      console.log('  ⚠️  No activity types found (Phase 2 feature) - tasks will be created without activity types');
    }

    // Get user IDs (creator - fallback to supervisor or admin if no koordinator)
    let creator = await queryRunner.query(`SELECT id FROM users WHERE role = 'koordinator_lapangan' LIMIT 1`);
    if (creator.length === 0) {
      creator = await queryRunner.query(`SELECT id FROM users WHERE role = 'supervisor' LIMIT 1`);
    }
    if (creator.length === 0) {
      creator = await queryRunner.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    }
    if (creator.length === 0) {
      throw new Error('No users found to create tasks. Please run seeder first.');
    }
    const creatorId = creator[0].id;
    console.log('  ✓ Found task creator');

    const workers = await queryRunner.query(`SELECT id FROM users WHERE role = 'worker' LIMIT 3`);
    if (workers.length === 0) {
      throw new Error('No workers found. Please run seeder first.');
    }
    const [worker1Id, worker2Id, worker3Id] = workers.map((w: any) => w.id);

    console.log('  ✓ Found required references');

    // Clear existing tasks
    console.log('🗑️  Clearing existing tasks...');
    await queryRunner.query(`DELETE FROM tasks`);
    console.log('  ✓ Cleared tasks table');

    // ==========================================
    // Seed Tasks with Various Statuses
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
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888801',
        'Penyiraman Taman Pagi',
        'Menyiram seluruh area taman pada pagi hari. Fokus pada tanaman baru yang memerlukan perhatian ekstra.',
        'pending',
        'high',
        $1,
        $2,
        $3,
        NULL,
        $4,
        NOW(),
        NOW()
      )
    `, [tomorrow.toISOString(), area1, wateringType, creatorId]);

    // Task 2: ASSIGNED - Medium Priority Planting
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        assigned_at, created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888802',
        'Penanaman Bunga Musiman',
        'Menanam bunga musiman di area taman. Total 50 pot bunga.',
        'assigned',
        'medium',
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() - INTERVAL '1 hour',
        NOW(),
        NOW()
      )
    `, [nextWeek.toISOString(), area2, plantingType, worker1Id, creatorId]);

    // Task 3: ACCEPTED - Urgent Pruning
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        assigned_at, accepted_at, created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888803',
        'Pemangkasan Pohon Tinggi',
        'Memangkas dahan pohon yang menghalangi jalur pejalan kaki.',
        'accepted',
        'urgent',
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour',
        NOW(),
        NOW()
      )
    `, [tomorrow.toISOString(), area3, pruningType, worker2Id, creatorId]);

    // Task 4: IN_PROGRESS - Cleaning
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        assigned_at, accepted_at, started_at, created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888804',
        'Pembersihan Area Playground',
        'Membersihkan area playground dari sampah dan dedaunan.',
        'in_progress',
        'medium',
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '30 minutes',
        NOW(),
        NOW()
      )
    `, [now.toISOString(), area1, cleaningType, worker3Id, creatorId]);

    // Task 5: COMPLETED - Watering Task
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        assigned_at, accepted_at, started_at, completed_at,
        completion_notes, completion_gps_lat, completion_gps_lng,
        created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888805',
        'Penyiraman Taman Sore',
        'Menyiram taman pada sore hari',
        'completed',
        'low',
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() - INTERVAL '5 hours',
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '3 hours',
        NOW() - INTERVAL '2 hours',
        'Penyiraman selesai. Semua tanaman sudah disiram dengan baik.',
        -7.2905,
        112.7398,
        NOW(),
        NOW()
      )
    `, [yesterday.toISOString(), area2, wateringType, worker1Id, creatorId]);

    // Task 6: DECLINED - Pruning Task
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        assigned_at, declined_at, decline_reason,
        created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888806',
        'Pemangkasan Semak Belukar',
        'Memangkas semak belukar di area belakang taman',
        'declined',
        'low',
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '3 hours',
        'Peralatan pemangkasan tidak tersedia',
        NOW(),
        NOW()
      )
    `, [nextWeek.toISOString(), area3, pruningType, worker2Id, creatorId]);

    // Task 7: PENDING - Another High Priority
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888807',
        'Pembersihan Jalur Jogging',
        'Membersihkan jalur jogging dari dedaunan dan sampah',
        'pending',
        'high',
        $1,
        $2,
        $3,
        NULL,
        $4,
        NOW(),
        NOW()
      )
    `, [tomorrow.toISOString(), area1, cleaningType, creatorId]);

    // Task 8: ASSIGNED - Low Priority
    await queryRunner.query(`
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, activity_type_id, assigned_to, created_by,
        assigned_at, created_at, updated_at
      ) VALUES (
        '88888888-8888-8888-8888-888888888808',
        'Perawatan Rumput Taman',
        'Memeriksa dan merawat kondisi rumput di area taman',
        'assigned',
        'low',
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() - INTERVAL '30 minutes',
        NOW(),
        NOW()
      )
    `, [nextWeek.toISOString(), area2, wateringType, worker3Id, creatorId]);

    console.log('  ✓ Created 8 tasks with various statuses:');
    console.log('    - 2 PENDING tasks');
    console.log('    - 2 ASSIGNED tasks');
    console.log('    - 1 ACCEPTED task');
    console.log('    - 1 IN_PROGRESS task');
    console.log('    - 1 COMPLETED task');
    console.log('    - 1 DECLINED task');

    console.log('');
    console.log('✅ Task seeding completed successfully!');
    console.log('');
    console.log('📝 Test Users:');
    console.log('   - worker1 / worker123  (has ASSIGNED, COMPLETED tasks)');
    console.log('   - worker2 / worker123  (has ACCEPTED, DECLINED tasks)');
    console.log('   - worker3 / worker123  (has IN_PROGRESS, ASSIGNED tasks)');
    console.log('');
    console.log('🔍 Task Statuses:');
    console.log('   - PENDING: Tasks not yet assigned');
    console.log('   - ASSIGNED: Tasks assigned but not accepted');
    console.log('   - ACCEPTED: Tasks accepted by worker');
    console.log('   - IN_PROGRESS: Tasks currently being worked on');
    console.log('   - COMPLETED: Finished tasks');
    console.log('   - DECLINED: Tasks rejected by worker');

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
