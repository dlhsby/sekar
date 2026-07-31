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
- A forgotten clock-out is **never auto-closed** — the punch log stays immutable — but the worker stops being *live* past the shift's `cutoff_grace_min`: they read `pulang` (flag retained), leaving the monitoring map and the staffing count. Otherwise one missing punch reports someone on duty for days and hides a real shortfall. Approved overtime is the exception and keeps them live.
- Clock-in is **never blocked**. Geofence violations set `outside_boundary` (advisory); an operator's explicit shift choice is honoured only if it matches a real candidate. Because nothing blocks and nothing is approved, mobile raises a **pre-punch confirm** naming every reason the punch will read unfavourably (S17/S18/S26 and pulang-cepat) — informational, cancel-only.
- **Only ACTIVE shift definitions** are used anywhere: pickers, attribution candidates, event validation, materialization and projection all filter `is_active`. Retiring a shift stops it producing roster rows.
- **`crosses_midnight` is validated, not trusted.** It must equal `end_time <= start_time`; a contradicting value is rejected. Clear it on a 21:00–05:00 shift and every window reads as ending that same morning — already closed before it starts — so every night worker becomes an instant no-show. Set it on a day shift and the window looks 33 h long, so nobody is ever late or absent.
- **Overtime is its own session** (`is_overtime`). It therefore never satisfies a normal roster row — an overtime punch alone leaves that row a no-show. Its *existence* is what turns past-end presence from `lupa_clock_out` into `lembur`, so the two facts are read separately.

### 3. Roster status lifecycle (ADR-056)

`schedule.status` is the **persisted** roster outcome:

```
planned ──clock-in──► present
   │
   └──window + cutoff_grace_min elapsed, no punch──► absent
```

- `present` is written **synchronously on clock-in** (non-overtime only).
- `absent` is written by the **hourly** `ScheduleAbsenceCron`, bounded by `schedule.absence_sweep_lookback_days` (**default 7**).
  > **First deploy needs one backfill.** The bound means rows older than the window are never persisted `absent` — the UI still flips them at render, but a report reading raw `status` sees `planned` forever. Run `npm run schedules:sweep-absences -- --all` (dry run) then `--all --apply`, once, after the first deploy. The 2026-07-28 rehearsal measured **36 390 rows / 27 days** on real staging, so this is required rather than optional. Verifier §8 reports the current number.
- Web and mobile additionally apply `effectiveScheduleStatus` **at render**, so a closed window reads "Tidak Hadir" immediately rather than waiting up to an hour. Display and cron use the *same* rule, so they cannot disagree.
- Operator-set values: `leave_sick | leave_annual | leave_permit`, `replaced`, `off`.

### 4. Presence — three axes (ADR-050)

Never stored; **derived on read** from (roster row + session + shift window + leave).

| Axis | Values | Where |
|---|---|---|
| **Lifecycle** | `tidak_bertugas` · `belum_hadir` · `terlambat` · `bertugas` · `pulang` · `tidak_hadir` | `derivePresenceState()` |
| **Flags** | `is_late` · `ad_hoc` · `lupa_clock_out` · `lembur` · `early` · `excused` | same |
| **Live** | activity `active/offline` + `is_within_area` (orthogonal — a worker can be active AND outside) | `user_tracking_status` |
| | *only trusted while `bertugas` **and** the GPS fix is newer than `monitoring.active_max_age_sec` (600 s) — a per-worker snapshot lives forever, and a stale one would report a days-old position as current* | |
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

> **Time convention: real instants, one rule.** Everything that answers "where is this worker in their shift window" — `isShiftWindowClosed`, `derivePresenceState`, `resolveShiftWindow` — takes a **real instant** (`new Date()`), and `isShiftWindowClosed` resolves its window with the same `resolveShiftWindow` helper the presence engine uses.
>
> It was not always so: `isShiftWindowClosed` took a WIB-wall-clock-in-UTC-fields value (`TimezoneUtil.jakartaNow()`, which pre-adds +7 h) while the presence engine took real instants. Feeding one to the other shifted the clock **twice (+14 h)** — it derived tomorrow's rows and aged today's toward `tidak_hadir`. Both families now agree, so there is nothing left to mix up. `TimezoneUtil.jakartaNow()` remains only for *calendar-day* maths (`jakartaDateString`); never pass it to a window function.

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
| S14 | holiday / special day | roster **still** generated for daily events — a Hari Libur override only selects the capacity day-type. Mark people `off`/on leave if they genuinely are not working. |

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
| S22 ✱ | forgot clock-out, **inside** cutoff grace | `present` | `bertugas` | `lupa_clock_out` | green¹ | ✔ |
| S22b ✱ | forgot clock-out, **past** cutoff grace | `present` | `pulang` | `lupa_clock_out` | dark grey | **✘** |
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

## Known limits

| | |
|---|---|
| **Forgotten clock-outs never close** | A punch is immutable and a `lupa_clock_out` is **never auto-closed** (ADR-055). Koreksi Kehadiran — the approval-gated correction — is **dropped**, not deferred: no approver can be assigned. So the record keeps the open session forever, by design. What it does **not** do any more is distort the live view: past the shift's `cutoff_grace_min` the worker leaves `bertugas` for `pulang` (flag retained), so they drop off the monitoring map and out of the staffing count. Verifier §10 lists open sessions per day; a rising count means clock-out reminders are not landing. |
| **Photo verification is not enforced** | `selfie_photo` is `@IsOptional()` on the clock-in DTO, so a punch with no photo is accepted — on the staging clone only **7 % of clock-ins** carry one. Making it mandatory is a product call (a hard requirement blocks a worker whose camera fails), so nothing was changed; verifier §11 makes the number visible. Punch photos are S3 URLs with **zero** inline data-URIs, so attendance does not carry the F9 OOM risk. |
| **Roster range is capped, not paginated** | `/schedules/range` refuses a request over **60 000 rows** with a message telling the operator how to narrow it, rather than OOMing the container mid-serialize. A month across every rayon (~31 k rows / 38 MB) still passes. Real pagination is the eventual fix. |

## Verification

```bash
# Pure + service scenarios
cd apps/be   && npx jest src/modules/schedules src/modules/shifts src/modules/monitoring
cd apps/web  && npx jest          # Calendar/tone are shared — run the whole suite
cd apps/mobile && npx jest

# End-to-end: real DB state -> real API -> asserted presence (22 scenarios)
ALLOW_MUTATION=yes bash apps/be/scripts/e2e-presence-scenarios.sh   # sim clone only

# Against a real dataset (staging clone)
psql "$DATABASE_URL" -f apps/be/scripts/staging-verify-schedules.sql   # before + after, then diff
cd apps/be && npm run schedules:to-daily                              # dry run
cd apps/be && npm run schedules:to-daily -- --apply                   # write, then re-run → 0
cd apps/be && npm run schedules:sweep-absences -- --all               # one-off absence backfill (dry run)
cd apps/be && npm run typecheck:scripts                               # scripts/ is typechecked too
```

> A green unit test can still assert an unreachable path. `lembur` was covered by a unit test that hand-fed `session.is_overtime` — a value the service could never produce, because it filtered overtime sessions out. Only the end-to-end script caught it. Prefer driving state through the API for anything whose inputs are assembled by a service.

Manual pass worth doing once per release: clock in → the roster row flips **Hadir** and the same worker reads identically on the day board, the month chip and the detail modal; walk a worker outside their area and confirm **amber** on all three; leave a shift un-clocked past its window and confirm **red** appears immediately (before the cron).
