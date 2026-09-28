# Users & Profile

**Status:** ✅ Active · 🚧 role-driven form revamp planned · **Backend:** `users`, `user-locations`, `rbac` · **Key ADRs:** ADR-044 (dynamic RBAC), ADR-045 (region scope), ADR-013 (multi-location)

## Overview
User CRUD (admin), self-profile management, preferred language, profile photo, and scope assignment. Login by username **or** phone number. The add/edit form's scope inputs are **derived from the selected role's `monitoring_scope`** (UAT revamp), not hardcoded.

## Key decisions
- **Role-driven scope inputs** (ADR-044 amendment, 2026-09-26) — derived from the role's **`home_scope`** (`none` | `district`), editable per role in Hak Akses: `district` → Rayon **required**; `none` → no scope inputs and `district_id` forced null (satgas, linmas, korlap, admin_system, management, …). `monitoring_scope` no longer drives the form — it only decides what the role may view on the map. Work places come from schedules.
- **`users.region_id` added** (ADR-045) for korlap; korlap's optional location reuses `location_id` (single). Cascades: region filtered by rayon, location by region. The legacy multi-location `user_locations` is **not** used for korlap under the new model.
- **satgas/linmas** — backend stops writing `user_locations`; web hides the location picker entirely (removes today's satgas location multi-select).
- **Force delete** (ADR-062) — in-use records can be deleted after an impact preview, typed-name confirmation and a required reason. Soft delete + cascade of **future** schedules only (after today; recurring series end today); past attendance, schedules and reports stay as history. One audit tree per delete.
- `users.preferred_language` drives app locale (id/en); scope (`rayon_id`/`region_id`/`location_id`) enforced server-side by the role's monitoring scope + `monitoring:read` (ADR-044).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Users page (list/create/edit), Profile, Settings — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** profile + settings screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [auth](../auth/README.md)
- [geography](../geography/README.md)
- [access-control](../access-control/README.md)

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
