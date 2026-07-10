# Auth & Roles

**Status:** ✅ Active · **Backend:** `auth`, `users` · **Key ADRs:** ADR-004 (JWT), ADR-009 (8 roles), ADR-012 (phone login), ADR-041 (forgot-password), ADR-042 (onboarding)

## Overview
Authentication and role-based access for all SEKAR users. Username **or** phone-number login, JWT access (15 min) + refresh (7 day) rotation, bcrypt (10 rounds), and an 8-role RBAC model. First-launch onboarding (mobile) and admin-driven password reset (no self-serve).

## Key decisions
- **JWT + refresh rotation** (ADR-004) — short access token, rotating refresh.
- **8 roles** (ADR-009): satgas, linmas, korlap, admin_data, kepala_rayon, top_management, admin_system, superadmin; + external `staff_kecamatan` (ADR-033).
- **Phone-number login** (ADR-012) — identifier can be username or phone.
- **Forgot-password = contact admin** (ADR-041) — no self-serve reset; `password_must_change` forces a change on first login.
- **Onboarding** (ADR-042) — pre-login carousel + permission priming + area preview (mobile).

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** login page + route guards (`src/proxy.ts`, httpOnly cookie) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** login, change-password, onboarding screens — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [users](../users/README.md)
- [geography](../geography/README.md) (role scope by rayon/area)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
