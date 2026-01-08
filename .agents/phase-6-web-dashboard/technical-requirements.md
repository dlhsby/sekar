# Phase 6 - Web Dashboard Technical Requirements

## 🏗️ Technology Stack

### Core Framework
- **Next.js:** 15.x (App Router)
- **React:** 18.x
- **TypeScript:** 5.x
- **Node.js:** 18+ (for build)

### UI & Styling
- **TailwindCSS:** 3.x - Utility-first CSS
- **Shadcn/ui** OR **Material-UI (MUI)** - Component library
- **Lucide Icons** or **Heroicons** - Icon set
- **clsx** - Conditional classes
- **tailwind-merge** - Merge Tailwind classes

### State Management
- **Zustand** OR **React Context** - Global state
- **TanStack Query (React Query)** - Server state management
- **Local Storage** - Client-side persistence

### Data Fetching & API
- **Axios** - HTTP client
- **TanStack Query** - Data fetching, caching, synchronization
- **SWR** - Alternative to React Query (if preferred)

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **@hookform/resolvers** - Form resolver for Zod

### Maps
- **@react-google-maps/api** - Google Maps React components
- **@googlemaps/js-api-loader** - Google Maps loader

### Charts & Visualizations
- **Recharts** OR **Chart.js + react-chartjs-2** - Charts
- **date-fns** - Date manipulation
- **react-day-picker** - Date picker

### Tables
- **TanStack Table (React Table)** - Headless table library
- **Export:** react-csv, xlsx library

### File Handling
- **jszip** - Handle ZIP files
- **xml2js** - Parse KMZ/KML files
- **file-saver** - Save files

### Authentication
- **NextAuth.js** - Authentication for Next.js
- **jose** - JWT handling
- **bcryptjs** - Password hashing (if needed client-side)

### Testing
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** OR **Cypress** - E2E testing
- **MSW (Mock Service Worker)** - API mocking

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Run linters on staged files
- **TypeScript ESLint** - TypeScript linting rules

### Deployment
- **Vercel** OR **AWS Amplify** - Hosting
- **Docker** - Containerization (optional)
- **GitHub Actions** - CI/CD

---

## 📁 Detailed Project Structure

```
fe/web/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── map/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   ├── workers/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── areas/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── report-builder/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── export/
│   │       ├── csv/
│   │       │   └── route.ts
│   │       └── pdf/
│   │           └── route.ts
│   ├── layout.tsx                    # Root layout
│   ├── loading.tsx                   # Global loading
│   ├── error.tsx                     # Global error
│   └── not-found.tsx                 # 404 page
├── components/
│   ├── ui/                           # Shadcn/ui or base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── ...
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Breadcrumbs.tsx
│   │   └── UserMenu.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── QuickActions.tsx
│   │   └── OverviewCharts.tsx
│   ├── map/
│   │   ├── WorkerMap.tsx
│   │   ├── WorkerMarker.tsx
│   │   ├── MapControls.tsx
│   │   ├── MapFilters.tsx
│   │   └── MarkerCluster.tsx
│   ├── reports/
│   │   ├── ReportCard.tsx
│   │   ├── ReportTable.tsx
│   │   ├── ReportFilters.tsx
│   │   ├── ReportDetail.tsx
│   │   ├── ImageLightbox.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── BulkActions.tsx
│   ├── attendance/
│   │   ├── AttendanceTable.tsx
│   │   ├── AttendanceCalendar.tsx
│   │   ├── TimeSheet.tsx
│   │   └── AttendanceStats.tsx
│   ├── workers/
│   │   ├── WorkerCard.tsx
│   │   ├── WorkerTable.tsx
│   │   ├── WorkerForm.tsx
│   │   ├── WorkerDetail.tsx
│   │   └── AssignmentDialog.tsx
│   ├── areas/
│   │   ├── AreaCard.tsx
│   │   ├── AreaTable.tsx
│   │   ├── AreaForm.tsx
│   │   ├── KMZUploader.tsx
│   │   └── BoundaryMap.tsx
│   ├── charts/
│   │   ├── LineChart.tsx
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   ├── AreaChart.tsx
│   │   └── HeatMap.tsx
│   ├── forms/
│   │   ├── FormField.tsx
│   │   ├── FormSelect.tsx
│   │   ├── FormDatePicker.tsx
│   │   ├── FormFileUpload.tsx
│   │   └── FormError.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── Pagination.tsx
│       ├── SearchBar.tsx
│       ├── FilterPanel.tsx
│       ├── ExportButton.tsx
│       ├── LoadingSpinner.tsx
│       ├── ErrorMessage.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts              # API client configuration
│   │   ├── auth.ts                # Auth API calls
│   │   ├── workers.ts             # Workers API calls
│   │   ├── areas.ts               # Areas API calls
│   │   ├── reports.ts             # Reports API calls
│   │   ├── attendance.ts          # Attendance API calls
│   │   ├── analytics.ts           # Analytics API calls
│   │   └── users.ts               # Users API calls
│   ├── hooks/
│   │   ├── useAuth.ts             # Auth hook
│   │   ├── useWorkers.ts          # Workers data hook
│   │   ├── useAreas.ts            # Areas data hook
│   │   ├── useReports.ts          # Reports data hook
│   │   ├── useAttendance.ts       # Attendance data hook
│   │   ├── useAnalytics.ts        # Analytics data hook
│   │   ├── useRealtime.ts         # Real-time updates
│   │   └── useDebounce.ts         # Debounce hook
│   ├── utils/
│   │   ├── formatters.ts          # Data formatting
│   │   ├── validators.ts          # Input validation
│   │   ├── gps.ts                 # GPS utilities
│   │   ├── dates.ts               # Date utilities
│   │   ├── export.ts              # Export utilities
│   │   ├── kmz-parser.ts          # KMZ file parser
│   │   └── cn.ts                  # className utility
│   ├── types/
│   │   ├── api.ts                 # API types
│   │   ├── models.ts              # Data models
│   │   └── components.ts          # Component types
│   ├── constants/
│   │   ├── config.ts              # App config
│   │   ├── routes.ts              # Route definitions
│   │   └── colors.ts              # Color constants
│   └── store/
│       ├── auth-store.ts          # Auth state (Zustand)
│       ├── ui-store.ts            # UI state
│       └── filters-store.ts       # Filter state
├── middleware.ts                  # Next.js middleware (auth)
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── styles/
│   └── globals.css
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local.example
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🔌 API Integration

### API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
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

export default apiClient;
```

### Data Fetching with React Query

```typescript
// lib/hooks/useWorkers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as workersApi from '@/lib/api/workers';

export function useWorkers() {
  return useQuery({
    queryKey: ['workers'],
    queryFn: workersApi.getWorkers,
  });
}

export function useWorker(id: number) {
  return useQuery({
    queryKey: ['worker', id],
    queryFn: () => workersApi.getWorker(id),
  });
}

export function useCreateWorker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workersApi.createWorker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
  });
}
```

---

## 🎨 UI Component Examples

### Using Shadcn/ui

```typescript
// components/dashboard/StatsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Data Table with TanStack Table

```typescript
// components/workers/WorkerTable.tsx
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { Worker } from '@/lib/types/models';

interface WorkerTableProps {
  data: Worker[];
}

export function WorkerTable({ data }: WorkerTableProps) {
  const columns = [
    {
      accessorKey: 'full_name',
      header: 'Name',
    },
    {
      accessorKey: 'username',
      header: 'Username',
    },
    {
      accessorKey: 'area.name',
      header: 'Assigned Area',
    },
    // ... more columns
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-2 text-left">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🔐 Authentication & Authorization

### NextAuth.js Configuration

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { login } from '@/lib/api/auth';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const response = await login(
          credentials?.username!,
          credentials?.password!
        );
        
        if (response.data) {
          return {
            id: response.data.user.id,
            name: response.data.user.full_name,
            email: response.data.user.username,
            role: response.data.user.role,
            token: response.data.token,
          };
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.token;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Middleware for Protected Routes

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only routes
    if (path.startsWith('/users') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Supervisor-only routes
    if (path.startsWith('/dashboard') && token?.role === 'worker') {
      return NextResponse.redirect(new URL('/login', req.url));
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
  matcher: ['/dashboard/:path*', '/users/:path*'],
};
```

---

## 🧪 Testing Configuration

### Jest Setup

```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

---

## 📦 Environment Variables

```bash
# .env.local.example
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here

# App Configuration
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME=SEKAR Dashboard
```

---

## ✅ Acceptance Criteria

### Performance
- [ ] Lighthouse score >90
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] Bundle size <500KB (initial load)

### Functionality
- [ ] All CRUD operations work
- [ ] Real-time map updates
- [ ] Export functionality works
- [ ] Forms validate properly
- [ ] Search and filters work

### Quality
- [ ] >80% test coverage
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Responsive on all screen sizes
- [ ] Accessible (WCAG 2.1 AA)

### Security
- [ ] Protected routes work
- [ ] XSS prevention implemented
- [ ] CSRF protection enabled
- [ ] Secure headers configured
- [ ] Authentication flow secure

---

*Last updated: January 2026*  
*Phase: 6 - Web Dashboard Technical Requirements*

