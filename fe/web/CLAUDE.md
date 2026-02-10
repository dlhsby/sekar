# SEKAR Web Dashboard - Development Guide

## Overview

SEKAR Web Dashboard is a Next.js 16.1.4 application with React 19 using the **Neo Brutalism** design system. The UI is built with Tailwind CSS v4 (CSS-first configuration) and shadcn-ui components with custom NB styling.

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router)
- **React**: 19.2.3
- **Styling**: Tailwind CSS v4 (CSS-first, NO tailwind.config.ts)
- **Components**: shadcn-ui + Neo Brutalism styling
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query
- **State**: Zustand for UI state, AuthContext for auth
- **Maps**: Mapbox GL JS

## Environment Setup

**First-time setup (REQUIRED):**

```bash
# 1. Copy the environment template
cp .env.example .env

# 2. Edit .env and add your Mapbox token
# Get token from: https://account.mapbox.com/access-tokens/
nano .env  # or use your preferred editor

# 3. That's it! Ready to run
npm run dev
```

**Environment files:**
- `.env.example` - Single template with all variables (COMMITTED to git)
  - Default values work for local development
  - Comments show what to change for production
- `.env` - Your actual environment (NEVER commit, in .gitignore)
- `.env.production` - Production environment (NEVER commit, in .gitignore)

**Security:**
- ✅ Commit `.env.example` only (template with safe defaults)
- ❌ NEVER commit `.env`, `.env.local`, or `.env.production` (contain secrets)
- 🔑 All actual values and secrets go in `.env` (local) or `.env.production` (cloud)

## Quick Start

```bash
npm install
cp .env.example .env        # First time only, then add your Mapbox token
npm run dev                 # http://localhost:3001
npm run build               # Production build
npm run test:e2e            # Playwright E2E tests
```

## Neo Brutalism 2.0 Design System

### Core Principles
- **Clean borders**: 2px solid black (`border-2 border-nb-black`)
- **Soft-edge shadows**: Subtle blur with opacity (`shadow-nb-sm`, `shadow-nb-md`, `shadow-nb-lg`)
- **Friendly corners**: 4-8px border radius (`rounded-nb-sm`, `rounded-nb-base`, `rounded-nb-md`)
- **48px touch targets**: All interactive elements (`min-h-touch`)
- **High contrast**: Soft black text (#1C1917), strong colors
- **Space Grotesk headings**: Modern geometric font for h1-h6

### Color Tokens (use `bg-nb-*`, `text-nb-*`, `border-nb-*`)
```
Primary:     nb-primary (#7FBC8C), nb-primary-hover (#5A9468), nb-primary-active (#4A7D56)
Success:     nb-success (#7FBC8C), nb-success-light (#BAFCA2)
Warning:     nb-warning (#E3A018), nb-warning-light (#FFDB58)
Danger:      nb-danger (#FF6B6B), nb-danger-light (#FFA07A)
Info:        nb-info (#A7DBD8), nb-info-light (#A7DBD8)
Neutral:     nb-black (#1C1917), nb-white (#FFFFFF), nb-background (#F5F0EB)
Sidebar:     nb-sidebar (#1A4D2E), nb-sidebar-hover (#2D5233), nb-sidebar-active (#0F3520)
Gray scale:  nb-gray-50 (#FAFAF9) through nb-gray-900 (#1C1917) - warm stone tones
```

### Shadow Tokens (Soft-edge with blur)
```
shadow-nb-xs     → 2px 2px 1px rgba(28,25,23,0.15) (badges)
shadow-nb-sm     → 4px 4px 2px rgba(28,25,23,0.18) (cards)
shadow-nb-md     → 6px 6px 3px rgba(28,25,23,0.20) (buttons, inputs)
shadow-nb-lg     → 8px 8px 4px rgba(28,25,23,0.22) (modals, dropdowns)
shadow-nb-xl     → 12px 12px 6px rgba(28,25,23,0.25) (large modals)
shadow-nb-active → 2px 2px 1px rgba(28,25,23,0.15) (pressed state)
```

### Border Radius Tokens
```
rounded-nb-sm   → 4px (badges, small elements)
rounded-nb-base → 6px (buttons, cards, inputs)
rounded-nb-md   → 8px (dialogs, large containers)
rounded-nb-lg   → 12px (special containers)
rounded-nb-xl   → 16px (extra large containers)
```

## Component Library

All components are in `src/components/ui/` and exported from `src/components/ui/index.ts`.

### Core Components

```tsx
import {
  Button,          // Primary interactive element
  Card,            // Content container with variants
  Input,           // Text input with state variants
  Select,          // Dropdown select
  Badge,           // Status indicators
  Dialog,          // Modal dialogs
  Table,           // Data tables
  Textarea,        // Multiline input
  Label,           // Form labels
  DropdownMenu,    // Action menus
} from '@/components/ui';
```

### Form Components

```tsx
import {
  FormInput,       // Input with label, error, helper text
  FormSelect,      // Select with label, options array
} from '@/components/ui';
```

### Layout Components

```tsx
import {
  Sidebar,         // Navigation sidebar
  SidebarProvider, // Sidebar context
  SidebarTrigger,  // Toggle button
} from '@/components/ui';
```

### Loading & Empty States

```tsx
import {
  Skeleton,        // Loading placeholder
  SkeletonCard,    // Card loading state
  SkeletonTable,   // Table loading state
  SkeletonList,    // List loading state
  EmptyState,      // Empty/error states
} from '@/components/ui';
```

### Usage Examples

#### Buttons
```tsx
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button loading>Loading...</Button>
<Button leftIcon={<Plus />}>With Icon</Button>
```

#### Cards
```tsx
<Card variant="default">          {/* 3px border, small shadow */}
<Card variant="elevated">         {/* 3px border, medium shadow */}
<Card variant="outlined">         {/* 3px border, no shadow */}
<Card variant="filled">           {/* No border, gray background */}
<Card interactive>                {/* Hover/press animations */}
```

#### Forms
```tsx
<FormInput
  label="Email"
  type="email"
  placeholder="Enter email"
  error={errors.email?.message}
  leftIcon={<Mail />}
  {...register('email')}
/>

<FormSelect
  label="Role"
  options={[
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
  ]}
  value={role}
  onChange={setRole}
/>
```

#### Empty States
```tsx
<EmptyState variant="noData" />              {/* Default empty */}
<EmptyState variant="noResults" />           {/* Search no results */}
<EmptyState variant="error" />               {/* Error occurred */}
<EmptyState variant="offline" />             {/* No connection */}
<EmptyState
  variant="noData"
  title="Custom Title"
  description="Custom description"
  action={{ label: 'Add First', onClick: handleAdd }}
/>
```

#### Skeletons
```tsx
<Skeleton variant="text" />
<Skeleton variant="heading" />
<Skeleton variant="card" />
<Skeleton variant="avatar" />
<SkeletonCard />                             {/* Full card skeleton */}
<SkeletonTable rows={5} />                   {/* Table skeleton */}
<SkeletonList items={3} />                   {/* List skeleton */}
```

## Project Structure

```
fe/web/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (dashboard)/           # Dashboard pages
│   │   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   │   ├── page.tsx           # Dashboard home
│   │   │   ├── users/             # User management
│   │   │   ├── areas/             # Area management
│   │   │   ├── rayons/            # Rayon management
│   │   │   ├── tasks/             # Task management
│   │   │   ├── reports/           # Report viewing
│   │   │   ├── schedules/         # Schedule management
│   │   │   └── monitoring/        # Real-time monitoring
│   │   └── globals.css            # Tailwind v4 theme tokens
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   ├── layout/                # Header, Breadcrumb
│   │   ├── areas/                 # Area-specific components
│   │   ├── users/                 # User-specific components
│   │   └── ...
│   ├── lib/
│   │   ├── api/                   # API hooks and client
│   │   ├── auth/                  # Auth context and hooks
│   │   └── utils/                 # Utilities (cn, cookies)
│   ├── stores/                    # Zustand stores
│   └── types/                     # TypeScript types
├── e2e/                           # Playwright E2E tests
├── postcss.config.mjs             # PostCSS with @tailwindcss/postcss
├── components.json                # shadcn-ui config
└── package.json
```

## Key Patterns

### Authentication
```tsx
// Get current user
const { user, loading, logout } = useAuth();
const user = useUser(); // Shorthand

// Protected routes handled by middleware.ts
// Role check in components
if (!['admin', 'supervisor'].includes(user.role)) {
  return <AccessDenied />;
}
```

### Data Fetching
```tsx
// Use TanStack Query hooks
const { data, isLoading, error } = useUsers({ role: 'admin' });
const { data: areas } = useAreas({ rayon_id: selectedRayon });
```

### Form Handling
```tsx
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Tailwind v4 Configuration

**IMPORTANT**: This project uses Tailwind CSS v4 with CSS-first configuration. There is NO `tailwind.config.ts` file.

All design tokens are defined in `src/app/globals.css` using the `@theme` directive:

```css
@theme {
  --color-nb-primary: #0066CC;
  --shadow-nb-md: 6px 6px 0px #000000;
  /* ... */
}
```

Custom utilities are defined in `@layer utilities`:

```css
@layer utilities {
  .border-3 { border-width: 3px; }
  .min-h-touch { min-height: 48px; }
}
```

## Testing

### Unit Tests (Jest)
```bash
npm test                  # Run all tests
npm test:coverage         # With coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # With UI
```

## Best Practices

1. **Always use UI components** - Don't manually style buttons, cards, inputs
2. **Use EmptyState for empty/error** - Consistent empty and error states
3. **Use Skeleton for loading** - Consistent loading placeholders
4. **Follow NB design** - 3px borders, hard shadows, 0 radius
5. **48px touch targets** - All buttons and interactive elements
6. **Use CVA for variants** - class-variance-authority for component variants
7. **Indonesian labels** - UI text should be in Indonesian
8. **Role values MUST be lowercase** - Use `'admin'`, `'worker'`, `'top_management'`, etc. (never PascalCase)
9. **FormSelect placeholders** - Use `'none'` or `'all'` sentinel values, never empty string `''`
10. **Type safety** - Avoid `any` type; use proper types from `@/types/models`

## Test Coverage

**Current Status (February 3, 2026):**
- **Unit tests**: 505 passing (100% pass rate)
- **E2E tests**: 8 spec files (~172 tests)
- **Test coverage**: >80% on all UI components

### Running Tests

```bash
# Unit tests
npm test                         # Run all
npm test -- --watch              # Watch mode
npm run test:cov                 # With coverage

# E2E tests
npm run test:e2e                 # Headless
npm run test:e2e:ui              # With UI
npx playwright test 07-schedules # Single file
```

### Test Files Location

- **Unit tests**: `src/components/ui/__tests__/*.test.tsx`
- **E2E tests**: `e2e/*.spec.ts`
- **E2E fixtures**: `e2e/fixtures/mock-api.ts`

<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>
