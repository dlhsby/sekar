import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry on the mobile client.
 *
 * No-op when `SENTRY_DSN_MOBILE` is unset (default in development), so
 * dev builds don't ship events to the production project.
 *
 * Call before the React tree mounts so init-time errors are captured.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN_MOBILE;
  if (!dsn) return false;

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE,
    environment: process.env.SENTRY_ENVIRONMENT ?? 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
  });

  return true;
}

/**
 * Capture an exception with conventional tags.
 * No-op if Sentry isn't initialized.
 */
export function captureException(
  err: unknown,
  context?: { userId?: string; role?: string; screen?: string },
): void {
  if (!process.env.SENTRY_DSN_MOBILE) return;
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId });
    if (context?.role) scope.setTag('role', context.role);
    if (context?.screen) scope.setTag('screen', context.screen);
    Sentry.captureException(err);
  });
}
