# Phase 2D: Mobile Requirements

**Last Updated:** 2026-03-03
**Status:** Planning
**Platform:** React Native 0.83.1, TypeScript, Redux Toolkit, react-native-maps
**Related ADR:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), ADR-011 (new)
**See also:** [Backend Requirements](./backend.md), [UI/UX Design](./ui-ux.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| File/Component | Key Facts |
|----------------|-----------|
| `MapDashboardScreen.tsx` | Uses `react-native-maps` with clustering; 3-status model (online/offline + boundary); radius circles for area display |
| `UserMarker.tsx` | Circle marker with color based on online/offline; no role icon differentiation |
| `mapUtils.ts` | `calculateUserStatus()` returns 3 statuses; `getStatusColor()` maps to green/red |
| `monitoringSlice.ts` | Stores `liveUsers`, `areaStats`, `cityStats`; polling-based refresh |
| `LocationTrackerService.ts` | Background GPS upload every 60s; batch upload support |
| `WebSocketService.ts` | Listens to `user:location`, `user:clock-in`, `user:clock-out` events |
| Navigation | Monitoring tab already configured for korlap, kepala_rayon, top_management, admin_system, superadmin |

---

## Overview of Changes

| Component | Change Type | Description |
|-----------|-------------|-------------|
| `MapDashboardScreen` | Major enhancement | Four-status model, polygon rendering, summary bar, FAB controls |
| `UserMarker` | Major enhancement | Role-specific icons, status shapes, name labels |
| `mapUtils.ts` | Update | Four-status model replaces three-status |
| `monitoringSlice.ts` | Enhancement | New state for location history, day summary, staffing, config |
| New: `UserDetailSheet` | New component | Bottom sheet with shift info, activities, WhatsApp deeplinks |
| New: `LocationTrail` | New component | Polyline rendering for location history playback |
| New: `MonitoringFilterModal` | New component | Full-screen filter with cascading rayon/area/user |
| New: `StatusSummaryBar` | New component | Four-status chips with counts |
| New: `UserListStrip` | New component | Bottom horizontal scroll cards |
| Navigation | No changes | Monitoring tab already configured for correct roles |

---

## A. MapDashboardScreen Enhancement

**File:** `fe/mobile/src/screens/monitoring/MapDashboardScreen.tsx`

### Current Behavior
- Displays `MapView` with clustered `UserMarker` components
- Radius circles for area boundaries
- Three-status model (online/offline + outside boundary)
- Pull-to-refresh polling

### Phase 2D Changes

#### A1. Area Boundary Rendering

Replace radius circles with polygon rendering when `boundary_polygon` exists:

```typescript
// For each area:
if (area.boundary_polygon?.coordinates?.length > 0) {
  // Render Polygon component with coordinates
  <Polygon
    coordinates={area.boundary_polygon.coordinates[0].map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    }))}
    strokeColor={getAreaStrokeColor(area)}
    fillColor={getAreaFillColor(area)}
    strokeWidth={2}
  />
} else if (area.radius_meters) {
  // Fallback: render Circle (existing behavior)
  <Circle
    center={{ latitude: area.gps_lat, longitude: area.gps_lng }}
    radius={area.radius_meters}
  />
}
```

**Performance:** Set `tracksViewChanges={false}` on Polygon; pre-compute coordinate arrays outside render.

#### A2. Four-Status Color Model

Replace the three-status model with four statuses:

| Status | Marker Color | Hex |
|--------|-------------|-----|
| `active` | Dark Green | `#15803D` |
| `inactive` | Amber | `#D97706` |
| `outside_area` | Purple | `#9333EA` |
| `missing` | Red | `#DC2626` |

Users with `status === 'offline'` are NOT shown on the map (no active shift, gray in lists only).

#### A3. Map Controls (FAB Column)

Add a vertical FAB column on the right side of the map:

```
[Filter icon]    ← Opens MonitoringFilterModal
[My Location]    ← Centers map on user's current GPS
[Zoom +]         ← Zoom in
[Zoom -]         ← Zoom out
[Refresh]        ← Manual data refresh
```

**Position:** Right edge, vertically centered, `gap: 8px` between buttons.
**Style:** 44x44px round buttons, white background, NB shadow, 2px black border.

#### A4. Summary Bar (Top)

Horizontal bar below the header showing four-status counts:

```
[● 12 Active] [● 5 Idle] [● 2 Outside] [● 1 Missing]
```

- Each chip: colored dot + count + label
- Tappable: filters map to show only that status
- Active chip has darker background
- "All" state when no chip is selected (default)

#### A5. User List Strip (Bottom)

Horizontal scrolling card strip at the bottom of the map:

```
[User Card 1] [User Card 2] [User Card 3] ...
```

Each card shows:
- Status dot (colored)
- User name (truncated)
- Role badge
- Area name
- Last update time (relative: "2m ago")

**Behavior:**
- Scroll horizontally to browse users
- Tap card → center map on user + show detail sheet
- Cards sorted: missing first, then outside_area, inactive, active
- Height: 80px, width: 160px per card

#### A6. Map Marker Tap → User Detail Sheet

When a user marker is tapped:
1. Center map on marker with animation
2. Open `UserDetailSheet` (bottom sheet)

---

## B. UserMarker Enhancement

**File:** `fe/mobile/src/components/monitoring/UserMarker.tsx`

### Current Behavior
- Simple colored circle (green = online, red = offline)
- No role differentiation
- No name label

### Phase 2D Changes

#### B1. Status-Based Color

Use four-status color system (see A2 above).

#### B2. Role-Specific Icon Shape

| Role | Icon Shape | Description |
|------|-----------|-------------|
| `satgas` | Circle | Standard field worker |
| `linmas` | Shield | Security officer |
| `korlap` | Star | Field coordinator |

**Implementation:** Use `MaterialCommunityIcons` inside the marker view:
- `satgas`: `account-circle`
- `linmas`: `shield-account`
- `korlap`: `star-circle`

#### B3. Name Label

Display user's first name below the marker:
- Font: 10px, bold, white text with black outline (readable on any map tile)
- Max width: 60px, truncated with ellipsis
- Only visible at zoom level >= 14 (avoid clutter at wide zoom)

#### B4. Props Interface

```typescript
interface UserMarkerProps {
  user: LiveUser;
  onPress: (user: LiveUser) => void;
  showLabel?: boolean; // default: true when zoom >= 14
}

interface LiveUser {
  id: string;
  full_name: string;
  role: string;
  status: 'active' | 'inactive' | 'outside_area' | 'missing';
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  shift_id: string;
  shift_name: string;
  phone: string | null;
}
```

---

## C. UserDetailSheet (New)

**File:** `fe/mobile/src/components/monitoring/UserDetailSheet.tsx`

Bottom sheet modal that appears when a user marker or list card is tapped.

### Layout

```
┌─────────────────────────────────────┐
│  ── drag handle ──                  │
│                                     │
│  [Status dot] Full Name        [×]  │
│  Role badge  •  Area name           │
│                                     │
│  ┌─── Shift Info ─────────────────┐ │
│  │ Shift: Pagi (07:00-15:00)      │ │
│  │ Clock In: 07:12 WIB            │ │
│  │ Duration: 4h 23m               │ │
│  │ Boundary: ✅ Inside / ⚠️ Outside│ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─── Last Location ─────────────┐ │
│  │ 📍 -7.2832, 112.7534          │ │
│  │ Accuracy: ±12m                 │ │
│  │ 🔋 78%  •  2 min ago          │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─── Activities Today (3) ──────┐ │
│  │ • Penyiraman Tanaman   08:30  │ │
│  │ • Pembersihan Sampah   10:15  │ │
│  │ • Perawatan Taman      13:00  │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─── Tasks Today (1) ───────────┐ │
│  │ • Potong Rumput Area B  [🔵]  │ │
│  └────────────────────────────────┘ │
│                                     │
│  [📱 WhatsApp]  [📞 Call]  [📍 Trail] │
│                                     │
└─────────────────────────────────────┘
```

### Data Source

Fetches from `GET /monitoring/users/:userId/day-summary` (see [backend.md](./backend.md#d2)).

### Action Buttons

| Button | Action |
|--------|--------|
| WhatsApp | Open `https://wa.me/62${phone}` deeplink |
| Call | Open `tel:+62${phone}` deeplink |
| Trail | Navigate to location history view (inline map overlay) |

**WhatsApp phone formatting:**
- Strip leading `0` or `+62`, prepend `62`
- Example: `08123456789` → `628123456789`

### Bottom Sheet Behavior
- Initial height: 50% of screen
- Expandable to 85% by dragging
- Dismiss by swiping down or tapping `×`
- Uses `@gorhom/bottom-sheet` (already in project dependencies)

---

## D. LocationTrail Component (New)

**File:** `fe/mobile/src/components/monitoring/LocationTrail.tsx`

Renders a user's location history as a polyline on the map.

### Visualization

```
[Start pin 🟢] ──── polyline ──── [End pin 🔴]
                     │
              [clickable dots at each GPS point]
```

- **Polyline:** 3px width, color based on `is_within_area`:
  - Inside area: `#15803D` (green)
  - Outside area: `#9333EA` (purple)
- **Start marker:** Green circle with "S" label
- **End marker:** Red circle with "E" label
- **Intermediate points:** Small dots (6px), same color logic as polyline segments
- **Clickable points:** Tap to show callout with time, accuracy, battery, within-area status

### Data Source

Fetches from `GET /monitoring/users/:userId/location-history?date=YYYY-MM-DD` (see [backend.md](./backend.md#d1)).

### Props

```typescript
interface LocationTrailProps {
  userId: string;
  date: string; // YYYY-MM-DD
  shiftId?: string;
  onClose: () => void;
}
```

### Interaction

1. User taps "Trail" button in `UserDetailSheet`
2. Map overlays the trail polyline
3. Map auto-zooms to fit trail bounds with padding
4. Top bar shows: user name, date, total distance, time inside/outside
5. Tap "×" to dismiss trail and return to normal map view

---

## E. MonitoringFilterModal (New)

**File:** `fe/mobile/src/components/modals/MonitoringFilterModal.tsx`

Full-screen modal for filtering the monitoring map.

### Layout

```
┌─────────────────────────────────────┐
│  ← Filter Monitoring           Reset│
│─────────────────────────────────────│
│                                     │
│  Status                             │
│  [Active] [Idle] [Outside] [Missing]│
│  (multi-select chips)               │
│                                     │
│  Rayon                              │
│  [▼ Select Rayon          ]         │
│  (role-gated: korlap=hidden,       │
│   kepala_rayon=fixed own rayon)     │
│                                     │
│  Area                               │
│  [▼ Select Area           ]         │
│  (cascades from rayon selection)    │
│                                     │
│  Role                               │
│  [Satgas] [Linmas] [Korlap]        │
│  (multi-select chips)               │
│                                     │
│  Search User                        │
│  [🔍 Type user name...    ]         │
│                                     │
│  ┌─── Staffing Summary ──────────┐ │
│  │ Area Kebun Bibit:              │ │
│  │   Satgas: 8/10 (2 idle, 1 out)│ │
│  │   Linmas: 3/5 (1 missing)     │ │
│  │   Korlap: 1/1 ✅               │ │
│  └────────────────────────────────┘ │
│                                     │
│  [          Terapkan              ] │
│                                     │
└─────────────────────────────────────┘
```

### Role-Based Filter Access

| Role | Rayon | Area | Role Filter | User Search |
|------|-------|------|-------------|-------------|
| `korlap` | Hidden (preset) | Fixed (own area) | Shown | Shown (subordinates) |
| `kepala_rayon` | Fixed (own rayon) | Selectable (within rayon) | Shown | Shown (rayon users) |
| `top_management` | Selectable | Selectable | Shown | Shown (all) |
| `admin_system` | Selectable | Selectable | Shown | Shown (all) |
| `superadmin` | Selectable | Selectable | Shown | Shown (all) |

### Staffing Summary Card

Shown when an area is selected. Fetches from `GET /monitoring/staffing-summary?area_id=X`.

Displays per-role breakdown:
- Role name
- `active/total_assigned` count
- Status breakdown: `(N idle, N outside, N missing)`
- `is_fully_staffed` → green check or red warning

### Data Flow

```
Filter change → dispatch(setMonitoringFilters(filters))
             → refetch GET /monitoring/live-users with query params
             → update map markers
```

---

## F. mapUtils.ts Updates

**File:** `fe/mobile/src/utils/mapUtils.ts`

### F1. Replace `calculateUserStatus()`

```typescript
// BEFORE (3-status)
export function calculateUserStatus(user: LiveUser): 'online' | 'offline' | 'outside' {
  // ... hardcoded logic
}

// AFTER (4-status, uses server-provided status directly)
export function getStatusFromUser(user: LiveUser): TrackingStatus {
  return user.status; // Server-computed, no client-side calculation needed
}

export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';
```

### F2. Replace `getStatusColor()`

```typescript
export function getStatusColor(status: TrackingStatus): string {
  const colors: Record<TrackingStatus, string> = {
    active: '#15803D',
    inactive: '#D97706',
    outside_area: '#9333EA',
    missing: '#DC2626',
    offline: '#6B7280',
  };
  return colors[status] ?? '#6B7280';
}
```

### F3. Add `getStatusLabel()`

```typescript
export function getStatusLabel(status: TrackingStatus): string {
  const labels: Record<TrackingStatus, string> = {
    active: 'Aktif',
    inactive: 'Idle',
    outside_area: 'Di Luar Area',
    missing: 'Tidak Terdeteksi',
    offline: 'Offline',
  };
  return labels[status] ?? 'Unknown';
}
```

### F4. Add `getRoleIcon()`

```typescript
export function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    satgas: 'account-circle',
    linmas: 'shield-account',
    korlap: 'star-circle',
  };
  return icons[role] ?? 'account-circle';
}
```

---

## G. Redux Changes

### G1. Update `monitoringSlice.ts`

```typescript
interface MonitoringState {
  // Existing (updated)
  liveUsers: LiveUser[];
  cityStats: CityStats | null;
  rayonStats: Record<string, RayonStats>;
  areaStats: Record<string, AreaStats>;

  // New (Phase 2D)
  filters: MonitoringFilters;
  selectedUser: LiveUser | null;
  userDaySummary: UserDaySummary | null;
  locationHistory: LocationHistory | null;
  staffingSummary: StaffingSummaryItem[];
  statusCounts: {
    active: number;
    inactive: number;
    outside_area: number;
    missing: number;
    offline: number;
  };

  // Loading states
  isLoading: boolean;
  isLoadingDaySummary: boolean;
  isLoadingLocationHistory: boolean;
  isLoadingStaffing: boolean;
  error: string | null;
}

interface MonitoringFilters {
  rayon_id?: string;
  area_id?: string;
  role?: string;
  status?: TrackingStatus[];
  search?: string;
}
```

### G2. New Actions

```typescript
// Filter actions
setMonitoringFilters(state, action: PayloadAction<Partial<MonitoringFilters>>)
resetMonitoringFilters(state)

// Selection actions
setSelectedUser(state, action: PayloadAction<LiveUser | null>)
setUserDaySummary(state, action: PayloadAction<UserDaySummary | null>)
setLocationHistory(state, action: PayloadAction<LocationHistory | null>)
setStaffingSummary(state, action: PayloadAction<StaffingSummaryItem[]>)

// Status counts (from live-users response)
setStatusCounts(state, action: PayloadAction<StatusCounts>)
```

---

## H. API Service Updates

### H1. Update `monitoringApi.ts`

```typescript
// Enhanced existing
getLiveUsers(filters?: MonitoringFilters): Promise<LiveUsersResponse>
getAreaStats(areaId: string): Promise<AreaStats>      // Enhanced with per-role counts

// New (Phase 2D)
getUserDaySummary(userId: string): Promise<UserDaySummary>
getUserLocationHistory(userId: string, date: string, shiftId?: string): Promise<LocationHistory>
getStaffingSummary(filters?: { rayon_id?: string; area_id?: string }): Promise<StaffingSummary>
getMonitoringConfig(): Promise<MonitoringConfig[]>     // admin_system/superadmin only
```

### H2. WebSocket Event Handling

```typescript
// New event listeners in WebSocketService
onUserStatusChanged(callback: (event: UserStatusChangedEvent) => void)
onUserLeftArea(callback: (event: UserAreaEvent) => void)
onUserEnteredArea(callback: (event: UserAreaEvent) => void)

// Enhanced existing
onUserLocation(callback: (event: UserLocationEvent) => void)
// Now includes: status, is_within_area, shift_name fields
```

### H3. Real-Time Update Flow

```
WebSocket 'user:status-changed' event received
  → Update user in liveUsers array (immutable)
  → Recalculate statusCounts
  → If selectedUser.id matches → update selectedUser
  → If status changed to missing → show toast notification

WebSocket 'user:location' event received
  → Update user position in liveUsers array
  → Marker animates to new position (MapView handles this)

WebSocket 'user:left-area' event received
  → Update user.is_within_area = false
  → Update user.status = 'outside_area'
  → Show brief toast: "[Name] keluar dari area [Area]"

WebSocket 'user:entered-area' event received
  → Update user.is_within_area = true
  → Recalculate status based on GPS age
```

---

## I. Type Updates

### I1. `models.types.ts` Additions

```typescript
export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';

export interface LiveUser {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string;
  rayon_id: string | null;
  rayon_name: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  last_update: string;
  is_within_area: boolean;
  shift_id: string;
  shift_name: string;
  shift_definition_id: string | null;
  clock_in_time: string;
  current_task_status: string | null;
  current_task_title: string | null;
}

export interface LiveUsersResponse {
  total_active: number;
  total_inactive: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  /** @deprecated Use total_active */
  total_online: number;
  users: LiveUser[];
  generated_at: string;
}

export interface UserDaySummary {
  user_id: string;
  full_name: string;
  username: string;
  role: string;
  phone: string | null;
  status: TrackingStatus;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  rayon_name: string | null;
  shift: {
    id: string;
    name: string;
    clock_in_time: string;
    clock_out_time: string | null;
    duration_minutes: number;
    outside_boundary: boolean;
  } | null;
  last_location: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    battery_level: number | null;
    logged_at: string;
    is_within_area: boolean;
  } | null;
  activities_today: {
    id: string;
    title: string;
    activity_type: string;
    created_at: string;
    photo_url: string | null;
  }[];
  tasks_today: {
    id: string;
    title: string;
    status: string;
    priority: string;
  }[];
  whatsapp_links: {
    chat: string;
    call: string;
  } | null;
}

export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery_level: number | null;
  logged_at: string;
  is_within_area: boolean;
}

export interface LocationHistory {
  user_id: string;
  user_name: string;
  role: string;
  date: string;
  shift_id: string | null;
  shift_name: string | null;
  area_id: string | null;
  area_name: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  points: LocationHistoryPoint[];
  total_points: number;
  total_distance_meters: number;
  time_inside_area_minutes: number;
  time_outside_area_minutes: number;
  generated_at: string;
}

export interface StaffingSummaryItem {
  id: string;
  name: string;
  type: 'rayon' | 'area';
  roles: {
    role: string;
    active: number;
    idle: number;
    outside_area: number;
    missing: number;
    offline: number;
    total_assigned: number;
    total_required: number;
  }[];
  total_active: number;
  total_idle: number;
  total_outside_area: number;
  total_missing: number;
  total_offline: number;
  is_fully_staffed: boolean;
}

export interface UserStatusChangedEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string | null;
  area_name: string | null;
  rayon_id: string | null;
  previous_status: TrackingStatus;
  new_status: TrackingStatus;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
}

export interface UserAreaEvent {
  user_id: string;
  user_name: string;
  role: string;
  area_id: string;
  area_name: string;
  rayon_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
}
```

---

## J. Navigation

**No navigation changes required.** The Monitoring tab is already configured in `MainNavigator.tsx` TAB_CONFIGS for:
- `korlap`
- `kepala_rayon`
- `top_management`
- `admin_system`
- `superadmin`

The `MapDashboardScreen` is already registered as the Monitoring screen target.

---

## K. File Structure (Phase 2D Mobile Changes)

```
fe/mobile/src/
  screens/monitoring/
    MapDashboardScreen.tsx                    MODIFIED (major)

  components/monitoring/
    UserMarker.tsx                            MODIFIED (major)
    UserDetailSheet.tsx                       NEW
    LocationTrail.tsx                         NEW
    StatusSummaryBar.tsx                      NEW
    UserListStrip.tsx                         NEW
    UserListCard.tsx                          NEW

  components/modals/
    MonitoringFilterModal.tsx                 NEW

  utils/
    mapUtils.ts                              MODIFIED

  store/slices/
    monitoringSlice.ts                       MODIFIED

  services/api/
    monitoringApi.ts                         MODIFIED

  services/
    WebSocketService.ts                      MODIFIED (new event handlers)

  types/
    models.types.ts                          MODIFIED (new interfaces)
```

**Total new files:** 6
**Total modified files:** 6

---

## L. Performance Considerations

| Concern | Mitigation |
|---------|------------|
| 500+ markers on map | Use `react-native-maps` clustering (already in place); cluster at zoom < 13 |
| Polygon rendering | `tracksViewChanges={false}`; pre-compute coordinate arrays |
| WebSocket event flood | Throttle marker position updates to max 1/second per user |
| Location history polyline | Max 960 points/day; `Polyline` renders efficiently |
| Bottom sheet re-renders | Memoize `UserDetailSheet` content; fetch day-summary on open only |
| Name label rendering | Only show at zoom >= 14; use `tracksViewChanges={false}` on markers |

---

## M. Implementation Checklist

### Phase 2D-6: Mobile Monitoring

- [ ] Update `mapUtils.ts` with four-status model
- [ ] Update `LiveUser` and related types in `models.types.ts`
- [ ] Update `monitoringSlice.ts` with new state and actions
- [ ] Update `monitoringApi.ts` with new endpoints
- [ ] Enhance `UserMarker` with role icons, status colors, name labels
- [ ] Add polygon rendering to `MapDashboardScreen`
- [ ] Add `StatusSummaryBar` component
- [ ] Add `UserListStrip` and `UserListCard` components
- [ ] Add FAB control column
- [ ] Implement `UserDetailSheet` bottom sheet
- [ ] Implement `LocationTrail` polyline component
- [ ] Implement `MonitoringFilterModal` with cascading filters
- [ ] Add WebSocket event handlers for new events
- [ ] Write unit tests for new components (>80% coverage)
- [ ] Write unit tests for `mapUtils.ts` updates
- [ ] Manual testing on Android emulator and physical device

---

**Last Updated:** 2026-03-03
