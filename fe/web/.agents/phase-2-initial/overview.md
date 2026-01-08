# Phase 2 - Initial Web Dashboard

## 🎯 Objectives

Set up the Next.js project and create basic supervisor views.

**Duration:** 3 days  
**Prerequisites:** Backend Phase 2 complete

---

## 📅 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1 | Setup | Next.js, TailwindCSS, Shadcn, Auth |
| Day 2 | Dashboard | Summary metrics, recent activity |
| Day 3 | Reports & Areas | Basic CRUD views |

---

## 🏗️ Project Setup

### Day 1: Initialize Project

```bash
# Create Next.js project
npx create-next-app@latest sekar-web --typescript --tailwind --eslint --app --src-dir

# Install dependencies
npm install @tanstack/react-query zustand
npm install react-hook-form zod @hookform/resolvers
npm install next-auth
npm install lucide-react

# Setup Shadcn
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label table dialog
```

### Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── areas/
│   │       └── page.tsx
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                        # Shadcn components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── DashboardLayout.tsx
│   └── dashboard/
│       ├── StatsCard.tsx
│       └── RecentActivity.tsx
├── lib/
│   ├── api.ts                     # API client
│   ├── auth.ts                    # NextAuth config
│   └── utils.ts
└── types/
    └── index.ts
```

---

## 📱 Pages

### Login Page

Simple login form with JWT authentication.

```tsx
// src/app/(auth)/login/page.tsx
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>SEKAR Dashboard</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Dashboard Home

```tsx
// src/app/(dashboard)/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-4 gap-4">
        <StatsCard title="Active Workers" value={28} icon={Users} />
        <StatsCard title="Reports Today" value={156} icon={FileText} />
        <StatsCard title="Areas Covered" value={12} icon={MapPin} />
        <StatsCard title="Pending Tasks" value={23} icon={Clock} />
      </div>

      <RecentReports />
    </div>
  );
}
```

### Reports List

Basic table with reports.

```tsx
// src/app/(dashboard)/reports/page.tsx
export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <DatePicker />
          <FilterDropdown />
        </div>
      </div>
      
      <ReportsTable />
    </div>
  );
}
```

### Areas Management

```tsx
// src/app/(dashboard)/areas/page.tsx
export default function AreasPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Areas</h1>
        <Button>+ Add Area</Button>
      </div>
      
      <AreasTable />
    </div>
  );
}
```

---

## 🔐 Authentication

### NextAuth Configuration

```typescript
// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { apiClient } from './api';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const response = await apiClient.post('/auth/login', {
            username: credentials?.username,
            password: credentials?.password,
          });
          
          return {
            id: response.data.user.id,
            name: response.data.user.full_name,
            role: response.data.user.role,
            accessToken: response.data.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

---

## ✅ Deliverables

- [ ] Next.js 15 project set up
- [ ] TailwindCSS + Shadcn configured
- [ ] Authentication working
- [ ] Dashboard layout (sidebar, header)
- [ ] Dashboard home with stats
- [ ] Reports list page
- [ ] Areas list page
- [ ] Deployed to staging

---

*Last Updated: January 2026*

