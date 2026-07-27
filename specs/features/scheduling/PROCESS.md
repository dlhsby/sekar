# Scheduling · Shifts · Attendance · Presence — how it actually works

One page for the whole workflow, plus the scenario matrix it is tested against.
Rationale lives in the ADRs ([047](../../architecture/decisions/ADR-047-schedule-redesign.md) ·
[050](../../architecture/decisions/ADR-050-presence-attendance-model.md) ·
[053](../../architecture/decisions/ADR-053-schedule-row-per-place.md) ·
[055](../../architecture/decisions/ADR-055-punch-attendance-model.md) ·
[056](../../architecture/decisions/ADR-056-schedule-status-lifecycle.md)); this
page is the operational summary and the test contract.

---

## The four processes

### 1. Rule → roster (ADR-047)

```
ScheduleEvent  ──materializer──►  schedules rows  ──beyond horizon──►  virtual (is_projected)
(recurrence, shift,               one per worker
 scope, target)                   per WIB day per PLACE
```

- A **`ScheduleEvent`** is the rule: recurrence (`none | daily | every_n_days | weekly | specific_dates`), one shift, a scope (`city | district | mobile→region | static→location`), and a target (one worker, or a team = PIC + members).
- The **materializer** expands it into `schedules` rows over a rolling horizon (`schedule.materialization_days`, **default 60**) at 00:15 and 17:00 WIB plus a boot self-heal. Rows past the horizon are returned as **virtual `is_projected`** rows — visible, not persisted.
- **One row = one worker, one shift, one place** (ADR-053). A worker covering three lokasi holds three rows; they are still **one person** for staffing counts.
- Existing rows — including **soft-deleted tombstones** — are treated as occupied, so a deleted occurrence is never resurrected.
- Overlaps are **warned, not rejected** (Google-Calendar behaviour): the row is created and the conflict reported in `materialization.conflicts[]`.
- Edit scopes: **this** (detaches the row, `is_detached`, never regenerated) · **this-and-future** (bounds the old event, starts a new one) · **series** (re-materializes future non-detached rows).

### 2. Punch → session (ADR-055)

```
attendance_punches (append-only, immutable)  ──projection──►  shifts (one row per session)
                                                              keyed (user, service_day,
                                                                     shift_definition, is_overtime)
```

- A punch is a **fact**: never updated, never deleted. `service_day` is explicit, not derived from `punched_at` — that is what makes a 02:00 clock-out belong to yesterday's Shift 3.
- `shifts` is a **maintained projection**, rebuilt from the punch stream after every punch. Multiple in/out pairs in one shift (breaks) collapse into one session.
- **Attribution** ranks candidate shifts `covering > early > grace`, tie-broken by nearest start. The window is `[start − early_window_min, end + cutoff_grace_min)`, per shift definition. Past that, there is no candidate and the punch is **ad-hoc**.
- Clock-in is **never blocked**. Geofence violations set `outside_boundary` (advisory); an operator's explicit shift choice is honoured only if it matches a real candidate.
- **Overtime is its own session** (`is_overtime`). It therefore never satisfies a normal roster row — an overtime punch alone leaves that row a no-show. Its *existence* is what turns past-end presence from `lupa_clock_out` into `lembur`, so the two facts are read separately.

### 3. Roster status lifecycle (ADR-056)

`schedule.status` is the **persisted** roster outcome:

```
planned ──clock-in──► present
   │
   └──window + cutoff_grace_min elapsed, no punch──► absent
```

- `present` is written **synchronously on clock-in** (non-overtime only).
- `absent` is written by the **hourly** `ScheduleAbsenceCron`, bounded by `schedule.absence_sweep_lookback_days` (**default 7**; `0` = unbounded, for a deliberate backfill).
- Web and mobile additionally apply `effectiveScheduleStatus` **at render**, so a closed window reads "Tidak Hadir" immediately rather than waiting up to an hour. Display and cron use the *same* rule, so they cannot disagree.
- Operator-set values: `leave_sick | leave_annual | leave_permit`, `replaced`, `off`.

### 4. Presence — three axes (ADR-050)

Never stored; **derived on read** from (roster row + session + shift window + leave).

| Axis | Values | Where |
|---|---|---|
| **Lifecycle** | `tidak_bertugas` · `belum_hadir` · `terlambat` · `bertugas` · `pulang` · `tidak_hadir` | `derivePresenceState()` |
| **Flags** | `is_late` · `ad_hoc` · `lupa_clock_out` · `lembur` · `early` · `excused` | same |
| **Live** | activity `active/offline` + `is_within_area` (orthogonal — a worker can be active AND outside) | `user_tracking_status` |
| **Counting** | counts toward staffing only if `bertugas ∧ scheduled ∧ role ∈ {satgas, linmas}`; multi-place counted **once** | `dayBoard.ts` |

**Roster reads carry the axes.** `/schedules/range`, `/schedules/date/:date`, `/schedules/my/day` **and `/schedules/my`** attach `lifecycle_state`, `lifecycle_flags`, `leave_reason`, `is_within_area`, `is_scheduled` via `RosterPresenceService` — only for rows dated **today or earlier** (`lifecycle_state: null` on a future row means *not applicable*, not "off duty").

**One tone, every surface** — `occurrenceTone()` in `apps/web/src/lib/presence/tone.ts` is the single rule, used by the day-board bullet, the month/week chips and the detail pill:

| Tone | Meaning |
|---|---|
| grey | rostered, not started (`belum_hadir` pre-grace, `planned`) |
| **green** | on duty, inside area |
| **amber** | on duty, **outside** area |
| orange | terlambat |
| yellow | belum hadir past grace |
| **red** | tidak hadir (no-show) |
| blue | approved leave (cuti / sakit / izin) |
| dark grey | pulang |
| purple | ad-hoc (clocked in, unscheduled) |

Mobile collapses these nine into five (`ok / warn / bad / info / neutral`) via `statusHelpers.presenceTone`; the inputs and precedence are identical, so the semantics match and only the colour resolution differs.

> ⚠️ **Two time conventions coexist — do not mix them.**
> `isShiftWindowClosed` / `ShiftAttributionService` take **WIB-wall-clock-in-UTC-fields** (`TimezoneUtil.jakartaNow()`).
> `derivePresenceState` / `resolveShiftWindow` take **real instants** (`new Date()`).
> Passing `jakartaNow()` to the second family shifts the clock twice (+14h). That bug derived tomorrow's rows and aged today's toward `tidak_hadir`; it is now pinned by a test.

---

## Scenario matrix

Expected values for each case. **Tone** is the web day-board bullet; **Counted** is staffing.
`✱` = covered by an automated test today.

### Materialization

| # | Scenario | Expected |
|---|---|---|
| S1 ✱ | recurrence `none` | exactly one occurrence, on `start_date` |
| S2 ✱ | `daily`, open-ended | one row per day to the horizon |
| S3 ✱ | `every_n_days` (2–30) | rows every N days from `start_date` |
| S4 ✱ | `weekly` + weekday set | rows only on those weekdays |
| S5 ✱ | `specific_dates` | rows only on the listed dates (must fall inside `[start, end]`) |
| S6 | team event | fan-out to PIC + every member; conflicted members reported, the rest scheduled |
| S7 ✱ | multi-place worker | N rows sharing `(user, date, shift)`; **counted once** |
| S8 ✱ | overlapping shift | row **created** + conflict warned; never rejected |
| S9 | edit *this* | row detached (`is_detached`), never regenerated |
| S10 | edit *this-and-future* | old event gets `end_date`; a new event continues |
| S11 | edit *series* | future non-detached rows re-materialized; tombstones survive |
| S12 | delete occurrence | soft-delete tombstone; next cron must **not** resurrect it |
| S13 | beyond horizon | virtual row, `is_projected: true`, not persisted |
| S14 | holiday / special day | roster **still** generated — the override only selects the capacity day-type |

### Attendance

| # | Scenario | Roster | Lifecycle | Flags | Tone | Counted |
|---|---|---|---|---|---|---|
| S15 ✱ | clock in inside window | `present` | `bertugas` | — | green | ✔ |
| S16 ✱ | clock in within `early_window_min` | `present` | `bertugas` | — | green | ✔ |
| S17 ✱ | clock in after start + grace | `present` | `bertugas` | `is_late` | green¹ | ✔ |
| S18 | clock in past end + `cutoff_grace_min` | *(none)* | `bertugas` | `ad_hoc` | purple | ✘ |
| S19 | breaks — several in/out pairs | `present` | `bertugas` | — | green | ✔ |
| S20 ✱ | back-to-back shifts | two sessions; home hero shows "Berikutnya" | | | | ✔ |
| S21 ✱ | Shift 3 across midnight | `service_day` = start day; 02:00 next day still on duty | `bertugas` | — | green | ✔ |
| S22 ✱ | forgot clock-out | `present` | `bertugas` | `lupa_clock_out` | green¹ | ✔ |
| S23 ✱ | past end **with an approved overtime session** | **untouched** | `bertugas` | `lembur` | green | ✔ |
| S23 ✱ | overtime session **alone** (no normal session) | `planned` | `tidak_hadir` | — | red | ✘ |
| S24 | offline clock-in | queued; replayed with original `punched_at` + `client_uuid` | | | | |
| S25 | duplicate replay | idempotent — no second punch | | | | |
| S26 | GPS outside boundary | recorded, `outside_boundary` set; **never blocked** | | | amber² | ✔ |
| S27 | city-scope worker | geofenced against **every** rayon | | | | ✔ |
| S28 | shift-picker choice | honoured only if it matches a real candidate | | | | |

¹ the flag carries the exception; the tone stays green because the worker *is* on duty.
² amber once the live axis reports `is_within_area: false`.

### Presence

| # | Scenario | Roster | Lifecycle | Tone | Counted |
|---|---|---|---|---|---|
| S29 ✱ | scheduled, before start + grace | `planned` | `belum_hadir` | grey→yellow | ✘ |
| S30 ✱ | scheduled, past end + grace, no punch | `planned`→`absent` | `tidak_hadir` | **red** | ✘ |
| S31 ✱ | on duty, inside area | `present` | `bertugas` | green | ✔ |
| S32 ✱ | on duty, **outside** area | `present` | `bertugas` | **amber** | ✔ |
| S33 | on duty, GPS stale | `present` | `bertugas` | green | ✔ |
| S34 ✱ | clocked out | `present` | `pulang` | dark grey | ✘ |
| S35 ✱ | leave `cuti` / `libur` | `leave_annual` | `tidak_bertugas` + `excused` | blue | ✘ |
| S36 ✱ | leave `sakit` / `izin` | `leave_sick`/`_permit` | `tidak_hadir` + `excused` | blue | ✘ |
| S37 ✱ | `replaced` | `replaced` | `tidak_bertugas` | grey | ✘ |
| S38 ✱ | `off` | `off` | `tidak_bertugas` | grey | ✘ |
| S39 | korlap on duty | `present` | `bertugas` | green | ✘ *(monitorable, not counted)* |
| S40 | worker with no row | — | — | — | listed in **Belum Dijadwalkan** |

### Migration

| # | Check | Tool |
|---|---|---|
| M1 | standing templates already daily | verifier §2 |
| M2 ✱ | remaining one-offs promoted to daily, idempotently | `schedules:to-daily` (dry-run → `--apply` → re-run = 0) |
| M3 | clockable workers with no event | verifier §4 — **reported, never auto-created** |
| M4 | duplicate `(user, date, shift, place)` | verifier §5 — **hard gate**; migration `17517` aborts otherwise |
| M5 ✱ | first absence sweep is bounded | verifier §8 + `absence_sweep_lookback_days` |
| M6 | unreferenced shift definitions | verifier §6 |
| M7 | horizon reached matches config | verifier §7 |

---

## Verification

```bash
# Pure + service scenarios
cd apps/be   && npx jest src/modules/schedules src/modules/shifts src/modules/monitoring
cd apps/web  && npx jest          # Calendar/tone are shared — run the whole suite
cd apps/mobile && npx jest

# End-to-end: real DB state -> real API -> asserted presence (22 scenarios)
bash apps/be/scripts/e2e-presence-scenarios.sh

# Against a real dataset (staging clone)
psql "$DATABASE_URL" -f apps/be/scripts/staging-verify-schedules.sql   # before + after, then diff
cd apps/be && npm run schedules:to-daily                              # dry run
cd apps/be && npm run schedules:to-daily -- --apply                   # write, then re-run → 0
```

> A green unit test can still assert an unreachable path. `lembur` was covered by a unit test that hand-fed `session.is_overtime` — a value the service could never produce, because it filtered overtime sessions out. Only the end-to-end script caught it. Prefer driving state through the API for anything whose inputs are assembled by a service.

Manual pass worth doing once per release: clock in → the roster row flips **Hadir** and the same worker reads identically on the day board, the month chip and the detail modal; walk a worker outside their area and confirm **amber** on all three; leave a shift un-clocked past its window and confirm **red** appears immediately (before the cron).
