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

## Not covered

Week and month still fetch rows, and an unfiltered month is still 57 MB / 27 s.
They render only headcounts unless a subject filter is set, so the same
treatment applies — but they need a per-`(date, district)` aggregate this
endpoint does not answer. Tracked as a follow-up.

## Alternatives rejected

- **Slim the row payload instead** (dictionary-encode the repeated `user` /
  `shift_definition` / `location` objects). Roughly a 9× cut with no board
  changes, but the cost still scales with the workforce rather than with what is
  on screen, and the month case stays an OOM risk.
- **Paginate `/schedules/range`.** Fights the tree: a container needs all of its
  rows at once to group them by shift and role.
