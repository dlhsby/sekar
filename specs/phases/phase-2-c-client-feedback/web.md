# Phase 2C: Web Requirements

**Last Updated:** 2026-02-15
**Status:** Spec Rewrite (Terminology Cleanup + Schema Redesign)
**Platform:** Next.js 16.x, React 19, TailwindCSS 4.x
**Related ADR:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)

---

## Overview

The web dashboard primarily serves **management and admin roles**: top_management, admin_system, superadmin, kepala_rayon, and admin_data. Field roles (satgas, linmas) are **mobile-only**. Korlap uses mobile primarily but may access web for monitoring.

### Web-Accessible Roles

| Role | Web Access | Primary Use |
|------|-----------|-------------|
| `top_management` | Full dashboard | Monitoring, task oversight |
| `admin_system` | Full dashboard | User/area/rayon management, monitoring |
| `superadmin` | Full dashboard | All admin_system + system config |
| `kepala_rayon` | Limited dashboard | Rayon monitoring, task management |
| `admin_data` | Limited dashboard | Rayon-scoped data management (users, schedules, activities, overtime, monitoring) |
| `korlap` | Limited dashboard | Area monitoring (optional, mainly mobile) |
| `satgas` | No web access | Mobile only |
| `linmas` | No web access | Mobile only |

---

## Page Changes

### Renamed Pages

| Current Route | New Route | Description |
|---------------|-----------|-------------|
| `/reports` | `/activities` | View submitted activities (was `/aktivitas` in initial spec) |
| `/reports/[id]` | `/activities/[id]` | Activity detail |

### New Pages

| Route | Description | Roles |
|-------|-------------|-------|
| `/overtime` | Overtime management (view, approve/reject) | korlap, kepala_rayon, top_management, admin_system, superadmin |
| `/overtime/[id]` | Overtime detail with activity | Same as above |

### Modified Pages

| Route | Changes | Roles |
|-------|---------|-------|
| `/tasks` | Add "Tagged" tab, hierarchical assignment validation | Task creators + receivers |
| `/tasks/new` | Updated form with rayon scope, tag users | Task creators |
| `/tasks/[id]` | Show tagged users, simplified completion view | All with access |
| `/monitoring` | Updated role access, auto-scope, boundary warnings | See monitoring matrix |
| `/users` | Updated role dropdown (8 roles), conditional fields | admin_system, superadmin |
| `/settings` | System config (superadmin only section) | admin_system, superadmin |

### Unchanged Pages

| Route | Description |
|-------|-------------|
| `/login` | Authentication |
| `/areas` | Area management |
| `/rayons` | Rayon management |
| `/schedules` | Scheduling (endpoint changed: `/worker-schedules` → `/schedules`) |

---

## API Breaking Changes - Terminology Updates (Feb 15, 2026)

**⚠️ CRITICAL:** Backend deployed terminology cleanup with breaking API changes.

**Affected Endpoints:**
- `GET /monitoring/areas/:id/stats` - Response fields renamed

**Required Changes:**
1. Update type definitions in `lib/types.ts`:
   - `WorkerStatusDto` → `UserStatusDto`
   - Field names: `workers*` → `users*`

2. Update monitoring dashboard pages:
   - `/dashboard/monitoring/areas/[id]` - Update field references
   - Any components displaying area stats

**Timeline:** Update web types before deploying backend changes (coordinate deployment)

---

## Navigation Sidebar Updates

**File:** `fe/web/src/components/layout/Sidebar.tsx`

```typescript
const SIDEBAR_ITEMS: Record<string, SidebarItem[]> = {
  admin_system: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Monitoring', href: '/monitoring', icon: 'BarChart3' },
    { label: 'Aktivitas', href: '/activities', icon: 'FileText' },       // Route: /activities
    { label: 'Tugas', href: '/tasks', icon: 'ClipboardList' },
    { label: 'Lembur', href: '/overtime', icon: 'Clock' },
    { label: 'Pengguna', href: '/users', icon: 'Users' },
    { label: 'Area', href: '/areas', icon: 'MapPin' },
    { label: 'Rayon', href: '/rayons', icon: 'Map' },
    { label: 'Jadwal', href: '/schedules', icon: 'Calendar' },
    { label: 'Pengaturan', href: '/settings', icon: 'Settings' },
  ],
  superadmin: [
    ...adminSystemItems,
    { label: 'Sistem', href: '/settings/system', icon: 'Shield' },
  ],
  top_management: [
    { label: 'Monitoring', href: '/monitoring', icon: 'BarChart3' },
    { label: 'Aktivitas', href: '/activities', icon: 'FileText' },
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

> **NOTE:** Sidebar labels stay in Indonesian (UI). Route paths use English (`/activities`, not `/aktivitas`).

---

## /activities Page (renamed from /reports)

**File:** `fe/web/src/app/(dashboard)/activities/page.tsx`

### Changes from /reports:
- Route: `/reports` → `/activities`
- Breadcrumb label: "Laporan" → "Aktivitas" (Indonesian UI label)
- Table columns: Date, User, Activity Type, Area, Photos (count), Description
- Remove columns: Report Type, Condition, Review Status
- Photo thumbnails (up to 3, click to expand)
- Filter by: role, activity type, area, date range
- Scoped access: korlap→own area, kepala_rayon→own rayon, admin→all

### /activities/[id] Detail Page:
- Header: User name, date/time, area, activity type badge
- Photo gallery (max 3)
- Description, GPS on mini-map, shift info

---

## /overtime Page (NEW)

**File:** `fe/web/src/app/(dashboard)/overtime/page.tsx`

### Features:
- Data table: Date, User, Area, Time Range, Status, Activity Type
- Status filters: All | Pending | Approved | Rejected
- Scoped by role
- Action buttons (korlap only, for pending): Approve / Reject

### /overtime/[id] Detail Page:
- Overtime info: user, date, time range, status
- Activity details (flat — single activity type, photos, description, GPS)
- Approval history

---

## /tasks Page Updates

- Add tab filters: "Ditugaskan" | "Ditandai" | "Dibuat"
- Task creation form: rayon scope, tag users, hierarchy-filtered assignee
- Task detail: tagged users, simplified completion (no GPS)

---

## /monitoring Page Updates

- Add boundary warning indicators on live user map
- Users outside boundary shown with yellow/red marker
- Filter: "Tampilkan di luar area saja"
- Auto-scope by role

---

## /users Page Updates

- Role dropdown: 8 roles
- Conditional fields: kepala_rayon→rayon_id, korlap→area_id
- Updated role badge colors

---

## Role-Based Route Protection

```typescript
const ROUTE_ACCESS: Record<string, string[]> = {
  '/dashboard': ['top_management', 'admin_system', 'superadmin'],
  '/monitoring': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
  '/activities': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
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

**File:** `fe/web/src/types/models.ts`

```typescript
export type UserRole =
  | 'satgas' | 'linmas' | 'korlap' | 'admin_data'
  | 'kepala_rayon' | 'top_management' | 'admin_system' | 'superadmin';

export interface User {
  id: string;
  username: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  rayon_id?: string;
  area_id?: string;     // NEW: For korlap
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

// RENAMED from Report/Aktivitas → Activity
export interface Activity {
  id: string;
  user_id: string;      // RENAMED from worker_id
  user?: User;
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

// RENAMED from WorkerSchedule → Schedule
export interface Schedule {
  id: string;
  user_id: string;
  area_id: string;
  shift_definition_id: string;
  effective_date: string;
  end_date?: string;
}

// Overtime (FLAT — no nested aktivitas)
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
  activity_type_id: string;
  activityType?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
}

// REMOVED: OvertimeAktivitas (merged into Overtime)
```

### Type Renames Summary

| Current | New |
|---------|-----|
| `WorkerSchedule` | `Schedule` |
| `WorkReport` / `Aktivitas` | `Activity` |
| `OvertimeAktivitas` | REMOVED |
| `total_workers` response fields | `total_users` or `total_field_staff` |
| `worker_id` fields | `user_id` |

---

## API Client Updates

**File:** `fe/web/src/lib/api/`

### Rename: reports.ts → activities.ts

| Current | New |
|---------|-----|
| `getReports()` / `getAktivitasList()` | `getActivities()` |
| `getReport()` / `getAktivitas()` | `getActivity()` |
| Base path: `/reports` or `/aktivitas` | `/activities` |

### Rename: schedules.ts endpoints

| Current | New |
|---------|-----|
| Endpoint: `/worker-schedules` | `/schedules` |

### New: overtime.ts

```typescript
getOvertimes(filters)     // GET /overtime
getOvertime(id)           // GET /overtime/:id
approveOvertime(id)       // PATCH /overtime/:id/approve
rejectOvertime(id, reason) // PATCH /overtime/:id/reject
```

### Update: auth.ts

- Update `UserRole` type to 8-role definition
- Update `User` interface to include `area_id`

---

## Page Count Summary

| Category | Count | Details |
|----------|-------|---------|
| New pages | 2 | /overtime, /overtime/[id] |
| Renamed pages | 2 | /reports→/activities, /reports/[id]→/activities/[id] |
| Modified pages | 5 | /tasks, /tasks/new, /tasks/[id], /monitoring, /users |
| Unchanged pages | 9 | /login, /dashboard, /areas, /areas/[id], /rayons, /rayons/[id], /schedules, /settings, /notifications |
| **Total pages** | **20** | Up from 18 in Phase 2B |

---

**Last Updated:** 2026-02-15
