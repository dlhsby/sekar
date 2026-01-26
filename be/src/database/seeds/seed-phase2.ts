import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Phase 2 Seed Script
 *
 * Seeds the Phase 2 database tables:
 * - Rayons (7 geographic sectors)
 * - Shift Definitions (3 fixed shifts)
 * - Activity Types (10 work activities)
 * - Special Day Overrides (4 initial holidays)
 * - Additional Users (7 users with new roles)
 * - Area Staff Requirements (14 requirements)
 * - Worker Schedules (4 assignments)
 *
 * Also updates existing data:
 * - Area Types: Set category (ACTIVE/PASSIVE)
 * - Areas: Assign to Rayons
 *
 * Usage: npx ts-node src/database/seeds/seed-phase2.ts
 */
async function seedPhase2() {
  console.log('🌱 Phase 2 Seeding Started...');
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
    // ==========================================
    // STEP 1: Seed Rayons
    // ==========================================
    console.log('📍 Seeding Rayons...');
    await queryRunner.query(`
      INSERT INTO rayons (id, name, code, description) VALUES
        ('11111111-1111-1111-1111-111111111101', 'Rayon Selatan', 'SELATAN', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('11111111-1111-1111-1111-111111111102', 'Rayon Utara', 'UTARA', 'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('11111111-1111-1111-1111-111111111103', 'Rayon Pusat', 'PUSAT', 'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('11111111-1111-1111-1111-111111111104', 'Rayon Timur 1', 'TIMUR1', 'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('11111111-1111-1111-1111-111111111105', 'Rayon Timur 2', 'TIMUR2', 'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('11111111-1111-1111-1111-111111111106', 'Rayon Barat 1', 'BARAT1', 'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('11111111-1111-1111-1111-111111111107', 'Rayon Barat 2', 'BARAT2', 'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 7 Rayons');

    // ==========================================
    // STEP 2: Seed Shift Definitions
    // ==========================================
    console.log('⏰ Seeding Shift Definitions...');
    await queryRunner.query(`
      INSERT INTO shift_definitions (id, name, code, start_time, end_time, crosses_midnight, is_active) VALUES
        ('22222222-2222-2222-2222-222222222201', 'Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE, TRUE),
        ('22222222-2222-2222-2222-222222222202', 'Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE, TRUE),
        ('22222222-2222-2222-2222-222222222203', 'Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE, TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 3 Shift Definitions');

    // ==========================================
    // STEP 3: Seed Activity Types
    // ==========================================
    console.log('🔧 Seeding Activity Types...');
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('33333333-3333-3333-3333-333333333301', 'Penyiraman', 'WATERING', 'Menyiram tanaman dan taman', ARRAY['Worker'], TRUE),
        ('33333333-3333-3333-3333-333333333302', 'Penanaman', 'PLANTING', 'Menanam tanaman baru', ARRAY['Worker'], TRUE),
        ('33333333-3333-3333-3333-333333333303', 'Pemangkasan', 'PRUNING', 'Memangkas tanaman dan pohon', ARRAY['Worker'], TRUE),
        ('33333333-3333-3333-3333-333333333304', 'Pembersihan', 'CLEANING', 'Membersihkan area dari sampah dan kotoran', ARRAY['Worker', 'Linmas'], TRUE),
        ('33333333-3333-3333-3333-333333333305', 'Pemupukan', 'FERTILIZING', 'Memberi pupuk pada tanaman', ARRAY['Worker'], TRUE),
        ('33333333-3333-3333-3333-333333333306', 'Perawatan Tanaman', 'PLANT_CARE', 'Perawatan umum tanaman', ARRAY['Worker'], TRUE),
        ('33333333-3333-3333-3333-333333333307', 'Patroli Keamanan', 'SECURITY_PATROL', 'Patroli keamanan area', ARRAY['Linmas'], TRUE),
        ('33333333-3333-3333-3333-333333333308', 'Laporan Insiden', 'INCIDENT_REPORT', 'Melaporkan insiden keamanan', ARRAY['Linmas'], TRUE),
        ('33333333-3333-3333-3333-333333333309', 'Pemantauan Pengunjung', 'VISITOR_MONITORING', 'Memantau aktivitas pengunjung', ARRAY['Linmas'], TRUE),
        ('33333333-3333-3333-3333-333333333310', 'Pengecekan Fasilitas', 'FACILITY_CHECK', 'Memeriksa kondisi fasilitas', ARRAY['Linmas'], TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 10 Activity Types');

    // ==========================================
    // STEP 4: Update Area Types with Category
    // ==========================================
    console.log('🏷️  Updating Area Types with Category...');
    await queryRunner.query(`
      UPDATE area_types SET category = 'ACTIVE' WHERE code IN ('park', 'mini_garden');
    `);
    await queryRunner.query(`
      UPDATE area_types SET category = 'PASSIVE' WHERE code IN ('pedestrian', 'street');
    `);
    console.log('  ✓ Updated Area Types with ACTIVE/PASSIVE categories');

    // ==========================================
    // STEP 5: Update Areas with Rayon Assignment
    // ==========================================
    console.log('📍 Updating Areas with Rayon assignments...');
    // Assign Taman Bungkul to Rayon Selatan
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '11111111-1111-1111-1111-111111111101'
      WHERE name = 'Taman Bungkul';
    `);
    // Assign Jalan Raya Darmo to Rayon Pusat
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '11111111-1111-1111-1111-111111111103'
      WHERE name = 'Jalan Raya Darmo';
    `);
    // Assign Taman Harmoni to Rayon Selatan
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '11111111-1111-1111-1111-111111111101'
      WHERE name = 'Taman Harmoni';
    `);
    console.log('  ✓ Assigned existing Areas to Rayons');

    // ==========================================
    // STEP 6: Seed Special Day Overrides
    // ==========================================
    console.log('📅 Seeding Special Day Overrides...');
    await queryRunner.query(`
      INSERT INTO special_day_overrides (id, date, day_type, name) VALUES
        ('66666666-6666-6666-6666-666666666601', '2026-08-17', 'HOLIDAY', 'Hari Kemerdekaan'),
        ('66666666-6666-6666-6666-666666666602', '2026-12-25', 'HOLIDAY', 'Natal'),
        ('66666666-6666-6666-6666-666666666603', '2026-01-01', 'HOLIDAY', 'Tahun Baru'),
        ('66666666-6666-6666-6666-666666666604', '2026-05-01', 'HOLIDAY', 'Hari Buruh')
      ON CONFLICT (date) DO NOTHING;
    `);
    console.log('  ✓ Created 4 Special Day Overrides');

    // ==========================================
    // STEP 7: Seed Area Staff Requirements
    // ==========================================
    console.log('👥 Seeding Area Staff Requirements...');

    // Get Taman Bungkul area_id
    const areaResult = await queryRunner.query(`
      SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1;
    `);
    const tamanBungkulId = areaResult[0]?.id;

    if (tamanBungkulId) {
      await queryRunner.query(`
        INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type) VALUES
          -- Shift 1 Weekday
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222201', 'worker', 6, 'WEEKDAY'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222201', 'linmas', 2, 'WEEKDAY'),
          -- Shift 2 Weekday
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222202', 'worker', 9, 'WEEKDAY'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222202', 'linmas', 2, 'WEEKDAY'),
          -- Shift 3 Weekday
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222203', 'worker', 0, 'WEEKDAY'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222203', 'linmas', 4, 'WEEKDAY'),
          -- Shift 1 Weekend
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222201', 'worker', 8, 'WEEKEND'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222201', 'linmas', 3, 'WEEKEND'),
          -- Shift 2 Weekend
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222202', 'worker', 12, 'WEEKEND'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222202', 'linmas', 3, 'WEEKEND'),
          -- Shift 3 Weekend
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222203', 'worker', 0, 'WEEKEND'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222203', 'linmas', 5, 'WEEKEND'),
          -- Shift 1 Holiday
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222201', 'worker', 10, 'HOLIDAY'),
          ('${tamanBungkulId}', '22222222-2222-2222-2222-222222222201', 'linmas', 4, 'HOLIDAY')
        ON CONFLICT DO NOTHING;
      `);
      console.log('  ✓ Created 14 Area Staff Requirements for Taman Bungkul');
    } else {
      console.log('  ⚠ Taman Bungkul not found, skipping staff requirements');
    }

    // ==========================================
    // STEP 8: Seed Additional Users (Phase 2 roles)
    // ==========================================
    console.log('👤 Seeding Additional Users with Phase 2 roles...');

    // Hash for password "password123" using bcrypt
    const passwordHash = '$2b$10$5QCJ5xqKXqKXqKXqKXqKXuYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY';
    // Note: In production, use proper password hashing. This is a placeholder.
    // The actual seed should use AuthService.hashPassword()

    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone, role, rayon_id, is_active) VALUES
        ('77777777-7777-7777-7777-777777777701', 'top_management1', '${passwordHash}', 'Kepala Dinas RTH', '081234567890', 'top_management', NULL, TRUE),
        ('77777777-7777-7777-7777-777777777702', 'kepala_rayon_selatan', '${passwordHash}', 'Kepala Rayon Selatan', '081234567891', 'kepala_rayon', '11111111-1111-1111-1111-111111111101', TRUE),
        ('77777777-7777-7777-7777-777777777703', 'kepala_rayon_utara', '${passwordHash}', 'Kepala Rayon Utara', '081234567892', 'kepala_rayon', '11111111-1111-1111-1111-111111111102', TRUE),
        ('77777777-7777-7777-7777-777777777704', 'koordinator_bungkul', '${passwordHash}', 'Koordinator Taman Bungkul', '081234567893', 'koordinator_lapangan', NULL, TRUE),
        ('77777777-7777-7777-7777-777777777705', 'linmas1', '${passwordHash}', 'Linmas Satu', '081234567894', 'linmas', NULL, TRUE),
        ('77777777-7777-7777-7777-777777777706', 'linmas2', '${passwordHash}', 'Linmas Dua', '081234567895', 'linmas', NULL, TRUE),
        ('77777777-7777-7777-7777-777777777707', 'worker4', '${passwordHash}', 'Pekerja Empat', '081234567896', 'worker', NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('  ✓ Created 7 additional users with Phase 2 roles');

    // ==========================================
    // STEP 9: Seed Worker Schedules
    // ==========================================
    console.log('📅 Seeding Worker Schedules...');

    // Get worker IDs
    const workerResult = await queryRunner.query(`
      SELECT id, username FROM users WHERE role IN ('worker', 'linmas') LIMIT 10;
    `);

    if (workerResult.length > 0 && tamanBungkulId) {
      const workers = workerResult.slice(0, 4);
      for (let i = 0; i < workers.length; i++) {
        const shiftId =
          i < 2 ? '22222222-2222-2222-2222-222222222201' : '22222222-2222-2222-2222-222222222202';
        await queryRunner.query(`
          INSERT INTO worker_schedules (user_id, area_id, shift_definition_id, effective_date, end_date, created_by)
          VALUES ('${workers[i].id}', '${tamanBungkulId}', '${shiftId}', '2026-01-20', NULL, NULL)
          ON CONFLICT DO NOTHING;
        `);
      }
      console.log('  ✓ Created 4 Worker Schedules');
    } else {
      console.log('  ⚠ No workers or areas found, skipping schedules');
    }

    console.log('');
    console.log('✅ Phase 2 Seeding Completed Successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  - 7 Rayons');
    console.log('  - 3 Shift Definitions');
    console.log('  - 10 Activity Types');
    console.log('  - 4 Special Day Overrides');
    console.log('  - 7 Additional Users (Phase 2 roles)');
    console.log('  - 14 Area Staff Requirements');
    console.log('  - 4 Worker Schedules');
    console.log('  - Updated Area Types with categories');
    console.log('  - Updated Areas with Rayon assignments');
  } catch (error) {
    console.error('❌ Error during Phase 2 seeding:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run the seed
seedPhase2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
