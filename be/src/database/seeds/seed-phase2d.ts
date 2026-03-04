import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Phase 2D Seed Script
 *
 * Seeds monitoring configuration and backfills user tracking status:
 * - Default monitoring configs (thresholds, geofencing, map defaults, alerts, location ping)
 * - Initial user_tracking_status for all clockable users
 * - Status backfill for users with active shifts
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/database/seeds/seed-phase2d.ts
 */

async function seedPhase2D() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('📡 Phase 2D Seeding: Monitoring Configuration');
    console.log('');

    const queryRunner = dataSource.createQueryRunner();

    // 1. Insert default monitoring configs
    console.log('  [1/3] Inserting default monitoring configs...');

    const configs = [
      {
        key: 'status_thresholds',
        value: JSON.stringify({
          active_max_age_seconds: 300,
          inactive_threshold_seconds: 900,
          missing_threshold_seconds: 3600,
        }),
        description: 'Status calculation thresholds',
      },
      {
        key: 'geofencing',
        value: JSON.stringify({
          tolerance_meters: 50,
          outside_area_grace_seconds: 120,
        }),
        description: 'Geofencing tolerance settings',
      },
      {
        key: 'map_defaults',
        value: JSON.stringify({
          center_lat: -7.2575,
          center_lng: 112.7521,
          zoom: 12,
          cluster_zoom_threshold: 13,
        }),
        description: 'Map default view settings (Surabaya)',
      },
      {
        key: 'alerts',
        value: JSON.stringify({
          notify_on_missing: true,
          notify_on_outside_area: true,
          low_battery_threshold: 20,
        }),
        description: 'Alert configuration',
      },
      {
        key: 'location_ping',
        value: JSON.stringify({
          interval_seconds: 60,
          batch_size: 10,
        }),
        description: 'Mobile location ping settings',
      },
    ];

    for (const cfg of configs) {
      await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
    }
    console.log(`    ✓ ${configs.length} monitoring configs inserted`);

    // 2. Backfill user_tracking_status for clockable users
    console.log('  [2/3] Backfilling user_tracking_status for clockable users...');

    const clockableUsers = await queryRunner.query(
      `SELECT id, area_id FROM users
       WHERE role IN ('satgas', 'linmas', 'korlap', 'admin_data')
         AND deleted_at IS NULL`,
    );

    let insertedCount = 0;
    for (const user of clockableUsers) {
      const result = await queryRunner.query(
        `INSERT INTO user_tracking_status (user_id, status, area_id, updated_at)
         VALUES ($1, 'offline', $2, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, user.area_id],
      );
      if (result?.[1] > 0) insertedCount++;
    }
    console.log(`    ✓ ${clockableUsers.length} clockable users processed (${insertedCount} new)`);

    // 3. Backfill status for users with active shifts
    console.log('  [3/3] Backfilling status for users with active shifts...');

    const activeResult = await queryRunner.query(
      `UPDATE user_tracking_status uts SET
         shift_id = s.id,
         status = 'active',
         is_within_area = NOT COALESCE(s.clock_in_outside_boundary, false)
       FROM shifts s
       WHERE s.user_id = uts.user_id
         AND s.clock_out_time IS NULL
         AND s.deleted_at IS NULL`,
    );
    console.log(`    ✓ Active shift backfill complete`);

    await queryRunner.release();
    console.log('');
    console.log('✅ Phase 2D seeding completed!');
  } catch (error) {
    console.error('❌ Phase 2D seeding failed:', error.message);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }

  process.exit(0);
}

seedPhase2D();
