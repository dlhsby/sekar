# Web Performance Specification

---

## Overview

Performance optimization strategies for the SEKAR web dashboard, including code splitting, caching, image optimization, and monitoring.

---

## Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | <1.5s | Lighthouse |
| Largest Contentful Paint | <2.5s | Lighthouse |
| Time to Interactive | <3.5s | Lighthouse |
| Cumulative Layout Shift | <0.1 | Lighthouse |
| First Input Delay | <100ms | Lighthouse |
| Bundle Size (Initial JS) | <200KB | Next.js |

---

## Code Splitting

### Route-Based Splitting

Next.js App Router automatically code-splits by route. Each page is a separate chunk.

```
app/
├── (dashboard)/
│   ├── page.tsx          → /dashboard chunk
│   ├── users/page.tsx    → /users chunk
│   ├── reports/page.tsx  → /reports chunk
```

### Component-Based Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

// Map component (Leaflet is heavy)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  loading: () => <MapSkeleton />,
  ssr: false, // Leaflet doesn't support SSR
});

// Chart components
const ReportChart = dynamic(() => import('@/components/charts/ReportChart'), {
  loading: () => <ChartSkeleton />,
});

// Modal components
const UserFormModal = dynamic(() => import('@/components/users/UserFormModal'), {
  loading: () => <ModalSkeleton />,
});
```

### Conditional Loading

```typescript
// Only load when needed
const [showMap, setShowMap] = useState(false);

return (
  <div>
    <Button onClick={() => setShowMap(true)}>Show Map</Button>
    {showMap && <MapView areas={areas} />}
  </div>
);
```

---

## Image Optimization

### Next.js Image Component

```typescript
import Image from 'next/image';

// Optimized image with automatic resizing
<Image
  src={report.photoUrl}
  alt="Report photo"
  width={400}
  height={300}
  placeholder="blur"
  blurDataURL={report.blurDataUrl}
  loading="lazy"
/>

// Fill container
<div className="relative h-48">
  <Image
    src={asset.photoUrl}
    alt={asset.name}
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  />
</div>
```

### Avatar Optimization

```typescript
// components/ui/avatar.tsx
import Image from 'next/image';

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  return (
    <div
      className="relative rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-sm">
            {name?.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
```

### Image Domain Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sekar-media.s3.ap-southeast-1.amazonaws.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
  },
};
```

---

## Caching Strategies

### React Query Cache

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Per-Query Cache Settings

```typescript
// Frequently changing data - short cache
export function useActiveShifts() {
  return useQuery({
    queryKey: ['active-shifts'],
    queryFn: shiftsApi.getActive,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Rarely changing data - long cache
export function useAreaTypes() {
  return useQuery({
    queryKey: ['area-types'],
    queryFn: areasApi.getTypes,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// Reference data - very long cache
export function useSystemSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: Infinity, // Never stale
    gcTime: Infinity, // Never garbage collected
  });
}
```

### Prefetching

```typescript
// Prefetch on hover
export function UserRow({ user }: { user: User }) {
  const queryClient = useQueryClient();

  const prefetchUser = () => {
    queryClient.prefetchQuery({
      queryKey: ['user', user.id],
      queryFn: () => usersApi.getUser(user.id),
    });
  };

  return (
    <Link
      href={`/users/${user.id}`}
      onMouseEnter={prefetchUser}
    >
      {user.fullName}
    </Link>
  );
}

// Prefetch next page
export function UsersTable() {
  const { data } = useUsers({ page, limit });

  useEffect(() => {
    if (data?.meta.hasNextPage) {
      queryClient.prefetchQuery({
        queryKey: ['users', { page: page + 1, limit }],
        queryFn: () => usersApi.getUsers({ page: page + 1, limit }),
      });
    }
  }, [data, page]);
}
```

---

## Bundle Analysis

### Setup Bundle Analyzer

```bash
npm install @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... other config
});
```

```bash
# Run analysis
ANALYZE=true npm run build
```

### Tree Shaking

```typescript
// Bad - imports entire library
import _ from 'lodash';
const result = _.groupBy(data, 'category');

// Good - imports only needed function
import groupBy from 'lodash/groupBy';
const result = groupBy(data, 'category');

// Better - use native or smaller alternatives
const result = data.reduce((acc, item) => {
  (acc[item.category] ??= []).push(item);
  return acc;
}, {});
```

### Import Cost Awareness

```typescript
// Heavy imports to avoid in client components
// - moment.js → use date-fns
// - lodash → use native or lodash-es with specific imports
// - chart.js → use recharts with lazy loading
// - leaflet → always lazy load
```

---

## Server Components

### Data Fetching in Server Components

```typescript
// app/(dashboard)/reports/page.tsx
// Server Component - no 'use client'

import { requireAuth } from '@/lib/auth';
import { reportsApi } from '@/lib/api/reports';
import { ReportsTable } from '@/components/reports/ReportsTable';

export default async function ReportsPage({ searchParams }) {
  const session = await requireAuth();

  // Fetch data on server - no client bundle impact
  const reports = await reportsApi.getReports({
    page: Number(searchParams.page) || 1,
    ...searchParams,
  });

  return (
    <div>
      <h1>Laporan</h1>
      {/* Client component for interactivity */}
      <ReportsTable initialData={reports} />
    </div>
  );
}
```

### Streaming with Suspense

```typescript
// app/(dashboard)/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Stats load first */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Chart loads after */}
      <Suspense fallback={<ChartSkeleton />}>
        <ReportsChart />
      </Suspense>

      {/* Table loads last (most data) */}
      <Suspense fallback={<TableSkeleton />}>
        <RecentReports />
      </Suspense>
    </div>
  );
}

async function DashboardStats() {
  const stats = await fetchStats();
  return <StatsCards stats={stats} />;
}
```

---

## Virtualization

### Virtual List for Long Lists

```typescript
// components/reports/VirtualReportsList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualReportsList({ reports }: { reports: Report[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: reports.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ReportRow report={reports[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Performance Monitoring

### Web Vitals

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

### Custom Performance Metrics

```typescript
// lib/performance.ts
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Send to analytics
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        page: window.location.pathname,
      }),
    });
  }
}

// In _app.tsx or layout
export { reportWebVitals };
```

---

## Loading States

### Skeleton Components

```typescript
// components/ui/skeletons.tsx
export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="rounded-md border">
      <div className="border-b">
        <div className="flex p-4 gap-4">
          {Array(columns).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex p-4 gap-4 border-b last:border-0">
          {Array(columns).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array(4).fill(0).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Phase 2D: Monitoring Performance

Monitoring pages render a full-screen Mapbox GL map with hundreds of user markers, boundary polygons, and a scrollable side panel. The following optimizations keep the UI responsive.

### Mapbox Tile Loading

- Use **vector tiles** (`mapbox://styles/...`) instead of raster tiles for smaller payloads and crisp rendering at all zoom levels.
- **Lazy-load** the map component below the fold using `next/dynamic` with `ssr: false`. The Mapbox GL JS bundle (~230 KB gzipped) should not block initial page render.

### Marker Clustering

- Use the **supercluster** algorithm (via `mapbox-gl`'s built-in cluster source or the `supercluster` library) to group nearby markers.
- **Cluster at zoom < 13**; show individual markers only at zoom >= 13.
- Cap at **max 200 individual markers** visible at any time. At lower zoom levels, clusters replace individual markers to avoid DOM overload.

### Virtual Scrolling (Side Panel)

- Use **react-window** (or `@tanstack/react-virtual`) for the user list side panel when displaying 500+ users.
- Set `estimateSize` to match the monitoring card height (~72 px) with `overscan: 5` rows.
- Avoid rendering off-screen user cards to keep the DOM node count under 200 in the panel.

### WebSocket Throttling

- **Batch UI updates** from WebSocket position events. Accumulate incoming `user:location-updated` events in a buffer.
- Flush the buffer to React state at **max 1 re-render per 500 ms** using `requestAnimationFrame` + a 500 ms throttle.
- This prevents cascading re-renders when many users send location pings simultaneously.

### Map Re-Render Optimization

- Wrap marker components with **`React.memo`** and compare only `lat`, `lng`, and `status` props to skip unnecessary re-renders.
- Avoid re-rendering the entire map layer on every Redux/Zustand state change. Use **selectors** to subscribe only to the slice of state each component needs.
- Move marker position updates to `mapbox-gl` source `setData()` calls instead of React state when possible, bypassing the React render cycle entirely.

### Image Optimization (Role Icons)

- **Preload role icons as a single sprite sheet** (`/sprites/monitoring-icons.png` + JSON index) rather than loading individual PNGs per marker.
- Mapbox `addImage()` at map load time so markers render immediately without icon pop-in.
- Sprite contains icons for all four tracking statuses (active, inactive, outside_area, missing) across all 8 roles.

---

## Optimization Checklist

### Build Time

- [ ] Enable production mode
- [ ] Tree shake unused code
- [ ] Minify JavaScript and CSS
- [ ] Compress assets (gzip/brotli)

### Images

- [ ] Use Next.js Image component
- [ ] Set proper sizes attribute
- [ ] Use WebP format
- [ ] Lazy load below-fold images
- [ ] Add blur placeholders

### JavaScript

- [ ] Code split by route
- [ ] Lazy load heavy components
- [ ] Avoid large dependencies
- [ ] Use Server Components where possible

### Data

- [ ] Configure React Query cache
- [ ] Prefetch likely next pages
- [ ] Use pagination for large lists
- [ ] Virtualize very long lists

### Network

- [ ] Enable HTTP/2
- [ ] Set proper cache headers
- [ ] Use CDN for static assets
- [ ] Minimize API calls

---

## Dependencies

```bash
npm install @tanstack/react-virtual  # Virtual lists
npm install @vercel/speed-insights  # Performance monitoring
npm install @vercel/analytics        # Analytics
npm install @next/bundle-analyzer    # Bundle analysis (dev)
```

---

**Last Updated:** 2026-03-06
