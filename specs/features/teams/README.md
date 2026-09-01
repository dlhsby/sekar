# Teams

**Status:** ✅ Active — **type-only catalog** (`team_categories` + marker/bubble colour, managed at `/teams`); the concrete team (name/PIC/members/when/where) is a team `ScheduleEvent` (ADR-048 amended 2026-07-13) · **Backend:** `teams` (types), `schedules` · **Key ADRs:** ADR-048, ADR-047

## Overview
Crews (perawatan, penyiraman, penanaman, penyapuan, …) as first-class, typed entities with their own map marker. A team is created in a Teams CRUD page; **membership is per-schedule** (no standing roster) via a team schedule with a PIC + invited members. Monitoring renders an active team as one **group bubble** that expands to individual members.

## Key decisions
- **Teams as master data** (ADR-048) — `teams(name, team_category_id, marker_icon, marker_image_url)` + a `team_categories` catalog table (perawatan/penyiraman/penanaman/penyapuan, seeded, **extensible via a Type-management UI**).
- **Membership via schedules** (ADR-047) — no permanent member table; **PIC required** (korlap or satgas/linmas) + invited members per team `ScheduleEvent`, fanned out to per-member occurrences. Members are within the PIC's rayon (no cross-rayon teams).
- **Static or mobile scope** — team members share a `location_id` (static) or `region_id` (mobile, e.g. penyiraman).
- **Group bubble** in monitoring (ADR-046) using the team marker; search matches team name/keyword.

## Implementation
- **API:** teams CRUD + team-category catalog — [`../../api/contracts.md`](../../api/contracts.md)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** Teams page (CRUD + marker), team option in the schedule calendar — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)

## Related features
- [scheduling](../scheduling/README.md) · [monitoring](../monitoring/README.md) · [geography](../geography/README.md)

## Changelog

Moved to [CHANGELOG.md](./CHANGELOG.md) (newest first) to keep this overview short. Add new entries there.
