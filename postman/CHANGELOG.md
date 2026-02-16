# Postman Collection & Environment Changelog

## Backend Terminology Cleanup - DTO & Field Names (February 15, 2026)

### Breaking API Changes Documentation

**Collection Updates:**
- ✅ Updated "Get Area Stats" endpoint description with breaking change warning
- ✅ Updated "Get Live Users" endpoint description (renamed from live-workers)

**Breaking Changes Documented:**
- Response fields renamed in `GET /monitoring/area/:id`:
  - `total_workers_assigned` → `total_users_assigned`
  - `workers_online` → `users_online`
  - `workers_offline` → `users_offline`
  - `workers: WorkerStatusDto[]` → `users: UserStatusDto[]`

**Impact:**
- Mobile/Web clients must update type definitions before using updated backend
- Postman tests will need updating when backend deploys with new field names

**Test Status:**
- Backend: 922 tests passing, 87.93% coverage
- All changes backward-incompatible - coordinate deployment with frontend teams

---

## Phase 2C Terminology Cleanup - Complete (February 12, 2026)

### Final Pass - Comprehensive Role & Terminology Updates

**Collection Changes (25 updates):**

**Request/Folder Names:**
- "Login (Worker)" → "Login (Satgas)"
- "Login (Supervisor)" → "Login (Korlap)"
- "05. Worker Assignments" → "05. DEPRECATED - Worker Assignments"
- "06. Shifts - Worker Flow" → "06. Shifts - User Flow"
- "07. Shifts - Supervisor View" → "07. Shifts - Korlap View"
- "08. Aktivitas - Worker Flow" → "08. Aktivitas - User Flow"
- "11. Supervisor Dashboard" → "11. Korlap Dashboard"
- "17. Worker Schedules" → "17. Schedules"
- "Assign Worker to Area" → "Assign User to Area"
- "Remove Worker Assignment" → "Remove User Assignment"
- "Get Active Workers" → "Get Active Users"
- "Get Live Workers" → "Get Live Users"
- "Get Activity Types for Workers" → "Get Activity Types for Users"
- "Create/Update/Delete Worker Schedule" → "Create/Update/Delete Schedule"

**Test Scripts (Role Values):**
- All `role === 'worker'` → `role === 'satgas'`
- All `role === 'supervisor'` → `role === 'korlap'`
- All `json.find(u => u.role === 'worker')` → `json.find(u => u.role === 'satgas')`
- Test assertions updated: "User role is worker" → "User role is satgas"

**Request Bodies:**
- `"role": "worker"` → `"role": "satgas"` (Create User endpoint)
- `"role": "supervisor"` → `"role": "korlap"` (where applicable)

**Environment File:**
- `supervisor_username` → `korlap_username`
- Value updated: `korlap1`

**What Stayed the Same (Intentionally):**
- API endpoint paths: `/supervisor/*` (backend module still uses this path)
- Variable names in scripts: `worker_id`, `worker_assignment_id` (legacy compatibility)
- Property names: `active_workers`, `total_workers` (API response structure)
- Generic terms: "workers" in statistical contexts

---

## Phase 2C Terminology Cleanup - Initial Pass (February 12, 2026)

### Additional Collection Fixes

**URL Path Segments (2 endpoints):**
- `/location/worker/{{worker_id}}` → `/location/user/{{user_id}}`
- `/location/worker/{{worker_id}}/latest` → `/location/user/{{user_id}}/latest`

**Request Names:**
- "Get Worker Location History" → "Get User Location History"
- "Get Worker Latest Location" → "Get User Latest Location"

**Verification:** ✅ Zero `"worker"` string literals remaining in collection JSON

---

## Phase 2C Terminology Cleanup - Initial Pass (February 12, 2026)

### Environment File Updates (`SEKAR - Local.postman_environment.json`)

**Description:**
- Updated test count: 888 → 919 tests (54 suites)
- Updated status: "Client Feedback Complete" → "Terminology Cleanup Complete"

**Credentials Updated:**
- `password` (default): `password123` → `satgas123`
- `admin_username`: `superadmin` → `admin`
- `admin_password`: `superadmin123` → `admin123`
- `supervisor_password`: `password123` → `korlap123`
- `korlap_password`: `password123` → `korlap123`
- `satgas_password`: `password123` → `satgas123`
- `linmas_password`: `password123` → `satgas123`

**Variable Renames:**
- `created_report_id` → `created_activity_id`
- `report_shift_id` → `activity_shift_id`
- `worker_schedule_id` → `schedule_id`
- `created_worker_schedule_id` → `created_schedule_id`

**Export Timestamp:** Updated to 2026-02-12T01:27:00.000Z

---

### Collection File Updates (`SEKAR.postman_collection.json`)

**Endpoint Path Changes (6 occurrences):**
- `/aktivitas` → `/activities`

**Variable Reference Updates (20 occurrences):**
- `created_report_id` → `created_activity_id`
- `report_shift_id` → `activity_shift_id`
- `worker_schedule_id` → `schedule_id`
- `created_worker_schedule_id` → `created_schedule_id`

**Description Updates:**
- Test count: Added "919 passing (54 test suites)"
- Test user credentials updated to match actual seed passwords
- Collection structure: "aktivitas" → "activities", "Worker Schedules" → "Schedules"
- Added "Phase 2C Terminology Changes" section documenting all renames
- Status: "Client Feedback Complete" → "Terminology Cleanup Complete"

**Folder/Endpoint Names:**
- All endpoint names and paths now use English terminology
- Activities module properly named throughout

---

## Summary

All Postman files now align with Phase 2C backend changes:
- ✅ English API paths (`/activities`, `/schedules`)
- ✅ Correct seed passwords (`satgas123`, `korlap123`, `admin123`)
- ✅ Updated variable names matching new entity names
- ✅ 113 endpoints fully documented with Phase 2C terminology
- ✅ Ready for manual API testing
