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

## Endpoint permission migration (Phase 5.5) — planned

**Why this is its own phase (not done piecemeal):** custom roles are *assignable* to
users today, but the ~182 legacy `@Roles(...)` guards still gate by role code, so a
custom role gets **403** on every un-migrated endpoint. A **partial** migration is
worse than none — a custom role would work on some endpoints and 403 on others,
which is unpredictable. So this runs as one focused pass with a parity guarantee.

**Audit (2026-07-11):** 182 `@Roles` usages across 27 controllers, all built from
**~25 role-group constants** in `apps/be/src/modules/users/constants/role-groups.ts`
(top: `USER_MANAGERS` ×47, `CLOCKABLE_ROLES` ×10, `MONITORING_AREA` ×9,
`ASSET_MANAGERS`/`ANALYTICS_VIEWERS` ×7…). So the work is bounded by the group set,
not 182 unique combinations.

**Strategy (per endpoint):** replace `@Roles(...GROUP)` with
`@RequirePermissions('resource:action')` where the action is the endpoint's verb
(list→`:read`, POST→`:create`, PATCH→`:update`, DELETE→`:delete`, plus domain
verbs like `:approve`/`:verify`/`:assign`). Then ensure **`role-seeds.ts` grants
that key to exactly the roles that were in `GROUP`** — this is the parity contract.

**Parity test (the safety net):** a data-driven test that, for each of the 9 system
roles, asserts the set of endpoints reachable under the old `@Roles` list equals the
set reachable under `@RequirePermissions` + that role's seeded permissions. It must
be green before merge — proving no system role loses or gains access on staging.

**Order:** migrate module-by-module (users → areas/rayons/regions → activities/tasks
→ monitoring → the rest), each module fully done + parity-green, so custom roles
light up incrementally without breaking system roles. Keep `PermissionsGuard`
(global, no-op without metadata) coexisting with `RolesGuard` throughout.

## Related features
- [auth](../auth/README.md) · [users](../users/README.md) · [monitoring](../monitoring/README.md) · [settings](../settings/README.md)

## Changelog
- 2026-07-11 — **Role accent colour (`marker_color`) is now data-driven end-to-end.** Reintroduces the orphaned `roles.marker_color` column (created in migration `17491300000000`, never wired) — added to the Role entity, `Create/UpdateRoleDto` (hex `#RRGGBB` validated), `RoleView`, and seeded per system role from the `--color-role-*` design tokens (seed `COALESCE`-backfills existing rows once, never clobbering an operator's pick). Role editor gains a **colour picker** (shared `ColorField`, extracted from `MapStyleFields`). The **user-management pill + avatar** now tint from the role's `marker_color` (readable black/white ink auto-picked by luminance), with the fixed per-role token as fallback — this also gives **custom roles** a pill/avatar colour (previously an undefined token). Scope: user management only — **map markers stay image + status-ring driven** (the map `marker_color` removed on 2026-07-11 below is unrelated; this is the pill/avatar accent).
- 2026-07-11 — User management now **data-driven roles** end-to-end: UserForm role dropdown reads the /roles catalog (DB labels, hierarchy sort, scope from monitoring_scope); backend accepts any role code validated against the roles table (create/update DTO `role: string` + `assertRoleValid`); migration `17492000000000` drops the static `chk_users_role` constraint. Custom roles are now assignable to users. Fixed stale role labels (management/admin_rayon) on web + mobile.
- 2026-07-11 — Markers are image-only: removed configured `marker_color` (the status ring is dynamic, computed from worker activity); markers mandatory with a system default (per role code) + collapsed picker (current + Change → gallery/upload). Migration `17491900000000`.
- 2026-07-11 — Review polish: role-list search, higher-contrast selected state, SYSTEM-badge tooltip, Role Name required + inline error, one-input-per-row. **Marker-as-image** (`marker_image_url` on roles/teams/rayons/regions/areas; migration `17491800000000`): shared `MarkerImagePicker` = preseeded gallery (`public/markers/*.svg`) + custom data-URI upload. Verified live.
- 2026-07-11 — Role codes renamed per UAT: `top_management` → `management`, `admin_data` → `admin_rayon` (also usernames + display labels). Codebase-wide sweep + data migration `17491700000000` (relaxes `chk_users_role`, updates `users.role`/usernames, `roles.code`, `activity_types.applicable_roles`). Supersedes ADR-033's naming stance. Applied to demo + staging seeders.
- 2026-07-10 — Backend landed (Phase 1): `rbac` module — Role/Permission/role_permissions tables + migration, permission catalog + wildcard matcher, `RolePermissionsService` (Redis), `@RequirePermissions`/`PermissionsGuard`, roles/permissions CRUD API, idempotent seeds (9 system roles). Existing `@Roles` endpoints untouched. Web role-management page + endpoint migration still pending.
- 2026-07-10 — Spec created for UAT dynamic-RBAC revamp (ADR-044). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
