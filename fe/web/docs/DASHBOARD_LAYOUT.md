# Dashboard Layout Documentation

**Phase:** 2D-3  
**Last Updated:** January 27, 2026

---

## Visual Layout Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Desktop Layout (≥1024px)                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┬──────────────────────────────────────────────┐ │
│  │                 │  Header (sticky top)                         │ │
│  │                 ├──────────────────────────────────────────────┤ │
│  │                 │  ┌─────────────────┐  ┌──────┐  ┌────────┐  │ │
│  │  SIDEBAR        │  │ 🏠 Breadcrumb   │  │ 🔔 5 │  │ 👤 User│  │ │
│  │  (256px fixed)  │  └─────────────────┘  └──────┘  └────────┘  │ │
│  │                 ├──────────────────────────────────────────────┤ │
│  │  ┌──────────┐   │                                              │ │
│  │  │ SEKAR    │   │  Main Content Area                           │ │
│  │  │ Dashboard│   │  (max-width: 1440px)                         │ │
│  │  └──────────┘   │                                              │ │
│  │                 │  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐│ │
│  │  🏠 Dashboard   │  │ Stats  │ │ Stats  │ │ Stats  │ │ Stats ││ │
│  │  🗺  Monitoring  │  │ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4││ │
│  │  👥 Users *      │  └────────┘ └────────┘ └────────┘ └───────┘│ │
│  │  📍 Areas *      │                                              │ │
│  │  🏢 Rayons *     │  ┌──────────────────────────────────────┐  │ │
│  │  📅 Schedules    │  │ Recent Activity                      │  │ │
│  │  📄 Reports      │  │                                      │  │ │
│  │  📋 Tasks        │  │ • Activity 1                         │  │ │
│  │  ⚙  Settings *   │  │ • Activity 2                         │  │ │
│  │                 │  │ • Activity 3                         │  │ │
│  │  ──────────     │  └──────────────────────────────────────┘  │ │
│  │  👤 User Info   │                                              │ │
│  │  Admin User     │                                              │ │
│  │  Admin          │                                              │ │
│  └─────────────────┴──────────────────────────────────────────────┘ │
│                                                                       │
│  * Admin only menu items                                             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      Mobile Layout (<768px)                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Header (sticky top)                                         │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  ┌───┐              ┌──────┐  ┌────────┐                    │   │
│  │  │ ☰ │              │ 🔔 5 │  │ 👤 User│                    │   │
│  │  └───┘              └──────┘  └────────┘                    │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  Main Content Area (full width)                             │   │
│  │                                                              │   │
│  │  ┌────────────┐                                             │   │
│  │  │ Stats Card │                                             │   │
│  │  └────────────┘                                             │   │
│  │  ┌────────────┐                                             │   │
│  │  │ Stats Card │                                             │   │
│  │  └────────────┘                                             │   │
│  │  ┌────────────┐                                             │   │
│  │  │ Stats Card │                                             │   │
│  │  └────────────┘                                             │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────┐                  │   │
│  │  │ Recent Activity                      │                  │   │
│  │  │ • Activity 1                         │                  │   │
│  │  │ • Activity 2                         │                  │   │
│  │  └──────────────────────────────────────┘                  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  When hamburger (☰) is clicked:                                      │
│                                                                       │
│  ┌─────────────────┐                                                 │
│  │ SIDEBAR OVERLAY │  ◄── Slides in from left                       │
│  │ (256px)         │                                                 │
│  │                 │                                                 │
│  │ 🏠 Dashboard    │  + Backdrop (50% black)                         │
│  │ 🗺  Monitoring   │  + Click outside to close                      │
│  │ 📄 Reports      │  + X button in corner                           │
│  │ ...             │                                                 │
│  └─────────────────┘                                                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
DashboardLayout (layout.tsx)
├── Sidebar (Desktop - Fixed)
│   └── NBSidebar
│       ├── Logo/Header
│       ├── Navigation Items (filtered by role)
│       └── User Info
│
├── Sidebar (Mobile - Overlay)
│   ├── Backdrop (click to close)
│   └── NBSidebar
│       ├── Logo/Header
│       ├── Navigation Items
│       ├── User Info
│       └── Close Button (X)
│
└── Main Content
    ├── Header
    │   ├── Mobile Menu Button (hamburger)
    │   ├── Desktop Sidebar Toggle
    │   ├── Breadcrumb
    │   ├── Notification Bell (with badge)
    │   └── User Menu Dropdown
    │       ├── Profile
    │       ├── Settings
    │       └── Logout
    │
    └── Page Content (children)
        └── Dashboard Page
            ├── Welcome Section
            ├── Stats Cards (4 cards)
            ├── Recent Activity Card
            └── Quick Actions Cards (3 cards)
```

---

## Responsive Breakpoints

| Breakpoint | Width      | Sidebar Behavior      | Header Changes          |
|------------|------------|-----------------------|-------------------------|
| Mobile     | < 768px    | Overlay drawer        | Hamburger menu only     |
| Tablet     | 768-1023px | Overlay drawer        | Hamburger + breadcrumb  |
| Desktop    | ≥ 1024px   | Fixed (can toggle)    | Toggle + breadcrumb     |

---

## Role-Based Navigation

Navigation items are filtered based on user role:

```typescript
// Example: Admin sees all items
navigationItems = [
  'Dashboard', 'Monitoring', 'Users', 'Areas', 
  'Rayons', 'Schedules', 'Reports', 'Tasks', 'Settings'
]

// KepalaRayon sees limited items
navigationItems = [
  'Dashboard', 'Monitoring', 'Schedules', 'Reports', 'Tasks'
]
```

### Navigation Matrix

| Menu Item    | Admin | TopManagement | KepalaRayon | KoordinatorLapangan |
|--------------|-------|---------------|-------------|---------------------|
| Dashboard    | ✅    | ✅            | ✅          | ✅                  |
| Monitoring   | ✅    | ✅            | ✅          | ✅                  |
| Users        | ✅    | ❌            | ❌          | ❌                  |
| Areas        | ✅    | ❌            | ❌          | ❌                  |
| Rayons       | ✅    | ❌            | ❌          | ❌                  |
| Schedules    | ✅    | ❌            | ❌          | ✅                  |
| Reports      | ✅    | ✅            | ✅          | ✅                  |
| Tasks        | ✅    | ❌            | ✅          | ✅                  |
| Settings     | ✅    | ❌            | ❌          | ❌                  |

---

## State Management

### UI Store (Zustand)

```typescript
useUIStore = {
  // State
  sidebarOpen: boolean,
  mobileMenuOpen: boolean,
  user: User | null,
  notificationCount: number,
  
  // Actions
  toggleSidebar(),
  toggleMobileMenu(),
  setSidebarOpen(open),
  setUser(user),
  setNotificationCount(count),
  closeAllMenus()
}
```

### Usage Examples

```typescript
// Toggle sidebar
const { toggleSidebar } = useUIStore();
<button onClick={toggleSidebar}>Toggle</button>

// Get user
const { user } = useUIStore();
<h1>Welcome, {user?.name}!</h1>

// Check notifications
const { notificationCount } = useUIStore();
<Badge>{notificationCount}</Badge>
```

---

## Breadcrumb Generation

Breadcrumbs are auto-generated from the current route:

```typescript
// Route: /dashboard/users/123/edit
// Breadcrumbs:
[
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Users', href: '/dashboard/users' },
  { label: '123', href: '/dashboard/users/123' },
  { label: 'Edit', href: '/dashboard/users/123/edit' }
]
```

Labels are matched from `navigationItems` where possible, otherwise capitalized from URL segment.

---

## Accessibility Features

### Keyboard Navigation

| Key        | Action                          |
|------------|---------------------------------|
| Tab        | Navigate through elements       |
| Shift+Tab  | Navigate backwards              |
| Enter      | Activate buttons/links          |
| Space      | Activate buttons                |
| Esc        | Close dropdowns/mobile menu     |
| ↑↓         | Navigate dropdown items         |

### ARIA Attributes

```html
<!-- Sidebar -->
<nav role="navigation" aria-label="Main navigation">

<!-- Breadcrumb -->
<nav aria-label="Breadcrumb">
<span aria-current="page">Current Page</span>

<!-- Dropdown -->
<div role="button" aria-haspopup="true" aria-expanded="true">

<!-- Mobile menu -->
<button aria-label="Open navigation menu" aria-expanded="false">

<!-- Notification -->
<button aria-label="Notifications (5 unread)">
```

### Focus Management

- All interactive elements are keyboard accessible
- Focus indicators visible (2px outline)
- Logical tab order
- Focus trap in mobile menu (Esc to close)

---

## Design Tokens Used

### Colors
- `nb-navy` (#1E293B) - Sidebar background
- `nb-white` (#FFFFFF) - Content area, cards
- `nb-black` (#000000) - Borders, text
- `nb-gray-50` to `nb-gray-600` - Backgrounds, secondary text
- `nb-primary` (#2563EB) - Primary actions
- `nb-success` (#16A34A) - Success states
- `nb-warning` (#EA580C) - Warning states
- `nb-danger` (#DC2626) - Error states

### Borders
- `border-2` (2px) - Default borders
- `border-3` (3px) - Heavy borders (cards, sidebar)

### Shadows
- `shadow-nb-sm` (4px offset) - Cards
- `shadow-nb-md` (6px offset) - Modals
- `shadow-nb-lg` (8px offset) - Dropdowns

### Spacing
- `p-4` (16px) - Card padding
- `p-6` (24px) - Header padding
- `gap-6` (24px) - Grid gap

---

## Performance Optimizations

1. **Client-side rendering** for interactive components
2. **Zustand** for efficient state (no unnecessary re-renders)
3. **Loading skeleton** for smooth page transitions
4. **Auto-close mobile menu** on route change
5. **Lazy loading** icons via tree-shaking

---

## Mock Data (Temporary)

Current implementation uses mock data:

```typescript
// Mock user (src/lib/mock/user.ts)
getCurrentMockUser() // Returns admin/topManagement/etc.

// Mock notifications
getMockNotificationCount() // Returns 5
```

**Phase 2D-4 will replace with:**
- Real authentication
- API calls for user data
- Live notification count
- Session management

---

## Next Steps

See `PHASE_2D3_IMPLEMENTATION_SUMMARY.md` for complete implementation details and Phase 2D-4 requirements.
