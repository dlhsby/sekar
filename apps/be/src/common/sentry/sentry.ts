import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

/**
 * Initialize Sentry SDK for the backend.
 *
 * No-op when `SENTRY_DSN` is unset (default in development), so dev
 * workflows don't ship events to the production project.
 *
 * Call this **before** `NestFactory.create(AppModule)` so app-factory
 * errors are captured.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    integrations: [nodeProfilingIntegration()],
    profilesSampleRate: 0.1,
  });

  return true;
}

/**
 * Capture an exception with the SEKAR conventional tags.
 * No-op if Sentry isn't initialized.
 */
export function captureException(
  err: unknown,
  context?: { userId?: string; role?: string; requestId?: string; route?: string },
): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context?.userId) scope.setUser({ id: context.userId, role: context.role });
    if (context?.requestId) scope.setTag('request_id', context.requestId);
    if (context?.route) scope.setTag('route', context.route);
    Sentry.captureException(err);
  });
}
