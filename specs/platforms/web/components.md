# Web Component Library

Component library specifications for SEKAR web dashboard using **Neo Brutalism 2.1.1** design system (v2.1.1 re-baseline May 25, 2026; generated tokens from Phase 3 M1-R sub-phase 3-R2; PWA shell from sub-phase 3-R4; full screen sweep in sub-phase 3-R5; Phase 4 4-R revamp complete; Phase 5 feature modules 5-1/5-2/5-3 shipped Jun 17).

## Overview

The web dashboard uses **React 19 with TypeScript** and **Tailwind CSS v4** for styling. Components are built using **shadcn/ui** primitives with custom Neo Brutalism styling to match SEKAR's design system.

**Key Design Principles (NB 2.1.1 — Phase 4 v2.1.1 rebrand, May 25 reconciliation):**
- **Bold borders**: 2px solid `#1C1917` (stone-900 black) — some components use 2.5px per v2.1.1
- **Hard-edge shadows** (canonical since Phase 3-0): pure offset, zero blur, opaque `#1C1917` — generated from `tokens.json`
- **Friendly corners**: 6–10px border-radius range (base 6px for inputs, 10px for cards per v2.1.1)
- **Touch targets**: 44–48 px (web uses 44 px pointer, mobile 48 px touch)
- **High contrast**: `#1C1917` text, nature-aligned colors, WCAG 2.1 AA verified
- **Parks green primary**: `#7FBC8C` (v2.1 palette rebrand from v2.0)
- **Canvas background**: `#F5F0EB` (warm stone, canonical since Phase 3-0); `#FDFD96` pastel yellow is accent-only (pinwheel center, tabs, masthead)

> **Start here (Phase 3 onward):**
> - [`specs/design-system/design-tokens.md`](../../design-system/design-tokens.md) — single source of truth for every token.
> - [`specs/design-system/tokens.json`](../../design-system/tokens.json) — machine-readable source; CI-validated by `tokens.schema.json`.
> - Web tokens are consumed via generated `apps/web/src/app/generated/tokens.css`, imported by `globals.css`. Do not edit `globals.css` hex variables by hand; edit `tokens.json` and rerun `npm run tokens:build`.
> - [ADR-036](../../architecture/decisions/ADR-036-design-tokens-single-source.md) locks in the generator pipeline; [ADR-037](../../architecture/decisions/ADR-037-web-pwa.md) adds the PWA shell.
>
> **Legacy reference:** [`specs/design-system/neo-brutalism.md`](../../design-system/neo-brutalism.md) remains the design-language bible (component patterns, typography rules, NB philosophy). Token *values* now live in `tokens.json`.

---

## Component Library Stack

```bash
# Core dependencies
npm install react react-dom next
npm install tailwindcss @tailwindcss/postcss

# UI primitives
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-dropdown-menu
npm install @radix-ui/react-label @radix-ui/react-slot

# Utilities
npm install class-variance-authority clsx tailwind-merge lucide-react

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Data Fetching
npm install @tanstack/react-query axios
```

---

## Design Tokens

> **Source of Truth:** `specs/design-system/neo-brutalism.md` - Neo Brutalism 2.0

### Colors (NB 2.0)

```css
/* Primary - Parks Green (Sepidy Row 4) */
--color-nb-primary: #7FBC8C;
--color-nb-primary-hover: #6BA87A;
--color-nb-primary-active: #5A9468;

/* Secondary - Earth Brown */
--color-nb-secondary: #8B7355;
--color-nb-secondary-hover: #725E45;

/* Status (Sepidy Palette) */
--color-nb-success: #7FBC8C;
--color-nb-success-light: #BAFCA2;
--color-nb-warning: #E3A018;
--color-nb-warning-light: #FFDB58;
--color-nb-danger: #FF6B6B;
--color-nb-danger-light: #FFA07A;
--color-nb-info: #69D2E7;
--color-nb-info-light: #A7DBD8;

/* Backgrounds (Sepidy Row 1 Pastels) */
--color-nb-bg-primary: #FDFD96;
--color-nb-bg-secondary: #B5D2AD;
--color-nb-bg-mint: #DAF5F0;
--color-nb-bg-surface: #FFFFFF;

/* Neutrals - Warm Stone Tones */
--color-nb-black: #1C1917;
--color-nb-white: #FFFFFF;

/* Sidebar - Dark Forest Green */
--color-nb-sidebar-bg: #1A4D2E;
--color-nb-sidebar-text: #FFFFFF;
--color-nb-sidebar-hover: #2D5233;
--color-nb-sidebar-active: #0F3520;

/* Gray Scale - Stone */
--color-nb-gray-50: #FAFAF9;
--color-nb-gray-100: #F5F5F4;
--color-nb-gray-200: #E7E5E4;
--color-nb-gray-300: #D6D3D1;
--color-nb-gray-400: #A8A29E;
--color-nb-gray-500: #78716C;
--color-nb-gray-600: #57534E;
--color-nb-gray-700: #44403C;
--color-nb-gray-800: #292524;
--color-nb-gray-900: #1C1917;
```

### Shadows (NB 2.1.1 — Hard-edge, generated from tokens.json)

```css
/* Base shadows - Hard-edge (zero blur), opaque black */
--shadow-nb-xs: 2px 2px 0 #1C1917;      /* Badges, small elements */
--shadow-nb-sm: 4px 4px 0 #1C1917;      /* Cards, inputs — v2.1.1 was 3/3 per design/ */
--shadow-nb-md: 6px 6px 0 #1C1917;      /* Buttons (default) — v2.1.1 was 4/4 per design/ */
--shadow-nb-lg: 8px 8px 0 #1C1917;      /* Modals, dropdowns — v2.1.1 was 6/6 per design/ */

/* Interaction shadows */
--shadow-nb-hover: 8px 8px 0 #1C1917;   /* Grow on hover — v2.1.1 was 6/6 per design/ */
--shadow-nb-active: 2px 2px 0 #1C1917;  /* Shrink on press */
```

*All values generated from `specs/design-system/tokens.json` by `npm run tokens:build`; v2.1.1 reconciliation (May 25) aligned with `design/project/hifi-shared.css`.*

### Borders (NB 2.0)

```css
/* Border widths */
--border-nb-thin: 1px;   /* Dividers, subtle separators */
--border-nb-base: 2px;   /* DEFAULT - buttons, cards, inputs */
--border-nb-thick: 3px;  /* Emphasis, selected states */

/* Border color */
--border-nb-color: #1C1917;  /* Soft black (stone-900) */
```

### Border Radius (NB 2.1.1 — v2.1.1 reconciled to design/)

```css
--radius-nb-none: 0px;    /* Decorative elements */
--radius-nb-sm: 4px;      /* Badges, tags */
--radius-nb-base: 10px;   /* DEFAULT - buttons, cards, inputs (v2.1.1: was 6px) */
--radius-nb-md: 14px;     /* Modals, large cards (v2.1.1: was 8px) */
--radius-nb-lg: 20px;     /* Callouts, featured (v2.1.1: was 12px) */
--radius-nb-full: 9999px; /* Avatars, pills */
```

*v2.1.1 (May 25, 2026) reconciled to canonical [`design/project/hifi-shared.css`](../../design-system/mockups/project/hifi-shared.css).*

---

## Core Components

### Button

Primary interactive element with Neo Brutalism styling.

```tsx
import { Button } from '@/components/ui';

// Variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="success">Confirm</Button>
<Button variant="warning">Caution</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default (48px height)</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon Only</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>
<Button fullWidth>Full Width</Button>

// With icons
<Button leftIcon={<Plus className="w-5 h-5" />}>Add New</Button>
<Button rightIcon={<ArrowRight className="w-5 h-5" />}>Next</Button>
```

**Implementation (NB 2.0):**
```tsx
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold
   border-2 border-nb-black rounded-nb-base transition-all duration-150
   shadow-nb-md hover:shadow-nb-hover hover:-translate-x-0.5 hover:-translate-y-0.5
   active:shadow-nb-active active:translate-x-0.5 active:translate-y-0.5
   disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none
   focus-visible:outline focus-visible:outline-3 focus-visible:outline-nb-primary/40`,
  {
    variants: {
      variant: {
        default: 'bg-nb-primary text-white hover:bg-nb-primary-hover',
        secondary: 'bg-nb-secondary text-white hover:bg-nb-secondary-hover',
        outline: 'bg-transparent text-nb-black hover:bg-gray-50 shadow-nb-sm',
        ghost: 'bg-transparent text-nb-black border-transparent shadow-none',
        destructive: 'bg-nb-danger text-white hover:opacity-90',
        success: 'bg-nb-success text-white hover:opacity-90',
      },
      size: {
        sm: 'h-10 px-4 text-sm min-w-[48px]',
        default: 'h-12 px-6 text-base min-w-[48px] min-h-[48px]',
        lg: 'h-14 px-8 text-lg min-w-[48px]',
        icon: 'h-12 w-12 min-w-[48px] min-h-[48px]',
      },
    },
  }
);
```

### Card

Container for grouped content with NB 2.0 styling.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

// Variants (NB 2.0: border-2, rounded-nb-base)
<Card variant="default">...</Card>    {/* 2px border, shadow-sm, rounded-6px */}
<Card variant="elevated">...</Card>   {/* 2px border, shadow-md, rounded-6px */}
<Card variant="outlined">...</Card>   {/* 2px border, no shadow, rounded-6px */}
<Card variant="filled">...</Card>     {/* bg-nb-bg-mint, no border, rounded-6px */}

// Interactive (hover/press animations)
<Card interactive>Clickable Card</Card>

// Full structure
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Input

Text input with NB styling and states.

```tsx
import { Input } from '@/components/ui';

// Basic
<Input placeholder="Enter text..." />

// Sizes
<Input size="sm" />
<Input size="default" />  {/* 48px height */}
<Input size="lg" />

// States
<Input state="default" />
<Input state="error" />
<Input state="success" />
<Input error="Error message" />

// With icons
<Input leftIcon={<Search />} placeholder="Search..." />
<Input rightIcon={<Eye />} type="password" />
```

### Badge

Status indicators with NB styling.

```tsx
import { Badge } from '@/components/ui';

// Variants
<Badge variant="default">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="default">Default</Badge>
<Badge size="lg">Large</Badge>

// With icon and remove
<Badge icon={<Check />}>Complete</Badge>
<Badge onRemove={() => {}}>Removable</Badge>
```

### Select

Dropdown select with NB styling.

```tsx
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Dialog

Modal dialogs with NB styling.

```tsx
import {
  Dialog, DialogTrigger, DialogContent,
  DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description text</DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Content */}
    </div>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table

Data table with NB styling.

```tsx
import {
  Table, TableHeader, TableBody, TableFooter,
  TableHead, TableRow, TableCell, TableCaption
} from '@/components/ui';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((row) => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell><Badge>{row.status}</Badge></TableCell>
        <TableCell>
          <Button size="sm" variant="secondary">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Form Components

### FormInput

Input with integrated label, error, and helper text.

```tsx
import { FormInput } from '@/components/ui';

<FormInput
  label="Email Address"
  type="email"
  placeholder="you@example.com"
  error={errors.email?.message}
  helperText="We'll never share your email"
  required
  {...register('email')}
/>
```

### FormSelect

Select with integrated label and options array.

```tsx
import { FormSelect } from '@/components/ui';

<FormSelect
  label="Select Role"
  options={[
    { value: 'admin_system', label: 'Admin Sistem' },
    { value: 'korlap', label: 'Korlap' },
    { value: 'satgas', label: 'Satgas' },
  ]}
  value={role}
  onChange={setRole}
  error={errors.role?.message}
/>
```

---

## Loading & Empty States

### Skeleton

Loading placeholders with NB styling and shimmer animation.

```tsx
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList } from '@/components/ui';

// Variants
<Skeleton variant="text" />
<Skeleton variant="heading" />
<Skeleton variant="card" />
<Skeleton variant="avatar" />
<Skeleton variant="button" />
<Skeleton variant="listItem" />

// Multiple items
<Skeleton variant="text" count={3} gap="sm" />

// Preset composites
<SkeletonCard />              {/* Card loading state */}
<SkeletonTable rows={5} />    {/* Table loading state */}
<SkeletonList items={3} />    {/* List loading state */}
```

### EmptyState

Empty and error state displays.

```tsx
import { EmptyState } from '@/components/ui';

// Predefined variants
<EmptyState variant="noData" />
<EmptyState variant="noResults" />
<EmptyState variant="error" />
<EmptyState variant="offline" />
<EmptyState variant="maintenance" />
<EmptyState variant="noPermission" />
<EmptyState variant="emptyFolder" />
<EmptyState variant="allDone" />
<EmptyState variant="search" />

// Custom content
<EmptyState
  variant="noData"
  title="No Users Found"
  description="Start by adding your first user."
  action={{
    label: 'Add User',
    onClick: handleAddUser,
    variant: 'default',
  }}
  secondaryAction={{
    label: 'Learn More',
    onClick: handleLearnMore,
  }}
/>

// Custom icon
import { Inbox } from 'lucide-react';
<EmptyState icon={Inbox} title="Empty Inbox" />
```

---

## Navigation Components

### Sidebar

Navigation sidebar with role-based filtering.

```tsx
import { Sidebar, SidebarProvider, SidebarTrigger } from '@/components/ui';

<SidebarProvider defaultOpen={true}>
  <Sidebar
    items={[
      { id: 'home', label: 'Dashboard', href: '/dashboard', icon: <Home /> },
      { id: 'users', label: 'Users', href: '/users', icon: <Users />, roles: ['admin'] },
      // ...
    ]}
    user={{ name: 'John Doe', role: 'Admin' }}
    title="SEKAR"
    subtitle="Dashboard Admin"
  />
</SidebarProvider>
```

### DropdownMenu

Action menus with NB styling.

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Pencil className="mr-2 h-4 w-4" /> Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem destructive onClick={handleDelete}>
      <Trash className="mr-2 h-4 w-4" /> Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Responsive Design

Mobile-first responsive patterns:

```tsx
// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>

// Sidebar visibility
<Sidebar className="fixed lg:static" />
<SidebarTrigger className="lg:hidden" />

// Table scrolling
<div className="overflow-x-auto">
  <Table />
</div>

// Responsive spacing
<div className="p-4 lg:p-6">
  {/* Content */}
</div>
```

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- **48px minimum touch targets** - All buttons and interactive elements
- **4.5:1 contrast ratio** - Text against backgrounds
- **Focus indicators** - 4px outline on focus-visible
- **Keyboard navigation** - Full support
- **ARIA labels** - Screen reader compatible
- **Reduced motion** - Respects prefers-reduced-motion

```tsx
// Focus ring utility class
.nb-focus-ring {
  @apply focus-visible:outline focus-visible:outline-4
         focus-visible:outline-nb-primary/50 focus-visible:outline-offset-2;
}

// Reduced motion support
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

**Document Owner:** Web Developer
**Last Updated:** 2026-02-05
**Status:** Phase 2 Complete | Phase 2B (UI/UX Revamp) Pending
**Design System:** Neo Brutalism 2.0 (see `specs/design-system/neo-brutalism.md`)
**Dependencies:** `react`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `lucide-react`

---

## NB 2.0 Migration Summary

**Key Changes from NB 1.0:**

| Property | NB 1.0 | NB 2.0 |
|----------|--------|--------|
| Primary Color | `#0066CC` | `#7FBC8C` |
| Black | `#000000` | `#1C1917` |
| Sidebar | `#001F3F` (navy) | `#1A4D2E` (forest green) |
| Border Width | 3px | 2px |
| Border Radius | 0px | 6px |
| Shadow | Hard-edge (opacity 1) | Soft-edge (opacity 0.18-0.22) |

---

## Phase 2D: Monitoring Components

### New Components (7)

| Component | File | Description |
|-----------|------|-------------|
| MonitoringMap | `components/monitoring/MonitoringMap.tsx` | Google Maps map with area polygons, user markers (role-shaped, status-colored), supercluster clustering, hover tooltips, click selection |
| MonitoringSidePanel | `components/monitoring/MonitoringSidePanel.tsx` | 35% width panel (min 320px, max 480px). Contains filters, 2×2 status cards, virtual-scroll user list. Push navigation for detail/timeline views |
| UserDetailPanel | `components/monitoring/UserDetailPanel.tsx` | Push navigation within side panel. Shows shift info, last location, activities, tasks, WhatsApp/Call/History action buttons |
| LocationTimeline | `components/monitoring/LocationTimeline.tsx` | Vertical timeline with distance/time summary. Per-point entries with timestamp, coords, accuracy, battery. Click syncs map. Events highlighted (clock-in, area-exit, area-enter) |
| StatusCard | `components/monitoring/StatusCard.tsx` | Card in 2×2 grid. Count (28px bold), label (12px uppercase), icon (16px). Clickable filter toggle. Light status-color background |
| UserListItem | `components/monitoring/UserListItem.tsx` | 60px row: status dot (10px), name (14px semibold), role badge + area (12px gray), relative time, battery icon < 20%. Selected: 3px left border |
| MonitoringConfigForm | `components/monitoring/MonitoringConfigForm.tsx` | Form for admin threshold management. Number inputs, toggles. Calls PATCH /monitoring/config/:key per section |

### Status Color CSS Variables

```css
--status-active: #15803D;   --status-active-bg: #DCFCE7;
--status-idle: #D97706;     --status-idle-bg: #FEF3C7;
--status-outside: #9333EA;  --status-outside-bg: #F3E8FF;
--status-missing: #DC2626;  --status-missing-bg: #FEE2E2;
--status-offline: #6B7280;  --status-offline-bg: #F3F4F6;
```

**See:** history/CHANGELOG.md for complete migration checklist.
