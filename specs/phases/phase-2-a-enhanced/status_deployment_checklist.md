# Phase 2 - Deployment & Testing Checklist

**Purpose:** Comprehensive deployment procedures and manual testing checklist for Phase 2 verification.
**Last Updated:** January 27, 2026
**Status:** Phase 2 Complete - Ready for manual testing ✅

---

## Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| `[ ]` | Not tested | Test case not yet executed |
| `[x]` | Passed | Test case passed |
| `[!]` | Failed | Test case failed (needs fix) |
| `[-]` | Skipped | Test case skipped (not applicable) |

---

## Test Environment Setup

### Test Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Password123! |
| KepalaRayon | kepalarayon1 | rayon123 |
| KoordinatorLapangan | koordinator1 | koordinator123 |
| Worker 1 | worker1 | Password123! |
| Worker 2 | worker2 | Password123! |
| Linmas 1 | linmas1 | linmas123 |

### API Testing Tools

- **Swagger UI:** http://localhost:3000/api/docs
- **Adminer (DB):** http://localhost:8080
- **LocalStack (S3):** http://localhost:4566

### Setup Commands

```bash
# Start all services
./local-start.sh

# OR manually:
cd infra && docker-compose up -d
cd be && npm run start:dev

# Seed Phase 2 data
cd be && npm run seed:phase2

# Start mobile app
cd fe/mobile && npm start

# Start web dashboard
cd fe/web && npm run dev
```

---

## Pre-Deployment Tests (Run Locally)

### Backend Tests

```bash
cd be

# 1. Run all tests
npm test
# Expected: 845+ tests passing, 0 failures

# 2. Check test coverage
npm run test:cov
# Expected: >80% overall coverage

# 3. Lint check
npm run lint
# Expected: 72 errors (unused vars in tests), 162 warnings (acceptable)

# 4. Build verification
npm run build
# Expected: Successful compilation, 0 TypeScript errors

# 5. Run E2E tests
npm run test:e2e
# Expected: All E2E flows passing
```

### Mobile Tests

```bash
cd fe/mobile

# 1. Run all tests
npm test
# Expected: 1751+ tests passing (10 WebSocket mock tests non-blocking)

# 2. Lint check
npm run lint
# Expected: 151 issues (non-blocking, mostly test files)

# 3. Android build
cd android && ./gradlew assembleRelease
# Expected: Successful APK build

# iOS build (macOS only)
cd ios && pod install && cd .. && npm run ios
# Expected: Successful build
```

### Web Tests

```bash
cd fe/web

# 1. Install dependencies
npm install

# 2. Build verification
npm run build
# Expected: Successful Next.js production build

# 3. Run tests
npm test
# Expected: 11 component tests passing

# 4. Lint check
npm run lint
# Expected: 0 errors
```

---

## Part 1: Backend API Testing - Phase 2A (Foundation)

### 1.1 Rayons Module (6 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 1 | POST /api/v1/rayons (Admin) - Create rayon "Test Rayon" | 201 Created | [ ] | |
| 2 | POST /api/v1/rayons - Duplicate name | 409 Conflict | [ ] | |
| 3 | POST /api/v1/rayons - Invalid data | 400 Bad Request | [ ] | |
| 4 | POST /api/v1/rayons (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 5 | GET /api/v1/rayons - List all | 200 OK, 7+ rayons | [ ] | |
| 6 | GET /api/v1/rayons/:id - Valid ID | 200 OK | [ ] | |
| 7 | GET /api/v1/rayons/:id - Invalid UUID | 400 Bad Request | [ ] | |
| 8 | GET /api/v1/rayons/:id - Not found | 404 Not Found | [ ] | |
| 9 | PATCH /api/v1/rayons/:id (Admin) - Update name | 200 OK | [ ] | |
| 10 | PATCH /api/v1/rayons/:id - Duplicate name | 409 Conflict | [ ] | |
| 11 | PATCH /api/v1/rayons/:id (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 12 | DELETE /api/v1/rayons/:id (Admin) - Soft delete | 200 OK | [ ] | |
| 13 | DELETE /api/v1/rayons/:id - Has areas | 400 Bad Request | [ ] | |
| 14 | GET /api/v1/rayons/:id/areas - Get areas | 200 OK | [ ] | |
| 15 | GET /api/v1/rayons/:id/areas - No areas | 200 OK, empty array | [ ] | |

### 1.2 Shift Definitions Module (2 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 16 | GET /api/v1/shift-definitions - List all | 200 OK, 3 shifts | [ ] | |
| 17 | GET /api/v1/shift-definitions - Verify times | Shift 1: 06:00-15:00, Shift 2: 15:00-23:00, Shift 3: 21:00-05:00 | [ ] | |
| 18 | GET /api/v1/shift-definitions/:id - Valid ID | 200 OK | [ ] | |
| 19 | GET /api/v1/shift-definitions/:id - Invalid ID | 400 Bad Request | [ ] | |
| 20 | GET /api/v1/shift-definitions/:id - Not found | 404 Not Found | [ ] | |

### 1.3 Activity Types Module (4 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 21 | POST /api/v1/activity-types (Admin) - Create Worker activity | 201 Created | [ ] | |
| 22 | POST /api/v1/activity-types (Admin) - Create Linmas activity | 201 Created | [ ] | |
| 23 | POST /api/v1/activity-types - Duplicate code | 409 Conflict | [ ] | |
| 24 | POST /api/v1/activity-types (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 25 | GET /api/v1/activity-types - List all | 200 OK, 10+ types | [ ] | |
| 26 | GET /api/v1/activity-types?role=Worker - Filter | 200 OK, Worker only | [ ] | |
| 27 | GET /api/v1/activity-types?role=Linmas - Filter | 200 OK, Linmas only | [ ] | |
| 28 | GET /api/v1/activity-types?role=Worker,Linmas | 200 OK, both | [ ] | |
| 29 | PATCH /api/v1/activity-types/:id (Admin) - Update | 200 OK | [ ] | |
| 30 | PATCH /api/v1/activity-types/:id - Change roles | 200 OK | [ ] | |
| 31 | DELETE /api/v1/activity-types/:id (Admin) | 200 OK | [ ] | |
| 32 | DELETE /api/v1/activity-types/:id - Has reports | 400 Bad Request | [ ] | |

### 1.4 Area Staff Requirements Module (4 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 33 | POST /api/v1/areas/:id/staff-requirements (Admin) | 201 Created | [ ] | |
| 34 | POST - Weekday requirement (6 Workers, 2 Linmas) | 201 Created | [ ] | |
| 35 | POST - Weekend requirement | 201 Created | [ ] | |
| 36 | POST - Duplicate (area+shift+role+day_type) | 409 Conflict | [ ] | |
| 37 | POST (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 38 | GET /api/v1/areas/:id/staff-requirements - List | 200 OK | [ ] | |
| 39 | GET?shift=SHIFT1 - Filter by shift | 200 OK | [ ] | |
| 40 | GET?role=Worker - Filter by role | 200 OK | [ ] | |
| 41 | PATCH /:reqId (Admin) - Update | 200 OK | [ ] | |
| 42 | PATCH - Change required_count | 200 OK | [ ] | |
| 43 | DELETE /:reqId (Admin) - Delete | 200 OK | [ ] | |

### 1.5 Worker Schedules Module (5 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 44 | POST /api/v1/worker-schedules (Admin) | 201 Created | [ ] | |
| 45 | POST - Schedule worker to area+shift | 201 Created | [ ] | |
| 46 | POST - Ongoing schedule (no end_date) | 201 Created, end_date null | [ ] | |
| 47 | POST - Fixed-term (with end_date) | 201 Created | [ ] | |
| 48 | POST - Conflict: same worker/date/shift | 409 Conflict | [ ] | |
| 49 | POST - End before start | 400 Bad Request | [ ] | |
| 50 | POST - Past effective date | 400 Bad Request | [ ] | |
| 51 | POST (KoordinatorLapangan) - Own area | 201 Created | [ ] | |
| 52 | POST (KoordinatorLapangan) - Other area | 403 Forbidden | [ ] | |
| 53 | POST (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 54 | GET /api/v1/worker-schedules - List (Admin) | 200 OK, all schedules | [ ] | |
| 55 | GET (KoordinatorLapangan) - Own area only | 200 OK, filtered | [ ] | |
| 56 | GET?date=2026-02-01 - Filter by date | 200 OK | [ ] | |
| 57 | GET?areaId=... - Filter by area | 200 OK | [ ] | |
| 58 | GET /api/v1/worker-schedules/my (Worker) | 200 OK, my schedule | [ ] | |
| 59 | GET /my - No schedule | 200 OK, empty | [ ] | |
| 60 | GET /area/:areaId - Area schedules | 200 OK | [ ] | |
| 61 | PATCH /:id (Admin) - Update | 200 OK | [ ] | |
| 62 | PATCH - Change area | 200 OK | [ ] | |
| 63 | PATCH - Change shift | 200 OK | [ ] | |
| 64 | PATCH - Extend end_date | 200 OK | [ ] | |
| 65 | DELETE /:id (Admin) - Delete | 200 OK | [ ] | |
| 66 | DELETE (KoordinatorLapangan) - Own area | 200 OK | [ ] | |
| 67 | DELETE (KoordinatorLapangan) - Other area | 403 Forbidden | [ ] | |

### 1.6 Special Day Overrides Module (5 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 68 | POST /api/v1/special-day-overrides (Admin) | 201 Created | [ ] | |
| 69 | POST - Indonesian Independence Day | 201 Created, "Hari Kemerdekaan" | [ ] | |
| 70 | POST - Duplicate date | 409 Conflict | [ ] | |
| 71 | POST (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 72 | GET /api/v1/special-day-overrides - List | 200 OK | [ ] | |
| 73 | GET?date=2026-08-17 - Specific date | 200 OK, override found | [ ] | |
| 74 | GET?date=2026-01-01 - Regular day | 200 OK, no override | [ ] | |
| 75 | GET?startDate=...&endDate=... - Range | 200 OK | [ ] | |
| 76 | PATCH /:id (Admin) - Update | 200 OK | [ ] | |
| 77 | PATCH - Change day_type | 200 OK | [ ] | |
| 78 | DELETE /:id (Admin) - Delete | 200 OK | [ ] | |
| 79 | GET /check?date=2026-08-17 - Helper | 200 OK, day_type: "HOLIDAY" | [ ] | |
| 80 | GET /check?date=2026-02-01 - Weekday | 200 OK, day_type: "WEEKDAY" | [ ] | |

---

## Part 2: Backend API Testing - Phase 2B (Core Features)

### 2.1 Tasks Module (11 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 81 | POST /api/v1/tasks (KoordinatorLapangan) | 201 Created | [ ] | |
| 82 | POST - Task with all fields | 201 Created | [ ] | |
| 83 | POST (Admin) - Any area | 201 Created | [ ] | |
| 84 | POST (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 85 | POST - Missing fields | 400 Bad Request | [ ] | |
| 86 | POST - Invalid priority | 400 Bad Request | [ ] | |
| 87 | POST - Past deadline | 400 Bad Request | [ ] | |
| 88 | GET /api/v1/tasks (Admin) - All tasks | 200 OK | [ ] | |
| 89 | GET (KoordinatorLapangan) - Own area | 200 OK, filtered | [ ] | |
| 90 | GET (Worker) - Assigned tasks | 200 OK, my tasks | [ ] | |
| 91 | GET?status=pending - Filter | 200 OK | [ ] | |
| 92 | GET?priority=high,urgent - Filter | 200 OK | [ ] | |
| 93 | GET?areaId=... - Filter | 200 OK | [ ] | |
| 94 | GET /my-tasks (Worker) | 200 OK | [ ] | |
| 95 | GET /:id - Task detail | 200 OK | [ ] | |
| 96 | GET /:id - Not found | 404 Not Found | [ ] | |
| 97 | POST /:id/assign (KoordinatorLapangan) | 200 OK, status: assigned | [ ] | |
| 98 | POST /:id/assign - Worker not found | 404 Not Found | [ ] | |
| 99 | POST /:id/assign - Already assigned | 400 Bad Request | [ ] | |
| 100 | POST /:id/assign (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 101 | POST /:id/accept (Worker) | 200 OK, status: accepted | [ ] | |
| 102 | POST /:id/accept - Not my task | 403 Forbidden | [ ] | |
| 103 | POST /:id/accept - Not assigned | 400 Bad Request | [ ] | |
| 104 | POST /:id/decline (Worker) - With reason | 200 OK, status: declined | [ ] | |
| 105 | POST /:id/decline - Missing reason | 400 Bad Request | [ ] | |
| 106 | POST /:id/start (Worker) | 200 OK, status: in_progress | [ ] | |
| 107 | POST /:id/start - Not accepted | 400 Bad Request | [ ] | |
| 108 | POST /:id/complete - With photo+GPS | 200 OK, status: completed | [ ] | |
| 109 | POST /:id/complete - Missing photo | 400 Bad Request | [ ] | |
| 110 | POST /:id/complete - Missing GPS | 400 Bad Request | [ ] | |
| 111 | POST /:id/complete - GPS outside area | 400 Bad Request | [ ] | |
| 112 | POST /:id/complete - Not in_progress | 400 Bad Request | [ ] | |
| 113 | PATCH /:id (KoordinatorLapangan) - Update | 200 OK | [ ] | |
| 114 | PATCH /:id - Update deadline | 200 OK | [ ] | |
| 115 | PATCH /:id (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 116 | DELETE /:id (Admin) - Delete | 200 OK | [ ] | |
| 117 | DELETE /:id (KoordinatorLapangan) - Own | 200 OK | [ ] | |
| 118 | DELETE /:id (Worker) - Forbidden | 403 Forbidden | [ ] | |

### 2.2 Notifications Module (5 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 119 | POST /api/v1/notifications/register (Worker) | 201 Created | [ ] | |
| 120 | POST /register - Update existing | 200 OK | [ ] | |
| 121 | POST /register - Invalid token | 400 Bad Request | [ ] | |
| 122 | POST /register - Missing device info | 400 Bad Request | [ ] | |
| 123 | DELETE /unregister (Worker) | 200 OK | [ ] | |
| 124 | DELETE /unregister - Not found | 404 Not Found | [ ] | |
| 125 | POST /broadcast (Admin) | 200 OK | [ ] | |
| 126 | POST /broadcast - To role | 200 OK, sent to role | [ ] | |
| 127 | POST /broadcast (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 128 | POST /broadcast - Missing message | 400 Bad Request | [ ] | |
| 129 | GET /api/v1/notifications (Worker) | 200 OK, my notifications | [ ] | |
| 130 | GET?read=false - Unread only | 200 OK | [ ] | |
| 131 | GET?type=task_assigned - Filter | 200 OK | [ ] | |
| 132 | PATCH /:id/read (Worker) - Mark read | 200 OK | [ ] | |
| 133 | PATCH /:id/read - Already read | 200 OK, idempotent | [ ] | |
| 134 | PATCH /mark-all-read (Worker) | 200 OK | [ ] | |

### 2.3 Monitoring Module (4 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 135 | GET /api/v1/monitoring/city (Admin) | 200 OK, all rayons | [ ] | |
| 136 | GET /city (TopManagement) | 200 OK | [ ] | |
| 137 | GET /city (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 138 | GET /city - Stats include metrics | 200 OK, all metrics | [ ] | |
| 139 | GET /rayon/:id (Admin) | 200 OK | [ ] | |
| 140 | GET /rayon/:id (KepalaRayon) - Own | 200 OK | [ ] | |
| 141 | GET /rayon/:id (KepalaRayon) - Other | 403 Forbidden | [ ] | |
| 142 | GET /rayon/:id - Stats complete | 200 OK, all metrics | [ ] | |
| 143 | GET /area/:id (KoordinatorLapangan) - Own | 200 OK | [ ] | |
| 144 | GET /area/:id - Other area | 403 Forbidden | [ ] | |
| 145 | GET /area/:id - Required vs actual | 200 OK, staffing comparison | [ ] | |
| 146 | GET /area/:id - Understaffed flag | 200 OK, true/false | [ ] | |
| 147 | GET /live-workers (Admin) | 200 OK, positions | [ ] | |
| 148 | GET /live-workers (KepalaRayon) - Own | 200 OK, filtered | [ ] | |
| 149 | GET /live-workers?areaId=... - Filter | 200 OK | [ ] | |
| 150 | GET /live-workers - All fields | 200 OK, complete data | [ ] | |

### 2.4 KMZ Import Module (3 endpoints)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 151 | POST /api/v1/import/kmz/upload (Admin) | 200 OK, sessionId | [ ] | |
| 152 | POST /upload - 10 polygons | 200 OK, 10 parsed | [ ] | |
| 153 | POST /upload - Invalid KMZ | 400 Bad Request | [ ] | |
| 154 | POST /upload - File >10MB | 400 Bad Request | [ ] | |
| 155 | POST /upload - >100 polygons | 400 Bad Request | [ ] | |
| 156 | POST /upload (Worker) - Forbidden | 403 Forbidden | [ ] | |
| 157 | GET /preview/:sessionId (Admin) | 200 OK, GeoJSON | [ ] | |
| 158 | GET /preview/:sessionId - Not found | 404 Not Found | [ ] | |
| 159 | GET /preview/:sessionId - Expired | 410 Gone | [ ] | |
| 160 | POST /confirm (Admin) | 201 Created, areas created | [ ] | |
| 161 | POST /confirm - Assign rayon | 201 Created, rayon_id set | [ ] | |
| 162 | POST /confirm - Invalid sessionId | 404 Not Found | [ ] | |
| 163 | POST /confirm - Duplicate names | 409 Conflict | [ ] | |

### 2.5 WebSocket Gateway (Real-Time Events)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 164 | Connect to /events - Worker | Connection established | [ ] | |
| 165 | Connect - Without JWT | Connection rejected | [ ] | |
| 166 | Emit 'subscribe:area' (Worker) - Own | Subscribed | [ ] | |
| 167 | Emit 'subscribe:area' - Other area | Rejected | [ ] | |
| 168 | Emit 'subscribe:rayon' (KepalaRayon) | Subscribed | [ ] | |
| 169 | Emit 'subscribe:rayon' (Worker) | Rejected | [ ] | |
| 170 | Listen 'worker:location' | Event received | [ ] | |
| 171 | Listen 'worker:clock-in' | Event received | [ ] | |
| 172 | Listen 'worker:clock-out' | Event received | [ ] | |
| 173 | Listen 'area:staffing' | Event received | [ ] | |
| 174 | Listen 'task:assigned' | Event received | [ ] | |
| 175 | Listen 'task:completed' | Event received | [ ] | |
| 176 | Emit 'unsubscribe:area' | Unsubscribed | [ ] | |
| 177 | Disconnect - Gracefully | Cleaned up | [ ] | |

---

## Part 3: Mobile App Testing - Phase 2C (Mobile Updates)

### 3.1 Neo Brutalism Components

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 178 | NBButton - Primary variant | Blue, white text, shadow | [ ] | |
| 179 | NBButton - Secondary variant | White, black text, border | [ ] | |
| 180 | NBButton - Danger variant | Red, white text | [ ] | |
| 181 | NBButton - Press animation | Shadow reduces 6px→2px | [ ] | |
| 182 | NBButton - Disabled state | Gray, no press | [ ] | |
| 183 | NBButton - Loading state | Spinner, disabled | [ ] | |
| 184 | NBCard - Elevated variant | Shadow, border | [ ] | |
| 185 | NBCard - Outlined variant | Border, no shadow | [ ] | |
| 186 | NBCard - Filled variant | Colored background | [ ] | |
| 187 | NBCard - Press effect | Shadow animates | [ ] | |
| 188 | NBBadge - Small size | Compact | [ ] | |
| 189 | NBBadge - Medium size | Standard | [ ] | |
| 190 | NBBadge - Success color | Green | [ ] | |
| 191 | NBBadge - Warning color | Orange | [ ] | |
| 192 | NBBadge - Danger color | Red | [ ] | |
| 193 | NBTab - Active tab | Bold, bottom border | [ ] | |
| 194 | NBTab - Inactive tab | Normal, no border | [ ] | |
| 195 | NBTab - Switch tabs | Smooth transition | [ ] | |
| 196 | NBTextInput - With label | Label above | [ ] | |
| 197 | NBTextInput - Error state | Red border, message | [ ] | |
| 198 | NBTextInput - Success state | Green border, checkmark | [ ] | |
| 199 | NBTextInput - Disabled state | Gray, not editable | [ ] | |

### 3.2 Worker Home Screen (Tabbed Interface)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 200 | Worker Home - Login as worker1 | Tabbed home screen | [ ] | |
| 201 | Worker Home - See "Tugas" and "Laporan" tabs | Two tabs visible | [ ] | |
| 202 | Worker Home - Default tab "Tugas" | Tasks tab active | [ ] | |
| 203 | Worker Home - Shift info | Shift, area, status shown | [ ] | |
| 204 | Worker Home - Tasks tab - List tasks | Task cards with badges | [ ] | |
| 205 | Worker Home - No tasks | Empty state shown | [ ] | |
| 206 | Worker Home - Task card info | Title, deadline, priority | [ ] | |
| 207 | Worker Home - "Kerjakan" button | Button enabled | [ ] | |
| 208 | Worker Home - Sort by priority | Urgent/High at top | [ ] | |
| 209 | Worker Home - Switch to "Laporan" tab | Reports displayed | [ ] | |
| 210 | Worker Home - Reports tab - List | My reports shown | [ ] | |
| 211 | Worker Home - No reports | Empty state | [ ] | |
| 212 | Worker Home - "+ Tambah Laporan" button | Visible, enabled | [ ] | |
| 213 | Worker Home - Pull refresh (Tasks) | Reloads tasks | [ ] | |
| 214 | Worker Home - Pull refresh (Reports) | Reloads reports | [ ] | |
| 215 | Worker Home - Offline indicator | Banner when offline | [ ] | |

### 3.3 Task Management Screens

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 216 | Task Detail - Tap "Kerjakan" | Navigate to TaskDetailScreen | [ ] | |
| 217 | Task Detail - Display title, description | All text visible | [ ] | |
| 218 | Task Detail - Priority badge | Color-coded | [ ] | |
| 219 | Task Detail - Deadline countdown | "Tenggat: 2 jam lagi" | [ ] | |
| 220 | Task Detail - Activity type | Activity shown | [ ] | |
| 221 | Task Detail - Area name | Area shown | [ ] | |
| 222 | Task Detail - "Terima Tugas" button | Enabled (assigned) | [ ] | |
| 223 | Task Detail - "Tolak Tugas" button | Enabled (assigned) | [ ] | |
| 224 | Task Detail - Tap "Terima Tugas" | Status→accepted, "Mulai" shown | [ ] | |
| 225 | Task Detail - Tap "Tolak Tugas" | Reason dialog | [ ] | |
| 226 | Task Detail - Decline with reason | Status→declined | [ ] | |
| 227 | Task Detail - "Mulai Tugas" button | Enabled (accepted) | [ ] | |
| 228 | Task Detail - Tap "Mulai Tugas" | Status→in_progress, navigate | [ ] | |
| 229 | Task Complete - Camera button | Opens camera | [ ] | |
| 230 | Task Complete - Take photo | Thumbnail displayed | [ ] | |
| 231 | Task Complete - GPS captured | Lat/lng shown | [ ] | |
| 232 | Task Complete - GPS accuracy | Accuracy in meters | [ ] | |
| 233 | Task Complete - GPS accuracy >50m warning | Warning shown | [ ] | |
| 234 | Task Complete - Completion notes | Can enter notes | [ ] | |
| 235 | Task Complete - "Selesaikan" button | Enabled (photo+GPS) | [ ] | |
| 236 | Task Complete - Submit | Task completed | [ ] | |
| 237 | Task Complete - Success | Toast, navigate back | [ ] | |
| 238 | Task Complete - Failed (network) | Error, retry option | [ ] | |
| 239 | Task Complete - Offline | Queued for sync | [ ] | |

### 3.4 Enhanced Supervisor Map (Koordinator/KepalaRayon)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 240 | Supervisor Map - Login koordinator1 | MapDashboardScreen | [ ] | |
| 241 | Supervisor Map - Area polygon | Boundary shown | [ ] | |
| 242 | Supervisor Map - Area marker (📍) | Center marker, label | [ ] | |
| 243 | Supervisor Map - Worker markers (👷) | Positions visible | [ ] | |
| 244 | Supervisor Map - Linmas markers (🛡️) | Positions visible | [ ] | |
| 245 | Supervisor Map - Online (green) | Green markers | [ ] | |
| 246 | Supervisor Map - Offline (gray) | Gray markers | [ ] | |
| 247 | Supervisor Map - Unknown (yellow) | Yellow markers | [ ] | |
| 248 | Supervisor Map - Tap worker marker | Info popup | [ ] | |
| 249 | Supervisor Map - Popup info | Name, role, status, last update | [ ] | |
| 250 | Supervisor Map - Staffing card | Required vs actual | [ ] | |
| 251 | Supervisor Map - Staffing counts | Satgas 4/6, Linmas 2/2 | [ ] | |
| 252 | Supervisor Map - Understaffed warning | Red banner shown | [ ] | |
| 253 | Supervisor Map - Fully staffed | Green/no warning | [ ] | |
| 254 | Supervisor Map - Toggle "Tampilkan Area" | Shows/hides polygons | [ ] | |
| 255 | Supervisor Map - Filter by status | Buttons: Semua, Online, Offline | [ ] | |
| 256 | Supervisor Map - Real-time location (WS) | Markers move | [ ] | |
| 257 | Supervisor Map - Real-time clock-in | Marker appears | [ ] | |
| 258 | Supervisor Map - Real-time clock-out | Marker disappears/gray | [ ] | |
| 259 | Supervisor Map - Zoom to fit | Map adjusts | [ ] | |

---

## Part 4: Web Dashboard Testing - Phase 2D

### 4.1 Authentication & Layout

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 260 | Web - Access / (root) | Redirect to /login | [ ] | |
| 261 | Web - Access /login | Login page | [ ] | |
| 262 | Web - Login admin/Password123! | Redirect to /dashboard | [ ] | |
| 263 | Web - Login invalid | Error message | [ ] | |
| 264 | Web - JWT in httpOnly cookie | Cookie set | [ ] | |
| 265 | Web - Protected route without JWT | Redirect to /login | [ ] | |
| 266 | Web - Logout | JWT cleared | [ ] | |
| 267 | Web - Sidebar visible | Menu items shown | [ ] | |
| 268 | Web - Sidebar (Admin) | All items visible | [ ] | |
| 269 | Web - Sidebar (KoordinatorLapangan) | Limited items | [ ] | |
| 270 | Web - Header user name | Name shown | [ ] | |
| 271 | Web - Header role badge | Role displayed | [ ] | |
| 272 | Web - Responsive (mobile) | Hamburger menu | [ ] | |

### 4.2 Dashboard Home

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 273 | Dashboard - Access (Admin) | City-wide stats | [ ] | |
| 274 | Dashboard - Access (KepalaRayon) | Own rayon stats | [ ] | |
| 275 | Dashboard - Access (KoordinatorLapangan) | Own area stats | [ ] | |
| 276 | Dashboard - Stats cards | Total/Online/Offline Workers | [ ] | |
| 277 | Dashboard - Understaffed Areas | Count displayed | [ ] | |
| 278 | Dashboard - Quick actions | Create Task, View Reports | [ ] | |
| 279 | Dashboard - Recent activity | Events shown | [ ] | |

### 4.3 User Management

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 280 | Users - Access /users (Admin) | Users list | [ ] | |
| 281 | Users - Access (Worker) - Forbidden | 403 or redirect | [ ] | |
| 282 | Users - Table columns | Name, username, role, status | [ ] | |
| 283 | Users - Pagination (20/page) | Next/Previous | [ ] | |
| 284 | Users - Search by name | Filtered results | [ ] | |
| 285 | Users - Filter by role | Dropdown, filtered | [ ] | |
| 286 | Users - Sort by name | Sorted A-Z | [ ] | |
| 287 | Users - "Tambah Pengguna" | Navigate to /users/new | [ ] | |
| 288 | Users - Create form | All fields present | [ ] | |
| 289 | Users - Create - Select role (Worker) | Role selected | [ ] | |
| 290 | Users - Create - Assign area | Area dropdown | [ ] | |
| 291 | Users - Create - Submit valid | User created | [ ] | |
| 292 | Users - Create - Duplicate username | Error message | [ ] | |
| 293 | Users - Create - Password <8 chars | Validation error | [ ] | |
| 294 | Users - Click user row | Navigate to /users/:id | [ ] | |
| 295 | Users - Edit form | Pre-filled data | [ ] | |
| 296 | Users - Edit - Change role | Role updated | [ ] | |
| 297 | Users - Edit - Change area | Area updated | [ ] | |
| 298 | Users - Edit - Submit | User updated | [ ] | |
| 299 | Users - Delete button | Confirmation modal | [ ] | |
| 300 | Users - Confirm delete | Soft deleted | [ ] | |
| 301 | Users - Cancel delete | Modal closed | [ ] | |

### 4.4 Area Management

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 302 | Areas - Access /areas (Admin) | Areas list | [ ] | |
| 303 | Areas - Table columns | Name, type, rayon, coverage | [ ] | |
| 304 | Areas - Filter by rayon | Dropdown | [ ] | |
| 305 | Areas - Filter by type | Type filter | [ ] | |
| 306 | Areas - "Tambah Area" | Navigate to /areas/new | [ ] | |
| 307 | Areas - Create form | Fields present | [ ] | |
| 308 | Areas - Create - Map editor | Google Maps displayed | [ ] | |
| 309 | Areas - Create - Draw polygon | Drawing tools | [ ] | |
| 310 | Areas - Create - Complete polygon | Area calculated | [ ] | |
| 311 | Areas - Create - Submit with polygon | Area created | [ ] | |
| 312 | Areas - Create - Without polygon | Validation error | [ ] | |
| 313 | Areas - Edit - Modify polygon | Can edit | [ ] | |
| 314 | Areas - Edit - Delete polygon | Can delete/redraw | [ ] | |
| 315 | Areas - "Import KMZ" | Navigate to /areas/import | [ ] | |
| 316 | Areas - Import - Upload file | File dialog | [ ] | |
| 317 | Areas - Import - Valid KMZ | Preview on map | [ ] | |
| 318 | Areas - Import - Assign rayon | Rayon dropdown | [ ] | |
| 319 | Areas - Import - Confirm | Bulk created | [ ] | |
| 320 | Areas - Import - Invalid file | Error message | [ ] | |

### 4.5 Rayon Management

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 321 | Rayons - Access /rayons (Admin) | Rayons list | [ ] | |
| 322 | Rayons - Table columns | Name, code, #areas, #workers | [ ] | |
| 323 | Rayons - "Tambah Rayon" | Create modal | [ ] | |
| 324 | Rayons - Create form | Name, code, description | [ ] | |
| 325 | Rayons - Create - Submit | Rayon created | [ ] | |
| 326 | Rayons - Create - Duplicate code | Error message | [ ] | |
| 327 | Rayons - Click row | Navigate to /rayons/:id | [ ] | |
| 328 | Rayons - Detail - Stats card | #areas, #workers | [ ] | |
| 329 | Rayons - Detail - Areas list | List shown | [ ] | |
| 330 | Rayons - Detail - Workers list | List shown | [ ] | |
| 331 | Rayons - Edit button | Edit modal | [ ] | |
| 332 | Rayons - Edit - Submit | Updated | [ ] | |
| 333 | Rayons - Delete button | Confirmation | [ ] | |
| 334 | Rayons - Delete with areas | Error: cannot delete | [ ] | |

### 4.6 Schedule Management

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 335 | Schedules - Access /schedules (Admin) | Schedules list | [ ] | |
| 336 | Schedules - Table columns | Worker, area, shift, dates | [ ] | |
| 337 | Schedules - Filter by area | Area dropdown | [ ] | |
| 338 | Schedules - Filter by shift | Shift dropdown | [ ] | |
| 339 | Schedules - Filter by date range | Date pickers | [ ] | |
| 340 | Schedules - View toggle: List/Calendar | Toggle buttons | [ ] | |
| 341 | Schedules - Calendar view | Month calendar | [ ] | |
| 342 | Schedules - Calendar - Workers per day | Worker badges | [ ] | |
| 343 | Schedules - Calendar - Color-coded | Blue/Green/Purple shifts | [ ] | |
| 344 | Schedules - Calendar - Click day | Day modal | [ ] | |
| 345 | Schedules - Calendar - Day detail | All schedules | [ ] | |
| 346 | Schedules - Calendar - Prev/next month | Calendar updates | [ ] | |
| 347 | Schedules - Calendar - "Today" | Highlighted | [ ] | |
| 348 | Schedules - "Buat Jadwal Baru" | Navigate to /schedules/new | [ ] | |
| 349 | Schedules - Create form | Worker, area, shift, dates | [ ] | |
| 350 | Schedules - Create - Worker dropdown (Admin) | All workers | [ ] | |
| 351 | Schedules - Create - Worker (Koordinator) | Own area only | [ ] | |
| 352 | Schedules - Create - Area (Admin) | All areas | [ ] | |
| 353 | Schedules - Create - Area (Koordinator) | Own area | [ ] | |
| 354 | Schedules - Create - Shift dropdown | 3 shifts | [ ] | |
| 355 | Schedules - Create - Effective date | Today or future | [ ] | |
| 356 | Schedules - Create - End date (optional) | Can be null | [ ] | |
| 357 | Schedules - Create - End before start | Validation error | [ ] | |
| 358 | Schedules - Create - Conflict detection | Error: conflict | [ ] | |
| 359 | Schedules - Create - Staff requirement warning | Info message | [ ] | |
| 360 | Schedules - Create - Submit | Schedule created | [ ] | |
| 361 | Schedules - Edit | Navigate to /schedules/:id/edit | [ ] | |
| 362 | Schedules - Edit - Change area | Area updated | [ ] | |
| 363 | Schedules - Edit - Extend end_date | End date updated | [ ] | |
| 364 | Schedules - Delete | Confirmation, deleted | [ ] | |

### 4.7 Task Management (Web)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 365 | Tasks - Access /tasks (Admin) | Tasks list | [ ] | |
| 366 | Tasks - Access (Koordinator) | Own area only | [ ] | |
| 367 | Tasks - Table columns | Title, priority, status, assigned, deadline | [ ] | |
| 368 | Tasks - Filter by status | Status dropdown | [ ] | |
| 369 | Tasks - Filter by priority | Priority filter | [ ] | |
| 370 | Tasks - Filter by area | Area filter (Admin) | [ ] | |
| 371 | Tasks - Sort by deadline | Sorted urgent first | [ ] | |
| 372 | Tasks - Priority badges | Red/Orange/Yellow/Gray | [ ] | |
| 373 | Tasks - Status badges | Colored by status | [ ] | |
| 374 | Tasks - "Buat Tugas" | Create modal | [ ] | |
| 375 | Tasks - Create form | All fields | [ ] | |
| 376 | Tasks - Create - Select priority | Dropdown | [ ] | |
| 377 | Tasks - Create - Set deadline | Date+time picker | [ ] | |
| 378 | Tasks - Create - Select activity | Dropdown filtered | [ ] | |
| 379 | Tasks - Create - Assign worker (optional) | Worker dropdown | [ ] | |
| 380 | Tasks - Create - Submit | Task created | [ ] | |
| 381 | Tasks - Click row | Navigate to /tasks/:id | [ ] | |
| 382 | Tasks - Detail - All info | Complete data | [ ] | |
| 383 | Tasks - Detail - Completion info | Photo, GPS, notes | [ ] | |
| 384 | Tasks - Detail - "Assign" button | Assign modal | [ ] | |
| 385 | Tasks - Detail - Assign to worker | Worker selected, submitted | [ ] | |
| 386 | Tasks - Detail - "Delete" button | Confirmation, deleted | [ ] | |

### 4.8 Report Management (Web)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 387 | Reports - Access /reports (Koordinator) | Reports list | [ ] | |
| 388 | Reports - Table columns | Date, worker, activity, area, status | [ ] | |
| 389 | Reports - Filter by status | Pending/Approved/Rejected | [ ] | |
| 390 | Reports - Filter by date range | Date pickers | [ ] | |
| 391 | Reports - Filter by worker | Worker search | [ ] | |
| 392 | Reports - Click row | Navigate to /reports/:id | [ ] | |
| 393 | Reports - Detail - Worker info | Name, avatar | [ ] | |
| 394 | Reports - Detail - Activity, description | All text | [ ] | |
| 395 | Reports - Detail - Photo gallery | Thumbnails clickable | [ ] | |
| 396 | Reports - Detail - GPS on map | Marker shown | [ ] | |
| 397 | Reports - Detail - Linked task | Task link/badge | [ ] | |
| 398 | Reports - Detail - "Approve" button | Enabled (pending) | [ ] | |
| 399 | Reports - Detail - "Reject" button | Enabled (pending) | [ ] | |
| 400 | Reports - Approve | Status→approved | [ ] | |
| 401 | Reports - Reject | Reason textarea, submit | [ ] | |

### 4.9 Monitoring Dashboard (Web)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 402 | Monitoring - Access /monitoring (Admin) | City-wide map | [ ] | |
| 403 | Monitoring - Real-time map | Google Maps, markers | [ ] | |
| 404 | Monitoring - Worker marker colors | Green/Gray/Yellow | [ ] | |
| 405 | Monitoring - Area polygons | Boundaries visible | [ ] | |
| 406 | Monitoring - Click worker marker | Popup: name, role, area, last update | [ ] | |
| 407 | Monitoring - Click area polygon | Popup: name, staffing | [ ] | |
| 408 | Monitoring - Staffing card per area | Required vs Actual | [ ] | |
| 409 | Monitoring - Understaffed highlighted | Red badges | [ ] | |
| 410 | Monitoring - Filter by rayon | Rayon dropdown, filtered | [ ] | |
| 411 | Monitoring - Filter by shift | Shift dropdown, filtered | [ ] | |
| 412 | Monitoring - Real-time updates (WS) | Workers move, update | [ ] | |
| 413 | Monitoring - Stats summary | Total, Online, Offline, Understaffed | [ ] | |

---

## Part 5: Cross-Cutting Concerns & Business Rules

### 5.1 Scheduling Conflicts & Validation

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 414 | Schedule Conflict - Same worker/date/shift | 409 Conflict | [ ] | |
| 415 | Schedule Conflict - Overlapping dates | 409 Conflict | [ ] | |
| 416 | Schedule Validation - End after start | 400 Bad Request | [ ] | |
| 417 | Schedule Validation - Effective date future | 400 Bad Request | [ ] | |
| 418 | Schedule Validation - Worker active | 400 Bad Request | [ ] | |

### 5.2 Staff Requirements & Understaffing

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 419 | Staff Req - 6 Workers required, 4 scheduled | Monitoring: understaffed | [ ] | |
| 420 | Staff Req - 2 Linmas required, 1 scheduled | Monitoring: understaffed | [ ] | |
| 421 | Staff Req - Fully staffed | Monitoring: green | [ ] | |
| 422 | Staff Req - Weekday vs Weekend | Correct requirement applied | [ ] | |
| 423 | Staff Req - Holiday override | Special day requirement | [ ] | |

### 5.3 Task Workflow Validation

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 424 | Task Workflow - Accept not "assigned" | 400 Bad Request | [ ] | |
| 425 | Task Workflow - Start not "accepted" | 400 Bad Request | [ ] | |
| 426 | Task Workflow - Complete not "in_progress" | 400 Bad Request | [ ] | |
| 427 | Task Workflow - Complete without photo | 400 Bad Request | [ ] | |
| 428 | Task Workflow - Complete without GPS | 400 Bad Request | [ ] | |
| 429 | Task Workflow - Complete GPS outside area | 400 Bad Request | [ ] | |
| 430 | Task Workflow - Decline requires reason | 400 Bad Request | [ ] | |

### 5.4 Real-Time Updates & WebSocket

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 431 | WebSocket - Clock-in → map updates | Marker appears | [ ] | |
| 432 | WebSocket - Location → map updates | Marker moves | [ ] | |
| 433 | WebSocket - Task assigned → notification | Notification appears, list refreshes | [ ] | |
| 434 | WebSocket - Staffing change → monitoring | Staffing card updates | [ ] | |
| 435 | WebSocket - Disconnect/reconnect | State syncs | [ ] | |

### 5.5 Role-Based Access Control (RBAC)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 436 | RBAC - Worker access /api/v1/rayons | 403 Forbidden | [ ] | |
| 437 | RBAC - Worker access own schedule | 200 OK | [ ] | |
| 438 | RBAC - Worker access other schedule | 403 Forbidden | [ ] | |
| 439 | RBAC - Koordinator create task (own area) | 201 Created | [ ] | |
| 440 | RBAC - Koordinator create task (other) | 403 Forbidden | [ ] | |
| 441 | RBAC - KepalaRayon view own rayon stats | 200 OK | [ ] | |
| 442 | RBAC - KepalaRayon view other rayon | 403 Forbidden | [ ] | |
| 443 | RBAC - Admin access all endpoints | All succeed | [ ] | |

### 5.6 Activity Type Filtering

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 444 | Activity Filter - Worker sees Worker only | Correct activities | [ ] | |
| 445 | Activity Filter - Linmas sees Linmas only | Correct activities | [ ] | |
| 446 | Activity Filter - Worker can't use Linmas activity | 400 Bad Request | [ ] | |
| 447 | Activity Filter - Linmas can't use Worker-only | 400 Bad Request | [ ] | |
| 448 | Activity Filter - Shared activities | Both can use | [ ] | |

### 5.7 Notification Delivery & Retry

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 449 | Notification - Task assigned → push | FCM notification | [ ] | |
| 450 | Notification - Delivery failed → retry 3x | Retries with backoff | [ ] | |
| 451 | Notification - All retries failed | Error logged | [ ] | |
| 452 | Notification - Batch 100 notifications | All sent | [ ] | |
| 453 | Notification - Invalid FCM token | Token deleted | [ ] | |

### 5.8 KMZ Import Validation

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 454 | KMZ Import - File >10MB | 400 Bad Request | [ ] | |
| 455 | KMZ Import - >100 polygons | 400 Bad Request | [ ] | |
| 456 | KMZ Import - Invalid format | 400 Bad Request | [ ] | |
| 457 | KMZ Import - Duplicate names | 409 Conflict | [ ] | |
| 458 | KMZ Import - Valid 50 polygons | All 50 created | [ ] | |

### 5.9 Performance & Scalability

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 459 | Performance - API response <200ms avg | Measured | [ ] | |
| 460 | Performance - 100 concurrent users | No errors | [ ] | |
| 461 | Performance - Monitoring API caching (5 min) | Cached served | [ ] | |
| 462 | Performance - Map 1000 markers | No lag | [ ] | |
| 463 | Performance - WebSocket 100 clients | All receive events | [ ] | |

---

## Quick Test Paths

### Path 1: Critical Backend Flow (20 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | GET /api/v1/rayons | 7 rayons | [ ] |
| 2 | GET /api/v1/shift-definitions | 3 shifts | [ ] |
| 3 | GET /api/v1/activity-types?role=Worker | Worker activities | [ ] |
| 4 | POST /api/v1/worker-schedules - Create | Schedule created | [ ] |
| 5 | GET /api/v1/worker-schedules/my (Worker) | My schedule | [ ] |
| 6 | POST /api/v1/tasks - Create task | Task created | [ ] |
| 7 | POST /api/v1/tasks/:id/assign - Assign | Task assigned | [ ] |
| 8 | GET /api/v1/monitoring/area/:id | Area stats | [ ] |

### Path 2: Mobile Worker Journey (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as worker1 | Tabbed home screen | [ ] |
| 2 | View "Tugas" tab | Task list | [ ] |
| 3 | Tap task "Kerjakan" | Task detail | [ ] |
| 4 | Tap "Terima Tugas" | Status: accepted | [ ] |
| 5 | Tap "Mulai Tugas" | Task complete screen | [ ] |
| 6 | Take photo + capture GPS | Photo/GPS shown | [ ] |
| 7 | Tap "Selesaikan Tugas" | Task completed | [ ] |
| 8 | Verify in "Laporan" tab | Report visible | [ ] |

### Path 3: Web Dashboard Admin (25 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as admin | Dashboard home | [ ] |
| 2 | Navigate to /users | Users list | [ ] |
| 3 | Create new user (Worker role) | User created | [ ] |
| 4 | Navigate to /areas | Areas list | [ ] |
| 5 | Create area with polygon | Area created | [ ] |
| 6 | Navigate to /rayons | Rayons list | [ ] |
| 7 | View rayon detail | Stats shown | [ ] |
| 8 | Navigate to /schedules | Schedules list | [ ] |
| 9 | Create worker schedule | Schedule created | [ ] |
| 10 | Navigate to /tasks | Tasks list | [ ] |
| 11 | Create and assign task | Task created | [ ] |
| 12 | Navigate to /monitoring | Real-time map | [ ] |
| 13 | Verify worker positions | Markers visible | [ ] |

### Path 4: Supervisor Real-Time Monitoring (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as koordinator1 | Supervisor home | [ ] |
| 2 | Navigate to map dashboard | Map with markers | [ ] |
| 3 | View area polygon | Boundary shown | [ ] |
| 4 | Tap worker marker | Info popup | [ ] |
| 5 | Check staffing card | Required vs Actual | [ ] |
| 6 | Verify understaffed warning (if applicable) | Warning shown | [ ] |
| 7 | Worker clocks in (simulate) | Marker appears (WebSocket) | [ ] |

---

## Infrastructure Preparation

### Phase 2 New Services

**Create Redis/ElastiCache cluster (if not exists):**

```bash
# Create cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id sekar-redis-staging \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --engine-version 7.0 \
  --region ap-southeast-3

# Get Redis endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id sekar-redis-staging \
  --show-cache-node-info \
  --region ap-southeast-3 \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address'
```

### Environment Variables (Staging EC2)

**SSH to staging:**
```bash
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
```

**Update .env.production:**
```bash
cd ~/sekar
nano .env.production

# Add Phase 2 variables:
# Redis (for Bull Queue - optional for MVP)
REDIS_HOST=sekar-redis-staging.xxxxx.ng.0001.apse3.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# FCM (Firebase - deferred to Phase 2E, set to disabled for now)
FCM_ENABLED=false
FCM_SERVER_KEY=

# Task Management
TASK_AUTO_ASSIGN_ENABLED=false
TASK_DEADLINE_WARNING_HOURS=24

# KMZ Import
KMZ_MAX_FILE_SIZE=10485760
KMZ_MAX_POLYGONS=100

# Notification Settings
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
NOTIFICATION_BATCH_SIZE=100
```

---

## Database Migration

### Run Phase 2 Migration

**SSH to staging EC2:**
```bash
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar
```

**Backup database first:**
```bash
docker-compose exec postgres pg_dump -U postgres sekar_db > backup_pre_phase2_$(date +%Y%m%d).sql
```

**Run migrations:**
```bash
docker-compose run --rm backend npm run migration:run:prod
```

**Verify tables created:**
```bash
docker-compose exec postgres psql -U postgres -d sekar_db -c "\dt"
```

**Expected new tables:**
- rayons
- shift_definitions
- activity_types
- area_staff_requirements
- worker_schedules
- special_day_overrides
- tasks
- notifications
- fcm_tokens (notification_tokens)

**Verify seed data:**
```bash
# Check rayons
docker-compose exec postgres psql -U postgres -d sekar_db -c "SELECT COUNT(*) FROM rayons;"
# Expected: 7 rayons

# Check shift definitions
docker-compose exec postgres psql -U postgres -d sekar_db -c "SELECT COUNT(*) FROM shift_definitions;"
# Expected: 3 shifts

# Check activity types
docker-compose exec postgres psql -U postgres -d sekar_db -c "SELECT COUNT(*) FROM activity_types;"
# Expected: 10 activity types
```

---

## Staging Deployment

### Option 1: GitHub Actions (Automated)

```bash
# Push to staging branch (triggers CI/CD)
git checkout staging
git merge develop
git push origin staging

# Monitor deployment: https://github.com/<org>/sekar/actions
# Wait for:
# - ✅ Tests passed
# - ✅ Docker image built
# - ✅ Image pushed to ECR
# - ✅ Deployed to staging EC2
```

### Option 2: Manual Deployment

```bash
# SSH to staging EC2
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar

# Pull latest code
git pull origin staging

# Build and restart
docker-compose build backend
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## Post-Deployment Verification

### Health Checks

**API health:**
```bash
curl http://staging.sekar.wahyutrip.com/api/health
# Expected: {"status":"ok","timestamp":"...","database":"healthy"}
```

**Swagger docs:**
```bash
curl http://staging.sekar.wahyutrip.com/api/docs
# Expected: HTML with Swagger UI
```

**Check Docker logs:**
```bash
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar
docker-compose logs --tail=50 backend
# Expected: No errors, server started on port 3000
```

### Phase 2 Endpoint Tests

**Set API URL:**
```bash
API_URL="http://staging.sekar.wahyutrip.com"
```

**Get admin token:**
```bash
TOKEN=$(curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Password123!"}' \
  | jq -r '.access_token')
```

**Test Phase 2A endpoints:**
```bash
echo "=== Testing Rayons ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/rayons | jq '.'
# Expected: Array with 7 rayons

echo "=== Testing Shift Definitions ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/shift-definitions | jq '.'
# Expected: Array with 3 shifts

echo "=== Testing Activity Types ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/activity-types | jq '.'
# Expected: Array with 10 activity types

echo "=== Testing Special Day Overrides ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/special-day-overrides | jq '.'
# Expected: Empty array or existing holidays
```

**Test Phase 2B endpoints:**
```bash
echo "=== Testing Tasks ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/tasks | jq '.'
# Expected: Empty array or existing tasks

echo "=== Testing Monitoring ==="
# Replace <area-id> with actual area UUID
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/v1/monitoring/area/<area-id>" | jq '.'
# Expected: Area statistics

echo "=== Testing WebSocket ==="
curl -s -H "Authorization: Bearer $TOKEN" -H "Upgrade: websocket" $API_URL/events
# Expected: Upgrade connection or 101 response
```

### Database Verification

**SSH to staging:**
```bash
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar
```

**Check row counts:**
```bash
docker-compose exec postgres psql -U postgres -d sekar_db << EOF
SELECT
  'rayons' as table_name, COUNT(*) as count FROM rayons
UNION ALL
SELECT 'shift_definitions', COUNT(*) FROM shift_definitions
UNION ALL
SELECT 'activity_types', COUNT(*) FROM activity_types
UNION ALL
SELECT 'worker_schedules', COUNT(*) FROM worker_schedules
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL
SELECT 'special_day_overrides', COUNT(*) FROM special_day_overrides;
EOF

# Expected output:
#       table_name       | count
# ----------------------+-------
#  rayons               |     7
#  shift_definitions    |     3
#  activity_types       |    10
#  worker_schedules     |     0 (or > 0 if schedules created)
#  tasks                |     0 (or > 0 if tasks created)
#  special_day_overrides|     0 (or > 0 if holidays created)
```

---

## Performance Testing (Optional)

### Load Test

**Install Apache Bench:**
```bash
sudo apt-get install apache2-utils
```

**Test rayon listing (lightweight):**
```bash
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://staging.sekar.wahyutrip.com/api/v1/rayons

# Expected:
# - Requests per second: >50
# - No failed requests
# - Average response time: <100ms
```

**Test task creation (write-heavy):**
```bash
ab -n 50 -c 5 -p task.json -T application/json \
  -H "Authorization: Bearer $TOKEN" \
  http://staging.sekar.wahyutrip.com/api/v1/tasks

# Expected:
# - Requests per second: >20
# - No failed requests
# - Average response time: <200ms
```

---

## Rollback Procedure (If Needed)

### Rollback Backend

```bash
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar

# Stop current containers
docker-compose down

# Restore database backup
docker-compose up -d postgres
cat backup_pre_phase2_YYYYMMDD.sql | \
  docker-compose exec -T postgres psql -U postgres -d sekar_db

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose build backend
docker-compose up -d

# Verify
docker-compose logs -f backend
```

### Rollback Mobile

**Replace APK with previous version:**
```bash
adb uninstall com.sekar
adb install sekar-v1.0.0.apk
```

---

## Monitoring & Alerts

### CloudWatch Alarms (if configured)

**Check alarm status:**
```bash
aws cloudwatch describe-alarms \
  --alarm-names sekar-high-error-rate \
  --region ap-southeast-3
```

**View logs:**
```bash
aws logs tail /aws/ec2/sekar-backend --follow --region ap-southeast-3
```

### Manual Monitoring

**Check server resources:**
```bash
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>

# CPU usage
top

# Memory usage
free -h

# Disk usage
df -h

# Docker stats
docker stats
```

**Check application logs:**
```bash
cd ~/sekar
docker-compose logs --tail=100 -f backend
```

---

## Test Results Summary

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Backend API - Phase 2A (Part 1) | 80 | - | - | - |
| Backend API - Phase 2B (Part 2) | 97 | - | - | - |
| Mobile - Phase 2C (Part 3) | 160 | - | - | - |
| Web Dashboard - Phase 2D (Part 4) | 154 | - | - | - |
| Cross-Cutting & Business Rules (Part 5) | 50 | - | - | - |
| **TOTAL** | **541** | **0** | **0** | **541** |

*Note: All Phase 2 automated tests (845 backend, 1,751 mobile) are passing. Manual tests pending device testing.*

---

## Pre-Deployment Checklist

### Backend

- [ ] All 845 tests passing
- [ ] Coverage >80% (currently 84.23%)
- [ ] 0 npm vulnerabilities
- [ ] Build passing
- [ ] Swagger docs accessible
- [ ] Phase 2 migrations tested
- [ ] Phase 2 seed data working
- [ ] Environment variables configured
- [ ] Redis/ElastiCache configured (optional)

### Mobile

- [ ] All 1,751 tests passing
- [ ] 10 WebSocket mock tests (non-blocking)
- [ ] No critical lint errors
- [ ] Android build successful
- [ ] Release APK generated
- [ ] Environment variables configured
- [ ] Neo Brutalism components tested
- [ ] All Phase 2 screens tested manually

### Web Dashboard

- [ ] All 11 component tests passing
- [ ] Build passing (0 errors)
- [ ] 0 lint errors
- [ ] Next.js production build successful
- [ ] Google Maps integration working
- [ ] WebSocket real-time tested
- [ ] All 18 pages tested manually

### Infrastructure

- [ ] Docker Compose working
- [ ] PostgreSQL accessible
- [ ] Phase 2 tables created
- [ ] Seed data verified
- [ ] Backup strategy defined
- [ ] Monitoring configured (optional)
- [ ] Deployment scripts ready
- [ ] Rollback procedure tested

---

## Deployment Checklist Summary

**Pre-Deployment:**
- [ ] All tests passing (backend, mobile, web)
- [ ] Database backup created
- [ ] Environment variables configured
- [ ] Redis/ElastiCache provisioned (optional)

**Deployment:**
- [ ] Migrations executed successfully
- [ ] Backend deployed and healthy
- [ ] Web dashboard accessible
- [ ] Mobile APK built and signed

**Post-Deployment:**
- [ ] Health check endpoints responding
- [ ] All Phase 2 APIs tested
- [ ] Database tables verified
- [ ] Mobile app tested on devices
- [ ] Web dashboard tested in browsers
- [ ] Performance benchmarks within acceptable range
- [ ] CloudWatch alarms configured (if applicable)

**Sign-Off:**
- [ ] Technical lead approved
- [ ] Product owner approved
- [ ] Rollback procedure documented and tested

---

## Contact & Support

**Team Leads:**
- Backend: [Contact]
- Mobile: [Contact]
- Web: [Contact]
- DevOps: [Contact]

**On-Call:**
- Primary: [Contact]
- Secondary: [Contact]

**Incident Response:**
1. Report issue in Slack #sekar-incidents
2. Create GitHub issue with [PRODUCTION] tag
3. Escalate to on-call if critical

---

## Next Steps

After successful staging deployment:

1. **Monitor for 24-48 hours** - Watch for errors, performance issues
2. **Gather feedback** - From test users on staging
3. **Fix any issues** - Address bugs found in staging
4. **Prepare production deployment** - Schedule maintenance window
5. **Deploy to production** - Follow same procedure with main branch
6. **Complete Phase 2E** - Firebase/FCM setup, web CI/CD pipeline

**Phase 2E Remaining Items:**
- [ ] Firebase project setup (20 minutes)
- [ ] Install Firebase packages in mobile app
- [ ] Configure push notification certificates
- [ ] Set up web CI/CD pipeline (2 hours)
- [ ] CloudWatch monitoring (optional, 1 hour)

---

*Phase 2 Enhanced Features: Ready for Production Deployment*
*Last Updated: January 27, 2026*
