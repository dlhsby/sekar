# Access Control (Roles & Permissions)

**Status:** 🚧 Planned (UAT revamp) · **Backend:** `rbac`, `auth` · **Key ADRs:** ADR-044 (dynamic RBAC), ADR-009 (original roles)

## Overview
Data-driven RBAC: roles and permissions are database rows managed at runtime from a **role-management page**. Permissions are flat **`resource:action`** keys (grouping is presentation-layer via a code-side catalog); each role also has a **monitoring scope** (`city|district|region|location|none`) and a map **marker** (icon + color). Replaces the static `UserRole` enum + hand-maintained role-group arrays. `users.role` stays a string code referencing `roles.code`; JWT is unchanged.

## Key decisions
- **Dynamic RBAC** (ADR-044) — `roles` / `permissions` / `role_permissions` tables; 9 seeded `is_system` roles (codes unchanged), plus operator-created custom roles.
- **Enforcement** — global `PermissionsGuard` + `@RequirePermissions(...keys)` (AND semantics) with **wildcard** support (`*:*`, `resource:*`); a shared matcher powers the web `usePermissions()` hook. Role permissions cached in Redis (`rbac:role:{code}:permissions`, ~300s TTL), invalidated on change.
- **Guard migration via compat shim** — `RolesCompatGuard` maps existing `@Roles()` to permissions so endpoints migrate to `@RequirePermissions` incrementally; staging stays green.
- **Monitoring scope on the role** is the single source of truth for visibility + which user-form scope inputs appear. `monitoring:read` grants access; scope narrows *how much* is seen (no per-tier permissions).
- **Role editor** = 3-level accordion (Category → Resource → permission toggles) + scope selector + marker picker.
- **Role code `admin_rayon`** (renamed from `admin_data`; label "Admin Rayon"), equalized to `kepala_rayon`; the rename supersedes ADR-033's naming stance. `management` is the renamed `top_management`.

## Implementation
- **API:** roles/permissions CRUD, role↔permission mapping — [`../../api/contracts.md`](../../api/contracts.md)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Role management page (permission matrix, scope + marker) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)

## Related features
- [auth](../auth/README.md) · [users](../users/README.md) · [monitoring](../monitoring/README.md) · [settings](../settings/README.md)

## Changelog
- 2026-07-11 — Review polish: role-list search, higher-contrast selected state, SYSTEM-badge tooltip, Role Name required + inline error, one-input-per-row. **Marker-as-image** (`marker_image_url` on roles/teams/rayons/regions/areas; migration `17491800000000`): shared `MarkerImagePicker` = preseeded gallery (`public/markers/*.svg`) + custom data-URI upload. Verified live.
- 2026-07-11 — Role codes renamed per UAT: `top_management` → `management`, `admin_data` → `admin_rayon` (also usernames + display labels). Codebase-wide sweep + data migration `17491700000000` (relaxes `chk_users_role`, updates `users.role`/usernames, `roles.code`, `activity_types.applicable_roles`). Supersedes ADR-033's naming stance. Applied to demo + staging seeders.
- 2026-07-10 — Backend landed (Phase 1): `rbac` module — Role/Permission/role_permissions tables + migration, permission catalog + wildcard matcher, `RolePermissionsService` (Redis), `@RequirePermissions`/`PermissionsGuard`, roles/permissions CRUD API, idempotent seeds (9 system roles). Existing `@Roles` endpoints untouched. Web role-management page + endpoint migration still pending.
- 2026-07-10 — Spec created for UAT dynamic-RBAC revamp (ADR-044). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
