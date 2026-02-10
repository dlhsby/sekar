# Phase 2C: Web Requirements

**Last Updated:** 2026-02-10
**Status:** Planning
**Platform:** Next.js 16.x, React 19, TailwindCSS 4.x

---

## Overview

The web dashboard primarily serves **management and admin roles**: top_management, admin_system, superadmin, and kepala_rayon. Field roles (satgas, linmas, admin_data) are **mobile-only** and do not use the web dashboard. Korlap uses mobile primarily but may access web for monitoring.

### Web-Accessible Roles

| Role | Web Access | Primary Use |
|------|-----------|-------------|
| `top_management` | Full dashboard | Monitoring, task oversight |
| `admin_system` | Full dashboard | User/area/rayon management, monitoring |
| `superadmin` | Full dashboard | All admin_system + system config |
| `kepala_rayon` | Limited dashboard | Rayon monitoring, task management |
| `korlap` | Limited dashboard | Area monitoring (optional, mainly mobile) |
| `satgas` | No web access | Mobile only |
| `linmas` | No web access | Mobile only |
| `admin_data` | No web access | Mobile only |

---

## Page Changes

### Renamed Pages

| Current Route | New Route | Description |
|---------------|-----------|-------------|
| `/reports` | `/aktivitas` | View submitted aktivitas |
| `/reports/[id]` | `/aktivitas/[id]` | Aktivitas detail |

### New Pages

| Route | Description | Roles |
|-------|-------------|-------|
| `/overtime` | Overtime management (view, approve/reject) | korlap, kepala_rayon, top_management, admin_system, superadmin |
| `/overtime/[id]` | Overtime detail with aktivitas | Same as above |

### Modified Pages

| Route | Changes | Roles |
|-------|---------|-------|
| `/tasks` | Add "Tagged" tab, hierarchical assignment validation | Task creators + receivers |
| `/tasks/new` | Updated form with rayon scope, tag users | Task creators |
| `/tasks/[id]` | Show tagged users, simplified completion view | All with access |
| `/monitoring` | Updated role access, auto-scope by role | See monitoring matrix |
| `/users` | Updated role dropdown (8 roles), conditional fields | admin_system, superadmin |
| `/settings` | System config (superadmin only section) | admin_system, superadmin |

### Unchanged Pages

| Route | Description |
|-------|-------------|
| `/login` | Authentication (no changes) |
| `/areas` | Area management |
| `/rayons` | Rayon management |
| `/schedules` | Worker scheduling |

---

## Navigation Sidebar Updates

**File:** `fe/web/src/components/layout/Sidebar.tsx`

### Current sidebar items → Phase 2C sidebar items

```typescript
const SIDEBAR_ITEMS: Record<string, SidebarItem[]> = {
  // Management roles (full sidebar)
  admin_system: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Monitoring', href: '/monitoring', icon: 'BarChart3' },
    { label: 'Aktivitas', href: '/aktivitas', icon: 'FileText' },      // Renamed
    { label: 'Tugas', href: '/tasks', icon: 'ClipboardList' },
    { label: 'Lembur', href: '/overtime', icon: 'Clock' },             // NEW
    { label: 'Pengguna', href: '/users', icon: 'Users' },
    { label: 'Area', href: '/areas', icon: 'MapPin' },
    { label: 'Rayon', href: '/rayons', icon: 'Map' },
    { label: 'Jadwal', href: '/schedules', icon: 'Calendar' },
    { label: 'Pengaturan', href: '/settings', icon: 'Settings' },
  ],
  superadmin: [
    // Same as admin_system + system config
    ...adminSystemItems,
    { label: 'Sistem', href: '/settings/system', icon: 'Shield' },     // NEW
  ],
  top_management: [
    { label: 'Monitoring', href: '/monitoring', icon: 'BarChart3' },
    { label: 'Aktivitas', href: '/aktivitas', icon: 'FileText' },
    { label: 'Tugas', href: '/tasks', icon: 'ClipboardList' },
    { label: 'Lembur', href: '/overtime', icon: 'Clock' },
  ],
  kepala_rayon: [
    { label: 'Monitoring', href: '/monitoring', icon: 'BarChart3' },
    { label: 'Tugas', href: '/tasks', icon: 'ClipboardList' },
    { label: 'Lembur', href: '/overtime', icon: 'Clock' },
  ],
  korlap: [
    { label: 'Monitoring', href: '/monitoring', icon: 'BarChart3' },
    { label: 'Tugas', href: '/tasks', icon: 'ClipboardList' },
    { label: 'Lembur', href: '/overtime', icon: 'Clock' },
  ],
};
```

---

## /aktivitas Page

**File:** `fe/web/src/app/(dashboard)/aktivitas/page.tsx`

### Changes from /reports:
- Rename breadcrumb: "Laporan" → "Aktivitas"
- Table columns: Date, Worker, Activity Type, Area, Photos (count), Description
- Remove columns: Report Type, Condition, Review Status
- Add photo thumbnails (up to 3, click to expand)
- Filter by: role, activity type, area, date range
- Scoped access:
  - korlap: own area only
  - kepala_rayon: own rayon areas
  - top_management/admin_system/superadmin: all

### /aktivitas/[id] Detail Page:
- Header: Worker name, date/time, area, activity type badge
- Photo gallery (swipeable, max 3)
- Description text
- GPS location on mini-map
- Shift information (clock-in time, area)

---

## /overtime Page (NEW)

**File:** `fe/web/src/app/(dashboard)/overtime/page.tsx`

### Features:
- Data table with columns: Date, Worker, Area, Time Range, Status, Activity Count
- Status filters: All | Pending | Approved | Rejected
- Scoped by role:
  - korlap: own area overtime requests
  - kepala_rayon: own rayon overtime requests
  - top_management/admin_system/superadmin: all
- Action buttons (korlap only, for pending):
  - Approve (green button)
  - Reject (red button, opens reason modal)

### /overtime/[id] Detail Page:
- Overtime info: worker, date, time range, status
- Aktivitas list (embedded):
  - Photo gallery per aktivitas
  - Activity type, description, location
- Approval history: submitted_at, approved_at, approver name
- Action buttons if pending (korlap)

---

## /tasks Page Updates

### Changes:
- Add tab filters: "Ditugaskan" | "Ditandai" | "Dibuat"
- "Ditandai" tab shows tasks where current user is tagged (view only)
- Task creation form updates:
  - Add rayon scope selector (if creator has rayon access)
  - Add tag users multi-select
  - Assignee dropdown filtered by hierarchy rules
  - Remove activity type field
- Task detail page:
  - Show tagged users with badge "Ditandai"
  - Show rayon name if applicable
  - Simplified completion view (no GPS coordinates)

---

## /users Page Updates

### Changes:
- Role dropdown: 8 roles (satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin)
- Conditional fields in create/edit form:
  - If role = kepala_rayon → show rayon_id dropdown (required)
  - If role = korlap → show area_id dropdown (required)
- Role badge colors updated:
  - satgas: green
  - linmas: blue
  - korlap: purple
  - admin_data: orange
  - kepala_rayon: teal
  - top_management: indigo
  - admin_system: gray
  - superadmin: red

---

## /monitoring Page Updates

### Changes:
- Remove `supervisor` from access list
- Add `admin_system`, `superadmin` to city-level access
- Auto-scope by role:
  - korlap: redirect to own area monitoring
  - kepala_rayon: redirect to own rayon monitoring
  - top_management/admin_system/superadmin: city-wide view

---

## Role-Based Route Protection

**File:** `fe/web/src/components/auth/ProtectedRoute.tsx`

```typescript
const ROUTE_ACCESS: Record<string, string[]> = {
  '/dashboard': ['top_management', 'admin_system', 'superadmin'],
  '/monitoring': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
  '/aktivitas': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
  '/tasks': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
  '/overtime': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
  '/users': ['admin_system', 'superadmin'],
  '/areas': ['admin_system', 'superadmin'],
  '/rayons': ['admin_system', 'superadmin'],
  '/schedules': ['admin_system', 'superadmin'],
  '/settings': ['admin_system', 'superadmin'],
  '/settings/system': ['superadmin'],
};
```

---

## Type Updates

> **IMPORTANT:** Cross-reference with [backend.md](./backend.md) for verified entity field names and [database.md](./database.md) for schema changes.

**File:** `fe/web/src/types/models.ts`

```typescript
export type UserRole =
  | 'satgas'
  | 'linmas'
  | 'korlap'
  | 'admin_data'
  | 'kepala_rayon'
  | 'top_management'
  | 'admin_system'
  | 'superadmin';

// Update User type — area_id is NEW (added in Phase 2C Migration 0)
export interface User {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  rayon_id?: string;    // For kepala_rayon
  area_id?: string;     // NEW: For korlap
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Simplified TaskStatus (was 6, now 4 — removed accepted, declined)
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

// Rename Report → Aktivitas
export interface Aktivitas {
  id: string;
  worker_id: string;
  worker?: User;
  shift_id: string;
  area_id: string;
  area?: Area;
  activity_type_id: string;
  activity_type?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
}

// New Overtime type
export interface Overtime {
  id: string;
  user_id: string;
  user?: User;
  area_id?: string;
  area?: Area;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approver?: User;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  aktivitas: OvertimeAktivitas[];
  created_at: string;
}

export interface OvertimeAktivitas {
  id: string;
  activity_type_id: string;
  activity_type?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
}
```

---

## API Client Updates

**File:** `fe/web/src/lib/api/`

### Rename: reports.ts → aktivitas.ts
- `getReports()` → `getAktivitasList()`
- `getReport(id)` → `getAktivitas(id)`
- Base path: `/reports` → `/aktivitas`

### New: overtime.ts
- `getOvertimes(filters)`
- `getOvertime(id)`
- `approveOvertime(id)`
- `rejectOvertime(id, reason)`

### Update: auth.ts
- Update `UserRole` type import to new 8-role definition

---

## NB 2.0 Component Reuse

All new pages use existing NB 2.0 web components:
- `NBCard` - Card container
- `NBButton` - Action buttons
- `NBBadge` - Status badges
- `NBDataTable` - Data tables
- `NBModal` - Confirmation/rejection modals
- `NBForm` / `NBInput` / `NBSelect` - Form elements
- `NBTabs` - Tab navigation

**Design tokens file:** `fe/web/src/app/globals.css`

---

## Page Count Summary

| Category | Count | Details |
|----------|-------|---------|
| New pages | 2 | /overtime, /overtime/[id] |
| Renamed pages | 2 | /reports→/aktivitas, /reports/[id]→/aktivitas/[id] |
| Modified pages | 5 | /tasks, /tasks/new, /tasks/[id], /monitoring, /users |
| Unchanged pages | 9 | /login, /dashboard, /areas, /areas/[id], /rayons, /rayons/[id], /schedules, /settings, /notifications |
| **Total pages** | **20** | Up from 18 in Phase 2B |

---

**Last Updated:** 2026-02-10
