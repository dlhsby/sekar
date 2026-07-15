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
- 2026-07-15 — **Kategori Tim CRUD aligned with the other master-data grids.** Three fixes: (1) **Deactivated categories were invisible** — `listTypes` is active-only by default *on purpose* (pickers must not offer a retired category), but the management grid never passed `include_inactive`, so a deactivated category vanished from the only page that could bring it back. `useTeamCategories(enabled, includeInactive)` now takes an opt-in and only the catalog page sets it; every scheduling picker keeps the active-only default. The list query key is parameterized by `includeInactive`, so CRUD invalidation widened to the `team-categories` prefix or the grid would go stale after a mutation. (2) Status renders the shared **`StatusPill`** (`tone="ok"`/`"neutral"` + dot) instead of a bare `Badge`, and gains the **`filterVariant: 'enum'`** Aktif/Nonaktif filter the users/lokasi grids already had. (3) The in-form **"Kategori aktif" checkbox → a `Power` rowAction** (`Aktifkan`/`Nonaktifkan`), matching users/lokasi whose forms carry no `is_active` at all; an edit no longer sends `is_active`, so saving the form can't silently revert a deactivation. i18n id/en `actionActivate/actionDeactivate/successActivated/successDeactivated`; dropped the now-dead `form.activeLabel`.
- 2026-07-13 — **Rename "team type" → "team category" (UI: "Kategori Tim").** Terminology sweep across DB/code/UI: table `team_types` → `team_categories`, columns `team_type_id` → `team_category_id`, endpoint `/team-types` → `/team-categories`, entity `TeamType` → `TeamCategory` (additive rename migration `17494000000000`; no data loss, FKs preserved). Dropped dead `Team`/`CreateTeamDto`/`TeamFormModal` remnants left over from the type-only refactor.
- 2026-07-13 — **Teams become type-only (user decision).** `teams` table dropped; `/teams` page now manages `team_categories` (name, marker image, bubble `marker_color`, active). A concrete team is created in the Jadwal calendar: event `title` = team name, `team_category_id` = category/marker, PIC + members = roster. Roster occurrences carry `team_category_id` for Phase 5 bubbles. Migration `17492800000000`.
- 2026-07-12 — **Team schedules landed (Phase 4, ADR-047).** Team `ScheduleEvent`s (PIC + invited members via `schedule_event_members`) fan out to per-member roster occurrences carrying `team_id`; already-booked members are reported per-member (`materialization.skipped[]`), the rest still schedule. Membership stays schedule-driven — no permanent member table. Team-category management UI still API-only (deferred).
- 2026-07-12 — **Phase 3 review hardening.** Team names are **unique (case-insensitive)** — enforced in the service on create/rename; duplicate team-category names return a friendly 409 (was a raw 500 from the DB constraint); `GET /team-categories` returns **active types only by default** (`?include_inactive=true` for catalog-management views — form dropdowns no longer offer deactivated types); `kepala_rayon`/`admin_rayon` gain the missing `team:delete` grant (they could create/update but not delete). **Note:** the team-category *management UI* is not built yet — types are managed via the API (`team:manage`); UI ships with Phase 4 (team schedules).
- 2026-07-12 — **Phase 0–3 verification pass.** Fixed stale `marker_color` reference (teams are image-only markers: `marker_icon` + `marker_image_url`) in ADR-048 + this spec.
- 2026-07-12 — **Area→Location terminology sweep.** Team scope description now uses `location_id` (static) / `region_id` (mobile).
- 2026-07-11 — Removed team `marker_color` (image-only markers); team default marker + `marker_image_url` seeded. Migration `17491900000000`.
- 2026-07-11 — Marker-as-image: `teams.marker_image_url` + `MarkerImagePicker` (preseeded gallery + custom upload) in the team form; marker section switched to one-input-per-row. Migration `17491800000000`.
- 2026-07-10 — Phase 3 landed: `teams` + `team_categories` catalog (migration + seeds), `TeamsService` + CRUD API (`/teams` team:*, `/team-categories` team:read/manage), web `/teams` page + `MapStyleFields`-style marker. Verified live. Membership (team schedules) is Phase 4.
- 2026-07-10 — Spec created for UAT teams introduction (ADR-048). History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
