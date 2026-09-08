/**
 * E2E Test Setup
 *
 * Runs before the e2e suite to configure the environment.
 */
import { config } from '@dotenvx/dotenvx';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Set NODE_ENV to test before any modules are loaded — this disables the global
// rate-limit guard and other production-only behaviour.
process.env.NODE_ENV = 'test';

// Increase rate limiting to effectively disable it in tests
process.env.THROTTLE_TTL = '60000';
process.env.THROTTLE_LIMIT = '100000';

/**
 * Load real env values for the app the e2e specs boot.
 *
 * An e2e imports `AppModule` directly, so it never runs `main.ts` and never
 * triggers the app's own `load-env` side effect. With `NODE_ENV=test` that
 * loader would look for `.env.test` anyway, while local dev keeps its config
 * (notably a non-default `DATABASE_PORT`) in `.env.local` — so every suite died
 * on `ECONNREFUSED 127.0.0.1:5432`, connecting to a Postgres that isn't there.
 *
 * `override: false` and this order mean an explicit CI-provided variable always
 * wins over a file, and `.env.test` wins over local dev values when present.
 */
for (const file of ['.env.test', '.env.local', '.env']) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) {
    config({ path, override: false, quiet: true });
  }
}
