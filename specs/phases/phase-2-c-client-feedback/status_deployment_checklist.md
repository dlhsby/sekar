# Phase 2C - Deployment & Testing Checklist

**Purpose:** Comprehensive deployment procedures and manual testing checklist for Phase 2C verification.
**Last Updated:** February 11, 2026
**Status:** Backend Ready for Manual Testing ✅

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
| Superadmin | superadmin | superadmin123 | Full system access |
| Admin System | admin_system | admin123 | System administration |
| Admin Data | admin_data | admin123 | Data management |
| Korlap | korlap1 | password123 | Area coordinator |
| Satgas 1 | satgas1 | password123 | Field worker |
| Satgas 2 | satgas2 | password123 | Field worker |
| Satgas 3 | satgas3 | password123 | Field worker |
| Linmas 1 | linmas1 | password123 | Security officer |
| Kepala Rayon | kepala_rayon_selatan | password123 | Rayon manager |
| Top Management | top_management1 | password123 | City-wide view |

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
# Expected: 58/58 suites, 888/888 tests passing, 0 failures

# 3. Check test coverage
npm run test:cov
# Expected: >80% branch coverage (currently 81.64%)

# 4. Individual Phase 2C module tests
npx jest --testPathPattern='overtime' --no-coverage
# Expected: 20 tests passing (14 service + 6 controller)

npx jest --testPathPattern='tasks' --no-coverage
# Expected: All task tests passing (4-status workflow)

npx jest --testPathPattern='reports' --no-coverage
# Expected: All reports tests passing (scoped access)

npx jest --testPathPattern='monitoring' --no-coverage
# Expected: All monitoring tests passing (scope auth)

# 5. Seed data verification
npm run seed
# Expected: No errors, all data seeded
```

### Postman Setup

```bash
# Import into Postman:
# 1. Import collection: postman/SEKAR.postman_collection.json
# 2. Import environment: postman/SEKAR - Local.postman_environment.json
# 3. Select "SEKAR - Local" environment
# 4. Login as different roles to get JWT tokens
```

---

## Part 1: Role System Overhaul (ADR-009)

### 1.1 UserRole Enum (8 roles)

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 1 | Code Review: `user.entity.ts` UserRole enum | Exactly 8 values: satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin | [ ] | |
| 2 | Code Search: No old role references in `be/src/` | No `worker`, `supervisor`, `admin`, `koordinator_lapangan` strings | [ ] | |
| 3 | Seed data uses new role names | seed-phase2.ts creates users with new roles | [ ] | |

### 1.2 Role Group Constants

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 4 | `users/constants/role-groups.ts` exists | File with 11+ constants | [ ] | |
| 5 | `CLOCKABLE_ROLES` | [satgas, linmas, korlap, admin_data] | [ ] | |
| 6 | `AKTIVITAS_SUBMITTERS` | [satgas, linmas, korlap, admin_data] | [ ] | |
| 7 | `TASK_CREATORS` | [korlap, kepala_rayon, top_management, admin_system, superadmin] | [ ] | |
| 8 | `TASK_RECEIVERS` | [satgas, linmas, korlap, kepala_rayon] | [ ] | |
| 9 | `OVERTIME_SUBMITTERS` | [satgas, linmas] | [ ] | |
| 10 | `OVERTIME_APPROVERS` | [korlap] | [ ] | |
| 11 | `MONITORING_CITY` | [top_management, admin_system, superadmin] | [ ] | |
| 12 | `MONITORING_RAYON` | [kepala_rayon, ...MONITORING_CITY] | [ ] | |
| 13 | `MONITORING_AREA` | [korlap, ...MONITORING_RAYON] | [ ] | |
| 14 | `USER_MANAGERS` | [admin_system, superadmin] | [ ] | |

### 1.3 User Entity Changes

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 15 | `users.entity.ts` has `area_id` column | Nullable UUID, FK to areas | [ ] | |
| 16 | `@ManyToOne(() => Area)` relation exists | Area relation | [ ] | |
| 17 | CreateUserDto accepts `area_id` | Optional UUID field | [ ] | |

### 1.4 @Roles Decorator Usage

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 18 | `shifts.controller.ts` clock-in | `@Roles(...CLOCKABLE_ROLES)` | [ ] | |
| 19 | `reports.controller.ts` create | `@Roles(...AKTIVITAS_SUBMITTERS)` | [ ] | |
| 20 | `tasks.controller.ts` create | `@Roles(...TASK_CREATORS)` | [ ] | |
| 21 | `monitoring.controller.ts` endpoints | Uses MONITORING_* groups | [ ] | |
| 22 | `overtime.controller.ts` submit | `@Roles(...OVERTIME_SUBMITTERS)` | [ ] | |

---

## Part 2: Shifts Module Changes

### 2.1 ClockIn DTO & GPS Removal

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 23 | Code Review: `clock-in.dto.ts` area_id | `@IsOptional()` (not required) | [ ] | |
| 24 | Code Review: GPS boundary validation | Removed from clockIn service | [ ] | |
| 25 | `getActiveArea()` method exists | In shifts.service.ts | [ ] | |
| 26 | Auto-detection priority | WorkerSchedule → WorkerAssignment → null | [ ] | |

### 2.2 Postman: Shifts

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 27 | Login as satgas1 → POST `/shifts/clock-in` without area_id | 201, area auto-detected | [ ] | |
| 28 | Login as satgas1 → POST `/shifts/clock-in` with area_id | 201, uses provided area | [ ] | |
| 29 | Login as linmas1 → POST `/shifts/clock-in` | 201 (linmas is clockable) | [ ] | |
| 30 | Login as korlap1 → POST `/shifts/clock-in` | 201 (korlap is clockable) | [ ] | |
| 31 | Login as kepala_rayon → POST `/shifts/clock-in` | 403 (not clockable) | [ ] | |

---

## Part 3: Aktivitas Module (Reports → Aktivitas)

### 3.1 Controller Path

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 32 | Code Review: `reports.controller.ts` | `@Controller('aktivitas')` | [ ] | |
| 33 | GET `/api/v1/aktivitas` | 200 OK, accessible | [ ] | |
| 34 | GET `/api/v1/reports` | 404 Not Found (old path removed) | [ ] | |

### 3.2 Create Aktivitas

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 35 | POST `/aktivitas` — valid body (satgas1, clocked in) | 201 Created | [ ] | |
| 36 | POST `/aktivitas` — requires `activity_type_id` | UUID required | [ ] | |
| 37 | POST `/aktivitas` — requires `description` (5-500 chars) | Validation | [ ] | |
| 38 | POST `/aktivitas` — requires `photo_urls` (1-3 array) | Array validation | [ ] | |
| 39 | POST `/aktivitas` — `gps_lat`/`gps_lng` optional | Nullable, accepted | [ ] | |
| 40 | POST `/aktivitas` — auto-detects active shift | No shift_id in body needed | [ ] | |
| 41 | POST `/aktivitas` — validates activity_type.applicable_roles | Rejects mismatched role | [ ] | |
| 42 | POST `/aktivitas` — without active shift | 400 Bad Request | [ ] | |

### 3.3 Scoped Access

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 43 | Login as satgas1 → GET `/aktivitas` | Own reports only | [ ] | |
| 44 | Login as korlap1 → GET `/aktivitas` | Own area's reports | [ ] | |
| 45 | Login as kepala_rayon → GET `/aktivitas` | Own rayon's reports | [ ] | |
| 46 | Login as superadmin → GET `/aktivitas` | All reports | [ ] | |

---

## Part 4: Tasks Module Redesign

### 4.1 TaskStatus Simplification

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 47 | Code Review: `task.entity.ts` TaskStatus | Exactly 4: pending, assigned, in_progress, completed | [ ] | |
| 48 | Code Search: No `accepted`/`declined` in `be/src/` | Zero references | [ ] | |
| 49 | No `accept()` method in tasks.controller.ts | Method removed | [ ] | |
| 50 | No `decline()` method in tasks.controller.ts | Method removed | [ ] | |
| 51 | No `DeclineTaskDto` file | File deleted | [ ] | |

### 4.2 Task Entity Changes

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 52 | `task.entity.ts` has `rayon_id` | Nullable UUID, FK to rayons | [ ] | |
| 53 | `task.entity.ts` has `area_id` as nullable | Changed from NOT NULL | [ ] | |
| 54 | `task.entity.ts` has `tags` relation | OneToMany to TaskTag | [ ] | |
| 55 | No `activity_type_id` in Task entity | Field removed | [ ] | |

### 4.3 TaskTag Entity

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 56 | `task-tag.entity.ts` exists | task_id + user_id | [ ] | |
| 57 | UNIQUE constraint on (task_id, user_id) | Prevents duplicates | [ ] | |

### 4.4 Tag Endpoints

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 58 | POST `/tasks/:id/tag` with `{ user_id }` | Adds tag, 201 | [ ] | |
| 59 | DELETE `/tasks/:id/tag/:userId` | Removes tag, 200 | [ ] | |
| 60 | GET `/tasks/tagged` | Returns tasks where user is tagged | [ ] | |

### 4.5 Create Task

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 61 | `CreateTaskDto` accepts `rayon_id` | Optional UUID | [ ] | |
| 62 | `CreateTaskDto` accepts `tagged_user_ids[]` | Optional UUID array | [ ] | |
| 63 | No `activity_type_id` in CreateTaskDto | Field removed | [ ] | |
| 64 | Login as korlap1 → POST `/tasks` with area_id | 201 Created | [ ] | |
| 65 | Login as satgas1 → POST `/tasks` | 403 Forbidden (not TASK_CREATOR) | [ ] | |

### 4.6 Complete Task

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 66 | `CompleteTaskDto` requires `completion_photo_url` | String required | [ ] | |
| 67 | `CompleteTaskDto` requires `description` | String required | [ ] | |
| 68 | No `gps_lat`/`gps_lng` in CompleteTaskDto | Fields removed | [ ] | |
| 69 | Workflow: assigned → in_progress → completed | No accept step | [ ] | |

### 4.7 Hierarchy Validation

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 70 | `VALID_TASK_ASSIGNMENTS` constant exists | Defines who assigns to whom | [ ] | |
| 71 | `validateHierarchy()` method exists | Prevents same/higher role assignment | [ ] | |
| 72 | korlap assigns to satgas | 200 OK | [ ] | |
| 73 | satgas assigns to korlap | 403 Forbidden | [ ] | |

### 4.8 Postman: Task Workflow

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 74 | Login as korlap1 → POST `/tasks` | 201 Created | [ ] | |
| 75 | POST `/tasks/:id/assign` with satgas worker_id | 200, status: assigned | [ ] | |
| 76 | Login as satgas1 → POST `/tasks/:id/start` | 200, status: in_progress | [ ] | |
| 77 | POST `/tasks/:id/complete` with photo + description | 200, status: completed | [ ] | |
| 78 | Login as korlap1 → POST `/tasks/:id/tag` with user_id | 200 | [ ] | |
| 79 | Login as satgas1 → GET `/tasks/tagged` | Includes tagged task | [ ] | |

---

## Part 5: Overtime Module (NEW)

### 5.1 Entity Structure

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 80 | `overtime.entity.ts` exists | All fields: id, user_id, area_id, date, start_time, end_time, status, approved_by, approved_at, rejection_reason, notes | [ ] | |
| 81 | `overtime-aktivitas.entity.ts` exists | overtime_id, activity_type_id, description, photo_urls, gps_lat, gps_lng | [ ] | |
| 82 | OvertimeStatus enum | pending, approved, rejected | [ ] | |
| 83 | Cascade saving works | Overtime + nested aktivitas saved atomically | [ ] | |

### 5.2 Submit Overtime

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 84 | Login as satgas1 → POST `/overtime` | 201, overtime created | [ ] | |
| 85 | Login as linmas1 → POST `/overtime` | 201 (linmas can submit) | [ ] | |
| 86 | Login as korlap1 → POST `/overtime` | 403 (not OVERTIME_SUBMITTER) | [ ] | |
| 87 | Submit with invalid activity_type for role | 400/403 error | [ ] | |
| 88 | Submit with 0 aktivitas items | 400 Bad Request | [ ] | |
| 89 | Each aktivitas requires 1-3 photo_urls | Validation enforced | [ ] | |

### 5.3 Approve/Reject Overtime

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 90 | Login as korlap1 → PATCH `/overtime/:id/approve` | 200, status: approved | [ ] | |
| 91 | Approve already-approved overtime | 400 Bad Request | [ ] | |
| 92 | Korlap approve for other area's overtime | 403 Forbidden | [ ] | |
| 93 | Login as satgas1 → PATCH `/overtime/:id/approve` | 403 (not OVERTIME_APPROVER) | [ ] | |
| 94 | Login as korlap1 → PATCH `/overtime/:id/reject` | 200, status: rejected | [ ] | |
| 95 | Reject without reason | 400 Bad Request | [ ] | |
| 96 | Reject with reason | 200, rejection_reason saved | [ ] | |
| 97 | Korlap reject for other area's overtime | 403 Forbidden | [ ] | |

### 5.4 List Overtime

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 98 | Login as satgas1 → GET `/overtime/my` | Own overtime only | [ ] | |
| 99 | Login as korlap1 → GET `/overtime` | Pending, own area only | [ ] | |
| 100 | Login as superadmin → GET `/overtime` | All pending overtime | [ ] | |
| 101 | GET `/overtime/:id` | Full overtime details with aktivitas | [ ] | |

---

## Part 6: Monitoring Module Scope Authorization

### 6.1 Scope Checks

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 102 | Code Review: monitoring.controller.ts getRayonStats | Checks kepala_rayon's rayon_id matches | [ ] | |
| 103 | Code Review: monitoring.controller.ts getAreaStats | Checks korlap's area_id matches | [ ] | |
| 104 | Code Review: monitoring.service.ts | No TaskStatus.ACCEPTED or DECLINED references | [ ] | |

### 6.2 Postman: Monitoring Scope

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 105 | Login as kepala_rayon → GET `/monitoring/rayon/:ownRayonId` | 200 OK | [ ] | |
| 106 | Login as kepala_rayon → GET `/monitoring/rayon/:otherRayonId` | 403 Forbidden | [ ] | |
| 107 | Login as korlap1 → GET `/monitoring/area/:ownAreaId` | 200 OK | [ ] | |
| 108 | Login as korlap1 → GET `/monitoring/area/:otherAreaId` | 403 Forbidden | [ ] | |
| 109 | Login as superadmin → GET `/monitoring/rayon/:anyId` | 200 OK | [ ] | |
| 110 | Login as superadmin → GET `/monitoring/area/:anyId` | 200 OK | [ ] | |

---

## Part 7: Seed Data Verification

### 7.1 User Seeds

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 111 | `seed-phase2.ts` uses new role names | satgas, korlap, etc. (not worker, supervisor) | [ ] | |
| 112 | Korlap user has `area_id` assigned | area_id set | [ ] | |
| 113 | admin_data user exists | Role: admin_data | [ ] | |
| 114 | admin_system user exists | Role: admin_system | [ ] | |
| 115 | kepala_rayon user has `rayon_id` | rayon_id set | [ ] | |

### 7.2 Activity Type Seeds

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 116 | Lowercase `applicable_roles` | `['satgas']` not `['Worker']` | [ ] | |
| 117 | Satgas-specific types | 8 types | [ ] | |
| 118 | Linmas-specific types | 5 types | [ ] | |
| 119 | Korlap-specific types | 4 types | [ ] | |
| 120 | Admin_data-specific types | 3 types | [ ] | |

### 7.3 Task Seeds

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 121 | `seed-tasks.ts` uses 4 statuses only | pending, assigned, in_progress, completed | [ ] | |
| 122 | No activity_type_id on tasks | Field removed | [ ] | |
| 123 | Tasks have rayon_id where appropriate | Rayon-scoped tasks exist | [ ] | |

### 7.4 Seed Execution

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 124 | `npm run seed` completes | No errors | [ ] | |
| 125 | Database has expected test data | Users, areas, tasks, activity types | [ ] | |

---

## Part 8: Test Suite & Code Quality

### 8.1 Test Results

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 126 | `npm test` — all suites pass | 58/58 suites | [ ] | |
| 127 | Total tests | 888/888 passing | [ ] | |
| 128 | No skipped or pending tests | 0 skipped | [ ] | |

### 8.2 Coverage

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 129 | `npm run test:cov` — branch coverage | >80% (81.64%) | [ ] | |
| 130 | Overtime module coverage | >80% | [ ] | |
| 131 | Tasks module coverage | >80% | [ ] | |
| 132 | Reports module coverage | >80% | [ ] | |
| 133 | Monitoring module coverage | >80% | [ ] | |

### 8.3 Specific Test Scenarios

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 134 | Overtime service tests | 14 tests including area mismatch | [ ] | |
| 135 | Overtime controller tests | 6 tests | [ ] | |
| 136 | Tasks service: 4-status workflow | Updated, no accept/decline | [ ] | |
| 137 | Tasks controller: no accept/decline refs | Tests removed | [ ] | |
| 138 | Reports service: findAllPaginated with User | Scoped access tests | [ ] | |
| 139 | Monitoring controller: scope auth | 4+ tests | [ ] | |

### 8.4 Code Quality

| # | Test Case | Expected | Status | Verdict |
|---|-----------|----------|--------|---------|
| 140 | No `TaskStatus.ACCEPTED`/`DECLINED` in `be/src/` | Zero references | [ ] | |
| 141 | No `DeclineTaskDto` imports | Zero references | [ ] | |
| 142 | No `gps_lat`/`gps_lng` in CompleteTaskDto | Fields removed | [ ] | |
| 143 | No `activity_type_id` in CreateTaskDto/Task entity | Field removed | [ ] | |
| 144 | `npx tsc --noEmit` — 0 errors | Clean TypeScript | [ ] | |
| 145 | No `any` type in overtime module | Strict typing | [ ] | |
| 146 | Immutability (spread operators) | No direct mutation | [ ] | |
| 147 | Indonesian error messages (user-facing) | "Anda hanya dapat..." | [ ] | |

---

## Quick Test Paths

### Path 1: Satgas Worker Journey (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as satgas1 | JWT token received | [ ] |
| 2 | POST `/shifts/clock-in` (no area_id) | 201, area auto-detected | [ ] |
| 3 | POST `/aktivitas` with activity_type_id + photo | 201, aktivitas created | [ ] |
| 4 | GET `/aktivitas` | Own aktivitas only | [ ] |
| 5 | POST `/shifts/clock-out` | 200, shift ended | [ ] |
| 6 | POST `/overtime` with aktivitas | 201, overtime submitted | [ ] |
| 7 | GET `/overtime/my` | Own overtime listed | [ ] |
| 8 | GET `/tasks/tagged` | Tagged tasks (if any) | [ ] |

### Path 2: Korlap Supervisor Journey (15 minutes)

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | Login as korlap1 | JWT token received | [ ] |
| 2 | POST `/tasks` with area_id | 201, task created | [ ] |
| 3 | POST `/tasks/:id/assign` with satgas worker_id | 200, assigned | [ ] |
| 4 | POST `/tasks/:id/tag` with user_id | 200, tagged | [ ] |
| 5 | GET `/aktivitas` | Own area's aktivitas | [ ] |
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

### Path 4: Scope Authorization (10 minutes)

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

## Test Results Summary

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Part 1: Role System | 22 | - | - | - |
| Part 2: Shifts | 9 | - | - | - |
| Part 3: Aktivitas | 15 | - | - | - |
| Part 4: Tasks | 33 | - | - | - |
| Part 5: Overtime | 22 | - | - | - |
| Part 6: Monitoring Scope | 9 | - | - | - |
| Part 7: Seed Data | 15 | - | - | - |
| Part 8: Test Suite & Quality | 22 | - | - | - |
| **TOTAL** | **147** | **0** | **0** | **147** |

*Note: All 888 backend automated tests are passing. The 147 manual tests above are for human verification via Postman + code review.*

---

## Review Summary

| Section | Pass | Issues |
|---------|------|--------|
| Part 1: Role System | [ ] | |
| Part 2: Shifts | [ ] | |
| Part 3: Aktivitas | [ ] | |
| Part 4: Tasks | [ ] | |
| Part 5: Overtime | [ ] | |
| Part 6: Monitoring Scope | [ ] | |
| Part 7: Seed Data | [ ] | |
| Part 8: Test Suite & Quality | [ ] | |

**Overall:** [ ] APPROVED / [ ] NEEDS CHANGES

**Reviewer Notes:**

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

# Verify new tables
docker-compose exec postgres psql -U postgres -d sekar_db -c "\dt"
# Expected new: task_tags, overtimes, overtime_aktivitas
# Expected changes: users.area_id, tasks.rayon_id, TaskStatus enum
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
  -d '{"username":"superadmin","password":"superadmin123"}' \
  | jq -r '.access_token')

# Test Phase 2C endpoints
echo "=== Testing Aktivitas ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/aktivitas | jq '.'

echo "=== Testing Overtime ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/overtime | jq '.'

echo "=== Testing Task Tags ==="
curl -s -H "Authorization: Bearer $TOKEN" $API_URL/api/v1/tasks/tagged | jq '.'
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
*Last Updated: February 11, 2026*
