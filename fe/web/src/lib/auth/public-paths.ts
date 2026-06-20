/**
 * Routes reachable WITHOUT authentication — the single source of truth shared by:
 *  - the route-guard proxy (`src/proxy.ts`, server/edge), and
 *  - the API client's 401 redirect guard (`src/lib/api/client.ts`, browser),
 *
 * so a background 401 on a public page (e.g. the `/android` app-download page)
 * never bounces a visitor to `/login`. Keep this in sync with nothing else —
 * everything imports from here.
 */
export const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/offline',
  '/install-help',
  '/android',
  '/ios',
] as const;

/** True if `pathname` is a public route (exact match or a sub-path of one). */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
