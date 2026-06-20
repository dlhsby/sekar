# Web Authentication Specification

**Last Updated:** 2026-06-20
**Status:** Phase 4–5 Complete (AuthContext + httpOnly cookies; NextAuth.js deprecated)

---

## Overview

Authentication for the SEKAR web dashboard using JWT tokens with **AuthContext** (custom context provider) for session management. HTTP-only cookies + route guard middleware (`src/proxy.ts`).

> **BREAKING CHANGE (Phase 3 M1-R):** NextAuth.js was replaced by a custom `AuthContext` + middleware route guard. See [specs/deployment/deployment-guide.md](../deployment/deployment-guide.md) §Web Auth and Phase 3 changesets for migration details.

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Auth Library | React Context API (custom AuthContext) — NOT NextAuth.js |
| Session Storage | JWT (stateless, decoded on client) |
| Token Storage | **HTTP-only cookies** (httpOnly: true, Secure, SameSite: Strict) |
| API Auth | Bearer token in `Authorization` header |
| Route protection | Middleware `src/proxy.ts` (Next.js 16 Root Middleware) — NOT NextAuth route guards |

---

## Authentication Flow

### Login Flow

```
1. User submits credentials (username/password)
2. Frontend calls POST /api/auth/login
3. Backend validates credentials
4. Backend returns access_token + refresh_token
5. Frontend stores tokens in HTTP-only cookies
6. Frontend redirects to dashboard
```

### Token Refresh Flow

```
1. Access token expires (after 15 minutes)
2. API returns 401 Unauthorized
3. Axios interceptor catches 401
4. Interceptor calls POST /api/auth/refresh
5. Backend validates refresh_token
6. Backend returns new access_token
7. Original request retries with new token
```

### Logout Flow

```
1. User clicks logout
2. Frontend calls POST /api/auth/logout
3. Backend blacklists refresh_token
4. Frontend clears cookies
5. Frontend redirects to login
```

---

## AuthContext Configuration (Phase 3 M1-R+)

**Location:** `fe/web/src/context/AuthContext.tsx`

The custom `AuthContext` provides JWT authentication without NextAuth.js. Route protection is handled by middleware `src/proxy.ts` (Next.js 16 Root Middleware).

```typescript
// fe/web/src/context/AuthContext.tsx (simplified)
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount: check if httpOnly cookie has a valid session
    // Middleware src/proxy.ts guards unauthenticated access
    bootstrapAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include', // sends httpOnly cookie
    });
    if (!response.ok) throw new Error('Login failed');
    const data = await response.json();
    setUser(data.user);
    // Cookie set automatically by server (httpOnly: true)
  };

  const logout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
};
```

Route protection flow:
1. User navigates to `/dashboard` (protected route)
2. Middleware `src/proxy.ts` intercepts the request
3. If no valid httpOnly cookie → redirect to `/login`
4. If valid cookie → route proceeds, `AuthContext` populates `user` from `GET /auth/me`
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## Session Types

```typescript
// types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'Admin' | 'Supervisor' | 'Worker';
    accessToken: string;
    refreshToken: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      role: 'Admin' | 'Supervisor' | 'Worker';
    };
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'Admin' | 'Supervisor' | 'Worker';
    accessToken: string;
    refreshToken: string;
  }
}
```

---

## Protected Routes

### Middleware

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only routes
    if (path.startsWith('/admin') && token?.role !== 'Admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Supervisor+ routes
    if (
      path.startsWith('/supervisor') &&
      !['Admin', 'Supervisor'].includes(token?.role as string)
    ) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/supervisor/:path*',
    '/workers/:path*',
    '/areas/:path*',
    '/assets/:path*',
    '/reports/:path*',
  ],
};
```

### Server Component Auth

```typescript
// lib/auth.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'Admin') {
    redirect('/unauthorized');
  }
  return session;
}

export async function requireSupervisor() {
  const session = await requireAuth();
  if (!['Admin', 'Supervisor'].includes(session.user.role)) {
    redirect('/unauthorized');
  }
  return session;
}
```

### Usage in Server Components

```typescript
// app/(dashboard)/admin/users/page.tsx
import { requireAdmin } from '@/lib/auth';

export default async function UsersPage() {
  const session = await requireAdmin();

  // Fetch data with session token
  const users = await fetchUsers(session.accessToken);

  return <UsersTable users={users} />;
}
```

---

## Client-Side Auth

### Auth Hook

```typescript
// hooks/useAuth.ts
import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  const login = async (username: string, password: string) => {
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error('Invalid credentials');
    }

    return result;
  };

  const logout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return {
    user: session?.user,
    accessToken: session?.accessToken,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login,
    logout,
  };
}
```

### Protected Client Component

```typescript
// components/auth/ProtectedComponent.tsx
'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface ProtectedComponentProps {
  children: React.ReactNode;
  allowedRoles?: ('Admin' | 'Supervisor' | 'Worker')[];
}

export function ProtectedComponent({
  children,
  allowedRoles,
}: ProtectedComponentProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <LoadingSpinner />;
  }

  if (!session) {
    redirect('/login');
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
```

---

## API Client with Auth

```typescript
// lib/api/client.ts
import axios from 'axios';
import { getSession } from 'next-auth/react';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor - add token
apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// Response interceptor - handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Trigger session refresh
      const session = await getSession();
      if (session?.accessToken) {
        originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Login Page

```typescript
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Username atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        name="username"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Login'}
      </Button>
    </form>
  );
}
```

---

## Role-Based UI

```typescript
// components/auth/RoleGate.tsx
'use client';

import { useSession } from 'next-auth/react';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: ('Admin' | 'Supervisor' | 'Worker')[];
  fallback?: React.ReactNode;
}

export function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const { data: session } = useSession();

  if (!session || !allowedRoles.includes(session.user.role)) {
    return fallback || null;
  }

  return <>{children}</>;
}

// Usage
<RoleGate allowedRoles={['Admin']}>
  <DeleteUserButton userId={user.id} />
</RoleGate>
```

---

## Security Best Practices

### Cookie Configuration

```typescript
// next.config.js
module.exports = {
  // ... other config
};

// In NextAuth options
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
},
```

### CSRF Protection

NextAuth.js provides built-in CSRF protection. Additional measures:

```typescript
// Verify origin in API routes
export async function POST(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigins = [process.env.NEXTAUTH_URL];

  if (!allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // ... handle request
}
```

---

## Environment Variables

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-min-32-chars

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000/api
API_URL=http://localhost:3000/api
```

---

## Testing Auth

```typescript
// __tests__/auth.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import LoginPage from '@/app/login/page';

describe('LoginPage', () => {
  it('should show error on invalid credentials', async () => {
    render(
      <SessionProvider session={null}>
        <LoginPage />
      </SessionProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'invalid' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByText('Username atau password salah')).toBeInTheDocument();
    });
  });
});
```

---

---

## Phase 2E: Planned Changes (Client Feedback II)

> **Full specification:** See [`specs/phases/phase-2-e-client-feedback-2/web.md`](../phases/phase-2-e-client-feedback-2/web.md)
> **ADR:** [ADR-012: Phone Number Login](../architecture/decisions/ADR-012-phone-number-login.md)

### Login Form Changes
- Label: "Username" → "Username atau Nomor HP"
- Field name: `username` → `identifier`
- API call: `{ identifier, password }` (accepts phone number or username)
- Phone format validation: `^(\+62|0)[0-9]{8,13}$` (for input hints, not blocking)

### Type Changes
```typescript
// lib/types.ts
export interface LoginRequest {
  identifier: string; // was: username
  password: string;
}
```

**Last Updated:** 2026-03-10
