import type { SeedContext } from '../lib/context';
import { ADMIN_USER_ID, TASK_1_ID, ACT_SAT_2_ID, ACT_LIN_1_ID, OVERTIME_2_ID } from '../lib/ids';

/**
 * Seed notifications.
 *
 * 8 admin notifications with deep-links to real seeded tasks, activities, overtimes.
 * References deterministic IDs from task.ts, activity.ts, overtime.ts.
 */
export async function seedNotifications(ctx: SeedContext): Promise<void> {
  ctx.log('📬 Seeding admin notifications with real task/activity/overtime deep-links...');
  await ctx.qr.query(`
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
  ctx.log('  ✓ Created 8 notifications for admin with deep-link payloads:');
  ctx.log(`    - 1 announcement (no deep-link)`);
  ctx.log(`    - 1 task_assigned → TASK_1_ID`);
  ctx.log(`    - 1 activity_approved → ACT_SAT_2_ID`);
  ctx.log(`    - 1 overtime_approved → OVERTIME_2_ID`);
  ctx.log(`    - 1 activity_tagged → ACT_LIN_1_ID`);
  ctx.log(`    - 3 system alerts (no deep-links)`);
}
