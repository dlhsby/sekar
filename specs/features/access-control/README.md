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

## Guard → permission migration (DEFERRED — revisit during development)

The permission engine works, but only the **rbac + settings** endpoints are gated by
`@RequirePermissions`/`PermissionsGuard`. **~29 controllers / ~155 endpoints still use
legacy `@Roles` + `RolesGuard`** (role-list only, no permission fallback), so a *custom*
role's granted permissions don't unlock them. Completing the migration is deferred and
tracked here so it isn't re-discovered from scratch.

**Strategy (safety-first, zero system-role regression):** introduce a **unified guard that
passes on `@Roles` OR `@RequirePermissions`**, then add `@RequirePermissions('resource:action')`
to each endpoint while **keeping `@Roles` as a safety net**. The 9 system roles keep passing
via `@Roles` unchanged; custom roles pass via the permission. Retire `@Roles` per-endpoint only
after a role×endpoint matrix test proves the grants are equivalent.

**Pre-work before converting (else regressions):**
- **Add missing permissions to the catalog + system-role grants:** `activity:update`, `task:delete`,
  `overtime:update`/`overtime:delete`, `pruning-request:update`, and whole new resources not yet
  modelled — `shift:*` (clock-in/out; currently implied by `schedule:*`), `asset:*`, `plant:*`,
  `location:*`, `capacity:*`, `import:*`, `area-type:*`, `activity-type:*`, `notification:*`,
  `analytics:*`.
- **Fix grant gaps in `role-seeds.ts`:** `satgas`/`linmas` need `task:read` (+ task state-change) and
  `activity:update`; `staff_kecamatan` needs `task:read` for pruning-linked tasks; verify `overtime:*`
  distribution across the `OVERTIME_*`/`CLOCKABLE_ROLES` groups.
- **Leave service-layer role/scope checks in place** (~20 services, e.g. `monitoring`, `schedules`,
  `activities`, `export`): the guard governs *route access*; services govern *data scope*. These are
  orthogonal and stay.

**Sizing:** 29 controllers, ~155 handlers, 27 role-group constants → 32 (soon ~50) permission keys.
Do it module-by-module, each behind the full backend suite + the access matrix.

## Changelog
- 2026-07-12 — **Guard→permission migration scoped + deferred** (see "Guard → permission migration" above). Full inventory taken (29 controllers / ~155 `@Roles` handlers, ~15–20 missing permissions, grant gaps, service-layer scope checks) and a safety-first unified-guard strategy recorded; execution deferred to revisit alongside feature development (per product call). No code change — verified today that the permission engine + `PermissionsGuard` work on migrated surfaces and system roles pass everywhere via `@Roles`.
- 2026-07-12 — **Terminology + seeder cleanup.** Nav/page title "Role Management" → **Roles** (`Peran`). English UI standardised on the **city → district → region → location** hierarchy: EN `Rayon(s)` labels → **District(s)** (value-only, keys unchanged; `access-control:scope.district` EN = "District"); ID keeps Rayon / Kawasan / Lokasi. Fixed stale demo **display names** in the seeders (`Top Management …` → `Management …`, `Admin Data …` → `Admin Rayon …`; role codes/usernames were already correct) + migration `17492200000000-FixLegacyRoleDisplayNames` to patch already-seeded/**staging** rows in place (no reseed). **RBAC status note:** the permission engine + `PermissionsGuard` work end-to-end for migrated surfaces (roles/permissions/settings, user-write gating); legacy `@Roles`+`RolesGuard` endpoints (monitoring, schedules, …) are **not yet migrated**, so a *custom* role's granted permissions don't unlock those until each is converted to `@RequirePermissions` (ADR-044 incremental migration).
- 2026-07-11 — **Fix:** `roles.marker_color` had no migration (the entity column was re-added but `DropMarkerColor17491900000000` had removed it and dev/prod run migrations, not sync) — every `GET /auth/me` 500'd (`column Role.marker_color does not exist`) on any DB past that migration, blanking the app after login. Added migration `17492100000000-AddRoleMarkerColor` (recreates the column + hex check constraint; roles keep the accent colour, geo levels stay image-only).
- 2026-07-11 — **Role accent colour (`marker_color`) is now data-driven end-to-end.** Reintroduces the orphaned `roles.marker_color` column (created in migration `17491300000000`, never wired) — added to the Role entity, `Create/UpdateRoleDto` (hex `#RRGGBB` validated), `RoleView`, and seeded per system role from the `--color-role-*` design tokens (seed `COALESCE`-backfills existing rows once, never clobbering an operator's pick). Role editor gains a **colour picker** (shared `ColorField`, extracted from `MapStyleFields`). The **user-management pill + avatar** now tint from the role's `marker_color` (readable black/white ink auto-picked by luminance), with the fixed per-role token as fallback — this also gives **custom roles** a pill/avatar colour (previously an undefined token). Scope: user management only — **map markers stay image + status-ring driven** (the map `marker_color` removed on 2026-07-11 below is unrelated; this is the pill/avatar accent).
- 2026-07-11 — User management now **data-driven roles** end-to-end: UserForm role dropdown reads the /roles catalog (DB labels, hierarchy sort, scope from monitoring_scope); backend accepts any role code validated against the roles table (create/update DTO `role: string` + `assertRoleValid`); migration `17492000000000` drops the static `chk_users_role` constraint. Custom roles are now assignable to users. Fixed stale role labels (management/admin_rayon) on web + mobile.
- 2026-07-11 — Markers are image-only: removed configured `marker_color` (the status ring is dynamic, computed from worker activity); markers mandatory with a system default (per role code) + collapsed picker (current + Change → gallery/upload). Migration `17491900000000`.
- 2026-07-11 — Review polish: role-list search, higher-contrast selected state, SYSTEM-badge tooltip, Role Name required + inline error, one-input-per-row. **Marker-as-image** (`marker_image_url` on roles/teams/rayons/regions/areas; migration `17491800000000`): shared `MarkerImagePicker` = preseeded gallery (`public/markers/*.svg`) + custom data-URI upload. Verified live.
- 2026-07-11 — Role codes renamed per UAT: `top_management` → `management`, `admin_data` → `admin_rayon` (also usernames + display labels). Codebase-wide sweep + data migration `17491700000000` (relaxes `chk_users_role`, updates `users.role`/usernames, `roles.code`, `activity_types.applicable_roles`). Supersedes ADR-033's naming stance. Applied to demo + staging seeders.
- 2026-07-10 — Backend landed (Phase 1): `rbac` module — Role/Permission/role_permissions tables + migration, permission catalog + wildcard matcher, `RolePermissionsService` (Redis), `@RequirePermissions`/`PermissionsGuard`, roles/permissions CRUD API, idempotent seeds (9 system roles). Existing `@Roles` endpoints untouched. Web role-management page + endpoint migration still pending.
- 2026-07-10 — Spec created for UAT dynamic-RBAC revamp (ADR-044). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
