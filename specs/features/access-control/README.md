# Access Control (Roles & Permissions)

**Status:** ✅ Phase 1 landed (dynamic roles/permissions, role management, settings gating) · guard→permission endpoint migration **deferred** (see below) · **Backend:** `rbac`, `auth` · **Key ADRs:** ADR-044 (dynamic RBAC), ADR-009 (original roles)

## Overview
Data-driven RBAC: roles and permissions are database rows managed at runtime from a **role-management page**. Permissions are flat **`resource:action`** keys (grouping is presentation-layer via a code-side catalog); each role also has a **monitoring scope** (`city|district|region|location|none`) and a map **marker** (icon + color). Replaces the static `UserRole` enum + hand-maintained role-group arrays. `users.role` stays a string code referencing `roles.code`; JWT is unchanged.

## Key decisions
- **Dynamic RBAC** (ADR-044) — `roles` / `permissions` / `role_permissions` tables; 9 seeded `is_system` roles (codes unchanged), plus operator-created custom roles.
- **Enforcement** — global `PermissionsGuard` + `@RequirePermissions(...keys)` (AND semantics) with **wildcard** support (`*:*`, `resource:*`); a shared matcher powers the web `usePermissions()` hook. Role permissions cached in Redis (`rbac:role:{code}:permissions`, ~300s TTL), invalidated on change.
- **Incremental guard migration** — legacy `@Roles()`+`RolesGuard` endpoints keep working unchanged alongside the new global `PermissionsGuard` (no-op without `@RequirePermissions` metadata); endpoints migrate to `@RequirePermissions` incrementally (deferred — see below). The ADR-044 `RolesCompatGuard` shim was **not built**; the chosen strategy is a unified pass-on-either guard applied during the migration pass.
- **Monitoring scope on the role** is the single source of truth for visibility + which user-form scope inputs appear. `monitoring:read` grants access; scope narrows *how much* is seen (no per-tier permissions).
- **Role editor** = 3-level accordion (Category → Resource → permission toggles) + scope selector + marker picker.
- **Role code `admin_rayon`** (renamed from `admin_data`; label "Admin Rayon"), equalized to `kepala_rayon`; the rename supersedes ADR-033's naming stance. `management` is the renamed `top_management`.

## Implementation
- **API:** roles/permissions CRUD, role↔permission mapping — [`../../api/contracts.md`](../../api/contracts.md)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Role management page (permission matrix, scope + marker) — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)

## Related features
- [auth](../auth/README.md) · [users](../users/README.md) · [monitoring](../monitoring/README.md) · [settings](../settings/README.md)

## Guard → permission migration (Phase 5.5 — DEFERRED, revisit during development)

The permission engine works, but only the **rbac + settings** endpoints are gated by
`@RequirePermissions`/`PermissionsGuard`. **~29 controllers / ~155 endpoints still use
legacy `@Roles` + `RolesGuard`** (role-list only, no permission fallback), so a *custom*
role's granted permissions don't unlock them. Completing the migration is deferred and
tracked here so it isn't re-discovered from scratch.

**Why one focused pass (not piecemeal):** a **partial** migration is worse than none —
a custom role would work on some endpoints and 403 on others, unpredictably. All
`@Roles` usages are built from **~25–27 role-group constants** in
`apps/be/src/modules/users/constants/role-groups.ts` (top: `USER_MANAGERS`,
`CLOCKABLE_ROLES`, `MONITORING_AREA`, `ASSET_MANAGERS`, `ANALYTICS_VIEWERS`…), so the
work is bounded by the group set, not per-handler combinations.

**Per endpoint:** replace `@Roles(...GROUP)` with `@RequirePermissions('resource:action')`
where the action is the endpoint's verb (list→`:read`, POST→`:create`, PATCH→`:update`,
DELETE→`:delete`, plus domain verbs like `:approve`/`:verify`/`:assign`), and ensure
**`role-seeds.ts` grants that key to exactly the roles that were in `GROUP`** — the
parity contract. **Parity test:** a data-driven test asserting, for each of the 9
system roles, that endpoint reachability under `@Roles` equals reachability under
`@RequirePermissions` + seeded grants — green before merge.

**Order:** module-by-module (users → locations/rayons/regions → activities/tasks →
monitoring → the rest), each module fully done + parity-green, so custom roles light
up incrementally without breaking system roles. Keep `PermissionsGuard` (global,
no-op without metadata) coexisting with `RolesGuard` throughout.

**Strategy (safety-first, zero system-role regression):** introduce a **unified guard that
passes on `@Roles` OR `@RequirePermissions`**, then add `@RequirePermissions('resource:action')`
to each endpoint while **keeping `@Roles` as a safety net**. The 9 system roles keep passing
via `@Roles` unchanged; custom roles pass via the permission. Retire `@Roles` per-endpoint only
after a role×endpoint matrix test proves the grants are equivalent.

**Pre-work before converting (else regressions):**
- **Add missing permissions to the catalog + system-role grants:** `activity:update`, `task:delete`,
  `overtime:update`/`overtime:delete`, `pruning-request:update`, and whole new resources not yet
  modelled — `shift:*` (clock-in/out; currently implied by `schedule:*`), `asset:*`, `plant:*`,
  `capacity:*`, `import:*`, `area-type:*`, `activity-type:*`, `notification:*`,
  `analytics:*`. (Locations are already covered by the stable `area:*` resource — do not add a
  parallel `location:*`.)
- **Fix grant gaps in `role-seeds.ts`:** `satgas`/`linmas` need `task:read` (+ task state-change) and
  `activity:update`; `staff_kecamatan` needs `task:read` for pruning-linked tasks; verify `overtime:*`
  distribution across the `OVERTIME_*`/`CLOCKABLE_ROLES` groups.
- **Leave service-layer role/scope checks in place** (~20 services, e.g. `monitoring`, `schedules`,
  `activities`, `export`): the guard governs *route access*; services govern *data scope*. These are
  orthogonal and stay.

**Sizing:** 29 controllers, ~155 handlers, 27 role-group constants → 32 (soon ~50) permission keys.
Do it module-by-module, each behind the full backend suite + the access matrix.

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
