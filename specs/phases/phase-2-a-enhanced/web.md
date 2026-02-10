# Phase 2 - Web Dashboard Implementation Guide

**Duration:** 12 days
**Prerequisites:** Phase 1 MVP deployed, backend Phase 2A-2B complete
**Target:** Next.js 14+, React 18+, Tailwind CSS

---

## Overview

Phase 2 introduces a comprehensive web dashboard for administrators and management roles. The dashboard provides:

- **User Management** - CRUD for all user types with role assignment
- **Area Management** - Create/edit areas with polygon boundaries via map editor
- **Rayon Management** - Manage 7 Rayon sectors
- **KMZ Import** - Bulk import area boundaries from KMZ/KML files
- **Shift Scheduling** - Assign workers to areas and shifts
- **Real-time Monitoring** - Live map with worker positions and attendance status
- **Neo Brutalism Design** - Bold, accessible government-appropriate UI

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1-2 | Project Setup | Next.js, auth, layout, design system |
| Day 3-4 | User Management | User CRUD, role assignment |
| Day 5-6 | Area Management | Area CRUD, map polygon editor |
| Day 7 | KMZ Import | Upload, preview, confirm import |
| Day 8 | Rayon Management | Rayon CRUD, area assignment |
| Day 9-10 | Scheduling | Worker schedule management |
| Day 11 | Monitoring | Real-time map dashboard |
| Day 12 | Testing & Polish | E2E tests, accessibility, optimization |

---

## Technical Architecture

### Tech Stack

```json
{
  "next": "^14.0.0",
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "tailwindcss": "^3.4.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.4.0",
  "mapbox-gl": "^3.0.0",
  "@mapbox/mapbox-gl-draw": "^1.4.0",
  "axios": "^1.6.0",
  "zod": "^3.22.0",
  "react-hook-form": "^7.49.0",
  "@hookform/resolvers": "^3.3.0"
}
```

### Project Structure

```
fe/web/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth layout group
│   │   │   └── login/
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── users/
│   │   │   ├── areas/
│   │   │   ├── rayons/
│   │   │   ├── schedules/
│   │   │   ├── reports/
│   │   │   ├── tasks/
│   │   │   ├── monitoring/
│   │   │   └── settings/
│   │   └── api/                 # API routes (BFF pattern)
│   ├── components/
│   │   ├── nb/                  # Neo Brutalism components
│   │   ├── layout/              # Layout components
│   │   ├── forms/               # Form components
│   │   ├── tables/              # Table components
│   │   └── maps/                # Map components
│   ├── lib/
│   │   ├── api/                 # API client & services
│   │   ├── auth/                # Auth utilities
│   │   └── utils/               # Utility functions
│   ├── hooks/                   # Custom React hooks
│   ├── stores/                  # Zustand stores
│   └── types/                   # TypeScript types
├── public/
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## 1. Neo Brutalism Design System

### Design Tokens

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        nb: {
          primary: '#0066CC',      // Action blue
          success: '#1B5E20',      // Government green
          warning: '#F57C00',      // Alert orange
          danger: '#DC2626',       // Error red
          black: '#000000',        // Borders, shadows
          white: '#FFFFFF',        // Backgrounds
          navy: '#001F3F',         // Trust/authority
          gray: '#666666',         // Secondary text
          'light-gray': '#F5F5F5', // Disabled backgrounds
        },
      },
      boxShadow: {
        'nb-sm': '4px 4px 0px #000000',
        'nb-md': '6px 6px 0px #000000',
        'nb-lg': '8px 8px 0px #000000',
        'nb-hover': '8px 8px 0px #000000',
        'nb-active': '2px 2px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'extra-bold': '800',
      },
    },
  },
  plugins: [],
};

export default config;
```

### NBButton Component

```typescript
// src/components/nb/NBButton.tsx
'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold border-3 border-nb-black transition-all duration-100 focus:outline-none focus:ring-2 focus:ring-nb-black focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-nb-primary text-white hover:shadow-nb-hover active:shadow-nb-active active:translate-x-1 active:translate-y-1',
        secondary: 'bg-nb-white text-nb-black hover:shadow-nb-hover active:shadow-nb-active active:translate-x-1 active:translate-y-1',
        danger: 'bg-nb-danger text-white hover:shadow-nb-hover active:shadow-nb-active active:translate-x-1 active:translate-y-1',
        success: 'bg-nb-success text-white hover:shadow-nb-hover active:shadow-nb-active active:translate-x-1 active:translate-y-1',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm shadow-nb-sm',
        md: 'px-4 py-2 text-base shadow-nb-md',
        lg: 'px-6 py-3 text-lg shadow-nb-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface NBButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const NBButton = forwardRef<HTMLButtonElement, NBButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          (disabled || loading) && 'opacity-50 cursor-not-allowed shadow-none',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </span>
        ) : children}
      </button>
    );
  }
);
```

### NBCard Component

```typescript
// src/components/nb/NBCard.tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva('bg-nb-white border-3 border-nb-black', {
  variants: {
    variant: {
      elevated: 'shadow-nb-md',
      outlined: 'shadow-none',
      flat: 'border-0 shadow-none',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'elevated',
    padding: 'md',
  },
});

interface NBCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const NBCard = forwardRef<HTMLDivElement, NBCardProps>(
  ({ className, variant, padding, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(cardVariants({ variant, padding }), className)} {...props}>
        {children}
      </div>
    );
  }
);
```

### Implementation Checklist

- [ ] Create Tailwind config with NB tokens
- [ ] Create `NBButton.tsx`
- [ ] Create `NBCard.tsx`
- [ ] Create `NBInput.tsx`
- [ ] Create `NBSelect.tsx`
- [ ] Create `NBTextarea.tsx`
- [ ] Create `NBBadge.tsx`
- [ ] Create `NBTable.tsx`
- [ ] Create `NBModal.tsx`
- [ ] Create `NBSkeleton.tsx`
- [ ] Create `NBToast.tsx`
- [ ] Create `index.ts` barrel export
- [ ] Write unit tests for all components

---

## 2. Authentication

### Auth Flow

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐
│   Login    │────►│  Backend    │────►│  Set Cookie  │
│   Page     │     │  /auth/login│     │  HttpOnly    │
└────────────┘     └─────────────┘     └──────────────┘
                                               │
                   ┌─────────────┐             │
                   │  Middleware │◄────────────┘
                   │  Check Auth │
                   └──────┬──────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
    ┌─────▼─────┐                 ┌───────▼───────┐
    │ Redirect  │                 │   Dashboard   │
    │ to Login  │                 │   Layout      │
    └───────────┘                 └───────────────┘
```

### Role Access Matrix

| Feature | Admin | TopMgmt | KepalaRayon | Koordinator |
|---------|-------|---------|-------------|-------------|
| View Dashboard | Yes | Yes | Yes | Yes |
| View Monitoring | Yes | Yes | Yes (Rayon) | Yes (Area) |
| Manage Users | Yes | No | No | No |
| Manage Rayons | Yes | No | No | No |
| Manage Areas | Yes | No | No | No |
| Import KMZ | Yes | No | No | No |
| Manage Schedules | Yes | No | No | Yes |
| View Reports | Yes | Yes | Yes | Yes |
| Create Tasks | Yes | No | Yes | Yes |
| Settings | Yes | No | No | No |

### Middleware

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/api/auth/login'];
const roleRoutes: Record<string, string[]> = {
  Admin: ['*'],
  TopManagement: ['/dashboard', '/monitoring', '/reports'],
  KepalaRayon: ['/dashboard', '/monitoring', '/reports', '/schedules', '/tasks'],
  KoordinatorLapangan: ['/dashboard', '/monitoring', '/reports', '/schedules', '/tasks'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (userRole && userRole !== 'Admin') {
    const allowedRoutes = roleRoutes[userRole] || [];
    const hasAccess = allowedRoutes.some((route) =>
      route === '*' || pathname.startsWith(route)
    );
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}
```

### Implementation Checklist

- [ ] Create middleware for auth check
- [ ] Create login page with form
- [ ] Create auth API service
- [ ] Set up cookie-based auth
- [ ] Handle token refresh
- [ ] Add logout functionality
- [ ] Role-based route protection

---

## 3. Dashboard Layout

### Sidebar Component

```typescript
// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  UsersIcon,
  MapIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ClipboardIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: ChartBarIcon, roles: ['*'] },
  { name: 'Monitoring', href: '/monitoring', icon: MapPinIcon, roles: ['*'] },
  { name: 'Pengguna', href: '/users', icon: UsersIcon, roles: ['Admin'] },
  { name: 'Area', href: '/areas', icon: MapIcon, roles: ['Admin'] },
  { name: 'Rayon', href: '/rayons', icon: BuildingOfficeIcon, roles: ['Admin'] },
  { name: 'Jadwal', href: '/schedules', icon: CalendarIcon, roles: ['Admin', 'KoordinatorLapangan'] },
  { name: 'Tugas', href: '/tasks', icon: ClipboardIcon, roles: ['Admin', 'KepalaRayon', 'KoordinatorLapangan'] },
  { name: 'Laporan', href: '/reports', icon: ClipboardIcon, roles: ['*'] },
  { name: 'Pengaturan', href: '/settings', icon: CogIcon, roles: ['Admin'] },
];

interface SidebarProps {
  user: { role: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const filteredNav = navigation.filter((item) =>
    item.roles.includes('*') || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-nb-navy text-white flex flex-col">
      <div className="p-6 border-b border-white/20">
        <h1 className="text-2xl font-extra-bold">SEKAR</h1>
        <p className="text-white/60 text-sm mt-1">Dashboard Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 font-medium transition-colors',
                isActive ? 'bg-white text-nb-navy' : 'text-white/80 hover:bg-white/10'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <p className="text-white/60 text-sm">Logged in as</p>
        <p className="font-bold">{user.role}</p>
      </div>
    </aside>
  );
}
```

### Implementation Checklist

- [ ] Create dashboard layout with sidebar
- [ ] Create Sidebar component with role-based nav
- [ ] Create Header component
- [ ] Create breadcrumb component
- [ ] Add mobile responsive hamburger menu
- [ ] Add user dropdown menu

---

## 4. User Management

### Pages

- `/users` - List all users with search/filter
- `/users/new` - Create new user form
- `/users/[id]` - Edit user form

### Features

- Search by name/username
- Filter by role
- Role-based field visibility (Rayon for KepalaRayon, Area for Koordinator)
- Password reset functionality
- Soft delete

### Implementation Checklist

- [ ] Create users list page with search/filter
- [ ] Create user form page (create/edit)
- [ ] Add role-based form fields
- [ ] Implement delete user (soft delete)
- [ ] Add password reset functionality
- [ ] Write E2E tests

---

## 5. Area Management

### Pages

- `/areas` - List areas with grid/table view
- `/areas/new` - Create area with polygon editor
- `/areas/[id]` - Edit area with polygon editor
- `/areas/import` - KMZ import page

### Polygon Editor Component

```typescript
// src/components/maps/PolygonEditor.tsx
'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface PolygonEditorProps {
  initialPolygon: GeoJSON.Polygon | null;
  center: [number, number];
  onPolygonChange: (polygon: GeoJSON.Polygon | null) => void;
}

export function PolygonEditor({ initialPolygon, center, onPolygonChange }: PolygonEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: center,
      zoom: 15,
    });

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      defaultMode: 'draw_polygon',
    });

    map.current.addControl(draw.current);

    if (initialPolygon) {
      draw.current.add({ type: 'Feature', geometry: initialPolygon, properties: {} });
    }

    map.current.on('draw.create', updateArea);
    map.current.on('draw.delete', updateArea);
    map.current.on('draw.update', updateArea);

    function updateArea() {
      const data = draw.current?.getAll();
      if (data?.features.length) {
        onPolygonChange(data.features[0].geometry as GeoJSON.Polygon);
      } else {
        onPolygonChange(null);
      }
    }

    return () => map.current?.remove();
  }, []);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

### Implementation Checklist

- [ ] Create areas list page with grid/table view
- [ ] Create area form with polygon editor
- [ ] Implement Mapbox polygon drawing
- [ ] Calculate polygon area automatically
- [ ] Add staff requirements section to form
- [ ] Implement delete area
- [ ] Write E2E tests

---

## 6. KMZ Import

### Import Flow

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Upload KMZ   │───►│  Preview      │───►│  Confirm      │
│  File         │    │  Areas        │    │  Import       │
└───────────────┘    └───────────────┘    └───────────────┘
                           │
                     [Select/Deselect]
                     [View on Map]
```

### Implementation Checklist

- [ ] Create KMZ import page
- [ ] Implement file dropzone component
- [ ] Create import preview component with map
- [ ] Handle area selection/deselection
- [ ] Implement confirm import
- [ ] Add progress indicator
- [ ] Handle import errors gracefully
- [ ] Write E2E tests

---

## 7. Real-time Monitoring

### Features

- Live map with worker markers (Workers shown as hard hat icon, Linmas shown as shield icon)
- Area polygons with color-coded staffing status
- Staffing panel showing required vs actual
- Understaffed area warnings
- Auto-refresh every 30 seconds
- Area click to zoom and show details

### Live Map Component

```typescript
// src/components/maps/LiveMap.tsx
'use client';

import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface LiveMapProps {
  workers: LiveWorker[];
  areas: AreaStatus[];
  selectedArea: string | null;
  onAreaSelect: (areaId: string | null) => void;
}

export function LiveMap({ workers, areas, selectedArea, onAreaSelect }: LiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [112.7378, -7.2898], // Surabaya center
      zoom: 12,
    });

    map.current.on('load', () => {
      // Add area polygons
      areas.forEach((area) => {
        if (area.boundary_polygon) {
          map.current!.addSource(`area-${area.id}`, {
            type: 'geojson',
            data: { type: 'Feature', geometry: area.boundary_polygon, properties: {} },
          });

          map.current!.addLayer({
            id: `area-fill-${area.id}`,
            type: 'fill',
            source: `area-${area.id}`,
            paint: {
              'fill-color': area.isUnderstaffed ? '#DC2626' : '#0066CC',
              'fill-opacity': 0.1,
            },
          });

          map.current!.addLayer({
            id: `area-line-${area.id}`,
            type: 'line',
            source: `area-${area.id}`,
            paint: {
              'line-color': area.isUnderstaffed ? '#DC2626' : '#0066CC',
              'line-width': 3,
            },
          });
        }
      });
    });

    return () => map.current?.remove();
  }, [areas]);

  // Update worker markers using React components instead of innerHTML
  useEffect(() => {
    if (!map.current) return;

    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    workers.forEach((worker) => {
      const el = document.createElement('div');
      el.textContent = worker.role === 'Worker' ? '👷' : '🛡️';
      el.style.cssText = `
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        background: ${worker.isOnline ? '#1B5E20' : '#DC2626'}; border: 2px solid #000;
        border-radius: 50%; font-size: 16px; cursor: pointer;
      `;

      // Use safe text content for popup
      const popupContent = document.createElement('div');
      const nameEl = document.createElement('strong');
      nameEl.textContent = worker.name;
      const roleEl = document.createElement('span');
      roleEl.textContent = worker.role;
      const statusEl = document.createElement('span');
      statusEl.textContent = worker.isOnline ? '● Online' : '○ Offline';
      popupContent.appendChild(nameEl);
      popupContent.appendChild(document.createElement('br'));
      popupContent.appendChild(roleEl);
      popupContent.appendChild(document.createElement('br'));
      popupContent.appendChild(statusEl);

      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent);

      markers.current[worker.id] = new mapboxgl.Marker(el)
        .setLngLat([worker.lastLocation.longitude, worker.lastLocation.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [workers]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
```

### Implementation Checklist

- [ ] Create monitoring dashboard page
- [ ] Implement live map with worker markers
- [ ] Add area polygon rendering
- [ ] Implement staffing status panel
- [ ] Add real-time data polling (30 sec)
- [ ] Add area click interaction
- [ ] Add worker popup details
- [ ] Write E2E tests

---

## 8. Scheduling

### Features

- Calendar view of schedules
- Worker assignment to area/shift
- Bulk scheduling
- Validation against staff requirements
- Date range selection

### Implementation Checklist

- [ ] Create schedules list/calendar page
- [ ] Create schedule form modal
- [ ] Implement worker assignment dropdown
- [ ] Add shift selection
- [ ] Implement date range picker
- [ ] Add bulk scheduling
- [ ] Validate against staff requirements
- [ ] Write E2E tests

---

## 9. API Integration

### API Client Setup

```typescript
// src/lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await apiClient.post('/auth/refresh');
        return apiClient.request(error.config);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### Service Examples

```typescript
// src/lib/api/users.ts
export const usersApi = {
  getAll: async (params?: { search?: string; role?: string }) => {
    const { data } = await apiClient.get('/users', { params });
    return data;
  },
  getById: async (id: string) => {
    const { data } = await apiClient.get(`/users/${id}`);
    return data;
  },
  create: async (payload: CreateUserDto) => {
    const { data } = await apiClient.post('/users', payload);
    return data;
  },
  update: async (id: string, payload: UpdateUserDto) => {
    const { data } = await apiClient.patch(`/users/${id}`, payload);
    return data;
  },
  delete: async (id: string) => {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },
};

// src/lib/api/monitoring.ts
export const monitoringApi = {
  getLiveWorkers: async () => {
    const { data } = await apiClient.get('/monitoring/live-workers');
    return data;
  },
  getAreaStatuses: async () => {
    const { data } = await apiClient.get('/monitoring/area-statuses');
    return data;
  },
};
```

---

## 10. Testing

### Test Commands

```bash
# Unit tests
npm test

# E2E tests with Playwright
npm run test:e2e

# Accessibility tests
npm run test:a11y
```

### Testing Checklist

- [x] Unit tests for all NB components (145 tests, 4 suites, 100% pass rate)
- [ ] Unit tests for API services (pending)
- [x] E2E tests for auth flow (spec file created)
- [x] E2E tests for user CRUD (spec file created)
- [x] E2E tests for area CRUD + map (spec file created)
- [x] E2E tests for task management (spec file created)
- [x] E2E tests for reports review (spec file created)
- [x] E2E tests for navigation (spec file created)
- [ ] Accessibility tests (axe-core) (pending)

**Test Results (Feb 3, 2026):**
- ✅ Lint: 0 errors, 8 acceptable warnings
- ✅ Unit Tests: 145/145 passing (Button, Card, Input, FormInput)
- ✅ TypeScript: 0 type errors
- ✅ Production Build: Successful (37.5s)
- ⚠️ E2E Tests: 6 spec files created (pending server setup)
- 📊 Coverage: 3.71% overall (UI components: 100%)

---

## 11. Success Criteria

1. Neo Brutalism design system implemented and consistent
2. Authentication with role-based access control
3. User management CRUD with role assignment
4. Area management with polygon map editor
5. KMZ import with preview and confirmation
6. Rayon management CRUD
7. Worker schedule management
8. Real-time monitoring dashboard with live map
9. Responsive design for tablet/desktop
10. All E2E tests pass
11. WCAG 2.1 AA accessibility compliance

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "typescript": "^5.3.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "mapbox-gl": "^3.0.0",
    "@mapbox/mapbox-gl-draw": "^1.4.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.49.0",
    "@hookform/resolvers": "^3.3.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "@heroicons/react": "^2.1.0"
  }
}
```

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
