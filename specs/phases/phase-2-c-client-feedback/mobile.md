# Phase 2C: Mobile Requirements

**Last Updated:** 2026-02-10
**Status:** Planning
**Platform:** React Native 0.83.1, TypeScript, Redux Toolkit

---

## Key Backend Changes Affecting Mobile

> These changes in [backend.md](./backend.md) directly impact mobile implementation:

| Change | Mobile Impact |
|--------|-------------|
| ClockInDto `area_id` now OPTIONAL | Remove mandatory area selection on clock-in screen; show auto-detected area as read-only |
| TaskStatus simplified to 4 states | Remove accept/decline buttons on TaskDetail; simplify status badge rendering |
| CompleteTaskDto: GPS REMOVED, photo REQUIRED | Remove GPS capture from TaskComplete; make photo mandatory |
| Reports → Aktivitas rename | Rename all screen files, API calls, Redux slice, navigation routes |
| `applicable_roles TEXT[]` on activity_types | Filter activity types by `role IN applicable_roles` not `role === activityType.role` |
| User entity gets `area_id` | Update User type to include optional `area_id` field |

---

## Navigation Restructure

### Current (Phase 2B): 2 navigator types
- WorkerTabNavigator (worker/linmas)
- SupervisorTabNavigator (supervisor/korlap/kepala_rayon)
- Admin roles → web only

### Phase 2C: Unified navigator with role-based tab config

**File to modify:** `fe/mobile/src/navigation/RootNavigator.tsx`

```typescript
const TAB_CONFIG: Record<string, TabConfig[]> = {
  satgas: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: AktivitasListScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Lembur', icon: 'clock', screen: OvertimeListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  linmas: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: AktivitasListScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Lembur', icon: 'clock', screen: OvertimeListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  korlap: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: AktivitasListScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  admin_data: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: AktivitasListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  kepala_rayon: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  top_management: [
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  admin_system: [
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  superadmin: [
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
};
```

---

## New Screens (5)

### 1. OvertimeListScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeListScreen.tsx`
**Access:** satgas, linmas (submitters) + korlap (approver)

**Features:**
- Tab filter: "Pengajuan Saya" | "Menunggu Persetujuan" (korlap only)
- List cards showing: date, time range, status badge, activity count
- FAB button to submit new overtime (satgas/linmas only)
- Pull-to-refresh
- Empty state with illustration

**NB 2.0 Design:**
- Card: `border-2 rounded-nb-base shadow-nb-soft`
- Status badges: pending (yellow), approved (green), rejected (red)
- FAB: Primary color `#7FBC8C`, 56px touch target

### 2. OvertimeSubmitScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeSubmitScreen.tsx`
**Access:** satgas, linmas

**Flow:**
1. Select date (DatePicker, default today)
2. Enter start time (TimePicker)
3. Enter end time (TimePicker)
4. Add aktivitas (at least 1):
   - Take photo (camera only, max 3 per aktivitas)
   - Select jenis aktivitas (role-filtered dropdown)
   - Enter description
   - Auto-capture GPS
5. Optional notes
6. Submit button

**Validation:**
- end_time > start_time
- At least 1 aktivitas required
- Each aktivitas: at least 1 photo, activity_type, description
- Max 3 photos per aktivitas

### 3. OvertimeApprovalScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeApprovalScreen.tsx`
**Access:** korlap only

**Features:**
- List of pending overtime requests in korlap's area
- Card preview: worker name, date, time range, activity count
- Tap to view detail → OvertimeDetailScreen
- Batch actions not required (approve/reject individually)

### 4. OvertimeDetailScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeDetailScreen.tsx`
**Access:** Owner + korlap + admin_system + superadmin

**Features:**
- Header: Worker name, date, time range, status
- Aktivitas list (expandable cards):
  - Photo thumbnails (tappable for full view)
  - Activity type badge
  - Description text
  - GPS coordinates
- Action buttons (korlap only, if status is pending):
  - "Setujui" (approve) - green button
  - "Tolak" (reject) - red button with reason input modal
- Timeline showing submission → approval/rejection

### 5. TaskCreateScreen

**Path:** `fe/mobile/src/screens/tasks/TaskCreateScreen.tsx`
**Access:** korlap, kepala_rayon, top_management, admin_system, superadmin

**Flow:**
1. Title input
2. Description input (multiline)
3. Select assignee (filtered by hierarchy rules)
4. Select scope: rayon OR area (depending on creator role)
5. Due date (optional, DatePicker)
6. Tag users (optional, multi-select)
7. Submit

**Assignee Filtering:**
- korlap sees: satgas and linmas in their area
- kepala_rayon sees: korlap in their rayon
- top_management/admin_system/superadmin sees: kepala_rayon and korlap

---

## Modified Screens (7)

### 1. ClockInOutScreen

**Changes:**
- Remove GPS boundary validation UI (distance indicator, out-of-bounds warning)
- Keep GPS coordinate display (informational)
- Keep selfie capture
- Area now auto-detected from schedule (display as read-only)
- If no area assigned, show info banner: "Anda belum memiliki jadwal area"

### 2. ReportSubmissionScreen → AktivitasSubmissionScreen

**Rename:** `ReportSubmissionScreen.tsx` → `AktivitasSubmissionScreen.tsx`

**New flow order:**
1. **Foto** - Camera capture (max 3 photos, camera only - no gallery)
2. **Jenis Aktivitas** - Role-filtered dropdown (mandatory)
3. **Deskripsi** - Text input (mandatory)
4. **Lokasi** - Auto-captured GPS (display only)

**Removed:**
- Report type selector (TASK_COMPLETION, INCIDENT, etc.)
- Condition assessment (Baik, Cukup, Buruk)
- Gallery photo selection (camera only)

**Added:**
- 3-photo grid with add/remove buttons
- Camera-only restriction (no image picker from gallery)
- Activity type dropdown filtered by user's role
- Shift validation (must be clocked in)

### 3. TasksReportsScreen → TasksAktivitasScreen

**Changes:**
- Rename tab from "Laporan" to "Aktivitas"
- Update list card to show activity type badge instead of report type
- Add photo thumbnails (up to 3)
- Remove review status indicator
- Add filter tabs: "Tugas Saya" | "Tag Saya" (for tasks)

### 4. TaskDetailScreen

**Changes:**
- Add tagged users section (with avatars/names, "ditandai" label)
- Show rayon name if task has rayon_id
- Update completion section (no GPS, just description + photo)
- Add tag management (for task creator)

### 5. TaskCompleteScreen

**Changes:**
- Remove GPS capture requirement
- Keep: description input (required) + photo capture (required)
- Simplified UI: just 2 fields instead of 4

### 6. MapDashboardScreen (Monitoring)

**Changes:**
- Update role-based access checks (new role names)
- korlap: show only own area
- kepala_rayon: show own rayon areas
- top_management/admin_system/superadmin: show all

### 7. RootNavigator

**Changes:**
- Replace WorkerTabNavigator + SupervisorTabNavigator with unified config
- Use TAB_CONFIG map (defined above) for role-based tabs
- Handle 8 roles instead of current 7

---

## Redux Changes

### Rename: reportSlice → aktivitasSlice

**File:** `fe/mobile/src/store/slices/reportSlice.ts` → `aktivitasSlice.ts`

```typescript
interface AktivitasState {
  aktivitasList: Aktivitas[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

// Actions renamed:
// setReports → setAktivitasList
// addReport → addAktivitas
// setIsSubmitting → setIsSubmitting (unchanged)
// setError → setError (unchanged)
```

### New: overtimeSlice

**File:** `fe/mobile/src/store/slices/overtimeSlice.ts`

```typescript
interface OvertimeState {
  myOvertimes: Overtime[];
  pendingApprovals: Overtime[]; // korlap only
  selectedOvertime: Overtime | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

// Actions:
// setMyOvertimes, addOvertime, setPendingApprovals
// setSelectedOvertime, updateOvertimeStatus
// setIsLoading, setIsSubmitting, setError, clearError
```

### Update: tasksSlice

**Add:**
- `taggedTasks: Task[]` - Tasks where user is tagged
- `setTaggedTasks` action
- Filter state: `taskFilter: 'assigned' | 'tagged' | 'created'`

### Update: authSlice

**Update role type:**
```typescript
type UserRole = 'satgas' | 'linmas' | 'korlap' | 'admin_data' | 'kepala_rayon' | 'top_management' | 'admin_system' | 'superadmin';
```

---

## Type Updates

> **IMPORTANT:** Cross-reference with [backend.md](./backend.md) for verified entity field names and types.

### models.types.ts

```typescript
// Update UserRole to match backend enum
export type UserRole = 'satgas' | 'linmas' | 'korlap' | 'admin_data' | 'kepala_rayon' | 'top_management' | 'admin_system' | 'superadmin';

// Simplified TaskStatus (was 6, now 4)
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
// REMOVED: 'accepted' and 'declined'

// Rename WorkReport → Aktivitas
// NOTE: Backend column is `worker_id` (not user_id), table is `work_reports`
export interface Aktivitas {
  id: string;
  worker_id: string;   // Column name in DB is worker_id
  shift_id: string;    // Already exists, NOT NULL
  area_id: string;
  activity_type_id: string;  // NOW REQUIRED (was optional)
  activity_type?: ActivityType;
  description: string;
  photo_urls: string[]; // Changed from photo_url: string (max 3)
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
  // REMOVED: report_type, condition, is_reviewed, reviewed_by, reviewed_at
}

// New type
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
  overtime_id: string;
  activity_type_id: string;
  activity_type?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
}

// Update Task (simplified from Phase 2B)
// REMOVED: activity_type_id, completion_gps_lat/lng, decline_reason, declined_at, accepted_at
export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assignee?: User;
  created_by: string;
  creator?: User;
  area_id?: string;      // NOW OPTIONAL (was required) — tasks can be rayon-scoped
  area?: Area;
  rayon_id?: string;     // NEW: for rayon-scoped tasks
  rayon?: Rayon;         // NEW
  deadline?: string;     // Column name in DB (DTO uses due_date)
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // KEPT from Phase 2B
  status: TaskStatus;    // 4 values: pending, assigned, in_progress, completed
  completion_photo_url?: string;
  completion_notes?: string;
  completed_at?: string;
  started_at?: string;
  assigned_at?: string;
  tags?: TaskTag[];      // NEW: tagged users
  created_at: string;
  updated_at: string;
}

// Update TaskTag (NEW)
export interface TaskTag {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  created_at: string;
}
```

### navigation.types.ts

```typescript
// Update RootStackParamList
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ClockInOut: undefined;
  AktivitasSubmission: undefined;  // Renamed from ReportSubmission
  AktivitasList: undefined;        // Renamed from ReportsList
  TaskList: undefined;
  TaskDetail: { taskId: string };
  TaskComplete: { taskId: string };
  TaskCreate: undefined;           // NEW
  OvertimeList: undefined;         // NEW
  OvertimeSubmit: undefined;       // NEW
  OvertimeDetail: { overtimeId: string };  // NEW
  OvertimeApproval: undefined;     // NEW
  Monitoring: undefined;
  Profile: undefined;
};
```

---

## NB 2.0 Compliance Checklist

All new screens MUST adhere to:

- [ ] Borders: 2px (`nbBorders.base`)
- [ ] Border radius: 6px base (`nbBorderRadius.base`)
- [ ] Shadows: Soft-edge, opacity 0.18-0.22, blur 2-4px (`nbShadows.soft`)
- [ ] Primary color: `#7FBC8C` (`nbColors.primary`)
- [ ] Background: `#F5F0EB` (`nbColors.background`)
- [ ] Touch targets: 48px minimum (WCAG 2.1 AA)
- [ ] Typography: Space Grotesk headings, system body
- [ ] Status colors: Success `#4CAF50`, Warning `#F57C00`, Error `#D32F2F`
- [ ] Cards: `nbBorders.base` + `nbBorderRadius.base` + `nbShadows.soft`
- [ ] Buttons: 48px height minimum, `nbBorderRadius.base`
- [ ] Inputs: `nbBorders.base`, 48px height, clear labels
- [ ] Icons: 24px default, 20px in tabs, consistent Feather icons

**Token file:** `fe/mobile/src/constants/nbTokens.ts`

---

## API Service Updates

### Rename: reportsApi → aktivitasApi

**File:** `fe/mobile/src/services/api/reportsApi.ts` → `aktivitasApi.ts`

- `createReport()` → `createAktivitas()`
- `getReports()` → `getAktivitasList()`
- `getReport()` → `getAktivitas()`
- Base path: `/reports` → `/aktivitas`

### New: overtimeApi

**File:** `fe/mobile/src/services/api/overtimeApi.ts`

- `submitOvertime(dto)`
- `getMyOvertimes()`
- `getPendingApprovals()`
- `getOvertimeDetail(id)`
- `approveOvertime(id)`
- `rejectOvertime(id, reason)`

### Update: tasksApi

- Add `getTaggedTasks()`
- Add `addTaskTags(taskId, userIds)`
- Add `removeTaskTag(taskId, userId)`
- Update `createTask()` to include `tagged_user_ids` and `rayon_id`
- Remove GPS fields from `completeTask()`

---

## Screen Count Summary

| Category | Count | Details |
|----------|-------|---------|
| New screens | 5 | OvertimeList, OvertimeSubmit, OvertimeApproval, OvertimeDetail, TaskCreate |
| Modified screens | 7 | ClockInOut, AktivitasSubmission, TasksAktivitas, TaskDetail, TaskComplete, MapDashboard, RootNavigator |
| Unchanged screens | 5 | LoginScreen, WorkerHomeScreen, ProfileScreen, SupervisorHomeScreen, NotificationsScreen |
| **Total screens** | **22** | Up from 17 in Phase 2B |

---

**Last Updated:** 2026-02-10
