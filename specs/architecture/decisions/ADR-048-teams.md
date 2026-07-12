# ADR-048: Teams — Grouped Monitoring Subjects with Typed Markers

## Status

Accepted — **New** (relates to [ADR-047](./ADR-047-schedule-redesign.md), [ADR-046](./ADR-046-monitoring-subject-model.md))

## Date

2026-07-10

## Context

Field work is often organized as crews — perawatan (maintenance), penyiraman (watering), penanaman (planting), penyapuan (sweeping), etc. UAT wants to **create a team, schedule it as a unit, and monitor it as one group bubble** on the map that drills down to individual members. There is no team concept in the codebase today; workers are grouped only implicitly by rayon + assigned locations.

## Decision

Introduce a lightweight `teams` master-data entity plus a team-type catalog, with membership expressed through **team schedules** ([ADR-047](./ADR-047-schedule-redesign.md)) rather than a standing roster.

### `teams` + `team_types` entities

- **`team_types`** — a small catalog table (`id`, `name`, `is_active`), seeded with perawatan / penyiraman / penanaman / penyapuan and **extensible via a Teams → Type management UI** (no code change to add a type). Gated by `team:manage`.
- **`teams`** — `id`, `name`, `team_type_id` (FK), `marker_icon`, `marker_image_url` (image-only markers; `marker_color` removed), `is_active`, audit. Managed via a Teams CRUD page gated by `team:*` permissions.

### Membership via schedules

A team has **no permanent member list**. Membership is per-schedule: a team `ScheduleEvent` names a **PIC** (`pic_user_id`, **required** — a korlap or satgas/linmas) and **invited members** (korlap/satgas/linmas); fan-out materializes an occurrence per member for the scheduled day(s). This keeps teams flexible (different members per day) and avoids a second source of truth for "who is on this team".

**Member scope:** the invite picker is filtered to eligible roles **within the PIC's rayon** — all members of a given team schedule belong to the same rayon (matching the region/location the event is scoped to). Cross-rayon teams are not allowed.

### Monitoring rendering

When members of the same team schedule are active, monitoring renders them as **one group bubble** using the team's marker; clicking/zooming expands to individual member markers ([ADR-046](./ADR-046-monitoring-subject-model.md)). Search matches team name/keyword.

### Scope

A team schedule is **static** (all members share a `location_id`) or **mobile** (share a `region_id`), per the event's scope. Mobile teams (e.g. penyiraman) are geofenced to the region.

## Consequences

### Positive
- Crews are first-class for scheduling and monitoring; less map clutter via group bubbles.
- Team type + marker are operator-defined; new crew types need no code change.
- No standing-membership table to drift out of sync — membership lives with the schedule.

### Negative
- "Team" exists only through schedules; a team with no schedule is inert (acceptable, matches ops).
- Group-bubble aggregation adds monitoring rendering logic.

### Security
- `teams.*` permissions gate CRUD; team invites restricted to eligible roles.

## Alternatives Considered
1. **Permanent team membership table.** Rejected — crews change daily; standing membership would drift and duplicate scheduling truth.
2. **Derive teams implicitly from shared area+shift.** Rejected — can't express distinct crew types or a PIC, and no stable marker.

## References
- [ADR-047](./ADR-047-schedule-redesign.md) — team schedules + fan-out
- [ADR-046](./ADR-046-monitoring-subject-model.md) — team group bubbles, static/mobile
- Feature spec: `../../features/teams/README.md`
