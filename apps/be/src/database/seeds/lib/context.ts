import { DataSource, QueryRunner } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import '../../../config/load-env';

/**
 * Seed context threaded through every per-entity seeder.
 *
 * Replaces the old per-phase scripts: each `entities/<name>.ts` exports a
 * `seedX(ctx)` that owns exactly one table, and each `profiles/<name>.ts`
 * composes them in FK order. The profile owns the DataSource/queryRunner
 * lifecycle via {@link runProfile}; entity seeders only touch `ctx.qr`.
 */
export type SeedMode = 'demo' | 'staging' | 'production' | 'reference';

/** Runtime id lookups shared across entity seeders (built as they run). */
export interface SeedMaps {
  /** rayon code (BARAT1, TAMAN_AKTIF, …) → rayon UUID. */
  rayonIdByCode: Map<string, string>;
  /** plant species name → UUID (phase-3 area_plants/notable_plants). */
  speciesIdByName: Map<string, string>;
}

export interface SeedContext {
  ds: DataSource;
  qr: QueryRunner;
  mode: SeedMode;
  maps: SeedMaps;
  log: (message: string) => void;
}

function dbConfig(
  overrides: { synchronize?: boolean; entities?: string[] } = {},
): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    logging: false,
    ...overrides,
  };
}

/** True when the public schema has no tables (fresh DB → let TypeORM sync it). */
async function schemaIsEmpty(): Promise<boolean> {
  const probe = new DataSource(dbConfig({ synchronize: false }));
  await probe.initialize();
  try {
    const [{ count }] = await probe.query<[{ count: string }]>(
      `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    return parseInt(count, 10) === 0;
  } finally {
    await probe.destroy();
  }
}

/**
 * Initialise the DataSource + queryRunner, build the context, run `body`, then
 * tear everything down and `process.exit`. A fresh (empty) schema triggers
 * `synchronize` so a brand-new DB can be seeded without a prior migration run —
 * mirroring the old seed-phase1 behaviour.
 */
export async function runProfile(
  mode: SeedMode,
  body: (ctx: SeedContext) => Promise<void>,
): Promise<void> {
  const empty = await schemaIsEmpty();
  const ds = new DataSource(
    dbConfig({
      synchronize: empty,
      entities: empty ? [__dirname + '/../../../**/*.entity{.ts,.js}'] : [],
    }),
  );
  await ds.initialize();
  const qr = ds.createQueryRunner();
  const ctx: SeedContext = {
    ds,
    qr,
    mode,
    maps: { rayonIdByCode: new Map(), speciesIdByName: new Map() },
    log: (m) => console.log(m),
  };
  try {
    await body(ctx);
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

/** CLI wrapper: run a profile and set the process exit code. */
export function runProfileCli(mode: SeedMode, body: (ctx: SeedContext) => Promise<void>): void {
  runProfile(mode, body)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
