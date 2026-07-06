import { config } from '@dotenvx/dotenvx';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Centralised environment-file loading for the backend.
 *
 * Local dev uses `.env.local`; deploys use `.env.<NODE_ENV>` (e.g. `.env.staging`,
 * `.env.production`). In every case `.env` is kept as a final fallback so a single
 * shared base file can hold values common to all environments.
 *
 * Loaded via **dotenvx** (a drop-in for dotenv): the committed `.env.staging` /
 * `.env.production` files store secrets as `encrypted:…` ciphertext and are
 * decrypted in-memory at boot using the matching `DOTENV_PRIVATE_KEY_<ENV>` taken
 * from the process env (the one secret on the host). Plaintext values (e.g. the
 * gitignored `.env.local` used in dev) pass through unchanged, so local dev needs
 * no key. See `specs/deployment/encrypted-secrets.md`.
 *
 * Precedence (highest first): real process env > first matching file > later files.
 * `override: false` means an already-set variable is never clobbered, so an
 * exported shell var (or an earlier file in the list) always wins. This also keeps
 * the legacy compose `env_file` injection authoritative during the SSM→dotenvx
 * cutover.
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
      // `quiet` silences dotenvx's "injecting env" stdout banner; `override: false`
      // preserves already-set process.env (shell exports, earlier files, compose).
      config({ path, override: false, quiet: true });
    }
  }
}

loadEnv();
