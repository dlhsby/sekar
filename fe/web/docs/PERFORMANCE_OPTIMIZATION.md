# Performance Optimization Checklist

Performance audit and optimization guide for SEKAR Web Dashboard using Next.js 16.

**Last Updated:** January 27, 2026
**Target:** Lighthouse Score >90 for Performance
**Status:** Phase 2D-11 Testing & Polish

---

## Core Web Vitals Targets

| Metric | Target | Good | Needs Improvement | Poor |
|--------|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | <2.5s | <2.5s | 2.5-4s | >4s |
| **FID** (First Input Delay) | <100ms | <100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | <0.1 | <0.1 | 0.1-0.25 | >0.25 |
| **FCP** (First Contentful Paint) | <1.8s | <1.8s | 1.8-3s | >3s |
| **TTI** (Time to Interactive) | <3.8s | <3.8s | 3.8-7.3s | >7.3s |
| **TBT** (Total Blocking Time) | <200ms | <200ms | 200-600ms | >600ms |

---

## 1. Loading Performance

### 1.1 Code Splitting & Lazy Loading

- [ ] **Dynamic imports for routes**: Already implemented with Next.js App Router ✅
  ```typescript
  // Next.js automatically code-splits routes
  // app/(dashboard)/users/page.tsx → separate bundle
  ```

- [ ] **Lazy load heavy components**:
  ```typescript
  // components/monitoring/LiveMap.tsx
  import dynamic from 'next/dynamic';

  const LiveMap = dynamic(() => import('@/components/monitoring/LiveMap'), {
    loading: () => <MapSkeleton />,
    ssr: false, // Disable SSR for map (uses window)
  });
  ```

- [ ] **Split large libraries**:
  ```typescript
  // Only import what you need
  import { format } from 'date-fns'; // ✅ Good
  import * as dateFns from 'date-fns'; // ❌ Bad (imports everything)
  ```

**Check Bundle Size:**
```bash
npm run build
# Check .next/static/chunks/ sizes
ls -lh .next/static/chunks/*.js | sort -k 5 -h
```

### 1.2 Image Optimization

- [ ] **Use Next.js Image component**:
  ```typescript
  import Image from 'next/image';

  // ✅ Good - optimized, lazy loaded, responsive
  <Image
    src="/logo.png"
    alt="SEKAR Logo"
    width={200}
    height={50}
    priority // For above-fold images
  />

  // ❌ Bad - not optimized
  <img src="/logo.png" alt="SEKAR Logo" />
  ```

- [ ] **Optimize image sizes**:
  ```bash
  # Use WebP format for better compression
  # Resize images to actual display size
  # Use srcset for responsive images
  ```

- [ ] **Lazy load below-fold images**:
  ```typescript
  <Image
    src="/photo.jpg"
    alt="Photo"
    width={800}
    height={600}
    loading="lazy" // Default, load when near viewport
  />
  ```

### 1.3 Font Optimization

- [ ] **Use Next.js font optimization**:
  ```typescript
  // app/layout.tsx
  import { Inter } from 'next/font/google';

  const inter = Inter({
    subsets: ['latin'],
    display: 'swap', // Prevent invisible text
    preload: true,
  });

  export default function RootLayout({ children }) {
    return <html className={inter.className}>{children}</html>;
  }
  ```

- [ ] **Preload critical fonts**:
  ```typescript
  // Already handled by next/font
  ```

### 1.4 JavaScript Optimization

- [ ] **Minimize JavaScript bundle**:
  ```bash
  # Check bundle analyzer
  npm install --save-dev @next/bundle-analyzer

  # next.config.js
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });

  module.exports = withBundleAnalyzer({});

  # Run analysis
  ANALYZE=true npm run build
  ```

- [ ] **Remove unused code**:
  ```bash
  # Use tree-shaking (automatic in Next.js)
  # Remove console.logs in production
  # Remove development-only code
  ```

- [ ] **Defer non-critical JavaScript**:
  ```typescript
  // Use dynamic imports
  const Analytics = dynamic(() => import('./Analytics'), { ssr: false });
  ```

---

## 2. Rendering Performance

### 2.1 Server Components (Default)

- [ ] **Use Server Components by default**:
  ```typescript
  // app/dashboard/page.tsx
  // ✅ Server Component (default) - no 'use client'
  export default async function DashboardPage() {
    const data = await fetchData();
    return <div>{data}</div>;
  }
  ```

- [ ] **Only use Client Components when needed**:
  ```typescript
  // ✅ Only use 'use client' for:
  // - useState, useEffect hooks
  // - Event handlers
  // - Browser APIs (window, localStorage)
  // - Third-party libraries requiring client-side
  'use client';

  import { useState } from 'react';

  export function Counter() {
    const [count, setCount] = useState(0);
    return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
  }
  ```

### 2.2 Data Fetching

- [ ] **Fetch data in Server Components**:
  ```typescript
  // ✅ Server Component - data fetching at build/request time
  export default async function UsersPage() {
    const users = await getUsers(); // Server-side fetch
    return <UserList users={users} />;
  }
  ```

- [ ] **Use TanStack Query for client-side fetching**:
  ```typescript
  // ✅ Client Component with caching
  'use client';

  export function UserList() {
    const { data, isLoading } = useQuery({
      queryKey: ['users'],
      queryFn: fetchUsers,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    });

    if (isLoading) return <Skeleton />;
    return <div>{data.map(user => <UserCard key={user.id} {...user} />)}</div>;
  }
  ```

- [ ] **Parallel data fetching**:
  ```typescript
  // ✅ Fetch in parallel
  const [users, areas] = await Promise.all([
    getUsers(),
    getAreas(),
  ]);

  // ❌ Sequential (slow)
  const users = await getUsers();
  const areas = await getAreas();
  ```

### 2.3 Caching Strategy

- [ ] **Configure TanStack Query cache times**:
  ```typescript
  // lib/api/users.ts
  export function useUsers() {
    return useQuery({
      queryKey: usersKeys.all,
      queryFn: fetchUsers,
      staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
      cacheTime: 30 * 60 * 1000, // 30 minutes in cache
    });
  }

  // lib/api/monitoring.ts
  export function useLiveWorkers() {
    return useQuery({
      queryKey: monitoringKeys.live,
      queryFn: fetchLiveWorkers,
      staleTime: 30 * 1000, // 30 seconds (changes frequently)
      refetchInterval: 30 * 1000, // Auto-refetch every 30s
    });
  }
  ```

- [ ] **Use Next.js caching**:
  ```typescript
  // fetch() automatically cached in Server Components
  const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }, // Revalidate every hour
  });
  ```

### 2.4 Avoid Layout Shift (CLS)

- [ ] **Specify image dimensions**:
  ```typescript
  // ✅ Prevents layout shift
  <Image src="/logo.png" width={200} height={50} alt="Logo" />

  // ❌ Causes layout shift
  <img src="/logo.png" alt="Logo" />
  ```

- [ ] **Reserve space for dynamic content**:
  ```typescript
  // ✅ Use skeleton loaders
  {isLoading ? (
    <div className="h-96 bg-gray-200 animate-pulse" />
  ) : (
    <DataTable data={data} />
  )}
  ```

- [ ] **Avoid CSS animations on layout properties**:
  ```css
  /* ❌ Causes layout shift */
  .element {
    animation: grow 1s;
  }
  @keyframes grow {
    from { width: 100px; }
    to { width: 200px; }
  }

  /* ✅ Use transform instead */
  .element {
    animation: grow 1s;
  }
  @keyframes grow {
    from { transform: scaleX(0.5); }
    to { transform: scaleX(1); }
  }
  ```

---

## 3. Runtime Performance

### 3.1 React Optimization

- [ ] **Memoize expensive computations**:
  ```typescript
  import { useMemo } from 'react';

  export function UserList({ users }: { users: User[] }) {
    const sortedUsers = useMemo(
      () => users.sort((a, b) => a.name.localeCompare(b.name)),
      [users]
    );

    return <div>{sortedUsers.map(user => <UserCard key={user.id} {...user} />)}</div>;
  }
  ```

- [ ] **Memoize components to prevent re-renders**:
  ```typescript
  import { memo } from 'react';

  export const UserCard = memo(function UserCard({ user }: { user: User }) {
    return <div>{user.name}</div>;
  });
  ```

- [ ] **Use callback refs for expensive callbacks**:
  ```typescript
  import { useCallback } from 'react';

  export function UserForm() {
    const handleSubmit = useCallback((data: FormData) => {
      // Expensive operation
    }, []);

    return <form onSubmit={handleSubmit}>...</form>;
  }
  ```

### 3.2 Virtualization for Long Lists

- [ ] **Virtualize long lists (>100 items)**:
  ```bash
  npm install @tanstack/react-virtual
  ```

  ```typescript
  import { useVirtualizer } from '@tanstack/react-virtual';

  export function UserList({ users }: { users: User[] }) {
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
      count: users.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 50, // Estimated row height
    });

    return (
      <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map(virtualItem => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <UserCard user={users[virtualItem.index]} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  ```

### 3.3 Debounce/Throttle Input

- [ ] **Debounce search inputs**:
  ```typescript
  import { useDebouncedValue } from '@/lib/hooks/useDebounce';

  export function SearchInput() {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebouncedValue(search, 500);

    const { data } = useQuery({
      queryKey: ['search', debouncedSearch],
      queryFn: () => searchUsers(debouncedSearch),
      enabled: debouncedSearch.length > 0,
    });

    return <input value={search} onChange={e => setSearch(e.target.value)} />;
  }
  ```

### 3.4 Optimize Map Rendering

- [ ] **Use marker clustering for many markers**:
  ```typescript
  import MarkerClusterer from '@googlemaps/markerclusterer';

  // Cluster markers when zoomed out
  const clusterer = new MarkerClusterer({ map, markers });
  ```

- [ ] **Limit initial markers, load on demand**:
  ```typescript
  const [visibleMarkers, setVisibleMarkers] = useState(markers.slice(0, 50));

  useEffect(() => {
    // Load more as user pans/zooms
  }, [mapBounds]);
  ```

---

## 4. Network Performance

### 4.1 API Optimization

- [ ] **Enable compression (gzip/brotli)**:
  ```typescript
  // next.config.js
  module.exports = {
    compress: true, // Default in production
  };
  ```

- [ ] **Use HTTP/2**:
  ```bash
  # Automatic with Vercel/modern hosting
  # Or configure in your web server (nginx, apache)
  ```

- [ ] **Implement request batching**:
  ```typescript
  // Batch multiple API calls
  const [users, areas, reports] = await Promise.all([
    api.get('/users'),
    api.get('/areas'),
    api.get('/reports'),
  ]);
  ```

- [ ] **Use pagination**:
  ```typescript
  // ✅ Load 20 items at a time
  const { data } = useUsers({ page: 1, limit: 20 });

  // ❌ Load all items (slow)
  const { data } = useUsers();
  ```

### 4.2 Reduce Payload Size

- [ ] **Return only needed fields**:
  ```typescript
  // API response
  // ✅ Good - only needed fields
  { id, name, email, role }

  // ❌ Bad - includes unnecessary data
  { id, name, email, role, createdAt, updatedAt, deletedAt, metadata, ... }
  ```

- [ ] **Use field selection**:
  ```typescript
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}?fields=id,name,email`),
  });
  ```

### 4.3 Prefetching & Preloading

- [ ] **Prefetch on hover**:
  ```typescript
  import { useQueryClient } from '@tanstack/react-query';

  export function UserLink({ userId }: { userId: string }) {
    const queryClient = useQueryClient();

    const prefetchUser = () => {
      queryClient.prefetchQuery({
        queryKey: ['user', userId],
        queryFn: () => fetchUser(userId),
      });
    };

    return (
      <Link href={`/users/${userId}`} onMouseEnter={prefetchUser}>
        View User
      </Link>
    );
  }
  ```

- [ ] **Preload critical resources**:
  ```typescript
  // app/layout.tsx
  export const metadata = {
    other: {
      // Preload critical CSS/JS
      'link': [
        { rel: 'preload', href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      ],
    },
  };
  ```

---

## 5. Build Optimization

### 5.1 Production Build

- [ ] **Enable minification**:
  ```typescript
  // next.config.js
  module.exports = {
    swcMinify: true, // Use SWC minifier (default)
  };
  ```

- [ ] **Enable tree-shaking**:
  ```typescript
  // Automatic in Next.js with ES modules
  // Use named imports to enable tree-shaking
  import { Button } from '@/components/ui'; // ✅
  import * as UI from '@/components/ui'; // ❌
  ```

### 5.2 Environment Variables

- [ ] **Use correct env vars**:
  ```bash
  # Build-time variables (baked into bundle)
  NEXT_PUBLIC_API_URL=https://api.example.com

  # Server-side only variables (not in bundle)
  API_SECRET_KEY=secret123
  ```

---

## Testing Performance

### Lighthouse CI

```bash
npm install -g @lhci/cli

# Create lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000/dashboard"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}]
      }
    }
  }
}

# Run audit
lhci autorun
```

### Web Vitals Monitoring

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### Bundle Analysis

```bash
# Install analyzer
npm install --save-dev @next/bundle-analyzer

# Analyze
ANALYZE=true npm run build

# Open report
open .next/analyze/client.html
```

---

## Performance Budget

| Resource | Budget | Current | Status |
|----------|--------|---------|--------|
| JavaScript | <300KB | TBD | ⬜ |
| CSS | <50KB | TBD | ⬜ |
| Fonts | <100KB | TBD | ⬜ |
| Images (per page) | <500KB | TBD | ⬜ |
| Total (initial load) | <1MB | TBD | ⬜ |
| Lighthouse Performance | >90 | TBD | ⬜ |
| LCP | <2.5s | TBD | ⬜ |
| FID | <100ms | TBD | ⬜ |
| CLS | <0.1 | TBD | ⬜ |

---

## Monitoring in Production

### 1. Setup Vercel Analytics (Recommended)

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Setup Google Analytics 4

```typescript
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
      </body>
    </html>
  );
}
```

---

## Quick Wins Checklist

Priority optimizations to implement first:

- [ ] Replace `<img>` with `<Image>` component
- [ ] Add `priority` to above-fold images
- [ ] Lazy load below-fold components with `dynamic()`
- [ ] Implement skeleton loaders for loading states
- [ ] Add `staleTime` to TanStack Query hooks
- [ ] Enable font optimization with `next/font`
- [ ] Memoize expensive computations with `useMemo`
- [ ] Virtualize long lists (>100 items)
- [ ] Debounce search inputs
- [ ] Run Lighthouse audit and fix critical issues

---

## Next Steps

1. Run Lighthouse audit on all major pages
2. Analyze bundle size with bundle analyzer
3. Implement top 5 quick wins
4. Re-run Lighthouse to measure improvements
5. Set up performance monitoring in production
6. Create performance regression tests for CI/CD
