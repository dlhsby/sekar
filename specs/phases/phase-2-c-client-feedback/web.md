# Phase 2C: Web Requirements

**Last Updated:** 2026-03-03
**Status:** ✅ Implementation Complete (Web aligned with Phase 2C backend)
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

**File:** `apps/web/src/components/layout/Sidebar.tsx`

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

**File:** `apps/web/src/app/(dashboard)/activities/page.tsx`

### Changes from /reports:
- Route: `/reports` → `/activities`
- Breadcrumb label: "Laporan" → "Aktivitas" (Indonesian UI label)
- Table columns: Date, User, Activity Type, Area, Photos (count), Description
- Remove columns: Report Type, Condition, Review Status
- Photo thumbnails (up to 3, click to expand)
- Filter by: role, activity type, area, date range
- Scoped access: korlap→own area, kepala_rayon→own rayon, admin→all

### /activities/[id] Detail Page:
- Header: User name, date/time, area, activity type badge, status badge
- Photo gallery (max 3)
- Description, GPS on mini-map, shift info
- Approval workflow: Approve/Reject buttons for ACTIVITY_APPROVER_ROLES (korlap, kepala_rayon)
- Reviewer info display for approved/rejected activities
- Rejection reason display

---

## /overtime Page (NEW)

**File:** `apps/web/src/app/(dashboard)/overtime/page.tsx`

### Features:
- Data table: Date (from start_datetime), User, Area, Time Range (start_datetime - end_datetime), Status, Activity Type
- Status filters: All | Pending | Approved | Rejected
- Scoped by role (korlap→area, kepala_rayon→rayon)
- Action buttons (korlap + kepala_rayon, for pending): Approve / Reject
- Reject reason dialog with required reason field

### /overtime/[id] Detail Page:
- Overtime info: user, datetime (from start_datetime/end_datetime ISO 8601), status badge
- Activity details (flat — single activity type, photos, description, GPS)
- Approval workflow: Approve/Reject buttons for OVERTIME_APPROVER_ROLES (korlap, kepala_rayon)
- Approver info display, rejection reason display

---

## /tasks Page Updates

- Three tabs: "Semua Tugas" | "Ditandai" | "Dibuat Saya" using `useTasks`/`useTaggedTasks`/`useMyTasks`
- 8-status filter (pending, assigned, accepted, declined, in_progress, completed, verified, revision_needed)
- Task creation form: rayon scope, tag users, hierarchy-filtered assignee

### /tasks/[id] Detail Page (NEW):
- Task info: title, description, status badge (8 statuses), priority badge, due date
- Assignment info: creator, assigned_to, assigned_by, area, rayon
- Tagged users with untag button (if current user is creator)
- Completion info (if completed/verified): notes, photo gallery
- Verification workflow: Verify/Request Revision buttons for TASK_VERIFIER_ROLES (korlap, kepala_rayon, top_management)
- Decline info with reason display
- Revision info with reason display

---

## /monitoring Page Updates

- Role-based auto-scoping on mount: korlap → auto-set `areaFilter` to `user.area_id`; kepala_rayon → auto-set `rayonFilter` to `user.rayon_id`
- Filter: Rayon select + Area select (area disabled until rayon selected)
- Stats cards adapt by view level (city/rayon/area)
- Live user list with `is_within_area` status badges ("Dalam Area" / "Di Luar Area")
- Battery level warning badge shown when `battery_level < 20`
- Last updated timestamp from `liveUsersData.generated_at`

### Monitoring TypeScript Interfaces (actual backend DTOs)

**`CityStats`** — flat structure, no nested wrappers:
```typescript
total_rayons, total_areas, total_workers, workers_online, workers_offline,
active_shifts, tasks_pending, tasks_in_progress, tasks_completed_today,
activities_submitted_today, generated_at
```

**`RayonMonitoringStats`** — flat structure:
```typescript
id, name, code, total_areas, total_workers, workers_online, workers_offline,
active_shifts, tasks_pending, tasks_in_progress, tasks_completed_today,
activities_submitted_today, alerts: string[], generated_at
```

**`AreaMonitoringStats`** — NO `current_shift` field:
```typescript
id, name, area_type, rayon_id, rayon_name, coverage_area: number | null,
total_users_assigned, users_online, users_offline, is_fully_staffed: boolean,
tasks_pending, tasks_in_progress, tasks_completed_today,
activities_submitted_today, alerts: string[], generated_at
```

**`LiveUser`**:
```typescript
id,           // NOT user_id
full_name, role,
area_id: string | null, area_name,
rayon_id: string | null, rayon_name: string | null,
latitude, longitude,    // NOT gps_lat/gps_lng
battery_level: number | null,
last_update,            // NOT timestamp
is_within_area: boolean,
outside_boundary: boolean,
shift_id, shift_name, clock_in_time
```

**`LiveUsersResponse`**:
```typescript
total_online, total_offline,   // NOT total
users: LiveUser[],
generated_at                   // NOT timestamp
```

> ⚠️ **Lesson learned:** `AuthErrorBoundary` catches ANY React render error and shows a misleading "Terjadi kesalahan saat memproses autentikasi" message in production. When a monitoring page crashes due to interface mismatch (e.g., accessing `undefined.definition.name`), the error appears as an auth failure. Always verify frontend interfaces against backend DTOs before deployment.

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

**File:** `apps/web/src/types/models.ts`

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

export type TaskStatus = 'pending' | 'assigned' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'verified' | 'revision_needed';

// RENAMED from Report/Aktivitas → Activity (with approval workflow)
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
  status: 'pending' | 'approved' | 'rejected';   // NEW: approval workflow
  reviewed_by?: string;                            // NEW
  reviewer?: { id: string; full_name: string };    // NEW
  reviewed_at?: string;                            // NEW
  rejection_reason?: string;                       // NEW
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

// Overtime (FLAT — ISO 8601 datetime, supports overnight)
export interface Overtime {
  id: string;
  user_id: string;
  user?: User;
  area_id?: string;
  area?: Area;
  start_datetime: string;   // ISO 8601 e.g. "2026-02-14T17:00:00+07:00"
  end_datetime: string;     // ISO 8601, supports overnight
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approver?: User;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  activity_type_id: string;
  activity_type?: ActivityType;
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

**File:** `apps/web/src/lib/api/`

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

**Last Updated:** 2026-03-03
