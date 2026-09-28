# ADR-063: Unified Assignment Policy — Per-Role Places and Teams per Shift

## Status

Active · amends [ADR-053](./ADR-053-schedule-row-per-place.md) (multiple rows per shift are allowed, but now capped per role) · uses the role limits from the [ADR-044](./ADR-044-dynamic-rbac.md) amendment (2026-09-26)

## Context

UAT (2026-09-26):
- A **korlap** must be assignable to several places in the same shift, and a korlap
  assigned individually must still be assignable to a team.
- **satgas/linmas** must stay limited to one place per shift, but may *additionally*
  be in **one team** in that shift, at the same or a different place.

Four write paths disagreed:

| Path | Old behaviour |
|---|---|
| Manual add (`addForDay`) | Blocked only the same place, so a satgas *could* be at two places |
| Event create | Blocked any same-shift row, so individual + team was impossible |
| Event update | Not checked at all |
| Materializer | **Silently skipped** any other row in the shift |

On top of that, the DB key `(user, date, shift, place)` made individual + team at the
same place impossible.

## Decision

**The rule** (pure: `schedules/policy/assignment-policy.ts`). For one person, one day
and one shift:
- **Individual** rows (a manual row or an individual event): distinct places ≤
  `roles.max_places_per_shift`.
- **Team** rows (a membership of a team event): distinct team events ≤
  `roles.max_teams_per_shift`.
- The two kinds never block each other. "Alone at A + with the team at B" (or at A) is
  the intended case.
- An exact repeat (same place as an individual, or the same team) is a **duplicate**
  for every role.
- `NULL` = unlimited.
- Seeded limits: satgas/linmas 1 place + 1 team; korlap, and every other role, unlimited.
- Operators can change the limits per role on Hak Akses.

**One enforcer:** `AssignmentPolicyService` runs one batched query per request (rows
plus role limits). It is used by manual add, the row edits (`updateAreas`,
`updateShift`, excluding the row being edited), event create, and event update (both
series and this-and-future, excluding the old series' rows). All of these **refuse with
409** and a code: `SCHEDULE_DUPLICATE`, `SCHEDULE_PLACE_LIMIT` or `SCHEDULE_TEAM_LIMIT`.
The response names who and when in `details.violations`, and the web shows it.

The materializer uses the same check. It skips the affected person and date with
`reason: 'policy'` instead of silently reporting `exists`. The policy is a **required**
dependency everywhere, so it can never be quietly absent.

**DB key** (migration `17546`): `(user, date, shift, place, team event or nil)`. Team
rows are the ones carrying `team_category_id` (team events require one). This allows
individual + team at the same place, and a korlap in two teams, while exact duplicates
stay impossible at the DB level.

**Unchanged:**
- Replacing a worker still requires the stand-in to be free all day (stricter than the policy).
- Monitoring reassign edits an existing row.
- Overlapping *different* shifts still only warn (ADR-047).

## Consequences

**Positive**
- The same answer on every path; the calendar can't promise an assignment the roster later refuses.
- Rules are data (role columns), so custom roles are covered.
- The error message says exactly who and when.

**Negative / accepted**
- A person with individual + team rows in one shift has two expected places. Attendance
  and monitoring must count them once, at the place they are actually at. That is
  handled by the monitoring effective-placement change (next).
- Event checks look ahead only as far as the materialization horizon. Later occurrences
  are re-checked when they materialize and are reported as `policy` skips.
