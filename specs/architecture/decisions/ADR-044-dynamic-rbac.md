# ADR-044: Dynamic RBAC — Data-Driven Roles, Permissions, and Monitoring Scope

## Status

Accepted — **Amends [ADR-009](./ADR-009-phase2c-role-system-overhaul.md), [ADR-032](./ADR-032-admin-data-disposition-authority-pruning-requests.md), [ADR-033](./ADR-033-staff-kecamatan-role.md)** (static role enum → data-driven roles)

## Date

2026-07-10

## Context

UAT feedback asks for a **dedicated role-management page**: create roles, assign granular permissions, and set each role's monitoring scope and map marker. Today roles are a hard-coded `UserRole` enum wired into ~40+ `@Roles(UserRole.X)` guards plus hand-maintained arrays in `apps/be/src/modules/users/constants/role-groups.ts` (`USER_MANAGERS`, `MONITORING_ROLES`, `ROSTER_EDITORS`, …). There is no permission table; scope is inferred by `roleAssignmentScope()` on web. Adding or re-scoping a role means a code change + deploy.

The client wants operators (admin_system/superadmin) to manage roles and permissions at runtime, and to define per-role **monitoring scope** and a **map marker**. This must not force a big-bang rewrite of every guard, and staging must stay green throughout.

## Decision

Introduce a data-driven RBAC layer in a new backend module `apps/be/src/modules/rbac/`, migrating the static enum to role rows without changing the JWT contract or breaking existing endpoints.

### Data model

Three new tables:

- **`roles`** — `id`, `code` (unique, immutable, lowercase), `name` (display label, editable), `description`, `is_system` (locks the seeded roles from structural edits/delete), `monitoring_scope` (`city|district|region|location|none`), `marker_icon`, `marker_color` (hex, check-constrained), audit + soft-delete columns.
- **`permissions`** — `id`, `key` (unique, immutable, colon-separated **`resource:action`**), `description`. **No grouping column** — categorization is presentation-layer only, from a code-side catalog.
- **`role_permissions`** — M:N join (`role_id`, `permission_id`, composite PK).

**`users.role` stays a string `code`** referencing `roles.code` (no FK migration on `users`, no JWT change): ~40+ existing `@Roles(UserRole.X)` guards and the JWT already carry the role code, and a stable code is what makes the incremental compat-shim migration possible. `monitoring_scope` + marker live on the role because UAT explicitly requires per-role monitoring scope and a map marker.

### Roles seeded as `is_system`

The 9 current roles are seeded and locked. Codes are **unchanged** (used in JWT + guards); only display labels and permission sets may change:

| code | label | monitoring_scope | notes |
|---|---|---|---|
| `superadmin` | Superadmin | city | all permissions |
| `admin_system` | Admin Sistem | city | manage roles/permissions/settings/master-data |
| `top_management` | **Management** | city | read-all across the city; no system-settings edit |
| `kepala_rayon` | Kepala Rayon | district | manage user+area data in own rayon; clockable |
| `admin_data` | **Admin Rayon** | district | **equalized to kepala_rayon** (was pruning-only) |
| `korlap` | Korlap | region | monitor own region/location; no data management |
| `satgas` | Satgas | none | field worker; scheduled; no monitoring |
| `linmas` | Linmas | none | security; scheduled; no monitoring |
| `staff_kecamatan` | Staff Kecamatan | none | external pruning intake (ADR-033) |

**`admin_rayon` is a display label, not a new role code.** ADR-033 rejected a distinct `admin_rayon` role; that decision stands at the schema level. The DLH org chart calls this persona "Admin Rayon", so `roles.name` = "Admin Rayon" while `roles.code` remains `admin_data`. UAT **equalizes** its access to `kepala_rayon`: both get district scope and the same base permissions (manage users/areas in their own rayon, review pruning-requests scoped by rayon). This is a *widening* of `admin_data`, not a narrowing — it **keeps** ADR-032's pruning-request disposition and **adds** the user/area-management parity; the two roles are now identical in scope + base permission set.

**Code vs label discipline:** backend guards, JWT, `@Roles`, API request/response payloads, and permission checks always use the role **code** (e.g. `admin_data`); the **label** ("Admin Rayon") is UI-only, read from `roles.name`. Never put a label in a code position or vice-versa.

### System-role permission seeds

Seeded `role_permissions` for the locked roles (custom roles start empty). Wildcards expand at check time:

| code | granted keys (summary) |
|---|---|
| `superadmin` | `*:*` |
| `admin_system` | `*:*` **except** none — full incl. `role:*`, `permission:*`, `settings:manage`, all master-data |
| `top_management` (Management) | `*:read`, `monitoring:read`, `report:*`, **`settings:read`** (no `settings:manage`), `user:read`, `role:read` — read-broad, **no system-settings writes, no role/permission edits** |
| `kepala_rayon` | `monitoring:read`, `user:{read,create,update}`, `area:*`, `region:read`, `schedule:*`, `team:*`, `task:verify`, `overtime:approve`, `pruning-request:{read,review}`, `activity:read` — all rayon-scoped |
| `admin_data` (Admin Rayon) | **identical to `kepala_rayon`** |
| `korlap` | `monitoring:read`, `schedule:{read,create,update}`, `team:read`, `activity:approve`, `task:{read,assign}`, `overtime:submit` — region-scoped, **no `user:*`/`area:*` management** |
| `satgas` / `linmas` | `activity:create`, `task:read`, `overtime:submit`, `schedule:read` (own) — **no `monitoring:*`** |
| `staff_kecamatan` | `pruning-request:{submit,read}` (own) — external (ADR-033) |

`settings:read` gates `GET` system-settings; `settings:manage` gates `PATCH`/`DELETE`. Management holds only `settings:read` → the API rejects any settings mutation, satisfying "Management cannot change system settings".

### Seeding strategy

A TypeORM migration creates the tables; an **idempotent seed** (upsert on `permissions.key` and `roles.code`, then reconcile `role_permissions`) runs on deploy/bootstrap. Re-running never duplicates or clobbers operator edits to custom roles; only `is_system` roles' base sets are reconciled. The seed lives in `apps/be/src/modules/rbac/seeds/` and is safe to run repeatedly in every environment.

### Marker & styling constraints

`marker_color` (and the geography styling colors in [ADR-045](./ADR-045-four-level-location-hierarchy.md)) validate against `^#[0-9A-Fa-f]{6}$`. `marker_icon` is a value from a curated icon set (a named enum in the shared design-system tokens, not free-form) so web + mobile render the same glyph. Every seeded role ships a sensible default icon+color; custom roles require both.

### Permission catalog

Flat `resource:action` keys, defined in a code-side catalog that also carries the UI grouping taxonomy (Category → Resource → actions) and Indonesian action/resource labels. ~80–100 keys, e.g.:

`user:{read,create,update,delete}` · `role:{read,create,update,delete}` · `permission:read` · `rayon:*` · `region:*` · `area:*` · `team:*` · `schedule:{read,create,update,delete}` · `monitoring:read` · `monitoring:reassign` · `monitoring:config` · `settings:read` · `settings:manage` · `pruning-request:*` · `activity:*` · `task:*` · `overtime:*`.

**Monitoring visibility is NOT encoded as separate per-tier permissions.** A single `monitoring:read` grants access; **how much** is seen (city / district / region / location) is narrowed by the caller's `role.monitoring_scope` + assignment. This keeps the catalog flat and avoids a permission-per-tier explosion.

**Wildcard support:** seeds may grant `*:*` (superadmin), `resource:*` (all actions on a resource), or `*:action`. The permission matcher expands/compares wildcards at check time (`hasPermission`, `hasAllPermissions`). Catalog seeded idempotently (upsert on `key`).

### Guards & incremental migration

- New global `PermissionsGuard` + **`@RequirePermissions(...keys)`** decorator (AND semantics; a `RequireAnyPermission` variant for OR). A wildcard-aware permission matcher (`permissionMatches`/`hasPermission`/`hasAllPermissions`) is shared by backend guard and the web `usePermissions()` hook.
- **`RolesCompatGuard`** resolves existing `@Roles(UserRole.X)` decorators to permissions via the `roles` table, so all current endpoints keep working unchanged. Endpoints migrate to `@RequirePermissions` incrementally; the old `roles.guard.ts` is retained for rollback.
- `RolePermissionsService` resolves a role's permission keys with **Redis caching** (key `rbac:role:{roleCode}:permissions`, ~300s TTL), invalidated when a role's permissions change; graceful re-query on cache miss. Reuses the existing Redis/cache layer (ADR-016).
- **Web:** a `usePermissions()` hook exposes `can(key)` / `canAny([])` / `canAll([])` for nav/button gating (UX only; server authoritative), mirroring the backend matcher including wildcards.

### Role management UI

Left rail = role list (name + "N permissions · M users" badge). Right pane = a **three-level accordion**: Category → Resource → individual permission toggles, with select-all + indeterminate checkboxes at the category/resource levels and a per-role Save. Create/rename via a name dialog. The role editor also carries a **scope selector** (`monitoring_scope`) and a **marker picker** (icon + color). `is_system` roles allow permission/label/scope/marker edits but block rename-of-code and delete.

### Monitoring scope & enforcement

`roles.monitoring_scope` is the single source of truth for "what can this role see" and "which scope inputs appear on the user form". Enforcement is **two-layered and both must pass**: `@RequirePermissions('monitoring:read')` (does the role have the capability?) **then** a reusable scope check (may the caller see *this* resource?). The scope check is a shared helper — `canViewRayon/Region/Area(id)` returning boolean (services throw `ForbiddenException` on false) — derived from `monitoring_scope` + the caller's `rayon_id`/`region_id`/assigned area(s). It replaces today's inline `enforceScopeRayon` and is applied uniformly to monitoring, user-list, and schedule queries (filter for lists, guard for detail).

**Scope tiers → assignment fields:** `city` = no binding (sees all); `district` = `rayon_id`; `region` = `rayon_id` + `region_id` (korlap may optionally narrow to a single location `area_id` within that region — location is optional); `location`/`none` per role. `users.region_id` is added (nullable) for `korlap` (see [ADR-045](./ADR-045-four-level-location-hierarchy.md)); korlap's optional single location reuses `area_id` (the legacy multi-area `user_areas` is not used for korlap under the new model).

### Endpoint-migration matrix test

A living test at `apps/be/src/modules/rbac/__tests__/role-endpoint-matrix.spec.ts` enumerates every guarded endpoint × all 9 system roles and asserts the expected allow/deny, plus whether each endpoint is still on `@Roles` (via compat shim) or migrated to `@RequirePermissions`. It runs in CI before/after each endpoint's migration so a conversion that changes effective access fails loudly; it doubles as the human-readable audit of migration progress.

## Consequences

### Positive
- Roles/permissions are runtime-editable; new roles need no deploy.
- One source of truth for monitoring scope drives both authorization and the user-form inputs.
- Compat shim → no big-bang; staging stays green; endpoint migration is incremental and reversible.
- JWT unchanged; mobile unaffected in phase 1.

### Negative
- Every `@Roles(...)` guard is in scope for eventual migration; tracked by a role×endpoint matrix test.
- Cache invalidation adds moving parts; short TTL bounds staleness after a permission edit.
- `is_system` roles need guard logic to prevent structural edits/deletion.

### Security
- Least-privilege via granular permissions; `superadmin`/`admin_system` gate `roles.*`/`permissions.*`.
- A permission edit takes effect within the cache TTL; sensitive changes should force-invalidate.
- Role-matrix integration test asserts expected allow/deny across all roles × endpoints before/after each endpoint migration.

## Alternatives Considered
1. **Fixed enum + config layer** (scope/marker/curated toggles only, no custom roles). Rejected — client explicitly wants to create arbitrary roles.
2. **FK `users.role_id` → roles.id.** Rejected for phase 1 — forces a `users` migration + JWT change; string code is sufficient and back-compatible.
3. **Big-bang guard rewrite.** Rejected — high risk; the compat shim delivers the same end state incrementally.

## References
- [ADR-009](./ADR-009-phase2c-role-system-overhaul.md) — original role system (amended here)
- [ADR-032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) — admin_data pruning disposition (retained; scope widened to kepala_rayon parity here)
- [ADR-033](./ADR-033-staff-kecamatan-role.md) — "no admin_rayon role" (upheld at schema level)
- [ADR-016](./ADR-016-redis-websocket-scaling.md) — Redis caching reused for permissions
- [ADR-045](./ADR-045-four-level-location-hierarchy.md) — `users.region_id` + scope tiers
- Feature spec: `../../features/access-control/README.md`
