# ADR-057 — Summary-first day board: counts from the server, rows on expand

**Status:** Active · implemented
**Date:** 2026-08-01
**Rests on:** [ADR-053](./ADR-053-schedule-row-per-place.md) (one row per place) · [ADR-047](./ADR-047-schedule-redesign.md) (events + projection)

## Context

The Jadwal day board downloaded every occurrence in the city to render a view
made almost entirely of integers. On the staging clone that is **3.87 MB in
1.5 s for one day** (3 359 rows), and 57 MB / 27 s for a month.

A **collapsed** card shows only: a headcount, capacity pills, and its children's
counts. Worker names are read exclusively inside an *expanded* `ShiftRoleTable`.
So the board was paying for thousands of rows to print a handful of numbers, and
the cost scaled with the workforce rather than with what was on screen.

The API also runs at `--max-old-space-size=384`, so the month case is an OOM
risk, not merely a slow page.

## Decision

**The collapsed board is built from an aggregate; a container's rows are fetched
when that container is opened.**

### `GET /schedules/day-summary?date=&…filters`

Returns two shapes, because they answer two different questions:

- **`groups`** — occurrence counts per `(container, shift, role)`. The client
  sums these for a shift's total and filters to the countable roles
  (`satgas`/`linmas`) for understaffing. Team members are included: a team fans
  out to one occurrence per member carrying that member's own role, so grouping
  by role counts them exactly as the board does.
- **`workers`** — **distinct people** per container subtree. This is separate
  precisely because it *cannot be summed client-side*: under ADR-053 one worker
  may hold several occurrences in a day at different places, so a kawasan's
  headcount is a union of its lokasi, never a sum.

The container of a row is the innermost binding it carries — lokasi, else
kawasan, else rayon, else city — the same order `buildDayBoard` buckets in.

### Consequences for the tree

`BoardLocation`/`BoardRegion`/`BoardDistrict` gain **`workerCount`**.
`workerIds.length` is only countable when the client holds every occurrence, and
it no longer does. `buildDayBoard` and `pruneDayBoard` take an **optional**
summary: with one, tallies come from the server and `occurrences` holds only the
opened containers; without one they behave exactly as before, so week/month and
every existing test are untouched.

Pruning does **not** recompute `workerCount` when a summary is present — the
summary is fetched with the same filters, so its numbers already describe the
filtered set.

## Constraints this must respect

1. **Projection is not optional.** Past the materialization horizon a day holds
   *no rows at all*, only occurrences an event will produce (ADR-047). A summary
   that counted materialized rows alone reported **0 petugas for a day the board
   could still open and list 1 009 people in**. `getDaySummary` therefore tallies
   materialized rows *and* projections, through the **same**
   `projectOccurrences` the roster read uses — extracted rather than copied, so
   the two cannot drift.
2. **A kawasan is rolled up, not read off the row.** A static row carries no
   `region_id`; only its lokasi knows the kawasan. The lookup must not come from
   the projected row's `location`, which `slimProjectedRelations` has reduced to
   `{id, name}` by then — doing so silently zeroed every kawasan headcount on a
   projected day.
3. **The city container needs `cityScopeOnly`.** "Seluruh Surabaya" is bound to
   no geography, so a leaf fetch has no id to scope by. Without the flag it fell
   back to the unscoped day and re-downloaded the 1.2 MB the summary had just
   replaced — and the board auto-opens that node.
4. **An empty container is never fetched.** The summary already says it holds
   nothing; on a city-wide board most containers are empty.
5. **Emptiness is read from the summary.** The "Belum ada jadwal" banner tested
   `occurrences.length`, which is now empty until a card opens — it announced an
   empty day on a board showing 1 009 assignments.

## Results (staging clone, localhost)

| | Before | After |
|---|---|---|
| Day board data | 3.87 MB · 1.5 s | **83 KB · 0.12 s** |
| Whole `/schedules` page load | 2.70 MB | **1.51 MB** |
| Opening a rayon (own assignment empty) | — | **no request** |
| Opening a lokasi | — | **132 KB**, scoped by `locationId` |

Cross-checked against `/schedules/range` on four days — two materialized, two
fully projected — for occurrence totals, city headcount and per-district /
kawasan / lokasi distinct counts: **exact agreement, zero mismatches.**

## Extended to week and month (2026-08-01)

Both grids render **only headcounts** unless narrowed to a worker or a lokasi —
`MonthGrid` prints a distinct-petugas figure plus a per-rayon list, `WeekGrid` a
rayon × day table of per-shift role breakdowns — and both were fed the whole
range's rows to derive them. `GET /schedules/range-summary` answers the same
question in three arrays: `days`, `dayDistricts`, and per-`(day, rayon, shift)`
`cells`. `districtCountsFromSummary` / `weekCoverageFromSummary` turn those into
the exact shapes the grids already render, so the components were barely touched.

| | Before | After |
|---|---|---|
| Week (browser) | 16 MB | **40 KB** |
| Month (browser) | 57 MB · 27 s | **226 KB** |

Three things this had to get right:

- **`getRawMany` returns `date` columns as JS `Date` objects**, not the
  `YYYY-MM-DD` the entity declares. Keying a Map on one uses object identity, so
  every row became its own bucket — an unfiltered month reported **48 954 "days"
  of one worker each** instead of 35. Everything that groups by day goes through
  `toDayString`.
- **A person counts once per cell**, and where they mix a team assignment with an
  individual one in the same shift the **team wins**. The row-based code took
  whichever row the database happened to return first; this is the same answer
  without the ordering dependency.
- **The chip/count switch is one definition.** The grids draw occurrence chips
  when filtered to a worker or a lokasi, and that same flag decides whether the
  rows are fetched — otherwise a chip view could be handed nothing to draw.

**Deliberate difference:** a row at a **deactivated** lokasi is now counted in
its rayon. The grids resolved a rayon through their master list, which holds only
active lokasi, so such a row was silently dropped from the rayon breakdown while
still counting in the day total — the cell contradicted its own header. The
worker is on duty, and the day board's rayon pill already counted them, so the
grids now agree with it. On the staging clone this is one lokasi ("Taman Korea")
and shifts a handful of cells by one.

## Four holes found by the 2026-08-01 end-to-end pass

Each is the same shape: SQL now answers a question the client used to answer, and
SQL sees rows the client never could.

1. **A day-off row has no shift, so it renders nowhere — and must not count.**
   `groupByShift` buckets by the known shift ids, so a row with
   `shift_definition_id IS NULL` was always invisible to the tree; the old
   headcount was implicitly "people on a shift". Tallying straight from SQL
   started counting day-off markers as petugas. On 2026-08-01: **1 087 claimed
   against 1 023 actually on shift**, and one worker whose only row was a
   city-scope day-off showed in the Surabaya total while appearing on no card
   below it. Both summaries now require a shift.
2. **A rayon is rolled up through its place, exactly like a kawasan.** Constraint
   2 above was applied to kawasan and missed for rayon: `getDaySummary` read
   `district_id` off the row while `getRangeSummary` resolved it through
   lokasi → kawasan → rayon. **276 rows that day carry a lokasi but no rayon**, so
   the day board's rayon pill omitted 3 people the board still listed under that
   rayon's lokasi, and the day figure (1 023) contradicted the week/month one
   (1 026). Both now resolve identically.
3. **`cityScopeOnly` has to gate the projection too.** The materialized query had
   its three `IS NULL` predicates; `projectOccurrences` did not, so every
   geography-bound event still expanded into the city container's fetch —
   **99 foreign rows out of 100** — reinstating the overfetch constraint 3 exists
   to prevent.
4. **Nested containers return overlapping rows.** A lokasi-bound occurrence comes
   back from the lokasi query, its kawasan's *and* its rayon's, and the leaf
   fetches were merged by concatenation. Opening a card and its parent listed the
   same person two or three times and React logged a duplicate key.
   `dedupeOccurrences` merges by id. Headcounts were never affected — they come
   from the server's DISTINCT, which is the point of this ADR.

Each has a regression test that fails without its fix.

## Alternatives rejected

- **Slim the row payload instead** (dictionary-encode the repeated `user` /
  `shift_definition` / `location` objects). Roughly a 9× cut with no board
  changes, but the cost still scales with the workforce rather than with what is
  on screen, and the month case stays an OOM risk.
- **Paginate `/schedules/range`.** Fights the tree: a container needs all of its
  rows at once to group them by shift and role.
