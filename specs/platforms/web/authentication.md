# Web Authentication Specification

**Last Updated:** 2026-06-20
**Status:** Current (custom `AuthContext` + JWT cookies; NextAuth.js removed in Phase 3 M1-R)

The SEKAR web dashboard authenticates with the backend's JWT endpoints through a **custom React
`AuthContext`** (no NextAuth.js). This doc reflects the actual implementation — see the files it
references for the source of truth.

---

## At a glance

| Concern | Implementation |
|---------|----------------|
| Session/state | Custom `AuthProvider` (React context) — `apps/web/src/lib/auth/context.tsx` |
| Hooks | `apps/web/src/lib/auth/hooks.ts` — `useAuth`, `useUser`, `useRequireAuth`, `useHasRole`, `useIsAuthenticated` |
| Token store | **Client-readable cookies** `access_token` (7-day max-age) + `refresh_token` (30-day) — `apps/web/src/lib/utils/cookies.ts`. `sameSite=lax`, `secure` when `NEXT_PUBLIC_SECURE_COOKIES=true`. **Not httpOnly** (the API client reads them in JS). |
| API auth | Axios request interceptor adds `Authorization: Bearer <access_token>` — `apps/web/src/lib/api/client.ts` |
| Token refresh | Response interceptor auto-refreshes on 401 via `POST /auth/refresh`, then retries the original request |
| Route protection | `apps/web/src/proxy.ts` (Next.js route-guard "proxy" middleware) — default-deny, public allowlist in `apps/web/src/lib/auth/public-paths.ts` |
| Backend tokens | JWT 15-min access + 7-day refresh **with rotation** (Passport); logout blacklists both |
| Roles | 8 + `staff_kecamatan` (lowercase, ADR-009/032) — **not** Admin/Supervisor/Worker |

> NextAuth.js was removed in Phase 3 M1-R. There is **no** `NEXTAUTH_URL`/`NEXTAUTH_SECRET`,
> `[...nextauth]` route, `getServerSession`, `useSession`, or `next-auth/middleware`.

---

## Auth flows

**Login** — `AuthProvider.login()`:
1. `POST /api/v1/auth/login` with `{ identifier, password }` (`identifier` = username **or** phone, ADR-012).
2. Backend returns `{ access_token, refresh_token, user }`.
3. Client stores both tokens via `setAuthCookie` (`access_token` 7d, `refresh_token` 30d).
4. Redirect to `/change-password` if `user.password_must_change` (admin-reset gate, ADR-041), else `/`.

**Session bootstrap** — on mount, `AuthProvider.checkAuth()` (skipped on `/login` + `/forgot-password`)
calls `GET /auth/me`; success populates `user`, failure clears cookies and leaves `user = null`.

**Token refresh** — the response interceptor catches a `401` (other than on `/auth/login` / `/auth/refresh`),
calls `POST /auth/refresh` with the refresh cookie, stores the rotated tokens, and retries the original
request. If refresh fails it calls `redirectToLogin()` — which **does nothing on a public path** (so a
background 401 on `/android` etc. never bounces the visitor; see Route protection).

**Logout** — `AuthProvider.logout()` calls `POST /auth/logout` (best-effort token blacklist), clears
cookies, and redirects to `/login`.

**Forced password change** — while `user.password_must_change` is true, an effect redirects any route
except `/change-password` there (mirrors the mobile `RootNavigator` gate).

---

## AuthContext

`apps/web/src/lib/auth/context.tsx` exposes:

```ts
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>; // rotates tokens (ADR-041)
  refreshUser: () => Promise<void>;
  clearError: () => void;
}
```

Mounted once in the root layout via `Providers` (`apps/web/src/app/providers.tsx`). Consume it with the
hooks below — never read cookies or call `/auth/*` directly from components.

```ts
const { user, loading, login, logout } = useAuth();   // full context
const user = useUser();                                // user | null
const canManage = useHasRole(['admin_system', 'superadmin']);
useRequireAuth(['kepala_rayon', 'management']);    // client guard: redirects if absent/!role
```

---

## Route protection (`src/proxy.ts`)

Default-deny middleware: every route requires the `access_token` cookie **except** the public
allowlist. The allowlist is the single shared module `apps/web/src/lib/auth/public-paths.ts` — also
honored by the API client's 401 guard, so the two can't drift:

```ts
export const PUBLIC_PATHS = ['/login', '/forgot-password', '/offline', '/install-help', '/android', '/ios'];
```

A missing token on a protected route redirects to `/login?redirect=<original-path>`. The matcher skips
`/api`, Next internals, and any file with an extension (so the PWA + static assets work logged-out).

> Server middleware only checks for the cookie's presence; **authorization** (role checks) is enforced
> by the backend on every endpoint and, for UX, by `useRequireAuth(roles)` on the client.

---

## API client (`src/lib/api/client.ts`)

- **Request interceptor:** reads `access_token` from the cookie and sets `Authorization: Bearer …`.
- **Response interceptor:** on `401` → single-flight refresh via `POST /auth/refresh` (queues
  concurrent requests), stores rotated tokens, retries. On refresh failure → `redirectToLogin()`,
  which early-returns when `isPublicPath(window.location.pathname)` is true.

```ts
import { authApi } from '@/lib/api/auth';
authApi.login({ identifier, password });   // POST /auth/login
authApi.getCurrentUser();                  // GET  /auth/me
authApi.refreshToken();                    // POST /auth/refresh
authApi.changePassword(payload);           // POST /auth/change-password (rotates tokens)
authApi.logout();                          // POST /auth/logout (blacklists tokens)
```

---

## Role-based UI

Gate UI with the role helpers (roles are lowercase, ADR-009):

```tsx
const isAdmin = useHasRole(['admin_system', 'superadmin']);
{isAdmin && <DeleteUserButton userId={user.id} />}
```

`useRequireAuth(requiredRoles)` redirects to `/login?redirect=…` when unauthenticated, or to
`/dashboard?error=access_denied` when the role is insufficient. Role values:
`satgas`, `linmas`, `korlap`, `admin_rayon`, `kepala_rayon`, `management`, `admin_system`,
`superadmin`, `staff_kecamatan`.

---

## Security notes

- **Why not httpOnly?** The SPA reads the access token in JS to attach the `Bearer` header and to
  drive client-side guards, so the cookies are intentionally JS-readable. The XSS exposure is
  mitigated by a **short access-token TTL (15 min)**, **refresh-token rotation + server blacklist on
  logout**, the backend's Helmet **CSP/HSTS**, and `sameSite=lax`. Set
  **`NEXT_PUBLIC_SECURE_COOKIES=true`** in any HTTPS deployment so cookies carry `Secure`.
- The forced-password-change gate (ADR-041) blocks all routes until an admin-reset user sets a new
  password.
- Rate limiting: 5 login attempts/min (backend throttle).

---

## Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000        # backend origin (client appends /api/v1)
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_SECURE_COOKIES=false                 # true on HTTPS (adds `Secure` to auth cookies)
```

There are **no** `NEXTAUTH_*` variables.

---

## Related

- Backend auth contract: [`../api/authentication.md`](../../api/authentication.md) · live: Swagger `/api/v1/docs`
- Phone login: [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md) · Forgot password: [ADR-041](../../architecture/decisions/ADR-041-forgot-password-contact-admin.md)
- Roles: [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md)
