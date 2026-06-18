import { DataSource } from 'typeorm';
import '../../config/load-env';

/**
 * Notifications Seed Script (runs AFTER phase1, phase2, phase3)
 *
 * Seeds admin notifications with deep-links to actual seeded tasks/activities/overtimes.
 * DETERMINISTIC IDs match those created in seed-phase2.ts:
 *
 * Tasks:      TASK_1_ID through TASK_8_ID, LINMAS_TASK_1_ID through LINMAS_TASK_4_ID, etc.
 * Activities: ACT_SAT_1_ID through ACT_SAT_12_ID, ACT_LIN_1_ID through ACT_LIN_5_ID, etc.
 * Overtimes:  OVERTIME_1_ID through OVERTIME_8_ID (created in seed-phase2 Phase 2C)
 *
 * The admin user (superadmin) is seeded in phase1 with explicit UUID e8f9a0b1-c2d3-4e5f-a6b7-c8d9e0f1a2b3
 *
 * Run: npm run db:seed:notifications (or as part of full `npm run db:seed`)
 */

// Pre-computed deterministic IDs from seed-phase2.ts § Phase 2C § Task/Activity/Overtime IDs

// Admin user from phase1
const ADMIN_USER_ID = 'e8f9a0b1-c2d3-4e5f-a6b7-c8d9e0f1a2b3';

// Deterministic IDs referenced by the demo notifications, mirrored from
// seed-phase2.ts so each notification deep-links to a real seeded record.
const TASK_1_ID = '099757d2-ab32-4384-83e7-22a35b0510ec';
const ACT_SAT_2_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';
const ACT_LIN_1_ID = 'a3b4c5d6-e7f8-4a9b-8c1d-e2f3a4b5c6d7';
const OVERTIME_2_ID = 'f1a2b3c4-d5e6-4f7a-ab9c-9d0e1f2a3b4c';

async function seedNotifications() {
  console.log('📬 Notifications Seeding Started...');

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
    // NOTIFICATIONS (8 — admin demo feed with real deep-links)
    // ============================================================
    console.log('\n📬 Seeding admin notifications with real task/activity/overtime deep-links...');
    await queryRunner.query(`
      INSERT INTO notifications
        (id, user_id, title, body, type, data, is_read, read_at, is_sent, sent_at, created_at)
      VALUES
        ('b0000000-0000-4000-8000-000000000001', '${ADMIN_USER_ID}', 'Selamat datang di SEKAR', 'Konsol web SEKAR siap digunakan. Jelajahi monitoring, tugas, dan laporan dari sini.', 'announcement', NULL, FALSE, NULL, TRUE, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),
        ('b0000000-0000-4000-8000-000000000002', '${ADMIN_USER_ID}', 'Tugas baru ditugaskan', 'Sebuah tugas perawatan baru telah dibuat dan menunggu penjadwalan.', 'task_assigned', '{"task_id":"${TASK_1_ID}"}'::jsonb, FALSE, NULL, TRUE, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
        ('b0000000-0000-4000-8000-000000000003', '${ADMIN_USER_ID}', 'Petugas tidak terpantau', 'Satu petugas tidak mengirim lokasi lebih dari 15 menit. Periksa monitoring.', 'missing_worker_alert', NULL, FALSE, NULL, TRUE, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
        ('b0000000-0000-4000-8000-000000000004', '${ADMIN_USER_ID}', 'Pengingat shift besok', 'Jadwal shift pagi dimulai pukul 06.00. Pastikan penugasan sudah lengkap.', 'shift_reminder', NULL, FALSE, NULL, TRUE, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
        ('b0000000-0000-4000-8000-000000000005', '${ADMIN_USER_ID}', 'Aktivitas disetujui', 'Laporan aktivitas penyiraman telah disetujui.', 'activity_approved', '{"activity_id":"${ACT_SAT_2_ID}"}'::jsonb, TRUE, NOW() - INTERVAL '20 hours', TRUE, NOW() - INTERVAL '22 hours', NOW() - INTERVAL '22 hours'),
        ('b0000000-0000-4000-8000-000000000006', '${ADMIN_USER_ID}', 'Lembur disetujui', 'Permintaan lembur akhir pekan telah disetujui.', 'overtime_approved', '{"overtime_id":"${OVERTIME_2_ID}"}'::jsonb, TRUE, NOW() - INTERVAL '23 hours', TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
        ('b0000000-0000-4000-8000-000000000007', '${ADMIN_USER_ID}', 'Anda ditandai pada aktivitas', 'Anda ditandai sebagai pihak terkait pada sebuah laporan aktivitas.', 'activity_tagged', '{"activity_id":"${ACT_LIN_1_ID}"}'::jsonb, FALSE, NULL, TRUE, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
        ('b0000000-0000-4000-8000-000000000008', '${ADMIN_USER_ID}', 'Pemeliharaan terjadwal', 'Sistem akan menjalani pemeliharaan rutin Minggu pukul 23.00.', 'system', NULL, TRUE, NOW() - INTERVAL '2 days', TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  ✓ Created 8 notifications for admin with deep-link payloads:');
    console.log(`    - 1 announcement (no deep-link)`);
    console.log(`    - 1 task_assigned → TASK_1_ID`);
    console.log(`    - 1 activity_approved → ACT_SAT_2_ID`);
    console.log(`    - 1 overtime_approved → OVERTIME_2_ID`);
    console.log(`    - 1 activity_tagged → ACT_LIN_1_ID`);
    console.log(`    - 3 system alerts (no deep-links)`);

    console.log('\n✅ Notifications seeding completed!');
  } catch (error) {
    console.error('❌ Notifications seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
