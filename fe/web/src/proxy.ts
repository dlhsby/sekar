import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Route-protection proxy (Phase 2C middleware, reworked + renamed for the
 * Next 16 proxy.ts convention in Phase 4-8 — middleware.ts no longer runs in dev).
 *
 * Default-deny: every route requires the access_token cookie except the
 * explicit public paths. The previous allowlist used `startsWith('/')`,
 * which (a) protected the public forgot-password page (ADR-041) and the
 * PWA offline/install pages, and (b) silently left newer sections to
 * client-side guards only.
 */
const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/offline',
  '/install-help',
  // Public mobile-app download landing pages (field workers reach these logged-out / via QR).
  '/android',
  '/ios',
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Skip API, Next internals, and any static file with an extension
  // (manifest.webmanifest, sw.js, icons — the PWA must work logged-out).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
