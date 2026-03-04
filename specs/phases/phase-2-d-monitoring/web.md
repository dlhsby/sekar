# Phase 2D: Web Requirements

**Last Updated:** 2026-03-03
**Status:** Planning
**Platform:** Next.js 16.x, React 19, TailwindCSS 4.x, Mapbox GL JS
**Related ADR:** ADR-011 (new)
**See also:** [Backend Requirements](./backend.md), [UI/UX Design](./ui-ux.md), [README](./README.md)

---

## Current Codebase Facts (Verified)

| File/Component | Key Facts |
|----------------|-----------|
| `monitoring/page.tsx` | Single page with role-based auto-scoping; stats cards; live user list; placeholder map area |
| `components/maps/MapboxMap.tsx` | Exists but minimal; Mapbox GL token in env |
| `components/maps/PolygonEditor.tsx` | Exists for area boundary editing |
| `lib/api/monitoring.ts` | TanStack Query hooks: `useCityStats`, `useRayonStats`, `useAreaStats`, `useLiveUsers` |
| `lib/types.ts` | `LiveUser`, `LiveUsersResponse`, `CityStats`, `RayonMonitoringStats`, `AreaMonitoringStats` interfaces |
| Mapbox token | `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local` |
| Page route | `/monitoring` (App Router: `app/(dashboard)/monitoring/page.tsx`) |

---

## Overview of Changes

| Component | Change Type | Description |
|-----------|-------------|-------------|
| `/monitoring` page | Major rewrite | Split layout with full Mapbox map + side panel |
| `MonitoringMap` | New component | Mapbox GL markers, polygons, clustering, popups |
| `MonitoringSidePanel` | New component | Filters, status cards, user list |
| `UserDetailPanel` | New component | Push navigation in side panel |
| `LocationTimeline` | New component | Vertical timeline with GPS points |
| `lib/api/monitoring.ts` | Enhancement | New hooks for day summary, location history, staffing, config |
| `lib/types.ts` | Enhancement | New interfaces matching backend DTOs |
| `/areas/[id]` page | Enhancement | Boundary management with polygon editor integration |

---

## A. Monitoring Page Layout

**File:** `fe/web/src/app/(dashboard)/monitoring/page.tsx`

### Split Layout (Desktop)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Monitoring Real-Time"           [⟳ Refresh]   │
├──────────────────────────────────┬───────────────────────┤
│                                  │                       │
│                                  │  Filter Section       │
│                                  │  [Rayon ▼] [Area ▼]  │
│                                  │  [Role chips] [Status]│
│                                  │  [Search user...]     │
│                                  │                       │
│        Mapbox Map                │  Status Cards (2×2)   │
│        (65% width)               │  ┌─────┐ ┌─────┐    │
│                                  │  │ Act │ │ Idle│    │
│                                  │  │ 12  │ │  5  │    │
│   [markers, polygons,            │  └─────┘ └─────┘    │
│    clusters, popups]             │  ┌─────┐ ┌─────┐    │
│                                  │  │ Out │ │ Miss│    │
│                                  │  │  2  │ │  1  │    │
│                                  │  └─────┘ └─────┘    │
│                                  │                       │
│                                  │  User List            │
│                                  │  ┌─────────────────┐ │
│                                  │  │ [●] Ahmad S.    │ │
│                                  │  │     Satgas • KB  │ │
│                                  │  │     2 min ago    │ │
│                                  │  ├─────────────────┤ │
│                                  │  │ [●] Budi R.     │ │
│                                  │  │     Linmas • TA  │ │
│                                  │  │     12 min ago   │ │
│                                  │  └─────────────────┘ │
│                                  │  (35% width)          │
└──────────────────────────────────┴───────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Layout | Map | Side Panel |
|------------|--------|-----|------------|
| `xl` (≥1280px) | Side-by-side | 65% | 35% |
| `lg` (≥1024px) | Side-by-side | 60% | 40% |
| `md` (≥768px) | Stacked | 100%, 50vh | Bottom drawer |
| `sm` (<768px) | Stacked | 100%, 40vh | Bottom sheet |

**Bottom drawer (md):** Draggable panel below map, resizable from 30% to 70% height.
**Bottom sheet (sm):** Same as mobile — swipe-up sheet with handle.

---

## B. MonitoringMap Component

**File:** `fe/web/src/components/monitoring/MonitoringMap.tsx`

### Features

1. **Mapbox GL JS Integration**
   - Center: Surabaya (-7.2575, 112.7521), zoom: 12
   - Map style: `mapbox://styles/mapbox/streets-v12`
   - Controls: zoom, compass, fullscreen, scale bar

2. **Area Polygons**
   - Render from `areas[].boundary_polygon` GeoJSON
   - Fill: translucent area color, stroke: 2px solid
   - Hover: highlight with darker fill
   - Click: show area name tooltip
   - Understaffed areas: dashed red border + warning icon

3. **User Markers**
   - Custom marker icons using Mapbox `Marker` or `Symbol` layer
   - Color: status-based (green/amber/purple/red)
   - Shape: role-based (circle/shield/star)
   - Label: user name visible at zoom >= 14
   - Click: select user → show in side panel detail view

4. **Marker Clustering**
   - Cluster at zoom < 13 using Mapbox `supercluster`
   - Cluster circle shows count
   - Cluster color: weighted by most severe status
     - Any missing → red cluster
     - Any outside_area → purple cluster
     - Any inactive → amber cluster
     - All active → green cluster
   - Click cluster: zoom in to expand

5. **Popups**
   - Hover on marker: small tooltip with name + status
   - Click on marker: select user, fly-to, open detail in panel

### Props

```typescript
interface MonitoringMapProps {
  users: LiveUser[];
  areas: Area[];
  selectedUser: LiveUser | null;
  onUserSelect: (user: LiveUser | null) => void;
  onMapReady: () => void;
  filters: MonitoringFilters;
}
```

---

## C. MonitoringSidePanel Component

**File:** `fe/web/src/components/monitoring/MonitoringSidePanel.tsx`

### Sub-Sections

#### C1. Filter Section

```typescript
interface MonitoringFilters {
  rayon_id?: string;
  area_id?: string;
  role?: string[];
  status?: TrackingStatus[];
  search?: string;
}
```

- **Rayon select:** `NBSelect` searchable, role-gated (same rules as mobile)
- **Area select:** `NBSelect`, cascades from rayon selection
- **Role chips:** Multi-select: Satgas, Linmas, Korlap
- **Status chips:** Multi-select: Active, Idle, Outside, Missing
- **Search:** Text input, debounced 300ms, searches by name
- **Reset button:** Clears all filters

#### C2. Status Cards (2×2 Grid)

Four cards in a 2-column grid:

| Card | Color | Shows |
|------|-------|-------|
| Active | Green bg | Count + icon |
| Idle | Amber bg | Count + icon |
| Outside Area | Purple bg | Count + icon |
| Missing | Red bg | Count + icon |

- Clickable: acts as status filter toggle
- Active state: elevated shadow, bold border
- Shows count from `LiveUsersResponse` totals

#### C3. User List

Scrollable list of users matching current filters:
- Each row: status dot, name, role badge, area, last update relative time
- Click: select user → push `UserDetailPanel`
- Sort: missing first, then outside, idle, active
- Virtual scroll for performance with 200+ users
- Battery icon: shown when < 20%, yellow/red color

---

## D. UserDetailPanel Component

**File:** `fe/web/src/components/monitoring/UserDetailPanel.tsx`

Push navigation within the side panel (replaces user list with detail view).

### Layout

```
┌─────────────────────────┐
│ ← Back    User Detail   │
├─────────────────────────┤
│                         │
│  [●] Ahmad Santoso      │
│  Satgas • Kebun Bibit   │
│  Rayon 1                │
│                         │
│  ── Shift Info ──       │
│  Shift: Pagi (07:00)    │
│  Clock In: 07:12 WIB    │
│  Duration: 4h 23m       │
│  Boundary: ✅ Inside     │
│                         │
│  ── Last Location ──    │
│  📍 -7.283, 112.753     │
│  ±12m • 🔋 78%          │
│  2 minutes ago          │
│                         │
│  ── Activities (3) ──   │
│  • Penyiraman    08:30  │
│  • Pembersihan   10:15  │
│  • Perawatan     13:00  │
│                         │
│  ── Tasks (1) ──        │
│  • Potong Rumput  [🔵]  │
│                         │
│  [📱 WhatsApp] [📞 Call] │
│  [📍 Location History]  │
│                         │
└─────────────────────────┘
```

### Data Source

Fetches from `GET /monitoring/users/:userId/day-summary`.

### Actions

| Button | Action |
|--------|--------|
| WhatsApp | `window.open('https://wa.me/62...')` in new tab |
| Call | `window.open('tel:+62...')` |
| Location History | Push `LocationTimeline` view in panel |

---

## E. LocationTimeline Component

**File:** `fe/web/src/components/monitoring/LocationTimeline.tsx`

Vertical timeline showing GPS points for a user on a specific date.

### Layout (in side panel)

```
┌─────────────────────────┐
│ ← Back  Location History│
│ Ahmad S. • 2026-03-03   │
├─────────────────────────┤
│                         │
│  Summary                │
│  Distance: 2.3 km       │
│  Inside: 4h 12m         │
│  Outside: 23m            │
│  Points: 245             │
│                         │
│  Timeline               │
│  🟢 07:12 - Clock In    │
│  │  -7.283, 112.753     │
│  │  ±8m • 🔋 95%        │
│  │                      │
│  ● 07:13                │
│  │  -7.283, 112.753     │
│  │                      │
│  ● 07:14                │
│  │  -7.284, 112.754     │
│  │                      │
│  🟣 08:45 - Left Area   │
│  │  -7.290, 112.760     │
│  │                      │
│  🟢 08:52 - Entered Area│
│  │  -7.284, 112.753     │
│  │                      │
│  ...                    │
│                         │
│  🔴 15:00 - Last Point  │
│     -7.283, 112.753     │
│                         │
└─────────────────────────┘
```

### Map Sync

When a timeline point is clicked:
1. Map flies to that GPS coordinate
2. Temporary marker appears on map
3. Trail polyline rendered on map (same as mobile trail visualization)

### Data Source

Fetches from `GET /monitoring/users/:userId/location-history?date=YYYY-MM-DD`.

### Date Picker

Simple date input (default: today). Restricted to past dates only.

---

## F. API Hooks (TanStack Query)

**File:** `fe/web/src/lib/api/monitoring.ts`

### Enhanced Existing Hooks

```typescript
// Updated response types for four-status model
export function useLiveUsers(filters?: MonitoringFilters) {
  return useQuery({
    queryKey: ['monitoring', 'live-users', filters],
    queryFn: () => api.get<LiveUsersResponse>('/monitoring/live-users', { params: filters }),
    refetchInterval: 30_000, // 30s polling (WebSocket handles real-time)
  });
}
```

### New Hooks

```typescript
export function useUserDaySummary(userId: string | null) {
  return useQuery({
    queryKey: ['monitoring', 'day-summary', userId],
    queryFn: () => api.get<UserDaySummary>(`/monitoring/users/${userId}/day-summary`),
    enabled: !!userId,
  });
}

export function useLocationHistory(userId: string | null, date: string) {
  return useQuery({
    queryKey: ['monitoring', 'location-history', userId, date],
    queryFn: () => api.get<LocationHistory>(
      `/monitoring/users/${userId}/location-history`,
      { params: { date } }
    ),
    enabled: !!userId,
  });
}

export function useStaffingSummary(filters?: { rayon_id?: string; area_id?: string }) {
  return useQuery({
    queryKey: ['monitoring', 'staffing-summary', filters],
    queryFn: () => api.get<StaffingSummaryResponse>('/monitoring/staffing-summary', { params: filters }),
  });
}

export function useMonitoringConfig() {
  return useQuery({
    queryKey: ['monitoring', 'config'],
    queryFn: () => api.get<MonitoringConfigResponse>('/monitoring/config'),
  });
}

export function useUpdateMonitoringConfig() {
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, any> }) =>
      api.patch(`/monitoring/config/${key}`, { value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitoring', 'config'] }),
  });
}
```

---

## G. Type Updates

**File:** `fe/web/src/lib/types.ts`

### New/Updated Interfaces

```typescript
export type TrackingStatus = 'active' | 'inactive' | 'outside_area' | 'missing' | 'offline';

// UPDATED: LiveUser with four-status model
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

// UPDATED: LiveUsersResponse with four-status counts
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

// NEW: User day summary for detail panel
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

// NEW: Location history
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

// NEW: Staffing summary
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

export interface StaffingSummaryResponse {
  items: StaffingSummaryItem[];
  generated_at: string;
}

// NEW: Monitoring config
export interface MonitoringConfigItem {
  key: string;
  value: Record<string, any>;
  description: string;
  updated_at: string;
}

export interface MonitoringConfigResponse {
  configs: MonitoringConfigItem[];
}

// NEW: WebSocket events
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

// NEW: Monitoring filters
export interface MonitoringFilters {
  rayon_id?: string;
  area_id?: string;
  role?: string;
  status?: TrackingStatus;
  search?: string;
}
```

---

## H. Area Boundary Management

### H1. `/areas/[id]` Page Enhancement

Add a "Boundary" tab or section to the existing area detail page:

- **View mode:** Display polygon on embedded Mapbox map
- **Edit mode:** Use existing `PolygonEditor` component for boundary drawing
- **KMZ import:** Button to upload KMZ file (existing feature)
- **Save:** `PUT /areas/:id/boundary` with GeoJSON polygon

### H2. Boundary API Hooks

```typescript
export function useAreaBoundary(areaId: string) {
  return useQuery({
    queryKey: ['areas', areaId, 'boundary'],
    queryFn: () => api.get<AreaBoundaryResponse>(`/areas/${areaId}/boundary`),
    enabled: !!areaId,
  });
}

export function useUpdateAreaBoundary() {
  return useMutation({
    mutationFn: ({ areaId, data }: { areaId: string; data: UpdateAreaBoundaryDto }) =>
      api.put(`/areas/${areaId}/boundary`, data),
    onSuccess: (_, { areaId }) => {
      queryClient.invalidateQueries({ queryKey: ['areas', areaId] });
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });
    },
  });
}
```

---

## I. WebSocket Integration

### Real-Time Updates

The monitoring page subscribes to WebSocket events for live updates:

```typescript
// In MonitoringPage component
useEffect(() => {
  const ws = getWebSocket();

  ws.on('user:location', (event: UserLocationEvent) => {
    // Update user position in React Query cache
    queryClient.setQueryData<LiveUsersResponse>(
      ['monitoring', 'live-users', filters],
      (old) => updateUserInResponse(old, event)
    );
  });

  ws.on('user:status-changed', (event: UserStatusChangedEvent) => {
    // Update user status in cache
    queryClient.setQueryData<LiveUsersResponse>(
      ['monitoring', 'live-users', filters],
      (old) => updateUserStatusInResponse(old, event)
    );
    // Show toast for missing status
    if (event.new_status === 'missing') {
      toast.warning(`${event.user_name} tidak terdeteksi`);
    }
  });

  ws.on('user:left-area', (event: UserAreaEvent) => {
    toast.info(`${event.user_name} keluar dari ${event.area_name}`);
  });

  ws.on('user:entered-area', (event: UserAreaEvent) => {
    // Silent update — no toast needed
  });

  return () => ws.removeAllListeners();
}, [filters]);
```

---

## J. Monitoring Config Page (Admin)

**File:** `fe/web/src/app/(dashboard)/monitoring/config/page.tsx`

**Access:** `admin_system`, `superadmin` only

Simple form page for editing monitoring thresholds:

| Setting | Control | Range |
|---------|---------|-------|
| Active max age | Number input | 60-600 seconds |
| Inactive threshold | Number input | 300-3600 seconds |
| Missing threshold | Number input | 1800-7200 seconds |
| Location ping interval | Number input | 30-300 seconds |
| Geofencing tolerance | Number input | 0-500 meters |
| Outside area grace period | Number input | 0-600 seconds |
| Low battery threshold | Number input | 5-50 percent |
| Understaffed notification | Toggle | on/off |
| Missing user notification | Toggle | on/off |

Save button calls `PATCH /monitoring/config/:key` for each changed config group.

---

## K. Route Protection Update

```typescript
const ROUTE_ACCESS: Record<string, string[]> = {
  // ... existing routes ...
  '/monitoring': ['korlap', 'kepala_rayon', 'top_management', 'admin_system', 'superadmin'],
  '/monitoring/config': ['admin_system', 'superadmin'],  // NEW
};
```

---

## L. File Structure (Phase 2D Web Changes)

```
fe/web/src/
  app/(dashboard)/monitoring/
    page.tsx                                 MODIFIED (major rewrite)
    config/
      page.tsx                               NEW (admin config)

  components/monitoring/
    MonitoringMap.tsx                         NEW
    MonitoringSidePanel.tsx                   NEW
    UserDetailPanel.tsx                       NEW
    LocationTimeline.tsx                      NEW
    StatusCard.tsx                            NEW
    UserListItem.tsx                          NEW

  lib/api/
    monitoring.ts                            MODIFIED (new hooks)

  lib/
    types.ts                                 MODIFIED (new interfaces)
```

**Total new files:** 7
**Total modified files:** 3

---

## M. Page Count Summary

| Category | Count | Details |
|----------|-------|---------|
| Modified pages | 2 | `/monitoring` (major rewrite), `/areas/[id]` (boundary tab) |
| New pages | 1 | `/monitoring/config` |
| Unchanged pages | 17 | All other existing pages |
| **Total pages** | **21** | Up from 20 in Phase 2C |

---

## N. Implementation Checklist

### Phase 2D-5: Web Monitoring

- [ ] Create `MonitoringMap` component with Mapbox GL
- [ ] Implement marker rendering with clustering
- [ ] Implement area polygon rendering
- [ ] Create `MonitoringSidePanel` with filters and user list
- [ ] Create status cards (2x2 grid)
- [ ] Rewrite `/monitoring` page with split layout
- [ ] Implement responsive breakpoints (xl/lg → side-by-side, md/sm → stacked)
- [ ] Create `UserDetailPanel` with day summary
- [ ] Create `LocationTimeline` with map sync
- [ ] Add WebSocket integration for real-time updates
- [ ] Create `/monitoring/config` page for admin settings
- [ ] Enhance `/areas/[id]` with boundary management tab
- [ ] Add new TanStack Query hooks
- [ ] Update type definitions in `lib/types.ts`
- [ ] Write Playwright E2E tests for monitoring page
- [ ] Test responsive behavior on all breakpoints

---

**Last Updated:** 2026-03-03
