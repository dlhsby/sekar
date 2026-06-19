import type { NextConfig } from "next";
import { readFileSync } from "fs";

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

export default nextConfig;
