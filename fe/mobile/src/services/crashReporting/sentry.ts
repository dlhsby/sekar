import * as Sentry from '@sentry/react-native';
import {
  SENTRY_DSN_MOBILE,
  SENTRY_RELEASE,
  SENTRY_ENVIRONMENT,
  SENTRY_TRACES_SAMPLE_RATE,
} from '@env';

/** Override shape for `initSentry` (defaults come from `@env`). */
export interface SentryConfig {
  dsn?: string;
  release?: string;
  environment?: string;
  tracesSampleRate?: number;
}

// Set once init succeeds so captureException can no-op cheaply without re-reading
// the (build-inlined) @env bindings.
let enabled = false;

/**
 * Initialize Sentry on the mobile client (Phase 4-1 B4).
 *
 * Config defaults come from `@env` (react-native-dotenv) — the app's env
 * convention; `index.js` calls this with no args at startup. No-op when there's
 * no DSN (default in development), so dev builds don't ship to the prod project.
 * Overrides are accepted primarily for testing.
 *
 * Call before the React tree mounts so init-time errors are captured.
 */
export function initSentry(config: SentryConfig = {}): boolean {
  const dsn = config.dsn ?? SENTRY_DSN_MOBILE;
  if (!dsn) return false;

  const rawRate = config.tracesSampleRate ?? Number(SENTRY_TRACES_SAMPLE_RATE ?? '0.1');
  const tracesSampleRate = Number.isFinite(rawRate) ? rawRate : 0.1;

  Sentry.init({
    dsn,
    release: config.release ?? (SENTRY_RELEASE || undefined),
    environment: config.environment ?? (SENTRY_ENVIRONMENT || 'development'),
    tracesSampleRate,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
  });

  enabled = true;
  return true;
}

/**
 * Capture an exception with conventional tags. No-op until `initSentry` succeeds.
 */
export function captureException(
  err: unknown,
  context?: { userId?: string; role?: string; screen?: string },
): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.role) scope.setTag('role', context.role);
    if (context?.screen) scope.setTag('screen', context.screen);
    Sentry.captureException(err);
  });
}
