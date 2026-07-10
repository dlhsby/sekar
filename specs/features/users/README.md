# Users & Profile

**Status:** ✅ Active · **Backend:** `users`, `user-areas` · **Key ADRs:** ADR-009 (roles), ADR-013 (multi-area)

## Overview
User CRUD (admin), self-profile management, preferred language, profile photo, and user→area assignment. Korlap may be assigned to multiple areas.

## Key decisions
- **Multi-area assignment** (ADR-013) — junction table `user_areas` for many-to-many korlap↔area.
- `users.preferred_language` drives app locale (id/en); `users.rayon_id` scopes admin_data authority.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Users page (list/create/edit), Profile, Settings — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** profile + settings screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [auth](../auth/README.md)
- [geography](../geography/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
