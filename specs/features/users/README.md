# Users & Profile

**Status:** ✅ Active · 🚧 role-driven form revamp planned · **Backend:** `users`, `user-locations`, `rbac` · **Key ADRs:** ADR-044 (dynamic RBAC), ADR-045 (region scope), ADR-013 (multi-location)

## Overview
User CRUD (admin), self-profile management, preferred language, profile photo, and scope assignment. Login by username **or** phone number. The add/edit form's scope inputs are **derived from the selected role's `monitoring_scope`** (UAT revamp), not hardcoded.

## Key decisions
- **Role-driven scope inputs** (ADR-044) — derived from the role's `monitoring_scope`: `city`/`none` → **no inputs**; `district` → rayon (**required**); `region` → rayon + region (**required**) + single location (**optional**). **satgas/linmas show no scope inputs** — their work area comes from schedules, not `user_locations`.
- **`users.region_id` added** (ADR-045) for korlap; korlap's optional location reuses `location_id` (single). Cascades: region filtered by rayon, location by region. The legacy multi-location `user_locations` is **not** used for korlap under the new model.
- **satgas/linmas** — backend stops writing `user_locations`; web hides the location picker entirely (removes today's satgas location multi-select).
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
- 2026-07-15 — **"Wajib Ganti Sandi" column reads as a pill in both states.** The `true` case already rendered a `StatusPill tone="warn"`, but `false` fell back to a bare `<span>` — so a grid where nobody is flagged looked like the column had no pills at all. `false` now renders `StatusPill tone="neutral"`, matching the Status column beside it.
- 2026-07-12 — **Phase 3 review hardening.** Backend now validates role + scope as a whole on create/update (ADR-044/045): a district/region-scope role **requires a rayon**; a region assignment is only valid for region/location-scope roles and the **region must belong to the user's rayon**; a role change away from region scope **clears a stale `region_id`** automatically (the form already sends explicit values — the API no longer relies on that). Validation runs against the effective post-PATCH state, and works for custom roles (scope read from the roles table). Note: `area_ids` is still accepted for satgas/linmas via the API (back-compat until schedules own their location, Phase 4) — only the form picker was removed.
- 2026-07-12 — **Area→Location terminology sweep.** Renamed `user-areas` → `user-locations`, `area_id` → `location_id`, location picker/multi-select references, ADR-013.
- 2026-07-11 — Username edit now persists (was dropped by the update DTO); role dropdown is data-driven (dynamic /roles, hierarchy sort, correct labels); Shift column removed (comes from schedules).
- 2026-07-11 — Review polish: removed the always-empty Shift column (shift comes from schedules/Phase 4); i18n the Location column header; Rayon/Region scope fields marked required.
- 2026-07-10 — Phase 3 landed: `users.region_id` (Create/Update DTO + service); web user form scope is role-driven from monitoring_scope (kepala_rayon/admin_rayon→rayon; korlap→rayon+region+optional location; satgas/linmas/management→none). satgas/linmas location+shift now come from schedules (Phase 4) — new such users are unmonitored until scheduled. Verified live.
- 2026-07-10 — Role-driven scope inputs + `users.region_id`; satgas/linmas location picker removed (ADR-044/045).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
