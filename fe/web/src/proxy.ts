import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isPublicPath } from '@/lib/auth/public-paths';

/**
 * Route-protection proxy (Phase 2C middleware, reworked + renamed for the
 * Next 16 proxy.ts convention in Phase 4-8 — middleware.ts no longer runs in dev).
 *
 * Default-deny: every route requires the access_token cookie except the
 * public paths. Public routes are the single shared list in
 * `@/lib/auth/public-paths` (also honored by the API client's 401 guard, so a
 * background 401 on a public page can't bounce the visitor to /login).
 */
// Auth pages an *already-authenticated* visitor should be bounced away from.
const AUTH_PAGES = ['/login', '/forgot-password'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // Already signed in → don't show the login / forgot-password pages.
  // (A stale token self-corrects: the dashboard's session check clears it and
  // bounces back here, where the cookie is now gone and the page renders.)
  if (token && AUTH_PAGES.includes(pathname)) {
    const rp = request.nextUrl.searchParams.get('redirect');
    // Only honor safe, in-app paths (no open redirects, no auth-page loop).
    const dest = rp && rp.startsWith('/') && !AUTH_PAGES.includes(rp) ? rp : '/';
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

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
