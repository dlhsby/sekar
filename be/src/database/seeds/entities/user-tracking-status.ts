import type { SeedContext } from '../lib/context';

/**
 * Seed user tracking status — two phases:
 * 1. Backfill: all clockable users as offline (default)
 * 2. Extended variants: sample users with varied statuses (active/inactive/outside_area/missing/offline)
 *    for the web dashboard + monitoring map to show non-zero KPI counts.
 *
 * From seed-phase2.ts § SECTION D (Phase 2D monitoring).
 */
export async function seedUserTrackingStatus(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding User Tracking Status…');

  // ==========================================
  // D.2: Backfill user_tracking_status for all clockable users (offline default)
  // ==========================================
  const clockableUsers = (await ctx.qr.query(`
    SELECT id, area_id FROM users
    WHERE role IN ('satgas', 'linmas', 'korlap', 'admin_data') AND deleted_at IS NULL
  `)) as Array<{ id: string; area_id: string | null }>;

  for (const user of clockableUsers) {
    await ctx.qr.query(
      `INSERT INTO user_tracking_status (user_id, status, area_id, updated_at)
       VALUES ($1, 'offline', $2, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id, user.area_id],
    );
  }
  ctx.log(`  ✓ Backfilled ${clockableUsers.length} users as offline (default)`);

  // ==========================================
  // D.3: Monitoring status variants — EXTENDED for web dashboard + monitoring demo
  // ==========================================
  ctx.log('  [D.3] Seeding monitoring status variants for web dashboard…');

  // Get a sample of workers from different rayons to seed varied statuses
  const monitoringUsers = (await ctx.qr.query(`
    SELECT u.id, u.username, u.rayon_id, u.area_id, a.gps_lat, a.gps_lng
    FROM users u
    LEFT JOIN areas a ON u.area_id = a.id
    WHERE u.role IN ('satgas', 'linmas', 'korlap')
    AND u.is_active = TRUE
    AND u.deleted_at IS NULL
    ORDER BY u.rayon_id, u.username
    LIMIT 30
  `)) as Array<{
    id: string;
    username: string;
    rayon_id: string | null;
    area_id: string | null;
    gps_lat: number | string | null;
    gps_lng: number | string | null;
  }>;

  // Assign status distribution across rayons (spread statuses)
  let statusIndex = 0;
  const statuses = ['active', 'active', 'inactive', 'outside_area', 'missing', 'offline'];

  for (const user of monitoringUsers) {
    const status = statuses[statusIndex % statuses.length];
    statusIndex++;

    // Derive last_location_at and GPS based on status
    let lastLocationAtExpr: string;
    let lat: number;
    let lng: number;
    let isWithinArea: boolean;

    switch (status) {
      case 'active':
        // Recent ping within 5 minutes
        lastLocationAtExpr = `NOW() - INTERVAL '${Math.floor(Math.random() * 5)} minutes'`;
        lat = user.gps_lat
          ? parseFloat(user.gps_lat as any) + (Math.random() - 0.5) * 0.002
          : -7.25;
        lng = user.gps_lng
          ? parseFloat(user.gps_lng as any) + (Math.random() - 0.5) * 0.002
          : 112.75;
        isWithinArea = true;
        break;

      case 'inactive':
        // Last ping 35+ minutes ago
        lastLocationAtExpr = `NOW() - INTERVAL '${35 + Math.floor(Math.random() * 60)} minutes'`;
        lat = user.gps_lat
          ? parseFloat(user.gps_lat as any) + (Math.random() - 0.5) * 0.001
          : -7.25;
        lng = user.gps_lng
          ? parseFloat(user.gps_lng as any) + (Math.random() - 0.5) * 0.001
          : 112.75;
        isWithinArea = true;
        break;

      case 'outside_area':
        // GPS outside assigned area (far away)
        lastLocationAtExpr = `NOW() - INTERVAL '${10 + Math.floor(Math.random() * 20)} minutes'`;
        lat = user.gps_lat ? parseFloat(user.gps_lat as any) + (Math.random() - 0.5) * 0.1 : -7.2;
        lng = user.gps_lng ? parseFloat(user.gps_lng as any) + (Math.random() - 0.5) * 0.1 : 112.8;
        isWithinArea = false;
        break;

      case 'missing':
        // No ping for 3+ hours
        lastLocationAtExpr = `NOW() - INTERVAL '${180 + Math.floor(Math.random() * 180)} minutes'`;
        lat = user.gps_lat ? parseFloat(user.gps_lat as any) : -7.25;
        lng = user.gps_lng ? parseFloat(user.gps_lng as any) : 112.75;
        isWithinArea = false;
        break;

      default: // offline
        lastLocationAtExpr = 'NULL';
        lat = 0;
        lng = 0;
        isWithinArea = false;
    }

    // Build INSERT query for this user's tracking status
    const latValue = lastLocationAtExpr === 'NULL' ? 'NULL' : lat.toString();
    const lngValue = lastLocationAtExpr === 'NULL' ? 'NULL' : lng.toString();

    await ctx.qr.query(
      `INSERT INTO user_tracking_status
        (user_id, status, area_id, rayon_id, last_latitude, last_longitude,
         last_location_at, is_within_area, updated_at)
      VALUES
        ($1, $2, $3, $4, ${latValue}::decimal, ${lngValue}::decimal,
         (${lastLocationAtExpr})::timestamptz, $5, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        status = EXCLUDED.status,
        last_latitude = EXCLUDED.last_latitude,
        last_longitude = EXCLUDED.last_longitude,
        last_location_at = EXCLUDED.last_location_at,
        is_within_area = EXCLUDED.is_within_area,
        updated_at = NOW()`,
      [user.id, status, user.area_id, user.rayon_id, isWithinArea],
    );
  }

  ctx.log(
    `  ✓ Seeded ${monitoringUsers.length} user_tracking_status records with varied statuses (active/inactive/outside_area/missing/offline)`,
  );

  // Ensure all other clockable users remain offline (no monitoring data)
  // Only update users that were NOT in the 30-user sample above
  const seededUserIds = monitoringUsers.map((u: any) => `'${u.id}'`).join(',');
  if (seededUserIds) {
    await ctx.qr.query(`
      UPDATE user_tracking_status SET
        status = 'offline',
        shift_id = NULL,
        is_within_area = FALSE,
        last_location_at = NULL,
        updated_at = NOW()
      WHERE status <> 'offline' AND user_id NOT IN (${seededUserIds})
    `);
  }
  ctx.log('  ✓ All other users remain offline (no seeded location data)');

  // Close any open shifts from previous runs (defensive)
  await ctx.qr.query(`
    UPDATE shifts SET
      clock_out_time = clock_in_time + INTERVAL '8 hours',
      updated_at = NOW()
    WHERE clock_out_time IS NULL
  `);

  ctx.log('✅ User tracking status seeding complete');
}
