# Phase 2C Backend Review Checklist

**Reviewer:** Manual Review
**Branch:** `f/phase-2-c-client-feedback`
**Commits:** `23bb5ed` (main impl) + `3cb6190` (spec compliance fixes)
**Backend Tests:** 888/888 passing, 81.64% branch coverage

---

## How to Use This Checklist

1. Start the backend: `cd be && npm run start:dev`
2. Import Postman collection from `postman/SEKAR.postman_collection.json`
3. Import Postman environment from `postman/SEKAR - Local.postman_environment.json`
4. Run `npm run seed` to seed Phase 2C test data
5. Work through each section below using Postman + code review

---

## A. Role System Overhaul (ADR-009)

### A1. UserRole Enum (8 roles)
- [ ] `user.entity.ts` — UserRole enum has exactly 8 values: `satgas`, `linmas`, `korlap`, `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`
- [ ] No references to old roles: `worker`, `supervisor`, `admin`, `koordinator_lapangan` in source code (search `be/src/`)
- [ ] Seed data uses new role names

### A2. Role Group Constants
- [ ] `users/constants/role-groups.ts` exists with 11+ role group constants
- [ ] Groups verified:
  - [ ] `CLOCKABLE_ROLES` = [satgas, linmas, korlap, admin_data]
  - [ ] `AKTIVITAS_SUBMITTERS` = [satgas, linmas, korlap, admin_data]
  - [ ] `TASK_CREATORS` = [korlap, kepala_rayon, top_management, admin_system, superadmin]
  - [ ] `TASK_RECEIVERS` = [satgas, linmas, korlap, kepala_rayon]
  - [ ] `OVERTIME_SUBMITTERS` = [satgas, linmas]
  - [ ] `OVERTIME_APPROVERS` = [korlap]
  - [ ] `MONITORING_CITY` = [top_management, admin_system, superadmin]
  - [ ] `MONITORING_RAYON` = [kepala_rayon, ...MONITORING_CITY]
  - [ ] `MONITORING_AREA` = [korlap, ...MONITORING_RAYON]
  - [ ] `USER_MANAGERS` = [admin_system, superadmin]

### A3. User Entity
- [ ] `users.entity.ts` has `area_id` column (nullable UUID, FK to areas)
- [ ] `@ManyToOne(() => Area)` relation exists
- [ ] CreateUserDto accepts `area_id`

### A4. @Roles Decorator Usage
Spot-check these controllers use role group constants (not hardcoded strings):
- [ ] `shifts.controller.ts` — clock-in uses `@Roles(...CLOCKABLE_ROLES)`
- [ ] `reports.controller.ts` — uses `@Roles(...AKTIVITAS_SUBMITTERS)`
- [ ] `tasks.controller.ts` — create uses `@Roles(...TASK_CREATORS)`
- [ ] `monitoring.controller.ts` — uses MONITORING_* groups
- [ ] `overtime.controller.ts` — submit uses `@Roles(...OVERTIME_SUBMITTERS)`

---

## B. Shifts Module Changes

### B1. ClockIn DTO
- [ ] `clock-in.dto.ts` — `area_id` is `@IsOptional()` (not required)
- [ ] GPS boundary validation removed from clockIn service

### B2. Area Auto-Detection
- [ ] `shifts.service.ts` has `getActiveArea()` method
- [ ] Priority: WorkerSchedule (today) → WorkerAssignment (active) → null
- [ ] ClockIn works without `area_id` (auto-detects from schedule)

### B3. Postman Test
- [ ] Login as satgas1 → POST `/shifts/clock-in` without area_id → should auto-detect
- [ ] Login as satgas1 → POST `/shifts/clock-in` with area_id → should use provided area
- [ ] Login as linmas1 → POST `/shifts/clock-in` → should work (linmas is clockable)

---

## C. Reports → Aktivitas Module

### C1. Controller Path
- [ ] `reports.controller.ts` uses `@Controller('aktivitas')` (not `reports`)
- [ ] All endpoints accessible at `/api/v1/aktivitas/...`

### C2. Create Aktivitas (POST /aktivitas)
- [ ] Requires `activity_type_id` (UUID)
- [ ] Requires `description` (5-500 chars)
- [ ] Requires `photo_urls` (1-3 string array)
- [ ] `gps_lat`/`gps_lng` are optional (nullable)
- [ ] Auto-detects active shift for current user
- [ ] Validates activity_type.applicable_roles includes user.role

### C3. Scoped Access
- [ ] `findAllPaginated()` scopes results by role:
  - [ ] satgas/linmas → own reports only
  - [ ] korlap → own area's reports
  - [ ] kepala_rayon → own rayon's reports
  - [ ] admin_system/superadmin → all reports

### C4. Postman Test
- [ ] Login as satgas1 → clock in → POST `/aktivitas` with valid body → 201
- [ ] Login as korlap1 → GET `/aktivitas` → only area-scoped results
- [ ] Login as kepala_rayon → GET `/aktivitas` → only rayon-scoped results

---

## D. Tasks Module Redesign

### D1. TaskStatus Simplification
- [ ] `task.entity.ts` — TaskStatus enum has exactly 4 values: `pending`, `assigned`, `in_progress`, `completed`
- [ ] No references to `accepted`, `declined` in source code

### D2. Removed Endpoints
- [ ] No `accept()` method in tasks.controller.ts
- [ ] No `decline()` method in tasks.controller.ts
- [ ] No `DeclineTaskDto` file exists

### D3. Task Entity Changes
- [ ] `task.entity.ts` has `rayon_id` (nullable UUID, FK to rayons)
- [ ] `task.entity.ts` has `area_id` as nullable
- [ ] `task.entity.ts` has `tags` relation (OneToMany to TaskTag)

### D4. TaskTag Entity
- [ ] `task-tag.entity.ts` exists with `task_id` + `user_id`
- [ ] UNIQUE constraint on (task_id, user_id)

### D5. Tag Endpoints
- [ ] POST `/tasks/:id/tag` with `{ user_id }` → adds tag
- [ ] DELETE `/tasks/:id/tag/:userId` → removes tag
- [ ] GET `/tasks/tagged` → returns tasks where user is tagged

### D6. Create Task
- [ ] `CreateTaskDto` accepts `rayon_id`, `tagged_user_ids[]`
- [ ] No `activity_type_id` field in CreateTaskDto

### D7. Complete Task
- [ ] `CompleteTaskDto` requires `completion_photo_url` (string) and `description` (string)
- [ ] No `gps_lat`, `gps_lng` fields
- [ ] Workflow: assigned → in_progress → completed (no accept step)

### D8. Hierarchy Validation
- [ ] `VALID_TASK_ASSIGNMENTS` constant defines who can assign to whom
- [ ] `validateHierarchy()` prevents assigning to same or higher role

### D9. Postman Test
- [ ] Login as korlap1 → POST `/tasks` with area_id → 201
- [ ] POST `/tasks/:id/assign` with satgas worker_id → 200
- [ ] Login as satgas1 → POST `/tasks/:id/start` → 200
- [ ] POST `/tasks/:id/complete` with photo + description → 200
- [ ] Login as korlap1 → POST `/tasks/:id/tag` with user_id → 200
- [ ] Login as satgas1 → GET `/tasks/tagged` → includes tagged task

---

## E. Overtime Module (NEW)

### E1. Entity Structure
- [ ] `overtime.entity.ts` exists with fields: id, user_id, area_id (nullable), date, start_time, end_time, status (enum), approved_by, approved_at, rejection_reason, notes
- [ ] `overtime-aktivitas.entity.ts` exists with: overtime_id, activity_type_id, description, photo_urls (text[]), gps_lat, gps_lng
- [ ] Cascade saving works (overtime + nested aktivitas)

### E2. Submit Overtime (POST /overtime)
- [ ] Only satgas and linmas can submit
- [ ] Validates activity_type against user role (applicable_roles check)
- [ ] Requires at least 1 aktivitas item
- [ ] Each aktivitas requires 1-3 photo_urls

### E3. Approve/Reject (PATCH /overtime/:id/approve|reject)
- [ ] Only korlap can approve/reject
- [ ] Only pending overtime can be approved/rejected
- [ ] Korlap can only approve/reject for their own area
- [ ] Reject requires `reason` field

### E4. Listing
- [ ] GET `/overtime/my` — returns user's overtime (satgas/linmas)
- [ ] GET `/overtime` — returns pending overtime (korlap: own area, admin: all)
- [ ] GET `/overtime/:id` — returns overtime details

### E5. Postman Test
- [ ] Login as satgas1 → POST `/overtime` with valid body → 201
- [ ] Login as korlap1 → GET `/overtime` → sees satgas1's overtime
- [ ] PATCH `/overtime/:id/approve` → status = approved
- [ ] Login as satgas1 → POST `/overtime` again → 201
- [ ] Login as korlap1 → PATCH `/overtime/:id/reject` with reason → status = rejected
- [ ] Login as linmas1 → POST `/overtime` → 201 (linmas can also submit)

---

## F. Monitoring Module Scope

### F1. Scope Authorization
- [ ] `monitoring.controller.ts` — getRayonStats checks if kepala_rayon's rayon_id matches
- [ ] `monitoring.controller.ts` — getAreaStats checks if korlap's area_id matches
- [ ] Cross-scope access returns 403 ForbiddenException

### F2. TaskStatus Reference
- [ ] `monitoring.service.ts` — no references to `TaskStatus.ACCEPTED` or `TaskStatus.DECLINED`

### F3. Postman Test
- [ ] Login as kepala_rayon → GET `/monitoring/rayon/:ownRayonId` → 200
- [ ] Login as kepala_rayon → GET `/monitoring/rayon/:otherRayonId` → 403
- [ ] Login as korlap1 → GET `/monitoring/area/:ownAreaId` → 200
- [ ] Login as korlap1 → GET `/monitoring/area/:otherAreaId` → 403

---

## G. Seed Data

### G1. User Seeds
- [ ] `seed-phase2.ts` creates users with new role names (satgas, korlap, etc.)
- [ ] Korlap user has `area_id` assigned
- [ ] admin_data, admin_system users exist

### G2. Activity Type Seeds
- [ ] Activity types use lowercase `applicable_roles` (e.g., `['satgas']` not `['Worker']`)
- [ ] Role-specific types: satgas (8), linmas (5), korlap (4), admin_data (3)

### G3. Task Seeds
- [ ] `seed-tasks.ts` creates tasks with 4 statuses only (pending, assigned, in_progress, completed)
- [ ] No activity_type_id on tasks
- [ ] Tasks have rayon_id where appropriate

### G4. Seed Execution
- [ ] `npm run seed` completes without errors
- [ ] Database has expected test data

---

## H. Test Suite

### H1. Test Results
- [ ] `npm test` — all 58 suites pass
- [ ] Total tests: 888/888
- [ ] No skipped or pending tests

### H2. Coverage
- [ ] `npm run test:cov` — branch coverage > 80%
- [ ] All Phase 2C modules (overtime, tasks, reports, monitoring) have adequate coverage

### H3. Specific Test Scenarios
- [ ] Overtime service: 14 tests including area mismatch on reject
- [ ] Overtime controller: 6 tests
- [ ] Tasks service: Updated for 4-status workflow
- [ ] Tasks controller: No accept/decline test references
- [ ] Reports service: findAllPaginated with User parameter
- [ ] Monitoring controller: Scope authorization tests (4 tests)

---

## I. Code Quality

### I1. No Stale References
- [ ] No `TaskStatus.ACCEPTED` or `TaskStatus.DECLINED` anywhere in `be/src/`
- [ ] No `DeclineTaskDto` imports
- [ ] No `gps_lat`/`gps_lng` in CompleteTaskDto
- [ ] No `activity_type_id` in CreateTaskDto or Task entity

### I2. Immutability
- [ ] Services use spread operators for object updates (no direct mutation)

### I3. Error Messages
- [ ] Indonesian error messages where user-facing (e.g., "Anda hanya dapat melihat monitoring rayon Anda")
- [ ] English error messages for developer-facing errors

### I4. TypeScript
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] No `any` type usage in new code (check overtime module)

---

## Review Summary

| Section | Pass | Issues |
|---------|------|--------|
| A. Role System | [ ] | |
| B. Shifts | [ ] | |
| C. Aktivitas | [ ] | |
| D. Tasks | [ ] | |
| E. Overtime | [ ] | |
| F. Monitoring Scope | [ ] | |
| G. Seed Data | [ ] | |
| H. Test Suite | [ ] | |
| I. Code Quality | [ ] | |

**Overall:** [ ] APPROVED / [ ] NEEDS CHANGES

**Notes:**


---

*Generated: 2026-02-11*
