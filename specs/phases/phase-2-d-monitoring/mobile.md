# Phase 2D: Mobile Requirements

**Last Updated:** 2026-03-05
**Status:** ✅ COMPLETE (Implementation + Review)
**Platform:** React Native 0.83.1, TypeScript, Redux Toolkit, react-native-maps
**Related ADR:** [ADR-005](../../architecture/decisions/ADR-005-gps-boundary-tolerance.md), [ADR-011](../../architecture/decisions/ADR-011-phase2d-monitoring-status-model.md)
**See also:** [Backend Requirements](./backend.md), [UI/UX Design](./ui-ux.md), [README](./README.md)
**Tests:** 3,493 passing (142 suites, 0 failures)

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

#### A7. Rayon and Area Boundary Rendering (NEW - Gap #2)

Render BOTH rayon and area boundaries on the map with distinct visual styles.

**Data source:** `GET /monitoring/boundaries` returns all boundaries in one call.

**Rayon polygons:**
- Fill: `#60A5FA` (blue-400) at 8% opacity
- Border: `#2563EB` (blue-600), 3px, dashed style
- Rendered below area polygons

**Area polygons:**
- Fill: `#FBBF24` (amber-400) at 15% opacity
- Border: `#1C1917` (black), 2px, solid style
- Rendered above rayon polygons

**Center markers (rayon):**
- Icon: `office-building` (MaterialCommunityIcons), 32px
- Background: `#2563EB` (blue-600), white text
- Badge: Rayon name below icon
- Tap: open detail modal (NBCard pattern) showing:
  - Rayon name, code
  - Aggregate staffing: per-role breakdown with status counts
  - List of areas with staffing status (understaffed highlighted red)
  - "Filter Rayon Ini" button -> applies filter and focuses map
- Understaffed indicator: aggregate badge "2 area kurang" if any child area understaffed

**Center markers (area):**
- Icon: `map-marker` (MaterialCommunityIcons), 28px
- Background: `#D97706` (amber-600), white text
- Badge: Area name below icon
- Tap: open detail modal (NBCard pattern) showing:
  - Area name, rayon name
  - Per-role staffing: `Korlap 1/1 OK | Satgas 7/10 (2 idle, 1 luar) | Linmas 3/5`
  - Worker list with status dots
  - "Filter Area Ini" button -> applies filter and focuses map
  - "Reassign Petugas" button if understaffed

**Understaffed area visual:**
- Area center markers with understaffed status get a RED pulsing border/glow
- In filter modal, understaffed areas sort to top with warning icon

**Layer order (bottom to top):**
rayon-fill -> rayon-border -> area-fill -> area-border -> area-center-markers -> rayon-center-markers -> user-markers

#### A8. Map Auto-Focus on Filter Selection

When filters are applied via MonitoringFilterModal, the map automatically adjusts its viewport. See also [E6. Map Focus on Filter Selection](#e6-map-focus-on-filter-selection-new---gap-3) for detailed behavior.

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

Display abbreviated role + first name below the marker.

**Format by zoom level:**
- Zoom < 14: No label (too cluttered)
- Zoom 14-15: `STG - Ahmad` (abbreviated role + first name)
- Zoom >= 16: `Satgas - Ahmad Wijaya` (full role + full name)

**Role abbreviation constants:**
| Role | Abbreviation |
|------|-------------|
| `satgas` | STG |
| `linmas` | LMS |
| `korlap` | KLP |

**Label style:**
- Font: 10px, bold
- White text with 1px black outline (readable on any map tile)
- Max width: 80px, truncated with ellipsis

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

| Button | Action | Icon |
|--------|--------|------|
| WhatsApp | Open `https://wa.me/62${phone}` deeplink | WhatsApp icon |
| Call | Open `tel:+62${phone}` deeplink | Phone icon |
| Trail | Navigate to location history view (inline map overlay) | Map-marker-path icon |
| Reassign | Open `ReassignWorkerModal` — only if user has supervisor role and area is understaffed | People-swap icon |

**WhatsApp phone formatting:**
- Strip leading `0` or `+62`, prepend `62`
- Example: `08123456789` → `628123456789`

### Bottom Sheet Behavior
- Initial height: 50% of screen
- Expandable to 85% by dragging
- Dismiss by swiping down or tapping `×`
- Uses `@gorhom/bottom-sheet` (already in project dependencies)

### C2. ReassignWorkerModal (NEW - Gap #5)

Modal for reassigning a worker from one area to another.

**Trigger:** Tap "Reassign" button in UserDetailSheet or area detail modal.

**Layout:**
```
+-------------------------------------+
|  Reassign Petugas                [x] |
|--------------------------------------|
|  Dari: [Current Area Name]           |
|  Peran yang dibutuhkan: Satgas       |
|                                      |
|  Petugas tersedia:                   |
|  (from nearby/overstaffed areas,     |
|   same rayon, filtered by role)      |
|                                      |
|  [o] Ahmad - Satgas - Taman A  Aktif |
|  [ ] Budi  - Satgas - Taman B  Idle  |
|  [ ] Citra - Satgas - Taman C  Aktif |
|                                      |
|  Ke Area: [Target Area Selector]     |
|  Alasan: [Optional text input]       |
|                                      |
|  [         Konfirmasi Reassign     ] |
+-------------------------------------+
```

**Data source:** `POST /monitoring/reassign`

**Accessible from:**
- UserDetailSheet action buttons
- Area detail modal (understaffed warning)
- StaffingSummaryCard in filter modal

**Permission:** superadmin, admin_system, kepala_rayon (own rayon only)

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

### D2. Clickable Trail Points (NEW - Gap #6)

Each GPS point on the map trail is tappable:
- Tap map point -> callout popup with: timestamp, accuracy, battery, is_within_area
- Tap timeline list item -> map flies to that point, highlights it
- Bidirectional sync: map click highlights timeline item, timeline click focuses map

### D3. First/Last Point Markers (NEW - Gap #6)

- First: Green flag icon, labeled "Mulai [HH:MM]"
- Last: Red flag icon, labeled "Akhir [HH:MM]"
- Visually distinct from intermediate points (larger, different shape: 14px vs 6px)

### D4. Hide Other Users During Trail View (NEW - Gap #6)

- When trail is active, all other UserMarkers are dimmed to 20% opacity
- Only selected user's current position + trail visible
- Toggle: "Tampilkan hanya petugas ini" checkbox in trail header

### D5. Date Picker (NEW - Gap #6)

- Calendar icon in trail header bar
- Opens date picker modal to select any date for that user's trail
- Defaults to today
- Max date: today

### D6. Shift Filter (NEW - Gap #6)

- Dropdown in trail header showing available shifts on selected date
- Pre-populated from user's shifts for that date
- Selecting a shift filters trail points to that shift only

### D7. Trail Info Bar (NEW - Gap #6)

Top bar above trail map showing:
```
[User Name] | [Date] | [Distance]km | Di area: [Time] | Di luar: [Time]
```

---

## E. MonitoringFilterModal (New)

**File:** `fe/mobile/src/components/modals/MonitoringFilterModal.tsx`

Full-screen modal for filtering the monitoring map.

### Layout (Bottom Sheet Modal - matching ActivityFilterModal pattern)

Use bottom-sheet Modal pattern (same as ActivityFilterModal):
- `animationType="slide"`, `transparent={true}`, max 85% height
- Header: "Filter Monitoring" + close button + Reset link
- Footer: Reset + Terapkan buttons (same actionButtons style)

**Filter sections (using NB components):**

1. **Status** -- `NBSelect` with multi-select mode (built-in checkboxes):
   Options: [Aktif, Idle, Di Luar Area, Tidak Terdeteksi]

2. **Rayon** -- `NBSelect` searchable, role-gated:
   - Each option shows inline staffing: `Rayon Selatan  KLP 1/1 | STG 8/10 | LMS 3/5`
   - Custom `renderOption` for staffing counts inline
   - Understaffed rayons get warning icon

3. **Area** -- `NBSelect` searchable, cascading from rayon:
   - Each option shows inline staffing: `Taman Bungkul  KLP 1/1 | STG 7/10 ! | LMS 3/5`
   - Understaffed areas highlighted with red border

4. **Peran** -- `NBSelect` multi-select: [Satgas, Linmas, Korlap]

5. **Cari Pengguna** -- `NBTextInput` with search icon

**Staffing summary (always visible, not just when area selected):**
- When NO area selected but rayon selected: show rayon-level staffing
- When NO rayon selected (city view): show top-level summary with per-rayon expandable rows
- When area selected: show area-level staffing (existing, enhanced)

**Staffing display format:**
```
Kepegawaian Shift Saat Ini (Hari Kerja)
Taman Bungkul
  Korlap:  1 aktif dari 1  (1/1) OK
  Satgas:  5 aktif dari 10 (5/10) ! Kurang 5
           2 idle, 1 di luar area, 2 tidak terdeteksi
  Linmas:  2 aktif dari 5  (2/5) ! Kurang 3
           1 idle, 1 tidak terdeteksi, 1 offline
  [Reassign Petugas]
```

**Existing NB components to reuse:**
- `NBSelect.tsx` -- multi-select with checkbox (supports `selectedValues` + `onValuesChange`)
- `NBCard.tsx` -- for detail modals
- `ActivityFilterModal.tsx` -- reference pattern for modal structure
- `NBTextInput.tsx` -- for search input

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
- Day type badge: "Hari Kerja" / "Akhir Pekan" / "Hari Libur" (from `current_day_type_label`)
- Current requirement: "Kebutuhan hari ini: 10 Satgas, 5 Linmas"
- Expandable row showing requirements_by_day_type for comparison
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

#### E1. Use NB Components (Standardized Pattern)

Use bottom-sheet `Modal` pattern matching `ActivityFilterModal`:
- `animationType="slide"`, `transparent={true}`, max 85% height
- Header: "Filter Monitoring" + close button + Reset link
- Footer: Reset + Terapkan buttons (same `actionButtons` style)

**Filter sections (using NB components):**

1. **Status** — `NBSelect` with `multi-select` mode (built-in checkboxes):
   - Options: Aktif, Idle, Di Luar Area, Tidak Terdeteksi

2. **Rayon** — `NBSelect` searchable, role-gated (same as current but with inline staffing):
   - Each option shows: `Rayon Selatan  KLP 1/1 • STG 8/10 • LMS 3/5`
   - Custom `renderOption` to show staffing counts inline
   - Understaffed rayons get warning icon

3. **Area** — `NBSelect` searchable, cascading from rayon:
   - Each option shows: `Taman Bungkul  KLP 1/1 • STG 7/10 ⚠️ • LMS 3/5`
   - Understaffed areas highlighted with red border

4. **Peran** — `NBSelect` multi-select: [Satgas, Linmas, Korlap]

5. **Cari Pengguna** — `NBTextInput` with search icon

**Existing components to reuse:**
- `fe/mobile/src/components/nb/NBSelect.tsx` — multi-select with checkbox
- `fe/mobile/src/components/nb/NBCard.tsx` — for detail modals
- `fe/mobile/src/components/modals/ActivityFilterModal.tsx` — reference pattern
- `fe/mobile/src/components/nb/NBTextInput.tsx` — search input

#### E2. Staffing Summary (Always Visible)

Staffing summary should be visible at ALL filter levels, not just when area is selected:
- When NO area selected but rayon selected → show rayon-level staffing
- When NO rayon selected (city view) → show top-level summary with per-rayon expandable rows
- When area selected → show area-level staffing (current behavior, but enhanced)

**Format per stakeholder requirement:**
```
Kepegawaian Shift Saat Ini (Hari Kerja)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Taman Bungkul                           ⚠️
  Korlap:  1 aktif dari 1  (1/1) ✅
  Satgas:  5 aktif dari 10 (5/10) ⚠️ Kurang 5
           ├ 2 idle, 1 di luar area, 2 tidak terdeteksi
  Linmas:  2 aktif dari 5  (2/5) ⚠️ Kurang 3
           ├ 1 idle, 1 tidak terdeteksi, 1 offline
  [Reassign Petugas]
```

Show day type badge: "Hari Kerja" / "Akhir Pekan" / "Hari Libur"
Show current requirement prominently: "Kebutuhan hari ini: 10 Satgas, 5 Linmas"

#### E3. Reassign Button

When an area is understaffed, show "Reassign Petugas" button in:
- StaffingSummaryCard in filter modal
- UserDetailSheet action buttons

Tapping opens `ReassignWorkerModal` (new component) showing:
- Source area (understaffed one, pre-filled)
- Role needed (from unmet requirement)
- Available workers from nearby/overstaffed areas (same rayon), filtered by role
- Each worker shows current status, area, distance
- Confirm button → `POST /monitoring/reassign`

### E6. Map Focus on Filter Selection (NEW - Gap #3)

When filters are applied via the MonitoringFilterModal, the map automatically adjusts its viewport:

| Filter Action | Map Behavior |
|--------------|-------------|
| Select rayon | `mapRef.current.fitToCoordinates()` to rayon boundary bbox with padding |
| Select area | `mapRef.current.animateToRegion()` to area center, zoom 15-16 |
| Select specific user | `mapRef.current.animateToRegion()` to user's last known location, zoom 16 |
| Filter by status only | No map movement (markers filter in place) |
| Reset all filters | `mapRef.current.animateToRegion()` to Surabaya city center, zoom 12 |

**Implementation:**
- On filter apply (`Terapkan` button press), check which filter changed most recently
- Priority: user > area > rayon > status-only
- Animation duration: 1000ms
- Padding: 50px on all sides for fitToCoordinates

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
    ReassignWorkerModal.tsx                   NEW

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

**Total new files:** 7
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

### Phase 2D-5: Mobile Monitoring — ✅ COMPLETE

- [x] Update `mapUtils.ts` with four-status model
- [x] Update `LiveUser` and related types in `models.types.ts`
- [x] Update `monitoringSlice.ts` with new state and actions
- [x] Update `monitoringApi.ts` with new endpoints
- [x] Enhance `UserMarker` with role icons, status colors, name labels
- [x] Add polygon rendering to `MapDashboardScreen`
- [x] Add `StatusSummaryBar` component
- [x] Add `UserListStrip` and `UserListCard` components
- [x] Add FAB control column
- [x] Implement `UserDetailSheet` bottom sheet
- [x] Implement `LocationTrail` polyline component
- [x] Implement `MonitoringFilterModal` with cascading filters
- [x] Add WebSocket event handlers for new events
- [x] Write unit tests for new components (>80% coverage)
- [x] Write unit tests for `mapUtils.ts` updates
- [ ] Manual testing on Android emulator and physical device

### Phase 2D-8: Mobile Review & Refactoring — ✅ COMPLETE

- [x] Register `monitoringReducer` in Redux store (CRITICAL)
- [x] Fix `as any` type casts → `TrackingStatus`/`UserRole`
- [x] Fix string dispatch → action creator
- [x] Update barrel exports (6 new + 1 deprecated)
- [x] Register `AttendanceScreen` in navigation
- [x] Fix `UserListCard` relative time to Indonesian format
- [x] Add 212 new tests across 8 test files
- [x] Extract monitoring role constants to shared `roles.ts`
- [x] Consolidate duplicate `LiveUsersResponse` type

### Phase 2D-10: Gap Fixes (Mobile) — NOT STARTED
- [ ] Update marker labels to "Role - Name" format with zoom-level behavior
- [ ] Add rayon + area polygon rendering with center markers
- [ ] Add map auto-focus on filter selection
- [ ] Enhance LocationTrail with clickable points, first/last markers, hide others, date picker, shift filter
- [ ] Refactor MonitoringFilterModal to use NB components (NBSelect, bottom-sheet pattern)
- [ ] Make staffing summary always visible in filter modal
- [ ] Add ReassignWorkerModal component
- [ ] Add day-type badge to staffing display

---

**Last Updated:** 2026-03-05
