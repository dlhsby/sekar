# Phase 2E: Mobile Requirements

**Last Updated:** 2026-03-15
**Status:** ✅ COMPLETE
**Platform:** React Native 0.83.1, TypeScript, Redux Toolkit, react-native-maps
**Related ADRs:** [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../../architecture/decisions/ADR-015-audit-trail.md)
**See also:** [Backend Requirements](./backend.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| File/Component | Key Facts |
|----------------|-----------|
| `LoginScreen.tsx` | Single `username` text input + password; imperatively calls `authApi.login()` then dispatches `setUser` action |
| `ClockInOutScreen.tsx` | Selfie optional (Phase 2E). `useClockInOut` uses `mediaService.capturePhoto(true)` → `Photo` object with `file://` URI; base64 converted at upload time via `mediaService.convertToBase64()`. State is `selfie: Photo\|null` (not `selfieUri: string\|null`) |
| `HomeScreen.tsx` | Shows shift status, location card, FAB for actions |
| `MapDashboardScreen.tsx` | Five-status markers, polygon boundaries, filter modal |
| `MonitoringFilterModal.tsx` | Korlap is in `ROLES_WITHOUT_RAYON` (rayon picker hidden); area picker is a single `NBSelect` showing ALL areas (not restricted to assigned areas) |
| `UserDetailSheet.tsx` | Bottom sheet with shift info, activities, WhatsApp deeplink |
| `authSlice.ts` | Plain `createSlice` with synchronous reducers: `setLoading`, `setUser`, `setError`, `clearError`, `logout` — NO async thunks, NO RTK Query |
| `authApi.ts` | Plain async function `login(credentials)` — NOT an RTK Query mutation |
| `api.types.ts` | `LoginRequest { username: string; password: string }` |
| `ProfileScreen` | Located at `fe/mobile/src/screens/common/ProfileScreen.tsx` (NOT `screens/profile/`) |
| **Existing overtime screens** | `OvertimeListScreen.tsx`, `OvertimeSubmitScreen.tsx` (329 lines, submission-based with draft support), `OvertimeDetailScreen.tsx`, `components/OvertimeCard.tsx` — all at `screens/overtime/` |
| `overtimeSlice.ts` | Plain `createSlice` with manual reducers (`setLoading`, `setSubmitting`, `addOvertime`, etc.) — NOT RTK Query |
| `overtimeApi.ts` | `submitOvertime()`, `getMyOvertimes()`, `approveOvertime()`, `rejectOvertime()` — no start/end flow |
| Navigation (per-role tabs) | satgas: Home, TasksActivities, Overtime, Profile (4 tabs); korlap: Home, Monitoring, TasksActivities, Overtime, Profile (5 tabs); admin_data: TasksActivities, Monitoring, Overtime, Profile (NO Home); kepala_rayon: Monitoring, TasksActivities, Overtime, Profile (NO Home); top_management/admin_system: Monitoring, TasksActivities, Profile (NO Overtime) |
| Task/Activity detail screens | Located at `fe/mobile/src/screens/field/TaskDetailScreen.tsx` and `ActivityDetailScreen.tsx` (NOT `screens/taskActivity/`) |

---

## Overview of Changes

| Component | Change Type | Description |
|-----------|-------------|-------------|
| `LoginScreen` | Enhancement | Accept phone number or username as identifier |
| `ClockInOutScreen` | Enhancement | Make selfie optional |
| `HomeScreen` | Enhancement | Show profile picture |
| `ProfileScreen` | Enhancement | Upload/change profile picture |
| `MapDashboardScreen` | Enhancement | Show profile pictures in markers |
| `MonitoringFilterModal` | Enhancement | Multi-area support for korlap, admin_data scope |
| `UserDetailSheet` | Enhancement | Show profile picture, audit trail link |
| **New: `OvertimeClockInScreen`** | New screen | Overtime clock-in flow (same as regular) |
| **New: `OvertimeClockOutScreen`** | New screen | Overtime clock-out + mandatory activity |
| **New: `AuditTrailView`** | New component | Revision history timeline |
| `TaskDetailScreen` | Enhancement | Show audit trail / revision history |
| `ActivityDetailScreen` | Enhancement | Show audit trail |
| `authSlice` / `authApi` | Enhancement | `identifier` field replaces `username` |
| `api.types.ts` | Enhancement | Updated types for new endpoints |

---

## A. Login Screen Update

**File:** `fe/mobile/src/screens/auth/LoginScreen.tsx`

### Changes

1. Replace `username` label with "Username atau Nomor HP" (or "Username or Phone Number")
2. Input field accepts both phone numbers and usernames
3. Auto-detect input type: if starts with `0` or `+`, show phone keyboard
4. Update API call: `{ identifier: inputValue, password }`

### UI Updates

```
┌─────────────────────────────────────────┐
│                                         │
│             [SEKAR Logo]                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Username atau Nomor HP          │    │  ← Changed label
│  │ [input field]                   │    │  ← Dynamic keyboard type
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Password                        │    │
│  │ [input field]                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         MASUK / LOGIN           │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### Type Changes

```typescript
// api.types.ts
export interface LoginRequest {
  identifier: string; // was: username: string
  password: string;
}
```

### Auth API Changes

```typescript
// authApi.ts — update login() function signature
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // existing implementation, just change LoginRequest type
}

// authSlice.ts — no changes needed (plain createSlice, no async logic)
// LoginScreen calls authApi.login() imperatively then dispatches setUser
```

---

## B. Profile Picture

> **Mar 15 implementation note:** Profile pictures are stored as base64 data URIs (`data:image/jpeg;base64,...`) in `users.profile_picture_url`, NOT as S3 URLs. The backend `POST /users/:id/profile-picture` endpoint converts the multipart buffer to base64 directly — `S3Service` injection was removed from `UsersController`. Reason: LocalStack S3 URLs (`http://localhost:4566/...`) are inaccessible from physical devices on the same LAN. `<Image source={{ uri: profile_picture_url }} />` renders both `file://` and `data:` URIs correctly in React Native.

### B1. Profile Screen Enhancement

**File:** `fe/mobile/src/screens/common/ProfileScreen.tsx`

Add profile picture section at top:

```
┌─────────────────────────────────────────┐
│  ┌──────┐                               │
│  │ [pic]│  Nama User                    │
│  │      │  Korlap • Rayon 1             │
│  └──────┘  📷 Ubah Foto                 │  ← Tap to change
├─────────────────────────────────────────┤
│  Nomor HP: 081234567001                 │
│  Username: korlap1                      │
│  ...                                    │
└─────────────────────────────────────────┘
```

### B2. Profile Picture Picker

Use `react-native-image-picker` (already in dependencies for selfie):

```typescript
const pickProfilePicture = async () => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    maxWidth: 500,
    maxHeight: 500,
    quality: 0.8,
  });

  if (result.assets?.[0]) {
    await uploadProfilePicture(result.assets[0]);
  }
};
```

### B3. Monitoring Marker Enhancement

**File:** `fe/mobile/src/components/monitoring/UserMarker.tsx`

Add profile picture to marker (small circular avatar):

```typescript
// If user has profile_picture_url, show it in marker
<Marker coordinate={...}>
  <View style={styles.markerContainer}>
    {user.profile_picture_url ? (
      <Image source={{ uri: user.profile_picture_url }} style={styles.avatar} />
    ) : (
      <DefaultAvatar role={user.role} />
    )}
    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
  </View>
</Marker>
```

---

## C. Clock-In/Out Optional Selfie

**File:** `fe/mobile/src/screens/field/ClockInOutScreen.tsx`

> **Mar 15 implementation note:** Selfie capture uses `mediaService.capturePhoto(true)` (front camera, `@bam.tech/react-native-image-resizer`) which returns a `Photo` object with a `file://` local URI. State is `selfie: Photo|null`. For display: `<Image source={{ uri: selfie.uri }} />`. For API upload: `await mediaService.convertToBase64(selfie)` converts to `data:image/jpeg;base64,...` string at submission time only. The old approach (`launchCamera({ includeBase64: true })`) stored a raw base64 data URI which caused white/blank images in `<Image>`. Same pattern applies to `OvertimeSubmitScreen` selfies.

### Changes

1. Selfie step becomes optional — show "Skip" button
2. If skipped, proceed with `selfie_photo: undefined`
3. Both normal shift and overtime clock-in/out affected

```
┌─────────────────────────────────────────┐
│  Foto Selfie (Opsional)                 │
│                                         │
│  ┌─────────────────────────────┐        │
│  │                             │        │
│  │     [Camera Preview]        │        │
│  │                             │        │
│  └─────────────────────────────┘        │
│                                         │
│  ┌─────────────┐  ┌──────────────┐     │
│  │   LEWATI     │  │  AMBIL FOTO  │     │  ← Skip OR Take Photo
│  └─────────────┘  └──────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

---

## D. Overtime Screens

**Existing screens to modify/replace:** `OvertimeSubmitScreen.tsx` (329 lines, submission-based with draft support), `OvertimeListScreen.tsx`, `OvertimeDetailScreen.tsx`, `OvertimeCard.tsx`. The submission-based flow (`OvertimeSubmitScreen`) is replaced by the clock-in screen below. List/detail screens are enhanced to show shift-linked clock-in/out data.

> **Mar 15 implementation notes for `OvertimeDetailScreen`:**
> - **Pull-to-refresh**: `RefreshControl` added to ScrollView; `fetchDetail(isRefresh=true)` suppresses navigation on error during refresh
> - **Trail visibility**: `canViewTrail` requires `!!(overtime?.shift_id && user?.role && !['satgas', 'linmas'].includes(user.role))` — `GET /monitoring/users/:id/location-history` API returns 403 for satgas/linmas
> - **areaName prop**: passes `overtime.area?.name` to `OvertimeTrailModal` for callout display

> **Mar 15 implementation notes for `OvertimeTrailModal`:**
> - **Refresh button**: header right button; `isRefreshing` state; shows `ActivityIndicator` while refreshing
> - **Intermediate markers**: all points between start/end rendered as `pinColor="blue"` — three separate render paths (start/mid/end) to prevent `react-native-maps` native view recycling from overwriting colors
> - **Zoom controls**: `animateToRegion()` with delta ÷2 (zoom in) / ×2 (zoom out); `onRegionChangeComplete` tracks `currentRegion`
> - **Marker deduplication**: `markerPoints` useMemo filters intermediates using `calculateDistance()` (gpsUtils.ts haversine, meters); a point is shown only if `distFromLastKept ≥ 15m AND distFromEnd ≥ 15m` — prevents overlapping pins when stationary or at journey end
> - **Callout format**: worker name (primary bold, row 1) → label (e.g. "Mulai Lembur") → `Waktu: 15 Maret 2026 10:44:34` → `GPS: -7.222222, 112.333333` → `Akurasi: Nm` → `Baterai: N%` → `Area: Di Dalam Area (Nama Area)` or `Di Luar Area` (no area name when outside — can't determine which area)
> - **Shift definition**: `ShiftsService.clockIn()` sets `shift_definition_id = null` when `isOvertime=true` — overtime shifts are not tagged with regular shift windows

### D1. OvertimeClockInScreen (New — replaces OvertimeSubmitScreen)

**File:** `fe/mobile/src/screens/overtime/OvertimeClockInScreen.tsx`

Same flow as `ClockInOutScreen` but for overtime:

1. Validate: no active normal shift (show error if still clocked in)
2. GPS location capture
3. Optional selfie
4. Reason input (mandatory for overtime)
5. Call `POST /overtime/start`

```
┌─────────────────────────────────────────┐
│  ← Kembali       LEMBUR                │
├─────────────────────────────────────────┤
│                                         │
│  📍 Lokasi: Taman Bungkul              │
│  🕐 Waktu: 17:30 WIB                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ Alasan Lembur *                 │    │
│  │ [text input]                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📷 Foto Selfie (Opsional)             │
│  [Camera / Skip]                        │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      MULAI LEMBUR               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ⚠️ Pastikan shift normal sudah         │
│     berakhir sebelum memulai lembur     │
│                                         │
└─────────────────────────────────────────┘
```

### D2. OvertimeClockOutScreen (New)

**File:** `fe/mobile/src/screens/overtime/OvertimeClockOutScreen.tsx`

1. GPS location capture
2. Optional selfie
3. **Mandatory activity submission** (inline form or link to activity screen)
4. Call `POST /overtime/end`

```
┌─────────────────────────────────────────┐
│  ← Kembali    AKHIRI LEMBUR            │
├─────────────────────────────────────────┤
│                                         │
│  📍 Lokasi: Taman Bungkul              │
│  🕐 Durasi: 2 jam 30 menit             │
│                                         │
│  ─── Laporan Aktivitas (Wajib) ───     │
│  ┌─────────────────────────────────┐    │
│  │ Jenis Aktivitas *               │    │
│  │ [dropdown]                      │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ Deskripsi *                     │    │
│  │ [text area]                     │    │
│  └─────────────────────────────────┘    │
│  📎 Lampiran Foto (Opsional)           │
│                                         │
│  📷 Foto Selfie (Opsional)             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │     SELESAI LEMBUR              │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### D3. Navigation Changes

Add overtime as accessible from bottom tab or FAB:

```typescript
// Bottom Tab: "Lembur" tab for CLOCKABLE_ROLES
// Shows: OvertimeClockInScreen if no active overtime
//        OvertimeClockOutScreen if overtime in progress
//        OvertimeHistoryScreen for past records
```

---

## E. Monitoring Filter Updates

### E1. Multi-Area Korlap Filter

**File:** `fe/mobile/src/components/modals/MonitoringFilterModal.tsx`

For korlap users with multiple assigned areas:

```
┌─────────────────────────────────────────┐
│  Filter Monitoring                      │
├─────────────────────────────────────────┤
│  Rayon: [Rayon 1 (preset)]             │  ← Korlap: fixed to own rayon
│                                         │
│  Area:                                  │
│  ☑ Taman Bungkul                       │  ← Multi-select (assigned areas)
│  ☑ Taman Prestasi                      │
│  ☐ Taman Ekspresi (not assigned)       │  ← Grayed out / hidden
│                                         │
│  Status: [All ▼]                       │
│  Pekerja: [Semua ▼]                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │          TERAPKAN               │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### E2. Admin Data Monitoring Access

Admin Data already has monitoring tab access from Phase 2C/2D (in `MONITORING_RAYON` group). The changes here are:

- Ensure filter UI matches kepala_rayon (rayon-scoped area picker)
- Verify admin_data can see all korlap, satgas, linmas in rayon
- No navigation change needed — Monitoring tab already visible for admin_data

---

## F. Audit Trail / Revision History

### F1. AuditTrailView Component (New)

**File:** `fe/mobile/src/components/common/AuditTrailView.tsx`

A vertical timeline showing entity change history:

```
┌─────────────────────────────────────────┐
│  Riwayat Perubahan                      │
├─────────────────────────────────────────┤
│  ● Dibuat                               │
│  │ oleh Korlap1 • 10 Mar 2026 08:00    │
│  │                                      │
│  ● Status: Diterima → Dikerjakan        │
│  │ oleh Satgas1 • 10 Mar 2026 09:30    │
│  │                                      │
│  ● Revisi Diminta                       │
│  │ oleh Korlap1 • 10 Mar 2026 14:00    │
│  │ "Foto bukti kurang jelas"            │
│  │                                      │
│  ● Status: Revisi → Dikerjakan          │
│  │ oleh Satgas1 • 10 Mar 2026 15:00    │
│  │                                      │
│  ● Diverifikasi                         │
│  │ oleh Korlap1 • 10 Mar 2026 16:00    │
└─────────────────────────────────────────┘
```

### F2. Integration in Task Detail

**File:** `fe/mobile/src/screens/field/TaskDetailScreen.tsx`

Add "Riwayat Perubahan" section at bottom of task detail:

```typescript
// Fetch audit logs via auditApi (plain async function, not RTK Query)
const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
useEffect(() => {
  auditApi.getAuditTrail('task', task.id).then(setAuditLogs);
}, [task.id]);

// Render AuditTrailView with auditLogs data
```

### F3. Integration in Activity Detail

**File:** `fe/mobile/src/screens/field/ActivityDetailScreen.tsx`

Same pattern — add audit trail section showing approval/rejection history.

---

## G. Type Updates

### G1. API Types

**File:** `fe/mobile/src/types/api.types.ts`

```typescript
// Updated
export interface LoginRequest {
  identifier: string; // was: username
  password: string;
}

// New
export interface UserArea {
  id: string;
  area_id: string;
  area: Area;
  assignment_type: 'permanent' | 'task_based';
  assigned_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: UserSummary;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface StartOvertimeRequest {
  gps_lat: number;
  gps_lng: number;
  selfie_photo?: string; // base64-encoded image string (same format as shift clock-in)
  reason: string;
}

export interface EndOvertimeRequest {
  gps_lat: number;
  gps_lng: number;
  selfie_photo?: string; // base64-encoded image string
  activity: CreateActivityRequest;
}
```

### G2. Model Types

**File:** `fe/mobile/src/types/models.types.ts`

```typescript
// Updated User model
export interface User {
  // ... existing fields
  phone_number: string | null;
  profile_picture_url: string | null;
  user_areas?: UserArea[];
}

// Updated Shift model
export interface Shift {
  // ... existing fields
  is_overtime: boolean;
}

// Updated Overtime model
export interface Overtime {
  // ... existing fields
  shift_id: string | null;
  shift?: Shift;
}
```

---

## H. Redux Store & API Service Updates

**Pattern:** This codebase uses plain `createSlice` with synchronous reducers + separate `*Api.ts` files with plain async functions. Do NOT use RTK Query or `createAsyncThunk`.

### H1. Auth API & Slice

```typescript
// authApi.ts — update function signature (no structural changes needed)
// LoginRequest type changes from { username, password } to { identifier, password }
// authSlice.ts — no changes (setUser, setLoading, setError reducers unchanged)
```

### H2. Overtime API & Slice Enhancements

```typescript
// overtimeApi.ts — add new functions alongside existing submitOvertime, getMyOvertimes, etc.
export async function startOvertime(data: StartOvertimeRequest): Promise<Overtime> { ... }
export async function endOvertime(overtimeId: string, data: EndOvertimeRequest): Promise<Overtime> { ... }
export async function getActiveOvertime(): Promise<Overtime | null> { ... }

// overtimeSlice.ts — add new reducers to existing createSlice
// setActiveOvertime, clearActiveOvertime (follows existing pattern: setLoading, setSubmitting, etc.)
```

**Note:** Existing overtime screens (`OvertimeSubmitScreen`, `OvertimeListScreen`, `OvertimeDetailScreen`, `OvertimeCard`) need updating to integrate with the new clock-in/out flow. The submission-based `OvertimeSubmitScreen` (329 lines with draft support) is replaced by the clock-in flow; the list/detail screens are enhanced to show shift-linked data.

### H3. New Audit API

```typescript
// auditApi.ts (new file) — plain async functions
export async function getAuditTrail(entityType: string, entityId: string): Promise<AuditLog[]> {
  return apiClient.get(`/audit/${entityType}/${entityId}`);
}
```

---

## I. Navigation Updates

**Current tabs per role (from MainNavigator.tsx):**

| Role | Current Tabs | Changes in 2E |
|------|-------------|---------------|
| `satgas` | Home, TasksActivities, Overtime, Profile (4) | Overtime tab points to new clock-in/out flow |
| `linmas` | Home, TasksActivities, Overtime, Profile (4) | Overtime tab points to new clock-in/out flow |
| `korlap` | Home, Monitoring, TasksActivities, Overtime, Profile (5) | Monitoring filters updated for multi-area |
| `admin_data` | TasksActivities, Monitoring, Overtime, Profile (4, NO Home) | **+Home tab** (now clockable); Overtime tab points to clock-in/out |
| `kepala_rayon` | Monitoring, TasksActivities, Overtime, Profile (4, NO Home) | **+Home tab** (now clockable); Overtime tab points to clock-in/out |
| `top_management` | Monitoring, TasksActivities, Profile (3, NO Overtime) | No change |
| `admin_system` | Monitoring, TasksActivities, Profile (3, NO Overtime) | No change |

**Key navigation changes:**
1. `admin_data` and `kepala_rayon` gain Home tab (ClockInOutScreen) since they become clockable
2. Existing Overtime tab for all clockable roles switches from submission-based flow to clock-in/out flow
3. No new tabs are added — existing Overtime tab behavior changes
