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
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
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
