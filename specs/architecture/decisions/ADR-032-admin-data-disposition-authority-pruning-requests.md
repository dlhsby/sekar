# ADR-032: Extend `admin_data` with Disposition Authority over `pruning_requests`, Scoped by `users.rayon_id`

## Status

Accepted — **Amends [ADR-009](./ADR-009-phase2c-role-system-overhaul.md)** · **Amended May 2026 by [ADR-038](./ADR-038-pruning-workflow-entry-points.md)**

> **Amendment (May 2026):** ADR-038 formalizes the disposition chain `top_management → kepala_rayon → admin_data → korlap → satgas` as a fully-audited delegation flow. Every hop on `POST /tasks/:id/assign` (and on `/convert-to-task`) writes a row to `task_delegations`; the assignee mid-flight may delegate further while the task is still in `assigned` status, without forcing a fake decline. `admin_data`'s authority described below is one slice of that broader chain — the role gate has not changed, but the audit trail and mid-flight hand-off were not contemplated when this ADR was written.

## Date

2026-04-24

## Context

Phase 3 introduces public pruning intake via kecamatan (sub-district) staff (ADR-033). Each submitted `pruning_requests` row needs a rayon-level reviewer who can:

1. Triage the submission (approve / reject / request more info)
2. Resolve its `rayon_id` (often inferable from address/GPS, sometimes manual)
3. Convert an approved request into a `tasks` row with `task_type='pruning'` (ADR-031)
4. Relay the outcome back to the submitting kecamatan staff

A natural instinct was to introduce a new `admin_rayon` role. The client rejected this: they don't want another role to administer, and the existing `admin_data` role is already rayon-scoped via `users.rayon_id` (ADR-013 — multi-area assignment + rayon binding).

Current state (evidence):

- **`admin_data` is rayon-scoped**: `users.rayon_id` already binds `admin_data` users to a single rayon; `MONITORING_RAYON` permission group (`be/src/modules/users/constants/role-groups.ts`) grants rayon-level monitoring visibility.
- **`admin_data` has no approval authority today**: ADR-009 explicitly excludes `admin_data` from `OVERTIME_APPROVERS` and similar decision groups. It is a data-entry role.
- **`kepala_rayon` is executive**, not operational. Filtering the daily inbox of kecamatan requests does not match its remit.
- **`top_management` is city-wide**, not rayon-scoped. It should see the pipeline but not triage every request.

The decision is: narrowly extend `admin_data` with one new capability, scoped to one entity, or create a role.

## Decision

Grant `admin_data` **disposition authority over `pruning_requests` only**, scoped to requests whose resolved `rayon_id` matches the acting user's `users.rayon_id`. No new role. No other capability changes.

### Implementation

**New permission constant** (`be/src/modules/users/constants/role-groups.ts`):

```ts
export const PRUNING_REQUEST_REVIEWERS = ['admin_data', 'top_management'] as const;
```

**New guard** (`be/src/modules/pruning-requests/guards/rayon-scope.guard.ts`):

```ts
// Enforces: acting_user.rayon_id === pruning_request.rayon_id
// Exception: top_management bypasses the rayon check (city-wide)
// Used on: POST /pruning-requests/:id/review, POST /pruning-requests/:id/convert-to-task
```

**Endpoints affected** (see `specs/api/contracts.md`):

- `POST /api/v1/pruning-requests/:id/review` — `@Roles(...PRUNING_REQUEST_REVIEWERS)` + `RayonScopeGuard`
- `POST /api/v1/pruning-requests/:id/convert-to-task` — same

### Explicit non-changes

`admin_data` **does not gain**:

- Overtime approval (`OVERTIME_APPROVERS` unchanged — `korlap` / `kepala_rayon`)
- User management beyond current data-entry scope
- System settings, rate-limit config, role management
- Cross-rayon visibility of anything other than the already-shared catalogs (species, monitoring thresholds)

### Rayon resolution on intake

When a kecamatan staff member submits a request, `rayon_id` is **nullable until reviewed**. The review endpoint (triaged by the reviewer themselves) is where `rayon_id` is resolved — either by GPS-lookup against rayon boundaries (RayonBoundaryService) or by manual selection. If the auto-resolved rayon does not match the reviewer's own `rayon_id`, the guard rejects the review. `top_management` can always intervene to reassign.

## Consequences

### Positive

- **No role inflation.** The 8-role system (ADR-009) stays intact on the internal side. Only `staff_kecamatan` (ADR-033) is new, and that's externally justified.
- **Reuses existing scoping.** `users.rayon_id` (ADR-013) + `RayonScopeGuard` is the same pattern already used for monitoring, overtime viewing, and subordinate filters.
- **Narrow blast radius.** One entity, one pair of endpoints, one permission constant. Easy to audit and easy to revert if the policy proves wrong.
- **Matches operational reality.** `admin_data` staff already work at rayon level, already handle daily data tasks. Triaging kecamatan requests is a natural extension of that work.
- **`top_management` inclusion** handles edge cases (cross-rayon reassignment, escalation) without requiring a separate escalation role.

### Negative

- **Subtle dual-capability.** `admin_data` now has both data-entry and disposition rights, but only for `pruning_requests`. This is a genuine deviation from ADR-009's "clean separation" principle. Mitigation: this ADR is the sole exception; any future extension of `admin_data`'s approval surface requires a new ADR.
- **Role audits must be explicit.** Every `@Roles(...)` decorator should be reviewed when `PRUNING_REQUEST_REVIEWERS` changes. A unit test enumerates all uses of the constant.
- **Onboarding surface.** New engineers reading ADR-009 might miss this extension. Cross-linking is mandatory: ADR-009 gets an amendment note pointing here.

## Alternatives Considered

1. **New `admin_rayon` role.** Rejected by the client. Adds administrative overhead (hire/train/offboard another role) and duplicates ~90% of `admin_data`'s capabilities.
2. **Extend `kepala_rayon`.** Rejected. `kepala_rayon` is an executive/oversight role, not an operational triage role. Day-to-day request-handling misfits its remit and clutters its dashboard.
3. **Grant approval to `korlap`.** Rejected. `korlap` is a field coordinator; they approve overtime and assign field work, but kecamatan intake is an administrative flow, not a field flow.
4. **City-wide `admin_data` disposition without rayon scoping.** Rejected. Surabaya's 7 rayons have distinct operational owners; city-wide authority concentrates risk and breaks the rayon-autonomy model established in ADR-013.
5. **Separate disposition role like `pruning_triage`.** Rejected as over-granular. One-entity roles multiply without bound; the registry pattern (per-entity permission constants) solves the same problem with less organizational overhead.

## References

- [ADR-009](./ADR-009-phase2c-role-system-overhaul.md) — 8-role system; amended by this ADR to note the `admin_data` extension
- [ADR-013](./ADR-013-multi-area-assignment.md) — `users.rayon_id` scoping reused here
- [ADR-033](./ADR-033-staff-kecamatan-role.md) — the counterparty role that submits requests for `admin_data` to review
- [ADR-031](./ADR-031-task-typing-and-custom-fields.md) — the converted task carries `task_type='pruning'`
- [ADR-038](./ADR-038-pruning-workflow-entry-points.md) — `admin_data`'s disposition endpoint is one of five pruning entry points; converted tasks emit a `task_delegations` audit row on every assignment
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- API contracts: `../../api/contracts.md`
- Security: `../security.md`

## 2026-05-01 amendment — delegation chain after disposition (ADR-038)

`admin_data` disposition (`POST /pruning-requests/:id/review` + `POST /pruning-requests/:id/convert-to-task`) remains rayon-scoped per the rules above. Once the request converts into a task, the onward path **may pass through several roles before execution** — typical chain is `top_management → kepala_rayon → admin_data → korlap → satgas`, but any role in the hierarchy can be skipped. Every assignment write — initial conversion *and* every subsequent reroute — emits a `task_delegations` audit row (see ADR-038). The disposition endpoint itself is unchanged; the audit trail becomes visible via `GET /tasks/:id/delegation-history`.
