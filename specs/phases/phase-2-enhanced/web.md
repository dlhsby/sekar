# Phase 2 - Web Dashboard Implementation Checklist

**Duration:** 5 days
**Prerequisites:** Phase 1 MVP backend deployed

---

## Overview

Build a basic view-only web dashboard for supervisors using Next.js 15 with App Router.

---

## Timeline

| Day | Focus | Deliverables |
|-----|-------|--------------|
| Day 1 | Project Setup | Next.js project, auth, layout |
| Day 2 | Dashboard | Overview page, stats cards |
| Day 3 | Live Map | Google Maps integration |
| Day 4 | Reports | Reports list with filters |
| Day 5 | Attendance | Attendance view, testing |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Shadcn/ui
- **Data Fetching:** TanStack Query
- **HTTP Client:** Axios
- **Maps:** @react-google-maps/api
- **Charts:** Recharts

---

## Project Setup

### Initialization

```bash
cd fe/web
npx create-next-app@latest . --typescript --tailwind --app --import-alias "@/*"

# Install dependencies
npm install @tanstack/react-query axios zustand
npm install @react-google-maps/api recharts date-fns
npm install lucide-react clsx tailwind-merge

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input table badge avatar
```

### Project Structure

```
fe/web/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard overview
│   │   ├── map/
│   │   │   └── page.tsx          # Live worker map
│   │   ├── reports/
│   │   │   └── page.tsx          # Reports list
│   │   └── attendance/
│   │       └── page.tsx          # Attendance view
│   ├── layout.tsx
│   └── loading.tsx
├── components/
│   ├── ui/                       # Shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── UserMenu.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── OverviewCharts.tsx
│   ├── map/
│   │   ├── WorkerMap.tsx
│   │   └── WorkerMarker.tsx
│   └── reports/
│       ├── ReportTable.tsx
│       └── ReportFilters.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── reports.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useReports.ts
│   └── types/
│       └── api.ts
├── middleware.ts
├── .env.local
└── next.config.js
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
NEXT_PUBLIC_APP_NAME=SEKAR Dashboard
```

---

## Pages Implementation

### Login Page

**Path:** `app/(auth)/login/page.tsx`

**Features:**
- Username/password form
- Login API call
- Store JWT token
- Redirect to dashboard on success
- Role-based access (reject workers)

**Checklist:**
- [ ] Login form component
- [ ] Form validation
- [ ] API call to /auth/login
- [ ] Store token in localStorage
- [ ] Handle login errors
- [ ] Redirect supervisors/admins to dashboard
- [ ] Reject worker logins with message

### Dashboard Overview

**Path:** `app/(dashboard)/page.tsx`

**Features:**
- Stats cards (workers active, areas covered, reports today)
- Recent activity feed
- Quick overview charts
- Navigation cards

**Checklist:**
- [ ] Page layout
- [ ] StatsCard component
- [ ] Fetch dashboard stats from API
- [ ] Activity feed (recent reports)
- [ ] Quick actions cards
- [ ] Loading states
- [ ] Error handling

### Live Worker Map

**Path:** `app/(dashboard)/map/page.tsx`

**Features:**
- Google Maps with worker markers
- Worker info popup on click
- Color-coded by area type
- Auto-refresh (30 second interval)
- Filter by area

**Checklist:**
- [ ] Google Maps integration
- [ ] Fetch worker locations
- [ ] Worker markers with custom icons
- [ ] Info popup on marker click
- [ ] Color coding by area type
- [ ] Auto-refresh mechanism
- [ ] Area filter dropdown
- [ ] Loading state
- [ ] Handle map errors

### Reports List

**Path:** `app/(dashboard)/reports/page.tsx`

**Features:**
- Data table with reports
- Filter by date, area, condition
- Sort by columns
- View report details (modal)
- Export to CSV

**Checklist:**
- [ ] Reports data table
- [ ] Date range filter
- [ ] Area filter dropdown
- [ ] Condition filter
- [ ] Sortable columns
- [ ] Pagination
- [ ] Report detail modal
- [ ] Image lightbox
- [ ] Export to CSV button
- [ ] Loading and empty states

### Attendance View

**Path:** `app/(dashboard)/attendance/page.tsx`

**Features:**
- Daily attendance summary
- Worker attendance table
- Late clock-ins highlight
- Filter by date

**Checklist:**
- [ ] Attendance summary cards
- [ ] Worker attendance table
- [ ] Date picker
- [ ] Highlight late workers
- [ ] Export functionality
- [ ] Loading states

---

## Layout Components

### Sidebar

**Features:**
- Navigation links
- Active state highlighting
- Collapsible on mobile
- User role indicator

**Checklist:**
- [ ] Navigation links (Dashboard, Map, Reports, Attendance)
- [ ] Active link highlighting
- [ ] Mobile responsive (collapsible)
- [ ] SEKAR logo/branding
- [ ] User role badge

### Header

**Features:**
- Page title/breadcrumbs
- User menu dropdown
- Notification indicator (future)

**Checklist:**
- [ ] Page title
- [ ] User menu (profile, logout)
- [ ] Responsive design
- [ ] Search (optional)

---

## API Integration

### API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### API Hooks

```typescript
// lib/hooks/useReports.ts
import { useQuery } from '@tanstack/react-query';
import { getReports } from '@/lib/api/reports';

export function useReports(filters: ReportFilters) {
  return useQuery({
    queryKey: ['reports', filters],
    queryFn: () => getReports(filters),
    staleTime: 30000, // 30 seconds
  });
}
```

---

## Authentication

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard')
    || request.nextUrl.pathname === '/';

  if (isDashboardPage && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/map/:path*', '/reports/:path*', '/attendance/:path*', '/login'],
};
```

---

## Styling

### Color Scheme

```css
/* Primary: Green (SEKAR brand) */
--primary: #2E7D32;
--primary-foreground: #FFFFFF;

/* Secondary: Blue */
--secondary: #1976D2;

/* Status colors */
--success: #4CAF50;
--warning: #FF9800;
--error: #F44336;
--info: #2196F3;

/* Neutral */
--background: #FFFFFF;
--surface: #F5F5F5;
--border: #E0E0E0;
--text: #212121;
--text-muted: #757575;
```

### TailwindCSS Config

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E7D32',
          50: '#E8F5E9',
          // ... other shades
        },
      },
    },
  },
};
```

---

## Testing

### Unit Tests

- [ ] Login form validation
- [ ] API client interceptors
- [ ] StatsCard component
- [ ] ReportTable component
- [ ] Date formatting utilities

### Integration Tests

- [ ] Login flow
- [ ] Dashboard data loading
- [ ] Map rendering with markers
- [ ] Reports filtering and pagination

### E2E Tests (Optional for Phase 2)

- [ ] Login and navigate to dashboard
- [ ] View worker on map
- [ ] Filter and view reports

---

## Success Criteria

1. Supervisors can login to web dashboard
2. Dashboard shows accurate real-time stats
3. Map displays live worker locations
4. Reports can be filtered and viewed
5. Attendance summary is accurate
6. Responsive design works on desktop/tablet
7. Page load time < 3 seconds

---

## Known Limitations (Phase 2)

- View-only (no CRUD operations)
- No real-time WebSocket updates (polling only)
- Basic responsive design
- English UI only
- No offline support

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0",
    "@react-google-maps/api": "^2.19.0",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

---

## Sign-Off

**Developer:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
