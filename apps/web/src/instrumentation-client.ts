import * as Sentry from '@sentry/nextjs';

/**
 * Browser-side Sentry init (Next.js `instrumentation-client` entry).
 *
 * No-op when `NEXT_PUBLIC_SENTRY_DSN` is unset (default in local dev) so dev
 * workflows don't ship events. Mirrors the backend (`apps/be/src/common/sentry`)
 * and mobile (`apps/mobile/src/services/crashReporting`) no-op-when-empty pattern.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'development',
    release: process.env.NEXT_PUBLIC_BUILD_SHA,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    // Session Replay is opt-in: off by default to keep the bundle lean and avoid
    // capturing PII without an explicit privacy decision.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Lets Sentry tie client-side navigations to transactions (App Router).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
