import * as Sentry from '@sentry/nextjs';

/**
 * Server/edge-side Sentry init (Next.js `instrumentation` entry).
 *
 * No-op when no DSN is set. The web's server surface is thin (it proxies to the
 * NestJS backend, which has its own Sentry), so this mainly captures SSR/RSC and
 * route-handler errors. Reads `NEXT_PUBLIC_SENTRY_DSN` (also visible server-side),
 * falling back to a private `SENTRY_DSN` if one is ever set.
 */
export async function register(): Promise<void> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1');
  const common = {
    dsn,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_BUILD_SHA,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
  } as const;

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(common);
  }
}

// Captures errors thrown in nested React Server Components (Next.js hook).
export const onRequestError = Sentry.captureRequestError;
