# Manual UAT — Revamp Acceptance Test Plan

End-to-end **manual** acceptance testing for everything shipped in the post-UAT revamp
(ADR-044…052): dynamic RBAC + role renames, 4-level geography (city → district → region
→ location), monitoring drill-down + 3-axis presence + teams, scheduling occurrences,
**scope-aware tasks & activities**, pruning intake, and i18n. Covers **backend (API),
web, and mobile** for **all 9 roles**.

> Companion docs: automated coverage in [`strategy.md`](strategy.md) ·
> personas/edge cases in [`test-data.md`](test-data.md) · presence rules in
> [`presence-model-matrix.md`](presence-model-matrix.md). This doc is the **human**
> pass — run it before a staging cut.

**How to use:** work top-to-bottom. Every case has **Steps → Expected → Result** (mark
✅/❌/➖-blocked). Do the **Setup** and **Prepare data** sections first; then Backend →
Web → Mobile; finish with the **role × feature matrix** and **sign-off**.

---

## 0. Environment setup

### 0.1 From scratch (first run on a clean machine)

```bash
# From project root — one command does env files, all installs, infra, migrations, seed.
./scripts/setup.sh          # prompts before the destructive seed (or --yes to auto-seed / --skip-seed)
./scripts/start.sh          # backend + web (background) + Metro (foreground)
# or individually: ./scripts/start-be.sh · start-web.sh · start-mobile.sh [--android]
```

`setup.sh` runs, in order: prerequisite check → env files → root install → **infra up**
(Postgres, MinIO, Redis, Adminer via Docker) → backend install → **`migration:run`** (builds
the whole schema from the 80-migration ledger) → optional **`db:seed`** (demo profile). A
correct first run applies all 80 migrations and seeds without error.

| Service | URL / detail |
|---|---|
| Backend API | `http://localhost:4110/api/v1` (Swagger UI: `/api/v1/docs`) |
| Web | `http://localhost:4120` |
| Mobile (emulator) | Metro on `:8081`; app points at `API_BASE_URL=http://10.0.2.2:4110` |
| Postgres · Adminer · MinIO | `:15432` · `:8082` · `:9000/9001` (creds in `infra/.env`) |

### 0.2 Clean reset / recovering from a migration error

The schema is built **only** by the migration ledger (`DATABASE_SYNCHRONIZE=false`). Two
situations leave a database that `migration:run` cannot advance — both fixed by dropping and
recreating the DB, then re-running setup:

- **"relation … already exists"** — the DB was built by a prior `db:seed`/`start.sh`
  auto-sync (which fills the schema but leaves `typeorm_migrations` empty), so migrations
  can't run over it.
- **"relation … does *not* exist"** (e.g. `area_staff_requirements`, `regions`) — a
  half-migrated or stale DB from an older checkout.

```bash
# Destructive full reset — wipes all local data, then rebuilds from the ledger + reseeds.
docker exec sekar-postgres psql -U postgres -c 'DROP DATABASE sekar_db; CREATE DATABASE sekar_db;'
./scripts/setup.sh --yes        # re-migrate + seed non-interactively
```

> **Migration hygiene (why the above happens):** TypeORM keys each applied migration by
> **class-name + timestamp**. Never rename a *shipped* migration class or edit its timestamp —
> every deployed DB recorded the original name, so a rename makes TypeORM re-run a destructive
> `up()` against a schema that has moved on. Two such defects were fixed (a class renamed by the
> rayon→district sweep, and a 13-digit timestamp typo that mis-sorted a migration before its
> dependencies) so that **a from-scratch `migration:run` completes cleanly**.

### 0.3 Reseed to a clean baseline (destructive — keeps schema, replaces data)
```bash
cd apps/be && npm run db:seed          # demo profile — safe to re-run anytime the schema is current
```

**Login convention (all platforms):** authenticate with **`identifier`** (username *or*
phone) + **`password`**. **Every seeded account uses password `12345678`** (superadmin may
use `SEED_SUPERADMIN_PASSWORD` if configured). Phone login also works (e.g. satgas_pusat_1 → `081300000002`).

---

## 1. Test credentials (per role)

All passwords `12345678`. Pick the role you're testing; the "scope" column tells you what
that account should be able to see/do.

| Role | Username(s) | Scope |
|---|---|---|
| **satgas** (field worker) | `satgas_pusat_1`, `satgas_taman_bungkul_1`, `satgas_timur_1_2` | Bound to one location |
| **linmas** (security) | `linmas_pusat_1`, `linmas_taman_aktif_1`, `linmas_timur_2_1` | Location / district |
| **korlap** (field coordinator) | `korlap_pusat_1`, `korlap_utara_1`, `korlap_timur_1_1` | Their scheduled area(s) |
| **admin_rayon** (rayon data admin) | `admin_rayon_pusat_1`, `admin_rayon_utara_1` | One district (rayon) |
| **kepala_rayon** (rayon head) | `kepala_rayon_pusat_1`, `kepala_rayon_timur_1_1` | One district (rayon) |
| **management** | `management_1` | City (whole Surabaya) |
| **admin_system** | `admin_system_1` | City + full system config |
| **superadmin** | `superadmin` | City + everything |
| **staff_kecamatan** (external intake) | `staff_kecamatan_bubutan_1`, `staff_kecamatan_asemrowo_1` | One kecamatan → district |

Counts: satgas 11 · linmas 8 · korlap 8 · admin_rayon 8 · kepala_rayon 8 · management 1 ·
admin_system 1 · superadmin 1 · staff_kecamatan 30.

---

## 2. Seed-data reference & known gaps

### 2.1 Shifts & today's roster
| Shift | Window (WIB) | Scheduled today |
|---|---|---|
| Shift 1 | 06:00–15:00 | 12 (incl. satgas_pusat_1, satgas_taman_bungkul_1, satgas_taman_flora_1, satgas_timur_1_2) |
| Shift 2 | 15:00–23:00 | 7 |
| Shift 3 | 21:00–05:00 | 5 |

Pre-clock-in the roster reads **21 expected / 21 absent / 0 active** (correct — nobody has
clocked in yet). Only **satgas + linmas** count toward staffing.

### 2.2 Clock-in coordinates (to make a worker "active" on the monitoring map)
| Username | Shift | Location | lat, lng |
|---|---|---|---|
| `satgas_pusat_1` | 1 | Air Mancur Pemuda | -7.26443130, 112.74562839 |
| `satgas_taman_bungkul_1` | 1 | Taman Bungkul | -7.29138135, 112.73982642 |
| `satgas_timur_1_2` | 1 | TAMAN BUK TONG | -7.28756423, 112.76316377 |
| `satgas_pusat_3` | 2 | Jl. Ahmad Jaiz | -7.25364327, 112.73785415 |

### 2.3 Schedule scope variants (see them on the monitoring map / schedule board)
`scripts/stage-presence-scenarios.ts` owns every demo assignment (the seeder creates none) and
writes **recurring** `daily` events, so the board is populated today *and* every day forward to
the materialization horizon (**60 days**) — not just the day you seeded.

**`SAMPLE <level> × <role>`** — one satgas + one linmas + one korlap + one team at **each** of
city / district / region / location, so every board tier and role column has content. Coherence
rule: a worker is only ever scoped inside their **own rayon** (city is the deliberate exception,
and its crew is drawn one-per-rayon so it doesn't look like a single rayon's staff).

**`RESCHEDULE <shift> × <user>`** — the rescheduling cohort `satgas_shift_1..3`,
`linmas_shift_1..3`, `korlap_shift_1..3`, `tim_shift_<n>_<1,2>`: a full role set per shift, all
on **city** scope, for dragging between Shift 1/2/3 without disturbing a presence scenario.

**Team categories (4):** Penanaman, Penyapuan, Penyiraman, Penyiraman/Perawatan — each with
its own marker glyph + color.

### 2.4 Other data
| Entity | Count / note |
|---|---|
| Districts (rayon) | 8 · Regions (kawasan) 129 · Locations 953 (all now carry `district_id`; **363 region-less** — hang directly off a district, for the district-drill "regions ∪ region-less locations" case) |
| **Tasks** | **18**, covering **every status** (pending 5 / assigned 5 / accepted 1 / declined 1 / in_progress 2 / completed 2 / verified 1 / revision_needed 1) and **every scope** (location 7 / district 4 / region 3 / city 2 / none 2) — seeded by the task seeder |
| Pruning requests | **31**, spanning all statuses (submitted 6 / under_review 3 / approved 4 / rejected 4 / assigned 4 / in_progress 4 / done 3 / cancelled 3) |
| Activities | 62 (a few linked to tasks) |
| App releases | 1 published (mobile update-checker returns 200) |

### 2.5 Seed coverage notes
The demo seed now provides adequate UAT coverage for all core workflows. Two loader bugs
were fixed so the data seeds correctly: `loadKawasanSnapshot` and `loadAreaSnapshot` were
reading `district_id` from a snapshot that still uses `rayon_id`, which had left **regions
with no district** and **all 953 locations with a NULL `district_id`** (breaking the
district drill + task/district scoping). Both now normalize the key.

**Seeder gotcha worth knowing (fixed 2026-07-23).** `lib/ids.ts` pins `RAYON_BARAT1_ID` /
`RAYON_BARAT2_ID` to their **pre-rename** codes on purpose — that is what keeps each kawasan and
lokasi attached to the row it has always belonged to. The two rayon later swapped display names,
so seeding *people* from those codes put "Satgas Barat 1 Satu" inside **Rayon Barat 2**, which
read on the board like a korlap drifting onto the wrong scope. Geography keeps its codes; people
now follow the display name (`DISTRICT_NAMED_BARAT_1_ID` / `_2_ID`). If you ever see a user whose
name and rayon disagree, that is the class of bug to look for.

If you need extra ad-hoc tasks during UAT, create them via the API — e.g. a district task:
```bash
API=http://localhost:4110/api/v1
KTOK=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"korlap_timur_1_1","password":"12345678"}' | jq -r .access_token)
curl -s -X POST $API/tasks -H "Authorization: Bearer $KTOK" -H 'Content-Type: application/json' \
  -d '{"title":"Penyiraman keliling Rayon","assigned_to":"<satgas_uuid>","scope":"district","district_id":"<district_uuid>","priority":"high"}'
# Auto-scope (omit scope → backend derives from the assignee's schedule):
curl -s -X POST $API/tasks -H "Authorization: Bearer $KTOK" -H 'Content-Type: application/json' \
  -d '{"title":"Cek tanaman baru","assigned_to":"<satgas_uuid>","priority":"medium"}'
```

---

## 2.6 How it works (conceptual primer — read before testing §6–§7)

### How schedules work (the occurrence model, ADR-047/048)
Two layers, generated forward:

1. **`schedule_events`** = the *recurring definition*. Each event carries a **scope** and a
   **recurrence**, and is either an individual or a **team** (members in `schedule_event_members`):
   - **Scope** — `city` (Seluruh Surabaya, no geo) · `district` (a rayon) · `region`/"mobile"
     (a kawasan) · `location`/"static" (one location). This scope is what places the worker on
     the monitoring map (`display_scope`).
   - **Recurrence** — `none` · `daily` · `every_n_days` · `weekly` · `specific_dates`.
   - **Team** — a `team_category` (Penanaman / Penyapuan / Penyiraman / Penyiraman-Perawatan),
     a PIC, and members; produces **one occurrence per member** but they render grouped.
2. **`schedules`** = the *materialized occurrences* — one row per user per shift **per place**,
   linked back to its `schedule_event_id`, carrying
   `district_id`/`region_id`/`location_id`/`shift_definition_id`/`status`.
   Generated via `POST /schedules/generate`; the seed pre-materializes **today's** occurrences.

**One row = one worker, one shift, one PLACE (ADR-053).** A worker who covers several places in
a shift (lokasi A in the morning, lokasi B later, a kawasan elsewhere) gets **several rows** —
that is normal, not a duplicate, and the overlap warning stays silent between them. What IS
rejected is the same worker + same shift + **same place** (`UQ_schedules_user_date_shift_place`).
Two consequences to check while testing:
- **Presence is per worker, per shift** — one clock-in produces ONE lifecycle state that every
  row for that shift shares. Several rows must never produce false `tidak_hadir`.
- **Counts are people, not rows** — a worker with two rows in a rayon shows as **1 petugas** on
  the board and in the month/week/year views, and staffs *both* lokasi while on duty
  (`assigned ∧ present`, not "standing here right now").

Read them: `GET /schedules/date/:date` (day board) · `/schedules/my` (the single row operative
*right now* — includes a cross-midnight shift still running from yesterday) ·
`/schedules/my/day` (**every** row for the day) · `/schedules/range` ·
`/schedule-events` (definitions). The **day board** (`/schedules`, web) drills
Rayon ▸ Kawasan ▸ Lokasi with shift columns (S1/S2/S3) × role rows and `n/target` staffing.
**Only `satgas` + `linmas` are scheduled/counted**; other clock-in roles are monitorable but
never counted toward staffing. A worker may also **clock in with no schedule** (ad-hoc).

### How monitoring works (drill-down + 3-axis presence, ADR-050)
**Aggregate-first, tap-driven drill** — identical on web and mobile:
`city → district → region(kawasan) → location → workers`. Tapping narrows scope; **zoom never
changes scope**. At each tier you see the child aggregate bubbles **plus** any worker whose own
`display_scope` matches that tier (individuals single, team occurrences grouped). Region-less
locations hang directly off their district (the "regions ∪ region-less" district-drill case).

A worker's presence is **three independent axes** — don't collapse them:
- **Lifecycle** (roster state): `tidak_bertugas` (not scheduled) · `belum_hadir` (scheduled, not
  yet in) · `terlambat` (late) · `bertugas` (on duty) · `pulang` (clocked out) · `tidak_hadir`
  (absent) · **excused** (on approved leave — cuti/sakit/izin/libur).
- **Live** (right now): `aktif` vs `offline`, crossed with `dalam_area` vs `luar_area`.
- **Counting** (staffing): counts **only** when `bertugas ∧ scheduled ∧ (satgas|linmas)`.

**Colour is standardised across every surface** (pills, board bullets, map pins, both platforms):
planned/not-started **grey** · bertugas inside **green** · bertugas outside **amber** ·
terlambat **orange** · belum_hadir **yellow** · tidak_hadir **red** · cuti/sakit/izin **blue** ·
pulang **dark grey** · Luar Jadwal **purple**. Resolution order is ad-hoc → leave → lifecycle, so
an excused absence never reads like a no-show. If the same worker shows one colour on the map and
another on their card, that is a bug — report it.

**Staffing is `assigned ∧ present`, not "standing here right now".** A satgas rostered to lokasi
A, B and X staffs all three while clocked in; inside/outside stays a separate, informational axis.
Above lokasi every count is **distinct workers**.

Consequences you'll verify: **ad-hoc / unscheduled clock-ins** render as distinct **"Luar
Jadwal"** markers at **city** scope (with a count chip) and are **excluded from staffing**;
**excused** workers surface in `GET /monitoring/live-users` → `on_leave_users[]` (each with its
`leave_reason`) and render as a **"Berhalangan" pill** in the roster on web + mobile.

> **Reproducing time/data-driven presence states:** the base seed shows the roster pre-shift
> (everyone `belum_hadir`/absent). To exercise `bertugas`, `terlambat`, `pulang`, excused, etc.,
> run the presence-scenario staging script — see **§11**.

---

## 3. Revamp features under test (what's new — the acceptance checklist)

| # | Feature | ADR | Where |
|---|---|---|---|
| R1 | Dynamic RBAC + role renames (`top_management`→`management`, `admin_data`→`admin_rayon`); per-role `monitoring_scope` | 044 | web `/roles`, all guards |
| R2 | 4-level geography: city → **district** → **region (kawasan)** → **location**; rayon→district rename (Indonesian UI keeps "Rayon") | 045, 052 | web master-data, monitoring, schedules |
| R3 | Monitoring drill-down (tap city→district→region→location→workers, **never zoom-to-drill**); identical web+mobile | 046 | web/mobile `/monitoring` |
| R4 | 3-axis presence (lifecycle · live aktif/offline + dalam/luar area · counting) + status 5→3 | 050 | monitoring worker detail |
| R5 | Teams as grouped map subjects (bubble → members) | 048 | monitoring |
| R6 | Ad-hoc "Luar Jadwal" — unscheduled clock-ins render at city, excluded from staffing | 050/046 | monitoring |
| R7 | Scheduling occurrences + scopes (city/district/region/location, individual/team, recurrence rules) | 047 | web `/schedules` |
| **R8** | **Scope-aware tasks & activities** — task/activity scope **follows the schedule** (city/district/region/location/none); activity submitted **against a task** inherits its scope; a **started task extends** where the worker appears on the map | **046** | web + mobile task create, activity submit |
| R9 | Pruning intake (staff_kecamatan submit → admin_rayon review) | 032/033 | web `(kecamatan)`, `/pruning-requests` |
| R10 | i18n id/en on web + mobile | 052 | everywhere (language toggle) |
| R11 | Mobile RBAC menu = role capabilities (kepala_rayon/admin_rayon get Tugas/Aktivitas/Lembur) | 044 | mobile Menu |

---

## 4. Making workers "active" (prereq for monitoring cases)

Monitoring is empty until someone clocks in. Fastest path via API (or use the mobile
Attendance screen §7):
```bash
API=http://localhost:4110/api/v1
S=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"satgas_taman_bungkul_1","password":"12345678"}' | jq -r .access_token)
# clock in at the location's coordinates (must be within geofence)
curl -s -X POST $API/shifts/clock-in -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"location_id":"<location_uuid>","gps_lat":-7.29138135,"gps_lng":112.73982642}'
# push a GPS ping so status → active
curl -s -X POST $API/location/batch -H "Authorization: Bearer $S" -H 'Content-Type: application/json' \
  -d '{"shift_id":"<shift_uuid>","locations":[{"gps_lat":-7.29138135,"gps_lng":112.73982642,"logged_at":"<now-ISO>"}]}'
```
Clock in **2 satgas at the same location** to test staffing counts, and clock in a
**team member pair** (§2.3) to see a team bubble. Clock in a satgas with **no schedule
today** to test "Luar Jadwal".

---

## 5. Backend / API UAT

Smoke via Swagger (`/api/v1/docs`) or the **Postman** collection (`postman/`, env "SEKAR - Local").

| ID | Case | Steps | Expected |
|---|---|---|---|
| BE-1 | Login shape | `POST /auth/login {identifier,password}` | 200 + `access_token`; **`username` field is rejected (400)** |
| BE-2 | `/me` scope | `GET /auth/me` as each role | carries `role`, `monitoring_scope` (city/district/region/location/none), `region_id`, `assigned_location_ids` |
| BE-3 | RBAC deny | as `satgas`, `GET /roles` | **403** (no permission) |
| BE-4 | RBAC allow | as `admin_system`, `GET /roles` | 200; 9 system roles |
| BE-5 | **Task scope — explicit** | `POST /tasks {scope:'district',district_id,assigned_to}` | 201; response `scope=district`, `district_id` set, `location_id=null` |
| BE-6 | **Task scope — auto** | `POST /tasks {assigned_to}` (omit scope) for a scheduled assignee | 201; `scope` **derived** from the assignee's schedule occurrence |
| BE-7 | Task scope — bad | `POST /tasks {scope:'location'}` (no location_id) | **400** "A location-scoped task requires location_id" |
| BE-8 | **Activity — no task** | clocked-in satgas `POST /activities {…}` | 201; `scope` from the active shift occurrence (e.g. `location`) |
| BE-9 | **Activity — from task** | `POST /activities {task_id,…}` against a district task | 201; **inherits** `scope=district`; `location_id=null` (no 500) |
| BE-10 | Monitoring city | `GET /monitoring/city` | 200; 8 districts; zeros pre-shift |
| BE-11 | Aggregate drill | `GET /monitoring/aggregate?scope=district&id=<district>` | 200; region + region-less-location nodes |
| BE-12 | Snapshot | `GET /monitoring/snapshot?scope=location&id=<loc>` (after a clock-in) | 200; the clocked-in worker with `display_scope`/`display_scope_id` |
| BE-13 | Boundaries | `GET /monitoring/boundaries?level=district` | 200; district polygons + colors + `regions[]` |
| BE-14 | Search | `GET /monitoring/search?q=<name>` | scope-filtered matches |
| BE-15 | Schedules | `GET /schedules/date/2026-07-22` | today's occurrences per shift |
| BE-16 | Pruning list | `GET /pruning-requests` | 31 across statuses |
| BE-17 | Swagger docs | open `/api/v1/docs` | Task + Activity schemas show `scope`/`region_id`/`district_id`/`task_id` |

---

## 6. Web UAT (`http://localhost:4120`)

Login per role; verify **nav visibility** first (a role should only see permitted items),
then the page cases.

**Changed 2026-07-23 — user form.** Pengguna no longer collects a permanent **lokasi** or
**kawasan**: after ADR-053 the schedule is the only answer to "where does this person work
today", and a second answer on the user record is exactly the drift that caused earlier bugs.
Only **kepala_rayon** and **admin_rayon** are asked for a **Rayon**, because for them a rayon is
*authority* (who they may see and manage), not placement. Verify: creating a satgas/linmas/korlap
shows no lokasi, kawasan or rayon input; creating a kepala_rayon does show Rayon. `(dashboard)` roles = korlap, admin_rayon, kepala_rayon, management,
admin_system, superadmin. `(kecamatan)` = staff_kecamatan. (satgas/linmas are mobile-only.)

### 6.1 Auth & nav gating
| ID | Role | Expected sidebar |
|---|---|---|
| W-N1 | management / admin_system / superadmin | Monitoring, Schedules, Tasks, master-data, Roles/Settings (admin only), Reports/Export |
| W-N2 | kepala_rayon / admin_rayon | Monitoring, Schedules, Tasks, Activities, Pruning (admin_rayon), master-data for their rayon — **no** Roles/Settings |
| W-N3 | korlap | Monitoring, Tasks, Activities, Schedules — no master-data/admin |
| W-N4 | staff_kecamatan | `(kecamatan)` top-bar only: Submit Request, My Requests, Profile — **no** dashboard sidebar |

### 6.2 Monitoring `/monitoring` — the drill-down canon (R3–R6)
Prereq: clock in a few workers (§4). Test as `admin_system_1` (city) then `kepala_rayon_pusat_1` (district).
| ID | Case | Steps | Expected |
|---|---|---|---|
| W-M1 | City landing | open `/monitoring` as a city role | **all 8 district markers + boundaries**; city-scope + "Luar Jadwal" workers; **no old "Surabaya" summary bubble** |
| W-M2 | City→District | **tap** a district | scope narrows: that district's **kawasan markers + boundaries ∪ region-less locations** + district workers |
| W-M3 | District→Region | tap a kawasan | that region's **locations** + region-scope workers only |
| W-M4 | Region→Location | tap a location | **all workers at that location**; roster panel (Terjadwal/Hadir/Belum hadir/Tidak hadir) |
| W-M5 | Never zoom-drill | zoom the map | zoom does **not** change scope (only tap does) |
| W-M6 | Team bubble | tap a team marker | reveals members (photo + status); **keeps** the boundary/markers; hides only non-team individuals |
| W-M7 | Worker detail | tap a worker pin | detail panel: live status **pill** (Aktif/Tidak Aktif) **+ inside/outside-area** axis + lifecycle (Terlambat/Luar jadwal…), call/WhatsApp, trail |
| W-M8 | Luar Jadwal | after an ad-hoc clock-in | ad-hoc worker shows at **city** as a "Luar Jadwal" marker + count chip; **not** in staffing counts |
| W-M9 | District role scope | as `kepala_rayon_pusat_1` | lands on/limited to **their rayon**; cannot see other rayons' workers |
| W-M10 | Search | type a worker/location name | server-backed results; selecting drills to that worker's scope |

### 6.3 Schedules `/schedules` (R7)
| ID | Case | Expected |
|---|---|---|
| W-S1 | Default view | opens on **Hari** (day) board |
| W-S2 | Day board | Rayon ▸ Kawasan ▸ Lokasi drill; shift columns (S1/S2/S3) × role rows (Satgas/Linmas) with `n/target`, understaffed ⚠ |
| W-S3 | Create — scopes | New event → **Ruang Lingkup** offers city / district / region / location; geo pickers cascade; city ("Seluruh Surabaya") needs no geo |
| W-S4 | Create — team | Kategori Tim + PIC + members (no bulk checkbox); saves one occurrence per member |
| W-S5 | Recurrence | none / daily / every_n_days / weekly / specific_dates all selectable |
| W-S6 | Edit scope | edit an occurrence → this / this-and-future / series |
| W-S7 | Capacity | rayon capacity gear → week × shift × role grid, Weekday/Weekend/Holiday tabs; roll-up pills on parents (dashed, read-only) |

### 6.4 Tasks `/tasks` + `/tasks/new` (R8 — scope-aware)
| ID | Case | Expected |
|---|---|---|
| W-T1 | Create — scope selector | task form shows a **scope** selector: **Auto (ikuti jadwal)** default + Kota / Rayon / Kawasan / Lokasi / Tanpa area |
| W-T2 | Auto | leave scope = Auto, pick an assignee, save | task saved with **no explicit scope** → backend derives from the assignee's schedule |
| W-T3 | Explicit | choose **Rayon** → district picker appears (required) → save | task `scope=district` |
| W-T4 | Validation | choose Lokasi, leave the location empty, save | localized "select the area" error, submit blocked |
| W-T5 | Priority | priority options are Low/Medium/High/Urgent (no "Normal") |
| W-T6 | List/detail | `/tasks` filters by status/scope; `/tasks/[id]` shows scope + assignment |

### 6.5 Activities / Overtime / Pruning
| ID | Case | Expected |
|---|---|---|
| W-A1 | Activities queue | `/activities` (korlap/kepala_rayon) lists submitted; approve/reject with reason |
| W-A2 | Overtime | `/overtime` (korlap/kepala_rayon) approve/reject; types lembur/cuti/sakit/izin/libur |
| W-P1 | Pruning review | `/pruning-requests` (admin_rayon+) — queue across statuses; approve/reject/hold; scoped to rayon |

### 6.6 Master data & admin (R1, R2)
| ID | Case | Expected |
|---|---|---|
| W-D1 | Districts/Regions/Locations | CRUD + boundary editor + per-tier styling (border/fill color, opacity, marker glyph); region has a parent-district picker; location has District→Region cascade |
| W-D2 | Roles `/roles` (admin only) | 9 system roles (label/perms editable, not deletable); permission matrix; per-role monitoring_scope + marker; create custom role |
| W-D3 | Users `/users` | role picker → scope inputs cascade per tier |
| W-D4 | i18n | language toggle id↔en relocalizes the UI end-to-end (R10) |

---

## 7. Mobile UAT (emulator or device)

Login per role and **first verify the Menu tiles** (RBAC — R11), then the screens. Bottom
tabs are always **Beranda · Menu · Profil**.

### 7.1 Menu tiles per role (must match capabilities)
| Role | Expected Menu tiles |
|---|---|
| **satgas** | Absensi, Lembur, Tugas, Aktivitas |
| **linmas** | Absensi, Lembur, Tugas, Aktivitas, Aset, Kinerja |
| **korlap** | Absensi, Lembur, Tugas, Aktivitas, Aset, Kinerja + **Monitoring, Tim** |
| **admin_rayon** | Absensi, **Lembur**, Tugas, Aktivitas, Aset + Peranting review, Bibit + Laporan, Monitoring |
| **kepala_rayon** | Monitoring, Tim, Laporan + **Tugas, Aktivitas**, Lembur, Aset |
| **management** | Monitoring, Laporan, Analitik + Bibit |
| **admin_system** | Monitoring, Laporan, Analitik + Aset |
| **superadmin** | Monitoring, Laporan, Analitik + Lembur, Aset |
| **staff_kecamatan** | Perantingan (submit) only — no Menu grid |

> M-N1 (regression): **kepala_rayon must now show Tugas + Aktivitas**, **admin_rayon must
> show Lembur** (these were missing before — fixed).

### 7.2 Attendance / clock-in (R4)
| ID | Role | Case | Expected |
|---|---|---|---|
| M-C1 | satgas | Absensi → clock in at the location (GPS in geofence) + selfie | shift starts; status pill **Bertugas**; outside geofence → blocked/flagged |
| M-C2 | satgas | clock out | status **Pulang**; hours recorded |
| M-C3 | satgas | (leave clocked in past shift) | never auto-closed; `lupa_clock_out` flag for supervisor |

### 7.3 Tasks + **scope selector** (R8, R11)
| ID | Role | Case | Expected |
|---|---|---|---|
| M-T1 | **kepala_rayon** / **admin_rayon** | Menu → **Tugas** → **+ Buat Tugas** | TaskCreate opens; **CAKUPAN AREA** selector shows, default **Auto (ikuti jadwal)** |
| M-T2 | kepala_rayon | open the scope dropdown | 6 options: Auto / Kota (Surabaya) / Rayon / Kawasan / Lokasi / Tanpa area |
| M-T3 | kepala_rayon | choose Kawasan → pick a region → save | task `scope=region` |
| M-T4 | **korlap** | Tugas → + Buat Tugas | scope section **hidden** (korlap is fixed to their area) — tasks default to Auto; LOKASI shows their fixed Rayon/Area |
| M-T5 | satgas/linmas | Tugas | list only; **no** create FAB |
| M-T6 | satgas | open an assigned task → **Submit Aktivitas** | ActivitySubmission opens carrying the `taskId` |

### 7.4 Activities — submit, incl. from a task (R8)
| ID | Role | Case | Expected |
|---|---|---|---|
| M-A1 | satgas | Aktivitas → submit (photo + notes, no task) | created; scope derived from the active shift |
| M-A2 | satgas | Submit from a task (via M-T6) | activity carries `task_id`; **inherits the task's scope** |
| M-A3 | satgas | retry after a network fail | retry keeps the `task_id` (doesn't drop the link) |

### 7.5 Monitoring (R3–R6, mobile parity)
| ID | Role | Case | Expected |
|---|---|---|---|
| M-M1 | city role | Menu → Monitoring | lands on district bubbles (no Surabaya bubble); tap → district → kawasan → lokasi → workers |
| M-M2 | korlap | Monitoring | limited to their scheduled coverage; drill works |
| M-M3 | any | worker sheet | presence pills (Aktif/Tidak Aktif) + inside/outside + lifecycle; call/WhatsApp/Lihat Jejak |
| M-M4 | any | team bubble | tap → members |

### 7.6 Overtime / Pruning / Profile
| ID | Role | Case | Expected |
|---|---|---|---|
| M-O1 | clockable roles | Lembur → submit (date/hours/type/reason) | queued to korlap/kepala_rayon |
| M-P1 | staff_kecamatan | Perantingan → submit (lokasi picker + plant count + photos) | pruning_request created; **My Requests** shows status |
| M-P2 | admin_rayon | Peranting review queue | approve/reject/hold |
| M-PR1 | any | Profil | language id↔en; **logout is clean (no crash/RedBox)** and returns to the welcome/login (R: FCM logout guard) |

---

## 8. Role × feature matrix (checklist grid)

Tick each cell you exercised. ✓ = should work · — = not available to that role.

| Feature | satgas | linmas | korlap | admin_rayon | kepala_rayon | management | admin_system | superadmin | staff_kec |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clock in/out | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Submit activity | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Submit overtime | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| **Create task (+scope)** | — | — | ✓ (auto) | ✓ (selector) | ✓ (selector) | ✓ (web) | ✓ (web) | ✓ (web) | — |
| Approve activity/overtime | — | — | ✓ | ✓ | ✓ | — | — | — | — |
| Monitoring | — | — | ✓ area | ✓ district | ✓ district | ✓ city | ✓ city | ✓ city | — |
| Schedules (create) | own | own | ✓ | ✓ | ✓ | view | ✓ | ✓ | — |
| Pruning submit | — | — | — | — | — | — | — | — | ✓ |
| Pruning review | — | — | — | ✓ | — | ✓ | ✓ | ✓ | — |
| Master data (geo) | — | — | — | rayon | rayon | — | ✓ | ✓ | — |
| RBAC / system settings | — | — | — | — | — | read | ✓ | ✓ | — |

---

## 9. Revamp deep-dives (the highest-risk acceptance points)

- **D1 — Scope follows the schedule (R8).** Schedule a satgas at a **location** today; create
  an **Auto** task for them → task `scope=location`. Re-schedule (or pick an assignee) on a
  **district** occurrence → Auto task → `scope=district`. Submit an activity with **no task**
  during a location shift → `scope=location`; submit **against a district task** → `scope=district`.
- **D2 — Started task extends the map (R8).** A worker whose schedule is location-scoped who
  **starts** a district task should surface at the **deepest** of the two scopes on monitoring
  (location wins if deeper); an **unscheduled** worker who starts a district task appears at
  that **district** (not just city).
- **D3 — Drill narrowing (R3).** At district scope, only that district's kawasan/region-less
  lokasi/workers render — **nothing from other districts**. Region-less lokasi appear directly
  under the district.
- **D4 — Presence 3 axes (R4).** One worker, verify independently: lifecycle (belum hadir →
  bertugas → pulang), live (aktif ≤5min / tidak aktif when stale), and inside/outside-area.
- **D5 — Ad-hoc exclusion (R6).** An unscheduled clock-in shows as "Luar Jadwal" at city and is
  **excluded** from the staffing (understaffing) math.

---

## 10. Regression / edge cases
- No-schedule worker can still **be assigned a task, take it, and submit activities** (scope = `none`/task/shift-location; never a 500).
- Task/activity with `scope=none` persists (no location context).
- Mobile logout never RedBoxes even when there's no FCM token.
- Cross-midnight Shift 3 resolves to the correct **service day**.
- i18n: no hardcoded strings leak (switch to `en`, scan each screen).

---

## 11. Presence model — reproduce every state (ADR-050)

The presence model is **3 independent axes** (authoritative matrix:
[`presence-model-matrix.md`](presence-model-matrix.md)):
**lifecycle** (tidak_bertugas · belum_hadir · terlambat · bertugas · pulang · tidak_hadir)
× **live** (aktif/offline × dalam_area/luar_area) × **counting** (staffing counts only
`bertugas ∧ scheduled ∧ satgas|linmas`). Most states are **time-relative**, so they are not
visible from the static seed alone.

There is now a **dedicated, self-describing user per scenario** — the username tells you what
the row is supposed to show. Seed them, then stage them:

```bash
cd apps/be
npm run db:seed                                   # creates the 22 presence users (idempotent)
npx ts-node scripts/stage-presence-scenarios.ts   # applies today's clock-ins / leave / pings
# then open web /monitoring as admin_system_1
```
All use password `12345678` (no forced reset), so you can also log into the **mobile app** as
any of them. The staging script is **idempotent** — re-run it any time to refresh "now".

### 11.1 The roster — what each user must show

**Live on the map (`bertugas`)** — the only lifecycle state that renders a pin:

| Username | Expected | Where to look |
|---|---|---|
| `satgas_bertugas_1` | bertugas · aktif · dalam_area | green pin, counted in staffing |
| `satgas_terlambat_in_1` | bertugas + `is_late` | pin + Terlambat badge |
| `satgas_luar_area_1` | bertugas · aktif · **luar_area** | pin with "Di luar area" ring |
| `satgas_offline_1` | bertugas · **offline** | pin reads Tidak Aktif, keeps last known area |
| `satgas_lupa_pulang_1` | bertugas + `lupa_clock_out` | still in past shift end, no overtime |
| `satgas_lembur_1` | bertugas + `lembur` | past end **with** approved overtime |
| `satgas_unscheduled_1` | bertugas + `ad_hoc` | **"Luar Jadwal"** marker at **city** scope, **excluded from staffing** |
| `linmas_bertugas_1` | bertugas — **counted** | staffing includes linmas |
| `korlap_bertugas_1` | bertugas — **NOT counted** | monitorable but never in staffing |

**Scope tiers** — which drill-down level the pin renders at:

| Username | Schedule scope | Renders at |
|---|---|---|
| `satgas_surabaya_1` | city (no district/region) | city tier |
| `satgas_rayon_1` | district | district (Rayon) tier |
| `satgas_kawasan_1` | region | region (Kawasan) tier |

**Rescheduling cohort** — one full role set per shift, all on **city scope** (they land in
"Penugasan Kota" on the day board). Use them to drag/reassign between shifts without
disturbing any presence scenario. They are scheduled only — never clocked in.

| Username | Role | Shift |
|---|---|---|
| `satgas_shift_1` · `linmas_shift_1` · `korlap_shift_1` · `tim_shift_1_1` + `tim_shift_1_2` | satgas · linmas · korlap · tim | Shift 1 |
| `satgas_shift_2` · `linmas_shift_2` · `korlap_shift_2` · `tim_shift_2_1` + `tim_shift_2_2` | satgas · linmas · korlap · tim | Shift 2 |
| `satgas_shift_3` · `linmas_shift_3` · `korlap_shift_3` · `tim_shift_3_1` + `tim_shift_3_2` | satgas · linmas · korlap · tim | Shift 3 |

**Scope × role sample roster** (`SAMPLE …` in a schedule's notes) — `stage-presence-scenarios.ts`
also rosters one satgas, one linmas, one korlap and one team at **each** of city / district /
region / location, so every board tier and role column has content. The **location** tier is
pinned to **Rayon Pusat**; the other tiers each draw from a different rayon, because a worker
is only ever scoped inside their own rayon (city is the deliberate exception).

**Not on the map** — roster / history only:

| Username | Expected lifecycle | Note |
|---|---|---|
| `satgas_belum_hadir_1` | `belum_hadir` | scheduled, still inside the arrival grace |
| `satgas_terlambat_1` | `terlambat` | past start+grace, before shift end |
| `satgas_tidak_hadir_1` | `tidak_hadir` | window ended, never clocked in |
| `satgas_pulang_1` | `pulang` | clocked in **and** out |
| `satgas_pulang_awal_1` | `pulang` + `early` | clocked out before shift end |
| `satgas_tidak_bertugas_1` | `tidak_bertugas` | no schedule today |
| `satgas_cuti_1` | `tidak_bertugas` + `excused`, reason **cuti** | in `on_leave_users[]` |
| `satgas_sakit_1` | `tidak_hadir` + `excused`, reason **sakit** | in `on_leave_users[]` |
| `satgas_izin_1` | `tidak_hadir` + `excused`, reason **izin** | in `on_leave_users[]` |
| `satgas_libur_1` | roster status `OFF` | counts in `off_schedule_count`, **not** `on_leave` — see the `libur` caveat below |

### 11.2 Why the time-window states are deterministic
`belum_hadir` / `terlambat` / `tidak_hadir` depend on where **now** sits in a shift
window. The script does NOT invent shifts for this — the shift catalog stays exactly
**Shift 1/2/3** (synthetic staging shifts would appear as extra lanes on the day board).
Instead it picks which *real* shift plays each role at the moment you run it, e.g. at 19:50:

| Role | Picked | Why |
|---|---|---|
| `belum_hadir` | Shift 3 (21–05) | hasn't started |
| `terlambat` | Shift 2 (15–23) | running, past the arrival grace |
| `tidak_hadir` / past-end | Shift 1 (06–15) | already ended |

Run it at another hour and it re-maps automatically. If no real shift can fill a role at
that moment, it says so rather than inventing one.

> **On-time vs late when YOU clock in.** In schedule-only mode most of the cohort sits on
> whichever shift is currently running. If that shift started hours ago, clocking in now is
> genuinely **late** — you'll get `bertugas + is_late`, which is correct, not a bug. To
> exercise a clean on-time `bertugas`, clock in within the 10-minute grace after a shift
> boundary (06:00 / 15:00 / 21:00) — `satgas_belum_hadir_1` is parked on the *next* shift
> precisely for this.

### 11.3 Verify from the API
```bash
curl -s localhost:4110/api/v1/monitoring/live-users -H "Authorization: Bearer $TOK" | jq '
  {live: [.users[].full_name],
   absent: [.absent_users[] | {n:.full_name, s:.lifecycle_state}],
   leave:  [.on_leave_users[] | {n:.full_name, r:.leave_reason}]}'
```
Verified on 2026-07-22: 18/18 expected states matched (12 live · 3 roster · 3 excused).

### Excused leave (cuti / sakit / izin) — now surfaced
`GET /monitoring/live-users` returns **`on_leave_users[]`** — scheduled workers on approved
leave today, each with `lifecycle_state` + **`leave_reason`** (the roster path maps
`Schedule.status` `LEAVE_ANNUAL`→`cuti` · `LEAVE_SICK`→`sakit` · `LEAVE_PERMIT`→`izin` and
runs it through `derivePresenceState`, so they read as **excused**, not plain `tidak_hadir`).
`absent_users[]` now also carries `lifecycle_state` (belum_hadir / terlambat / tidak_hadir)
+ `leave_reason: null`.

**Stage it:** set a scheduled worker's roster row to a leave status, then check the API:
```bash
docker exec sekar-postgres psql -U postgres -d sekar_db -c \
  "UPDATE schedules SET status='leave_sick' WHERE user_id=(SELECT id FROM users WHERE username='satgas_pusat_1') AND schedule_date=(NOW() AT TIME ZONE 'Asia/Jakarta')::date;"
# GET /monitoring/live-users → on_leave_users[] includes them with leave_reason='sakit'
```
> `libur` (rest-day) has no schedule-status source and is not mapped; the `on_leave_count`
> total is unchanged. **The "excused" pill is now rendered** on both platforms — web
> `OnLeaveList` and mobile `MonitoringStatusSheet` show a **"Berhalangan"** section with a
> per-reason pill (sakit/cuti/izin) driven by `on_leave_users[].leave_reason`.

---

## 12. Sign-off

| Area | Owner | Result | Notes |
|---|---|---|---|
| Backend / API (§5) | | | |
| Web (§6) | | | |
| Mobile (§7) | | | |
| Role matrix (§8) | | | |
| Revamp deep-dives (§9) | | | |

**Blocking issues:** _______  **UAT verdict:** ☐ Pass ☐ Pass-with-notes ☐ Fail

## Changelog
- 2026-07-22 — Added **§0 from-scratch setup + clean-reset recovery** (documents the two migration-run failure modes and the drop-recreate fix) and a **§2.6 conceptual primer** ("how schedules work" — event→occurrence model; "how monitoring works" — drill-down + 3-axis presence). Fixed two from-scratch **migration bugs**: a shipped class renamed by the rayon→district sweep (`RenameManagementAndAdmin**District**Roles`→ restored to `…RayonRoles`) and a 13-digit timestamp typo on `DropMarkerImageUrl` (→14-digit) that mis-sorted it before its dependencies — a clean `migration:run` now applies all 80 in order. Marked the excused-pill note done (shipped in web `OnLeaveList` / mobile `MonitoringStatusSheet`). Verified end-to-end: fresh drop→migrate→seed (exit 0), backend boots, login + `/monitoring/{city,live-users}` + `/schedules/date/:date` + `/districts` all 200.
- 2026-07-22 — Created. Covers ADR-044…052 revamp across be/web/mobile for all 9 roles, with real seed credentials + step/expected/result cases. Shipped alongside a **task seeder** (18 tasks, all statuses + scopes) and fixes to the region/location seed loaders (`rayon_id`→`district_id`) so the demo data seeds completely.
