# Phase 2C - Deployment & Testing Checklist

**Purpose:** Comprehensive deployment procedures and manual testing checklist for Phase 2C verification.
**Last Updated:** February 16, 2026
**Deployment Status:** ✅ DEPLOYED (February 16, 2026 15:25-16:45 WIB)
**Related ADR:** [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)

---

## Deployment Results (Production)

**Date:** February 16, 2026 (15:25-16:45 WIB)
**Duration:** 1 hour 20 minutes
**Commit:** 65c7895 (Phase 2C merge) + 6239094 (.dockerignore fix)

### Services Deployed

| Service | URL | Status | Container |
|---------|-----|--------|-----------|
| Backend API | http://api.sekar.wahyutrip.com | ✅ Healthy | sekar-backend:3000 |
| Web Dashboard | http://sekar.wahyutrip.com | ✅ Running | sekar-web:3001 |
| Database | RDS PostgreSQL | ✅ Seeded | 18 tables, 6 users |

### Issues Encountered & Fixes

1. ⚠️ **Database Migration Failure**
   - Phase2CSchema migration failed (tries to ALTER non-existent tables)
   - **Workaround:** Enabled `DATABASE_SYNCHRONIZE=true` (temporary)
   - **Action Required:** Disable after 48h stability period

2. ✅ **Web Docker Build Failure**
   - tsconfig.json excluded from Docker context
   - **Fix:** Removed from .dockerignore (commit 6239094)

3. ✅ **Missing NEXT_PUBLIC_ Env Vars**
   - **Fix:** Rebuilt with correct build args

4. ⚠️ **Web CI/CD Not Triggered**
   - **Workaround:** Manual deployment via Docker save/load

5. ⚠️ **Login Page CSR Bailout**
   - `useSearchParams()` without Suspense wrapper
   - Shows skeleton loaders (functional but UX issue)

### Production Test Credentials

**Actual Seeded Users — Phase 1 (`npm run seed`):**
| Role | Username | Password |
|------|----------|----------|
| superadmin | admin | password123 |
| korlap | korlap1 | password123 |
| korlap | korlap2 | password123 |
| satgas | satgas1 | password123 |
| satgas | satgas2 | password123 |
| satgas | satgas3 | password123 |

**Actual Seeded Users — Phase 2 (`npm run seed:phase2`):**
| Role | Username | Password |
|------|----------|----------|
| admin_system | admin_system1 | password123 |
| admin_data | admin_data1 | password123 |
| top_management | top_management1 | password123 |
| kepala_rayon | kepala_rayon_selatan | password123 |
| kepala_rayon | kepala_rayon_utara | password123 |
| korlap | korlap_bungkul | password123 |
| linmas | linmas1 | password123 |
| linmas | linmas2 | password123 |
| satgas | satgas4 | password123 |

**Note:** All passwords are `password123` for consistency across all roles and seeders.

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

### Test Credentials (Phase 2C - 8 Roles)

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| superadmin | admin | password123 | Full system access |
| admin_system | admin_system1 | password123 | System administration |
| admin_data | admin_data1 | password123 | Data management |
| korlap | korlap1 | password123 | Area coordinator (Phase 1) |
| korlap | korlap_bungkul | password123 | Area coordinator (Phase 2) |
| satgas | satgas1 | password123 | Field worker (Phase 1) |
| satgas | satgas2 | password123 | Field worker (Phase 1) |
| satgas | satgas3 | password123 | Field worker (Phase 1) |
| satgas | satgas4 | password123 | Field worker (Phase 2) |
| linmas | linmas1 | password123 | Security officer |
| linmas | linmas2 | password123 | Security officer |
| kepala_rayon | kepala_rayon_selatan | password123 | Rayon manager |
| kepala_rayon | kepala_rayon_utara | password123 | Rayon manager |
| top_management | top_management1 | password123 | City-wide view |

### API Testing Tools

- **Postman Collection:** `postman/SEKAR.postman_collection.json`
- **Postman Environment:** `postman/SEKAR - Local.postman_environment.json`
- **Swagger UI:** http://localhost:3000/api/docs
- **Adminer (DB):** http://localhost:8080
- **LocalStack (S3):** http://localhost:4566

### Setup Commands

```bash
# Start infrastructure
cd infra && docker-compose up -d

# Start backend
cd be && npm run start:dev

# Seed Phase 2C data
cd be && npm run seed

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

# 1. TypeScript compilation check
npx tsc --noEmit
# Expected: 0 errors

# 2. Run all tests
npm test
# Expected: All suites passing, 0 failures

# 3. Check test coverage
npm run test:cov
# Expected: >80% branch coverage

# 4. Individual Phase 2C module tests
npx jest --testPathPattern='activities' --no-coverage
# Expected: All activities tests passing (scoped access)

npx jest --testPathPattern='overtime' --no-coverage
# Expected: All overtime tests passing (flat structure)

npx jest --testPathPattern='tasks' --no-coverage
# Expected: All task tests passing (4-status workflow)

npx jest --testPathPattern='monitoring' --no-coverage
# Expected: All monitoring tests passing (scope auth)

npx jest --testPathPattern='schedules' --no-coverage
# Expected: All schedule tests passing

# 5. Seed data verification
npm run seed
# Expected: No errors, all data seeded
```

---

## Part 1: Role System Overhaul (ADR-009)

### 1.1 UserRole Enum (8 roles)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 1 | Code Review: `user.entity.ts` UserRole enum | Exactly 8 values: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin | [ ] |
| 2 | Code Search: No old role references in `be/src/` | No `worker`, `supervisor`, `admin`, `koordinator_lapangan` strings | [ ] |
| 3 | Seed data uses new role names | seed-phase2.ts creates users with new roles | [ ] |

### 1.2 Role Group Constants

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 4 | `users/constants/role-groups.ts` exists | File with 11+ constants | [ ] |
| 5 | `CLOCKABLE_ROLES` | [satgas, linmas, korlap, admin_data, kepala_rayon] | [ ] |
| 6 | `ACTIVITY_SUBMITTERS` | [satgas, linmas, korlap, admin_data] | [ ] |
| 7 | `TASK_CREATORS` | [korlap, kepala_rayon, top_management, admin_system, superadmin] | [ ] |
| 8 | `TASK_RECEIVERS` | [satgas, linmas, korlap, kepala_rayon] | [ ] |
| 9 | `OVERTIME_SUBMITTERS` | [satgas, linmas] | [ ] |
| 10 | `OVERTIME_APPROVERS` | [korlap] | [ ] |
| 11 | `MONITORING_CITY` | [top_management, admin_system, superadmin] | [ ] |
| 12 | `MONITORING_RAYON` | [kepala_rayon, ...MONITORING_CITY] | [ ] |
| 13 | `MONITORING_AREA` | [korlap, ...MONITORING_RAYON] | [ ] |
| 14 | `USER_MANAGERS` | [admin_system, superadmin] | [ ] |

### 1.3 User Entity Changes

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 15 | `users.entity.ts` has `area_id` column | Nullable UUID, FK to areas | [ ] |
| 16 | `@ManyToOne(() => Area)` relation exists | Area relation | [ ] |
| 17 | CreateUserDto accepts `area_id` | Optional UUID field | [ ] |

### 1.4 @Roles Decorator Usage

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 18 | `shifts.controller.ts` clock-in | `@Roles(...CLOCKABLE_ROLES)` | [ ] |
| 19 | `activities.controller.ts` create | `@Roles(...ACTIVITY_SUBMITTERS)` | [ ] |
| 20 | `tasks.controller.ts` create | `@Roles(...TASK_CREATORS)` | [ ] |
| 21 | `monitoring.controller.ts` endpoints | Uses MONITORING_* groups | [ ] |
| 22 | `overtime.controller.ts` submit | `@Roles(...OVERTIME_SUBMITTERS)` | [ ] |

---

## Part 2: Terminology Cleanup (ADR-010)

### 2.1 Table/Column Renames

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 23 | `worker_schedules` table renamed | `schedules` table exists | [ ] |
| 24 | `work_reports` table renamed | `activities` table exists | [ ] |
| 25 | `worker_assignments` table dropped | Table does not exist | [ ] |
| 26 | `overtime_aktivitas` table dropped | Table does not exist | [ ] |
| 27 | `shifts.worker_id` renamed | `shifts.user_id` column exists | [ ] |
| 28 | `activities.worker_id` renamed | `activities.user_id` column exists | [ ] |
| 29 | `location_logs.worker_id` renamed | `location_logs.user_id` column exists | [ ] |

### 2.2 Module Renames

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 30 | `be/src/modules/activities/` directory exists | Replaces `reports/` | [ ] |
| 31 | `be/src/modules/schedules/` directory exists | Replaces `worker-schedules/` | [ ] |
| 32 | `be/src/modules/worker-assignments/` deleted | Directory does not exist | [ ] |
| 33 | `Activity` entity class | Replaces `Report` | [ ] |
| 34 | `Schedule` entity class | Replaces `WorkerSchedule` | [ ] |
| 35 | `ActivitiesService` class | Replaces `ReportsService` | [ ] |
| 36 | `SchedulesService` class | Replaces `WorkerSchedulesService` | [ ] |

### 2.3 Route Renames

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 37 | GET `/api/v1/activities` | 200 OK, accessible | [ ] |
| 38 | GET `/api/v1/schedules` | 200 OK, accessible | [ ] |
| 39 | GET `/api/v1/aktivitas` | 404 Not Found (old path removed) | [ ] |
| 40 | GET `/api/v1/reports` | 404 Not Found (old path removed) | [ ] |
| 41 | GET `/api/v1/worker-schedules` | 404 Not Found (old path removed) | [ ] |

### 2.4 Constant Renames

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 42 | `ACTIVITY_SUBMITTERS` constant exists | Replaces `AKTIVITAS_SUBMITTERS` | [ ] |
| 43 | No `AKTIVITAS_SUBMITTERS` references in code | Zero matches | [ ] |

---

## Part 3: Shifts Module Changes

### 3.1 ClockIn DTO & Geofencing

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 44 | Code Review: `clock-in.dto.ts` area_id | `@IsOptional()` (not required) | [ ] |
| 45 | Code Review: GPS boundary validation | Soft warning only (never blocks) | [ ] |
| 46 | `getActiveArea()` method exists | In shifts.service.ts | [ ] |
| 47 | Auto-detection priority | Schedule (effective_date range) only, no WorkerAssignment fallback | [ ] |
| 48 | `shift.clock_in_outside_boundary` column | BOOLEAN DEFAULT false | [ ] |
| 49 | `shift.clock_out_outside_boundary` column | BOOLEAN DEFAULT false | [ ] |

### 3.2 Postman: Shifts

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 50 | Login as satgas1, POST `/shifts/clock-in` without area_id | 201, area auto-detected | [ ] |
| 51 | Login as satgas1, POST `/shifts/clock-in` with area_id | 201, uses provided area | [ ] |
| 52 | Login as linmas1, POST `/shifts/clock-in` | 201 (linmas is clockable) | [ ] |
| 53 | Login as korlap1, POST `/shifts/clock-in` | 201 (korlap is clockable) | [ ] |
| 54 | Login as kepala_rayon, POST `/shifts/clock-in` | 201 (kepala_rayon is clockable) | [ ] |
| 55 | Clock-in from outside area boundary | 201 + `clock_in_outside_boundary=true` | [ ] |
| 56 | Clock-in from inside area boundary | 201 + `clock_in_outside_boundary=false` | [ ] |

---

## Part 4: Activities Module (renamed from Reports)

### 4.1 Controller Path

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 57 | Code Review: `activities.controller.ts` | `@Controller('activities')` | [ ] |
| 58 | GET `/api/v1/activities` | 200 OK, accessible | [ ] |
| 59 | GET `/api/v1/reports` | 404 Not Found (old path removed) | [ ] |
| 60 | GET `/api/v1/aktivitas` | 404 Not Found (old path removed) | [ ] |

### 4.2 Create Activity

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 61 | POST `/activities` -- valid body (satgas1, clocked in) | 201 Created | [ ] |
| 62 | POST `/activities` -- requires `activity_type_id` | UUID required | [ ] |
| 63 | POST `/activities` -- requires `description` (max 1000 chars) | Validation | [ ] |
| 64 | POST `/activities` -- requires `photo_urls` (1-3 array) | Array validation | [ ] |
| 65 | POST `/activities` -- `gps_lat`/`gps_lng` optional | Nullable, accepted | [ ] |
| 66 | POST `/activities` -- auto-detects active shift | No shift_id in body needed | [ ] |
| 67 | POST `/activities` -- validates activity_type.applicable_roles | Rejects mismatched role | [ ] |
| 68 | POST `/activities` -- without active shift | 400 Bad Request | [ ] |

### 4.3 Scoped Access

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 69 | Login as satgas1, GET `/activities` | Own activities only | [ ] |
| 70 | Login as korlap1, GET `/activities` | Own area's activities | [ ] |
| 71 | Login as kepala_rayon, GET `/activities` | Own rayon's activities | [ ] |
| 72 | Login as superadmin, GET `/activities` | All activities | [ ] |

---

## Part 5: Tasks Module Redesign

### 5.1 TaskStatus Simplification

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 73 | Code Review: `task.entity.ts` TaskStatus | Exactly 4: pending, assigned, in_progress, completed | [ ] |
| 74 | Code Search: No `accepted`/`declined` in `be/src/` | Zero references | [ ] |
| 75 | No `accept()` method in tasks.controller.ts | Method removed | [ ] |
| 76 | No `decline()` method in tasks.controller.ts | Method removed | [ ] |

### 5.2 Task Entity Changes

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 77 | `task.entity.ts` has `rayon_id` | Nullable UUID, FK to rayons | [ ] |
| 78 | `task.entity.ts` has `area_id` as nullable | Changed from NOT NULL | [ ] |
| 79 | `task.entity.ts` has `tags` relation | OneToMany to TaskTag | [ ] |

### 5.3 Tag Endpoints

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 80 | POST `/tasks/:id/tag` with `{ user_ids: [uuid] }` | Adds tag(s), 201 | [ ] |
| 81 | DELETE `/tasks/:id/tag/:userId` | Removes tag, 200 | [ ] |
| 82 | GET `/tasks/tagged` | Returns tasks where user is tagged | [ ] |

### 5.4 Create Task

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 83 | `CreateTaskDto` accepts `rayon_id` | Optional UUID | [ ] |
| 84 | `CreateTaskDto` accepts `tagged_user_ids[]` | Optional UUID array | [ ] |
| 85 | Login as korlap1, POST `/tasks` with area_id | 201 Created | [ ] |
| 86 | Login as satgas1, POST `/tasks` | 403 Forbidden (not TASK_CREATOR) | [ ] |

### 5.5 Complete Task

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 87 | `CompleteTaskDto` requires `completion_photo_url` | String required | [ ] |
| 88 | `CompleteTaskDto` requires `description` | String required | [ ] |
| 89 | No `gps_lat`/`gps_lng` in CompleteTaskDto | Fields removed | [ ] |
| 90 | Workflow: assigned to in_progress to completed | No accept step | [ ] |

### 5.6 Hierarchy Validation

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 91 | `VALID_TASK_ASSIGNMENTS` constant exists | Defines who assigns to whom | [ ] |
| 92 | korlap assigns to satgas | 200 OK | [ ] |
| 93 | satgas assigns to korlap | 403 Forbidden | [ ] |

---

## Part 6: Overtime Module (Flat Structure)

### 6.1 Entity Structure

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 94 | `overtime.entity.ts` has activity fields | activity_type_id, description, photo_urls, gps_lat, gps_lng | [ ] |
| 95 | No `overtime-aktivitas.entity.ts` file | File deleted (flat structure) | [ ] |
| 96 | OvertimeStatus enum | pending, approved, rejected | [ ] |

### 6.2 Submit Overtime (Flat DTO)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 97 | Login as satgas1, POST `/overtime` (flat body) | 201, overtime created | [ ] |
| 98 | Login as linmas1, POST `/overtime` (flat body) | 201 (linmas can submit) | [ ] |
| 99 | Login as korlap1, POST `/overtime` | 403 (not OVERTIME_SUBMITTER) | [ ] |
| 100 | Submit with invalid activity_type for role | 400/403 error | [ ] |
| 101 | Submit with 0 photos | 400 Bad Request | [ ] |
| 102 | Submit with 4+ photos | 400 Bad Request (max 3) | [ ] |
| 103 | Submit requires activity_type_id | Validation enforced | [ ] |
| 104 | Submit requires description | Validation enforced | [ ] |
| 105 | No nested `aktivitas[]` array accepted | Flat DTO only | [ ] |

### 6.3 Approve/Reject Overtime

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 106 | Login as korlap1, PATCH `/overtime/:id/approve` | 200, status: approved | [ ] |
| 107 | Approve already-approved overtime | 400 Bad Request | [ ] |
| 108 | Korlap approve for other area's overtime | 403 Forbidden | [ ] |
| 109 | Login as satgas1, PATCH `/overtime/:id/approve` | 403 (not OVERTIME_APPROVER) | [ ] |
| 110 | Login as korlap1, PATCH `/overtime/:id/reject` | 200, status: rejected | [ ] |
| 111 | Reject without reason | 400 Bad Request | [ ] |
| 112 | Reject with reason | 200, rejection_reason saved | [ ] |

### 6.4 List Overtime

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 113 | Login as satgas1, GET `/overtime/my` | Own overtime only | [ ] |
| 114 | Login as korlap1, GET `/overtime` | Pending, own area only | [ ] |
| 115 | Login as superadmin, GET `/overtime` | All pending overtime | [ ] |
| 116 | GET `/overtime/:id` | Full overtime details (flat, no nested aktivitas) | [ ] |

---

## Part 7: Polygon Geofencing (Soft Warning)

### 7.1 GpsUtil Methods

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 117 | `GpsUtil.isPointInPolygon()` method exists | Ray casting algorithm | [ ] |
| 118 | `GpsUtil.isWithinAreaBoundary()` method exists | Polygon-first, radius fallback | [ ] |
| 119 | Point inside simple rectangle | Returns true | [ ] |
| 120 | Point outside simple rectangle | Returns false | [ ] |
| 121 | No polygon defined, fallback to radius | Uses radius check | [ ] |
| 122 | No boundary defined at all | Returns true (no boundary = inside) | [ ] |

### 7.2 Shift Integration

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 123 | Clock-in sets `clock_in_outside_boundary` flag | Based on GPS vs area boundary | [ ] |
| 124 | Clock-out sets `clock_out_outside_boundary` flag | Based on GPS vs area boundary | [ ] |
| 125 | Clock-in ALWAYS succeeds regardless of boundary | Never blocked | [ ] |

### 7.3 Monitoring Integration

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 126 | `getLiveUsers` response includes `outside_boundary` field | Boolean per user | [ ] |
| 127 | Dashboard shows boundary warning indicator | Yellow/red for out-of-boundary | [ ] |

---

## Part 8: Monitoring Module Scope Authorization

### 8.1 Scope Checks

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 128 | Code Review: monitoring.controller.ts getRayonStats | Checks kepala_rayon's rayon_id matches | [ ] |
| 129 | Code Review: monitoring.controller.ts getAreaStats | Checks korlap's area_id matches | [ ] |
| 130 | Code Review: monitoring.service.ts | No TaskStatus.ACCEPTED or DECLINED references | [ ] |

### 8.2 Postman: Monitoring Scope

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 131 | Login as kepala_rayon, GET `/monitoring/rayon/:ownRayonId` | 200 OK | [ ] |
| 132 | Login as kepala_rayon, GET `/monitoring/rayon/:otherRayonId` | 403 Forbidden | [ ] |
| 133 | Login as korlap1, GET `/monitoring/area/:ownAreaId` | 200 OK | [ ] |
| 134 | Login as korlap1, GET `/monitoring/area/:otherAreaId` | 403 Forbidden | [ ] |
| 135 | Login as superadmin, GET `/monitoring/rayon/:anyId` | 200 OK | [ ] |
| 136 | Login as superadmin, GET `/monitoring/area/:anyId` | 200 OK | [ ] |

---

## Part 9: Seed Data Verification

### 9.1 User Seeds

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 137 | `seed-phase2.ts` uses new role names | satgas, korlap, etc. (not worker, supervisor) | [ ] |
| 138 | Korlap user has `area_id` assigned | area_id set | [ ] |
| 139 | admin_data user exists | Role: admin_data | [ ] |
| 140 | admin_system user exists | Role: admin_system | [ ] |
| 141 | kepala_rayon user has `rayon_id` | rayon_id set | [ ] |

### 9.2 Activity Type Seeds

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 142 | Lowercase `applicable_roles` | `['satgas']` not `['Worker']` | [ ] |
| 143 | Satgas-specific types | 8 types | [ ] |
| 144 | Linmas-specific types | 5 types | [ ] |
| 145 | Korlap-specific types | 4 types | [ ] |
| 146 | Admin_data-specific types | 3 types | [ ] |

### 9.3 Task Seeds

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 147 | `seed-tasks.ts` uses 4 statuses only | pending, assigned, in_progress, completed | [ ] |
| 148 | Tasks have rayon_id where appropriate | Rayon-scoped tasks exist | [ ] |

### 9.4 Seed Execution

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 149 | `npm run seed` completes | No errors | [ ] |
| 150 | Database has expected test data | Users, areas, tasks, activity types | [ ] |

---

## Part 10: Test Suite & Code Quality

### 10.1 Test Results

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 151 | `npm test` -- all suites pass | All suites passing | [ ] |
| 152 | No skipped or pending tests | 0 skipped | [ ] |

### 10.2 Coverage

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 153 | `npm run test:cov` -- branch coverage | >80% | [ ] |
| 154 | Activities module coverage | >80% | [ ] |
| 155 | Overtime module coverage | >80% | [ ] |
| 156 | Tasks module coverage | >80% | [ ] |
| 157 | Monitoring module coverage | >80% | [ ] |
| 158 | Schedules module coverage | >80% | [ ] |

### 10.3 Code Quality

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 159 | No `TaskStatus.ACCEPTED`/`DECLINED` in `be/src/` | Zero references | [ ] |
| 160 | No `worker_id` in entity definitions (except User FK target) | Renamed to `user_id` | [ ] |
| 161 | No `AKTIVITAS_SUBMITTERS` references | Renamed to `ACTIVITY_SUBMITTERS` | [ ] |
| 162 | No `OvertimeAktivitas` entity | Deleted (flat overtime) | [ ] |
| 163 | No `WorkerAssignment` entity | Deleted | [ ] |
| 164 | No `WorkerSchedule` entity | Renamed to `Schedule` | [ ] |
| 165 | No `Report` entity (as main entity) | Renamed to `Activity` | [ ] |
| 166 | `npx tsc --noEmit` -- 0 errors | Clean TypeScript | [ ] |
| 167 | No `any` type in new Phase 2C code | Strict typing | [ ] |
| 168 | Indonesian error messages (user-facing) | "Anda hanya dapat..." | [ ] |

---

## Quick Test Paths

### Path 1: Satgas Daily Workflow (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as satgas1 | JWT token received | [ ] |
| 2 | POST `/shifts/clock-in` (no area_id) | 201, area auto-detected | [ ] |
| 3 | POST `/activities` with activity_type_id + photo | 201, activity created | [ ] |
| 4 | GET `/activities` | Own activities only | [ ] |
| 5 | POST `/shifts/clock-out` | 200, shift ended | [ ] |
| 6 | POST `/overtime` (flat: type, description, photos) | 201, overtime submitted | [ ] |
| 7 | GET `/overtime/my` | Own overtime listed | [ ] |
| 8 | GET `/tasks/tagged` | Tagged tasks (if any) | [ ] |

### Path 2: Korlap Supervisor Journey (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as korlap1 | JWT token received | [ ] |
| 2 | POST `/tasks` with area_id | 201, task created | [ ] |
| 3 | POST `/tasks` with `assigned_to: satgas_user_id` | 201, task created and assigned | [ ] |
| 4 | POST `/tasks/:id/tag` with user_id | 200, tagged | [ ] |
| 5 | GET `/activities` | Own area's activities | [ ] |
| 6 | GET `/overtime` | Pending overtime for own area | [ ] |
| 7 | PATCH `/overtime/:id/approve` | 200, approved | [ ] |
| 8 | GET `/monitoring/area/:ownAreaId` | 200, area stats | [ ] |

### Path 3: Task Complete Flow (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as korlap1, create task | 201 | [ ] |
| 2 | Assign task to satgas1 | 200, assigned | [ ] |
| 3 | Login as satgas1 | JWT token | [ ] |
| 4 | POST `/tasks/:id/start` | 200, in_progress | [ ] |
| 5 | POST `/tasks/:id/complete` with photo + description | 200, completed | [ ] |
| 6 | GET `/tasks/:id` | Status: completed | [ ] |

### Path 4: Geofencing Verification (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as satgas1 | JWT token | [ ] |
| 2 | POST `/shifts/clock-in` from outside area polygon | 201 + `clock_in_outside_boundary=true` | [ ] |
| 3 | POST `/shifts/clock-out` from inside area | 200 + `clock_out_outside_boundary=false` | [ ] |
| 4 | Login as korlap1, GET `/monitoring/area/:id` | Shows boundary warning for satgas1 | [ ] |

### Path 5: Scope Authorization (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as kepala_rayon | JWT token | [ ] |
| 2 | GET `/monitoring/rayon/:ownRayonId` | 200 OK | [ ] |
| 3 | GET `/monitoring/rayon/:otherRayonId` | 403 Forbidden | [ ] |
| 4 | Login as korlap1 | JWT token | [ ] |
| 5 | GET `/monitoring/area/:ownAreaId` | 200 OK | [ ] |
| 6 | GET `/monitoring/area/:otherAreaId` | 403 Forbidden | [ ] |
| 7 | Login as superadmin | JWT token | [ ] |
| 8 | GET `/monitoring/rayon/:anyId` | 200 OK (no scope limit) | [ ] |

---

## Part 11: Mobile — Type System & Constants

### 11.1 UserRole Type (8 roles)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 169 | `models.types.ts` UserRole type | 8 values: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin | [ ] |
| 170 | No `'worker'`, `'supervisor'`, `'admin'` strings in `fe/mobile/src/` | Zero matches (except test mocks) | [ ] |
| 171 | TaskStatus type | 4 values: pending, assigned, in_progress, completed (no accepted/declined) | [ ] |

### 11.2 Role Constants (`constants/roles.ts`)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 172 | `ROLE_LABELS` map | All 8 roles → Indonesian display names | [ ] |
| 173 | `CLOCKABLE_ROLES` | [satgas, linmas, korlap, admin_data, kepala_rayon] | [ ] |
| 174 | `ACTIVITY_SUBMITTERS` | [satgas, linmas, korlap, admin_data] | [ ] |
| 175 | `TASK_CREATORS` | [korlap, kepala_rayon, top_management, admin_system, superadmin] | [ ] |
| 176 | `OVERTIME_SUBMITTERS` | [satgas, linmas] | [ ] |
| 177 | `OVERTIME_APPROVERS` | [korlap] | [ ] |
| 178 | `VALID_TASK_ASSIGNMENTS` | korlap→[satgas,linmas], kepala_rayon→[korlap], top_mgmt/admin_system/superadmin→[kepala_rayon,korlap] | [ ] |

### 11.3 Model Types Cleanup

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 179 | `Activity` interface exists | Replaces `WorkReport` | [ ] |
| 180 | `Overtime` interface exists | Flat structure (no nested aktivitas) | [ ] |
| 181 | `Schedule` interface exists | Replaces `WorkerSchedule` | [ ] |
| 182 | `TaskTag` interface exists | id, task_id, user_id | [ ] |
| 183 | No `WorkReport`, `ReportCondition`, `WorkerAssignment` types | Removed | [ ] |
| 184 | `Task` type has `rayon_id?`, `tags?`, no `activity_type_id` | Updated fields | [ ] |
| 185 | `Shift` type uses `user_id` not `worker_id` | Renamed | [ ] |

---

## Part 12: Mobile — Redux Store

### 12.1 Slices

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 186 | `activitiesSlice.ts` exists | Replaces `reportSlice.ts` | [ ] |
| 187 | `overtimeSlice.ts` exists | New slice for overtime state | [ ] |
| 188 | `store.ts` reducers | auth, shift, activities, offline, tasks, notifications, overtime | [ ] |
| 189 | No `reportSlice.ts` file | Deleted | [ ] |
| 190 | No `reportReducer` import | Removed from store.ts | [ ] |

### 12.2 Activities Slice State

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 191 | State shape: `activitiesList: Activity[]` | Not `reports: WorkReport[]` | [ ] |
| 192 | Actions: setActivities, addActivity, clearActivities | Not setReports, addReport | [ ] |

### 12.3 Overtime Slice State

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 193 | State: myOvertimes, pendingApprovals, selectedOvertime | All present | [ ] |
| 194 | Actions: setMyOvertimes, setPendingApprovals, addOvertime, updateOvertime | All present | [ ] |

---

## Part 13: Mobile — API Services

### 13.1 Activities API (`activitiesApi.ts`)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 195 | `activitiesApi.ts` exists | Replaces `reportsApi.ts` | [ ] |
| 196 | `createActivity()` → POST `/activities` | Correct endpoint | [ ] |
| 197 | `getMyActivities()` → GET `/activities/my` | Correct endpoint | [ ] |
| 198 | No `reportsApi.ts` file | Deleted | [ ] |

### 13.2 Overtime API (`overtimeApi.ts`)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 199 | `submitOvertime()` → POST `/overtime` | Correct endpoint | [ ] |
| 200 | `getMyOvertimes()` → GET `/overtime/my` | Correct endpoint | [ ] |
| 201 | `getPendingApprovals()` → GET `/overtime` | Correct endpoint | [ ] |
| 202 | `approveOvertime()` → PATCH `/overtime/:id/approve` | Correct endpoint | [ ] |
| 203 | `rejectOvertime()` → PATCH `/overtime/:id/reject` | Correct endpoint | [ ] |

### 13.3 Tasks API Updates

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 204 | No `acceptTask()` or `declineTask()` methods | Removed | [ ] |
| 205 | `getTaggedTasks()` → GET `/tasks/tagged` | New endpoint | [ ] |
| 206 | `completeTask()` sends `description` + `completion_photo_url` | No GPS fields | [ ] |
| 207 | `createTask()` sends optional `rayon_id`, `tagged_user_ids` | Updated fields | [ ] |

### 13.4 Other API Updates

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 208 | `shiftsApi.clockIn()`: area_id optional | Not required | [ ] |
| 209 | `monitoringApi`: `/monitoring/live-users` | Not `/live-workers` | [ ] |
| 210 | `index.ts` exports activitiesApi, overtimeApi | Not reportsApi | [ ] |

### 13.5 Offline Queue

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 211 | QueueItemType: `'activity'` | Not `'report'` | [ ] |
| 212 | `getPendingCountsByType()` returns `activity` key | Not `report` key | [ ] |

---

## Part 14: Mobile — Navigation

### 14.1 Unified MainNavigator

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 213 | `MainNavigator.tsx` exists | Single navigator for all 8 roles | [ ] |
| 214 | No `WorkerNavigator.tsx` | Deleted | [ ] |
| 215 | No `SupervisorNavigator.tsx` | Deleted | [ ] |
| 216 | `RootNavigator.tsx` uses MainNavigator | Not WorkerNavigator/SupervisorNavigator | [ ] |

### 14.2 Tab Configuration per Role

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 217 | satgas tabs | Home, Aktivitas, Tugas, Lembur, Profil | [ ] |
| 218 | linmas tabs | Home, Aktivitas, Tugas, Lembur, Profil | [ ] |
| 219 | korlap tabs | Home, Aktivitas, Tugas, Lembur, Monitoring | [ ] |
| 220 | admin_data tabs | Home, Aktivitas, Monitoring, Lembur, Profil | [ ] |
| 221 | kepala_rayon tabs | Home, Tugas, Monitoring, Profil | [ ] |
| 222 | top_management tabs | Monitoring, Tugas, Profil | [ ] |
| 223 | admin_system tabs | Monitoring, Tugas, Profil | [ ] |
| 224 | superadmin tabs | Monitoring, Tugas, Profil | [ ] |

### 14.3 Hidden Stack Screens

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 225 | ClockInOut screen registered | Hidden from tab bar | [ ] |
| 226 | ActivitySubmission screen registered | Hidden from tab bar | [ ] |
| 227 | ActivityDetail screen registered | Hidden from tab bar | [ ] |
| 228 | TaskDetail screen registered | Hidden from tab bar | [ ] |
| 229 | TaskComplete screen registered | Hidden from tab bar | [ ] |
| 230 | TaskCreate screen registered | Hidden from tab bar | [ ] |
| 231 | OvertimeSubmit screen registered | Hidden from tab bar | [ ] |
| 232 | OvertimeDetail screen registered | Hidden from tab bar | [ ] |
| 233 | OvertimeApproval screen registered | Hidden from tab bar | [ ] |
| 234 | ShiftHistory screen registered | Hidden from tab bar | [ ] |
| 235 | Settings screen registered | Hidden from tab bar | [ ] |

---

## Part 15: Mobile — Screen Changes

### 15.1 ClockInOutScreen — Soft Geofencing

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 236 | No boundary blocking on clock-in | Warning banner only, never blocks | [ ] |
| 237 | Yellow warning banner shown when outside area | "Anda berada di luar area kerja" | [ ] |
| 238 | Clock-in button always enabled (GPS + selfie ready) | No `!isWithinBoundary` in disabled condition | [ ] |
| 239 | Polygon boundary check used (not radius-only) | `isWithinAreaBoundary()` from gpsUtils | [ ] |
| 240 | Area auto-detected from schedule | No explicit area_id required | [ ] |

### 15.2 ActivitySubmissionScreen (was ReportSubmissionScreen)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 241 | Screen exists at `screens/field/ActivitySubmissionScreen.tsx` | Not ReportSubmissionScreen | [ ] |
| 242 | Activity type dropdown (role-filtered from API) | Not hardcoded WORK_TYPES | [ ] |
| 243 | Photo capture (1-3 photos) | Camera integration | [ ] |
| 244 | Description field (required) | Max 1000 chars | [ ] |
| 245 | GPS auto-capture | Lat/lng from device | [ ] |
| 246 | Calls `createActivity()` API | Not `createReport()` | [ ] |
| 247 | Uses `activitiesSlice` | Not `reportSlice` | [ ] |

### 15.3 ActivityDetailScreen (NEW)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 248 | Screen exists at `screens/field/ActivityDetailScreen.tsx` | New file | [ ] |
| 249 | Shows activity type, description, area | Read-only detail view | [ ] |
| 250 | Shows photos (horizontal scroll) | Image gallery | [ ] |
| 251 | Shows GPS coordinates, timestamp | If available | [ ] |
| 252 | Fetches via `getActivityById()` | Correct API call | [ ] |

### 15.4 TasksActivityScreen (was TasksReportsScreen)

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 253 | 3 tabs: "Tugas Saya", "Tag Saya", "Aktivitas" | Not "Laporan" | [ ] |
| 254 | "Tag Saya" tab uses `getTaggedTasks()` | New API endpoint | [ ] |
| 255 | "Aktivitas" tab uses `getMyActivities()` | Not `getMyReports()` | [ ] |
| 256 | No accept/decline status badges | Removed | [ ] |

### 15.5 TaskDetailScreen

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 257 | No accept/decline buttons | Removed | [ ] |
| 258 | Shows tagged users section | From `task.tags` | [ ] |
| 259 | Shows rayon name if present | `task.rayon.name` | [ ] |
| 260 | Uses `task.creator` for "assigned by" | Not `task.assigned_by` | [ ] |

### 15.6 TaskCompleteScreen

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 261 | No GPS location section | Removed entirely | [ ] |
| 262 | Required description field | New field | [ ] |
| 263 | Required completion photo | Existing | [ ] |
| 264 | Submit sends description + photo URL only | No gps_lat/gps_lng | [ ] |

### 15.7 ProfileScreen

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 265 | Role badge shows all 8 Phase 2C roles | satgas→"Satgas", korlap→"Koordinator Lapangan", etc. | [ ] |
| 266 | Sync status uses `activity` key | Not `report` key | [ ] |
| 267 | Pending description shows "aktivitas" | Not "laporan" | [ ] |

### 15.8 MapDashboardScreen

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 268 | Uses `getActiveUsers()` API | Not `getActiveWorkers()` | [ ] |
| 269 | Uses `UserMarker` component | Not `WorkerMarker` | [ ] |
| 270 | Uses `UserInfoCard` component | Not `WorkerInfoCard` | [ ] |
| 271 | Polygon boundary check in `calculateUserStatus()` | Polygon-first, radius fallback | [ ] |

---

## Part 16: Mobile — New Screens

### 16.1 Overtime Screens

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 272 | `OvertimeListScreen.tsx` exists | New file in screens/overtime/ | [ ] |
| 273 | Tabs: "Pengajuan Saya" + "Menunggu Persetujuan" (korlap) | Role-filtered tabs | [ ] |
| 274 | `OvertimeSubmitScreen.tsx` exists | Flat form (date, time, photos, type, desc) | [ ] |
| 275 | `OvertimeDetailScreen.tsx` exists | Read-only detail view | [ ] |
| 276 | `OvertimeApprovalScreen.tsx` exists | Approve/reject for korlap | [ ] |
| 277 | Reject requires reason input | Validation | [ ] |

### 16.2 Task Create Screen

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 278 | `TaskCreateScreen.tsx` exists | In screens/taskActivity/ (moved from screens/tasks/) | [ ] |
| 279 | Access restricted to TASK_CREATORS | Role check | [ ] |
| 280 | Fields: title, description, priority, deadline, area, rayon, assignee, tags | Complete form | [ ] |
| 281 | Hierarchical assignment validation | korlap→satgas/linmas only, etc. | [ ] |

---

## Part 17: Mobile — Dead Code Cleanup

| # | Test Case | Expected | Status |
|---|-----------|----------|--------|
| 282 | No `WorkerNavigator.tsx` file | Deleted | [ ] |
| 283 | No `SupervisorNavigator.tsx` file | Deleted | [ ] |
| 284 | No `reportSlice.ts` file | Deleted | [ ] |
| 285 | No `reportsApi.ts` file | Deleted | [ ] |
| 286 | No `ReportListItem.tsx` component | Deleted | [ ] |
| 287 | No `ReportCard.tsx` component | Deleted | [ ] |
| 288 | No `WorkerHomeHeader.tsx` component | Replaced by FieldHomeHeader | [ ] |
| 289 | No `WorkerMarker.tsx` component | Replaced by UserMarker | [ ] |
| 290 | No `WorkerInfoCard.tsx` component | Replaced by UserInfoCard | [ ] |
| 291 | No imports of deleted files in any source | Zero broken imports | [ ] |

---

## Part 18: Mobile — Quick Test Paths (On Device/Emulator)

### Path M1: Satgas Mobile Workflow (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as satgas1 | Home screen with 5 tabs | [x] |
| 2 | Verify Home: header, FAB, today stats | Greeting + role badge + Clock In/Out FAB visible | [x] |
| 3 | Tap FAB → ClockInOut screen | Back button in header, "Clock In" title, area card, GPS card | [x] |
| 4 | Clock in (outside area) | Yellow warning banner, clock-in succeeds | [x] |
| 5 | Tap "Tugas & Aktivitas" tab | Filter bar + task/activity list | [ ] |
| 6 | Submit activity (photo + type + description) | Success, activity in list | [ ] |
| 7 | View task detail + start task | Status → in_progress | [ ] |
| 8 | Tap "Lembur" tab | Overtime list + submit FAB | [ ] |
| 9 | Submit overtime (flat form) | Success, overtime in list | [ ] |
| 10 | Tap "Profil" tab | 8-role badge shows "Satgas" | [ ] |
| 11 | Clock out | Shift ended | [ ] |

### Path M1b: Linmas Mobile Workflow (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as linmas1 | Home screen with 5 tabs (same layout as satgas) | [x] |
| 2 | Verify Home: header, FAB, today stats | Greeting + "Linmas" role badge + Clock In/Out FAB visible | [x] |
| 3 | Tap FAB → ClockInOut screen | Back button in header, "Clock In" title, area card, GPS card | [x] |
| 4 | Clock in | Geofencing banner (inside/outside area), clock-in succeeds | [x] |
| 5 | Tap "Tugas & Aktivitas" tab | Filter bar + task/activity list (linmas-specific activity types) | [ ] |
| 6 | Submit activity (patroli / insiden type) | Success, activity in list | [ ] |
| 7 | Tap "Lembur" tab | Overtime list + submit FAB | [ ] |
| 8 | Tap "Profil" tab | 8-role badge shows "Linmas" | [ ] |

### Path M2: Korlap Mobile Workflow (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as korlap1 | Home screen with 5 tabs (has Monitoring) | [ ] |
| 2 | Tap "Monitoring" tab | Map dashboard with user markers | [ ] |
| 3 | Check boundary indicators | Users outside boundary show warning | [ ] |
| 4 | Tap "Tugas" tab → Create Task | TaskCreate form | [ ] |
| 5 | Create task assigned to satgas1 | Success | [ ] |
| 6 | Tap "Lembur" tab → "Menunggu Persetujuan" | Pending overtime list | [ ] |
| 7 | Approve overtime | Status changes to approved | [ ] |
| 8 | Tap "Aktivitas" tab | Area activities visible | [ ] |

### Path M3: Admin System Mobile Workflow (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as admin_system | 3 tabs: Monitoring, Tugas, Profil | [ ] |
| 2 | Tap "Monitoring" tab | Full city-wide map view | [ ] |
| 3 | Tap "Tugas" tab → Create Task | Can assign to kepala_rayon or korlap | [ ] |
| 4 | Tap "Profil" tab | Badge shows "Admin Sistem" | [ ] |

### Path M4: Navigation Verification (10 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as satgas1 | 5 tabs visible | [ ] |
| 2 | Logout, login as admin_data | 5 tabs visible (Home, Aktivitas, Monitoring, Lembur, Profil) | [ ] |
| 3 | Logout, login as kepala_rayon | 4 tabs visible (Home, Tugas, Monitoring, Profil) | [ ] |
| 4 | Logout, login as top_management | 3 tabs visible (Monitoring, Tugas, Profil) | [ ] |

---

## Test Results Summary

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Part 1: Role System | 22 | - | - | - |
| Part 2: Terminology Cleanup | 21 | - | - | - |
| Part 3: Shifts + Geofencing | 13 | - | - | - |
| Part 4: Activities | 16 | - | - | - |
| Part 5: Tasks | 21 | - | - | - |
| Part 6: Overtime (Flat) | 23 | - | - | - |
| Part 7: Polygon Geofencing | 11 | - | - | - |
| Part 8: Monitoring Scope | 9 | - | - | - |
| Part 9: Seed Data | 14 | - | - | - |
| Part 10: Test Suite & Quality | 18 | - | - | - |
| Part 11: Mobile Types & Constants | 17 | - | - | - |
| Part 12: Mobile Redux Store | 9 | - | - | - |
| Part 13: Mobile API Services | 18 | - | - | - |
| Part 14: Mobile Navigation | 23 | - | - | - |
| Part 15: Mobile Screen Changes | 36 | - | - | - |
| Part 16: Mobile New Screens | 10 | - | - | - |
| Part 17: Mobile Dead Code Cleanup | 10 | - | - | - |
| Part 18: Mobile Quick Test Paths | 40 | 8 (M1:1-4, M1b:1-4) | 0 | 32 |
| **TOTAL** | **331** | **8** | **0** | **323** |

*Note: Parts 1-10 are backend manual tests (Postman + code review). Parts 11-18 are mobile manual tests (code review + device/emulator).*
*Path M1b (Linmas) added Feb 18, 2026. Steps 1-4 of M1 and M1b passed (Login, Home, ClockInOut — satgas + linmas).*

---

## Deployment Procedures (Post-Approval)

### Database Migration

```bash
# SSH to staging EC2
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar

# Backup database first
docker-compose exec postgres pg_dump -U postgres sekar_db > backup_pre_phase2c_$(date +%Y%m%d).sql

# Run migrations (TypeORM auto-sync handles schema in dev)
docker-compose run --rm backend npm run migration:run:prod

# Verify table renames
docker-compose exec postgres psql -U postgres -d sekar_db -c "\dt"
# Expected: schedules (not worker_schedules), activities (not work_reports)
# Expected: NO worker_assignments, NO overtime_aktivitas
# Expected: 17 total tables

# Verify column renames
docker-compose exec postgres psql -U postgres -d sekar_db \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name='shifts' AND column_name='user_id';"
# Expected: 1 row (user_id, not worker_id)
```

### Staging Deployment

```bash
# Option 1: GitHub Actions (Automated)
git checkout staging
git merge f/phase-2-c-client-feedback
git push origin staging
# Monitor: https://github.com/<org>/sekar/actions

# Option 2: Manual
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar
git pull origin staging
docker-compose build backend
docker-compose up -d
docker-compose logs -f backend
```

### Post-Deployment Verification

```bash
API_URL="http://staging.sekar.wahyutrip.com"

# Health check
curl $API_URL/api/health

# Get admin token
TOKEN=$(curl -s -X POST $API_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' \
  | jq -r '.access_token')

# Test Phase 2C endpoints (new routes)
echo "=== Testing Activities (was /aktivitas) ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/activities | jq '.'

echo "=== Testing Schedules (was /worker-schedules) ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/schedules | jq '.'

echo "=== Testing Overtime (flat) ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/overtime | jq '.'

echo "=== Testing Task Tags ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/tasks/tagged | jq '.'

echo "=== Verify old routes removed ==="
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/aktivitas
# Expected: 404

curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/reports
# Expected: 404

curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/worker-schedules
# Expected: 404
```

### Rollback Procedure

```bash
# Revert to pre-Phase 2C
ssh -i sekar-key.pem ec2-user@<staging-elastic-ip>
cd ~/sekar

# Stop containers
docker-compose down

# Restore database
cat backup_pre_phase2c_YYYYMMDD.sql | \
  docker-compose exec -T postgres psql -U postgres -d sekar_db

# Checkout previous version
git checkout main -- be/src/
docker-compose build backend
docker-compose up -d
```

---

*Phase 2C Client Feedback: Deployment & Testing Checklist*
*Last Updated: February 12, 2026*
