# ADR-009: Phase 2C Role System Overhaul

**Date:** 2026-02-10
**Status:** Accepted (Backend Implemented Feb 11, 2026) — amended by [ADR-032](./ADR-032-admin-data-disposition-authority-pruning-requests.md), [ADR-033](./ADR-033-staff-kecamatan-role.md), [ADR-044](./ADR-044-dynamic-rbac.md) (roles are now data-driven)
**Deciders:** System Architect, Product Owner, Client (DLH Surabaya)
**Tags:** roles, authentication, authorization, breaking-change
**Related:** [ADR-010: Terminology Cleanup](./ADR-010-phase2c-terminology-cleanup.md)

---

## Context

During the February 10, 2026 client meeting, DLH Surabaya provided feedback requiring significant changes to the role system. The current 7-role system does not adequately represent the organizational structure and access needs.

### Current Role System (Phase 2A/2B - 7 roles)

| Role | Purpose | Issues Identified |
|------|---------|-------------------|
| `worker` | Field worker | Name should be "satgas" (client terminology) |
| `linmas` | Security | No issues |
| `supervisor` | Legacy supervisor | Redundant with koordinator_lapangan |
| `admin` | Single admin role | Too broad - data entry vs system management vs full control need separation |
| `koordinator_lapangan` | Field coordinator | Name too long, should be "korlap" |
| `kepala_rayon` | District head | No issues |
| `management` | City-wide view | No issues |

### Client Requirements

1. Use DLH Surabaya organizational terms (satgas, korlap)
2. Separate admin responsibilities: data entry, system management, and full system control
3. Field coordinator (korlap) is a clockable role with activity submission capability
4. New admin_rayon role for staff who handle attendance and report data entry
5. Remove GPS boundary restriction on clock-in (top management request) — replaced by soft polygon geofencing (ADR-010)

---

## Decision

### Role System Overhaul to 8 Roles

Replace the 7-role system with 8 clearly defined roles matching DLH Surabaya organizational structure:

| # | Role | Replaces | Rationale |
|---|------|----------|-----------|
| 1 | `satgas` | `worker` | Client organizational term for field worker |
| 2 | `linmas` | `linmas` | No change |
| 3 | `korlap` | `koordinator_lapangan`, `supervisor` | Shortened name, absorbed legacy supervisor |
| 4 | `admin_rayon` | _(new)_ | Data entry personnel - distinct from system admin |
| 5 | `kepala_rayon` | `kepala_rayon` | No change |
| 6 | `management` | `management` | No change |
| 7 | `admin_system` | Part of `admin` | Day-to-day system administration |
| 8 | `superadmin` | Part of `admin` | Full system control + configuration |

### Admin Split Rationale

The single `admin` role was too broad. DLH Surabaya needs three distinct admin levels:

1. **admin_rayon** - Clerical staff who check attendance records and enter reports. They need clock-in capability and activity submission but NO access to user management, system settings, or monitoring dashboards. This prevents data entry staff from accidentally modifying system configuration.

2. **admin_system** - IT staff or designated managers who handle day-to-day system administration: creating users, managing areas and rayons, scheduling, and viewing monitoring dashboards. They do NOT need clock-in capability.

3. **superadmin** - Full system access including admin_system capabilities plus system configuration, audit logs, and critical operations. Typically 1-2 people per organization.

### GPS Boundary Changes

Top management requested removal of hard GPS boundary enforcement during clock-in. Phase 2C replaces this with **soft polygon geofencing** (see ADR-010):
- Workers can always clock in regardless of GPS position
- GPS coordinates are checked against area polygon boundary
- Out-of-boundary clock-ins are flagged (`clock_in_outside_boundary = true`) but never blocked
- Monitoring dashboard shows boundary warning indicators

This supersedes ADR-005 (100m GPS Boundary Tolerance). GPS recording continues; hard boundary validation is replaced by soft polygon-based warnings.

### User Entity Schema Addition

The current User entity has `rayon_id` for kepala_rayon but **no `area_id`**. Phase 2C adds `area_id` (nullable UUID FK to areas) for the korlap role, enabling area-scoped operations (monitoring, overtime approval, task scope).

### Task Status Simplification Decision

Phase 2B had 6 task statuses including `accepted` and `declined` (worker accept/decline workflow). Phase 2C removes this complexity: tasks go directly `pending -> assigned -> in_progress -> completed`. The accept/decline workflow was not mentioned in client feedback and added unnecessary friction.

### Migration Strategy

1. **Phase 0 (prerequisite):** Database role enum migration + add `area_id` to users table during maintenance window
2. **Data migration:** `worker->satgas`, `koordinator_lapangan->korlap`, `supervisor->korlap`, `admin->superadmin`
3. **Force re-login:** Invalidate all refresh tokens post-migration
4. **New roles:** `admin_rayon` and `admin_system` created manually by superadmin
5. **Rollback:** Reverse SQL migration available, tested before deployment

---

## Consequences

### Positive

- **Client alignment:** Role names match DLH Surabaya organizational terminology
- **Security improvement:** Principle of least privilege via admin role separation
- **Operational clarity:** Data entry staff (admin_rayon) cannot modify system configuration
- **Better geofencing:** Polygon-based soft warnings more useful than hard radius blocking
- **Simplified naming:** `korlap` is more practical than `koordinator_lapangan`

### Negative

- **Breaking change:** All layers (DB, backend, mobile, web) must update simultaneously
- **Migration risk:** Production database contains user data that must be migrated
- **Session invalidation:** All users must re-login after migration
- **Testing burden:** All existing tests must update role references
- **Backward compatibility:** Mobile app must be force-updated before backend deployment

### Risk Mitigation

- Deploy during off-hours maintenance window (22:00-06:00 WIB)
- Test migration on staging database first
- Prepare rollback scripts and test them
- Coordinate mobile app force-update timing
- Monitor for authentication failures post-deployment

---

## Alternatives Considered

1. **Keep existing roles, add admin_rayon only** - Insufficient; client requires satgas/korlap naming and admin split
2. **Use role hierarchy instead of flat roles** - Over-engineered for 8 roles; flat system with explicit permissions is simpler
3. **Gradual migration (alias both old and new names)** - Increases complexity; clean break is preferred given single deployment target

---

## Implementation

- [ ] Database migration script (role enum update + area_id on users)
- [ ] Backend UserRole enum and guards
- [ ] Backend User entity: add area_id property and Area relation
- [ ] Backend Activity Types: update applicable_roles from PascalCase to lowercase
- [ ] Backend Task entity: simplify to 4 statuses, remove accept/decline columns
- [ ] Mobile type definitions and navigation
- [ ] Web type definitions and route protection
- [ ] All test suites updated
- [ ] Seed data updated (applicable_roles TEXT[] format with lowercase values)
- [ ] ADR-005 updated with GPS boundary removal note

**Related ADRs:**
- [ADR-005: GPS Boundary Tolerance](./ADR-005-gps-boundary-tolerance.md) - Superseded by soft polygon geofencing
- [ADR-010: Terminology Cleanup](./ADR-010-phase2c-terminology-cleanup.md) - Complementary decision for naming conventions

---

**Last Updated:** 2026-02-11
