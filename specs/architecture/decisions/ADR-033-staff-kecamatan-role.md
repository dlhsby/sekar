# ADR-033: New External Role `staff_kecamatan` for Public Pruning Intake

## Status

Accepted — **Extends [ADR-009](./ADR-009-phase2c-role-system-overhaul.md) role list (8 → 9)**

## Date

2026-04-24

## Context

Public pruning requests today arrive at DLH by paper letter, routed through kecamatan (sub-district) offices. Phase 3 digitizes this intake. The question is: who owns the submission on the app side?

Candidates considered:

- **A new "public citizen" role** — too broad. Individual citizens submitting directly would open an unauthenticated or weakly-authenticated surface with no accountability, high spam risk, and no address verification. The client explicitly does not want this yet.
- **`staff_kecamatan`** — kecamatan staff collect intake at the sub-district office, verify identity and address on paper, then submit into the app. This is the current paper workflow, digitized. Accountability stays at the kecamatan office.
- **Fold into existing roles** — kecamatan staff are external to DLH. They are not satgas, not korlap, not admin_data. No existing role fits.

Role-boundary constraints:

- **No clock-in.** Kecamatan staff do not have shifts, do not clock into a rayon, do not carry GPS trackers in this flow.
- **No monitoring access.** They do not need to see worker positions or rayon staffing.
- **Scope: own submissions only.** They see what they submitted and its outcome, nothing else.
- **One-way visibility into DLH.** They see converted tasks' *results* (photos, completion date), but not DLH's internal assignment/scheduling.

The client also confirmed this is a digitization of a real org boundary. Kecamatan staff are accountable to the kecamatan head, not to DLH.

## Decision

Introduce a ninth role, `staff_kecamatan`, designed as a strictly-external, narrowly-scoped role.

### Role definition

| Property | Value |
|---|---|
| Role key | `staff_kecamatan` |
| Clockable | **No** (excluded from `CLOCKABLE_ROLES`) |
| Rayon binding | None (their own `rayon_id` is NULL; rayon is resolved per-request by `admin_data` on review — ADR-032) |
| Area binding | None |
| Monitoring access | None |
| User management | None |
| Reporting access | None |

### Permissions

| Action | Endpoint | Allowed |
|---|---|---|
| Submit pruning request | `POST /api/v1/pruning-requests` | Yes |
| List own submissions | `GET /api/v1/pruning-requests?mine=true` | Yes (scope: `submitted_by = self`) |
| View own submission result | `GET /api/v1/pruning-requests/:id/result` | Yes (ownership check) |
| Update own draft submission | `PATCH /api/v1/pruning-requests/:id` | Yes, only while `status='submitted'` |
| Cancel own submission | `POST /api/v1/pruning-requests/:id/cancel` | Yes, only before `status='converted'` |
| All other endpoints | — | **Denied** |

### Data model

`staff_kecamatan` users have `role='staff_kecamatan'`, `rayon_id=NULL`, `areas=[]`, and a new optional field on `users` (already present as `metadata`) tagging their `kecamatan_name`. The `pruning_requests.kecamatan_name` column denormalizes this onto each submission for reporting.

### Enforcement

- Extend `users.role` enum to include `staff_kecamatan` (migration; see `apps/be/src/modules/users/enums/role.enum.ts`).
- Add `staff_kecamatan` to a new permission group `PRUNING_REQUEST_SUBMITTERS` used by the submit endpoint.
- **Audit sweep**: every `@Roles(...)` decorator in the codebase must be reviewed for compatibility with the new role. A role-matrix test enumerates all endpoints × all roles and asserts expected allow/deny.
- `AuthService` login flow: `staff_kecamatan` users skip clock-in bootstrapping on the mobile app; they land on a kecamatan-specific home screen (ADR-033 is silent on UX; covered in `specs/mobile/screens.md`).

## Consequences

### Positive

- **Clean separation from DLH internals.** Kecamatan staff cannot accidentally be assigned tasks, clocked in, or surfaced on monitoring maps.
- **Digitizes the existing paper flow.** Minimal operational change; kecamatan continues to be the accountability boundary.
- **Easy to revoke.** If a kecamatan staff member changes jobs, disable their account; no rayon/area/shift cleanup needed.
- **Ownership scope is simple.** `submitted_by = self` is the only filter on their list/detail endpoints. No complex rayon scoping (that's `admin_data`'s problem per ADR-032).
- **Future-proof for citizen-direct intake.** If DLH later wants citizen-direct submission, a new `public_user` role can inherit the `PRUNING_REQUEST_SUBMITTERS` pattern with additional anti-spam constraints (rate limiting, OTP-gated submission).

### Negative

- **Touches every `@Roles(...)` guard.** Each decorator in the codebase must be audited to confirm it correctly excludes `staff_kecamatan`. Mitigation: systematic grep + role-matrix integration test.
- **Role count grew to 9.** ADR-009's "8-role system" docs need an amendment note. Role-education material (ops runbook, onboarding) updates.
- **New auth path for an external persona.** `staff_kecamatan` credentials are issued by DLH ops to kecamatan offices. The issuance process is a manual ops responsibility; documented in the deployment runbook, not automated.
- **Role matrix doubles its edge-case surface area** (9 × N endpoints). Handled by the role-matrix test.

### Security considerations

- Rate-limit `POST /api/v1/pruning-requests` per user (default: 30 submissions/day). Spam by compromised kecamatan accounts is the main abuse vector.
- `staff_kecamatan` cannot see other kecamatan's submissions, cannot see internal DLH assignment, cannot see worker identities. Data-leak surface is minimal by design.
- Photos uploaded via pruning_requests flow through the same S3 pipeline as worker photos (ADR-unspecified but established in Phase 2D).

## Alternatives Considered

1. **Generic "public_user" role for all citizens.** Rejected. The client wants kecamatan-mediated intake first, for accountability and spam control. Citizen-direct is a future option, not this phase.
2. **Fold kecamatan staff into `admin_data`.** Rejected. `admin_data` is internal DLH with rayon scoping; kecamatan staff are external with their own org chart. Mixing them breaks ADR-032's narrow extension and inflates `admin_data` responsibilities.
3. **No dedicated role — ingest via an unauthenticated webhook from a separate kecamatan app.** Rejected. Requires building and maintaining a second app; authentication/accountability end up in a worse place.
4. **Reuse `satgas` role for kecamatan staff.** Rejected. `satgas` is clockable, GPS-tracked, shift-bound, and rayon-scoped. Complete mismatch.

## References

- [ADR-009](./ADR-009-phase2c-role-system-overhaul.md) — role list; extended to 9 here
- [ADR-032](./ADR-032-admin-data-disposition-authority-pruning-requests.md) — counterpart role that reviews kecamatan submissions
- [ADR-031](./ADR-031-task-typing-and-custom-fields.md) — `task_type='pruning'` produced by conversion
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- API contracts: `../../api/contracts.md`
- Security: `../security.md`
