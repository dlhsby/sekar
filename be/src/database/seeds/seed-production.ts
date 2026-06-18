import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import '../../config/load-env';
import { RAYON_BOUNDARIES, computeCentroidFromRings, type RayonCode } from './kmz-areas';

/**
 * Production Seed Script (Phase 4-6 J1)
 *
 * NON-DESTRUCTIVE — never wipes; every insert is an upsert keyed on the
 * table's unique column (rayon code, shift code, kecamatan code, username).
 * Safe to re-run.
 *
 * Seeds:
 *   - 8 rayons (7 geographic + Rayon Taman Aktif logical bucket) with real
 *     KMZ boundaries + office/landmark center overrides
 *   - 3 shift definitions (SHIFT1/2/3 — municipal schedule)
 *   - 31 kecamatans mapped to their rayon (public pruning intake)
 *   - 1 superadmin + 1 admin_system account — passwords from env
 *
 * NOT seeded (loaded through their own tooling):
 *   - areas/boundaries        → KMZ import (4-5 import module)
 *   - plant species catalog   → npm run db:seed:phase3 reference portion
 *   - workers/schedules       → CSV import (4-5) by admin_system
 *
 * Required env: PROD_SUPERADMIN_PASSWORD, PROD_ADMIN_SYSTEM_PASSWORD
 * (min 12 chars — the script fails loudly when missing/weak).
 *
 * Run: npm run db:seed:production
 */

const RAYONS: { name: string; code: RayonCode | 'TAMAN_AKTIF'; description: string }[] = [
  {
    name: 'Rayon Selatan',
    code: 'SELATAN',
    description: 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan',
  },
  {
    name: 'Rayon Utara',
    code: 'UTARA',
    description: 'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak',
  },
  {
    name: 'Rayon Pusat',
    code: 'PUSAT',
    description: 'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto',
  },
  {
    name: 'Rayon Timur 1',
    code: 'TIMUR1',
    description: 'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo',
  },
  {
    name: 'Rayon Timur 2',
    code: 'TIMUR2',
    description:
      'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar',
  },
  {
    name: 'Rayon Barat 1',
    code: 'BARAT1',
    description: 'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo',
  },
  {
    name: 'Rayon Barat 2',
    code: 'BARAT2',
    description:
      'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep',
  },
  {
    name: 'Rayon Taman Aktif',
    code: 'TAMAN_AKTIF',
    description:
      'Bucket logis untuk taman aktif (active parks) lintas-rayon — tidak punya batas geografis',
  },
];

const SHIFT_DEFINITIONS = [
  { name: 'Shift 1', code: 'SHIFT1', start: '06:00:00', end: '15:00:00', crossesMidnight: false },
  { name: 'Shift 2', code: 'SHIFT2', start: '15:00:00', end: '23:00:00', crossesMidnight: false },
  { name: 'Shift 3', code: 'SHIFT3', start: '21:00:00', end: '05:00:00', crossesMidnight: true },
];

/** kecamatan → (rayon code, region) — mirrors the staging reference list */
const KECAMATANS: { name: string; code: string; rayon: string; region: string }[] = [
  { name: 'Bubutan', code: 'bubutan', rayon: 'PUSAT', region: 'pusat' },
  { name: 'Genteng', code: 'genteng', rayon: 'PUSAT', region: 'pusat' },
  { name: 'Simokerto', code: 'simokerto', rayon: 'PUSAT', region: 'pusat' },
  { name: 'Tegalsari', code: 'tegalsari', rayon: 'PUSAT', region: 'pusat' },
  { name: 'Tambaksari', code: 'tambaksari', rayon: 'TIMUR1', region: 'timur' },
  { name: 'Gubeng', code: 'gubeng', rayon: 'TIMUR1', region: 'timur' },
  { name: 'Sukolilo', code: 'sukolilo', rayon: 'TIMUR1', region: 'timur' },
  { name: 'Mulyorejo', code: 'mulyorejo', rayon: 'TIMUR2', region: 'timur' },
  { name: 'Rungkut', code: 'rungkut', rayon: 'TIMUR2', region: 'timur' },
  { name: 'Tenggilis Mejoyo', code: 'tenggilis_mejoyo', rayon: 'TIMUR2', region: 'timur' },
  { name: 'Gunung Anyar', code: 'gunung_anyar', rayon: 'TIMUR2', region: 'timur' },
  { name: 'Sukomanunggal', code: 'sukomanunggal', rayon: 'BARAT1', region: 'barat' },
  { name: 'Tandes', code: 'tandes', rayon: 'BARAT1', region: 'barat' },
  { name: 'Asemrowo', code: 'asemrowo', rayon: 'BARAT1', region: 'barat' },
  { name: 'Benowo', code: 'benowo', rayon: 'BARAT1', region: 'barat' },
  { name: 'Pakal', code: 'pakal', rayon: 'BARAT1', region: 'barat' },
  { name: 'Sambikerep', code: 'sambikerep', rayon: 'BARAT2', region: 'barat' },
  { name: 'Lakarsantri', code: 'lakarsantri', rayon: 'BARAT2', region: 'barat' },
  { name: 'Sawahan', code: 'sawahan', rayon: 'BARAT2', region: 'barat' },
  { name: 'Dukuh Pakis', code: 'dukuh_pakis', rayon: 'BARAT2', region: 'barat' },
  { name: 'Wiyung', code: 'wiyung', rayon: 'BARAT2', region: 'barat' },
  { name: 'Karang Pilang', code: 'karang_pilang', rayon: 'BARAT2', region: 'barat' },
  { name: 'Krembangan', code: 'krembangan', rayon: 'UTARA', region: 'utara' },
  { name: 'Pabean Cantian', code: 'pabean_cantian', rayon: 'UTARA', region: 'utara' },
  { name: 'Semampir', code: 'semampir', rayon: 'UTARA', region: 'utara' },
  { name: 'Kenjeran', code: 'kenjeran', rayon: 'UTARA', region: 'utara' },
  { name: 'Bulak', code: 'bulak', rayon: 'UTARA', region: 'utara' },
  { name: 'Wonokromo', code: 'wonokromo', rayon: 'SELATAN', region: 'selatan' },
  { name: 'Wonocolo', code: 'wonocolo', rayon: 'SELATAN', region: 'selatan' },
  { name: 'Gayungan', code: 'gayungan', rayon: 'SELATAN', region: 'selatan' },
  { name: 'Jambangan', code: 'jambangan', rayon: 'SELATAN', region: 'selatan' },
];

function requireStrongEnvPassword(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 12) {
    throw new Error(
      `${name} must be set in the environment (min 12 chars). Refusing to seed production admin accounts.`,
    );
  }
  return value;
}

async function seedProduction(): Promise<void> {
  const superadminPassword = requireStrongEnvPassword('PROD_SUPERADMIN_PASSWORD');
  const adminSystemPassword = requireStrongEnvPassword('PROD_ADMIN_SYSTEM_PASSWORD');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    entities: [],
    synchronize: false,
  });
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    console.log('🌱 SEKAR production seeder (non-destructive, upsert-only)\n');

    // 1. Rayons
    for (const rayon of RAYONS) {
      await queryRunner.query(
        `INSERT INTO rayons (name, code, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO NOTHING`,
        [rayon.name, rayon.code, rayon.description],
      );
    }
    // Real polygon boundaries + centroids from the official KMZ
    for (const code of Object.keys(RAYON_BOUNDARIES) as RayonCode[]) {
      const polygon = RAYON_BOUNDARIES[code];
      if (!polygon) continue;
      const ring = polygon.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number]);
      const centroid = computeCentroidFromRings([ring]);
      await queryRunner.query(
        `UPDATE rayons SET
           center_lat = $1, center_lng = $2,
           boundary_polygon = $3::jsonb, boundary_computed_at = NOW()
         WHERE code = $4 AND boundary_polygon IS NULL`,
        [centroid.lat, centroid.lng, JSON.stringify(polygon), code],
      );
    }
    // Office/landmark center overrides (only when still at the default)
    await queryRunner.query(
      `UPDATE rayons SET center_lat = $1, center_lng = $2 WHERE code = 'PUSAT' AND center_lat IS NULL`,
      [-7.2745614, 112.7579174],
    );
    await queryRunner.query(
      `UPDATE rayons SET center_lat = $1, center_lng = $2 WHERE code = 'TAMAN_AKTIF' AND center_lat IS NULL`,
      [-7.291347, 112.739764],
    );
    console.log(`  ✓ ${RAYONS.length} rayons upserted (boundaries from KMZ where unset)`);

    // 2. Shift definitions
    for (const shift of SHIFT_DEFINITIONS) {
      await queryRunner.query(
        `INSERT INTO shift_definitions (name, code, start_time, end_time, crosses_midnight, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (code) DO NOTHING`,
        [shift.name, shift.code, shift.start, shift.end, shift.crossesMidnight],
      );
    }
    console.log(`  ✓ ${SHIFT_DEFINITIONS.length} shift definitions upserted`);

    // 3. Kecamatans (public pruning intake)
    for (const kecamatan of KECAMATANS) {
      await queryRunner.query(
        `INSERT INTO kecamatans (name, code, rayon_id, region)
         SELECT $1, $2, r.id, $4 FROM rayons r WHERE r.code = $3
         ON CONFLICT (code) DO NOTHING`,
        [kecamatan.name, kecamatan.code, kecamatan.rayon, kecamatan.region],
      );
    }
    console.log(`  ✓ ${KECAMATANS.length} kecamatans upserted`);

    // 4. Admin accounts (passwords from env, never logged)
    const admins = [
      {
        username: 'superadmin',
        fullName: 'Super Administrator',
        role: 'superadmin',
        password: superadminPassword,
      },
      {
        username: 'admin_system',
        fullName: 'Administrator Sistem',
        role: 'admin_system',
        password: adminSystemPassword,
      },
    ];
    for (const admin of admins) {
      const hash = await bcrypt.hash(admin.password, 10);
      await queryRunner.query(
        `INSERT INTO users (username, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [admin.username, hash, admin.fullName, admin.role],
      );
    }
    console.log('  ✓ superadmin + admin_system upserted (existing accounts untouched)');

    console.log('\n✅ Production seed complete. Next steps:');
    console.log('   1. Import area boundaries via the KMZ import page (admin_system)');
    console.log('   2. Bulk-load workers via CSV import');
    console.log('   3. Optional: npm run db:seed:phase3 reference portion for the plant catalog');
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedProduction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Production seeding failed:', error.message);
    process.exit(1);
  });
