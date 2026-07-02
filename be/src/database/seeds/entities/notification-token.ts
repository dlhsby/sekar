import type { SeedContext } from '../lib/context';

/**
 * Seed notification tokens for demo users — 3 test tokens linked to
 * specific field workers (satgas_pusat_1, satgas_timur_1_2, linmas_pusat_1).
 * From seed-phase2.ts § STEP 8.2.
 */
export async function seedNotificationTokens(ctx: SeedContext): Promise<void> {
  ctx.log('📱 Seeding Notification Tokens…');

  // Notification token IDs
  const NOTIF_TOKEN_1_ID = '9f4e2d8b-1c7a-4f9e-b3d6-7a2c5e1f4b8d';
  const NOTIF_TOKEN_2_ID = '3b8f6e2d-5a9c-4b3f-87d1-4c8a3f6b2e9d';
  const NOTIF_TOKEN_3_ID = '7e3c1f9b-4d8a-4e7c-92f6-9b5e3c0f1d7a';

  await ctx.qr.query(`
    INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
    SELECT '${NOTIF_TOKEN_1_ID}', u.id,
      'ExponentPushToken[satgas_pusat_1_ABCDEF12345_test]', 'device_satgas_pusat1_abc123', 'android', TRUE, NOW() - INTERVAL '7 days'
    FROM users u WHERE u.username = 'satgas_pusat_1' LIMIT 1
    ON CONFLICT (id) DO NOTHING;
  `);

  await ctx.qr.query(`
    INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
    SELECT '${NOTIF_TOKEN_2_ID}', u.id,
      'ExponentPushToken[satgas_timur_1_2_GHIJKL67890_test]', 'device_satgas_timur_1_2_xyz789', 'android', TRUE, NOW() - INTERVAL '5 days'
    FROM users u WHERE u.username = 'satgas_timur_1_2' LIMIT 1
    ON CONFLICT (id) DO NOTHING;
  `);

  await ctx.qr.query(`
    INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
    SELECT '${NOTIF_TOKEN_3_ID}', u.id,
      'ExponentPushToken[linmas_pusat_1_MNOPQR11223_test]', 'device_linmas_pusat_1_mnp345', 'android', TRUE, NOW() - INTERVAL '3 days'
    FROM users u WHERE u.username = 'linmas_pusat_1' LIMIT 1
    ON CONFLICT (id) DO NOTHING;
  `);

  ctx.log('  ✓ Seeded 3 notification tokens (satgas_pusat_1, satgas_timur_1_2, linmas_pusat_1)');
}
