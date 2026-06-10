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
 *   - 1 user  (admin / superadmin) with explicit UUID
 *   - 4 area types
 *
 * Areas, shifts, location logs, and activities are seeded in Phase 2.
 * (Areas moved out of phase1 on 2026-05-18 — they now come from the shared
 * KMZ-derived module `./kmz-areas` and need to be rayon-linked, which only
 * makes sense after phase2 creates the 7 rayons.)
 *
 * Run: npm run db:seed:phase1
 * Prod: npm run db:seed:phase1:prod
 */

// Pre-computed bcrypt hash for "password123" with 10 salt rounds
const PASSWORD_HASH = '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

// Explicit UUID for admin user so Phase 2 references are stable
const ADMIN_USER_ID = 'e8f9a0b1-c2d3-4e5f-a6b7-c8d9e0f1a2b3';

async function seedPhase1() {
  console.log('Phase 1 Seeding Started...');

  // Check if schema exists before deciding to synchronize
  const probeSource = new DataSource({
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
  await probeSource.initialize();
  const [{ count }] = await probeSource.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  await probeSource.destroy();
  const schemaIsEmpty = parseInt(count, 10) === 0;

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: schemaIsEmpty,
    entities: schemaIsEmpty ? [__dirname + '/../../**/*.entity{.ts,.js}'] : [],
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ============================================================
    // CLEAR DATABASE (reverse FK order)
    // ============================================================
    console.log('\nClearing existing data...');

    const tablesToClear = [
      'audit_logs',
      'user_areas',
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
        console.log(`  Skipped ${table} (table does not exist yet)`);
      }
    }
    if (existingTables.length > 0) {
      await queryRunner.query(
        `TRUNCATE TABLE ${existingTables.map((t) => `"${t}"`).join(', ')} CASCADE`,
      );
      console.log(`  Truncated ${existingTables.length} tables`);
    }

    // ============================================================
    // USERS (1 — admin only; all other users seeded in Phase 2)
    // ============================================================
    console.log('\nSeeding admin user...');

    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, is_active) VALUES
        ('${ADMIN_USER_ID}', 'admin', '${PASSWORD_HASH}', 'System Administrator', '081200000000', 'superadmin', TRUE)
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('  Created 1 user: admin (superadmin)');

    // Dummy account to exercise the forced password-change flow (AS-5). Temp
    // password is "password123"; password_must_change=TRUE forces the change
    // screen on first login. Remove/disable before production.
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, is_active, password_must_change) VALUES
        ('a0000000-0000-4000-8000-000000000099', 'resettest', '${PASSWORD_HASH}', 'Reset Test User', '081200000099', 'satgas', TRUE, TRUE)
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('  Created 1 user: resettest (satgas, password_must_change) — password: password123');

    // ============================================================
    // NOTIFICATIONS (seeded in seed-notifications.ts after phase2/phase3)
    // ============================================================
    // Notifications are now seeded separately in seed-notifications.ts with
    // deep-links to actual task/activity/overtime records. This ensures that
    // every notification carries a real entity_id that exists after a reseed.
    console.log('\nℹ️  Admin notifications seeded separately (run: npm run db:seed:notifications)');

    // ============================================================
    // AREA TYPES (4)
    // ============================================================
    console.log('\nSeeding area types...');

    await queryRunner.query(`
      INSERT INTO area_types (code, name, description) VALUES
        ('park',        'Taman',      'Taman kota dan ruang terbuka hijau publik'),
        ('pedestrian',  'Trotoar',    'Jalur pejalan kaki di sepanjang jalan raya'),
        ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan'),
        ('street',      'Jalanan',    'Jalanan umum yang memerlukan pemeliharaan kebersihan')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  Created 4 area types');

    console.log('\nPhase 1 Seeding Completed Successfully!');
    console.log('\nSummary:');
    console.log('  - 1 user: admin (superadmin) — password: password123');
    console.log('  - 4 area types (park, pedestrian, mini_garden, street)');
    console.log('  - Areas, shifts, location logs, and activities are seeded in Phase 2');
  } catch (error) {
    console.error('Phase 1 seeding failed:', error);
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
