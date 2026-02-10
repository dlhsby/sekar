# Phase 2C: Client Feedback - Implementation Status

**Last Updated:** 2026-02-10
**Overall Progress:** 0% (Planning Phase)
**Branch:** `f/phase-2-c-client-feedback`

---

## Phase Progress

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 0 | Role Migration | Not Started | 0% |
| 1 | Core Backend Changes | Not Started | 0% |
| 2 | Task System Redesign | Not Started | 0% |
| 3 | Overtime Module | Not Started | 0% |
| 4 | Mobile Updates | Not Started | 0% |
| 5 | Web Updates | Not Started | 0% |
| 6 | Testing & Verification | Not Started | 0% |

---

## Phase 0: Role Migration

### Database
- [ ] Create migration file for role enum update
- [ ] Write role migration SQL (worker→satgas, koordinator_lapangan→korlap, supervisor→korlap, admin→superadmin)
- [ ] Add new roles to CHECK constraint (admin_data, admin_system)
- [ ] Test migration locally
- [ ] Test rollback procedure

### Backend
- [ ] Update UserRole enum in user.entity.ts
- [ ] Update all @Roles() decorators across controllers
- [ ] Update role group constants (CLOCKABLE_ROLES, TASK_CREATORS, etc.)
- [ ] Update CreateUserDto (default role, conditional validation)
- [ ] Update seed data with new role names
- [ ] Update all test files with new role values

### Mobile
- [ ] Update UserRole type in models.types.ts
- [ ] Update role checks in RootNavigator
- [ ] Update role references in authSlice
- [ ] Update all hardcoded role strings across screens

### Web
- [ ] Update UserRole type in models.ts
- [ ] Update role checks in ProtectedRoute
- [ ] Update sidebar navigation config
- [ ] Update UserForm role dropdown
- [ ] Update RoleBadge component

---

## Phase 1: Core Backend Changes

### GPS Boundary Removal
- [ ] Remove boundary validation from shifts.service.ts clockIn()
- [ ] Update ADR-005 with policy change note
- [ ] Keep GPS recording (informational only)
- [ ] Update business-rules.md

### Reports → Aktivitas
- [ ] Rename routes (/reports → /aktivitas)
- [ ] Add photo_urls column (TEXT[]) to work_reports
- [ ] Add shift_id column to work_reports
- [ ] Make activity_type_id NOT NULL
- [ ] Remove review workflow columns (is_reviewed, reviewed_by, reviewed_at)
- [ ] Update CreateReportDto → CreateAktivitasDto
- [ ] Update service with shift validation
- [ ] Update service with activity_type role validation
- [ ] Migrate existing photo_url → photo_urls data

### Activity Types
- [ ] Soft-delete old activity types
- [ ] Create new seed data for satgas (8 types)
- [ ] Create new seed data for linmas (5 types)
- [ ] Create new seed data for korlap (4 types)
- [ ] Create new seed data for admin_data (3 types)
- [ ] Update role constraint on activity_types table

### Worker Assignment Reconciliation
- [ ] Add deprecated flag to worker_assignments
- [ ] Create area auto-detection logic (schedule → assignment → null)
- [ ] Update shifts service to use new detection
- [ ] Mark existing assignments as deprecated

---

## Phase 2: Task System Redesign

### Hierarchical Assignment
- [ ] Create assignment validation logic
- [ ] Update CreateTaskDto with rayon_id
- [ ] Remove activity_type_id from tasks
- [ ] Remove GPS fields from task completion
- [ ] Update task creation endpoint
- [ ] Update task completion endpoint

### Task Tagging
- [ ] Create task_tags table migration
- [ ] Create TaskTag entity
- [ ] Add tag endpoints (POST /tasks/:id/tag, DELETE /tasks/:id/tag/:userId)
- [ ] Add GET /tasks/tagged endpoint
- [ ] Update task detail to include tags

---

## Phase 3: Overtime Module

### Backend
- [ ] Create overtimes table migration
- [ ] Create overtime_aktivitas table migration
- [ ] Create Overtime entity
- [ ] Create OvertimeAktivitas entity
- [ ] Create OvertimeModule (module, service, controller)
- [ ] Create DTOs (CreateOvertimeDto, ApproveOvertimeDto, RejectOvertimeDto)
- [ ] Implement submit endpoint (POST /overtime)
- [ ] Implement list endpoints (GET /overtime, GET /overtime/my)
- [ ] Implement detail endpoint (GET /overtime/:id)
- [ ] Implement approve endpoint (PATCH /overtime/:id/approve)
- [ ] Implement reject endpoint (PATCH /overtime/:id/reject)
- [ ] Add role-based access control
- [ ] Add korlap area scoping

---

## Phase 4: Mobile Updates

### Navigation
- [ ] Create unified tab config (TAB_CONFIG)
- [ ] Replace WorkerTabNavigator + SupervisorTabNavigator
- [ ] Test all 8 role navigation paths
- [ ] Update navigation types

### New Screens
- [ ] OvertimeListScreen
- [ ] OvertimeSubmitScreen
- [ ] OvertimeApprovalScreen
- [ ] OvertimeDetailScreen
- [ ] TaskCreateScreen

### Modified Screens
- [ ] ClockInOutScreen (remove GPS boundary UI)
- [ ] AktivitasSubmissionScreen (rename + new flow)
- [ ] TasksAktivitasScreen (rename + filters)
- [ ] TaskDetailScreen (tagged users, rayon)
- [ ] TaskCompleteScreen (simplified)
- [ ] MapDashboardScreen (role access)
- [ ] RootNavigator (unified config)

### Redux
- [ ] Rename reportSlice → aktivitasSlice
- [ ] Create overtimeSlice
- [ ] Update tasksSlice (tagged tasks, filters)
- [ ] Update authSlice (role type)

### API Services
- [ ] Rename reportsApi → aktivitasApi
- [ ] Create overtimeApi
- [ ] Update tasksApi (tags, hierarchy)

---

## Phase 5: Web Updates

### Pages
- [ ] Rename /reports → /aktivitas page
- [ ] Create /overtime page
- [ ] Create /overtime/[id] page
- [ ] Update /tasks page (tagged tab, hierarchy)
- [ ] Update /tasks/new form
- [ ] Update /monitoring page (role access)
- [ ] Update /users page (8 roles, conditional fields)

### Navigation
- [ ] Update Sidebar with new role configs
- [ ] Update ProtectedRoute ROUTE_ACCESS

### Types & API
- [ ] Update UserRole type
- [ ] Rename reports API → aktivitas API
- [ ] Create overtime API client

---

## Phase 6: Testing & Verification

### Backend Tests
- [ ] Role migration tests (all 8 roles authenticate correctly)
- [ ] GPS boundary removal tests (clock-in without boundary)
- [ ] Aktivitas CRUD tests (multi-photo, shift validation)
- [ ] Task hierarchy tests (valid/invalid assignments)
- [ ] Task tagging tests
- [ ] Overtime CRUD tests
- [ ] Overtime approval workflow tests
- [ ] Monitoring access control tests
- [ ] Activity types by role tests

### Mobile Tests
- [ ] Navigation routing for 8 roles
- [ ] Aktivitas submission flow (camera only, 3 photos max)
- [ ] Overtime submit flow
- [ ] Overtime approval flow
- [ ] Task creation flow
- [ ] Task tagged filter
- [ ] Clock-in without boundary check

### Web Tests
- [ ] Role-based page access for 8 roles
- [ ] Aktivitas page display
- [ ] Overtime approval workflow
- [ ] Task management with hierarchy
- [ ] User form with conditional fields

### Integration Tests
- [ ] End-to-end: satgas clock-in → submit aktivitas → clock-out
- [ ] End-to-end: satgas submit overtime → korlap approve
- [ ] End-to-end: top_management create task → satgas complete
- [ ] End-to-end: admin_system manage users → create all 8 roles

---

## Metrics (Target)

| Component | Current (Phase 2B) | Target (Phase 2C) |
|-----------|-------------------|-------------------|
| Backend endpoints | 83 | ~91 (+8 new) |
| Backend tests | 845 | ~950+ |
| Backend coverage | 90.77% | >85% |
| Mobile screens | 17 | 22 (+5 new) |
| Mobile tests | 2,141 | ~2,400+ |
| Mobile coverage | 80.31% | >80% |
| Web pages | 18 | 20 (+2 new) |
| Web tests | 505 | ~600+ |
| Database tables | 16 | 18 (+2 new: task_tags, overtimes + overtime_aktivitas) |

---

**Last Updated:** 2026-02-10
