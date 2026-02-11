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
    const [worker1Id, worker2Id, worker3Id] = workers.map((w: any) => w.id);

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
      [nextWeek.toISOString(), area2, worker1Id, creatorId],
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
      [tomorrow.toISOString(), area3, worker2Id, creatorId],
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
      [now.toISOString(), area1, worker3Id, creatorId],
    );

    // Task 5: COMPLETED - Watering Task
    await queryRunner.query(
      `
      INSERT INTO tasks (
        id, title, description, status, priority, deadline,
        area_id, assigned_to, created_by,
        assigned_at, started_at, completed_at,
        completion_notes, completion_photo_url,
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
        'https://sekar-media-dev.s3.amazonaws.com/tasks/completion-photo-sample.jpg',
        NOW(),
        NOW()
      )
    `,
      [yesterday.toISOString(), area2, worker1Id, creatorId],
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
      [nextWeek.toISOString(), area3, worker2Id, creatorId],
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
      [nextWeek.toISOString(), area2, worker3Id, creatorId],
    );

    console.log('  ✓ Created 8 tasks with 4 statuses:');
    console.log('    - 2 PENDING tasks');
    console.log('    - 3 ASSIGNED tasks');
    console.log('    - 2 IN_PROGRESS tasks');
    console.log('    - 1 COMPLETED task');

    console.log('');
    console.log('✅ Task seeding completed successfully!');
    console.log('');
    console.log('📝 Test Users:');
    console.log('   - satgas1  (has ASSIGNED, COMPLETED tasks)');
    console.log('   - satgas2  (has ASSIGNED, IN_PROGRESS tasks)');
    console.log('   - satgas3  (has IN_PROGRESS, ASSIGNED tasks)');
    console.log('');
    console.log('🔍 Task Statuses (Phase 2C):');
    console.log('   - PENDING: Tasks not yet assigned');
    console.log('   - ASSIGNED: Tasks assigned to a worker');
    console.log('   - IN_PROGRESS: Tasks currently being worked on');
    console.log('   - COMPLETED: Finished tasks with photo evidence');
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
