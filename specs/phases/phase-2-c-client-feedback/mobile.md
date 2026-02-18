# Phase 2C: Mobile Requirements

**Last Updated:** 2026-02-15
**Status:** Spec Rewrite (Terminology Cleanup + Schema Redesign)
**Platform:** React Native 0.83.1, TypeScript, Redux Toolkit
**Related ADR:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)

---

## Key Backend Changes Affecting Mobile

> These changes in [backend.md](./backend.md) directly impact mobile implementation:

| Change | Mobile Impact |
|--------|-------------|
| ClockInDto `area_id` now OPTIONAL | Remove mandatory area selection on clock-in screen; show auto-detected area as read-only |
| Polygon geofencing (soft) | Show warning banner if outside boundary; clock-in always succeeds |
| TaskStatus simplified to 4 states | Remove accept/decline buttons on TaskDetail; simplify status badge rendering |
| CompleteTaskDto: GPS REMOVED, photo REQUIRED | Remove GPS capture from TaskComplete; make photo mandatory |
| `reports/` → `activities/` module rename | Rename all screen files, API calls, Redux slice, navigation routes |
| `worker_id` → `user_id` column rename | Update all type definitions and API response handling |
| Overtime flattened (1:1) | Simplified submit form — single activity per overtime, no nested array |
| `work_reports` → `activities` table rename | Update API endpoints: `/reports` → `/activities` |
| `worker_schedules` → `schedules` | Update API endpoints: `/worker-schedules` → `/schedules` |
| `WorkerAssignment` dropped | Remove all references to worker assignments |

---

## API Breaking Changes - Terminology Updates (Feb 15, 2026)

**⚠️ CRITICAL:** Backend deployed terminology cleanup with breaking API changes.

**Affected Endpoints:**
- `GET /monitoring/areas/:id/stats` - Response fields renamed

**Required Changes:**
1. Update `api.types.ts`:
   - `WorkerStatusDto` → `UserStatusDto`
   - `workers` → `users`
   - `total_workers_assigned` → `total_users_assigned`
   - `workers_online` → `users_online`
   - `workers_offline` → `users_offline`

2. Update Redux types in `store/slices/monitoringSlice.ts`

3. Update supervisor dashboard components that display these stats

**Timeline:** Update mobile types before deploying backend changes (coordinate deployment)

---

## Directory/File Renames

| Current | New | Reason |
|---------|-----|--------|
| `fe/mobile/src/screens/worker/` | `fe/mobile/src/screens/field/` | Generic, not worker-specific |
| `WorkerHomeScreen.tsx` | `HomeScreen.tsx` | Role-agnostic |
| `WorkerNavigator.tsx` | `FieldNavigator.tsx` | Role-agnostic |
| `WorkerHomeHeader.tsx` | `FieldHomeHeader.tsx` | Role-agnostic |
| `ReportSubmissionScreen.tsx` | `ActivitySubmissionScreen.tsx` | English naming |
| `TasksReportsScreen.tsx` | `TasksActivityScreen.tsx` | English naming |

Other screens (`ClockInOutScreen`, `TaskDetailScreen`, etc.) keep their names — already role-agnostic.

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
    { name: 'Aktivitas', icon: 'file-text', screen: ActivityListScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Lembur', icon: 'clock', screen: OvertimeListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  linmas: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: ActivityListScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Lembur', icon: 'clock', screen: OvertimeListScreen },
    { name: 'Profil', icon: 'user', screen: ProfileScreen },
  ],
  korlap: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: ActivityListScreen },
    { name: 'Tugas', icon: 'clipboard', screen: TaskListScreen },
    { name: 'Lembur', icon: 'clock', screen: OvertimeListScreen },
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
  ],
  admin_data: [
    { name: 'Home', icon: 'home', screen: ClockInOutScreen },
    { name: 'Aktivitas', icon: 'file-text', screen: ActivityListScreen },
    { name: 'Monitoring', icon: 'bar-chart-2', screen: MonitoringScreen },
    { name: 'Lembur', icon: 'clock', screen: OvertimeListScreen },
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

> **NOTE:** Tab labels remain in Indonesian (UI display). Code identifiers use English.

---

## New Screens (5)

### 1. OvertimeListScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeListScreen.tsx`
**Access:** satgas, linmas (submitters) + korlap (approver)

**Features:**
- Tab filter: "Pengajuan Saya" | "Menunggu Persetujuan" (korlap only)
- List cards showing: date, time range, status badge, activity type
- FAB button to submit new overtime (satgas/linmas only)
- Pull-to-refresh, empty state

### 2. OvertimeSubmitScreen (Simplified — flat)

**Path:** `fe/mobile/src/screens/overtime/OvertimeSubmitScreen.tsx`
**Access:** satgas, linmas

**Flow (simplified — 1 overtime = 1 activity):**
1. Select date (DatePicker, default today)
2. Enter start time (TimePicker)
3. Enter end time (TimePicker)
4. Take photo(s) (camera only, max 3)
5. Select activity type (role-filtered dropdown)
6. Enter description
7. Auto-capture GPS
8. Optional notes
9. Submit button

**Validation:**
- end_time > start_time
- Activity type required, description required
- 1-3 photos required
- Activity type must match user's role

### 3. OvertimeApprovalScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeApprovalScreen.tsx`
**Access:** korlap only

### 4. OvertimeDetailScreen

**Path:** `fe/mobile/src/screens/overtime/OvertimeDetailScreen.tsx`
**Access:** Owner + korlap + admin_system + superadmin

**Features:**
- Header: User name, date, time range, status
- Activity details (flat — single activity type, photos, description, GPS)
- Action buttons (korlap only, if status is pending): "Setujui" / "Tolak"

### 5. TaskCreateScreen

**Path:** `fe/mobile/src/screens/tasks/TaskCreateScreen.tsx`
**Access:** korlap, kepala_rayon, top_management, admin_system, superadmin

---

## Modified Screens (7)

### 1. ClockInOutScreen

**Changes:**
- Remove GPS boundary validation UI (distance indicator, out-of-bounds warning)
- **Add soft geofencing warning banner:** if outside area polygon, show "Anda berada di luar area kerja. Absen tetap dicatat."
- Area auto-detected from schedule (display as read-only)
- Keep GPS coordinate display, selfie capture

### 2. ReportSubmissionScreen → ActivitySubmissionScreen

**Rename:** `ReportSubmissionScreen.tsx` → `ActivitySubmissionScreen.tsx`

**New flow:** Foto → Jenis Aktivitas → Deskripsi → Lokasi (GPS auto)

**Removed:** Report type selector, condition assessment, gallery photo selection
**Added:** 3-photo grid, camera-only, role-filtered activity type dropdown, shift validation

### 3. TasksReportsScreen → TasksActivityScreen

**Changes:**
- Tab label: "Laporan" → "Aktivitas"
- Activity type badge instead of report type
- Photo thumbnails (up to 3)
- Remove review status indicator
- Filter tabs: "Tugas Saya" | "Tag Saya"

#### Enhanced Task Filtering (Feb 17, 2026 - Bottom Sheet Modal)

**Filter Button Bar (always visible - 48px):**
- "Filter" button with badge showing active count
- Mini chips showing active rayon/area filters
- Tapping button opens `TaskFilterModal` bottom sheet

**TaskFilterModal (`fe/mobile/src/components/modals/TaskFilterModal.tsx`):**
- Slides up from bottom (`animationType="slide"`, `transparent={true}`)
- Semi-transparent overlay dismisses on tap outside
- `maxHeight: '80%'` with scroll support
- "Terapkan Filter" and "Reset" action buttons

**Filter Types:**
- **Assignment Filter:** "Ditugaskan ke Saya" | "Tag Saya" (two-chip toggle)
- **Status Filter:** Semua | Menunggu | Ditugaskan | Dikerjakan | Selesai (chips)
- **Date Range Filter:** From/To using `@react-native-community/datetimepicker` native picker
- **Rayon Filter:** Dropdown (role-based access — see below)
- **Area Filter:** Dropdown populated from selected rayon (role-based access)

**Role-Based Filter Access:**

| Role | Rayon Filter | Area Filter |
|------|-------------|------------|
| `kepala_rayon` | ✅ Editable dropdown | ✅ Editable (by rayon) |
| `top_management` | ✅ Editable dropdown | ✅ Editable (by rayon) |
| `admin_system` | ✅ Editable dropdown | ✅ Editable (by rayon) |
| `superadmin` | ✅ Editable dropdown | ✅ Editable (by rayon) |
| `korlap` | 🔒 Fixed (user.rayon_id) | ✅ Editable (fixed rayon) |
| `admin_data` | 🔒 Fixed (user.rayon_id) | ✅ Editable (fixed rayon) |
| `satgas` | 🔒 Fixed (user.rayon_id) | 🔒 Fixed (user.area_id) |
| `linmas` | 🔒 Fixed (user.rayon_id) | 🔒 Fixed (user.area_id) |

**Filter Logic:**
- All filters combine with AND logic via API query params
- API params: `status`, `from_date`, `to_date`, `rayon_id`, `area_id`
- Active filter count badge on filter button
- Mini chips show active rayon/area selections

**Implementation:**
- Modal: `fe/mobile/src/components/modals/TaskFilterModal.tsx`
- APIs: `rayonsApi.ts`, `areasApi.ts` (new files)
- State: `isFilterModalOpen`, `rayonFilter`, `areaFilter`, `statusFilter`, `dateFrom`, `dateTo`
- DatePicker: `DateTimePicker` from `@react-native-community/datetimepicker`

### 4. TaskDetailScreen

**Changes:**
- Tagged users section
- Rayon name display (if rayon-scoped)
- Simplified completion (no GPS)
- Tag management for task creator

### 5. TaskCompleteScreen

**Changes:**
- Remove GPS capture
- Required: description + photo (2 fields only)

### 6. MapDashboardScreen (Monitoring)

**Changes:**
- Updated role-based access (new role names)
- Boundary warning indicators for out-of-boundary users
- korlap: own area only, kepala_rayon: own rayon, admin: all

### 7. RootNavigator

**Changes:**
- Replace WorkerTabNavigator + SupervisorTabNavigator with unified TAB_CONFIG
- Handle 8 roles

---

## Redux Changes

### Rename: reportSlice → activitiesSlice

**File:** `reportSlice.ts` → `activitiesSlice.ts`

```typescript
interface ActivitiesState {
  activitiesList: Activity[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}
// Actions: setActivitiesList, addActivity, setIsSubmitting, setError
```

### New: overtimeSlice

```typescript
interface OvertimeState {
  myOvertimes: Overtime[];
  pendingApprovals: Overtime[];
  selectedOvertime: Overtime | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}
```

### Update: tasksSlice

- Add `taggedTasks: Task[]`, `setTaggedTasks` action
- Filter state: `taskFilter: 'assigned' | 'tagged' | 'created'`

### Update: authSlice

```typescript
type UserRole = 'satgas' | 'linmas' | 'korlap' | 'admin_data' | 'kepala_rayon' | 'top_management' | 'admin_system' | 'superadmin';
```

---

## Type Updates

### models.types.ts

```typescript
export type UserRole = 'satgas' | 'linmas' | 'korlap' | 'admin_data' | 'kepala_rayon' | 'top_management' | 'admin_system' | 'superadmin';

export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

// RENAMED from WorkReport → Activity, RENAMED from Aktivitas → Activity
export interface Activity {
  id: string;
  user_id: string;      // RENAMED from worker_id
  shift_id: string;
  area_id: string;
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
  area?: Area;
  shift_definition?: ShiftDefinition;
}

// REMOVED: WorkerAssignment interface

// Overtime (FLAT — no nested aktivitas array)
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
  // Activity fields (flat — 1 overtime = 1 activity)
  activity_type_id: string;
  activityType?: ActivityType;
  description: string;
  photo_urls: string[];
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
}

// REMOVED: OvertimeAktivitas interface (merged into Overtime)

// Task (simplified)
export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assignee?: User;
  created_by: string;
  creator?: User;
  area_id?: string;
  area?: Area;
  rayon_id?: string;
  rayon?: Rayon;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status: TaskStatus;
  completion_photo_url?: string;
  completion_notes?: string;
  completed_at?: string;
  started_at?: string;
  assigned_at?: string;
  tags?: TaskTag[];
  created_at: string;
  updated_at: string;
}

export interface TaskTag {
  id: string;
  task_id: string;
  user_id: string;
  user?: User;
  created_at: string;
}
```

### Type Renames Summary

| Current Type | New Type |
|-------------|----------|
| `WorkReport` | `Activity` |
| `Aktivitas` | `Activity` |
| `WorkerSchedule` | `Schedule` |
| `WorkerAssignment` | REMOVED |
| `WorkerDashboard` | `FieldDashboard` |
| `WorkerTabParamList` | `FieldTabParamList` |
| `ActiveWorker` | `ActiveUser` |
| `LiveWorker` | `LiveUser` |
| `NotClockedInWorker` | `NotClockedInUser` |
| `OvertimeAktivitas` | REMOVED (merged into Overtime) |

### navigation.types.ts

```typescript
export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ClockInOut: undefined;
  ActivitySubmission: undefined;   // Renamed from ReportSubmission/AktivitasSubmission
  ActivityList: undefined;         // Renamed from ReportsList/AktivitasList
  TaskList: undefined;
  TaskDetail: { taskId: string };
  TaskComplete: { taskId: string };
  TaskCreate: undefined;
  OvertimeList: undefined;
  OvertimeSubmit: undefined;
  OvertimeDetail: { overtimeId: string };
  OvertimeApproval: undefined;
  Monitoring: undefined;
  Profile: undefined;
};
```

---

## API Service Updates

### Rename: reportsApi → activitiesApi

**File:** `reportsApi.ts` → `activitiesApi.ts`

| Current | New |
|---------|-----|
| `createReport()` | `createActivity()` |
| `getReports()` | `getActivities()` |
| `getReport()` | `getActivity()` |
| Base path: `/reports` | `/activities` |
| Base path: `/aktivitas` | `/activities` |

### Rename: schedulesApi endpoints

| Current | New |
|---------|-----|
| Endpoint: `/worker-schedules` | `/schedules` |

### Update: shiftsApi

| Current | New |
|---------|-----|
| `getWorkerShifts()` | `getUserShifts()` |
| Response field: `worker_id` | `user_id` |

### Update: supervisorApi

| Current | New |
|---------|-----|
| `getActiveWorkers()` | `getActiveUsers()` |
| `getWorkerAttendance()` | `getAttendance()` |

### New: overtimeApi

**File:** `fe/mobile/src/services/api/overtimeApi.ts`

```typescript
submitOvertime(dto: CreateOvertimeDto)     // POST /overtime (flat DTO)
getMyOvertimes()                           // GET /overtime/my
getPendingApprovals()                      // GET /overtime
getOvertimeDetail(id: string)              // GET /overtime/:id
approveOvertime(id: string)                // PATCH /overtime/:id/approve
rejectOvertime(id: string, reason: string) // PATCH /overtime/:id/reject
```

### Update: tasksApi

- Add `getTaggedTasks()`
- Add `addTaskTags(taskId, userIds)`
- Add `removeTaskTag(taskId, userId)`
- Remove `acceptTask()`, `declineTask()`
- Update `createTask()` to include `tagged_user_ids` and `rayon_id`
- Remove GPS fields from `completeTask()`

### Component Renames

| Current | New |
|---------|-----|
| `WorkerInfoCard` | `UserInfoCard` |
| `WorkerMarker` | `UserMarker` |

---

## Geofencing UI

### ClockInOutScreen

- After GPS acquisition, call `area.boundary_polygon` check (client-side or via API)
- If outside boundary: show soft warning banner
  - Text: "Anda berada di luar area kerja. Absen tetap dicatat."
  - Style: Yellow/amber background, warning icon
  - Clock-in button remains enabled

### MapDashboardScreen (Monitoring)

- Users who clocked in outside boundary shown with yellow/red marker
- Filter: "Tampilkan di luar area saja"

---

## NB 2.0 Compliance Checklist

All new screens MUST adhere to Neo Brutalism 2.0 design system.

**Token file:** `fe/mobile/src/constants/nbTokens.ts`

---

## Screen Count Summary

| Category | Count | Details |
|----------|-------|---------|
| New screens | 5 | OvertimeList, OvertimeSubmit, OvertimeApproval, OvertimeDetail, TaskCreate |
| Modified screens | 7 | ClockInOut, ActivitySubmission, TasksActivity, TaskDetail, TaskComplete, MapDashboard, RootNavigator |
| Unchanged screens | 5 | LoginScreen, HomeScreen, ProfileScreen, SupervisorHomeScreen, NotificationsScreen |
| **Total screens** | **22** | Up from 17 in Phase 2B |

---

## ✅ Implementation Status: Terminology Cleanup (Completed 2026-02-15)

### Production Code Fixes

**LoginScreen.tsx** (Commit: be21d3e)
- ✅ Line 96: Replaced hardcoded `'worker'` check with `isClockableRole()` helper for area fetching
- ✅ Line 138: Replaced hardcoded `'worker'` check with `isClockableRole()` helper for shift loading
- ✅ Now supports all 5 clockable roles: satgas, linmas, korlap, admin_data, kepala_rayon

**ProfileHeader.tsx** (Commit: be21d3e)
- ✅ Lines 40-51: Replaced hardcoded role switch statement with `ROLE_LABELS` lookup
- ✅ Supports all 8 Phase 2C roles dynamically
- ✅ Displays correct Indonesian labels from `constants/roles.ts`

### Test Data Updates

**Files Updated:** 12 test files, 30+ instances
- ✅ `AuthProvider.test.tsx`: worker→satgas, supervisor→korlap, admin→admin_system (3 instances)
- ✅ `authSlice.test.ts`: worker→satgas (1 instance)
- ✅ `shiftWorkflow.test.ts`: worker→satgas (5 instances)
- ✅ `SettingsScreen.test.tsx`: worker→satgas (1 instance)
- ✅ `secureStorage.test.ts`: worker→satgas (2 instances)
- ✅ `ClockInOutScreen.comprehensive.test.tsx`: worker→satgas (1 instance)
- ✅ `ClockInOutScreen.test.tsx`: worker→satgas (1 instance)
- ✅ `offlineQueue.edge-cases.test.ts`: worker→satgas (5 instances)
- ✅ `authApi.test.ts`: worker→satgas (2 instances)
- ✅ `notificationsApi.test.ts`: worker→satgas in target_roles array (1 instance)
- ✅ `activityTypesApi.test.ts`: worker→satgas (1 instance)
- ✅ `LoginScreen.test.tsx`: worker→satgas (7 instances), supervisor→korlap (1 instance)

**Test Logic Fix:**
- ✅ LoginScreen.test.tsx: Updated "should not fetch area for supervisor" test to use `top_management` (non-clockable role)
  - Rationale: korlap IS clockable in Phase 2C, so test needed to use a monitoring-only role

### Documentation Updates

- ✅ `SettingsScreen.tsx`: Updated comment from "Worker and Supervisor navigators" to "all 8 roles via unified MainNavigator"
- ✅ `MainNavigator.tsx`: Updated comment from "Supervisor/monitoring screens" to list all applicable roles
- ✅ Verified korlap Profile tab exists in TAB_CONFIG

### Verification Results

**Test Suite:** All 59 affected tests passing (100% pass rate)
- LoginScreen: 25/25 tests ✅
- authSlice: All tests ✅
- SettingsScreen: All tests ✅

**Impact:**
- All hardcoded old role checks removed from production code
- All test data updated to Phase 2C role values
- Future-proof: New roles only need updates in `constants/roles.ts`
- No breaking changes to backend API contracts

**References:**
- ADR-009 (8-role system)
- ADR-010 (English-only code)
- Commit: be21d3e

---

## Header System Standard (Phase 2C — Feb 18, 2026)

**Component:** `fe/mobile/src/components/navigation/FieldHomeHeader.tsx`
**Navigator:** `fe/mobile/src/navigation/MainNavigator.tsx`

### Architecture: 3-Column Unified Header

`FieldHomeHeader` owns **all three columns** and is rendered as the navigator's `headerTitle` — React Navigation's `headerLeft` is **never used** for back navigation.

```
[←16px pad→][Left 40–44px][←8/4px→][Center flex:1][←4px→][Status badge][←16px pad→]
```

| Column | Content |
|--------|---------|
| **Left** | `onBack` prop → 44×44 back arrow (WCAG); no `onBack` → 40×40 leaf icon |
| **Center** | Main tab: "Halo, [Name]!" + role badge. Sub-screen: page title 18px extrabold |
| **Right** | Online / Syncing / Pending status badge, pinned to right edge |

**Rule:** All sub-screens MUST pass `onBack`. There is no spacer/no-back case.

### Pixel Alignment

Both screen types have the center column start at the same x-position:

| Left element | Width | Gap | Total |
|---|---|---|---|
| Leaf icon box | 40px | `marginRight: sm` (8px) | **48px** |
| Back arrow (WCAG touch 44px, `alignItems: 'flex-start'`) | 44px | `marginRight: xs` (4px) | **48px** ✓ |

The `alignItems: 'flex-start'` on the back button ensures the arrow icon also starts at the same visual x-position (16px from screen edge) as the leaf icon box's left edge.

### React Navigation Style Overrides (in `MainNavigator.tsx` → `screenOptions`)

React Navigation v6 bottom-tabs injects a computed `maxWidth` cap on the title slot that limits it to `layout.width - 32`. These overrides are required to give `FieldHomeHeader` full width:

```typescript
headerTitleContainerStyle: {
  flex: 1,
  marginHorizontal: 0,   // overrides default 16px margins
  maxWidth: 9999,        // overrides computed cap (our style is last in array → wins)
},
headerRightContainerStyle: {
  flexGrow: 0,           // overrides default flexGrow: 1 on the empty right slot
  flexBasis: 0,
  width: 0,
},
```

> **Why `flexGrow: 0` not `flex: 0`?** React Navigation's right slot has an explicit `flexGrow: 1` in its style array. The `flex` shorthand does not reliably override individual `flexGrow` when merged; explicit `flexGrow: 0` is required.

### Token Values (Phase 2C)

| Token | Phase 2B | Phase 2C | Reason |
|-------|----------|----------|--------|
| Header padding | 8px (`sm`) | 16px (`md`) | Matches HomeScreen card edge |
| Back button touch target | 40×40 | 44×44 | WCAG 2.1 AA minimum |
| Back button `alignItems` | `center` | `flex-start` | Icon aligns with leaf icon's left edge |
| Page title font | `xl` (20px) | `lg` (18px) | Overflow protection on long titles |
| Status badge padding-H | 6px | 8px | Improved readability |
| Status badge min-width | 60px | 64px | "Offline" text no longer clips |
| Status badge font | 10px | 11px bold | WCAG minimum readable size |

### Custom Navigation Targets (via `onBack` prop)

| Screen | Configured in | Back navigates to |
|--------|---------------|-------------------|
| ActivityDetail | MainNavigator | `navigate('TasksActivities')` |
| ShiftHistory | MainNavigator | `navigate('Profile')` |
| TaskComplete | Screen `setOptions` | Alert-confirm dialog → `goBack()` |
| ClockInOut | Screen `setOptions` | `goBack()` (dynamic title too) |
| ActivitySubmission | MainNavigator | `goBack()` |
| All other sub-screens | MainNavigator | `goBack()` |

### Screen-Level `setOptions` (2 screens only)

**ClockInOut** — sets dynamic title + onBack at mount and whenever `isClockIn` changes:
```typescript
navigation.setOptions({
  headerTitle: () => (
    <FieldHomeHeader title={isClockIn ? 'Clock In' : 'Clock Out'} onBack={goBack} />
  ),
});
```

**TaskComplete** — sets custom onBack (shows alert before leaving):
```typescript
navigation.setOptions({
  headerTitle: () => <FieldHomeHeader title="Selesaikan Tugas" onBack={handleCancel} />,
});
```

All other screens are fully configured in `MainNavigator.tsx`.

### ClockInOutScreen (Phase 2C)

- Dynamic header title (Clock In / Clock Out) via `setOptions`
- Collapsible "Area Ditugaskan" card (default: collapsed)
- Collapsible "Lokasi Anda" card (default: expanded)
- Card order: Area Ditugaskan → Foto Selfie → Lokasi Anda
- Soft geofencing banner (inside ✅ / outside ⚠️) — clock-in always succeeds
- FAB Submit button (fixed bottom, outside ScrollView)
- Shift timer: 40px extrabold, `nbColors.warning`
- Clock-in timestamp: `formatDateTime` (date + time)

---

**Last Updated:** 2026-02-18
