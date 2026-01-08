# Phase 6 - Web Dashboard Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API running (from Phase 1)
- Git

### 1. Project Initialization

```bash
# Navigate to web folder
cd /path/to/sekar/fe/web

# Create Next.js project
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Answer prompts:
# ✔ Would you like to use TypeScript? … Yes
# ✔ Would you like to use ESLint? … Yes
# ✔ Would you like to use Tailwind CSS? … Yes
# ✔ Would you like to use `src/` directory? … No (we'll use app/)
# ✔ Would you like to use App Router? … Yes
# ✔ Would you like to customize the default import alias? … No
```

### 2. Install Core Dependencies

```bash
# Navigation & Routing
npm install next@15

# UI Components (choose one)
# Option A: Shadcn/ui
npx shadcn-ui@latest init
# Option B: Material-UI
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled

# State Management
npm install zustand @tanstack/react-query

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# API Client
npm install axios

# Maps
npm install @react-google-maps/api

# Charts
npm install recharts
# OR
npm install chart.js react-chartjs-2

# Utilities
npm install date-fns clsx tailwind-merge

# Icons
npm install lucide-react
# OR
npm install @heroicons/react

# Tables
npm install @tanstack/react-table

# File Handling
npm install jszip xml2js file-saver
npm install -D @types/jszip @types/xml2js @types/file-saver
```

### 3. Install Dev Dependencies

```bash
# Testing
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D playwright @playwright/test

# Code Quality
npm install -D eslint-config-next @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier

# Git Hooks
npm install -D husky lint-staged
```

### 4. Project Structure Setup

```bash
# Create folder structure
mkdir -p app/\(auth\)/login
mkdir -p app/\(dashboard\)/{map,reports,attendance,workers,areas,users,analytics,settings,profile}
mkdir -p components/{ui,layout,dashboard,map,reports,attendance,workers,areas,charts,forms,shared}
mkdir -p lib/{api,hooks,utils,types,constants,store}
mkdir -p public/{images,icons,fonts}
mkdir -p tests/{unit,integration,e2e}
```

### 5. Configuration Files

#### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
};

module.exports = nextConfig;
```

#### `.env.local.example`
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here

# App Configuration
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_NAME=SEKAR Dashboard
```

#### `tsconfig.json` (update paths)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6. Create Base Components

#### `lib/api/client.ts`
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
```

#### `app/layout.tsx`
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SEKAR Dashboard',
  description: 'Worker tracking and management system for DKRTH Surabaya',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

#### `app/(auth)/login/page.tsx`
```typescript
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <h1 className="text-3xl font-bold text-center">SEKAR Dashboard</h1>
        <form className="mt-8 space-y-6">
          {/* Login form */}
        </form>
      </div>
    </div>
  );
}
```

### 7. Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## 📝 Development Workflow

### Day-by-Day Implementation

**Week 1: Foundation**
1. Setup project and dependencies
2. Create authentication flow
3. Build main layout with sidebar
4. Implement dashboard home page

**Week 2: Data Management**
5. Workers management pages
6. Areas management pages
7. Live map integration
8. Report listing and details

**Week 3: Analytics & Reporting**
9. Attendance tracking
10. Analytics dashboard
11. Chart implementations
12. Export functionality

**Week 4: Advanced Features**
13. User management
14. Report builder
15. Settings page
16. Testing and deployment

---

## 🧪 Testing Commands

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npm run type-check
```

---

## 📦 Build & Deploy

### Build for Production
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Deploy to AWS Amplify
```bash
# Follow AWS Amplify console instructions
# Connect GitHub repository
# Configure build settings
```

---

## 📚 Recommended Reading

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)

### UI Libraries
- [Shadcn/ui](https://ui.shadcn.com/)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)

### State Management
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://zustand-demo.pmnd.rs/)

### Testing
- [Playwright](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)

---

## 🔗 Related Documentation

- **Overview:** `.agents/phase-6-web-dashboard/overview.md`
- **Technical Requirements:** `.agents/phase-6-web-dashboard/technical-requirements.md`
- **Backend API:** `.agents/phase-1-mvp/backend-requirements.md`
- **Mobile App:** `.agents/phase-1-mvp/mobile-requirements.md`

---

## 💡 Tips

1. **Start with Shadcn/ui** - Pre-built, customizable components
2. **Use TanStack Query** - Better data fetching and caching
3. **Implement auth early** - Protect routes from day 1
4. **Test as you build** - Don't leave testing until the end
5. **Follow Next.js conventions** - Use App Router best practices
6. **Optimize images** - Use Next.js Image component
7. **Keep components small** - Single responsibility principle
8. **Document as you go** - JSDoc comments for complex logic

---

**Ready to build!** 🚀

Follow the overview.md for detailed requirements and the technical-requirements.md for implementation details.

