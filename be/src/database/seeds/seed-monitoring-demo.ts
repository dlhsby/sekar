import { DataSource } from 'typeorm';
import '../../config/load-env';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables

/**
 * Monitoring Demo Seed Script
 *
 * Creates live demo data for /monitoring/snapshot endpoint.
 * Finds existing field workers (satgas/linmas/korlap) and creates:
 *   - OPEN shifts (clock_in ~2h ago, no clock_out)
 *   - Recent location_logs (pings within last few minutes)
 *   - user_tracking_status entries with realistic statuses (active/inactive/outside_area/missing/offline)
 *
 * IDEMPOTENT: Closes prior demo shifts before creating new ones. Safe to re-run.
 *
 * Usage: npm run db:seed:monitoring-demo
 */

async function seedMonitoringDemo() {
  console.log('🌱 Monitoring Demo Seeding Started...');
  console.log('');

  // Initialize DataSource
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
    console.log('🔍 Finding existing field workers...');

    // Fetch all field workers (satgas, linmas, korlap) across all rayons
    const workers = await queryRunner.query(`
      SELECT
        u.id,
        u.username,
        u.role,
        ua.area_id,
        a.name as area_name,
        a.boundary_polygon
      FROM users u
      LEFT JOIN user_areas ua ON u.id = ua.user_id AND ua.assignment_type = 'permanent'
      LEFT JOIN areas a ON ua.area_id = a.id
      LEFT JOIN rayons r ON a.rayon_id = r.id
      WHERE u.role IN ('satgas', 'linmas', 'korlap')
        AND u.deleted_at IS NULL
      ORDER BY u.username, a.name
      LIMIT 100
    `);

    if (workers.length === 0) {
      console.log('  ⚠️  No field workers found. Skipping demo seed.');
      return;
    }

    console.log(`  ✓ Found ${workers.length} field workers\n`);

    // Close any prior demo shifts to make seed idempotent
    console.log('🔄 Closing prior demo shifts...');
    const now = new Date();
    const priorDemoCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago

    await queryRunner.query(
      `
      UPDATE shifts
      SET clock_out_time = NOW(),
          clock_out_gps_lat = -7.2905,
          clock_out_gps_lng = 112.7398,
          updated_at = NOW()
      WHERE clock_out_time IS NULL
        AND created_at < $1
        AND user_id IN (SELECT id FROM users WHERE role IN ('satgas', 'linmas', 'korlap'))
    `,
      [priorDemoCutoff],
    );

    console.log('  ✓ Closed prior demo shifts\n');

    // Define realistic status scenarios
    const statuses = [
      {
        name: 'active',
        description: 'Recent GPS ping within area',
        lastPingMinutesAgo: 2,
        isWithinArea: true,
      },
      {
        name: 'inactive',
        description: 'Last ping 35 min ago',
        lastPingMinutesAgo: 35,
        isWithinArea: true,
      },
      {
        name: 'outside_area',
        description: 'GPS outside area boundary',
        lastPingMinutesAgo: 5,
        isWithinArea: false,
      },
      {
        name: 'missing',
        description: 'No ping for 3+ hours',
        lastPingMinutesAgo: 200, // >3h
        isWithinArea: null,
      },
      {
        name: 'offline',
        description: 'No open shift',
        lastPingMinutesAgo: null,
        isWithinArea: null,
      },
    ];

    const statusSummary: Record<string, number> = {};
    const shiftIds: string[] = [];

    // Distribute workers across statuses
    let workerIndex = 0;
    for (const status of statuses) {
      let workersForStatus = Math.ceil(workers.length / statuses.length);
      if (status.name === 'offline') {
        workersForStatus = workers.length - workerIndex; // Catch remainder
      }

      statusSummary[status.name] = 0;

      for (let i = 0; i < workersForStatus && workerIndex < workers.length; i++) {
        const worker = workers[workerIndex];
        workerIndex++;

        // Pick an area for this worker
        const area = worker.area_id
          ? worker
          : workers.find((w: any) => w.area_id && w.area_id !== null);
        if (!area || !area.area_id) {
          console.log(`  ⚠️  Skipping ${worker.username}: no assigned area`);
          continue;
        }

        // Only create shift and location log if status needs one (not offline)
        if (status.lastPingMinutesAgo !== null) {
          // Create open shift
          const shiftId = uuidv4();
          const clockInTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago

          await queryRunner.query(
            `INSERT INTO shifts (id, user_id, area_id, clock_in_time, clock_in_gps_lat,
              clock_in_gps_lng, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              shiftId,
              worker.id,
              area.area_id,
              clockInTime,
              -7.2905, // Bungkul center
              112.7398,
              clockInTime,
              now,
            ],
          );
          shiftIds.push(shiftId);

          // Create location log ping(s) — vary GPS based on status
          const lastPingTime = new Date(now.getTime() - status.lastPingMinutesAgo * 60 * 1000);
          let gpsLat = -7.2905;
          let gpsLng = 112.7398;

          if (!status.isWithinArea && area.boundary_polygon) {
            // Place GPS outside area boundary
            try {
              const polygon = JSON.parse(area.boundary_polygon);
              if (polygon.coordinates?.[0]) {
                const [lng, lat] = polygon.coordinates[0][0];
                gpsLat = lat + 0.005; // Offset outside
                gpsLng = lng + 0.005;
              }
            } catch {
              // Fallback: just offset from center
              gpsLat = -7.285;
              gpsLng = 112.745;
            }
          }

          await queryRunner.query(
            `INSERT INTO location_logs (id, user_id, shift_id, gps_lat, gps_lng,
              accuracy_meters, battery_level, logged_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              worker.id,
              shiftId,
              gpsLat,
              gpsLng,
              12.5, // Typical GPS accuracy
              status.name === 'offline' ? 10 : 75, // Low battery for missing/offline
              lastPingTime,
            ],
          );

          // Update user_tracking_status
          await queryRunner.query(
            `INSERT INTO user_tracking_status (user_id, shift_id, status, last_latitude,
              last_longitude, last_accuracy_meters, last_battery_level, last_location_at,
              is_within_area, area_id, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (user_id) DO UPDATE SET
               shift_id = $2,
               status = $3,
               last_latitude = $4,
               last_longitude = $5,
               last_accuracy_meters = $6,
               last_battery_level = $7,
               last_location_at = $8,
               is_within_area = $9,
               area_id = $10,
               updated_at = $11`,
            [
              worker.id,
              shiftId,
              status.name,
              gpsLat,
              gpsLng,
              12.5,
              status.name === 'offline' ? 10 : 75,
              lastPingTime,
              status.isWithinArea ?? true,
              area.area_id,
              now,
            ],
          );

          statusSummary[status.name]++;
          console.log(
            `  ✓ ${worker.username} (${worker.role}) → ${status.name} (${status.description})`,
          );
        } else {
          // Offline status: no shift, just update tracking status
          await queryRunner.query(
            `INSERT INTO user_tracking_status (user_id, shift_id, status, updated_at)
             VALUES ($1, NULL, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
               shift_id = NULL,
               status = $2,
               updated_at = $3`,
            [worker.id, 'offline', now],
          );

          statusSummary[status.name]++;
          console.log(`  ✓ ${worker.username} (${worker.role}) → offline (no shift)`);
        }
      }
    }

    console.log('');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('📊 Monitoring Demo Summary:');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    for (const [status, count] of Object.entries(statusSummary)) {
      console.log(`  ${status.padEnd(15)} ${count} worker(s)`);
    }
    console.log('');
    console.log(`  Shifts created: ${shiftIds.length}`);
    console.log('  Location logs created: multiple (one+ per open shift)');
    console.log('');
    console.log('✅ Monitoring demo seed complete. Run: npm run start:dev');
    console.log('   then visit http://localhost:3001/monitoring/snapshot');
    console.log('');
  } catch (error) {
    console.error('❌ Error during monitoring demo seeding:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run the seed
seedMonitoringDemo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
