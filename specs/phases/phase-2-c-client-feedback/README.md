# Phase 2C: Client Feedback Implementation

**Date:** February 10, 2026
**Status:** Spec Rewrite (Terminology Cleanup + Schema Redesign)
**Priority:** High - Breaking Changes
**Duration:** 4-6 weeks estimated
**Depends On:** Phase 2B (Complete)
**Related ADRs:** [ADR-009](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md), [ADR-010](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)

---

## Overview

Phase 2C addresses comprehensive client feedback received during the February 10, 2026 meeting. This phase introduces **breaking changes across all layers** including role system overhaul, terminology cleanup, schema redesign, and new modules. The backend is currently deployed to production (api.sekar.wahyutrip.com) requiring careful migration planning.

### Key Changes Summary

1. **Role system overhaul** - 7 roles to 8 roles with renames, splits, and removals
2. **Terminology cleanup** - Remove "worker" terminology; rename tables, columns, modules, entities to generic English (ADR-010)
3. **Overtime flattening** - 1 overtime = 1 activity (no nested `overtime_aktivitas`); flat DTO
4. **Polygon geofencing (soft)** - Boundary validation using polygons from KMZ import; soft warning only, never blocks clock-in
5. **Reports to Activities** - Module, entity, route, DTO rename (`/reports` to `/activities`)
6. **Task system redesign** - Hierarchical assignment, tagging, simplified completion (4 statuses)
7. **Activity types update** - 20 role-specific categories across 4 roles
8. **Monitoring access changes** - Updated role-based scoping with boundary warnings
9. **Navigation restructure** - Role-based tab configuration for 8 roles
10. **Clockable roles expansion** - 5 roles can now clock in (was 2)
11. **Activity approval workflow** - Hierarchical: korlap approves satgas/linmas activities (area-scoped), kepala_rayon approves korlap/admin_data activities (rayon-scoped)
12. **Task acceptance & verification** - Assignees accept/decline tasks, supervisors verify completed tasks with revision support

---

## Role Definitions (Phase 2C)

| # | Role ID | Display Name (ID) | Description |
|---|---------|-------------------|-------------|
| 1 | `satgas` | Satgas | Field worker - maintenance, planting, watering, cleanup |
| 2 | `linmas` | Linmas | Security officer - patrol, incident reporting, facility checks |
| 3 | `korlap` | Korlap | Field coordinator - supervises satgas/linmas, vehicle/equipment checks |
| 4 | `admin_data` | Admin Data | Data administrator - attendance checks, report entry |
| 5 | `kepala_rayon` | Kepala Rayon | District head - manages one rayon, supervises korlap |
| 6 | `top_management` | Top Management | City-wide view - monitoring, task assignment |
| 7 | `admin_system` | Admin System | System administrator - user/area/rayon management + monitoring |
| 8 | `superadmin` | Superadmin | Full system access - all admin_system capabilities + system configuration |

### Role Migration from Phase 2A/2B

| Phase 2A/2B Role | Phase 2C Role | Migration Strategy |
|-------------------|---------------|-------------------|
| `worker` | `satgas` | Rename - UPDATE users SET role='satgas' WHERE role='worker' |
| `koordinator_lapangan` | `korlap` | Rename - UPDATE users SET role='korlap' WHERE role='koordinator_lapangan' |
| `supervisor` | `korlap` | Map to korlap (legacy role) |
| `admin` | `superadmin` | Existing admins become superadmin |
| `linmas` | `linmas` | No change |
| `kepala_rayon` | `kepala_rayon` | No change |
| `top_management` | `top_management` | No change |
| _(new)_ | `admin_data` | Created manually by superadmin |
| _(new)_ | `admin_system` | Created manually by superadmin |

### Role Hierarchy

```
superadmin (full access)
+-- admin_system (manage users/areas/rayons + monitoring)
|   +-- (no subordinates in field)
+-- top_management (city-wide monitoring + task creation)
|   +-- kepala_rayon (rayon-scoped monitoring + task assignment)
|   |   +-- korlap (area-scoped monitoring + task assignment + overtime approval)
|   |       +-- satgas (field work + activities + overtime submit)
|   |       +-- linmas (security + activities + overtime submit)
|   +-- korlap (direct assignment also allowed)
+-- admin_data (data entry + clock-in + activities, NO monitoring)
```

---

## Feature Access Matrix

| Feature | satgas | linmas | korlap | admin_data | kepala_rayon | top_mgmt | admin_sys | superadmin |
|---------|--------|--------|--------|------------|--------------|----------|-----------|------------|
| **Clock In/Out** | Y | Y | Y | Y | Y | - | - | - |
| **Activity Submit** | Y | Y | Y | Y | - | - | - | - |
| **View Own Activities** | Y | Y | Y | Y | - | - | - | - |
| **View All Activities** | - | - | Y* | Y | Y* | Y | Y | Y |
| **Receive Tasks** | Y | Y | Y | - | Y | - | - | - |
| **Create Tasks** | - | - | Y | - | Y | Y | Y | Y |
| **Tag Users on Tasks** | - | - | Y | - | Y | Y | Y | Y |
| **Overtime Submit** | Y | Y | - | - | - | - | - | - |
| **Approve Activities** | - | - | Y* | - | Y* | - | - | - |
| **Accept/Decline Tasks** | Y | Y | Y | - | Y | - | - | - |
| **Verify Tasks** | - | - | Y* | - | Y* | Y | - | - |
| **Overtime Approve** | - | - | Y | - | - | - | - | - |
| **Area Monitoring** | - | - | Y* | - | - | - | - | - |
| **Rayon Monitoring** | - | - | - | - | Y* | - | - | - |
| **City Monitoring** | - | - | - | - | - | Y | Y | Y |
| **Manage Users** | - | - | - | - | - | - | Y | Y |
| **Manage Areas** | - | - | - | - | - | - | Y | Y |
| **Manage Rayons** | - | - | - | - | - | - | Y | Y |
| **Manage Schedules** | - | - | - | - | - | - | Y | Y |
| **System Config** | - | - | - | - | - | - | - | Y |

**Legend:** Y = full access, Y* = scoped (own area/rayon only), `-` = no access

### Task Assignment Hierarchy

Tasks can only be assigned **downward** in the hierarchy:

| Assigner | Can Assign To |
|----------|--------------|
| `top_management` | kepala_rayon, korlap |
| `kepala_rayon` | korlap (within own rayon) |
| `korlap` | satgas, linmas (within own area) |
| `admin_system` | kepala_rayon, korlap |
| `superadmin` | kepala_rayon, korlap |

**Tagging:** Any task creator can tag additional users for view-only access (CC-like). Tagged users see the task but cannot act on it.

---

## Terminology Cleanup (ADR-010)

### Table Renames

| Current | New | Action |
|---------|-----|--------|
| `worker_schedules` | `schedules` | RENAME |
| `work_reports` | `activities` | RENAME |
| `worker_assignments` | - | DROP (fully replaced by schedules) |
| `overtime_aktivitas` | - | DROP (merged into overtimes) |

### Column Renames

| Table | Old Column | New Column |
|-------|-----------|------------|
| `shifts` | `worker_id` | `user_id` |
| `activities` (was `work_reports`) | `worker_id` | `user_id` |
| `location_logs` | `worker_id` | `user_id` |

### Module/Entity Renames

| Current | New |
|---------|-----|
| `reports/` module | `activities/` |
| `worker-schedules/` module | `schedules/` |
| `worker-assignments/` module | DELETED |
| `Report` entity | `Activity` |
| `WorkerSchedule` entity | `Schedule` |
| `WorkerAssignment` entity | DELETED |
| `OvertimeAktivitas` entity | DELETED (merged into Overtime) |

### Route Renames

| Current | New |
|---------|-----|
| `/aktivitas` or `/reports` | `/activities` |
| `/worker-schedules` | `/schedules` |

---

## Gap Analysis Summary

| ID | Gap | Impact | Priority |
|----|-----|--------|----------|
| GAP-1 | Role system overhaul (7 to 8 roles) | ALL layers - enum, DB, guards, navigation, tests | Critical |
| GAP-2 | Terminology cleanup (ADR-010) | ALL layers - table/column/module/entity renames | Critical |
| GAP-3 | Activity types mismatch (10 to 20 types across 4 roles) | Seed data, validation, UI dropdowns. **Note:** `applicable_roles TEXT[]` array column | High |
| GAP-4 | Polygon geofencing (soft warning) | Shifts service, GpsUtil, monitoring dashboard | Medium |
| GAP-5 | Reports to Activities transformation | DB schema, API routes, mobile screens, Redux | Critical |
| GAP-6 | Task system redesign (hierarchy, tagging, status simplification) | Task module, mobile screens, web pages. Simplify 6 to 4 statuses | High |
| GAP-7 | Overtime flattening (1:1 with activity) | Overtime module, DTO restructure, drop overtime_aktivitas | High |
| GAP-8 | Monitoring access scope change | Role guards, controller auth, boundary warnings | Medium |
| GAP-9 | Staff requirements expansion (clockable roles) | Staff requirements entity, scheduling | Low |
| GAP-10 | NB 2.0 design compliance for new screens | All new UI components | Medium |
| GAP-11 | User entity missing `area_id` | Add `area_id` column to users table for korlap area association | Critical |
| GAP-12 | ClockInDto `area_id` is REQUIRED | Must become optional for area auto-detect from Schedule | High |

---

## Activity Types (Phase 2C)

### Satgas Activities (8)
| # | ID | Display Name (ID) |
|---|----|--------------------|
| 1 | `perawatan` | Perawatan |
| 2 | `penanaman` | Penanaman |
| 3 | `perantingan` | Perantingan |
| 4 | `penyiraman` | Penyiraman |
| 5 | `penyulaman` | Penyulaman |
| 6 | `potong_rumput` | Potong Rumput |
| 7 | `angkut_sampah` | Angkut Sampah |
| 8 | `lainnya_satgas` | Lainnya |

### Linmas Activities (5)
| # | ID | Display Name (ID) |
|---|----|--------------------|
| 1 | `patroli` | Patroli |
| 2 | `insiden` | Insiden |
| 3 | `periksa_fasilitas` | Memeriksa Kondisi Fasilitas |
| 4 | `halau_pkl` | Halau PKL |
| 5 | `lainnya_linmas` | Lainnya |

### Korlap Activities (4)
| # | ID | Display Name (ID) |
|---|----|--------------------|
| 1 | `cek_kendaraan` | Pengecekan Kendaraan |
| 2 | `patroli_korlap` | Patroli |
| 3 | `cek_alat` | Pengecekan Alat |
| 4 | `lainnya_korlap` | Lainnya |

### Admin Data Activities (3)
| # | ID | Display Name (ID) |
|---|----|--------------------|
| 1 | `cek_absensi` | Cek Absensi |
| 2 | `entri_laporan` | Cek dan Entri Laporan |
| 3 | `lainnya_admin_data` | Lainnya |

---

## Implementation Phases

### Phase 0: Role Migration (Week 1) - PREREQUISITE
- Database role enum update and data migration
- Backend UserRole enum update
- Guard and decorator updates
- All existing tests updated for new role names

### Phase 1: Core Backend Changes (Week 1-2)
- Terminology cleanup migration (table/column renames)
- Polygon geofencing (soft warning, GpsUtil methods)
- Reports to Activities module rename and restructure
- Activity types seed data update (20 types, lowercase applicable_roles)
- WorkerAssignment removal

### Phase 2: Task System Redesign (Week 2)
- Hierarchical assignment validation
- Task tagging (task_tags table)
- Simplified task completion (no GPS, photo required)
- Mobile task creation screen

### Phase 3: Overtime Module (Week 2-3)
- Flat overtime (1 overtime = 1 activity, no nested array)
- Drop overtime_aktivitas table, add activity columns to overtimes
- Approval workflow (korlap)

### Phase 4: Mobile Updates (Week 3-4)
- Navigation restructure for 8 roles
- Activity submission screen (new flow: foto to jenis to deskripsi to lokasi)
- Overtime screens (list, submit, approval, detail)
- Task creation screen (mobile)
- Redux slice updates (reportSlice to activitiesSlice)
- Geofencing warning banner

### Phase 5: Web Updates (Week 4-5)
- Role-based navigation sidebar
- /activities page (replacing /reports)
- /overtime page (new)
- Task management updates
- Monitoring access updates with boundary warnings

### Phase 6: Testing & Verification (Week 5-6)
- Terminology cleanup regression tests
- Polygon geofencing unit tests
- Role migration verification
- New feature tests (overtime flat, task hierarchy, activities)
- E2E flow testing

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Role migration breaks existing sessions | High | High | Deploy migration during maintenance window, force re-login |
| Activity type ID conflicts with existing data | Medium | High | Soft-delete old types, create new ones with new IDs |
| Overtime approval bottleneck (single korlap) | Medium | Medium | Allow kepala_rayon as backup approver |
| Mobile app version fragmentation | High | Medium | Force update mechanism, minimum version check |
| Table/column renames break running queries | Medium | High | Single atomic migration with BEGIN/COMMIT |

---

## Related Documents

- [Database Changes](./database.md)
- [Backend Requirements](./backend.md)
- [Mobile Requirements](./mobile.md)
- [Web Requirements](./web.md)
- [Testing Plan](./testing.md)
- [Seeder Updates](./seeder-updates.md) - Phase 2C test data implementation
- [Implementation Status](./STATUS.md)
- [ADR-009: Role System Overhaul](../../architecture/decisions/ADR-009-phase2c-role-system-overhaul.md)
- [ADR-010: Terminology Cleanup](../../architecture/decisions/ADR-010-phase2c-terminology-cleanup.md)

---

**Last Updated:** 2026-02-16
