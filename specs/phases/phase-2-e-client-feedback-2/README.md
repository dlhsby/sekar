# Phase 2E: Client Feedback II

**Date:** March 10, 2026
**Status:** ✅ Complete (March 11, 2026)
**Priority:** High - Breaking Changes
**Duration:** 1 day (completed March 11, 2026)
**Depends On:** Phase 2D (Complete)
**Related ADRs:** [ADR-012](../../architecture/decisions/ADR-012-phone-number-login.md), [ADR-013](../../architecture/decisions/ADR-013-multi-area-assignment.md), [ADR-014](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md), [ADR-015](../../architecture/decisions/ADR-015-audit-trail.md)

---

## Overview

Phase 2E addresses client feedback from the March 10, 2026 meeting. This phase introduces **breaking changes** to the monitoring hierarchy, overtime flow, and area assignment model. The key theme is making the system reflect how field operations actually work: workers move between areas, korlap manage multiple areas, and overtime follows the same clock-in/clock-out flow as regular shifts.

### Client Feedback Summary (8 Items)

| # | Feedback | Impact | Breaking? |
|---|----------|--------|-----------|
| 1 | **Phone number login** — Users should login with phone number OR username. Workers (satgas→top_management) must have phone numbers for WhatsApp contact. admin_system keeps username-only. | Auth, Users | No |
| 2 | **Profile picture upload** — All users can upload profile picture, displayed in profile and monitoring markers. | Users, Monitoring, Mobile/Web | No |
| 3 | **Multi-area korlap + dynamic satgas boundaries** — Korlap handles multiple areas (not just 1). Satgas/linmas get extra area boundaries when assigned tasks in other areas. Monitoring hierarchy updated. | Monitoring, Shifts, Tasks, Areas | **Yes** |
| 4 | **Audit trail for revisions** — Display revision history in task and activity detail views. Track all changes with timestamps and actors. | Tasks, Activities, New table | No |
| 5 | **Admin Data = Kepala Rayon assistant** — Admin Data gets same monitoring access as Kepala Rayon. Can clock in with rayon-level boundary tracking (not area). | Monitoring, Shifts, Roles | **Yes** |
| 6 | **Overtime flow redesign** — Overtime becomes clock-in/clock-out flow (like normal shifts) on separate screen. Must end normal shift first. Mandatory activity submission on clock-out. Approval flow persists. | Overtime, Shifts, Mobile/Web | **Yes** |
| 7 | **Optional selfie** — Selfie photo is optional for both normal shift and overtime clock-in/clock-out. | Shifts, Overtime | No |
| 8 | **Database migration & seeder update** — Update Phase 2 migrations and seeders for all 2E changes. | Database | No |

---

## Role Definitions (Phase 2E — Updated from 2C)

| # | Role ID | Display Name | Clockable? | Boundary Level | Monitoring Scope | Changes in 2E |
|---|---------|-------------|------------|----------------|------------------|---------------|
| 1 | `satgas` | Satgas | Yes | Area (default) + Task areas | None | Dynamic multi-area boundaries |
| 2 | `linmas` | Linmas | Yes | Area (default) + Task areas | None | Dynamic multi-area boundaries |
| 3 | `korlap` | Korlap | Yes | Multiple areas (1 rayon) | Own assigned areas | **Multi-area assignment** |
| 4 | `admin_data` | Admin Data | **Yes (NEW)** | **Rayon** | **Same as Kepala Rayon** | Clockable + monitoring upgrade |
| 5 | `kepala_rayon` | Kepala Rayon | **Yes (NEW)** | **Rayon** | Own rayon (all areas) | Now clockable |
| 6 | `top_management` | Top Management | No | N/A | All rayons/areas | No change |
| 7 | `admin_system` | Admin System | No | N/A | All rayons/areas | No change |
| 8 | `superadmin` | Superadmin | No | N/A | All rayons/areas | No change |

### Clockable Roles (Phase 2E)

**Previous (Phase 2C):** satgas, linmas, korlap
**New (Phase 2E):** satgas, linmas, korlap, admin_data, kepala_rayon

### Overtime-Eligible Roles (Phase 2E)

All clockable roles: satgas, linmas, korlap, admin_data, kepala_rayon

---

## Monitoring Hierarchy (Phase 2E)

```
top_management / admin_system / superadmin
    +-- Monitor ALL rayons (filter by rayon)
        +-- See all kepala_rayon (filter by rayon)
        +-- See all korlap in all areas (filter by rayon, area)
        +-- See all admin_data (filter by rayon)
        +-- See all satgas/linmas in all areas (filter by rayon, area)

kepala_rayon
    +-- Monitor OWN rayon only
        +-- See all korlap in all areas in rayon (filter by area)
        +-- See admin_data in rayon
        +-- See all satgas/linmas in all areas in rayon (filter by area)

admin_data (NEW - same as kepala_rayon)
    +-- Monitor OWN rayon only
        +-- See all korlap in all areas in rayon (filter by area)
        +-- See all satgas/linmas in all areas in rayon (filter by area)

korlap
    +-- Monitor OWN assigned areas (multiple)
        +-- See all satgas/linmas in assigned areas
```

### Key Hierarchy Changes from Phase 2D

1. **Admin Data monitoring** — Gains same monitoring scope as Kepala Rayon (rayon-level)
2. **Korlap multi-area** — Can be assigned to multiple areas in 1 rayon; monitors all assigned areas
3. **Top Management sees Kepala Rayon** — Can filter and monitor kepala_rayon positions
4. **Satgas/Linmas dynamic boundaries** — Effective boundaries = default area + areas from active tasks

---

## Feature Access Matrix

| Feature | satgas | linmas | korlap | admin_data | kepala_rayon | top_mgmt | admin_sys | superadmin |
|---------|--------|--------|--------|------------|--------------|----------|-----------|------------|
| Login (phone/username) | Phone+Username | Phone+Username | Phone+Username | Phone+Username | Phone+Username | Phone+Username | Username only | Username only |
| Upload profile picture | Y | Y | Y | Y | Y | Y | Y | Y |
| Clock in (normal shift) | Y | Y | Y | **Y (NEW)** | **Y (NEW)** | - | - | - |
| Clock in (overtime) | Y | Y | Y | **Y (NEW)** | **Y (NEW)** | - | - | - |
| Optional selfie | Y | Y | Y | Y | Y | - | - | - |
| Boundary tracking | Area(s) | Area(s) | Areas | **Rayon** | **Rayon** | - | - | - |
| View monitoring map | - | - | Y (areas) | **Y (rayon)** | Y (rayon) | Y (all) | Y (all) | Y (all) |
| View audit trail | Own | Own | Subordinates | Subordinates | Subordinates | All | All | All |
| Submit overtime | Y | Y | Y | **Y (NEW)** | **Y (NEW)** | - | - | - |
| Approve overtime | - | - | Y (area) | - | Y (rayon) | - | - | Y |

---

## Implementation Phases

| Phase | Scope | Effort | Dependencies | Breaking? |
|-------|-------|--------|-------------|-----------|
| **2E-1** | Phone Number Login | 3-4 days | None | No |
| **2E-2** | Profile Picture Upload | 2-3 days | 2E-1 (shared migration) | No |
| **2E-3** | Multi-Area Assignment | 5-7 days | 2E-1 | **Yes** |
| **2E-4** | Monitoring Hierarchy Changes | 3-4 days | 2E-3 | **Yes** |
| **2E-5** | Admin Data + Kepala Rayon Clockable | 2-3 days | 2E-4 | **Yes** |
| **2E-6** | Overtime Flow Redesign | 5-7 days | 2E-5 | **Yes** |
| **2E-7** | Optional Selfie + Audit Trail | 2-3 days | 2E-6 | No |
| **2E-8** | Database Migration + Seeder | 2-3 days | All above | No |

**Total estimated:** 24-34 developer-days

### Phase Details

#### 2E-1: Phone Number Login (3-4 days)
- Add `phone_number` column to `users` table (varchar 20, unique, nullable)
- Add `identifier` field to `LoginDto` (replaces `username`)
- Auth service checks both username and phone_number
- Mobile/Web login screens accept either
- User management CRUD includes phone_number field
- **ADR-012** documents the decision

#### 2E-2: Profile Picture Upload (2-3 days)
- Add `profile_picture_url` column to `users` table
- New endpoint: `POST /users/:id/profile-picture` (multipart upload to S3)
- Mobile: profile screen with camera/gallery picker
- Web: user management includes profile picture
- Monitoring markers show profile picture

#### 2E-3: Multi-Area Assignment (5-7 days) ⚠️ BREAKING
- New `user_areas` junction table (user_id, area_id, assignment_type, assigned_at)
- `assignment_type`: `permanent` (korlap assigned areas) or `task_based` (satgas/linmas from active tasks)
- Korlap: assigned to multiple areas via `user_areas` with `permanent` type
- Satgas/Linmas: default area from schedule + dynamic areas from active tasks
- Update `StatusCalculatorService` to check multiple area boundaries
- Update monitoring filters for multi-area korlap
- **ADR-013** documents the decision

#### 2E-4: Monitoring Hierarchy Changes (3-4 days)
- Admin Data gets kepala_rayon monitoring scope (rayon-level)
- Add `rayon_id` to `user_tracking_status` for rayon-level tracking
- Update monitoring controller scope enforcement for admin_data
- Update WebSocket room joins for admin_data (rayon rooms)
- Top Management can see/filter kepala_rayon positions

#### 2E-5: Admin Data + Kepala Rayon Clockable (2-3 days)
- Expand `CLOCKABLE_ROLES` constant to include admin_data, kepala_rayon
- Add rayon-level boundary checking (use rayon boundary_polygon)
- Clock-in for admin_data/kepala_rayon: detect rayon from user.rayon_id
- Status tracking at rayon level instead of area level
- **Note:** admin_data already has monitoring access (`MONITORING_RAYON`) and overtime submission (`OVERTIME_SUBMITTERS`) from Phase 2C/2D. Phase 2E makes admin_data clockable and adds Home tab — the monitoring/overtime access is not new.

#### 2E-6: Overtime Flow Redesign (5-7 days) ⚠️ BREAKING
- Add `is_overtime` boolean flag to `shifts` table
- Add `shift_id` FK to `overtimes` table
- Overtime clock-in creates a new shift with `is_overtime: true`
- Validation: normal shift must be clocked out before overtime clock-in
- Overtime clock-out: mandatory activity submission before completing
- Separate overtime screen in mobile bottom navigation
- Approval flow unchanged (korlap approves area, kepala_rayon approves rayon)
- **ADR-014** documents the decision

#### 2E-7: Optional Selfie + Audit Trail (2-3 days)
- Make `selfie_photo` optional in `ClockInDto` and `ClockOutDto`
- Conditional S3 upload: only upload if photo provided
- New `audit_logs` table for task/activity revision tracking
- Display revision history in task and activity detail views
- **ADR-015** documents the audit trail decision

#### 2E-8: Database Migration + Seeder (2-3 days)
- Single atomic migration for all schema changes
- Update Phase 2 seeders with phone numbers, multi-area assignments
- Seed audit log examples
- Test migration rollback

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Multi-area breaks single-area assumptions | High | Careful search for all `user.area_id` references; gradual migration |
| Overtime flow change affects existing data | High | Keep legacy columns, add new `shift_id` FK alongside |
| Rayon boundary tracking for admin_data | Medium | Reuse existing rayon boundary_polygon from Phase 2D |
| Phone number uniqueness conflicts | Low | Validate uniqueness at DTO level; migration adds unique constraint |
| Profile picture S3 storage | Low | Reuse existing S3 service infrastructure |

---

## File References

| Document | Purpose | Link |
|----------|---------|------|
| **README.md** | Phase overview (this file) | [View](./README.md) |
| **backend.md** | Backend entities, services, endpoints, DTOs | [View](./backend.md) |
| **mobile.md** | Mobile screens, components, navigation | [View](./mobile.md) |
| **web.md** | Web pages, components | [View](./web.md) |
| **database.md** | Schema changes, migration SQL, indexes | [View](./database.md) |
| **testing.md** | Test scenarios, coverage targets | [View](./testing.md) |
| **STATUS.md** | Implementation tracking | [View](./STATUS.md) |
| **ADR-012** | Phone number login decision | [View](../../architecture/decisions/ADR-012-phone-number-login.md) |
| **ADR-013** | Multi-area assignment decision | [View](../../architecture/decisions/ADR-013-multi-area-assignment.md) |
| **ADR-014** | Overtime clock-in flow decision | [View](../../architecture/decisions/ADR-014-overtime-clock-in-flow.md) |
| **ADR-015** | Audit trail decision | [View](../../architecture/decisions/ADR-015-audit-trail.md) |
