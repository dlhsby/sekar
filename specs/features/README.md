# Features

SEKAR organized as a **product** — one concise spec per feature domain. Each spec says what the
feature does, the decisions behind it, and links to the canonical API / DB / UI detail (it does not
duplicate them). Keep each feature spec ≤ ~150 lines; put deep detail in the linked docs.

**Legend:** ✅ Active · 🅿️ Parked (built, hidden from web nav, revisit later) · ⚠️ Deprecated

| Feature | Status | Backend module(s) | Notes |
|---------|--------|-------------------|-------|
| [Auth & roles](auth/README.md) | ✅ | `auth`, `users` | Login, phone login, 8-role RBAC, password, onboarding |
| [Users & profile](users/README.md) | ✅ | `users`, `user-areas` | User CRUD, profile, area assignment |
| [Scheduling](scheduling/README.md) | ✅ | `shifts`, `shift-definitions`, `schedules`, `special-day-overrides`, `service-capacity` | Materialized daily roster; capacity has a rayon UI; special-day is backend-only |
| [Attendance](attendance/README.md) | ✅ | `activities` (clock events) | Clock in/out with photo + GPS |
| [Work items](work/README.md) | ✅ | `tasks`, `activities`, `activity-types` | Typed tasks + activity logging |
| [Overtime](overtime/README.md) | ✅ | `overtime` | Submission + 3-level approval |
| [Geography](geography/README.md) | ✅ | `areas`, `area-types`, `rayons`, `kecamatans`, `area-staff-requirements` | Kecamatans & staff-requirements are backend-only |
| [Monitoring](monitoring/README.md) | ✅ | `monitoring`, `location`, `gateways` | Live positions, drill-down, realtime. ⚠️ legacy `supervisor` deprecated |
| [Plants](plants/README.md) | ✅ | `plants`, `plant-seeds` | Area-aggregate inventory (seeds UI parked) |
| [Pruning](pruning/README.md) | ✅ | `pruning-requests` | Kecamatan intake + admin_data disposition |
| [Notifications](notifications/README.md) | ✅ | `notifications`, `queue` | FCM push via BullMQ |
| [System](system/README.md) | ✅ | `health`, `audit`, `config`, `app-releases` | Health, audit log, runtime config, versioning |
| [Parked features](_archived/README.md) | 🅿️ | `assets`, `analytics`, `reporting`, `import`, `export`, `plant-seeds` (UI) | Built, hidden from web nav 2026-07-07, revisit later |

For the build history see [`../history/CHANGELOG.md`](../history/CHANGELOG.md). For current status &
metrics see [`../COMPLETION_STATUS.md`](../COMPLETION_STATUS.md).
