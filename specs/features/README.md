# Features

SEKAR organized as a **product** — one concise spec per feature domain. Each spec says what the
feature does, the decisions behind it, and links to the canonical API / DB / UI detail (it does not
duplicate them). Keep each feature spec ≤ ~150 lines; put deep detail in the linked docs.

**Legend:** ✅ Active · 🚧 Planned (UAT revamp) · 🅿️ Parked (built, hidden from web nav, revisit later) · ⚠️ Deprecated

| Feature | Status | Backend module(s) | Notes |
|---------|--------|-------------------|-------|
| [Auth & roles](auth/README.md) | ✅ | `auth`, `users` | Login, phone login, RBAC, password, onboarding |
| [Access control](access-control/README.md) | 🚧 | `rbac`, `auth` | Data-driven roles/permissions, role mgmt page, monitoring scope (ADR-044) |
| [Users & profile](users/README.md) | ✅ 🚧 | `users`, `user-areas`, `rbac` | User CRUD, profile; role-driven scope inputs planned |
| [Scheduling](scheduling/README.md) | ✅ 🚧 | `shifts`, `shift-definitions`, `schedules`, `schedule-events`, `special-day-overrides`, `service-capacity` | Materialized roster; calendar + recurrence + teams revamp planned (ADR-047) |
| [Attendance](attendance/README.md) | ✅ | `activities` (clock events) | Clock in/out with photo + GPS |
| [Work items](work/README.md) | ✅ | `tasks`, `activities`, `activity-types` | Typed tasks + activity logging |
| [Overtime](overtime/README.md) | ✅ | `overtime` | Submission + 3-level approval |
| [Geography](geography/README.md) | ✅ 🚧 | `areas`, `area-types`, `rayons`, `regions`, `kecamatans`, `area-staff-requirements` | 4-level (Region/Kawasan) + per-level styling planned (ADR-045) |
| [Teams](teams/README.md) | 🚧 | `teams`, `schedules` | Typed crews with markers; membership via schedules (ADR-048) |
| [Monitoring](monitoring/README.md) | ✅ 🚧 | `monitoring`, `location`, `gateways` | Live positions, drill-down, realtime; subject-model revamp planned (ADR-046). ⚠️ legacy `supervisor` deprecated |
| [Plants](plants/README.md) | ✅ | `plants`, `plant-seeds` | Area-aggregate inventory (seeds UI parked) |
| [Pruning](pruning/README.md) | ✅ | `pruning-requests` | Kecamatan intake + admin_rayon disposition |
| [Notifications](notifications/README.md) | ✅ | `notifications`, `queue` | FCM push via BullMQ |
| [System](system/README.md) | ✅ | `health`, `audit`, `config`, `app-releases` | Health, audit log, runtime config, versioning |
| [Settings](settings/README.md) | 🚧 | `settings`, `system` | Personal preferences vs system settings, grouped (ADR-049) |
| [Parked features](_archived/README.md) | 🅿️ | `assets`, `analytics`, `reporting`, `import`, `export`, `plant-seeds` (UI) | Built, hidden from web nav 2026-07-07, revisit later |

For the build history see [`../history/CHANGELOG.md`](../history/CHANGELOG.md). For current status &
metrics see [`../COMPLETION_STATUS.md`](../COMPLETION_STATUS.md).
