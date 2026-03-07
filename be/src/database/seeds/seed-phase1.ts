import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Phase 1 Seed Script
 *
 * Seeds MVP base data using direct DataSource (no NestJS DI — 10x faster).
 * This is DESTRUCTIVE — it wipes all tables first.
 *
 * Data seeded:
 *   - 6 users  (admin, korlap1/2, satgas1/2/3)
 *   - 4 area types
 *   - 3 areas  (Taman Bungkul, Jalan Raya Darmo, Taman Harmoni)
 *   - 5 shifts (2 completed for satgas1 + satgas2 yesterday; 1 completed for satgas3;
 *               1 active for satgas1; 1 active for satgas2 started 4h ago)
 *   - 2 basic activities (skipped if activity_types don't exist yet)
 *   - 15 location logs for satgas1 active shift (last log 2 min ago  → 'active'  status)
 *   - 15 location logs for satgas2 active shift (last log 35 min ago → 'inactive' status)
 *
 * Run: npm run db:seed:phase1
 * Prod: npm run db:seed:phase1:prod
 */

// Pre-computed bcrypt hash for "password123" with 10 salt rounds
const PASSWORD_HASH = '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

async function seedPhase1() {
  console.log('🌱 Phase 1 Seeding Started...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ============================================================
    // CLEAR DATABASE (reverse FK order)
    // ============================================================
    console.log('\n🗑️  Clearing existing data...');

    const tablesToClear = [
      'user_tracking_status',
      'monitoring_configs',
      'notification_tokens',
      'notifications',
      'task_tags',
      'overtimes',
      'schedules',
      'special_day_overrides',
      'area_staff_requirements',
      'tasks',
      'location_logs',
      'activities',
      'shifts',
      'shift_definitions',
      'areas',
      'area_types',
      'activity_types',
      'rayons',
      'users',
    ];

    // Use TRUNCATE CASCADE for reliable clearing regardless of FK order
    // Split into existing vs optional tables to handle pre-migration states
    const existingTables: string[] = [];
    for (const table of tablesToClear) {
      try {
        await queryRunner.query(`SELECT 1 FROM "${table}" LIMIT 0`);
        existingTables.push(table);
      } catch {
        console.log(`  ⚠️  Skipped ${table} (table does not exist yet)`);
      }
    }
    if (existingTables.length > 0) {
      await queryRunner.query(
        `TRUNCATE TABLE ${existingTables.map((t) => `"${t}"`).join(', ')} CASCADE`,
      );
      console.log(`  ✓ Truncated ${existingTables.length} tables`);
    }

    // ============================================================
    // USERS (6)
    // ============================================================
    console.log('\n👥 Seeding users...');

    await queryRunner.query(`
      INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES
        ('admin',   '${PASSWORD_HASH}', 'System Administrator', 'superadmin', TRUE),
        ('korlap1', '${PASSWORD_HASH}', 'Korlap Satu',          'korlap',     TRUE),
        ('korlap2', '${PASSWORD_HASH}', 'Korlap Dua',           'korlap',     TRUE),
        ('satgas1', '${PASSWORD_HASH}', 'Satgas Satu',          'satgas',     TRUE),
        ('satgas2', '${PASSWORD_HASH}', 'Satgas Dua',           'satgas',     TRUE),
        ('satgas3', '${PASSWORD_HASH}', 'Satgas Tiga',          'satgas',     TRUE)
    `);
    console.log('  ✓ Created 6 users (admin, korlap1/2, satgas1/2/3)');

    // ============================================================
    // AREA TYPES (4)
    // ============================================================
    console.log('\n🏷️  Seeding area types...');

    await queryRunner.query(`
      INSERT INTO area_types (code, name, description) VALUES
        ('park',        'Taman',      'Taman kota dan ruang terbuka hijau publik'),
        ('pedestrian',  'Trotoar',    'Jalur pejalan kaki di sepanjang jalan raya'),
        ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan'),
        ('street',      'Jalanan',    'Jalanan umum yang memerlukan pemeliharaan kebersihan')
    `);
    console.log('  ✓ Created 4 area types');

    // ============================================================
    // AREAS (3)
    // ============================================================
    console.log('\n📍 Seeding areas...');

    await queryRunner.query(`
      INSERT INTO areas (name, area_type_id, gps_lat, gps_lng, radius_meters, address, is_active, boundary_polygon, coverage_area)
      SELECT 'Taman Bungkul', at.id,
        -7.2905, 112.7398, 150,
        'Jl. Taman Bungkul, Darmo, Surabaya', TRUE,
        '{"type":"Polygon","coordinates":[[[112.7388,-7.2895],[112.7408,-7.2895],[112.7408,-7.2915],[112.7388,-7.2915],[112.7388,-7.2895]]]}'::jsonb,
        44000
      FROM area_types at WHERE at.code = 'park' LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO areas (name, area_type_id, gps_lat, gps_lng, radius_meters, address, is_active, boundary_polygon, coverage_area)
      SELECT 'Jalan Raya Darmo', at.id,
        -7.2844, 112.7915, 200,
        'Jl. Raya Darmo, Surabaya', TRUE,
        '{"type":"Polygon","coordinates":[[[112.7905,-7.2834],[112.7925,-7.2834],[112.7925,-7.2854],[112.7905,-7.2854],[112.7905,-7.2834]]]}'::jsonb,
        44000
      FROM area_types at WHERE at.code = 'pedestrian' LIMIT 1
    `);

    await queryRunner.query(`
      INSERT INTO areas (name, area_type_id, gps_lat, gps_lng, radius_meters, address, is_active, boundary_polygon, coverage_area)
      SELECT 'Taman Harmoni', at.id,
        -7.3037, 112.7375, 100,
        'Jl. Ketintang, Surabaya', TRUE,
        '{"type":"Polygon","coordinates":[[[112.7365,-7.3027],[112.7385,-7.3027],[112.7385,-7.3047],[112.7365,-7.3047],[112.7365,-7.3027]]]}'::jsonb,
        44000
      FROM area_types at WHERE at.code = 'park' LIMIT 1
    `);
    console.log('  ✓ Created 3 areas (Taman Bungkul, Jalan Raya Darmo, Taman Harmoni)');

    // ============================================================
    // SHIFTS (5: 3 completed historical + 2 active for monitoring)
    //   satgas1: completed yesterday + active (2h ago)  → 'active' status target
    //   satgas2: completed yesterday + active (4h ago)  → 'inactive' status target
    //   satgas3: completed 2 days ago (no active shift) → 'offline'
    // ============================================================
    console.log('\n⏰ Seeding shifts...');

    // satgas1 — completed shift yesterday
    await queryRunner.query(`
      INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
        clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng)
      SELECT u.id, a.id,
        NOW() - INTERVAL '1 day 8 hours', -7.2905, 112.7398,
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/08/clock-in/satgas1-abc123.jpg',
        NOW() - INTERVAL '1 day', -7.2906, 112.7399
      FROM users u, areas a WHERE u.username = 'satgas1' AND a.name = 'Taman Bungkul'
    `);

    // satgas1 — active shift (2 hours ago, no clock-out)
    await queryRunner.query(`
      INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
        clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng)
      SELECT u.id, a.id,
        NOW() - INTERVAL '2 hours', -7.2905, 112.7398,
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-in/satgas1-jkl012.jpg',
        NULL, NULL, NULL
      FROM users u, areas a WHERE u.username = 'satgas1' AND a.name = 'Taman Bungkul'
    `);

    // satgas2 — completed shift yesterday
    await queryRunner.query(`
      INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
        clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng)
      SELECT u.id, a.id,
        NOW() - INTERVAL '1 day 8 hours 30 minutes', -7.2844, 112.7915,
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/08/clock-in/satgas2-def456.jpg',
        NOW() - INTERVAL '1 day 30 minutes', -7.2845, 112.7916
      FROM users u, areas a WHERE u.username = 'satgas2' AND a.name = 'Jalan Raya Darmo'
    `);

    // satgas2 — active shift (4 hours ago, no clock-out, no recent location ping → 'inactive')
    await queryRunner.query(`
      INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
        clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng)
      SELECT u.id, a.id,
        NOW() - INTERVAL '4 hours', -7.2844, 112.7915,
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/clock-in/satgas2-mno345.jpg',
        NULL, NULL, NULL
      FROM users u, areas a WHERE u.username = 'satgas2' AND a.name = 'Jalan Raya Darmo'
    `);

    // satgas3 — completed shift 2 days ago
    await queryRunner.query(`
      INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
        clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng)
      SELECT u.id, a.id,
        NOW() - INTERVAL '2 days 8 hours 15 minutes', -7.3037, 112.7375,
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/07/clock-in/satgas3-ghi789.jpg',
        NOW() - INTERVAL '2 days 30 minutes', -7.3038, 112.7376
      FROM users u, areas a WHERE u.username = 'satgas3' AND a.name = 'Taman Harmoni'
    `);

    // Set boundary flag on satgas1's first completed shift (for testing)
    await queryRunner.query(`
      UPDATE shifts SET clock_in_outside_boundary = TRUE, clock_out_outside_boundary = FALSE
      WHERE id = (
        SELECT s.id FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE u.username = 'satgas1' AND s.clock_out_time IS NOT NULL
        ORDER BY s.clock_in_time ASC LIMIT 1
      )
    `);
    console.log('  ✓ Created 5 shifts (satgas1×2 active/completed, satgas2×2 active/completed, satgas3×1 completed)');

    // ============================================================
    // BASIC ACTIVITIES (2) — skipped if activity_types not seeded yet
    // Phase 2 Section C replaces these with 50 comprehensive ones
    // ============================================================
    console.log('\n📝 Seeding basic activities (skipped if activity_types missing)...');

    const actTypes = await queryRunner.query(`
      SELECT id, code FROM activity_types WHERE code IN ('perawatan', 'perantingan') LIMIT 2
    `);

    if (actTypes.length >= 2) {
      await queryRunner.query(`
        INSERT INTO activities (user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng)
        SELECT u.id, s.id, s.area_id,
          (SELECT id FROM activity_types WHERE code = 'perawatan' LIMIT 1),
          'Completed cleaning main area of Taman Bungkul. All trash collected and disposed properly.',
          ARRAY['https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/activities/activity1-abc123.jpg'],
          -7.2905, 112.7398
        FROM users u JOIN shifts s ON s.user_id = u.id AND s.clock_out_time IS NULL
        WHERE u.username = 'satgas1' LIMIT 1
      `);

      await queryRunner.query(`
        INSERT INTO activities (user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng)
        SELECT u.id, s.id, s.area_id,
          (SELECT id FROM activity_types WHERE code = 'perantingan' LIMIT 1),
          'Pruned overgrown branches near playground area.',
          ARRAY['https://sekar-media.s3.ap-southeast-1.amazonaws.com/sekar-media/2026/01/09/activities/activity2-def456.jpg'],
          -7.2906, 112.7399
        FROM users u JOIN shifts s ON s.user_id = u.id AND s.clock_out_time IS NULL
        WHERE u.username = 'satgas1' LIMIT 1
      `);
      console.log('  ✓ Created 2 basic activities for satgas1');
    } else {
      console.log('  ⚠️  activity_types not found — activities skipped (Phase 2 will seed 50 comprehensive ones)');
    }

    // ============================================================
    // LOCATION LOGS
    //   satgas1 (active shift): 15 logs from NOW()-72min to NOW()-2min  → 'active'
    //   satgas2 (active shift): 15 logs from NOW()-105min to NOW()-35min → 'inactive'
    // ============================================================
    console.log('\n📍 Seeding location logs...');

    // satgas1: 15 logs, 5-min intervals, last log = NOW() - 2 min
    await queryRunner.query(`
      INSERT INTO location_logs (user_id, shift_id, gps_lat, gps_lng, accuracy_meters, battery_level, logged_at)
      SELECT
        u.id, s.id,
        -7.2905 + (sin(gs.n) * 0.0005),
        112.7398 + (cos(gs.n) * 0.0005),
        12 + (gs.n % 5),
        95 - (gs.n * 2),
        NOW() - INTERVAL '72 minutes' + (gs.n * INTERVAL '5 minutes')
      FROM users u
      JOIN shifts s ON s.user_id = u.id AND s.clock_out_time IS NULL
      CROSS JOIN generate_series(0, 14) AS gs(n)
      WHERE u.username = 'satgas1'
    `);
    console.log('  ✓ Created 15 location logs for satgas1 (last log 2 min ago → active)');

    // satgas2: 15 logs, 5-min intervals, last log = NOW() - 35 min
    await queryRunner.query(`
      INSERT INTO location_logs (user_id, shift_id, gps_lat, gps_lng, accuracy_meters, battery_level, logged_at)
      SELECT
        u.id, s.id,
        -7.2844 + (sin(gs.n * 0.5) * 0.0004),
        112.7915 + (cos(gs.n * 0.5) * 0.0004),
        10 + (gs.n % 7),
        80 - (gs.n * 2),
        NOW() - INTERVAL '105 minutes' + (gs.n * INTERVAL '5 minutes')
      FROM users u
      JOIN shifts s ON s.user_id = u.id AND s.clock_out_time IS NULL
      CROSS JOIN generate_series(0, 14) AS gs(n)
      WHERE u.username = 'satgas2'
    `);
    console.log('  ✓ Created 15 location logs for satgas2 (last log 35 min ago → inactive)');

    console.log('\n✅ Phase 1 Seeding Completed Successfully!');
    console.log('\nSummary:');
    console.log('  - 6 users (admin, korlap1/2, satgas1/2/3) — password: password123');
    console.log('  - 4 area types (park, pedestrian, mini_garden, street)');
    console.log('  - 3 areas (Taman Bungkul, Jalan Raya Darmo, Taman Harmoni)');
    console.log('  - 5 shifts (satgas1×2, satgas2×2 active+completed, satgas3×1 completed)');
    console.log('  - 2 basic activities (or skipped if activity_types not yet seeded)');
    console.log('  - 15 location logs for satgas1 (recent → active monitoring status)');
    console.log('  - 15 location logs for satgas2 (35 min old → inactive monitoring status)');
  } catch (error) {
    console.error('❌ Phase 1 seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedPhase1()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
