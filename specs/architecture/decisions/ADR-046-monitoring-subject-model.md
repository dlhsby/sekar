# ADR-046: Monitoring Subject Model & Revamp — Monitorable vs Scheduled, Static vs Mobile

## Status

Accepted — **Extends [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md)** (adds the subject model + drill/bubble revamp)

## Date

2026-07-10

## Context

Monitoring today assumes every clocked-in worker is a scheduled subject of a location, and understaffing is `active_count < LocationStaffRequirement.required_count` across all roles. UAT corrects several assumptions:

- **Not everyone is scheduled.** `kepala_rayon`, `admin_rayon`, and `korlap` clock in and should be visible to their supervisors, but they must **not** generate schedules or count toward understaffing.
- **Only `satgas` + `linmas`** are the workforce measured for staffing.
- **Static vs mobile.** Some subjects are location-bound (assigned to a location); others roam a region (e.g. penyiraman truck) and have no fixed location.
- **UI dislikes** the current Surabaya bubble and the active/terjadwal ratio bubbles; keep the drill-down but rework the visuals.
- **Teams** ([ADR-048](./ADR-048-teams.md)) should render as a single group bubble that expands to members.

## Decision

### Subject classification

Two orthogonal properties per monitored person:

1. **Monitorable** — anyone who clocks in and streams location: `satgas`, `linmas`, `korlap`, `kepala_rayon`, `admin_rayon`. They appear on the map/roster **when clocked in**. Their geofence follows their assignment: `satgas`/`linmas`/`korlap` per their schedule occurrence (location or region); `kepala_rayon`/`admin_rayon` are geofenced to their **`rayon_id`** (they have no schedule — their "monitoring area" is the whole rayon).
2. **Scheduled / staffing-counted** — **only `satgas` + `linmas`**. Understaffing, "scheduled", "expected/absent" counts derive exclusively from these two roles. Others are shown but excluded from staffing math.

Subjects with no schedule are **not** rendered by default; they surface only via **daftar petugas** or **search** once they clock in and send location.

### Supervisor (hierarchical) visibility

Independent of the map, a supervisor sees the workers beneath them, enforced by the role's `monitoring_scope` + assignment ([ADR-044](./ADR-044-dynamic-rbac.md)):
- **management** (`city`) → every worker across Surabaya.
- **kepala_rayon / admin_rayon** (`district`) → all workers in **their** `rayon_id` (their korlap, satgas, linmas).
- **korlap** (`region`) → workers within their assigned region (+ optional single location), including their team members.
- **satgas / linmas** (`none`) → no monitoring access.
Every daftar-petugas / search / snapshot query is filtered by this scope server-side; a district role can never see another rayon.

### Static vs mobile

Each subject's scope for the current shift comes from their schedule occurrence (`schedules.scope`):
- **Static** → bound to a `location_id`; geofenced against the location polygon/circle.
- **Mobile** → bound to a `region_id` (Kawasan); geofenced against the region boundary; expected to roam.

Mobile geofencing reuses the **same tolerance** as location geofencing (ADR-010 soft polygon, ADR-005 tolerance) — the only difference is the polygon (region vs location). "Outside-area" for a mobile subject means outside its **region**.

> **Amended 2026-07-16 (phase 5.3) — the status model collapsed 5 → 3.** This ADR
> originally said *"No new status code: status color rings (active / inactive /
> outside-area / missing / offline) are unchanged."* That no longer holds. The five
> statuses are now **three**, with inside/outside promoted to an independent axis:
>
> | was | is |
> |---|---|
> | `active` | `active` — clocked in, fix fresher than `active_max_age_sec` |
> | `inactive` (idle) | `offline` |
> | `missing` | `offline` |
> | `outside_area` | **not a status** — an axis (`is_within_area`) shown *alongside* active/offline |
> | `offline` (*not clocked in*) | `absent` — reads as *tidak hadir* where a schedule exists |
>
> **`offline` inverted meaning**: it meant *not clocked in*, and now means *clocked in
> but unreachable*. Because `outside_area` now **overlaps** active/offline instead of
> partitioning them, it must never be summed into a headcount.
>
> Consequences: `monitoring.inactive_threshold_sec` and `monitoring.missing_threshold_sec`
> are retired (nothing could reach them once idle and missing both fold into offline);
> `monitoring.active_max_age_sec` is the single surviving boundary. Staffing counts
> whoever **clocked in** (active + offline) — a park is no less staffed because a phone
> lost signal. A monitorable-but-unscheduled worker stores `absent` and is simply not
> rendered; if that ever needs its own value, use `off_duty` (*tidak bertugas*), since
> `absent` is an accusation and `off_duty` is neutral.

**Visibility per drill level** (which subjects render at each tier):
- **Rayon** → all monitorable workers in the rayon (static + mobile).
- **Region** → mobile subjects with this `region_id` **plus** static subjects whose location sits under this region.
- **Location** → static subjects bound to this `location_id`. (Mobile subjects are not pinned to a location; they show at region level.)

### Drill & bubbles

- **Remove the Surabaya-level bubble.** On first load, draw **all rayon boundaries immediately** with a per-rayon bubble + hover stats; do **not** render workers at the top level.
- Drill: **Rayon → Region → Location → workers**; workers render only at deeper zoom.
- **Team schedules render as one group bubble** (team marker from [ADR-048](./ADR-048-teams.md)) that expands to individual members on click/zoom.
- **Bubble content** (replaces the disliked active/terjadwal ratio): a marker + **active worker count** with a status-tinted ring; **hover** reveals the detail card — `total` (in scope), `active`, `by_shift {s1,s2,s3}`, `by_role {satgas,linmas,korlap}`, and, for satgas/linmas, `understaffed` (bool). Rayon/region/location bubbles share this shape at their own scope; team bubbles show member count + team name.
- Stats + **daftar petugas** are scoped to the chosen level and filtered by the caller's role `monitoring_scope` ([ADR-044](./ADR-044-dynamic-rbac.md)):
  - **rayon** → all workers in the rayon;
  - **region** → mobile subjects of the region + static subjects in its locations;
  - **location** → static subjects of that location.

### Understaffing

`is_understaffed` counts only `satgas`+`linmas` with an active status inside their assigned scope vs `LocationStaffRequirement` for the current shift + day type. Supervisory/coordinator roles never affect it.

### Realtime & performance

Keep the event-sourced Redis-stream model (ADR-029) and the web in-place snapshot-patch approach (`useMonitoringSocket.ts`) — patch cached snapshots without remounting the map. **Bubble aggregates are computed server-side** (per rayon/region/area) and pushed on status change, so the client renders bubbles from an aggregate feed rather than recomputing from every worker. Region tier is added to the room model (`monitoring:rayon:{id}` / `monitoring:region:{id}` / `monitoring:area:{id}`); the client subscribes to the room for its current drill scope.

**Search** is server-backed and scope-filtered ([supervisor visibility](#supervisor-hierarchical-visibility)): it matches worker name, location name, or team keyword and returns matches that are **clocked-in with a location fix in the last 24h** (including monitorable-but-not-scheduled workers), each with its live status + last position — this is how non-scheduled clock-ins are found without cluttering the default map.

## Consequences

### Positive
- Staffing math reflects the real workforce; supervisors stop being counted as "staff".
- Mobile crews get correct geofencing; no fake fixed areas.
- Cleaner top-level map (rayons only), the drill-down the client liked, minus the disliked bubbles.
- Teams collapse to one marker → far less clutter at scale.

### Negative
- Extra region tier + team-bubble expansion add rendering/caching complexity; must stay lag-free.
- "Monitorable but not scheduled" is a new state the roster/daftar-petugas UI must represent.

### Security
- Daftar petugas / search results are scope-filtered per role; a district role never sees another rayon.

## Alternatives Considered
1. **Count all roles toward staffing.** Rejected — the client is explicit that only satgas+linmas are the workforce.
2. **Model mobile subjects as fixed areas.** Rejected in [ADR-045](./ADR-045-four-level-location-hierarchy.md).
3. **Keep the Surabaya bubble / ratio bubbles.** Rejected — direct UAT feedback.

## References
- [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md) — event-sourced status (extended)
- [ADR-044](./ADR-044-dynamic-rbac.md) — role monitoring_scope drives visibility
- [ADR-045](./ADR-045-four-level-location-hierarchy.md) — region tier, static/mobile geofencing
- [ADR-047](./ADR-047-schedule-redesign.md) — schedule occurrences feed roster/understaffing
- [ADR-048](./ADR-048-teams.md) — team bubbles
- Feature spec: `../../features/monitoring/README.md`
