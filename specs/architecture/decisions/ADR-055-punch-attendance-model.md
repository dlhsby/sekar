# ADR-055: Attendance as an immutable punch log

## Status

Accepted — **design locked, implementation phased (not started)**. Re-bases the storage that [ADR-050](./ADR-050-presence-attendance-model.md) derives its lifecycle from, and reuses the schedule model of [ADR-047](./ADR-047-schedule-redesign.md) / [ADR-053](./ADR-053-schedule-row-per-place.md). **ADR-050's presence contract is preserved unchanged** — only the source of the "is he clocked in?" fact moves.

## Date

2026-07-25

## Context

Attendance today is one `shifts` row per session: a `clock_in_time` plus a nullable `clock_out_time`, where "open" means `clock_out_time IS NULL`. Field use surfaced that this shape can't express what workers actually do, and every workaround fought the schema:

- A worker legitimately **clocks in and out several times** in one shift (a break, a re-entry). The pair row has room for exactly one of each.
- A worker has **two shifts in a day** (shift 1 then shift 2, ADR-047). To start the second, the code had to *reject* the second clock-in until the first was closed, and auto-picked one `shift_definition` with no way to choose.
- A **forgotten clock-out** leaves an open row that then *blocks the next day's clock-in* — the guard rejects **any** open shift, which directly contradicts ADR-050's rule that "a new clock-in is blocked only by a shift still inside its window."
- "Which shift does this punch belong to?" near midnight (a 21:00–05:00 night shift, a clock-out at 05:42 the next calendar day) has no first-class answer.

The recurring lesson of ADR-050 applies: the `shifts` pair **bakes a derivation into storage** — it stores an *interpreted session* rather than the raw *facts*, which is exactly the shape that invites drift. The reference product (Catapa "Manajemen Waktu") models the same domain as a **log of punches**, deriving the session from first-in/last-out.

## Decision

### Principle — the punch is the atom

Every clock-in and clock-out is an **immutable inserted event (a punch)**. Nothing is ever "closed" or mutated. A shift's attendance is **derived** from its punches. This is ADR-050's "store facts, derive the state" carried one level deeper: punches *are* the facts.

### Storage — `attendance_punches`

```
id              uuid
user_id         uuid
punched_at      timestamptz
label           enum('clock_in','clock_out')
service_day     date            -- WIB; the day the punch is attributed to
shift_definition_id uuid null   -- resolved from the schedule; null = ad-hoc
gps_lat, gps_lng float
accuracy_m      int
within_area     bool
area_id         uuid null       -- the lokasi the GPS landed in, if any
photo_url       text null
created_at      timestamptz
```

Indexes: `(user_id, service_day)`, `(user_id, service_day, shift_definition_id)`.
Punches are **append-only** — no `UPDATE`/`DELETE` in normal operation.

### Grouping & derivation — Day → Shift → session

Everything is derived per `(user_id, service_day, shift_definition_id)`; nothing is stored:

| Derived | Rule |
|---|---|
| **Jam Masuk** | earliest `clock_in` punch of the shift |
| **Jam Keluar** | latest `clock_out` punch of the shift |
| **Live state** | last punch is `clock_in` → `bertugas`; last is `clock_out` → `pulang`; no punches → schedule decides (`belum_hadir` / `terlambat` / `tidak_hadir` / `tidak_bertugas`) |
| **Terlambat** | first `clock_in` > shift start + grace |
| **Pulang cepat** | last `clock_out` < shift end |
| **Lupa clock-out** | last punch is `clock_in` and now > the shift's real end (cross-midnight aware) |
| **Jam kerja** | sum of **paired segments** (below) |

**Segment pairing.** Process punches chronologically; a `clock_out` closes the segment opened by the **earliest still-open `clock_in`**, and absorbs any redundant `clock_in` in between. So `IN1, IN2, OUT1` = one segment `IN1→OUT1` (IN2 collapses in), and the run leaves nothing open → `pulang`. Breaks (`IN, OUT, IN, OUT`) count as two segments; a trailing unpaired `IN` is an open session (`bertugas`) that accrues no hours until closed. Masuk/Keluar are always shown as first/last regardless of the segments beneath.

### Clock-in never blocks; clock-out requires an open clock-in

- **Clock-in** inserts a punch, always. No `SHIFT_ALREADY_ACTIVE` guard. This removes the ADR-050 violation directly — a dangling shift from another day no longer blocks today.
- **Clock-out** is refused unless the shift/day has an open `clock_in` (no orphan clock-outs; keeps the segment pairing unambiguous).

### Attribution window — which shift a punch belongs to

A punch **defaults to the currently-active shift**, but may be re-pointed to an adjacent shift/day within a window tied to the shift's own boundaries (Catapa's near-midnight selector, generalised):

- A shift is selectable from `start − early_window` (an early clock-in).
- It stays selectable until `end + cutoff_grace` (a late clock-out — e.g. a night shift after midnight); its `service_day` is the shift's **start** day.
- **Past the cutoff** the shift drops out of the picker; anything left open becomes `lupa_clock_out`, fixable only by correction (deferred).

Config per shift-definition: `early_window` = **1 h**, `cutoff_grace` = **1 h**, both overridable. This makes the day-shift and the 21:00–05:00 night-shift cases fall out of one rule.

### Relationship to ADR-050 (presence) — unchanged contract

The six lifecycle states, the two live sub-axes (`aktif`/`offline`, `dalam_area`/`luar_area`/`unknown`), and the counting rule (`bertugas ∧ scheduled ∧ counted role`, `COUNT(DISTINCT user_id)`, service-day scoped) are **identical**. Only the source of `bertugas` moves: **"last punch is a clock-in"** replaces `clock_out_time IS NULL`. `user_tracking_status` stays one row per worker (live GPS), upserted on each punch; it reflects the current open session.

### Relationship to ADR-053 (schedule rows) — reinforced

A punch tags a `shift_definition`, **not** a row/place. Multi-place rows for one shift still resolve to **one session**; the punch's `area_id` records where the GPS landed. This is exactly ADR-053's invariant — *presence belongs to `(worker, shift, service-day)`, never to a row* — now made literal by the punch key.

### Migration — `shifts` becomes a maintained session-projection *table* (revised after Phase-0 audit)

> **Phase-0 correction.** The audit found **four tables FK `shifts.id`** — `activities.shift_id`, `location_logs.shift_id` (CASCADE), `overtime.shift_id`, and `user_tracking_status.shift_id` (SET NULL). A **pure SQL view has no stable id to reference**, so the original "read-only view" plan would force re-pointing all four FKs. Instead, `shifts` stays a **real table**, but is **derived and maintained from the punches** — one row per session — so every FK, cascade, and field-reader keeps working untouched and nothing re-points.

Punches are the source of truth (the audit log, the detail screen, the segment-hours source, the future correction target). `shifts` is a **maintained projection**:

1. **Backfill (idempotent):** each existing `shifts` row emits a `clock_in` punch (its `clock_in_time`) + a `clock_out` punch when set — carrying GPS / photo / area / `is_overtime`. Parity assert: the derived session must equal the old `shifts` row for all historical data.
2. **One session row per `(user, service_day, shift_definition)`**, kept in the existing `shifts` table with its **stable `id`**. After every punch, the session is recomputed from that key's punches and upserted: `clock_in_time` = first-in; `clock_out_time` follows the **last-punch rule** — set to the last `clock_out` when the session is closed, **cleared (NULL) on a re-entry `clock_in`** so `clock_out_time IS NULL` still means "open". A break/re-entry (IN, OUT, IN) is one session row (spanning the gap); the middle OUT lives only in the punch log; worked minutes come from the paired segments, not `clock_out − clock_in`.
3. **All four FKs are preserved** — `activities` / `location_logs` / `overtime` / `user_tracking_status` keep pointing at the session row's `id`; **no re-point, no cascade rewrite.** Field-readers (`clock_out_time IS NULL`, GPS, area) are unchanged. Readers migrate off `shifts` onto the derivation service reader-by-reader (Phases 2–5); when nothing reads `shifts` directly, it can be dropped — but that is the *last* step, not the cutover.
4. If punches and the session row ever disagree, **punches win** — the row is rebuildable from them.
3. Migrate each reader to the derivation service reader-by-reader; retire `shifts` once nothing reads it.

### Scope — v1 is approval-free; correction deferred

- **Punches are always immediate** — the live map, staffing counts, and geofence read them in real time; a queued punch would blank a worker off the map. No approval on punches.
- **Koreksi Kehadiran** (an approval-gated overlay to fix a missed/wrong punch — *lupa clock out*, forgot to clock in) is **deferred**. Its approver has no stable home while satgas/linmas/korlap carry no `users.rayon_id` (their rayon is schedule-derived, ADR-053), and korlap's tie to a worker is itself schedule-derived. Not urgent → v1 has **no approval subsystem at all**. When correction returns, the approver is routed from **the schedule's rayon on the target date** (roster row → district → its `admin_rayon`/`kepala_rayon`), or an admin-only web action. Until then a forgotten clock-out is a flagged `lupa_clock_out` (never auto-closed), visible in the log.
- **Companion cleanup:** null `users.rayon_id` on satgas/linmas/korlap — vestigial per ADR-053. Gated on an audit: every read of a non-manager's `rayon_id` must first be repointed to the schedule-derived rayon.

### Design details the implementation must honor

Surfaced by architecture review — each closes a gap that would otherwise be a bug.

1. **One definition of "open".** A session is open ⟺ its **last punch (by `punched_at`) is a `clock_in`**. This single rule drives `bertugas`, `lupa_clock_out`, and clock-out validity; segment pairing conforms to it (a `clock_out` closes everything open before it, so `IN1, IN2, OUT1` leaves nothing open → `pulang`). Presence and hours can never disagree because both read the same rule — do **not** derive "open" from `count(in) > count(out)`, which would say `IN1, IN2, OUT1` is still open.
2. **Ordering is by `punched_at`, not arrival.** Offline sync (ADR-002) delivers punches late and out of order; derivation always sorts by `punched_at`, and a late punch recomputes its session. "Last punch" is by `punched_at` too.
3. **Idempotent punches.** Each punch carries a **client-generated `id` (uuid)**; sync is an upsert on it, so an offline retry never double-inserts (offline-first contract, ADR-002/019, at the punch grain).
4. **Clock-out validation is a client guard; the server is append-only.** "Clock-out needs an open clock-in" is enforced **on-device** against local state (which knows the queued clock-in). The server never refuses a punch — it accepts append-only and the derivation simply **ignores an unpaired `clock_out`** rather than rejecting a sync that may arrive before its clock-in.
5. **Overtime (ADR-014) stays first-class.** An overtime punch carries `is_overtime = true` (usually `shift_definition_id = null`); it derives the same way but counts as `lembur` only with an approved overtime record (ADR-050). The pair's `is_overtime` moves onto the punch.
6. **Live path stays event-sourced.** A punch **emits the same status-change event** that already feeds the [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md)/[ADR-046](./ADR-046-monitoring-subject-model.md) aggregate; the live map/counts read the aggregate, **never** a per-render group-by over punches. The derivation service serves only the off-hot-path reads (log, detail, hours).
7. **Write path cuts over immediately; `user_tracking_status.shift_id` is re-pointed.** Clock-in/out start inserting **punches** on day one; `shifts` is rebuilt from them as a read projection for un-migrated readers (so it's the *readers*, not the writers, that migrate gradually). Because a derived `shifts` row has no stable id, `user_tracking_status.shift_id` (an FK today) is re-pointed to `(service_day, shift_definition_id)` — or the current open clock-in punch id — before the FK-holding readers move.

### Screens (mobile)

- **Pencatatan Waktu** — shift/day selector + Clock In / Clock Out label, Jam Masuk/Keluar, out-of-area notice, map.
- **Log Pencatatan Waktu** — period filter → per-day rows (date + shift).
- **Detail** — a day's punch list (timestamp, label, `Status Lokasi`, photo).

## Consequences

### Positive
- One rule (punch → derive) covers unlimited clock-in/out, multi-shift, back-to-back, past-midnight, dangling, ad-hoc, and multi-place — cases the pair row could not express.
- The dangling-blocks-clock-in bug (an ADR-050 violation) disappears by construction; no `SHIFT_ALREADY_ACTIVE` guard to get wrong.
- No stored interpretation of a session → the drift class ADR-050 warns about cannot recur at the attendance layer either.
- Presence, counting, and the schedule model are **preserved**, not rewritten — this is a storage/derivation change under a stable contract.
- An immutable, append-only log is naturally auditable and offline-friendly (ADR-002): a queued punch is a fact to insert, never a row to reconcile.

### Negative
- Deriving the session per read adds a group-by over punches where a single `shifts` row used to answer directly; must stay inside the aggregate-feed / cache model of [ADR-046](./ADR-046-monitoring-subject-model.md) / [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md).
- A real migration with a compatibility view and reader-by-reader cutover — coordination cost, and a period where two representations coexist.
- **Residual edges (accepted):** a past-cutoff dangling shift has no worker-side fix in v1 (needs the deferred correction); overlapping schedules make tagging ambiguous (tiebreak: nearest start; real fix is the deferred overlap-block); an on-leave worker who punches reads `bertugas` (flag, never block); hours credit from the *first* clock-in, so a stray early punch inflates them (correction fixes later).

### Security
- No change to visibility: presence and counts are computed over the same scope-filtered set ([ADR-044](./ADR-044-dynamic-rbac.md) `monitoring_scope`). Punches carry GPS/photo like today's `shifts`; append-only storage removes the edit surface entirely (corrections, when built, are a separate audited overlay).

## Alternatives Considered

1. **Keep the `shifts` pair, add flags/guards for each case.** Rejected — every scenario needs another special case (a second-open-shift guard, a which-to-close picker, a cross-midnight patch), repeating the overload that this ADR removes. The pair cannot express `IN, IN, OUT` at all.
2. **Punch log, but hard-cut every reader at once.** Rejected — rewriting presence + monitoring + hours + web simultaneously against a live map is high-risk; the derived-view lets us cut over reader-by-reader.
3. **Worked hours = first-in → last-out (breaks count as worked).** Rejected — segments are correct for payroll; first/last is kept only for the *display* of Masuk/Keluar.
4. **Approve every punch (Catapa marks each `Disetujui`).** Rejected for v1 — a queued clock-in blanks the worker off the live map; punches must be immediate. Approval belongs to corrections, which are deferred.

## References
- [ADR-050](./ADR-050-presence-attendance-model.md) — presence lifecycle + live axes (contract preserved; source re-based here)
- [ADR-053](./ADR-053-schedule-row-per-place.md) — presence belongs to `(worker, shift, service-day)`, not the row (made literal by the punch key)
- [ADR-047](./ADR-047-schedule-redesign.md) — events → occurrences; the roster a punch reads to pick its shift
- [ADR-013](./ADR-013-multi-area-assignment.md) — expected/present/absent
- [ADR-046](./ADR-046-monitoring-subject-model.md) / [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md) — aggregate-feed performance envelope the derivation must live in
- [ADR-002](./ADR-002-offline-first-mobile.md) — offline-first; a punch is an append, not a reconcile
- Test target: `../../testing/presence-model-matrix.md` (Layer 1 lifecycle cases now assert against the punch derivation)
- Feature spec: `../../features/attendance/README.md`
