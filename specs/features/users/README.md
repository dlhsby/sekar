# Users & Profile

**Status:** ✅ Active · 🚧 role-driven form revamp planned · **Backend:** `users`, `user-areas`, `rbac` · **Key ADRs:** ADR-044 (dynamic RBAC), ADR-045 (region scope), ADR-013 (multi-area)

## Overview
User CRUD (admin), self-profile management, preferred language, profile photo, and scope assignment. Login by username **or** phone number. The add/edit form's scope inputs are **derived from the selected role's `monitoring_scope`** (UAT revamp), not hardcoded.

## Key decisions
- **Role-driven scope inputs** (ADR-044) — derived from the role's `monitoring_scope`: `city`/`none` → **no inputs**; `district` → rayon (**required**); `region` → rayon + region (**required**) + single location (**optional**). **satgas/linmas show no scope inputs** — their work area comes from schedules, not `user_areas`.
- **`users.region_id` added** (ADR-045) for korlap; korlap's optional location reuses `area_id` (single). Cascades: region filtered by rayon, location by region. The legacy multi-area `user_areas` is **not** used for korlap under the new model.
- **satgas/linmas** — backend stops writing `user_areas`; web hides the area picker entirely (removes today's satgas area multi-select).
- `users.preferred_language` drives app locale (id/en); scope (`rayon_id`/`region_id`/`area_id`) enforced server-side by the role's monitoring scope + `monitoring:read` (ADR-044).

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
- 2026-07-10 — Phase 3 landed: `users.region_id` (Create/Update DTO + service); web user form scope is role-driven from monitoring_scope (kepala_rayon/admin_rayon→rayon; korlap→rayon+region+optional location; satgas/linmas/management→none). satgas/linmas area+shift now come from schedules (Phase 4) — new such users are unmonitored until scheduled. Verified live.
- 2026-07-10 — Role-driven scope inputs + `users.region_id`; satgas/linmas area picker removed (ADR-044/045).
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
