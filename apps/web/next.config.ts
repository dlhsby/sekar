import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { withSentryConfig } from "@sentry/nextjs";

// Build identity inlined into the bundle (surfaced in the sidebar footer for deploy
// verification). Version comes from package.json; SHA/time from CI build args
// (GIT_SHA / BUILD_TIME — same names the backend image uses), 'dev' locally.
const pkgVersion = (() => {
  try {
    return (JSON.parse(readFileSync('./package.json', 'utf8')) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',

  // Allow a LAN host (e.g. a phone) to fetch Next dev resources (/_next/*, HMR)
  // when serving via `./scripts/start.sh --lan`. Next 16 blocks cross-origin dev
  // resources by default, which otherwise stalls client hydration (the page
  // stays stuck on the server-rendered loading gate). Populated from an env var
  // by the LAN script; empty (and thus a no-op) in normal dev + production.
  allowedDevOrigins: (process.env.SEKAR_ALLOWED_DEV_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Pin the Turbopack workspace root to this app dir. The repo has two
  // lockfiles (root tooling + this workspace), so Turbopack would otherwise
  // infer the repo root and resolve dev chunks from the wrong directory
  // (ChunkLoadError). cwd is always apps/web for next dev/build (the scripts run
  // here — the same assumption as the ./package.json read above).
  turbopack: {
    root: process.cwd(),
  },

  env: {
    NEXT_PUBLIC_APP_VERSION: pkgVersion,
    NEXT_PUBLIC_BUILD_SHA: process.env.GIT_SHA || 'dev',
    NEXT_PUBLIC_BUILD_TIME: process.env.BUILD_TIME || 'dev',
  },

  // Compress static files
  compress: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // LAN/phone testing: when started via `./scripts/start.sh --lan`, proxy the
  // API (and monitoring socket) through the web origin so only the web port must
  // be reachable from the phone — no separate backend-port firewall rule and no
  // CORS. Guarded by an env flag so normal dev/build is unaffected.
  async rewrites() {
    if (process.env.SEKAR_LAN_PROXY !== '1') return [];
    const be = `http://127.0.0.1:${process.env.SEKAR_API_PORT || '3000'}`;
    return [
      { source: '/api/:path*', destination: `${be}/api/:path*` },
      { source: '/socket.io/:path*', destination: `${be}/socket.io/:path*` },
    ];
  },

  // Security + SW headers
  // Note: to rebuild the service worker after editing src/sw/sw.ts, run:
  //   npm run sw:build
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // Allow the service worker to control the full origin scope
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};

/**
 * Wrap with Sentry. Runtime error capture is driven by the instrumentation files
 * (no-op without NEXT_PUBLIC_SENTRY_DSN). Source-map upload only runs when
 * SENTRY_AUTH_TOKEN is present (CI/staging), so local/dev builds are unaffected.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Avoid bundling the Sentry build-time webpack plugin into the runtime image.
  telemetry: false,
});
