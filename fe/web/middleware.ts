import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for route protection
 *
 * Protects dashboard routes by checking for access_token cookie
 * Redirects unauthenticated users to login
 * Redirects authenticated users away from login
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // Public paths (login page)
  // Always allow access to login page regardless of token presence
  // The login page will handle clearing stale cookies and redirecting if truly authenticated
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Protected paths (dashboard and all data management routes)
  const protectedPaths = ['/', '/users', '/areas', '/rayons', '/schedules', '/monitoring', '/reports', '/tasks', '/settings'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtected) {
    if (!token) {
      // Not logged in, redirect to login with redirect parameter
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    // Logged in, allow access
    return NextResponse.next();
  }

  // All other paths, allow access
  return NextResponse.next();
}

/**
 * Matcher configuration
 * Run middleware on all routes except:
 * - API routes
 * - Next.js static files
 * - Next.js image optimization
 * - Favicon
 */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
