import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Centralised environment-file loading for the backend.
 *
 * Local dev uses `.env.local`; deploys use `.env.<NODE_ENV>` (e.g. `.env.staging`,
 * `.env.production`). In every case `.env` is kept as a final fallback so a single
 * shared base file can hold values common to all environments.
 *
 * Precedence (highest first): real process env > first matching file > later files.
 * `override: false` means an already-set variable is never clobbered, so an
 * exported shell var (or an earlier file in the list) always wins.
 *
 * Imported for its side effect at the very top of `main.ts` (before any module
 * whose decorators read env at evaluation time, e.g. `@Throttle`), and by the
 * TypeORM CLI data-source + seed scripts which run outside the Nest lifecycle.
 */
export function getEnvFilePaths(): string[] {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  // Anything that isn't a recognised deploy env is treated as local development.
  const primary =
    nodeEnv === 'production' || nodeEnv === 'staging' || nodeEnv === 'test'
      ? `.env.${nodeEnv}`
      : '.env.local';
  return [primary, '.env'];
}

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const file of getEnvFilePaths()) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      config({ path, override: false });
    }
  }
}

loadEnv();
