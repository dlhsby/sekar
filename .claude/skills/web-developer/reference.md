# Web Developer Reference

Advanced patterns, testing strategies, and best practices for Next.js and React development.

## Next.js App Router Patterns

### Layouts and Templates

```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';
import { authOptions } from '@/lib/auth/config';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col">
        <Header user={session.user} />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
```

### Loading and Error States

```typescript
// app/(dashboard)/workers/loading.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export default function WorkersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="border rounded-lg">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

// app/(dashboard)/workers/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function WorkersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Workers page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Parallel Routes

```typescript
// app/(dashboard)/@modal/(.)workers/[id]/page.tsx
import { Modal } from '@/components/ui/Modal';
import { WorkerDetail } from '@/components/features/workers/WorkerDetail';

export default function WorkerModal({ params }: { params: { id: string } }) {
  return (
    <Modal>
      <WorkerDetail id={params.id} />
    </Modal>
  );
}

// app/(dashboard)/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
```

### Route Handlers with Middleware

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role-based route protection
    if (path.startsWith('/admin') && token?.role !== 'Admin') {
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
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

### Server Actions

```typescript
// app/actions/workers.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/config';

const createWorkerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  areaId: z.string().uuid(),
});

export async function createWorker(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === 'Worker') {
    throw new Error('Unauthorized');
  }

  const validated = createWorkerSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
    areaId: formData.get('areaId'),
  });

  await prisma.worker.create({ data: validated });

  revalidatePath('/dashboard/workers');
  redirect('/dashboard/workers');
}

export async function deleteWorker(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Admin') {
    throw new Error('Unauthorized');
  }

  await prisma.worker.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath('/dashboard/workers');
}
```

## Data Fetching Patterns

### TanStack Query Setup

```typescript
// lib/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### API Client with Type Safety

```typescript
// lib/api/client.ts
import { z } from 'zod';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return schema ? schema.parse(data) : data;
  }

  get<T>(path: string, schema?: z.ZodSchema<T>) {
    return this.request<T>(path, { method: 'GET' }, schema);
  }

  post<T>(path: string, body: unknown, schema?: z.ZodSchema<T>) {
    return this.request<T>(
      path,
      { method: 'POST', body: JSON.stringify(body) },
      schema
    );
  }

  put<T>(path: string, body: unknown, schema?: z.ZodSchema<T>) {
    return this.request<T>(
      path,
      { method: 'PUT', body: JSON.stringify(body) },
      schema
    );
  }

  delete<T>(path: string, schema?: z.ZodSchema<T>) {
    return this.request<T>(path, { method: 'DELETE' }, schema);
  }
}

export const api = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '/api');
```

### Optimistic Updates

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workersApi } from '@/lib/api/workers';
import { Worker } from '@/types/worker';

export function useUpdateWorker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Worker> }) =>
      workersApi.update(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workers'] });

      // Snapshot previous value
      const previousWorkers = queryClient.getQueryData<Worker[]>(['workers']);

      // Optimistically update
      queryClient.setQueryData<Worker[]>(['workers'], (old) =>
        old?.map((worker) =>
          worker.id === id ? { ...worker, ...data } : worker
        )
      );

      return { previousWorkers };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['workers'], context?.previousWorkers);
    },

    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}
```

### Infinite Scroll

```typescript
'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

export function useInfiniteWorkers() {
  return useInfiniteQuery({
    queryKey: ['workers', 'infinite'],
    queryFn: ({ pageParam }) =>
      api.get<PaginatedResponse<Worker>>(
        `/workers?cursor=${pageParam || ''}&limit=20`
      ),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Component usage
export function InfiniteWorkerList() {
  const { ref, inView } = useInView();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteWorkers();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const workers = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div>
      {workers.map((worker) => (
        <WorkerCard key={worker.id} worker={worker} />
      ))}
      <div ref={ref}>
        {isFetchingNextPage && <Spinner />}
      </div>
    </div>
  );
}
```

## Authentication Patterns

### NextAuth.js Configuration

```typescript
// lib/auth/config.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const response = await fetch(`${process.env.API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });

        if (!response.ok) return null;

        const user = await response.json();
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
        };
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
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.accessToken = token.accessToken as string;
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
```

### Role-Based Access Control

```typescript
// lib/auth/rbac.ts
type Role = 'Admin' | 'Supervisor' | 'Worker';
type Permission = 'workers:read' | 'workers:write' | 'reports:read' | 'reports:write' | 'areas:manage';

const rolePermissions: Record<Role, Permission[]> = {
  Admin: ['workers:read', 'workers:write', 'reports:read', 'reports:write', 'areas:manage'],
  Supervisor: ['workers:read', 'reports:read', 'reports:write'],
  Worker: ['reports:read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Component wrapper
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const session = useSession();
  const role = session.data?.user?.role as Role;

  if (!hasPermission(role, permission)) {
    return fallback;
  }

  return children;
}
```

## State Management

### Zustand Store

```typescript
// lib/stores/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-store',
    }
  )
);

// lib/stores/filterStore.ts
interface FilterState {
  search: string;
  status: string | null;
  dateRange: { from: Date | null; to: Date | null };
  setSearch: (search: string) => void;
  setStatus: (status: string | null) => void;
  setDateRange: (range: { from: Date | null; to: Date | null }) => void;
  reset: () => void;
}

const initialState = {
  search: '',
  status: null,
  dateRange: { from: null, to: null },
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setDateRange: (dateRange) => set({ dateRange }),
  reset: () => set(initialState),
}));
```

## Real-Time Updates

### WebSocket with TanStack Query

```typescript
// lib/hooks/useRealtimeQuery.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      autoConnect: false,
    });
  }
  return socket;
}

export function useRealtimeQuery<T>(
  queryKey: string[],
  event: string
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on(event, (data: T) => {
      queryClient.setQueryData(queryKey, (old: T[] | undefined) => {
        if (!old) return [data];
        // Update or append
        const index = old.findIndex((item: any) => item.id === (data as any).id);
        if (index >= 0) {
          const updated = [...old];
          updated[index] = data;
          return updated;
        }
        return [...old, data];
      });
    });

    return () => {
      socket.off(event);
    };
  }, [queryKey, event, queryClient]);
}

// Usage
function WorkerList() {
  const { data: workers } = useQuery({ queryKey: ['workers'], queryFn: getWorkers });
  useRealtimeQuery<Worker>(['workers'], 'worker:updated');

  return <>{/* render workers */}</>;
}
```

## Performance Optimization

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

// Heavy component loaded on demand
const MapView = dynamic(() => import('@/components/features/MapView'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Disable SSR for map
});

// Modal loaded on interaction
const WorkerModal = dynamic(() => import('@/components/features/WorkerModal'));
```

### Image Optimization

```typescript
import Image from 'next/image';

export function WorkerAvatar({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src}
      alt={`${name}'s avatar`}
      width={40}
      height={40}
      className="rounded-full"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    />
  );
}
```

### Memoization Patterns

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoized component
export const WorkerCard = memo(function WorkerCard({ worker, onSelect }: Props) {
  return <div onClick={() => onSelect(worker.id)}>{worker.name}</div>;
});

// Memoized expensive computation
function WorkerStats({ workers }: { workers: Worker[] }) {
  const stats = useMemo(() => ({
    total: workers.length,
    active: workers.filter(w => w.isActive).length,
    onShift: workers.filter(w => w.currentShift).length,
  }), [workers]);

  return <StatsDisplay stats={stats} />;
}

// Memoized callback
function WorkerList({ workers }: { workers: Worker[] }) {
  const handleSelect = useCallback((id: string) => {
    console.log('Selected:', id);
  }, []);

  return workers.map(w => (
    <WorkerCard key={w.id} worker={w} onSelect={handleSelect} />
  ));
}
```

## Testing Utilities

### Test Setup

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));
```

### MSW Handlers

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/workers', () => {
    return HttpResponse.json({
      data: [
        { id: '1', name: 'Worker 1', email: 'worker1@example.com' },
        { id: '2', name: 'Worker 2', email: 'worker2@example.com' },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
  }),

  http.post('/api/workers', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: '3', ...body, createdAt: new Date().toISOString() },
      { status: 201 }
    );
  }),

  http.delete('/api/workers/:id', ({ params }) => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Accessibility Patterns

```typescript
// components/ui/VisuallyHidden.tsx
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </span>
  );
}

// components/ui/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white"
    >
      Skip to main content
    </a>
  );
}

// Focus trap for modals
import { FocusTrap } from '@headlessui/react';

export function Modal({ children, open, onClose }: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <FocusTrap>
        <div className="fixed inset-0 flex items-center justify-center">
          {children}
        </div>
      </FocusTrap>
    </Dialog>
  );
}
```

## Error Handling

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public errors: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

// Error boundary with reporting
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report to error tracking service
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```
