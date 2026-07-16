# Presence & Attendance Model — Test Matrix

The TDD target for **Phase 5.4**. Every row is an assertable case derived from
[ADR-050](../architecture/decisions/ADR-050-presence-attendance-model.md); write these **RED first**, then
implement the derivation until GREEN. The catalog these expand (39 scenarios + diagrams) is the "SEKAR —
Presence & Attendance Model" standardisation doc.

**Why a matrix and not just "add tests":** this phase's defects are *semantic*, not type errors — a green
suite passed the 5.3 inversion, the outside-area double-count, and the dead axis. So Layers 1–2 are **pure
parametric** (no mocks, translate straight to `it.each`), and Layer 6 is a set of **regression guards** that
each must be confirmed to **fail against pre-5.4 code** before being kept.

## Input vocabulary

The facts a case fixes (a presence state is a pure function of these — nothing else):

| Input | Values |
|---|---|
| `scheduled` | occurrence exists for this **service day**? `yes` / `no` |
| `clock_in` | `clock_in_time` present? `∅` / a time |
| `clock_out` | `clock_out_time` present? `∅` / a time |
| `now` vs window | `before_start` · `in_grace` · `past_grace..before_end` · `after_end` (relative to the shift's real end, cross-midnight aware) |
| `gps` | `fresh` (≤ `active_max_age_sec`) · `stale` (>) · `never` |
| `within` | `is_within_area`: `true` · `false` · `n/a` |
| `role` | `counted` (satgas/linmas) · `monitorable` (korlap/kepala_rayon/admin_rayon) · `none` |
| `leave` | `none` · `cuti` · `sakit` · `izin` · `libur` |
| `overtime` | `none` · `approved` |

Outputs asserted: `state` (lifecycle), `flags`, `map` (none / roster / history / pin / pin-adhoc / pin-lembur / pin-warn), `counts` (bool), and for `bertugas` the live `connectivity` · `area` · `position`.

---

## Layer 1 — Lifecycle derivation (pure) · `PM-L`

`derivePresenceState(facts, now)` — no I/O, `it.each` over this table. `overtime` and `leave` are overrides applied before the base table.

| ID | scheduled | clock_in | clock_out | now vs window | leave | overtime | → `state` | flags | map | counts* |
|----|-----------|----------|-----------|---------------|-------|----------|-----------|-------|-----|--------|
| PM-L01 | no | ∅ | ∅ | — | none | — | `tidak_bertugas` | — | none | no |
| PM-L02 | no | ∅ | ∅ | — | libur | — | `tidak_bertugas` | `excused:libur` | none | no |
| PM-L03 | yes | ∅ | ∅ | before_start | none | — | `belum_hadir` | — | roster | no |
| PM-L04 | yes | ∅ | ∅ | in_grace | none | — | `belum_hadir` | — | roster | no |
| PM-L05 | yes | ∅ | ∅ | past_grace..before_end | none | — | `terlambat` | — | roster (flagged) | no |
| PM-L06 | yes | ∅ | ∅ | after_end | none | — | `tidak_hadir` | — | flagged | no |
| PM-L07 | yes | ∅ | ∅ | after_end | sakit | — | `tidak_hadir` | `excused:sakit` | flagged | no |
| PM-L08 | yes | ✓ on-time | ∅ | in window | none | — | `bertugas` | `is_late:false` | pin | yes |
| PM-L09 | yes | ✓ late | ∅ | in window | none | — | `bertugas` | `is_late:true` | pin | yes |
| PM-L10 | yes | ✓ | ✓ | — | none | — | `pulang` | — | history | no |
| PM-L11 | yes | ✓ | ✓ before_end | — | none | — | `pulang` | `early` | history | no |
| PM-L12 | no | ✓ | ∅ | in window | none | — | `bertugas` | `ad_hoc` | pin-adhoc | **no** |
| PM-L13 | yes | ✓ | ∅ | after_end | none | none | `bertugas` | `lupa_clock_out` | pin-warn | yes* |
| PM-L14 | yes | ✓ | ∅ | after_end | none | approved | `bertugas` | `lembur` | pin-lembur | yes |
| PM-L15 | yes | ✓ (2nd shift, prior `pulang`) | ∅ | in window | none | — | `bertugas` | — | pin | yes |

`counts*` here is the per-worker eligibility (role gating applied in Layer 3). PM-L13 `yes*` = counts until corrected — the risk the flag exists to surface.

**Assert also:** the function is **total** — every `(scheduled × clock_in × clock_out × now)` combination returns a defined state (no `undefined`; callers destructure it). Property test or an exhaustiveness case.

---

## Layer 2 — Live sub-state (pure) · `PM-P`

Only meaningful while `bertugas`. `deriveAxes(status, is_within_area, last_location_at)` — mirrors the backend and mobile helper.

| ID | gps | within | → connectivity | → area | → position |
|----|-----|--------|----------------|--------|-----------|
| PM-P01 | fresh | true | `aktif` | `dalam_area` | current fix |
| PM-P02 | fresh | false | `aktif` | `luar_area` (ring) | current fix |
| PM-P03 | stale | true | `offline` | `dalam_area` | **last-known** fix |
| PM-P04 | stale | false | `offline` | `luar_area` (ring) | **last-known** fix |
| PM-P05 | never | n/a | `offline` | `unknown` | none · `no_signal` |

**Semantic guards (were bugs before):**
- PM-P06 — an `offline` worker keeps his last-known area (`dalam`/`luar`), **not** `unknown` (Q11). Regression: the 5.3 pre-fix returned `unknown`.
- PM-P07 — `aktif` **and** `luar_area` coexist: a fresh fix outside the polygon is active with an outside ring, never demoted to a separate status.

---

## Layer 3 — Counting (integration) · `PM-C`

Staffing = `bertugas` ∧ scheduled-for-this-subject ∧ role ∈ `STAFFING_COUNTED_ROLES`.

| ID | Setup | Expected |
|----|-------|----------|
| PM-C01 | 1 satgas `bertugas` scheduled + 1 korlap `bertugas` at the same lokasi | `counted = 1` (korlap excluded); both on the map |
| PM-C02 | ad-hoc satgas (`bertugas`, **not** scheduled here) | `counted = 0`; on map with ad-hoc marker |
| PM-C03 | satgas `bertugas` but `offline` (signal lost) | **still counted** — a park is no less staffed because a phone dropped |
| PM-C04 | satgas who has clocked out (`pulang`, `shift_id = NULL`) | `counted = 0`; not a live pin |
| PM-C05 | kepala_rayon / admin_rayon `bertugas` | `counted = 0`; visible on map |
| PM-C06 | satgas `bertugas`, `luar_area` | counted once under his status **and** `outside_area += 1`; the two are never summed into a headcount |
| PM-C07 | required = 2 satgas, 1 satgas + 1 korlap present | `is_understaffed = true` (korlap doesn't fill the gap) |
| PM-C08 | required = 2, 3 satgas present | not understaffed; surplus shown, count not silently capped away |

---

## Layer 4 — Policy (integration) · `PM-G` grace · `PM-X` cross-midnight · `PM-O` offline

| ID | Case | Expected |
|----|------|----------|
| PM-G01 | shift with default grace, clock-in 10 min after start | `is_late = false` |
| PM-G02 | default grace, clock-in 20 min after start | `is_late = true` |
| PM-G03 | shift-definition **overrides** grace to 30 min, clock-in 20 min late | `is_late = false` (per-shift config honoured) |
| PM-G04 | scheduled, never in, `now` = exactly shift end | `tidak_hadir` (no-show boundary inclusive at end) |
| PM-X01 | **Shift 3** 21:00–05:00, clocked in 21:00, `now` = 02:00 next day, no clock-out | `bertugas` — **not** `lupa_clock_out` (judged on real end 05:00) |
| PM-X02 | Day shift 08:00–16:00, no clock-out, `now` = 02:00 next day | `lupa_clock_out` (past real end) |
| PM-X03 | Prior shift open + past end (`lupa_clock_out`); worker clocks in for the **next** service day | new clock-in **allowed**; today = `bertugas`; yesterday's shift stays open + flagged |
| PM-X04 | Shift still **within** its window; worker attempts a second clock-in | rejected/ignored — no duplicate, he is already `bertugas` |
| PM-X05 | Forgotten clock-out is never auto-closed | the `shifts` row keeps `clock_out_time = NULL` — no system-fabricated value (assert the record, not just the UI) |
| PM-O01 | `active_max_age_sec` = 600; fix 590 s old | `aktif` |
| PM-O02 | fix 610 s old | `offline` |
| PM-O03 | custom threshold = 120 s honoured (fix 130 s → `offline`) | config-driven |
| PM-O04 | active→offline transition **within** shift window | korlap paged **once** |
| PM-O05 | active→offline transition **after** shift end | **not** paged (expected departure) |
| PM-O06 | worker flaps offline→online→offline in one episode | paged at most once per offline transition (dedup) |

---

## Layer 5 — Service-day & integrity (integration) · `PM-S`

| ID | Case | Expected |
|----|------|----------|
| PM-S01 | dangling `lupa_clock_out` shift from yesterday | absent from **today's** live map and today's count; present in yesterday's history |
| PM-S02 | worker clocks in today | `user_tracking_status` (one row/user) is upserted to today's shift; yesterday's `shifts` row untouched |
| PM-S03 | tracking row left from yesterday, no clock-in today | reset at WIB day boundary; yesterday's position **not** rendered as today |
| PM-S04 | roster **not generated** for today | scope reports `roster_pending`, distinct from "nobody scheduled" (`tidak_bertugas` for all) |
| PM-S05 | clock-in exists but tracking row missing | `bertugas` / `offline` — clock-in is the lifecycle source of truth |
| PM-S06 | worker deactivated mid-shift with an open clock-in | removed from the live map; shift closed/hidden |
| PM-S07 | "today" resolved in **WIB**, not UTC | a 23:30 WIB clock-in belongs to the correct service day |

---

## Layer 6 — Regression guards (must fail against pre-5.4 code) · `PM-R`

Each asserts a semantic invariant a green suite previously passed while broken. Confirm RED against the current code first.

| ID | Invariant | The bug it guards |
|----|-----------|-------------------|
| PM-R01 | `total_active + total_offline` = clocked-in headcount; `outside_area` is **never** added in | 5.3 double-count (`active + outside_area`) |
| PM-R02 | `is_fully_staffed` / `is_understaffed` use `active + offline`, not `+ outside_area` | short-staffed park reported as full |
| PM-R03 | `outside_area` is counted from `is_within_area`, not read off the status column | dead axis (silently 0 forever) |
| PM-R04 | a clocked-out worker (`shift_id = NULL`) appears in **no** count and on **no** live pin | clock-out folding into a counted status |
| PM-R05 | an `offline` (clocked-in) worker **still** counts toward staffing | staffing blinking out on signal loss |
| PM-R06 | a not-clocked-in worker never counts, whatever his stored status | the `onClockOut`/default inversion (PR #277) |
| PM-R07 | `lembur` requires an approved overtime record; presence past shift end alone does **not** count as overtime | auto-inferred overtime inflating hours |
| PM-R08 | a forgotten clock-out never receives a system-written `clock_out_time` | fabricated attendance data |
| PM-R09 | an `ABSENT`/not-clocked-in row's stale `is_within_area` is **not** counted as `outside_area` | at-home worker reported "outside area" |

---

## Coverage map — every catalog scenario has a test

ADR-050 catalog group → covering test IDs (each of the 39 rows lands on ≥1):

| Catalog group | Scenarios | Covered by |
|---|---|---|
| A · Normal lifecycle | 1–4 | PM-L01, L03, L08, L10 |
| B · Late & no-show | 5–7 | PM-L05, L09, L06 · PM-G01–G04 |
| C · Clock-out variants | 8–11 | PM-L11, L13, L14, L15 · PM-X05 · PM-R07/R08 |
| D · Excused absence | 12–14 | PM-L02, L07 · PM-L06 |
| E · Ad-hoc / unscheduled | 15–16 | PM-L12 · PM-C02, C05 |
| F · Live presence / GPS | 17–22 | PM-P01–P07 · PM-O01–O03 |
| G · Geofence | 23–27 | PM-P02/P04 · PM-C06 · (ungeofenced/clock-in-outside: PM-P + boundary-check specs) |
| H · Role & counting | 28–30 | PM-C07, C08 · PM-C01, C05 |
| I · Multi-shift / time | 31–33 | PM-X01–X04 · PM-S07 |
| J · Data integrity | 34–37 | PM-S01–S06 |
| K · Special day | 38–39 | PM-L01 (scope) · requirement-by-day-type spec (existing) |

**Where each layer runs:** L1/L2 pure unit (`status-calculator` + mobile `statusHelpers` / web derivation) · L3/L4/L5 backend service integration (`monitoring-stats` / `status-calculator` / a new lifecycle resolver) · O04–O06 the alert path · web/mobile render assertions for marker variants (pin-adhoc / pin-lembur / pin-warn) in their component suites.

## Changelog
- 2026-07-16 — Created as the Phase 5.4 TDD target (ADR-050). 6 layers, ~55 cases; Layer 6 regression guards must fail against pre-5.4 code before being kept.
