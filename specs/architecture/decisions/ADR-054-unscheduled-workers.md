# ADR-054: "Belum Dijadwalkan" — surfacing the workers a day has left out

## Status

Accepted — **implemented** (be + web, 2026-07-23). Every open question was
decided by the product owner the same day; see §Decisions.

## Date

2026-07-23

## Context

Building a day's roster is currently a **push** operation: the admin opens Buat
Jadwal, remembers a name, assigns it, repeats. Nothing anywhere answers the
question that actually governs whether the day is finished — *who have I left
out?*

The board shows what IS scheduled. A worker with no row simply does not appear,
so their absence is invisible by construction: an empty Rayon column and a rayon
whose entire crew is already placed look identical. The admin closes the day
believing it complete, and the gap surfaces the next morning as an understaffed
lokasi.

The information exists — it is the complement of a query the board already runs
— but nothing computes the complement. That is the whole of this ADR.

Two things make the complement less obvious than it sounds:

1. **Projected occurrences.** Beyond the materialization horizon a recurring rule
   produces *projected* rows, not DB rows (ADR-047). A naive `NOT EXISTS` against
   `schedules` would report every worker on a daily rule as unscheduled for every
   future date — the list would be pure noise exactly where planning happens.
2. **Absence is not availability.** A worker on cuti has no assignment and cannot
   take one. Listing them beside genuinely free workers invites the admin to
   schedule someone who is on approved leave.

## Decision

Add a **read-only "Belum Dijadwalkan" view** — one endpoint, one panel — that
answers "who is not on this day's roster, and which of them can I still place?"

### 1. The filters describe the TARGET SLOT, not the worker

**Decided 2026-07-23, amended the same day.** Date, shift, rayon, kawasan and
lokasi together say *"this is the assignment I am trying to make"*; the answer is
everyone who does not already hold a schedule matching it — exactly the people
who could fill it.

An omitted criterion matches everything, so the simple question is the degenerate
case of the general one:

| Filters | Question answered |
|---|---|
| date only | "who has no schedule at all today" |
| date + shift | "who is free for Shift 1" |
| date + shift + lokasi | "who could I add to Taman Bungkul on Shift 1" |

The panel opens on **today** and carries **its own date picker** — an admin
planning tomorrow should not have to move the board first, and a filter they did
not set in *this* panel must not change what the list means.

**Geography deliberately does NOT narrow the workforce.** Workers carry a rayon
and nothing below it — `users.region_id` is unset for all 72 seeded workers and
only 15 hold a permanent lokasi — so filtering *people* by kawasan would match
almost nobody. The kawasan belongs to the slot.

**Busy elsewhere is still available here.** Only a row matching the target counts
as "already on it": under ADR-053 one worker legitimately covers several places in
a shift, so being at Taman B does not disqualify them from also covering Taman A.

**A BROADER assignment already covers a narrower target.** A city-wide row covers
every rayon; a rayon-wide row covers every lokasi in it. A row is "not this slot"
only when it names a *different* place at the same level. Requiring an exact
column match made every city-scope worker read as free for every rayon — with the
seeded city-scope cohort that collapsed `scheduled` to 0 for any rayon target.

**`replaced` releases the slot; `absent` does not.** Replacement is the one status
where holding a schedule means the worker is free — someone else took the shift —
so they belong in this list. Someone marked absent still holds the assignment.

### 2. Projected occurrences count as scheduled

The query runs against the **same materialized ∪ projected union the board
renders** (`findByDateRange`), not against the `schedules` table alone. A worker
covered by a recurring rule is scheduled whether or not the cron has caught up
to that date yet.

This is the decision that makes the feature usable rather than noisy, and it is
the one a straightforward implementation gets wrong.

### 3. Three buckets, not one list

| Bucket | Meaning | Actionable |
|---|---|---|
| **Belum dijadwalkan** | No occurrence for the date/shift | ✅ the working list |
| **Tidak tersedia** | Has a row with `off` / `leave_*` status | ❌ shown, greyed, with the reason |
| *(scheduled)* | Has a live occurrence | not shown |

Splitting "no row" from "excused" is the difference between a list of people to
place and a list that quietly invites double-booking someone on cuti. The second
bucket is collapsed by default — it explains a short roster without competing
with the work.

### 4. Only the three worker roles — the rest are excluded outright

**Decided 2026-07-23.** The list is `satgas`, `linmas`, `korlap`. Nothing else,
with **no filter escape hatch**:

- `isNonRosteredRole` (management / admin_system / superadmin / staff_kecamatan)
  never receives a row at all.
- `kepala_rayon` / `admin_rayon` hold a **standing whole-district posting**
  (`isDistrictManagerRole`), not a per-day assignment. Scheduling is for workers.
  Listing them would put two names in the list every single day that no one
  should ever act on — noise that trains the admin to ignore the panel.

**Role is a first-class column**, not a subtitle: it is how the admin decides who
to place, and it is filterable.

### 5. Caller scope is a SEPARATE axis from the target

No new permission concept, but it must not be conflated with the target filters.
`visibleDistrictId` narrows **who may be listed** (own district for kepala_rayon
/ admin_rayon; unrestricted for admin_system / superadmin / management);
`districtId` describes **the slot being filled**. They happen to be the same kind
of value, which is exactly why the first implementation passed the caller's rayon
in as `districtId` — and when Decision 1 stopped geography narrowing the
workforce, the scope guard silently stopped guarding. A rayon lead could list
every rayon's workers while the whole suite stayed green.

Only `is_active` workers appear — deactivated accounts are not a staffing gap.

### 6. Freshness: live within the session, not across users (yet)

**Decided 2026-07-23**, with a correction to the premise. The count is computed
**on open**, and stays correct for the rest of the session **through the existing
TanStack Query invalidation** — scheduling someone from the panel already
invalidates the schedules queries, so the row leaves the list and the count drops
with no extra machinery.

**Cross-user live updates need work that does not exist yet.** The WebSocket
gateway (`/events`) is real but carries **monitoring traffic only** — `monitoring:*`
rooms, presence and staffing events. The schedules module never touches it, so
there is no `schedule:changed` broadcast for a panel to listen to. Making another
admin's assignment update this list live means adding that channel: a room, an
emit on every schedule create / update / delete, and a client subscription.

That is a worthwhile follow-up — it would also let two admins share a board
without stepping on each other — but it is a **separate change**, not part of
this feature. Scoped as such rather than smuggled in.

### 7. One assignment at a time

**Decided 2026-07-23.** Each row has a `Jadwalkan` action that opens the normal
Buat Jadwal flow, prefilled with that worker and the panel's date (and shift, if
filtered). No bulk multi-select in v1: it needs a new bulk endpoint, partial-
failure semantics and its own conflict reporting, and is worth building only once
the single-row flow has proven the list is used.

### 8. A wide right sheet, not a modal

**Decided 2026-07-23.** The grid lives in a `Sheet` widened to ~800 px, so the
board stays visible on the left while the list is worked — seeing the gap you are
filling is the entire point of the feature, and a modal covers it.

`Sheet` is currently fixed at `max-w-md` (448 px), too narrow for name + role +
rayon + action. It gains a `size` prop (additive, defaulting to today's width so
no existing sheet moves).

## Shape

### API

```
GET /schedules/unscheduled
      ?date=YYYY-MM-DD            (required)
      &shiftDefinitionId=uuid     (optional — target shift)
      &districtId=uuid            (optional — target rayon, within caller's scope)
      &regionId=uuid              (optional — target kawasan)
      &locationId=uuid            (optional — target lokasi)
      &role=satgas|linmas|korlap  (optional, repeatable)
      &q=<name | username | team> (optional)

200 → {
  date, shift_definition_id,
  unscheduled: [{ id, full_name, username, role, district_id, district_name, teams: [] }],
  unavailable: [{ …same…, status: 'off'|'leave_sick'|'leave_annual'|'leave_permit' }],
  totals: { unscheduled, unavailable, scheduled, workforce, matched }
}
```

`totals` is what makes the button meaningful before it is pressed — the trigger
carries the count. `workforce` is the set the CALLER may see, before any search;
`matched` is how many of them the search hit (equal when not searching). Reporting
the search result as `workforce` made a 3-hit search read as though the whole
department were three people.

### UI

A **`Belum Dijadwalkan (N)` button between "Hari Libur" and "Buat Jadwal"**, as
requested. `N` is the actionable bucket only; the button reads neutral at 0 and
draws attention above it.

The panel is a **`DataTable`**, not a hand-rolled list — the project already has
one with per-column enum filters, global search, sorting and row actions, and the
whole point of this view is *filtering to the worker you want to place*. Building
a bespoke list here would mean re-earning all of that and drifting from the
master-data grids the admin already knows.

Contents, top to bottom:

- **Date picker** (defaults to today) — the panel is its own workspace, so it
  moves through days without touching the board
- **Filters (the target):** Shift · Rayon → Kawasan → Lokasi as a **cascade**
  (narrowing a parent clears its children, since a lokasi outside the chosen
  kawasan describes a slot that cannot exist) · Peran · search
- **Search spans name, username AND the teams the worker is scheduled on that
  day.** A team lives on the schedule, not on the person (ADR-048), so
  "Penyiraman" has to reach through today's occurrences to find that crew — which
  is exactly how you pull up a known team and place it somewhere new. Runs
  server-side, because the client never sees the teams of anyone off the current
  page.
- **Columns:** `Nama` · `@username` · **`Peran`** · `Rayon` · **`Tim`** · action
  — `Tim` shows the teams the worker is on TODAY, which is *why* someone free for
  this slot may still be busy elsewhere, and makes the team search discoverable
- Row action **`Jadwalkan`** → the normal Buat Jadwal flow, prefilled with that
  worker, the panel's date, and the shift if one is filtered. On save the row
  leaves the table and the total drops.
- a collapsed **`Tidak tersedia (M)`** section beneath the table, each row
  showing its reason (cuti / sakit / izin / libur)

Empty state — "Semua petugas sudah dijadwalkan" — is a real answer and gets the
same care as the table.

## Consequences

**The day gets a completion signal.** "Done" stops being a feeling and becomes a
number that reaches zero.

**One more consumer of the projected-row union.** `findByDateRange`'s expansion
becomes load-bearing for a second feature; a bug there now shows up in two
places. That is an argument for it, not against — the alternative is a second,
subtly different definition of "scheduled".

**Cost is a full-workforce scan per open.** Bounded by active schedulable workers
in scope (hundreds, not thousands) and only on demand.

**It does not schedule anyone.** Strictly a lens onto existing data plus a
prefilled hand-off into the existing create flow. No new write path, no new
permission, nothing to migrate.

**Two admins can still disagree.** Without the schedule broadcast (§6), a second
admin's assignment is invisible until refresh. Acceptable because the create flow
enforces uniqueness server-side — the worst case is a stale row that fails
loudly on `Jadwalkan`, not a double-booking.

## Implementation notes

- **be** `SchedulesService.findUnscheduled` + `GET /schedules/unscheduled`
  (`ROSTER_EDITORS`). Rayon-scoped callers are forced to their own district, and
  a scoped user with no district sees nothing rather than every rayon.
- The role filter can only **narrow within** the schedulable three. A request
  naming an excluded role is dropped — and, once dropped, falls back to all three
  rather than returning an empty list, which would read as "everyone is
  scheduled" when the truth is "you asked for a role this view never lists".
  A test pinned this: the first cut returned empty and was wrong.
- **web** `UnscheduledWorkersSheet` (DataTable in a `Sheet size="wide"`), the
  `useUnscheduledWorkers` query gated on `open` so the workforce scan never runs
  on a board render, and `initialUserId` on `ScheduleEventModal` for the
  prefilled hand-off. `openCreate` clears that prefill on every other entry
  point, or a worker picked here would haunt the next Buat Jadwal.
- `Sheet` gained `size` (`default` = the original `max-w-md`, `wide` = `max-w-3xl`),
  so no existing sheet changed width.

## Related

- **ADR-053** — one row = one worker, one shift, one place. Why "unscheduled"
  must be evaluated per (date, shift) rather than per day: holding several rows
  is normal and does not make a worker unavailable.
- **ADR-047** — calendar-style scheduling; the source of projected occurrences
  that Decision 2 must honour.
- **ADR-046** — which roles are schedulable vs merely monitorable.
- **ADR-050** — the leave statuses that populate the "Tidak tersedia" bucket.
