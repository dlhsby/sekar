# ADR-064: Effective Placement — One Worker, Counted Once, Where They Are

## Status

Active · supersedes the "credit every rostered lokasi" presence rule of [ADR-053](./ADR-053-schedule-row-per-place.md) · builds on [ADR-063](./ADR-063-assignment-policy.md)

## Context

Since ADR-063, a person may hold several places in one shift: satgas/linmas one
individual place plus one team, and korlap any number. UAT asked that the map show each
worker **once**, based on the currently active and closest location. Their individual
place is shown first; when they are working with the team, the team's place replaces it.

The monitoring stack assumed one row per shift in several places:

| Where | Old behaviour |
|---|---|
| Clock-in candidates (`getActiveAreasNow`) | Read one row, so the team's place was never a candidate |
| Geofence (`getActiveAreasForDay`) | Read one row, so standing at the team place counted as "outside area" |
| Attribution | Set at clock-in and never updated when the worker moved |
| Snapshot display scope | Collapsed rows with an arbitrary tie-break |
| Team membership | The first team of the *whole day*, not of the current shift |
| Lokasi staffing | A clocked-in worker was counted **present at every** rostered lokasi |
| Korlap landing | Keyed on `users.location_id`, no longer set by the user form; otherwise it opened the city view, which is a 403 for korlap |

## Decision

1. **Candidates are every live row of the shift.** `rowsInSameShift` + `areasOfRows`
   feed both clock-in (inside the boundary, else the nearest) and the geofence, which uses
   every live row of the day.
2. **Attribution follows the worker, with hysteresis.** On each ping, `locateAmongAssigned`
   finds the assigned lokasi containing the point (the current one preferred). The pure
   `decideAttribution` switches `tracking.location_id` only after the worker has stayed
   inside another assigned lokasi for `REATTRIBUTE_AFTER_MS` (2 min).
   - The pending switch is stored in `user_tracking_status.pending_location_id` /
     `pending_since` (migration `17547`).
   - Jitter back into the current place cancels the pending switch.
   - The district moves along with the lokasi.
3. **Drawn once, at the live place.** `pickDisplayScope` chooses among all current-shift
   assignments:
   - first, the one matching the live lokasi, then kawasan, then Rayon;
   - otherwise the deepest, with the **individual before the team** (UAT), then the
     lowest id.

   A live kawasan match beats a deeper lokasi elsewhere (someone alone at lokasi A, with a
   roaming team in kawasan R, standing in R, is shown in R).
4. **The team a worker is on now** (`pickTeamRows`): only teams on the worker's clocked-in
   shift count. Among several (a korlap), the team whose lokasi they are at wins, else
   the earliest.
5. **Presence counted once.** Every rostered lokasi still lists the worker as expected.
   Presence is credited only at `presenceLokasi`: the attributed lokasi if it is one of
   theirs, else the first rostered. Staffing counts only satgas/linmas, which ADR-063 caps
   at one individual place plus one team.
6. **Landing view from the schedule:** `GET /monitoring/home`.

   | Viewer | Opens on |
   |---|---|
   | City roles | The city |
   | Rayon roles | Their Rayon |
   | Korlap | A covered lokasi: the legacy primary lokasi if still covered, else the first |
   | Korlap with nothing covered | `none`, and the clients show "no locations to monitor today" |

   Web and mobile both use it for korlap.

## Consequences

**Positive**
- One marker, one count, at the right place; the team's place takes over while the worker is there.
- Korlap monitoring works without a permanent lokasi.

**Negative / accepted**
- A switch lands up to 2 minutes after the worker arrives, so a short visit to the other
  place doesn't move them.
- The historical `shifts.location_id` (clock-in attribution) is left as is; only the live
  tracking row moves.
- The "bertugas di tempat lain" wording is not surfaced as its own counter yet. The
  expecting lokasi simply shows the worker as not present there.
