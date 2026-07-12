# ADR-010: Phase 2C Terminology Cleanup, Schema Redesign & Polygon Geofencing

**Date:** 2026-02-11
**Status:** Accepted (Backend Implemented Feb 11, 2026) — amended by [ADR-045](./ADR-045-four-level-location-hierarchy.md) (four-level hierarchy; leaf entity renamed Area→Location)
**Deciders:** System Architect, Product Owner
**Tags:** naming, schema, geofencing, breaking-change
**Supersedes:** Portions of initial Phase 2C spec (2026-02-10)

---

## Context

Phase 2C backend was functionally complete (889 tests passing) when client feedback review identified 4 major issues requiring spec rewrite before proceeding with frontend implementation:

1. **"Worker" terminology throughout codebase** — The system has 8 roles, not just workers. Tables like `worker_schedules`, `work_reports`, and columns like `worker_id` are misleading.
2. **Overtime-aktivitas 1:N relationship** — Client clarified that 1 overtime = 1 activity, not 1 overtime with multiple activities. The `overtime_aktivitas` child table is unnecessary overhead.
3. **Indonesian naming in code** — Table names like `overtime_aktivitas` and route paths like `/aktivitas` mix Indonesian into code. Indonesian should be reserved for UI display labels and user-facing error messages only.
4. **GPS boundary validation was removed but not replaced** — ADR-009 removed GPS boundary enforcement, but client actually wants soft geofencing using polygon boundaries (from KMZ import). Clock-in/out should always succeed, but out-of-boundary records should be flagged.

---

## Decisions

### Decision 1: Remove "worker" terminology

**Rename tables:**
| Current | New | Rationale |
|---------|-----|-----------|
| `worker_schedules` | `schedules` | Generic — any clockable role can have a schedule |
| `work_reports` | `activities` | Aligns with "activity" concept used throughout |
| `worker_assignments` | _(DROP)_ | Fully deprecated, replaced by `schedules` |

**Rename columns:**
| Table | Old Column | New Column |
|-------|-----------|------------|
| `shifts` | `worker_id` | `user_id` |
| `activities` | `worker_id` | `user_id` |
| `location_logs` | `worker_id` | `user_id` |

**Rename backend modules:**
| Current | New |
|---------|-----|
| `worker-schedules/` | `schedules/` |
| `worker-assignments/` | _(DELETE)_ |
| `reports/` | `activities/` |

**Rename entity classes:**
| Current | New |
|---------|-----|
| `WorkerSchedule` | `Schedule` |
| `Report` | `Activity` |
| `WorkerAssignment` | _(DELETE)_ |
| `OvertimeAktivitas` | _(DELETE — merged into Overtime)_ |

### Decision 2: Flatten overtime (1 overtime = 1 activity)

**Before:** `overtimes` → `overtime_aktivitas` (1:N parent-child)
**After:** Activity fields (`activity_type_id`, `description`, `photo_urls`, `gps_lat`, `gps_lng`) move directly into `overtimes` table.

**Rationale:** Client confirmed 1 overtime = 1 activity. The child table adds unnecessary join complexity and complicates the mobile form.

**Migration:** DROP `overtime_aktivitas` table, ADD 5 columns to `overtimes`.

### Decision 3: English-only in code

**API routes:**
| Current | New |
|---------|-----|
| `/aktivitas` | `/activities` |
| `/overtime` | `/overtime` (already English) |

**Code identifiers:** All entity names, service names, DTO names, constants use English. Indonesian is reserved for:
- User-facing error messages: `"Anda hanya dapat melihat monitoring area Anda"`
- UI display labels: `"Tugas"`, `"Lembur"`, `"Aktivitas"`
- Seed data names: `"Penyiraman"`, `"Penanaman"`

### Decision 4: Polygon geofencing (soft warning)

**Approach:** Application-level ray casting in `GpsUtil`. No PostGIS extension needed.

**New columns on `shifts`:**
| Column | Type | Default |
|--------|------|---------|
| `clock_in_outside_boundary` | BOOLEAN | false |
| `clock_out_outside_boundary` | BOOLEAN | false |

**Behavior:**
- Clock-in/out ALWAYS succeeds (no blocking)
- If user's GPS is outside the area polygon/radius boundary, the shift record is flagged
- Monitoring dashboard shows warning indicator for flagged shifts
- Area boundary data comes from existing `areas.boundary_polygon` JSONB column (populated from KMZ import)

**New utility methods:**
- `GpsUtil.isPointInPolygon(lat, lng, polygon: GeoJSON)` — ray casting algorithm
- `GpsUtil.isWithinAreaBoundary(lat, lng, area)` — polygon-first, radius fallback

### Decision 5: Drop `report_type` column

The `report_type` enum (cleaning, planting, maintenance, inspection, task_completion, incident, maintenance_request) is fully replaced by `activity_type_id` FK to `activity_types`. The column is dropped rather than made nullable.

---

## Consequences

### Positive

- **Clarity:** No more "worker" terminology for a multi-role system
- **Simplicity:** Flat overtime structure eliminates unnecessary join
- **Consistency:** English-only code, Indonesian-only UI
- **Safety:** Polygon geofencing provides visibility without blocking operations
- **Cleaner schema:** 17 tables (down from 19)

### Negative

- **Breaking change:** All layers must be updated (tables renamed, columns renamed)
- **Test updates:** All 889 backend tests need find-and-replace for renamed identifiers
- **Migration complexity:** Single migration with 12 steps (table renames, column renames, drops)
- **Frontend rework:** All API paths, types, Redux slices reference old names

### Risk Mitigation

- Single atomic migration file with tested rollback
- Find-and-replace approach for bulk renames minimizes manual errors
- Frontend updates are spec-only at this stage (no code written yet)

---

## Implementation

See updated spec documents:
- [database.md](../../history/CHANGELOG.md) — Full migration plan
- [backend.md](../../history/CHANGELOG.md) — Module/entity/route renames
- [mobile.md](../../history/CHANGELOG.md) — Screen/type/API renames
- [web.md](../../history/CHANGELOG.md) — Page/type/API renames
- [testing.md](../../history/CHANGELOG.md) — Updated test plan

**Related ADRs:**
- [ADR-009: Role System Overhaul](./ADR-009-phase2c-role-system-overhaul.md) — Role changes (unchanged)
- [ADR-005: GPS Boundary Tolerance](./ADR-005-gps-boundary-tolerance.md) — Superseded by soft polygon geofencing

---

**Last Updated:** 2026-02-11
