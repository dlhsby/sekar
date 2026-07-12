# SEKAR Web Dashboard - Development Guide

## Overview

SEKAR Web Dashboard is a Next.js 16.1.4 application with React 19 using the **Neo Brutalism** design system. The UI is built with Tailwind CSS v4 (CSS-first configuration) and shadcn-ui components with custom NB styling.

## Phase 3 Planning (Apr 24, 2026)

New pages planned for Phase 3 (Plants Management + Monitoring Rebuild + Public Intake — see history/CHANGELOG.md):
- `/monitoring` v2 — supercluster layer, incremental WS patches, virtualized worker list, hierarchy filter panel, plant + overdue overlays, area detail drawer (ADR-029)
- `/plants/` and `/plants/[areaId]/` — plant species catalog and per-area aggregate inventory (ADR-030)
- `/tasks/new` — dynamic form per `task_type` with species multi-select + quantities (ADR-031)
- `/pruning-requests/` + `[id]/` — public intake queue (`admin_data` review) and detail (ADR-032, ADR-033)
- `/rayons/[id]/capacity/` — weekly service-capacity calendar grid (ADR-035)
- `/seeds/*` — plant-seed inventory ledger
- Sidebar updated to 9 roles: 8 existing + new `staff_kecamatan`

Nothing is built yet. Start from history/CHANGELOG.md when implementing.

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router)
- **React**: 19.2.3
- **Styling**: Tailwind CSS v4 (CSS-first, NO tailwind.config.ts)
- **Components**: shadcn-ui + Neo Brutalism styling
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query
- **State**: Zustand for UI state, AuthContext for auth
- **Maps**: Google Maps JS (`@react-google-maps/api`)

## Environment Setup

**First-time setup (REQUIRED):**

```bash
# 1. Copy the local development template
cp .env.local.example .env.local

# 2. (Optional) Edit .env.local and add your Google Maps API key
# Get a key from: https://console.cloud.google.com/google/maps-apis
nano .env.local  # or use your preferred editor

# 3. That's it! Ready to run
npm run dev
```

**Environment files (templates — committed to git):**
- `.env.local.example` - Local development template (copy to `.env.local`)
- `.env.staging.example` - Staging deployment template (copy to `.env.staging`)
- `.env.production.example` - Production deployment template (copy to `.env.production`)

**Active env files (NEVER commit):**
- `.env.local` - Your actual local config (gitignored)

**Security:**
- Commit `*.example` files only (templates with safe defaults)
- NEVER commit `.env.local`, `.env.staging`, or `.env.production` (contain secrets)

## Quick Start

```bash
npm install
cp .env.local.example .env.local  # First time only; optionally add a Google Maps API key
npm run dev                       # http://localhost:3001
npm run build                     # Production build
npm run test:e2e                  # Playwright E2E tests
```

## Neo Brutalism 2.0 Design System

### Core Principles
- **Clean borders**: 2px solid black (`border-2 border-nb-black`)
- **Soft-edge shadows**: Subtle blur with opacity (`shadow-nb-sm`, `shadow-nb-md`, `shadow-nb-lg`)
- **Friendly corners**: 4-8px border radius (`rounded-nb-sm`, `rounded-nb-base`, `rounded-nb-md`)
- **48px touch targets**: All interactive elements (`min-h-touch`)
- **High contrast**: Soft black text (#1C1917), strong colors
- **Space Grotesk headings**: Modern geometric font for h1-h6

### ⚠️ Tokens are generated — never hand-edit

From Phase 3 M1-R sub-phase **3-R2** onward (planned):
- **Source of truth:** [`specs/design-system/tokens.json`](../../specs/design-system/tokens.json)
- **Generated consumer:** `apps/web/src/app/generated/tokens.css` (emitted by `scripts/build-tokens.ts`; CI validates drift via `tokens-verify`)
- **`@import` wrapper:** `apps/web/src/app/globals.css` becomes `@import './generated/tokens.css';` plus utility classes (`.nb-focus-ring`, `.shadow-nb-*` Tailwind utilities, etc.)
- **Brand fonts:** `next/font/google` in `apps/web/src/app/layout.tsx` loads Space Grotesk, Inter, JetBrains Mono with `display: 'swap'` and CSS variables `--font-display|body|mono`

ESLint rule `no-inline-hex-colors` (added in 3-R1) blocks PRs with raw hex outside `generated/`. To change a token: edit `tokens.json` → `npm run tokens:build` → commit regenerated CSS.

### Color Tokens (use `bg-nb-*`, `text-nb-*`, `border-nb-*`)
```
Primary:     nb-primary (#7FBC8C), nb-primary-hover (#6BA87A), nb-primary-active (#5A9468)
Secondary:   nb-secondary (#8B7355), nb-secondary-hover (#725E45)
Success:     nb-success (#7FBC8C), nb-success-light (#BAFCA2), nb-success-dark (#15803D)
Warning:     nb-warning (#E3A018), nb-warning-light (#FFDB58)
Danger:      nb-danger (#FF6B6B), nb-danger-light (#FFA07A), nb-danger-dark (#991B1B)
Info:        nb-info (#69D2E7), nb-info-light (#A7DBD8)
Neutral:     nb-black (#1C1917), nb-white (#FFFFFF), nb-background (#F5F0EB)
Sidebar:     nb-sidebar (#1A4D2E), nb-sidebar-hover (#2D5233), nb-sidebar-active (#0F3520)
Gray scale:  nb-gray-50 (#FAFAF9) through nb-gray-900 (#1C1917) - warm stone tones
```

> **Drift fixes locked in 3-R2:** previous `nb-primary-hover (#5A9468)` was actually `primary.active`; canonical hover is `#6BA87A`. Previous `nb-info (#A7DBD8)` was actually `info.light`; canonical info is `#69D2E7`. Previous `nb-secondary` and `nb-success-dark` not exposed in Tailwind config — added in 3-R2.

### Shadow Tokens (Hard-edge, opaque — Phase 3 M1-R 3-R2 lock)
```
shadow-nb-xs     → 2px 2px 0 #1C1917  (badges)
shadow-nb-sm     → 4px 4px 0 #1C1917  (cards)
shadow-nb-md     → 6px 6px 0 #1C1917  (buttons, inputs)
shadow-nb-lg     → 8px 8px 0 #1C1917  (modals, dropdowns)
shadow-nb-xl     → 10px 10px 0 #1C1917 (large modals)
shadow-nb-hover  → 8px 8px 0 #1C1917  (hover-elevated state)
shadow-nb-active → 2px 2px 0 #1C1917  (pressed state)
```

> **All shadows are opaque `#1C1917` with zero blur radius — the NB stamp.** Phase 2 used `rgba(28,25,23, 0.15–0.25)` with 1–6 px blur; that drift is fixed at the generator level in 3-R2 and the `prefer-nb-shadow-utility` lint rule blocks regression. Tailwind utilities `shadow-sm`, `shadow-md`, etc. are forbidden — use `shadow-nb-*` only.

### Type Scale (Phase 3 M1-R 3-R2 lock)

Use `text-nb-h1`, `text-nb-h2`, `text-nb-h3`, `text-nb-body-lg`, `text-nb-body`, `text-nb-body-sm`, `text-nb-caption`, `text-nb-mono-sm`. Never set `text-3xl` / hand-pick font sizes.

| Utility | Family | Weight | Size / line-height |
|---------|--------|--------|--------------------|
| `text-nb-display-xl` | display (Space Grotesk) | 800 | 56 / 1.0 |
| `text-nb-display` | display | 700 | 40 / 1.05 |
| `text-nb-h1` | display | 700 | **28 / 1.2** |
| `text-nb-h2` | display | 600 | **22 / 1.3** |
| `text-nb-h3` | display | 600 | **18 / 1.35** |
| `text-nb-body-lg` | body (Inter) | 500 | 18 / 1.55 |
| `text-nb-body` | body | 400 | 16 / 1.5 |
| `text-nb-body-sm` | body | 400 | 14 / 1.45 |
| `text-nb-caption` | body | 500 | 12 / 1.4 |
| `text-nb-mono-sm` | mono (JetBrains Mono) | 500 | 12 / 1.4 |

### Border Radius Tokens
```
rounded-nb-sm   → 4px (badges, small elements)
rounded-nb-base → 6px (buttons, cards, inputs)
rounded-nb-md   → 8px (dialogs, large containers)
rounded-nb-lg   → 12px (special containers)
rounded-nb-xl   → 16px (extra large containers)
```

---

## PWA Architecture (Phase 3 M1-R sub-phase 3-R4)

The web becomes an installable, offline-capable PWA in 3-R4 (planned).

**Public assets:**
- `public/manifest.webmanifest` — `background_color: #F5F0EB`, `theme_color: #1A4D2E`, 192/512/512-maskable + 180 apple-touch icons, 2 shortcuts (Monitoring, Pruning Requests).
- `public/sw.js` — service worker compiled from `src/sw/sw.ts`. Pre-caches HTML shell + `generated/tokens.css` + main JS bundle + fonts + icons. Runtime caching: SWR 30 s for `/monitoring/snapshot`, network-first for `/pruning-requests/*`, cache-first for `/plant-species`. POST/PUT/DELETE = network-only (web does not queue offline writes).
- `public/icons/` — SEKAR pinwheel brand mark (8 sage `#7FBC8C` blades + yellow `#FDFD96` center, ink `#1C1917` stroke) on the `#1A4D2E` green canvas; `icon.svg` (full-bleed) + `icon-maskable.svg` (safe-zone padded). Favicon (`src/app/icon.tsx`) + apple-touch (`src/app/apple-icon.tsx`) render the same mark via `@/lib/brand/pinwheel`; `src/app/favicon.ico` is the rasterized pinwheel. In-app DOM mark: `src/components/brand/SekarMark.tsx` (token-var colors) — used in the sidebar header + login card. Jun 9 rebrand: replaced the prior "S" glyph repo-wide to match the mobile app.

**Components (`src/components/pwa/`):**
- `InstallBanner` — captures `beforeinstallprompt`; NB callout (yellow `#FDFD96` bg, 2 px border, 4 px shadow); 14-day localStorage suppression on dismiss.
- `OfflineBanner` — `role="status"` strip when `navigator.onLine === false`.
- `UpdateToast` — `registration.waiting` → "Versi baru tersedia — Muat ulang".
- `MobileInstallPush` — role-gated <768 px login banner for `satgas`/`linmas`/`korlap` directing to native app install (Play Store or App Store).
- `usePushSubscription` hook — admin roles only; subscribes via `POST /api/push/register`.

**Feature flag:** `NEXT_PUBLIC_FEATURE_PWA` controls SW registration. Production-only by default; staging on after smoke test.

---

## Responsive Breakpoints (Phase 3 M1-R sub-phase 3-R4)

Web ships three layouts on every page. Mobile web is **functional**, not a degraded experience.

| Breakpoint | Width | Layout | Navigation |
|------------|-------|--------|-----------|
| **Mobile web** | <768 px | Stacked vertical cards; bottom-sheet filters; full-screen edit dialogs | ☰ drawer from left |
| **Tablet** | 768–1279 px | Single primary column + optional drawer; map 60 / panel 40 | Icon-only rail (64 px), expands on click |
| **Desktop** | ≥1280 px | Multi-column (map 65 / panel 35; full data tables) | Full sidebar (220 px), 9-role gating |

Every Phase-3 page composes through `src/components/layout/ResponsiveShell.tsx` (added in 3-R4) which applies the breakpoint logic. Mobile-web specifically:
- Monitoring → full-viewport map + drag-up bottom sheet (3 snap points: 10 / 45 / 90 %).
- Pruning request queue → vertical card list + bottom-sheet filter.
- Capacity calendar → vertical week cards (collapsible) + full-screen edit dialog.

### `(kecamatan)` layout

`src/app/(kecamatan)/layout.tsx` (added in 3-R4) — minimal top-bar shell for `staff_kecamatan` role. No dashboard sidebar; only Submit Request / My Requests / Profile. Populated by sub-phase 3-10.

---

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
apps/web/
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
7. **i18n every UI string (MANDATORY)** - never hardcode display text; use `t('<ns>:<key>')` (react-i18next) and add the key to BOTH `src/lib/i18n/locales/{id,en}/<ns>.json` (id = Indonesian, en = English). Reuse `common`/`status`/`roles`/`validation`/`errors`. Zod → `useMemo(() => z.object(...), [t])`. New namespace → register in `src/lib/i18n/resources.ts`. Verify with `npm run i18n:check` (root). Default language is Indonesian; English is the alternate. See root `CLAUDE.md` §Internationalization.
8. **Role values MUST be lowercase** - Use the current codes, e.g. `'satgas'`, `'korlap'`, `'admin_rayon'`, `'management'` (never PascalCase; `worker`/`admin`/`top_management`/`admin_data` are removed — see root CLAUDE.md §Role Values Convention)
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
