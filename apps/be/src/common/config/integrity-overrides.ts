/**
 * Server-side anti-spoofing dev overrides.
 *
 * The ONLY place these env flags are read, mirroring the mobile app's
 * `src/config/integrity.ts`. A check that reads its own flag is a check that
 * can be forgotten at one call site and silently stop enforcing.
 *
 * Why this exists: the Android emulator supplies location through a mock
 * provider, so every fix it produces is flagged `mocked`. Without an override
 * the ping stream is refused wholesale on an emulator and a worker can never be
 * tracked in development — the punch would land but the map would stay empty.
 *
 * Why it is env-gated and NOT a database setting: this is a security bypass.
 * A DB-backed toggle would be reachable by anything that can write a settings
 * row, which is exactly the surface that must not be able to disable integrity
 * checks. An env var requires access to the deployment itself.
 *
 * Fails closed twice over — the flag must be the exact string "true" AND the
 * process must not be running in production. Either condition alone is enough
 * to keep enforcement on.
 */

/**
 * Whether a fix the client reports as mock-provided may be accepted.
 *
 * `env` is a parameter rather than a direct `process.env` read so the branches
 * are testable without mutating global state in a test run — the same seam the
 * mobile side uses for `isOverrideEnabled`.
 */
export const mockedLocationAllowed = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.NODE_ENV !== 'production' && env.ALLOW_MOCKED_LOCATION === 'true';
