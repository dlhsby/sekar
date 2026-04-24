# Web Dashboard - Pages Specification

Comprehensive specification for all web dashboard pages in Phase 6.

---

## 📋 Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [Real-Time Worker Map](#2-real-time-worker-map)
3. [Worker Management](#3-worker-management)
4. [Report Review](#4-report-review)
5. [Attendance & Time Tracking](#5-attendance--time-tracking)
6. [Analytics Dashboard](#6-analytics-dashboard)
7. [Area Management](#7-area-management)
8. [User Management](#8-user-management)
9. [Settings](#9-settings)
10. [Authentication Pages](#10-authentication-pages)

---

## 1. Dashboard Overview

**Route:** `/dashboard` (root)
**Access:** Supervisor, Admin
**Description:** Main landing page showing high-level KPIs and quick actions.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header (User Menu, Notifications, Breadcrumbs)         │
├──────────┬──────────────────────────────────────────────┤
│          │  Dashboard Overview                          │
│ Sidebar  │                                              │
│          │  [4 Stats Cards]                             │
│ - Home   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ - Map    │  │Active│ │Areas │ │Reports│ │ Avg  │       │
│ - Reports│  │Workers│ │Covered│ │Today │ │Hours │       │
│ - Workers│  └──────┘ └──────┘ └──────┘ └──────┘       │
│ - Areas  │                                              │
│ - Attend.│  [Activity Charts]                           │
│ - Analytics│  ┌─────────────────┐ ┌─────────────────┐  │
│ - Settings│  │ Attendance Trend│ │ Reports by Area │  │
│          │  │  (Line Chart)   │ │  (Bar Chart)    │  │
│          │  └─────────────────┘ └─────────────────┘  │
│          │                                              │
│          │  [Recent Activity Feed]                      │
│          │  ┌──────────────────────────────────────┐  │
│          │  │ • Worker1 clocked in at Taman Bungkul│  │
│          │  │ • Report submitted by Worker2        │  │
│          │  │ • Worker3 clocked out (9h worked)    │  │
│          │  └──────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Stats Cards
- **Active Workers Today**
  - Count of currently clocked-in workers
  - Percentage change from yesterday
  - Click to view on map

- **Areas Covered**
  - Number of areas with active workers
  - Total areas in system
  - Visual progress indicator

- **Reports Submitted Today**
  - Total count with percentage by type
  - Click to view reports list

- **Average Hours Worked**
  - Across all workers today
  - Comparison with weekly average

#### Charts
- **Attendance Trend (7 days)**
  - Line chart showing daily attendance
  - Toggle between workers/percentage
  - Interactive tooltips

- **Reports by Area Type**
  - Horizontal bar chart
  - Color-coded by area type
  - Click to filter reports

- **Work Hours Distribution**
  - Histogram of work hours
  - Identify overtime/undertime

#### Recent Activity Feed
- Real-time activity updates (polling every 30s)
- Clock-in/out events
- Report submissions
- Area assignments
- System alerts
- "View All" link to dedicated activity page

#### Quick Actions
- Clock In/Out (mobile-only workers)
- Submit Report
- Assign Worker
- Create Area
- Export Today's Data

### Data Requirements

**API Endpoints:**
```typescript
GET /api/supervisor/dashboard/summary
  Response: {
    active_workers: number,
    total_workers: number,
    areas_covered: number,
    total_areas: number,
    reports_today: number,
    avg_hours_worked: number,
    trends: {
      attendance_7d: Array<{date: string, count: number}>,
      reports_by_area_type: Array<{type: string, count: number}>,
      hours_distribution: Array<{range: string, count: number}>
    }
  }

GET /api/supervisor/recent-activity?limit=10
  Response: {
    activities: Array<{
      id: string,
      type: 'clock_in' | 'clock_out' | 'report' | 'assignment',
      worker_name: string,
      area_name: string,
      timestamp: string,
      details: object
    }>
  }
```

**Caching Strategy:**
- Stats cards: Refetch every 60 seconds
- Charts: Cache for 5 minutes
- Activity feed: Polling every 30 seconds
- Manual refresh button

### User Interactions
- Click stats card → Navigate to detailed page
- Click chart element → Filter data by selection
- Click activity → View details modal
- Refresh button → Force data reload
- Date range picker → Adjust chart timeframe

---

## 2. Real-Time Worker Map

**Route:** `/dashboard/map`
**Access:** Supervisor, Admin
**Description:** Interactive map showing real-time worker locations.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Live Worker Map                              │
│ Sidebar  │                                              │
│          │ [Filters Panel]                              │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ Search: [__________]  [🔍]            │  │
│          │ │ Area Type: [All ▼]  Status: [All ▼]  │  │
│          │ │ □ Cluster Markers  ☐ Show Routes     │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Google Map - Full Height]                  │
│          │ ┌────────────────────────────────────────┐  │
│          │ │                                        │  │
│          │ │   🟢 Worker1 (Taman Bungkul)           │  │
│          │ │                                        │  │
│          │ │      🟢 Worker2 (Jl. Darmo)            │  │
│          │ │                                        │  │
│          │ │            🔴 Worker3 (Offline)        │  │
│          │ │                                        │  │
│          │ │  [+] [-] [🎯 Center] [🔄 Refresh]      │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Worker List Sidebar - Collapsible]         │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ Active Workers (5)                    │  │
│          │ │ • Worker1 - Taman Bungkul  [View]    │  │
│          │ │ • Worker2 - Jl. Darmo      [View]    │  │
│          │ └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Map Controls
- **Search Bar**
  - Search workers by name
  - Search areas by name
  - Autocomplete suggestions

- **Filters**
  - Area type (Park, Pedestrian, Mini Garden, Street)
  - Status (Active, Idle, Offline)
  - Date/time range for historical view
  - Toggle route visualization

- **Map Options**
  - Zoom controls
  - Recenter to user location
  - Recenter to fit all markers
  - Toggle marker clustering
  - Toggle area boundaries
  - Map style (Standard, Satellite, Terrain)

#### Worker Markers
- **Marker Colors**
  - 🟢 Green: Active (moved in last 15 min)
  - 🟡 Yellow: Idle (no movement 15-30 min)
  - 🔴 Red: Offline (no data >30 min)
  - ⚫ Gray: Clocked out

- **Marker Info Popup**
  ```
  ┌─────────────────────────┐
  │ 👤 Ahmad Rizki          │
  │ 📍 Taman Bungkul (Park) │
  │ 🕐 Clocked in: 08:00    │
  │ ⏱️  Hours worked: 5.5h   │
  │ 📊 Reports today: 3     │
  │ 📍 Last update: 2 min   │
  │ [View Details] [Track]  │
  └─────────────────────────┘
  ```

#### Area Boundaries
- Show area geofence circles
- Color-coded by area type
- Click to view area details
- Show assigned workers count
- Highlight on hover

#### Real-Time Updates
- Auto-refresh every 60 seconds (configurable)
- Manual refresh button
- Live update indicator (pulsing dot)
- Connection status indicator
- Last updated timestamp

#### Worker List Sidebar
- Collapsible panel on right side
- List of all workers
- Filter by map visibility
- Sort by name, area, status, hours
- Click to center map on worker
- Quick actions (Call, Message - Phase 7)

### Data Requirements

**API Endpoints:**
```typescript
GET /api/supervisor/active-workers
  Response: {
    workers: Array<{
      id: string,
      name: string,
      area: {id: string, name: string, type: string},
      location: {lat: number, lng: number, timestamp: string},
      shift: {
        clock_in_time: string,
        hours_worked: number
      },
      status: 'active' | 'idle' | 'offline'
    }>
  }

GET /api/areas?include_boundaries=true
  Response: {
    areas: Array<{
      id: string,
      name: string,
      area_type: string,
      center: {lat: number, lng: number},
      radius_meters: number,
      assigned_workers_count: number
    }>
  }

GET /api/location/worker/:workerId?from_date=&to_date=
  // Historical location data for route visualization
```

**Update Strategy:**
- Polling every 60 seconds (default)
- Can configure 30s, 60s, 120s, 300s
- WebSocket/SSE for real-time (Phase 3+)
- Optimistic UI updates
- Background sync when tab inactive

### User Interactions
- Click marker → Show info popup
- Click "View Details" → Navigate to worker detail page
- Click "Track" → Enable route tracking mode
- Click area boundary → Show area details modal
- Search worker → Center map and highlight
- Filter area type → Show/hide relevant markers
- Toggle clustering → Recalculate markers
- Drag map → Update visible workers list

### Performance Considerations
- Marker clustering for >50 workers
- Lazy load area boundaries
- Viewport-based filtering
- Debounced search (300ms)
- Memoized marker components
- Virtual scrolling for worker list

---

## 3. Worker Management

### 3.1 Workers List Page

**Route:** `/dashboard/workers`
**Access:** Supervisor, Admin
**Description:** Comprehensive list of all workers with CRUD operations.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Workers Management                           │
│ Sidebar  │                                              │
│          │ [Search & Filters Bar]                       │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ [Search] [Area▼] [Status▼] [+ New]   │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Workers Table]                              │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ ☑│Name   │Area      │Status│Actions   │  │
│          │ ├────────────────────────────────────────┤  │
│          │ │ ☐│Ahmad  │Taman Bungkul│✓   │[👁️][✏️]│  │
│          │ │ ☐│Siti   │Jl. Darmo│✓      │[👁️][✏️]│  │
│          │ │ ☐│Dimas  │Not Assigned│✗   │[👁️][✏️]│  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Bulk Actions] [Pagination]                  │
│          │ With 3 selected: [Assign Area] [Deactivate] │
│          │ Showing 1-20 of 120  [◀] 1 2 3 [▶]         │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Table Columns
- **Checkbox** - Select for bulk actions
- **Profile Photo** - Thumbnail from clock-in selfie
- **Name** - Full name (sortable)
- **Username** - Login username
- **Phone** - Contact number
- **Assigned Area** - Current area assignment
- **Area Type** - Area type badge
- **Status** - Active/Inactive indicator
- **Last Shift** - Date of last clock-in
- **Total Shifts** - Count this month
- **Total Reports** - Count this month
- **Actions** - View, Edit, Assign, Deactivate

#### Filters & Search
- **Search** - Name, username, phone (debounced 300ms)
- **Area Filter** - Dropdown with all areas + "Unassigned"
- **Area Type Filter** - Park, Pedestrian, Mini Garden, Street
- **Status Filter** - Active, Inactive, All
- **Assignment Filter** - Assigned, Unassigned, All
- **Date Range** - Last shift within range

#### Bulk Actions
- Assign to Area (opens modal with area selector)
- Deactivate Workers
- Export Selected (CSV, Excel)
- Send Notification (Phase 7)

#### Sorting
- Click column header to sort
- Ascending/descending toggle
- Multi-column sort (hold Shift)
- Default: Name (A-Z)

#### Pagination
- Configurable page size (20, 50, 100)
- Go to page input
- Total count display
- Keyboard navigation (arrow keys)

### Data Requirements

**API Endpoints:**
```typescript
GET /api/users?role=worker&page=1&limit=20&search=&area_id=&status=
  Response: {
    workers: Array<{
      id: string,
      username: string,
      full_name: string,
      phone: string,
      is_active: boolean,
      assigned_area: {
        id: string,
        name: string,
        area_type: {code: string, name: string}
      },
      last_shift_date: string,
      shifts_count_month: number,
      reports_count_month: number,
      created_at: string
    }>,
    total: number,
    page: number,
    limit: number
  }

POST /api/workers/bulk-assign
  Body: {worker_ids: string[], area_id: string}

PATCH /api/users/bulk-update
  Body: {user_ids: string[], is_active: boolean}
```

**Caching:**
- List cache: 2 minutes
- Invalidate on create/update/delete
- Optimistic updates for quick feedback

### User Interactions
- Click row → Navigate to worker detail
- Click checkbox → Select for bulk actions
- Click "New Worker" → Navigate to create form
- Click eye icon → View worker details (modal or page)
- Click edit icon → Navigate to edit form
- Apply filter → Refetch with filter params
- Change page → Fetch next page
- Sort column → Refetch with sort params

---

### 3.2 Worker Detail Page

**Route:** `/dashboard/workers/:id`
**Access:** Supervisor, Admin
**Description:** Detailed view of single worker with all related data.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Worker Details                               │
│ Sidebar  │ Breadcrumbs: Workers > Ahmad Rizki           │
│          │                                              │
│          │ [Worker Info Card]                           │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ 📷 [Photo]  Ahmad Rizki                │  │
│          │ │            @worker1                    │  │
│          │ │            📞 081234567890             │  │
│          │ │            📍 Taman Bungkul (Park)     │  │
│          │ │            ✓ Active since Jan 2026    │  │
│          │ │            [Edit] [Reassign] [Deactivate] │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Stats Row]                                  │
│          │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│          │ │Shifts│ │Hours│ │Reports│ │Attendance│       │
│          │ │ 45  │ │ 360 │ │ 120 │ │ 95%     │       │
│          │ └─────┘ └─────┘ └─────┘ └─────┘           │
│          │                                              │
│          │ [Tabbed Content]                             │
│          │ [Shifts] [Reports] [Location History] [Activity]│
│          │                                              │
│          │ Currently showing: Shifts                    │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ Date     │Clock In│Clock Out│Hours    │  │
│          │ ├────────────────────────────────────────┤  │
│          │ │ Jan 16  │ 08:00  │ 17:00   │ 9.0h    │  │
│          │ │ Jan 15  │ 08:15  │ 17:30   │ 9.25h   │  │
│          │ └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Worker Info Card
- Profile photo (from latest clock-in selfie)
- Full name and username
- Contact information
- Current area assignment with type badge
- Account status (Active/Inactive)
- Member since date
- Quick actions: Edit, Reassign Area, Deactivate, Reset Password (admin)

#### Statistics Cards
- **Total Shifts** - This month / All time
- **Total Hours** - This month / Average per day
- **Total Reports** - This month / By type breakdown
- **Attendance Rate** - This month / Last 30 days

#### Tabs

**1. Shifts Tab**
- Table of all shifts
- Columns: Date, Clock In, Clock Out, Hours, Area, Status
- Filter by date range
- Export to CSV
- Click to view shift details (location tracking, reports during shift)

**2. Reports Tab**
- Grid or list of work reports
- Thumbnail images
- Filter by report type, date
- Sort by date, type
- Click to view full report details

**3. Location History Tab**
- Date range selector
- Google Map with route visualization
- Timeline slider
- Statistics: Distance traveled, areas visited, time per area
- Playback controls for route animation

**4. Activity Log Tab**
- Chronological list of all worker actions
- Clock-ins, clock-outs, reports, area changes
- Filter by action type
- Search by keyword
- Export activity log

### Data Requirements

**API Endpoints:**
```typescript
GET /api/users/:id
  Response: {
    id, username, full_name, phone, is_active,
    assigned_area: {...},
    created_at, updated_at,
    stats: {
      shifts_count_month: number,
      total_hours_month: number,
      reports_count_month: number,
      attendance_rate: number
    }
  }

GET /api/shifts?worker_id=:id&from_date=&to_date=
  Response: {shifts: [...]}

GET /api/reports?worker_id=:id&from_date=&to_date=
  Response: {reports: [...]}

GET /api/location/worker/:id?from_date=&to_date=
  Response: {locations: [...]}
```

### User Interactions
- Click "Edit" → Navigate to edit form
- Click "Reassign" → Open area selector modal
- Click "Deactivate" → Show confirmation dialog
- Switch tab → Fetch tab-specific data (cached)
- Click shift row → Expand to show details
- Click report thumbnail → Open lightbox
- Play location route → Animate marker on map
- Export data → Generate and download file

---

### 3.3 Create/Edit Worker Form

**Route:** `/dashboard/workers/new` or `/dashboard/workers/:id/edit`
**Access:** Admin only
**Description:** Form to create new worker or edit existing worker.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Create New Worker / Edit Worker              │
│ Sidebar  │                                              │
│          │ [Form Card]                                  │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ Basic Information                      │  │
│          │ │                                        │  │
│          │ │ Full Name *                            │  │
│          │ │ [_________________________]            │  │
│          │ │                                        │  │
│          │ │ Username *                             │  │
│          │ │ [_________________________]            │  │
│          │ │                                        │  │
│          │ │ Phone Number                           │  │
│          │ │ [_________________________]            │  │
│          │ │                                        │  │
│          │ │ Password * (Leave blank to keep)       │  │
│          │ │ [_________________________] [👁]        │  │
│          │ │                                        │  │
│          │ │ ─────────────────────────────────      │  │
│          │ │                                        │  │
│          │ │ Area Assignment                        │  │
│          │ │                                        │  │
│          │ │ Assign to Area                         │  │
│          │ │ [Select Area ▼________________]        │  │
│          │ │                                        │  │
│          │ │ Account Status                         │  │
│          │ │ ◉ Active  ○ Inactive                   │  │
│          │ │                                        │  │
│          │ │ [Cancel] [Save Worker]                 │  │
│          │ └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Form Fields

**Basic Information:**
- **Full Name*** - Required, 2-100 characters
- **Username*** - Required, 3-50 characters, unique, alphanumeric + _ -
- **Phone Number** - Optional, 10-15 digits, format validation
- **Password*** - Required for new, optional for edit, min 6 characters
- **Confirm Password*** - Must match password

**Area Assignment:**
- **Assign to Area** - Dropdown with all active areas
  - Shows area name and type
  - Searchable dropdown
  - Optional (can be assigned later)

**Account Settings:**
- **Status** - Radio buttons: Active / Inactive
- **Role** - Fixed as "Worker" (non-editable)

#### Validation Rules
- **Real-time validation** on blur
- **Form-level validation** on submit
- **Server-side validation** errors displayed inline
- **Required fields** marked with asterisk

#### Form States
- **Default** - Empty form (create) or populated (edit)
- **Loading** - Submitting data
- **Success** - Show success message, redirect to list
- **Error** - Show error messages inline

### Data Requirements

**API Endpoints:**
```typescript
POST /api/users
  Body: {
    username: string,
    password: string,
    full_name: string,
    phone?: string,
    role: 'worker'
  }
  Response: {user: {...}}

PATCH /api/users/:id
  Body: {
    full_name?: string,
    phone?: string,
    password?: string,
    is_active?: boolean
  }
  Response: {user: {...}}

POST /api/workers/:id/assign
  Body: {area_id: string}
  Response: {assignment: {...}}

GET /api/areas  // For area dropdown
  Response: {areas: [...]}
```

### Validation Schema (Zod)

```typescript
const workerSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, _ and -'),
  phone: z.string()
    .regex(/^[0-9]{10,15}$/, 'Phone must be 10-15 digits')
    .optional(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .optional(),
  area_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true)
});
```

### User Interactions
- Fill form → Real-time validation
- Click "Save" → Validate → Submit → Redirect
- Click "Cancel" → Confirm if dirty → Navigate back
- Change area → Show area details preview
- Toggle password visibility → Show/hide password
- Username blur → Check availability (debounced)

---

## 4. Report Review

### 4.1 Reports List Page

**Route:** `/dashboard/reports`
**Access:** Supervisor, Admin
**Description:** Comprehensive list of all work reports with filtering and bulk actions.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Work Reports                                 │
│ Sidebar  │                                              │
│          │ [Filters & Search Bar]                       │
│          │ ┌────────────────────────────────────────┐  │
│          │ │[Search] [Date Range] [Worker▼] [Area▼]│  │
│          │ │[Type▼] [Status▼] [🔽Export] [🔄Refresh]│  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [View Toggle: Grid/List] [Select All ☑]     │
│          │                                              │
│          │ [Reports Grid View]                          │
│          │ ┌────────┐ ┌────────┐ ┌────────┐          │
│          │ │[Photo] │ │[Photo] │ │[Photo] │          │
│          │ │Worker1 │ │Worker2 │ │Worker3 │          │
│          │ │Taman.. │ │Jl.Darmo│ │Taman.. │          │
│          │ │10:30  │ │11:45  │ │14:20  │          │
│          │ │✓Review│ │⏳Pending│ │✓Review│          │
│          │ └────────┘ └────────┘ └────────┘          │
│          │ ┌────────┐ ┌────────┐ ┌────────┐          │
│          │ │[Photo] │ │[Video] │ │[Photo] │          │
│          │ │  ...   │ │  ...   │ │  ...   │          │
│          │ └────────┘ └────────┘ └────────┘          │
│          │                                              │
│          │ [Pagination] [Bulk Actions]                  │
│          │ Page 1 of 12  With 5 selected: [Mark Reviewed]│
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Filters
- **Search** - Report description, worker name (debounced 300ms)
- **Date Range** - Start and end date picker
  - Presets: Today, Yesterday, Last 7 days, Last 30 days, Custom
- **Worker** - Dropdown with all workers (searchable)
- **Area** - Dropdown with all areas (searchable)
- **Area Type** - Park, Pedestrian, Mini Garden, Street
- **Report Type** - Task Completion, Incident, Maintenance Request
- **Review Status** - Pending, Reviewed, All

#### View Options
- **Grid View** (default) - Photo cards with key info
- **List View** - Table with detailed columns
- **Toggle** - Switch between views (preference saved)

#### Grid View Cards
Each card shows:
- Thumbnail photo/video (with play icon for videos)
- Worker name and avatar
- Area name (truncated if long)
- Submission time (relative: "2h ago")
- Review status badge (Pending/Reviewed)
- Quick action buttons on hover: View, Download, Mark Reviewed

#### List View Columns
- **Checkbox** - Select for bulk actions
- **Thumbnail** - Photo/video preview
- **Worker** - Name and avatar
- **Area** - Name and type badge
- **Report Type** - Badge with icon
- **Description** - Truncated text (hover for full)
- **Time** - Submission timestamp
- **GPS** - Coordinates with map icon (click to view on map)
- **Status** - Pending/Reviewed badge
- **Actions** - View, Download, Mark Reviewed

#### Bulk Actions
- Mark as Reviewed (with optional notes)
- Export Selected (CSV, PDF with photos)
- Download Photos (ZIP file)
- Delete Reports (admin only, confirmation required)

#### Sorting
- Date (newest first - default)
- Date (oldest first)
- Worker name (A-Z)
- Area name (A-Z)
- Report type

#### Pagination
- 24 items per page (grid), 50 items (list)
- Infinite scroll option
- Go to page input
- Total count display

### Data Requirements

**API Endpoints:**
```typescript
GET /api/reports?page=1&limit=24&search=&worker_id=&area_id=&area_type=&report_type=&status=&from_date=&to_date=&sort=
  Response: {
    reports: Array<{
      id: string,
      worker: {id: string, full_name: string, avatar_url: string},
      area: {id: string, name: string, area_type: {code, name}},
      shift: {id: string, clock_in_time: string},
      report_type: string,
      description: string,
      photo_url: string,
      gps_lat: string,
      gps_lng: string,
      created_at: string,
      reviewed: boolean,
      reviewed_by: {id: string, full_name: string},
      reviewed_at: string
    }>,
    total: number,
    page: number,
    limit: number
  }

PATCH /api/reports/bulk-review
  Body: {report_ids: string[], reviewed: boolean, notes?: string}
  Response: {success: true, updated_count: number}

GET /api/reports/export?format=csv|pdf&report_ids=
  Response: File download
```

**Caching:**
- List cache: 1 minute (shorter for activity data)
- Invalidate on mark reviewed
- Prefetch next page on scroll

### User Interactions
- Click card/row → Navigate to report detail page
- Click thumbnail → Open lightbox preview
- Click worker name → Navigate to worker detail
- Click area name → Navigate to area detail
- Click GPS icon → Show location on map modal
- Apply filter → Refetch with filter params
- Select multiple → Show bulk actions bar
- Click "Mark Reviewed" → Show confirmation → Update
- Click "Export" → Show format selector → Generate file

---

### 4.2 Report Detail Page

**Route:** `/dashboard/reports/:id`
**Access:** Supervisor, Admin
**Description:** Full report details with media viewer and review actions.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Report Details                               │
│ Sidebar  │ Breadcrumbs: Reports > Report #12345         │
│          │                                              │
│          │ [Media Viewer - Large]                       │
│          │ ┌────────────────────────────────────────┐  │
│          │ │                                        │  │
│          │ │        [Large Photo Display]           │  │
│          │ │          or [Video Player]             │  │
│          │ │                                        │  │
│          │ │   [◀] Thumbnail Strip [▶]              │  │
│          │ │  [🖼️] [🖼️] [🖼️] [▶️] [🖼️]                │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Report Information - 2 Column Layout]       │
│          │ ┌──────────────────┬──────────────────────┐│
│          │ │Worker Info       │Location & Time       ││
│          │ │                  │                      ││
│          │ │👤 Ahmad Rizki    │📍 Taman Bungkul     ││
│          │ │                  │   (Park)            ││
│          │ │📞 081234567890   │                      ││
│          │ │                  │🕐 Jan 16, 2026      ││
│          │ │⏰ Shift: 08:00-17:00│   10:30 AM       ││
│          │ │                  │                      ││
│          │ │Report Type       │GPS Coordinates      ││
│          │ │🛠️ Task Completion│-7.2905, 112.7398   ││
│          │ │                  │[View on Map]        ││
│          │ ├──────────────────┴──────────────────────┤│
│          │ │Description                              ││
│          │ │Completed cleaning of park benches and   ││
│          │ │fountain area. All trash collected...    ││
│          │ ├─────────────────────────────────────────┤│
│          │ │Review Status                            ││
│          │ │⏳ Pending Review                        ││
│          │ │                                         ││
│          │ │[Mark as Reviewed] [Download Photos]     ││
│          │ └─────────────────────────────────────────┘│
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Media Viewer
- **Photo Display**
  - Full-size image display
  - Zoom in/out controls
  - Pan/drag support
  - Fullscreen mode
  - Download original
  - Share link

- **Video Player**
  - HTML5 video player
  - Play/pause controls
  - Volume control
  - Playback speed selector
  - Fullscreen mode
  - Download video

- **Thumbnail Strip**
  - Horizontal scrollable thumbnails
  - Click to switch main view
  - Keyboard navigation (arrow keys)
  - Photo/video indicators

- **Image Lightbox**
  - Click photo → Open fullscreen lightbox
  - Navigate with arrows or swipe
  - ESC to close
  - Photo counter (1 of 5)

#### Report Information

**Worker Section:**
- Worker name (click to view profile)
- Worker avatar
- Phone number (click to call - Phase 7)
- Shift information (clock in/out times)

**Location & Time:**
- Area name and type
- Submission date and time
- Relative time ("2 hours ago")

**GPS Section:**
- Latitude and longitude
- "View on Map" button → Opens modal with:
  - Google Map centered on location
  - Marker at report location
  - Area boundary visualization
  - Distance from area center

**Report Details:**
- Report type with icon
- Full description text
- Character count

**Review Section:**
- Current status (Pending/Reviewed)
- If reviewed:
  - Reviewer name and timestamp
  - Review notes (if any)
- If pending:
  - "Mark as Reviewed" button
  - Optional notes field
  - Confirm button

#### Action Buttons
- **Mark as Reviewed** - Update review status
- **Download Photos** - Download all photos as ZIP
- **Download Report** - Generate PDF with all info
- **Edit Report** - Allow corrections (within 1 hour, worker only)
- **Delete Report** - Admin only, confirmation required
- **Print Report** - Print-friendly view

### Data Requirements

**API Endpoints:**
```typescript
GET /api/reports/:id
  Response: {
    id, worker, area, shift, report_type, description,
    photo_url, gps_lat, gps_lng, created_at,
    reviewed, reviewed_by, reviewed_at, review_notes
  }

PATCH /api/reports/:id/review
  Body: {reviewed: true, notes?: string}
  Response: {report: {...}}

GET /api/reports/:id/download
  Query: format=pdf|zip
  Response: File download
```

### User Interactions
- Click thumbnail → Switch main view
- Click photo → Open fullscreen lightbox
- Navigate with keyboard (arrow keys, ESC)
- Click "View on Map" → Open map modal
- Click "Mark as Reviewed" → Show notes field → Confirm → Update
- Click "Download Photos" → Generate ZIP → Download
- Click worker name → Navigate to worker detail
- Click area name → Navigate to area detail
- Click "Print" → Open print-friendly view

### Keyboard Shortcuts
- **Arrow Left/Right** - Navigate photos
- **ESC** - Close lightbox
- **Space** - Play/pause video
- **F** - Fullscreen toggle
- **R** - Mark as reviewed (if pending)

---

## 5. Attendance & Time Tracking

**Route:** `/dashboard/attendance`
**Access:** Supervisor, Admin
**Description:** Track daily attendance, view time sheets, and analyze attendance patterns.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Attendance & Time Tracking                   │
│ Sidebar  │                                              │
│          │ [Date Selector & Stats]                      │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ [◀ Jan 15] [📅 Jan 16, 2026] [Jan 17 ▶]│  │
│          │ │                                        │  │
│          │ │ [Stats Cards Row]                      │  │
│          │ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │  │
│          │ │ │Total│ │Present│ │Absent│ │Late │       │  │
│          │ │ │120  │ │ 115  │ │  5  │ │ 12 │       │  │
│          │ │ └─────┘ └─────┘ └─────┘ └─────┘       │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [View Toggle: Table / Calendar]              │
│          │                                              │
│          │ [Attendance Table View]                      │
│          │ ┌────────────────────────────────────────┐  │
│          │ │Worker  │Clock In│Clock Out│Hours│Status││
│          │ ├────────────────────────────────────────┤  │
│          │ │Ahmad   │08:00   │17:00    │9.0h │✓ On time││
│          │ │Siti    │08:15   │17:30    │9.25h│⚠ Late 15m││
│          │ │Dimas   │-       │-        │-    │✗ Absent ││
│          │ │Rina    │08:05   │16:45    │8.67h│✓ On time││
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Filters] [Export] [Print]                   │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Date Navigation
- **Date Picker** - Select specific date
- **Previous/Next Buttons** - Navigate days
- **Quick Filters**
  - Today (default)
  - Yesterday
  - This Week
  - Last Week
  - This Month
  - Custom Range

#### Statistics Cards
- **Total Workers** - Number of workers in system
- **Present** - Clocked in today (percentage)
- **Absent** - Not clocked in (percentage)
- **Late Arrivals** - Clocked in after expected time (count)
- **Early Departures** - Clocked out early (count)
- **Total Hours** - Sum of all work hours today
- **Average Hours** - Average per worker

#### View Modes

**Table View (Default):**
- List all workers with attendance data
- Columns:
  - **Worker** - Name, avatar, assigned area
  - **Clock In** - Time (with late indicator if >8:15)
  - **Clock Out** - Time (with early indicator if <16:00)
  - **Total Hours** - Calculated duration
  - **Break Time** - If tracked (Phase 7)
  - **Status** - On Time / Late / Absent / Early Out
  - **Notes** - Manual notes (admin editable)
  - **Actions** - View shift details, View reports
- Sort by any column
- Filter by status, area, area type
- Color-coded rows (green=on time, yellow=late, red=absent)

**Calendar View:**
- Monthly calendar grid
- Each date shows:
  - Attendance rate (percentage)
  - Color indicator (green=high, yellow=medium, red=low)
  - Click date to view details
- Current date highlighted
- Hover to see quick stats
- Navigate months with arrows

#### Detailed Attendance Info
Click worker row to expand:
- GPS location of clock-in/out
- Selfie photos from clock-in/out
- Total reports submitted during shift
- Location tracking summary (distance traveled)
- Any flags or issues (GPS outside boundary, suspicious patterns)

#### Filters & Search
- **Search** - Worker name
- **Area Filter** - Filter by area
- **Area Type Filter** - Filter by area type
- **Status Filter** - Present, Absent, Late, All
- **Show Only** - Issues (late, absent, early out)

#### Export Options
- **CSV** - Raw data for spreadsheet
- **Excel** - Formatted with formulas
- **PDF** - Print-ready report with summary
- **Date Range** - Single day or range
- **Include Photos** - Option for PDF export

### Data Requirements

**API Endpoints:**
```typescript
GET /api/supervisor/attendance?date=2026-01-16&area_id=&area_type=&status=
  Response: {
    date: string,
    summary: {
      total_workers: number,
      clocked_in: number,
      absent: number,
      late: number,
      early_out: number,
      total_hours: number,
      avg_hours: number
    },
    attendance: Array<{
      worker: {id, full_name, avatar_url},
      area: {id, name, area_type},
      shift: {
        id: string,
        clock_in_time: string,
        clock_out_time: string,
        hours_worked: number,
        clock_in_gps: {lat, lng},
        clock_out_gps: {lat, lng},
        selfie_photo_url: string
      },
      status: 'on_time' | 'late' | 'absent' | 'early_out',
      late_minutes: number,
      reports_count: number,
      notes: string
    }>
  }

GET /api/supervisor/attendance/calendar?month=2026-01
  Response: {
    dates: Array<{
      date: string,
      total_workers: number,
      clocked_in: number,
      attendance_rate: number
    }>
  }

GET /api/supervisor/attendance/export?format=csv|excel|pdf&date=&from_date=&to_date=
  Response: File download

PATCH /api/shifts/:id/notes
  Body: {notes: string}
  Response: {shift: {...}}
```

**Caching:**
- Today's data: 2 minutes
- Past dates: 1 hour (less likely to change)
- Calendar month: 5 minutes

### User Interactions
- Select date → Refetch attendance data
- Click worker row → Expand to show details
- Click "View Reports" → Navigate to reports filtered by worker and date
- Click "View on Map" → Show clock-in location on map modal
- Click area name → Navigate to area detail
- Apply filter → Refetch with filter params
- Click export → Select format → Generate and download
- Edit notes → Save inline
- Print → Open print-friendly view

### Additional Features

#### Time Sheet View (Sub-page)
**Route:** `/dashboard/attendance/timesheet`

- Week or month view
- Rows: Workers
- Columns: Dates
- Cells: Hours worked (color-coded)
- Total row at bottom
- Total column on right
- Grand total in bottom-right
- Click cell to see shift details
- Export to Excel with formulas

#### Attendance Analytics
- **Trends** - Line chart of attendance rate over time
- **Peak Days** - Which days have best/worst attendance
- **Peak Times** - Distribution of clock-in times
- **Punctuality** - Percentage on-time vs late
- **Overtime** - Workers exceeding expected hours
- **Comparison** - This week vs last week, this month vs last month

---

## 6. Analytics Dashboard

**Route:** `/dashboard/analytics`
**Access:** Supervisor, Admin
**Description:** Comprehensive analytics and insights with customizable charts.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Analytics & Insights                         │
│ Sidebar  │                                              │
│          │ [Date Range & Filters]                       │
│          │ ┌────────────────────────────────────────┐  │
│          │ │[Last 30 Days ▼] [Area: All ▼] [Refresh]│  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [KPI Cards Row]                              │
│          │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│          │ │Avg  │ │Total│ │Avg  │ │ Top │           │
│          │ │Attend│ │Hours│ │Reports│ │Area │           │
│          │ │95.5%│ │4,320│ │ 8.2 │ │Bungkul│           │
│          │ └─────┘ └─────┘ └─────┘ └─────┘           │
│          │                                              │
│          │ [Charts Grid - 2x2]                          │
│          │ ┌─────────────────┐ ┌─────────────────┐    │
│          │ │ Attendance Trend│ │ Hours by Worker │    │
│          │ │  (Line Chart)   │ │  (Bar Chart)    │    │
│          │ └─────────────────┘ └─────────────────┘    │
│          │ ┌─────────────────┐ ┌─────────────────┐    │
│          │ │Reports by Type  │ │ Areas Coverage  │    │
│          │ │  (Pie Chart)    │ │  (Donut Chart)  │    │
│          │ └─────────────────┘ └─────────────────┘    │
│          │                                              │
│          │ [Worker Performance Table]                   │
│          │ ┌────────────────────────────────────────┐  │
│          │ │Rank│Worker │Shifts│Hours│Reports│Score││
│          │ ├────────────────────────────────────────┤  │
│          │ │ 1  │Ahmad  │ 22  │198h │ 88   │ 95  ││
│          │ │ 2  │Siti   │ 21  │189h │ 84   │ 93  ││
│          │ └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Date Range Selector
- **Presets:**
  - Last 7 days
  - Last 30 days (default)
  - Last 3 months
  - Last 6 months
  - Year to date
  - Custom range
- **Comparison Mode** - Compare with previous period
- **Auto-refresh** - Toggle for real-time updates

#### KPI Cards
- **Average Attendance** - Percentage across date range, trend indicator
- **Total Work Hours** - Sum of all hours worked
- **Average Reports per Day** - Daily average
- **Top Performing Area** - Based on attendance and reports
- **Most Active Worker** - Based on hours and reports
- **Total Distance Traveled** - Sum of all location tracking (Phase 3+)

Each card shows:
- Current value
- Trend indicator (▲ ▼)
- Percentage change from previous period
- Mini sparkline chart

#### Charts

**1. Attendance Trend (Line Chart)**
- X-axis: Dates
- Y-axis: Attendance count or percentage
- Lines for: Total workers, Present, Absent
- Toggle between count and percentage
- Hover tooltip with exact values
- Click point to drill down to that day's data

**2. Work Hours by Worker (Bar Chart)**
- X-axis: Worker names
- Y-axis: Total hours
- Bars color-coded (green=target met, red=below target)
- Horizontal scrolling for many workers
- Click bar to view worker details
- Sort by hours or name

**3. Reports by Type (Pie Chart)**
- Segments for each report type (Task Completion, Incident, Maintenance)
- Percentage labels
- Legend with counts
- Click segment to filter reports list
- Interactive tooltips

**4. Area Coverage (Donut Chart)**
- Inner ring: Area types (Park, Pedestrian, etc.)
- Outer ring: Individual areas
- Percentage of total coverage
- Click to view area details

**5. Attendance Heatmap (Calendar)**
- Color intensity shows attendance rate
- Each cell is a date
- Hover for details
- Click to drill down

**6. Peak Activity Times (Bar Chart)**
- X-axis: Hour of day
- Y-axis: Number of clock-ins
- Shows distribution of start times
- Identify peak and low periods

#### Worker Performance Table
- **Rank** - Position in leaderboard
- **Worker** - Name and avatar
- **Shifts** - Total shifts in period
- **Hours** - Total hours worked
- **Reports** - Total reports submitted
- **Attendance Rate** - Percentage
- **Performance Score** - Calculated score (0-100)
  - Formula: (Attendance * 40%) + (Hours/Target * 30%) + (Reports/Expected * 30%)
- **Actions** - View profile, View details

Sortable by any column, filterable by area.

#### Filters
- **Area** - Filter by specific area or all
- **Area Type** - Filter by area type
- **Worker** - Filter by specific worker
- **Shift Type** - Regular, Overtime (Phase 7)
- **Status** - Active, Inactive workers

#### Export & Share
- **Export Charts** - Download as PNG or SVG
- **Export Data** - Download underlying data as CSV
- **Generate Report** - Create PDF with all analytics
- **Schedule Report** - Email daily/weekly report (Phase 7)
- **Share Link** - Generate shareable link with current filters

### Data Requirements

**API Endpoints:**
```typescript
GET /api/analytics/summary?from_date=&to_date=&area_id=&area_type=
  Response: {
    avg_attendance_rate: number,
    total_hours: number,
    avg_reports_per_day: number,
    top_area: {id, name, score},
    top_worker: {id, name, score},
    trends: {
      attendance: {current, previous, change_percent},
      hours: {current, previous, change_percent},
      reports: {current, previous, change_percent}
    }
  }

GET /api/analytics/attendance-trend?from_date=&to_date=
  Response: {
    dates: Array<{
      date: string,
      total_workers: number,
      present: number,
      absent: number,
      rate: number
    }>
  }

GET /api/analytics/hours-by-worker?from_date=&to_date=&limit=20
  Response: {
    workers: Array<{
      worker: {id, full_name},
      total_hours: number,
      shifts_count: number,
      target_hours: number
    }>
  }

GET /api/analytics/reports-by-type?from_date=&to_date=
  Response: {
    types: Array<{
      type: string,
      count: number,
      percentage: number
    }>
  }

GET /api/analytics/area-coverage?from_date=&to_date=
  Response: {
    area_types: Array<{
      type: string,
      count: number,
      percentage: number,
      areas: Array<{id, name, shifts_count}>
    }>
  }

GET /api/analytics/performance-leaderboard?from_date=&to_date=&limit=50
  Response: {
    workers: Array<{
      rank: number,
      worker: {id, full_name, avatar_url},
      shifts_count: number,
      total_hours: number,
      reports_count: number,
      attendance_rate: number,
      performance_score: number
    }>
  }
```

**Caching:**
- Analytics data: 5 minutes
- Leaderboard: 10 minutes
- Charts: 5 minutes
- Invalidate on date range change

### User Interactions
- Select date range → Refetch all analytics
- Click KPI card → Navigate to relevant detail page
- Hover chart element → Show tooltip
- Click chart element → Drill down or filter
- Click worker in leaderboard → Navigate to worker detail
- Apply filter → Update all charts and tables
- Click "Export" → Generate and download file
- Click "Share" → Copy shareable link
- Resize chart → Adjust display (responsive)

### Chart Customization (Advanced)
- **Toggle Series** - Click legend to show/hide series
- **Change Chart Type** - Switch between line, bar, area for trends
- **Aggregation** - Daily, Weekly, Monthly views
- **Comparison** - Compare current period with previous
- **Annotations** - Add notes or markers to charts

---

## 7. Area Management

### 7.1 Areas List Page

**Route:** `/dashboard/areas`
**Access:** Supervisor, Admin
**Description:** Manage work areas with CRUD operations and bulk actions.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Areas Management                             │
│ Sidebar  │                                              │
│          │ [Filters & Actions Bar]                      │
│          │ ┌────────────────────────────────────────┐  │
│          │ │[Search] [Type▼] [Status▼] [+ New Area]│  │
│          │ │[Import KMZ] [View on Map]              │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Areas Table]                                │
│          │ ┌────────────────────────────────────────┐  │
│          │ │☑│Name         │Type  │Workers│Status  │  │
│          │ ├────────────────────────────────────────┤  │
│          │ │☐│Taman Bungkul│Park  │5/8    │✓ Active││  │
│          │ │☐│Jl. Raya Darmo│Pedestrian│3/5│✓ Active││  │
│          │ │☐│Taman Harmoni│Park  │0/6    │✗ Inactive││
│          │ │☐│Mini Garden A│Mini Garden│2/3│✓ Active││  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Map Preview - Collapsible]                  │
│          │ ┌────────────────────────────────────────┐  │
│          │ │  [Google Map showing all areas]        │  │
│          │ │  - Color-coded by type                 │  │
│          │ │  - Click area for details              │  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Pagination] [Bulk Actions]                  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Table Columns
- **Checkbox** - Select for bulk actions
- **Area Name** - Full name (sortable)
- **Area Type** - Badge with icon (Park, Pedestrian, Mini Garden, Street)
- **Address** - Full address (truncated with tooltip)
- **GPS Coordinates** - Lat/Lng with map icon (click to view)
- **Radius** - Geofence radius in meters
- **Assigned Workers** - Count (current/capacity)
  - Click to view worker list
  - Color indicator (green=adequate, yellow=low, red=none)
- **Active Shifts** - Current clocked-in workers
- **Status** - Active/Inactive toggle
- **Actions** - View, Edit, Assign Workers, Deactivate, Delete

#### Filters & Search
- **Search** - Area name, address (debounced 300ms)
- **Area Type Filter** - Park, Pedestrian, Mini Garden, Street, All
- **Status Filter** - Active, Inactive, All
- **Assignment Filter** - Has Workers, No Workers, All
- **Sort By** - Name, Type, Workers Count, Created Date

#### Map Preview
- Toggle to show/hide map
- All areas displayed as circles
- Color-coded by area type
- Click circle to highlight in table
- Zoom to fit all areas
- Search area on map

#### Bulk Actions
- Assign Workers (opens multi-select modal)
- Change Area Type
- Activate/Deactivate
- Export Selected (CSV, KML)
- Delete Areas (admin only, confirmation required)

### Data Requirements

**API Endpoints:**
```typescript
GET /api/areas?page=1&limit=50&search=&area_type=&status=&sort=
  Response: {
    areas: Array<{
      id: string,
      name: string,
      area_type: {id, code, name},
      address: string,
      gps_lat: string,
      gps_lng: string,
      radius_meters: number,
      is_active: boolean,
      assigned_workers_count: number,
      active_shifts_count: number,
      created_at: string
    }>,
    total: number
  }

POST /api/areas/bulk-assign
  Body: {area_ids: string[], worker_ids: string[]}

PATCH /api/areas/bulk-update
  Body: {area_ids: string[], is_active?: boolean, area_type_id?: string}

DELETE /api/areas/bulk-delete
  Body: {area_ids: string[]}
```

### User Interactions
- Click row → Navigate to area detail page
- Click GPS icon → Open map modal
- Click worker count → Open assigned workers modal
- Click "New Area" → Navigate to create form
- Click "Import KMZ" → Open file uploader
- Apply filter → Refetch with filter params
- Toggle status → Update immediately with confirmation
- Select multiple → Show bulk actions bar

---

### 7.2 Area Detail Page

**Route:** `/dashboard/areas/:id`
**Access:** Supervisor, Admin
**Description:** Detailed view of single area with all related data.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Area Details: Taman Bungkul                  │
│ Sidebar  │ Breadcrumbs: Areas > Taman Bungkul           │
│          │                                              │
│          │ [Area Info Card & Map - 2 Column]            │
│          │ ┌───────────────────┬──────────────────────┐│
│          │ │Area Information   │ Map View             ││
│          │ │                   │                      ││
│          │ │📍 Taman Bungkul   │ [Google Map showing  ││
│          │ │   Park            │  area boundary circle││
│          │ │                   │  with center marker] ││
│          │ │📫 Jl. Taman...    │                      ││
│          │ │                   │                      ││
│          │ │🎯 Coordinates:    │ Radius: 150m         ││
│          │ │   -7.2905, 112.7398│                     ││
│          │ │                   │                      ││
│          │ │✓ Active          │ [Edit] [View KML]   ││
│          │ ├───────────────────┴──────────────────────┤│
│          │ │[Stats Row]                              ││
│          │ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       ││
│          │ │ │Workers│ │Active│ │Shifts│ │Reports│       ││
│          │ │ │  5/8 │ │  3  │ │  45 │ │  120 │       ││
│          │ │ └─────┘ └─────┘ └─────┘ └─────┘       ││
│          │ └─────────────────────────────────────────┘│
│          │                                              │
│          │ [Tabbed Content]                             │
│          │ [Assigned Workers] [Shifts] [Reports] [Analytics]│
│          │                                              │
│          │ Currently showing: Assigned Workers          │
│          │ ┌────────────────────────────────────────┐  │
│          │ │Worker   │Status    │Last Shift│Actions ││
│          │ ├────────────────────────────────────────┤  │
│          │ │Ahmad    │🟢 Active │ 2h ago   │[View]  ││
│          │ │Siti     │⚫ Offline│ Yesterday│[View]  ││
│          │ │[+ Assign Worker]                      │  │
│          │ └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Area Info Card
- Area name and type
- Full address
- GPS coordinates (clickable to copy)
- Geofence radius with visual indicator
- Status (Active/Inactive) with toggle
- Created date
- Last updated date
- Quick actions: Edit, View on Google Maps, Export KML

#### Map Display
- Google Map centered on area
- Circle overlay showing geofence boundary
- Center marker
- Adjustable zoom
- Fullscreen mode
- Show worker locations (if clocked in)
- Show nearby areas

#### Statistics Cards
- **Assigned Workers** - Current/Capacity
  - Click to view workers list
- **Active Now** - Currently clocked-in workers
  - Click to view on map
- **Total Shifts** - This month / All time
- **Total Reports** - This month / All time
- **Average Hours** - Per shift
- **Attendance Rate** - This month

#### Tabs

**1. Assigned Workers Tab**
- Table of workers assigned to this area
- Columns: Name, Phone, Status (Active/Clocked In/Offline), Last Shift, Total Shifts, Actions
- "Assign Worker" button → Opens worker selector modal
  - Multi-select dropdown
  - Filter by unassigned workers
  - Confirm assignment
- "Remove Assignment" button per worker → Confirmation dialog
- Export worker list (CSV)

**2. Shifts Tab**
- Table of all shifts at this area
- Columns: Worker, Date, Clock In, Clock Out, Hours, Reports Count, Status
- Filter by worker, date range
- Sort by date, hours
- Click row to view shift details
- Export shifts (CSV, Excel)

**3. Reports Tab**
- Grid or list of all reports from this area
- Same layout as main reports page
- Filter by worker, date, report type
- Click to view report details

**4. Analytics Tab**
- **Attendance Trend** - Line chart over time
- **Work Hours by Worker** - Bar chart
- **Reports by Type** - Pie chart
- **Busiest Days** - Heatmap
- **Average Hours per Day** - Metric
- Date range selector
- Export analytics data

### Data Requirements

**API Endpoints:**
```typescript
GET /api/areas/:id?include=workers,stats
  Response: {
    id, name, area_type, address, gps_lat, gps_lng,
    radius_meters, is_active, created_at, updated_at,
    assigned_workers: Array<{...}>,
    stats: {
      assigned_workers_count: number,
      workers_capacity: number,
      active_workers_count: number,
      shifts_count_month: number,
      shifts_count_total: number,
      reports_count_month: number,
      reports_count_total: number,
      avg_hours_per_shift: number,
      attendance_rate_month: number
    }
  }

GET /api/shifts?area_id=:id&from_date=&to_date=
  Response: {shifts: [...]}

GET /api/reports?area_id=:id&from_date=&to_date=
  Response: {reports: [...]}

GET /api/analytics/area/:id?from_date=&to_date=
  Response: {analytics: {...}}
```

### User Interactions
- Click "Edit" → Navigate to edit form
- Click "Assign Worker" → Open worker selector modal → Confirm → Update
- Click worker name → Navigate to worker detail
- Switch tab → Fetch tab-specific data (cached)
- Click shift row → Navigate to shift detail or expand inline
- Filter/sort → Refetch data
- Export → Generate and download file
- Toggle status → Show confirmation → Update

---

### 7.3 Create/Edit Area Form

**Route:** `/dashboard/areas/new` or `/dashboard/areas/:id/edit`
**Access:** Admin only
**Description:** Form to create new area or edit existing area.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Create New Area / Edit Area                  │
│ Sidebar  │                                              │
│          │ [2 Column Layout: Form + Map]                │
│          │ ┌───────────────────┬──────────────────────┐│
│          │ │Form Fields        │ Map Preview          ││
│          │ │                   │                      ││
│          │ │Area Name *        │ [Interactive Map     ││
│          │ │[______________]   │  - Click to set center││
│          │ │                   │  - Drag circle edge  ││
│          │ │Area Type *        │    to adjust radius] ││
│          │ │[Park ▼_______]    │                      ││
│          │ │                   │                      ││
│          │ │Address            │ Current:             ││
│          │ │[______________]   │ Lat: -7.2905         ││
│          │ │[______________]   │ Lng: 112.7398        ││
│          │ │                   │ Radius: 150m         ││
│          │ │GPS Coordinates *  │                      ││
│          │ │Latitude           │                      ││
│          │ │[-7.2905_______]   │ [Use My Location]    ││
│          │ │Longitude          │ [Search Address]     ││
│          │ │[112.7398______]   │                      ││
│          │ │                   │                      ││
│          │ │Geofence Radius *  │                      ││
│          │ │[150_____] meters  │                      ││
│          │ │[──────●────]      │                      ││
│          │ │(50m - 500m)       │                      ││
│          │ │                   │                      ││
│          │ │Status             │                      ││
│          │ │◉ Active ○ Inactive│                      ││
│          │ │                   │                      ││
│          │ │[Cancel] [Save]    │                      ││
│          │ └───────────────────┴──────────────────────┘│
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Form Fields

**Basic Information:**
- **Area Name*** - Required, 2-200 characters
- **Area Type*** - Required, dropdown (Park, Pedestrian, Mini Garden, Street)
- **Address** - Optional, 2-500 characters, multi-line

**Location:**
- **GPS Latitude*** - Required, -90 to 90
- **GPS Longitude*** - Required, -180 to 180
- **Geofence Radius*** - Required, 50-500 meters
  - Slider with numeric input
  - Visual feedback on map

**Settings:**
- **Status** - Radio buttons: Active / Inactive
- **Worker Capacity** - Optional, number 1-20 (how many workers can be assigned)

#### Interactive Map
- Click map to set center point
- Drag center marker to adjust
- Circle overlay shows geofence
- Drag circle edge to adjust radius
- Real-time sync with form fields
- Search box to find location
- "Use My Location" button
- Zoom controls

#### Helper Tools
- **Search Address** - Geocode address to coordinates
- **Use My Location** - Get browser geolocation
- **Import from KML** - Upload KML file to extract boundaries
- **Validate Location** - Check if point is valid (not in water, etc.)

#### Validation
- Real-time validation on blur
- Form-level validation on submit
- Server-side validation errors displayed inline
- Map updates validate boundary doesn't overlap with existing areas (warning, not error)

### Data Requirements

**API Endpoints:**
```typescript
POST /api/areas
  Body: {
    name: string,
    area_type_id: string,
    address?: string,
    gps_lat: number,
    gps_lng: number,
    radius_meters: number,
    worker_capacity?: number
  }
  Response: {area: {...}}

PATCH /api/areas/:id
  Body: {same as POST, all optional}
  Response: {area: {...}}

GET /api/area-types  // For area type dropdown
  Response: {area_types: [...]}

POST /api/areas/validate-location
  Body: {gps_lat: number, gps_lng: number, radius_meters: number}
  Response: {valid: boolean, overlaps: Array<{id, name}>, warnings: string[]}

POST /api/areas/geocode
  Body: {address: string}
  Response: {lat: number, lng: number, formatted_address: string}
```

### Validation Schema (Zod)

```typescript
const areaSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(200, 'Name must be less than 200 characters'),
  area_type_id: z.string().uuid('Select an area type'),
  address: z.string().max(500, 'Address is too long').optional(),
  gps_lat: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  gps_lng: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radius_meters: z.number()
    .min(50, 'Radius must be at least 50 meters')
    .max(500, 'Radius cannot exceed 500 meters'),
  worker_capacity: z.number().min(1).max(20).optional(),
  is_active: z.boolean().default(true)
});
```

### User Interactions
- Type name → Validate on blur
- Select area type → Update form
- Click map → Set coordinates → Update form fields
- Drag marker → Update coordinates
- Drag circle edge → Update radius
- Type coordinates → Update map
- Adjust radius slider → Update circle on map
- Click "Search Address" → Geocode → Update map and coordinates
- Click "Use My Location" → Get geolocation → Update map and coordinates
- Click "Validate Location" → Check overlaps → Show warnings
- Click "Save" → Validate → Submit → Redirect
- Click "Cancel" → Confirm if dirty → Navigate back

### KMZ Import Feature

**Modal Dialog:**
- Drag & drop KMZ/KML file
- Parse file to extract polygons/circles
- Show preview on map
- Extract first valid area (or let user select if multiple)
- Auto-fill form fields from extracted data
- Confirm to apply to form

---

## 8. User Management

**Route:** `/dashboard/users`
**Access:** Admin only
**Description:** Manage all user accounts (workers, supervisors, admins) with CRUD operations.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ User Management                              │
│ Sidebar  │                                              │
│          │ [Filters & Actions Bar]                      │
│          │ ┌────────────────────────────────────────┐  │
│          │ │[Search] [Role▼] [Status▼] [+ New User]│  │
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Stats Cards Row]                            │
│          │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│          │ │Total│ │Workers│ │Supervisors│ │Admins│       │
│          │ │ 125 │ │  120 │ │     4    │ │  1  │       │
│          │ └─────┘ └─────┘ └─────┘ └─────┘           │
│          │                                              │
│          │ [Users Table]                                │
│          │ ┌────────────────────────────────────────┐  │
│          │ │☑│Name    │Username│Role │Status│Actions││
│          │ ├────────────────────────────────────────┤  │
│          │ │☐│Admin   │admin   │Admin│✓ Active│[✏️][🔑]││
│          │ │☐│Supervisor1│supervisor1│Super│✓│[✏️][🔑]││
│          │ │☐│Ahmad   │worker1 │Worker│✓   │[✏️][🔑]││
│          │ │☐│Siti    │worker2 │Worker│✗ Inactive│[✏️][🔑]││
│          │ └────────────────────────────────────────┘  │
│          │                                              │
│          │ [Bulk Actions] [Pagination]                  │
│          │ With 3 selected: [Activate] [Deactivate]    │
│          │ [Reset Passwords] [Delete]                   │
└──────────┴──────────────────────────────────────────────┘
```

### Features

#### Table Columns
- **Checkbox** - Select for bulk actions
- **Name** - Full name (sortable)
- **Username** - Login username (sortable)
- **Phone** - Contact number
- **Role** - Badge (Worker, Supervisor, Admin)
- **Status** - Active/Inactive indicator
- **Last Login** - Date and time
- **Created** - Account creation date
- **Actions** - Edit, Reset Password, Deactivate, Delete

#### Filters & Search
- **Search** - Name, username, phone (debounced 300ms)
- **Role Filter** - Worker, Supervisor, Admin, All
- **Status Filter** - Active, Inactive, All
- **Created Date Range** - Filter by account age
- **Last Login** - Never, Last 7 days, Last 30 days, Older

#### Bulk Actions
- **Activate Users** - Set multiple users to active
- **Deactivate Users** - Set multiple users to inactive
- **Reset Passwords** - Generate and send new temporary passwords
- **Change Role** - Bulk role change (with confirmation)
- **Delete Users** - Permanent deletion (with confirmation, cannot delete self)
- **Export Selected** - Download user list (CSV)

#### Statistics Cards
- **Total Users** - All users count
- **Workers** - Count with percentage
- **Supervisors** - Count with percentage
- **Admins** - Count with percentage
- **Active Today** - Logged in today
- **New This Month** - Created this month

#### Role Badges
- **Worker** - Blue badge
- **Supervisor** - Purple badge
- **Admin** - Red badge

### Data Requirements

**API Endpoints:**
```typescript
GET /api/users?page=1&limit=50&search=&role=&status=&sort=
  Response: {
    users: Array<{
      id: string,
      username: string,
      full_name: string,
      phone: string,
      role: 'worker' | 'supervisor' | 'admin',
      is_active: boolean,
      last_login: string,
      created_at: string
    }>,
    total: number,
    summary: {
      total: number,
      workers: number,
      supervisors: number,
      admins: number,
      active_today: number,
      new_this_month: number
    }
  }

POST /api/users  // Create new user
PATCH /api/users/:id  // Update user
DELETE /api/users/:id  // Delete user

POST /api/users/:id/reset-password
  Response: {temporary_password: string}

PATCH /api/users/bulk-update
  Body: {user_ids: string[], is_active?: boolean, role?: string}

POST /api/users/bulk-reset-passwords
  Body: {user_ids: string[]}
  Response: {passwords: Array<{user_id, temporary_password}>}

DELETE /api/users/bulk-delete
  Body: {user_ids: string[]}
```

### Create/Edit User Modal

Instead of separate page, use modal for quick actions:

```
┌─────────────────────────────────────────┐
│ Create New User / Edit User       [×]   │
├─────────────────────────────────────────┤
│                                         │
│ Full Name *                             │
│ [________________________________]      │
│                                         │
│ Username *                              │
│ [________________________________]      │
│                                         │
│ Phone Number                            │
│ [________________________________]      │
│                                         │
│ Role *                                  │
│ [Worker ▼___________________]           │
│                                         │
│ Password * (Leave blank to keep)        │
│ [________________________________] [👁]  │
│                                         │
│ Status                                  │
│ ◉ Active  ○ Inactive                    │
│                                         │
│               [Cancel] [Save User]      │
└─────────────────────────────────────────┘
```

### User Interactions
- Click row → Open edit modal
- Click "New User" → Open create modal
- Click edit icon → Open edit modal
- Click key icon → Reset password → Show temporary password → Copy to clipboard
- Toggle status → Show confirmation → Update immediately
- Apply filter → Refetch with filter params
- Select multiple → Show bulk actions bar
- Click bulk action → Show confirmation → Execute
- Sort column → Refetch with sort params

### Security Features
- **Cannot delete self** - Prevent admin from deleting own account
- **Cannot demote last admin** - Ensure at least one admin exists
- **Password reset audit** - Log all password resets
- **Role change audit** - Log all role changes
- **Two-factor confirmation** - For critical bulk actions
- **Activity log** - Track all user management actions

### Role Permissions Matrix

| Action | Worker | Supervisor | Admin |
|--------|--------|------------|-------|
| View own profile | ✓ | ✓ | ✓ |
| View other users | ✗ | ✓ (workers only) | ✓ (all) |
| Create users | ✗ | ✗ | ✓ |
| Edit workers | ✗ | ✗ | ✓ |
| Edit supervisors/admins | ✗ | ✗ | ✓ |
| Reset passwords | ✗ | ✗ | ✓ |
| Delete users | ✗ | ✗ | ✓ |
| Change roles | ✗ | ✗ | ✓ |

---

## 9. Settings

**Route:** `/dashboard/settings`
**Access:** Admin (some sections visible to all)
**Description:** System settings and configuration.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header                                                  │
├──────────┬──────────────────────────────────────────────┤
│          │ Settings                                     │
│ Sidebar  │                                              │
│          │ [Settings Navigation Tabs]                   │
│          │ [General] [Location] [Notifications] [System]│
│          │                                              │
│          │ Currently showing: General                   │
│          │ ┌────────────────────────────────────────┐  │
│          │ │ Application Settings                   │  │
│          │ │                                        │  │
│          │ │ App Name                               │  │
│          │ │ [SEKAR Dashboard_________________]     │  │
│          │ │                                        │  │
│          │ │ Time Zone                              │  │
│          │ │ [Asia/Jakarta ▼_________________]      │  │
│          │ │                                        │  │
│          │ │ Date Format                            │  │
│          │ │ [DD/MM/YYYY ▼__________________]       │  │
│          │ │                                        │  │
│          │ │ Language                               │  │
│          │ │ [English ▼_____________________]       │  │
│          │ │ (Indonesian coming in Phase 7)         │  │
│          │ │                                        │  │
│          │ │                     [Save Changes]     │  │
│          │ └────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────┘
```

### Settings Sections

#### 1. General Settings

**Application:**
- App Name - Custom branding
- Organization Name
- Logo Upload (header and login page)
- Favicon Upload
- Time Zone - Dropdown with common zones
- Date Format - DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
- Time Format - 12-hour, 24-hour
- Language - English (Indonesian in Phase 7)
- Theme - Light, Dark, Auto (Phase 7)

**Dashboard Defaults:**
- Default Dashboard View - For new sessions
- Auto-refresh Interval - 30s, 60s, 120s, 300s, Off
- Items Per Page - 20, 50, 100
- Default Date Range - Today, Last 7 days, Last 30 days

#### 2. Location & Tracking Settings

**GPS Configuration:**
- Default Geofence Radius - Global default for new areas (50-500m)
- GPS Accuracy Threshold - Minimum accuracy for clock-in (10-100m)
- Location Update Interval - How often to track during shift (5, 10, 15, 30 minutes)
- Track Location During Shift - Toggle on/off
- Store Location History - How long to keep (30, 60, 90 days, Forever)

**Validation Rules:**
- Require Photo on Clock-In - Toggle
- Require Photo on Clock-Out - Toggle
- Allow Clock-In Outside Area - Toggle with warning radius
- Maximum Distance from Area - Alert threshold (100-1000m)

**Map Settings:**
- Default Map Center - Lat/Lng for initial view
- Default Zoom Level - 1-20
- Map Style - Standard, Satellite, Terrain
- Show Area Boundaries - Toggle
- Cluster Markers - Toggle
- Google Maps API Key - Encrypted input

#### 3. Notification Settings (Phase 7)

**Email Notifications:**
- Send Daily Summary - Toggle
- Send Weekly Report - Toggle
- Send Monthly Report - Toggle
- Recipient Emails - Comma-separated list
- Send Time - Time picker

**Alert Triggers:**
- Worker Late Clock-In - Threshold in minutes
- Worker Absent - Send after X hours
- Worker Outside Area - Toggle and distance
- Shift Too Long - Alert after X hours
- No Reports Submitted - Alert after X hours into shift

**Push Notifications:**
- Enable Push Notifications - Toggle
- New Report Submitted - Toggle
- Worker Clocked In/Out - Toggle
- Attendance Alerts - Toggle

#### 4. System Settings (Admin Only)

**Session Management:**
- Session Timeout - 15 min, 30 min, 1 hour, 2 hours, 1 day
- Remember Me Duration - 7 days, 30 days, 90 days
- Concurrent Logins - Allow/Disallow
- Force Logout on Password Change - Toggle

**Security:**
- Minimum Password Length - 6-20 characters
- Require Uppercase - Toggle
- Require Numbers - Toggle
- Require Special Characters - Toggle
- Password Expiration - 30, 60, 90 days, Never
- Failed Login Attempts Limit - 3, 5, 10, Unlimited
- Lockout Duration - 15, 30, 60 minutes

**API Configuration:**
- API Rate Limit - Requests per minute (Phase 7)
- Enable API Documentation - Toggle (Swagger UI)
- API Key Management - Generate, revoke keys (Phase 7)

**Data Management:**
- Database Backup Frequency - Daily, Weekly
- Backup Retention - 7, 30, 90 days
- Auto-delete Old Data - After X days
- Export Historical Data - Button to download
- Clear Cache - Button to clear application cache

**Maintenance Mode:**
- Enable Maintenance Mode - Toggle
- Maintenance Message - Text area
- Allowed IPs - Comma-separated list (admin access during maintenance)

#### 5. Attendance Rules (Admin Only)

**Work Schedule:**
- Standard Shift Start Time - Default clock-in time
- Standard Shift End Time - Default clock-out time
- Late Threshold - Minutes after start time
- Early Out Threshold - Minutes before end time
- Minimum Shift Duration - Minimum hours to count as shift
- Maximum Shift Duration - Alert if exceeded

**Attendance Calculation:**
- Weekly Work Days - Monday-Friday, Monday-Saturday, Custom
- Public Holidays - Calendar with holiday dates
- Overtime Calculation - After X hours, rates
- Break Time - Deduct from total hours (Yes/No, Duration)

#### 6. Report Settings

**Report Requirements:**
- Minimum Reports Per Shift - Number
- Require Report Before Clock-Out - Toggle
- Allow Report Editing - Within X minutes
- Auto-Review Reports After - X days (auto-mark as reviewed)

**Photo/Video:**
- Maximum Photo Size - MB
- Maximum Video Size - MB
- Maximum Video Duration - Seconds
- Allowed Formats - JPEG, PNG, MP4, etc.
- Image Compression Quality - 0-100%

### Data Requirements

**API Endpoints:**
```typescript
GET /api/settings
  Response: {
    settings: {
      general: {...},
      location: {...},
      notifications: {...},
      system: {...},
      attendance: {...},
      reports: {...}
    }
  }

PATCH /api/settings/:category
  Body: {settings: {...}}
  Response: {settings: {...}}

POST /api/settings/test-email
  Body: {email: string}
  Response: {success: boolean}

POST /api/settings/clear-cache
  Response: {success: boolean, cleared_items: number}
```

### User Interactions
- Change setting → Mark as dirty
- Click "Save Changes" → Validate → Submit → Show success message
- Click "Reset" → Restore original values
- Click "Test Email" → Send test email → Show confirmation
- Click "Clear Cache" → Show confirmation → Execute → Show success
- Upload logo → Preview immediately → Save with form
- Change API key → Show warning → Require confirmation

### Validation
- Real-time validation for numeric inputs
- Format validation for emails, URLs
- Required field validation
- Custom validation per setting type
- Server-side validation
- Show validation errors inline

---

## 10. Authentication Pages

### 10.1 Login Page

**Route:** `/login`
**Access:** Public
**Description:** User authentication page.

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│           [Full Height, Split Screen Layout]            │
│                                                         │
│  ┌─────────────────────┬──────────────────────────┐   │
│  │                     │                          │   │
│  │  [Logo & Branding]  │   [Login Form Card]      │   │
│  │                     │                          │   │
│  │   🌳 SEKAR         │   Login to Dashboard     │   │
│  │   Dashboard         │                          │   │
│  │                     │   Username               │   │
│  │   Municipal Worker  │   [__________________]   │   │
│  │   Tracking System   │                          │   │
│  │                     │   Password               │   │
│  │   [Hero Image]      │   [__________________] 👁 │   │
│  │   (Park workers)    │                          │   │
│  │                     │   ☐ Remember me          │   │
│  │                     │                          │   │
│  │                     │   [Login Button]         │   │
│  │                     │                          │   │
│  │                     │   Forgot password?       │   │
│  │                     │                          │   │
│  └─────────────────────┴──────────────────────────┘   │
│                                                         │
│  Footer: © 2026 DLH Surabaya                        │
└─────────────────────────────────────────────────────────┘
```

### Features

#### Login Form
- **Username** - Text input, autofocus
- **Password** - Password input with show/hide toggle
- **Remember Me** - Checkbox for extended session
- **Login Button** - Submit button with loading state
- **Forgot Password** - Link (Phase 7)

#### Visual Design
- **Left Panel** - Brand identity
  - Logo (configurable)
  - App name
  - Tagline
  - Hero image or illustration
  - System features list

- **Right Panel** - Login form
  - White card with shadow
  - Centered vertically
  - Responsive sizing

#### States
- **Default** - Empty form
- **Loading** - Submit button shows spinner, form disabled
- **Error** - Show error message above form
  - "Invalid username or password"
  - "Account is inactive"
  - "Too many failed attempts. Try again in X minutes"
- **Success** - Brief success message, redirect to dashboard

#### Validation
- Required field validation
- Real-time error display
- Server-side validation errors
- Rate limiting feedback

### Data Requirements

**API Endpoints:**
```typescript
POST /api/auth/login
  Body: {username: string, password: string}
  Response: {
    access_token: string,
    user: {id, username, full_name, role}
  }
```

**Session Storage:**
- Store JWT token in HttpOnly cookie (secure)
- Store user info in localStorage for quick access
- Store "Remember Me" preference

### User Interactions
- Type username → Validate on blur (check format)
- Type password → Real-time length check
- Click "Show Password" → Toggle visibility
- Press Enter → Submit form
- Click "Login" → Validate → Submit → Redirect
- Click "Forgot Password" → Navigate to password reset (Phase 7)

### Security Features
- HTTPS only
- CSRF protection
- Rate limiting (5 attempts per 15 minutes per IP)
- Account lockout after failed attempts
- Secure password input (no autocomplete)
- Password strength indicator (Phase 7)

### Accessibility
- Proper form labels
- Keyboard navigation
- Screen reader compatible
- Focus indicators
- Error announcements

---

### 10.2 Logout

**Process:** Not a page, but a button action
**Location:** User menu in header

#### Logout Flow
1. User clicks "Logout" in user menu
2. Show confirmation dialog (optional, can skip)
3. Call logout API endpoint
4. Clear JWT token from storage
5. Clear user data from localStorage
6. Clear all cached data
7. Redirect to login page
8. Show "Logged out successfully" message

**API Endpoint:**
```typescript
POST /api/auth/logout
  Headers: Authorization: Bearer {token}
  Response: {success: true}
```

---

## Summary

This comprehensive specification covers all major pages in the SEKAR web dashboard. Each page is designed with:

- **Clear user flows** - Easy navigation and intuitive interactions
- **Responsive design** - Works on desktop, tablet, and mobile (with focus on desktop)
- **Performance** - Optimized loading, caching, and pagination
- **Accessibility** - WCAG 2.1 AA compliant
- **Security** - Role-based access, input validation, secure sessions
- **Extensibility** - Ready for Phase 7 enhancements

The dashboard provides supervisors and administrators with powerful tools to monitor operations, manage resources, and analyze performance effectively.

---

**Document Version:** 1.0
**Last Updated:** January 16, 2026
**Phase:** 6 - Web Dashboard

---

## Phase 2D: Monitoring Page Enhancements

### Updated: `/monitoring` Page

**Route:** `/monitoring`
**Access:** korlap, kepala_rayon, top_management, admin_system, superadmin
**Layout:** Split view — 65% map (left) + 35% side panel (right) at xl breakpoint; stacked at md/sm

#### Map Panel (65%)
- **Engine:** Mapbox GL JS (`mapbox-gl` + `react-map-gl`)
- **Center:** Surabaya (-7.2575, 112.7521), zoom 12, `streets-v12` style
- **Features:**
  - Area polygons with fill opacity 0.1, border 2px; understaffed areas: dashed red border
  - Custom user markers: role-shaped (circle=satgas, shield=linmas, star=korlap), status-colored (active=#15803D, idle=#D97706, outside_area=#9333EA, missing=#DC2626)
  - Supercluster clustering at zoom < 13, severity-weighted cluster color
  - Hover tooltip: name, role, status, last update
  - Click marker: select user, scroll side panel to user, open UserDetailPanel

#### Side Panel (35%)
- **Min width:** 320px, **Max width:** 480px
- **Sections:**
  1. Filter bar (inline: rayon, area, role, status dropdowns)
  2. Status cards (2×2 grid: Active, Idle, Outside Area, Missing — clickable to filter)
  3. User list (virtual scroll, sorted: missing > outside > idle > active)
  4. User detail panel (push navigation, slide 200ms transition)
  5. Location timeline (vertical scroll, click syncs map)

#### Real-Time Updates
- WebSocket subscription to monitoring events
- TanStack Query cache invalidation on `user:location`, `user:status-changed` events
- Toast notification on `user:status-changed` to 'missing'

### New: `/monitoring/config` Page

**Route:** `/monitoring/config`
**Access:** admin_system, superadmin only
**Description:** Admin threshold management page

#### Configuration Form
- **Status Thresholds:**
  - `active_max_age_seconds`: number input (60-600, default 300)
  - `inactive_threshold_seconds`: number input (300-3600, default 900)
  - `missing_threshold_seconds`: number input (1800-7200, default 3600)
  - `location_ping_interval_seconds`: number input (30-300, default 60)
- **Geofencing:**
  - `tolerance_meters`: number input (0-500, default 50)
  - `outside_area_grace_seconds`: number input (0-600, default 120)
- **Alerts:**
  - `low_battery_threshold`: number input (5-50, default 15)
  - `understaffed_notify`: toggle (default true)
  - `missing_notify`: toggle (default true)
- **Map Defaults:**
  - Center coordinates, default zoom, cluster threshold

#### API Integration
- Load: `GET /monitoring/config`
- Save: `PATCH /monitoring/config/:key` per section
- Optimistic update with rollback on error

### Updated: `/areas/[id]` Page

Add a **Boundary Management** tab (admin_system, superadmin only):
- View current area polygon on map
- Edit polygon vertices interactively via Mapbox Draw
- Upload replacement boundary
- API: `GET /areas/:id/boundary`, `PUT /areas/:id/boundary`

### Page Count Update
- Total pages: 21 (was 20, +1: `/monitoring/config`)
**Status:** Ready for Implementation

### Phase 2E: Planned Page Changes (Client Feedback II)

> **Full specification:** See [`specs/phases/phase-2-e-client-feedback-2/web.md`](../phases/phase-2-e-client-feedback-2/web.md)

#### Modified Pages

| Page | Changes |
|------|---------|
| `/login` | `username` → `identifier` (accepts phone or username) |
| `/users/[id]` | Profile picture upload, phone number field, multi-area assignment for korlap |
| `/users/new` | Profile picture upload, phone number field |
| `/monitoring` | Profile pics in markers, multi-area korlap filter, admin_data access (rayon-scoped) |
| `/overtime` | Show overtime shift data (clock-in/out times, linked shift) |
| `/tasks/[id]` | Add audit trail / revision history timeline |
| `/activities/[id]` | Add audit trail section |

#### New Components

| Component | Description |
|-----------|-------------|
| `ProfilePictureUpload` | Drag-and-drop image upload with preview |
| `MultiAreaSelect` | Multi-select for korlap area assignment |
| `AuditTimeline` | Vertical timeline for audit log entries |

#### Route Access Updates

| Route | New Access (Phase 2E) |
|-------|----------------------|
| `/monitoring` | **+admin_data** (rayon-scoped, same as kepala_rayon) |

#### Page Count (Phase 2E)
- Total pages: 21 (no new pages, 7 modified)
