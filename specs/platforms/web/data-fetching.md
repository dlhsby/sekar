# Data Fetching Patterns

Data fetching strategy for SEKAR web dashboard using Next.js and TanStack Query.

## Overview

The web dashboard uses **TanStack Query (React Query)** for server state management with **Next.js App Router** for Server Components and Server Actions.

---

## Stack

```bash
npm install @tanstack/react-query
npm install axios
npm install zustand  # For client state
```

---

## Query Client Setup

### Provider Configuration

**File:** `app/providers.tsx`

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.Node }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            cacheTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
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

### Root Layout

**File:** `app/layout.tsx`

```tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## API Client

### Axios Instance

**File:** `lib/apiClient.ts`

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
```

---

## Query Hooks

### Workers

**File:** `lib/queries/useWorkers.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../apiClient';

// Fetch all workers
export const useWorkers = () => {
  return useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users?role=worker');
      return data;
    },
  });
};

// Fetch active workers (currently clocked in)
export const useActiveWorkers = () => {
  return useQuery({
    queryKey: ['workers', 'active'],
    queryFn: async () => {
      const { data } = await apiClient.get('/supervisor/active-workers');
      return data;
    },
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};

// Fetch single worker
export const useWorker = (id: string) => {
  return useQuery({
    queryKey: ['workers', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${id}`);
      return data;
    },
    enabled: !!id, // Only fetch if id exists
  });
};
```

### Reports

```typescript
// lib/queries/useReports.ts
export const useReports = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.date) params.append('date', filters.date);
      if (filters?.location_id) params.append('location_id', filters.location_id);
      if (filters?.worker_id) params.append('worker_id', filters.worker_id);
      if (filters?.report_type) params.append('report_type', filters.report_type);

      const { data } = await apiClient.get(`/reports?${params.toString()}`);
      return data;
    },
  });
};

export const useReport = (id: string) => {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/reports/${id}`);
      return data;
    },
  });
};
```

### Attendance

```typescript
// lib/queries/useAttendance.ts
export const useAttendance = (date: string, locationId?: string) => {
  return useQuery({
    queryKey: ['attendance', date, locationId],
    queryFn: async () => {
      const params = new URLSearchParams({ date });

      if (locationId) params.append('location_id', locationId);

      const { data } = await apiClient.get(`/supervisor/attendance?${params.toString()}`);
      return data;
    },
  });
};
```

---

## Mutation Hooks

### Approve Report

```typescript
// lib/mutations/useApproveReport.ts
export const useApproveReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data } = await apiClient.patch(`/reports/${reportId}/approve`);
      return data;
    },
    onSuccess: (data, reportId) => {
      // Invalidate reports list
      queryClient.invalidateQueries({ queryKey: ['reports'] });

      // Update single report cache
      queryClient.setQueryData(['reports', reportId], data);

      // Show success toast
      toast.success('Laporan disetujui');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menyetujui laporan');
    },
  });
};
```

### Create User

```typescript
// lib/mutations/useCreateUser.ts
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserDto) => {
      const { data } = await apiClient.post('/users', userData);
      return data;
    },
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['workers'] });

      toast.success('Pengguna berhasil dibuat');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal membuat pengguna');
    },
  });
};
```

---

## Server Components (Next.js App Router)

### Prefetching Data

```tsx
// app/dashboard/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: ['workers', 'active'],
    queryFn: async () => {
      const response = await fetch(`${process.env.API_URL}/supervisor/active-workers`);
      return response.json();
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

### Client Component

```tsx
// app/dashboard/DashboardClient.tsx (Client Component)
'use client';

import { useActiveWorkers } from '@/lib/queries/useWorkers';

export function DashboardClient() {
  const { data: workers, isLoading } = useActiveWorkers();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <h1>Dashboard</h1>
      <WorkersMap workers={workers} />
      <ActiveWorkersTable workers={workers} />
    </div>
  );
}
```

---

## Optimistic Updates

### Example: Toggle Report Review

```typescript
export const useToggleReportReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data } = await apiClient.patch(`/reports/${reportId}/toggle-review`);
      return data;
    },
    onMutate: async (reportId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reports', reportId] });

      // Snapshot previous value
      const previousReport = queryClient.getQueryData(['reports', reportId]);

      // Optimistically update
      queryClient.setQueryData(['reports', reportId], (old: any) => ({
        ...old,
        reviewed: !old.reviewed,
      }));

      // Return context with snapshot
      return { previousReport };
    },
    onError: (err, reportId, context) => {
      // Rollback on error
      queryClient.setQueryData(['reports', reportId], context?.previousReport);
      toast.error('Gagal mengubah status review');
    },
    onSettled: (data, error, reportId) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['reports', reportId] });
    },
  });
};
```

---

## Real-Time Updates

### Polling Strategy

```typescript
// Auto-refetch every 30 seconds for live data
export const useActiveWorkersLive = () => {
  return useQuery({
    queryKey: ['workers', 'active'],
    queryFn: async () => {
      const { data } = await apiClient.get('/supervisor/active-workers');
      return data;
    },
    refetchInterval: 30 * 1000, // 30 seconds
    refetchIntervalInBackground: true, // Continue polling when tab not focused
  });
};
```

### WebSocket Integration (Future)

```typescript
// lib/useWebSocket.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useWebSocket = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/ws');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'worker_location_update':
          queryClient.setQueryData(['workers', 'active'], (old: any[]) => {
            return old.map((worker) =>
              worker.id === message.data.worker_id
                ? { ...worker, gps_lat: message.data.gps_lat, gps_lng: message.data.gps_lng }
                : worker
            );
          });
          break;

        case 'new_report':
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          break;
      }
    };

    return () => ws.close();
  }, [queryClient]);
};
```

---

## Pagination

### Cursor-Based Pagination

```typescript
export const useReportsPaginated = (filters?: ReportFilters) => {
  return useInfiniteQuery({
    queryKey: ['reports', 'paginated', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...filters,
      });

      const { data } = await apiClient.get(`/reports?${params.toString()}`);
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 1,
  });
};
```

### Usage with Infinite Scroll

```tsx
export function ReportsInfiniteList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useReportsPaginated();

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page) =>
        page.items.map((report) => <ReportCard key={report.id} report={report} />)
      )}
      <div ref={observerTarget}>{isFetchingNextPage && <Spinner />}</div>
    </div>
  );
}
```

---

## Error Handling

### Error Boundary

```tsx
// components/ErrorBoundary.tsx
export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="mb-2 text-lg font-semibold">Terjadi Kesalahan</h2>
          <p className="mb-4 text-sm text-gray-600">{error.message}</p>
          <Button onClick={resetErrorBoundary}>Coba Lagi</Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Loading States

```tsx
export function WorkersTable() {
  const { data, isLoading, isError, error } = useWorkers();

  if (isLoading) return <TableSkeleton />;
  if (isError) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState title="Belum ada pekerja" />;

  return <Table data={data} />;
}
```

---

## Caching Strategy

### Cache Invalidation

```typescript
// Invalidate specific queries
queryClient.invalidateQueries({ queryKey: ['reports'] });

// Invalidate all reports queries
queryClient.invalidateQueries({ queryKey: ['reports'], exact: false });

// Remove query from cache
queryClient.removeQueries({ queryKey: ['reports', reportId] });

// Set query data manually
queryClient.setQueryData(['reports', reportId], updatedReport);
```

### Cache Time Configuration

```typescript
// Long cache for static data (areas, user profile)
useQuery({
  queryKey: ['areas'],
  queryFn: fetchAreas,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});

// Short cache for dynamic data (active workers)
useQuery({
  queryKey: ['workers', 'active'],
  queryFn: fetchActiveWorkers,
  staleTime: 30 * 1000, // 30 seconds
  cacheTime: 2 * 60 * 1000, // 2 minutes
});
```

---

## Best Practices

### 1. Query Keys

Use descriptive, hierarchical query keys:

```typescript
// ✅ Good
['workers', 'active']
['reports', { date: '2026-01-16', locationId: 'abc' }]
['reports', reportId]

// ❌ Bad
['getWorkers']
['reports']
```

### 2. Dependent Queries

```typescript
const { data: shift } = useCurrentShift();
const { data: reports } = useReports(shift?.id, {
  enabled: !!shift?.id, // Only fetch if shift exists
});
```

### 3. Mutations with Optimistic Updates

Always provide rollback on error:

```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ['data'] });
  const previous = queryClient.getQueryData(['data']);
  queryClient.setQueryData(['data'], newData);
  return { previous };
},
onError: (err, newData, context) => {
  queryClient.setQueryData(['data'], context.previous);
},
```

---

**Document Owner:** Web Developer
**Last Updated:** 2026-01-16
**Status:** Planned - Phase 6

---

## Phase 2D: Monitoring Query Hooks

All Phase 2D monitoring hooks use TanStack Query with a shared `monitoringKeys` query key factory for consistent cache management.

### Query Key Factory

```typescript
// lib/queries/monitoringKeys.ts
export const monitoringKeys = {
  all: ['monitoring'] as const,
  stats: (scope?: MonitoringScope) => [...monitoringKeys.all, 'stats', scope] as const,
  liveUsers: (scope?: MonitoringScope) => [...monitoringKeys.all, 'live-users', scope] as const,
  userDaySummary: (userId: string, date: string) =>
    [...monitoringKeys.all, 'users', userId, 'day-summary', date] as const,
  locationHistory: (userId: string, date: string) =>
    [...monitoringKeys.all, 'users', userId, 'location-history', date] as const,
  staffingSummary: (scope?: MonitoringScope) =>
    [...monitoringKeys.all, 'staffing-summary', scope] as const,
  config: () => [...monitoringKeys.all, 'config'] as const,
  boundaries: (scope?: MonitoringScope) =>
    [...monitoringKeys.all, 'boundaries', scope] as const,
};
```

### Polling Intervals

| Hook | Polling Interval | Rationale |
|------|-----------------|-----------|
| `useLiveUsers` | 30s | Near-real-time user positions |
| `useMonitoringStats` | 60s | Aggregated counts change less frequently |
| `useStaffingSummary` | 60s | Staffing numbers update with clock-in/out |
| `useMonitoringConfig` | On-demand | Admin config rarely changes |
| `useBoundaries` | On-demand | Boundary polygons are static |
| `useUserDaySummary` | On-demand | Fetched when detail panel opens |
| `useLocationHistory` | On-demand | Fetched when trail view opens |

### New TanStack Query Hooks

```typescript
// City/rayon/area statistics
function useMonitoringStats(scope?: MonitoringScope) {
  return useQuery({
    queryKey: monitoringKeys.stats(scope),
    queryFn: () => monitoringApi.getStats(scope),
    refetchInterval: 60_000, // 60s polling
    staleTime: 30_000,
  });
}

// Enhanced live users with status filter
function useLiveUsers(filters?: MonitoringFilters) {
  return useQuery({
    queryKey: ['monitoring', 'live-users', filters],
    queryFn: () => monitoringApi.getLiveUsers(filters),
    refetchInterval: 30_000, // 30s polling fallback
    staleTime: 10_000,
  });
}

// User day summary (for detail panel)
function useUserDaySummary(userId: string | null) {
  return useQuery({
    queryKey: ['monitoring', 'users', userId, 'day-summary'],
    queryFn: () => monitoringApi.getUserDaySummary(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// Location history (for timeline/trail)
function useLocationHistory(userId: string | null, date: string) {
  return useQuery({
    queryKey: ['monitoring', 'users', userId, 'location-history', date],
    queryFn: () => monitoringApi.getLocationHistory(userId!, date),
    enabled: !!userId && !!date,
    staleTime: 120_000,
  });
}

// Staffing summary (for filter modal)
function useStaffingSummary(filters?: { rayon_id?: string; location_id?: string }) {
  return useQuery({
    queryKey: ['monitoring', 'staffing-summary', filters],
    queryFn: () => monitoringApi.getStaffingSummary(filters),
    staleTime: 60_000,
  });
}

// Monitoring config (admin only)
function useMonitoringConfig() {
  return useQuery({
    queryKey: ['monitoring', 'config'],
    queryFn: () => monitoringApi.getConfig(),
    staleTime: 300_000, // 5 min
  });
}

// Update config mutation
function useUpdateMonitoringConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, any> }) =>
      monitoringApi.updateConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'config'] });
      toast.success('Konfigurasi berhasil diperbarui');
    },
  });
}

// Area/rayon boundary polygons
function useBoundaries(scope?: MonitoringScope) {
  return useQuery({
    queryKey: monitoringKeys.boundaries(scope),
    queryFn: () => monitoringApi.getBoundaries(scope),
    staleTime: 300_000, // 5 min — boundaries rarely change
  });
}

// Area boundary (single area)
function useAreaBoundary(locationId: string | null) {
  return useQuery({
    queryKey: ['areas', locationId, 'boundary'],
    queryFn: () => areasApi.getBoundary(locationId!),
    enabled: !!locationId,
    staleTime: 300_000,
  });
}

// Update area boundary mutation
function useUpdateAreaBoundary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ locationId, data }: { locationId: string; data: UpdateAreaBoundaryDto }) =>
      areasApi.updateBoundary(locationId, data),
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['areas', locationId, 'boundary'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });
      toast.success('Batas area berhasil diperbarui');
    },
  });
}
```

### Cache Invalidation Strategy

| Event | Invalidate |
|-------|-----------|
| `user:status-changed` | `['monitoring', 'live-users']` — setQueryData for specific user |
| `user:left-area` / `user:entered-area` | `['monitoring', 'live-users']` — update is_within_area |
| Config update | `['monitoring', 'config']` — full invalidate |
| Boundary update | `['areas', locationId, 'boundary']` + `['monitoring']` — recalculate is_within_area |

**Last Updated:** 2026-03-06
**Dependencies:** `@tanstack/react-query`, `axios`, `next`
