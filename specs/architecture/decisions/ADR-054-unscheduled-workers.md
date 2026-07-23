# ADR-054: "Belum Dijadwalkan" — surfacing the workers a day has left out

## Status

Proposed — **design only, not implemented**. Awaiting approval on the four open
questions in §Decisions.

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

### 1. The unit is (worker, date, shift?)

Unscheduled is evaluated **per date**, optionally narrowed **per shift**.

- No shift selected → "has no row at all on this date".
- Shift selected → "has no row for THIS shift on this date". A satgas on Shift 2
  is genuinely free for Shift 1, and under ADR-053 they may already hold several
  rows without that making them unavailable.

The panel inherits the board's current date and shift filter, so it always
answers the question about the day the admin is looking at.

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

### 4. Only schedulable roles

Drawn from `satgas`, `linmas`, `korlap` — the roles that receive roster rows.
`isNonRosteredRole` (management / admin_system / superadmin / staff_kecamatan) is
excluded by definition: they never get a row, so they would permanently fill the
list.

`kepala_rayon` / `admin_rayon` are **excluded by default** — `isDistrictManagerRole`
treats their assignment as a fixed whole-district posting rather than a per-day
one — but remain reachable behind the role filter. *(Open question 2.)*

### 5. Scope follows the existing rules

No new permission concept. The endpoint reuses the roster scope the caller
already has: global for admin_system / superadmin / management, own district for
kepala_rayon / admin_rayon, assigned lokasi for korlap. An admin never sees
workers they could not schedule anyway.

Only `is_active` workers appear — deactivated accounts are not a staffing gap.

## Shape

### API

```
GET /schedules/unscheduled
      ?date=YYYY-MM-DD            (required)
      &shift_definition_id=uuid   (optional — omit for whole-day)
      &district_id=uuid           (optional filter, within caller's scope)
      &role=satgas|linmas|korlap  (optional, repeatable)
      &q=<name or username>       (optional)

200 → {
  date, shift_definition_id,
  unscheduled: [{ id, full_name, username, role, district_id, district_name }],
  unavailable: [{ …same…, status: 'off'|'leave_sick'|'leave_annual'|'leave_permit' }],
  totals: { unscheduled, unavailable, scheduled, workforce }
}
```

`totals` is what makes the button meaningful before it is pressed — the trigger
carries the count.

### UI

A **`Belum Dijadwalkan (N)` button between "Hari Libur" and "Buat Jadwal"**, as
requested. `N` is the actionable bucket only; the button reads neutral at 0 and
draws attention above it.

It opens a **side sheet**, not a modal: the admin needs to see the board while
working the list. Contents, top to bottom:

- date + shift context line (inherited, not re-chosen)
- search + role filter + rayon filter
- workers **grouped by rayon**, each row `Nama · @username · Peran`
- per-row **`Jadwalkan`** → opens Buat Jadwal prefilled with that worker, the
  panel's date and shift; on save the row leaves the list and the count drops
- a collapsed **`Tidak tersedia (M)`** section at the bottom, each row showing
  its reason

Empty state — "Semua petugas sudah dijadwalkan" — is a real answer and gets the
same care as the list.

## Consequences

**The day gets a completion signal.** "Done" stops being a feeling and becomes a
number that reaches zero.

**One more consumer of the projected-row union.** `findByDateRange`'s expansion
becomes load-bearing for a second feature; a bug there now shows up in two
places. That is an argument for it, not against — the alternative is a second,
subtly different definition of "scheduled".

**Cost is a full-workforce scan per open.** Bounded by active schedulable workers
in scope (hundreds, not thousands) and only on demand. If the button's count is
made live it needs the same short-TTL cache the monitoring summary uses, rather
than a query per board render. *(Open question 3.)*

**It does not schedule anyone.** Strictly a lens onto existing data plus a
prefilled hand-off into the existing create flow. No new write path, no new
permission, nothing to migrate.

## Open questions (need a decision before implementation)

1. **Whole-day or per-shift default?** Proposed: inherit the board's shift
   filter, falling back to whole-day when none is set. The alternative — always
   whole-day — is simpler but tells a Shift-1 planner that a Shift-2 satgas is
   already handled.
2. **Do `kepala_rayon` / `admin_rayon` belong in the list?** Proposed: excluded
   by default, reachable via the role filter. They do receive rows, but their
   posting is standing rather than daily.
3. **Live count on the button, or only on open?** Proposed: compute on open
   (cheap, always correct). A live badge is nicer but adds a query to every board
   render and a cache to keep honest.
4. **Bulk assign?** Out of scope as proposed — one `Jadwalkan` at a time. A
   multi-select "assign these five to Lokasi X on Shift 1" is the obvious next
   ask, and worth building only once the single-row flow is proven.

## Related

- **ADR-053** — one row = one worker, one shift, one place. Why "unscheduled"
  must be evaluated per (date, shift) rather than per day: holding several rows
  is normal and does not make a worker unavailable.
- **ADR-047** — calendar-style scheduling; the source of projected occurrences
  that Decision 2 must honour.
- **ADR-046** — which roles are schedulable vs merely monitorable.
- **ADR-050** — the leave statuses that populate the "Tidak tersedia" bucket.
