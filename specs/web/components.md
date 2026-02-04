# Web Component Library

Component library specifications for SEKAR web dashboard using **Neo Brutalism** design system.

## Overview

The web dashboard uses **React 19 with TypeScript** and **Tailwind CSS v4** for styling. Components are built using **shadcn/ui** primitives with custom Neo Brutalism styling to match SEKAR's design system.

**Key Design Principles:**
- **Bold borders**: 3px solid black
- **Hard-edge shadows**: No blur, pure offset (4px/6px/8px)
- **Sharp corners**: 0 border-radius
- **48px touch targets**: Accessible interactive elements
- **High contrast**: Black text, strong colors

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

### Colors

```css
/* Primary */
--color-nb-primary: #0066CC;
--color-nb-primary-hover: #0052A3;
--color-nb-primary-active: #003D7A;

/* Status */
--color-nb-success: #1B5E20;
--color-nb-warning: #F57C00;
--color-nb-danger: #DC2626;

/* Neutral */
--color-nb-black: #000000;
--color-nb-white: #FFFFFF;
--color-nb-navy: #001F3F;

/* Gray Scale */
--color-nb-gray-50: #FAFAFA;
--color-nb-gray-100: #F5F5F5;
--color-nb-gray-200: #EEEEEE;
--color-nb-gray-300: #E0E0E0;
--color-nb-gray-400: #BDBDBD;
--color-nb-gray-500: #9E9E9E;
--color-nb-gray-600: #666666;
--color-nb-gray-700: #424242;
--color-nb-gray-800: #303030;
--color-nb-gray-900: #212121;
```

### Shadows

```css
--shadow-nb-sm: 4px 4px 0px #000000;     /* Cards */
--shadow-nb-md: 6px 6px 0px #000000;     /* Buttons, inputs */
--shadow-nb-lg: 8px 8px 0px #000000;     /* Modals, dropdowns */
--shadow-nb-active: 2px 2px 0px #000000; /* Pressed state */
```

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

**Implementation:**
```tsx
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold
   border-3 border-nb-black transition-all duration-100
   disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none
   focus-visible:outline focus-visible:outline-4 focus-visible:outline-nb-primary/50`,
  {
    variants: {
      variant: {
        default: 'bg-nb-primary text-nb-white hover:bg-nb-primary-hover',
        secondary: 'bg-nb-white text-nb-black hover:bg-nb-gray-50',
        destructive: 'bg-nb-danger text-nb-white hover:opacity-90',
        success: 'bg-nb-success text-nb-white hover:opacity-90',
        // ...
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

Container for grouped content with NB styling.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

// Variants
<Card variant="default">...</Card>    {/* 3px border, small shadow */}
<Card variant="elevated">...</Card>   {/* 3px border, medium shadow */}
<Card variant="outlined">...</Card>   {/* 3px border, no shadow */}
<Card variant="filled">...</Card>     {/* No border, gray background */}

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
    { value: 'admin', label: 'Administrator' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'worker', label: 'Worker' },
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
**Last Updated:** 2026-02-03
**Status:** Implemented - Phase 2
**Dependencies:** `react`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `lucide-react`
