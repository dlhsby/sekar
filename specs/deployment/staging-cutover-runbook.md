# Staging Cutover Runbook — Revamp Release

**Status:** 🚧 prep in progress — **not yet authorised to deploy.**
**Scope:** backend + web + mobile APK, all at once.
**Owner triggers the deploy** (merge `main` → `staging`); nothing here runs automatically.

> Sections marked ⏳ are filled in by the rehearsal sessions and MUST be complete before go-live.

---

## 1. Why this is not a routine deploy

`origin/staging` is ~289 commits behind `main` and still runs the **pre-revamp** schema. The cutover
runs **38 migrations in one shot against a live DB holding real UAT data**, including:

- `areas` → `locations` and `rayons` → `districts` (physical renames across 14 tables)
- two role-code renames (`top_management`→`management`, `admin_data`→`admin_rayon`)
- tracking-status enum collapsed 5 → 3
- two **data-adoption** migrations whose SQL matches on live data shapes:
  `17496` kawasan seed + area re-parenting (77 KB) and `17500` staffing requirements (42 KB)
- a new uniqueness key `(user, date, shift, place)` (`17517`) that **aborts the chain** if live
  data holds a duplicate
- three dropped columns and two dropped junction tables

`17500` is **not additive** — it `DELETE`s all `location_staff_requirements` before inserting the
workbook set.

**There is no safe `down()` chain.** Rollback is the RDS snapshot, nothing else.

---

## 2. Hazards and their fixes

| # | Hazard | Fix | Status |
|---|--------|-----|--------|
| **F1** | `17491300000000-AddRbacTables` creates `roles`/`permissions`/`role_permissions` **empty**; no migration inserts rows (only the seeder does) and `deploy-staging.yml` had no seed step. `RolePermissionsService.getRolePermissionKeys` returns `[]` for an unknown role and `getMonitoringScope` returns `NONE` ⇒ every `@RequirePermissions` handler 403s and nobody can see the map. **Staging would come up authenticated but authorization-dead.** | Add non-destructive, idempotent `npm run db:seed:prod` (reference profile) after `migration:run:prod`. Guard test asserts the reference and staging profiles seed the same RBAC catalog. | ⏳ |
| **F2** | Migrations ran while the **old containers kept serving**; recreate came after. Old code meets new schema the moment `RenameAreaToLocation` commits. | Stop `sekar-backend` + `sekar-web` and serve a Caddy maintenance response **before** migrating; bring them up on the new image after. | ⏳ |
| **F3** | The SSM poll capped the whole deploy at ~6 min (72 × 5 s), then hard-failed — a 38-migration chain can exceed it, leaving a **partially-migrated DB with a red build**. | Raise the poll past the measured chain time; on timeout fail loudly as "unknown state — do not retry blindly". | ⏳ |
| **F4** | Staging RDS is **PostgreSQL 15.17** (`dlhsby`, `db.t4g.micro`, 20 GB, **not publicly accessible**); local infra pins `postgres:14-alpine`; no local `pg_dump`/`psql`. | Rehearse on a throwaway `postgres:15-alpine`; dump from the EC2 box via SSM. Infra bump to PG15 = post-cutover follow-up. | ⏳ |
| **F5** | `db:seed:staging` calls `truncateAll()` — it **wipes every table**. | Never run it against live staging. Only the reference profile is safe there. | ✅ documented |
| **F6** | `production.ts` doesn't seed roles/permissions (unlike `reference.ts`) — the F1 trap is armed for production too. | Add `seedPermissions`/`seedRoles` to the production profile. | ⏳ |
| **F7** | Role codes renamed; the permission cache is Redis-keyed by role code (TTL 300 s). | Forced re-login for everyone; flush `rbac:role:*` post-deploy. | ⏳ |
| **F8** | Installed mobile APKs emit pre-revamp shapes (`rayon_id`, `/areas`, 5-status). | Staging APK ships **with** the release; field devices must update. | ⏳ |
| **F9** | **Activity photos are stored as base64 data-URIs inline in Postgres**, not as S3 objects. Mobile converts each photo to base64 (`useActivityForm.ts:305`) and posts it in `photo_urls`; the DTO only `@IsString`-validates (`create-activity.dto.ts:90`); there is **no S3 upload path for activities** and the read path even has explicit `data:`/`blob:` pass-through guards (`s3.service.ts:257`) — so this is established behaviour, not a stray row. Result: `activities` is **5.8 GB for 10,786 rows** (~537 KB/row, confirmed 100 % data-URIs on the clone). The staging backend (`mem_limit: 448m`, `node` with **no `--max-old-space-size`** → Node auto-caps old-space ~256 MB) was in an **OOM crash loop** (`RestartCount ≈ 994`, `FATAL ERROR: Reached heap limit`). `findMyActivities` did an **unbounded** `find()` returning full `photo_urls`; even the paginated list loaded ~50 rows × up to 3 × ~500 KB and re-serialised them to JSON. | **Tier-1 DONE** (ships with the cutover): list reads carry `photo_count`, not the payload; `findMyActivities` bounded; explicit `--max-old-space-size=384`. **Tier-2** data-URI→object-storage migration tracked as a follow-up. See §8. | 🟡 tier-1 done |
| **F10** | **`/schedules/range` returned ~2 KB of `location.boundary_polygon` per roster row** (`leftJoinAndSelect` on the location + region relations). Measured on the clone: a 31-day all-district range = **293 MB in 29 s** for 31 284 rows. With the F9 fix pinning the heap at `--max-old-space-size=384`, serialising that response is an **OOM, not a slow page** — and the web board's month view requests exactly this shape. | **DONE** — explicit column lists (`location.id/name`, `region.id/name`); polygons are fetched per-subject by the map modal. Now **38.6 MB / 10.1 s**. The **projection** path (rows beyond the horizon) was a separate, worse instance of the same bug — **95.4 MB for a 10-day far-future range (11 KB/row)**, ~590 MB at 62 days — fixed by `slimProjectedRelations` → **9.59 MB / 1 011 B per row**. A unit test fails if the materialized relations are ever bare-joined again. | ✅ fixed |
| **F11** | **First absence sweep is unbounded.** `sweepAbsences` (ADR-056) selected every past `planned` row each hourly tick. Staging has never run ADR-056, so its first tick would rewrite the whole backlog in one transaction. | **DONE** — bounded by `schedule.absence_sweep_lookback_days` (default 7; `0` = unbounded). **Measured on the 2026-07-28 rehearsal: 36 390 past `planned` rows reaching 27 days back**, so the 7-day default leaves most of them `planned` forever in any raw-status report. The one-off backfill (`npm run schedules:sweep-absences -- --all --apply`) is therefore a **required** cutover step, not optional. §8 of `staging-verify-schedules.sql` reports the current number. | ✅ fixed |
| **F12** | **The punch backfill duplicates inline base64 photos.** Migration `17520` backfills `attendance_punches` from `shifts`, carrying `photo_url` verbatim — and on live staging those are `data:` URIs, not S3 objects. Measured on the 2026-07-28 rehearsal: **250 MB of base64 across 1 361 punches** (largest single photo 634 kB), duplicating what `shifts` already holds (269 MB), so the database carries ~519 MB for the same 1 361 photos. Same root cause as F9. | **Accepted for cutover.** One-time, bounded growth; no OOM risk on read because the punch endpoints are self-scoped to one worker's day (a handful of rows), unlike the roster range (F10). Folds into the deferred F9 Tier-2 data-URI→object-storage migration. `staging-verify-schedules.sql` §11 reports `inline_base64` so the number stays visible. | 🟡 accepted |

---

## 3. Rehearsal (must pass before go-live)

> **Second rehearsal PASSED — 2026-07-28**, against a fresh `pg_dump` of live staging
> restored into a local throwaway `postgres:15-alpine` (`staging-clone.sh`). This one also
> exercised the post-ADR-050/056 code and the operator scripts.
>
> - **Chain:** **43 pending migrations applied clean, exit 0, 33.9 s.** Staging's ledger
>   already held 46 rows, so no baselining was needed. `rayons` → `districts` rename,
>   `schedule_events`, `attendance_punches` and the RBAC tables all created.
> - **Schedule conversion:** the template migration produced **1009 events, every one
>   `daily`, open-ended (`end_date IS NULL`), `recurrence_config` NULL, active.** Exactly
>   the recurring shape the cutover needs — no one-offs.
> - **RBAC (F1):** roles/permissions/role_permissions were **0/0/0** after migrations and
>   **9/72/96** after `db:seed:prod`. F1 confirmed live and confirmed fixed by the seed.
> - **Uniqueness gate:** **PASS** — no duplicate `(user, date, shift, place)`, so
>   migration `17517` will not abort.
> - **Boot + materialization:** the backend started healthy on the migrated schema and its
>   self-heal materialized **925 events → 55 491 rows** to the 60-day horizon. Post-migration
>   provenance is correct: past/today remain legacy manual rows, **future is 100 %
>   event-generated**.
> - **Converter:** reported "already converged" — nothing left to promote.
> - **Sweep backfill is REQUIRED, and 7 days is not enough** (see F11 below).
> - **New: the punch backfill copies inline base64 photos** (see F12 below).
>
> Two caveats on method: the dump excluded the DATA of `activities`, `location_logs`,
> `notifications` and `audit_logs` (schemas kept, so every migration still ran for real) —
> the SSM tunnel dropped mid-COPY twice on a full dump. One restore error is expected as a
> result: `FK_activity_tags_activity` cannot be recreated because `activity_tags` references
> excluded `activities` rows.

> **First rehearsal PASSED — 2026-07-24**, against the `dlhsby-clone-rehearsal` RDS
> instance (today's 11:14 snapshot restored to a temporary `t4g.micro`, reached over an
> SSM tunnel). Results below. Re-run before the actual cutover if staging data has moved
> materially since.
>
> - **Chain:** 39 pending migrations (the 38 revamp migrations + `17517500000000`) applied
>   clean, exit 0, **~33 s total** on `t4g.micro` — the two data-adoption migrations
>   (`17496`, `17500`) both ran (they act only on an existing DB). The 25-min deploy poll
>   (F3) is comfortably safe.
> - **No constraint aborted:** 0 duplicate `(user, date, shift, place)` groups before the
>   run, so `17517`'s unique index applied without rejecting a row.
> - **Multi-place preservation (F-DATA-LOSS):** all 136,292 assignments archived to
>   `schedule_locations_archive`; the 2,600 multi-location schedules re-expressed as
>   204 kawasan-scoped + 2,204 rayon-scoped + 192 fanned-out (schedules 25,306 → 40,118).
>   **`staging-verify-multiplace.sql` → 134,776 live assignments, 134,776 covered, 0 lost.**
>   (1,516 archived assignments were uncovered — all on the 14 already-soft-deleted
>   schedules, correctly not resurrected.)
> - **Role rename 1:1:** `admin_data`→`admin_rayon` (12), `top_management`→`management`
>   (15), 0 null roles, and **every `users.role` matches a seeded role code** (0 orphans).
> - **RBAC (F1):** roles/permissions/role_permissions were **0/0/0 after migration alone**
>   — confirming the trap — then `db:seed:prod` populated **9 / 72 / 96**, every role with a
>   `monitoring_scope`; a second run left them unchanged (idempotent), schedules steady.
> - **Geography:** areas→locations (955, 0 orphaned), rayons→districts (10), 129 kawasan
>   seeded, 365 region-less locations (Taman Aktif, legit); tracking status collapsed 5→3
>   with totals preserved (1,120).
> - **Explained deltas only.** The one to sign off with the operator: staffing
>   `area_staff_requirements` 332 → `location_staff_requirements` **195** — `17500` clearing
>   auto-seeded rows for the authoritative workbook set (config data, re-derivable), as
>   designed. Confirm none were hand-edited via the UI.
>
> **Per-role auth gate (backend booted against the migrated + seeded clone) — PASS.**
> All 9 roles authenticate and `/auth/me` returns 200 (superadmin, admin_system, management,
> kepala_rayon, admin_rayon, korlap, satgas, linmas, staff_kecamatan) — the real end-to-end
> proof that the RBAC seed is complete (no role resolves to empty permissions). Permission
> matrix correct: `/monitoring/city`, `/roles`, `/settings` → 200 for city-scope roles,
> **403** for district/field roles; `/users` → 403 for satgas/linmas/staff_kecamatan;
> `/districts` → 200 for all. **Caveat:** heavy schedule/monitoring endpoints could NOT be
> load-tested through the SSM tunnel — the backend's `onApplicationBootstrap` `selfHeal`
> materialization pass (pre-existing, ADR-047) saturated the single tunnelled connection
> (`START TRANSACTION` alone measured 1.3 s), so those endpoints timed out and a transient
> `/monitoring/city` 500 appeared *after* it had returned 200 cleanly. That is a tunnel
> artifact, not a code defect — endpoint latency belongs in the **post-deploy smoke**
> (co-located BE↔RDS), and the boot `selfHeal` means the first minutes after cutover do a
> one-time materialization pass (fire-and-forget, fast co-located).

Run against a **restored dump of real staging data** on a throwaway PG15 — never against AWS.

1. **Clone** — `apps/be/scripts/staging-clone.sh`: `pg_dump` on the EC2 box via SSM → S3 → local →
   restore into a throwaway `postgres:15-alpine` → **baseline census**. ⏳
2. **Migrate** — full chain, timing each migration. ⏳
3. **Census diff** — before/after row counts per table. Acceptance: **zero unexplained row loss**;
   every deliberate delta explained in writing. Specifically:
   - `17496` — zero areas orphaned, zero silently unmatched by name (region-less Taman Aktif rows
     are legitimate).
   - `17500` — post-state is the workbook set; nothing operator-authored is lost.
   - `17517` — probe for duplicate `(user, date, shift, place)` **before** running.
   - role rename — `users.role` maps 1:1, no NULLs, no orphans.
4. **Seed** — `db:seed:prod` twice; diff must be **additive only** both times. ⏳
5. **Verify** — full automated suites + `scripts/e2e-api-smoke.sh` + the per-role matrix in
   [`../testing/manual-uat.md`](../testing/manual-uat.md). ⏳
6. **Rollback rehearsal** — restore the pre-migration dump into a second throwaway PG15 and confirm
   the **old** image boots green against it. This is what proves the snapshot path works. ⏳

---

## 4. Pre-flight checklist (day of cutover)

- [ ] Rehearsal §3 fully green, census diff reviewed and signed off
- [ ] Disk headroom on the EC2 box (`df -h /`) — it has hit ENOSPC mid-pull before
- [ ] Latest pre-deploy RDS snapshot confirmed `available`
- [ ] Measured migration duration recorded; maintenance window announced to testers ⏳
- [ ] Staging APK built and ready to distribute (F8)
- [ ] `main` green on CI; nothing unmerged that belongs in the release
- [ ] **Schedule drift report captured (BEFORE):** `psql "$DATABASE_URL" -f apps/be/scripts/staging-verify-schedules.sql > before.txt`
- [ ] **Uniqueness gate PASSES** — §5 of that report must read `PASS`. Any duplicate `(user, date, shift, place)` **aborts migration `17517` mid-chain**; fix the data first.
- [ ] Absence-sweep blast radius (§8) read, and the **one-off backfill planned** — 7 days is not enough (F11 measured 27 days / 36 390 rows)
- [ ] Coverage gaps (§4) reviewed — clockable workers with no event are **reported, not auto-created**; confirm the list is expected

## 5. Cutover

1. Merge `main` → `staging` (or `workflow_dispatch`). The workflow takes a pre-deploy RDS snapshot
   and **waits for it** before migrating.
2. Watch the SSM output: maintenance mode → migrate → reference seed → recreate → healthcheck →
   `DEPLOY-VERIFIED <sha>`.
3. Flush the Redis role cache (F7).
4. **Promote standing one-offs to daily** — dry run first, read the list, then apply:
   ```bash
   cd apps/be && npm run schedules:to-daily            # prints the plan, writes nothing
   cd apps/be && npm run schedules:to-daily -- --apply # then re-run: expect 0 remaining
   ```
   Events flagged `xN-same-slot` or `already-daily` are usually left-over test data —
   review (or delete) them rather than promoting every copy. Roster rows are filled by the
   materializer's next run / boot self-heal, or `POST /schedules/generate`.
5. **Backfill the absence sweep (REQUIRED).** The hourly cron reaches back only
   `absence_sweep_lookback_days` (7), and the rehearsal measured a **27-day / 36 390-row**
   backlog — without this, most past no-shows stay `planned` in raw-status reports forever:
   ```bash
   cd apps/be && npm run schedules:sweep-absences -- --all            # dry run: read the count
   cd apps/be && npm run schedules:sweep-absences -- --all --apply
   ```
6. **Capture the AFTER report and diff it:**
   `psql "$DATABASE_URL" -f apps/be/scripts/staging-verify-schedules.sql > after.txt && diff before.txt after.txt`
   Expect only the intended deltas: one-offs → daily, and roster rows appearing for them.
7. Run the post-deploy verification below.

## 6. Post-deploy verification

- `GET /health/live` returns the expected `{version, gitSha, builtAt}`
- Log in as **each of the 9 roles**; confirm landing + monitoring scope + no 403s (this is what
  catches an incomplete RBAC seed)
- Monitoring drill city → district → region → location, incl. the **region-less Taman Aktif bucket**
- Schedules day board, occurrences, teams, **Belum Dijadwalkan**, multi-place rows
- Clock in/out **with and without** a schedule (ad-hoc → "Luar Jadwal", excluded from staffing)
- **Data-integrity check with the operator** — they confirm their own pre-existing staging records
  survived (this is the one check only they can make)
- Install the staging APK and repeat the field-worker flows on device

## 7. Rollback

**`down()` is not a rollback path** — several migrations are lossy or assume no multi-shift roster
rows. The only exit is restoring the pre-deploy RDS snapshot and redeploying the previous image SHA.

Decision tree:

| Symptom | Action |
|---------|--------|
| Deploy failed **before** `migration:run:prod` | Nothing to undo — fix and retry. |
| Migration chain **aborted mid-way** | **Do not retry the deploy.** Restore the pre-deploy snapshot, then diagnose against a local clone. A partially-migrated DB is not a valid starting state. |
| Deploy job timed out, state unknown (F3) | Check `migrations` table on the box before anything else. Treat as mid-way abort unless the chain is provably complete. |
| Chain complete, app unhealthy | Redeploy the previous image SHA **only if** the old code can serve the new schema — for this release it **cannot**. Restore the snapshot. |
| Chain complete, app healthy, data wrong | Stop. Capture evidence, then restore the snapshot. |

Snapshot restore creates a **new RDS instance** — the endpoint changes, so the backend's
`DATABASE_HOST` (SSM parameter) must be repointed and the container recreated.

---

## 8. F9 — activity photos as inline data-URIs (OOM)

**Root cause.** Activity photos are base64 data-URIs stored inline in
`activities.photo_urls` (`text[]`). Mobile base64-encodes each photo and posts it
(`apps/mobile/src/hooks/useActivityForm.ts:305`); the backend stores it verbatim
(`create-activity.dto.ts` only `@IsString`s it) — there is no S3 upload for activities,
and the read path deliberately passes `data:`/`blob:` URIs through untouched
(`s3.service.ts:257`). So `activities` is 5.8 GB for ~10.8k rows, and any read pulls
megabytes into a ~256 MB heap.

**Tier 1 — DONE (unblocks the cutover, ships with it):**
- `findMyActivities` is now a bounded (`take` 200), photo-payload-free query builder read
  (was an unbounded `find()` returning full data-URIs).
- **List reads no longer ship the payload.** `buildListQuery` selects every activity column
  except `photo_urls` and computes `cardinality(photo_urls)` as `photo_count`; the detail
  read (`findOne`) still returns the full photos. Web + mobile count chips read
  `photo_count ?? photo_urls?.length`.
- Backend runs with `NODE_OPTIONS=--max-old-space-size=384` (compose.staging.yml), so the
  V8 cap is intentional and hit before the kernel OOM-kills the container.
- Verified: 63 activities service specs green; `cardinality`/projection confirmed on the
  staging clone; the co-tenant apps were stopped to buy memory headroom in the interim.

**Tier 2 — the real fix (drops the DB ~8 GB → <1 GB). Storage is infra-agnostic per
environment** (matches the existing convention): **MinIO** for local dev + production
(`docker-compose.prod.yml`), **real AWS S3** for staging (`sekar-media-staging`). `S3Service`
already speaks both via `AWS_ENDPOINT_URL` / `AWS_S3_FORCE_PATH_STYLE`.

- **Phase A — stop the bleeding — DONE for EVERY module (global interceptor):** a single
  global `PhotoUrlInterceptor` (`shared/services/photo-storage.service.ts` +
  `common/interceptors/photo-url.interceptor.ts`) makes photos behave everywhere without
  per-module wiring: on **write** it uploads any inline `data:`/`blob:` value in a known photo
  field (`photo_urls`, `completion_photo_urls`, `profile_picture_url`, `clock_in/out_photo_url`,
  `photo_before/after_url`, `photo_url`) to storage *before* the handler, so base64 can never be
  persisted **whatever the client sends — no mobile change needed**; on **read** it presigns
  stored URLs so they render. The activity-specific `POST /activities/photos` upload endpoint +
  DTO guard (PR #377) stay as belt-and-suspenders. Verified on the real-data sim: task/profile
  photos presign and load (200), activities list unchanged (`photo_count`, empty `photo_urls`).
- **Phase A had two holes, closed 2026-08-01.** "Every module" was true only for handlers whose
  inline payload arrives in a *known photo field on the request body* — which two write paths
  did not:
  1. `POST /users/:id/profile-picture` is a **multipart** upload and built the data URI *inside
     the handler*, after the interceptor had already run. It now uploads via
     `PhotoStorageService.upload(buffer, mime, folder)` (new — `store()` decodes a data URI, and
     base64-encoding a Multer buffer just to decode it again is waste).
  2. Clock-in/out and overtime selfies arrive as **`selfie_photo`**, a field name absent from
     `PhotoUrlInterceptor.FIELDS`, so they went straight into `attendance_punches.photo_url` and
     the projected `shifts.clock_*_photo_url` as raw base64. `ShiftsService.storeSelfie()` now
     stores them (overtime inherits this — it delegates to `clockIn`/`clockOut`).
  The four selfie DTOs' `@Matches` required a data URI; they now accept a data URI **or** a
  stored URL, so a client that starts uploading separately needs no API change.
  Measured on the 2026-08-01 staging clone before the fix: **every** row of all four columns was
  a data URI — `attendance_punches.photo_url` 1,361 rows / 250 MB, `shifts.clock_in` 773 / 140 MB,
  `shifts.clock_out` 588 / 110 MB, `users.profile_picture_url` 163 / 28 MB. That is **528 MB of a
  658 MB database (80%)**, and it is why Phase B's "zero inline left" did not hold.
- **Phase B — backfill ALL existing inline photos — SCRIPT BUILT + locally verified on real
  staging data:** `npm run backfill:inline-photos [-- --dry-run]`
  (`src/database/backfill/backfill-inline-photos.ts`, `:prod` runs the compiled JS). Covers
  **every** photo column — `activities.{photo_urls,photo_before_url,photo_after_url}`,
  `overtimes.photo_urls`, `pruning_requests.photo_urls`, `tasks.completion_photo_urls`,
  `notable_plants.photo_urls`, `assets.photo_url`, `users.profile_picture_url`,
  `shifts.{clock_in_photo_url,clock_out_photo_url}` — handling both `text[]` and single `text`.
  Idempotent, keyset-batched, per-row-isolated. **Run co-located with the DB AFTER the cutover
  deploy** (`docker exec sekar-backend npm run backfill:inline-photos:prod`), then
  `VACUUM (FULL)` the affected tables (`activities`, `shifts`, `users`, …) to reclaim the dead
  TOAST tuples. Transform covered by `photo-backfill.util.spec.ts`.
  - **2026-08-01: `attendance_punches.photo_url` added to `TARGETS`** — ADR-055 made punches the
    immutable record and `shifts` a projection of them, but this list predates that table, so
    the single largest column of inline photos was never swept. It is listed **before** `shifts`
    on purpose (see dedupe below): the punch is the record, so the projection should point at
    the punch's object.
  - **Content-hash dedupe added.** `shifts` holds the same bytes as the punch it projects — 776
    byte-identical pairs on the clone — so identical buffers now upload once and share the URL.
  - **Re-verified end to end on the 2026-08-01 clone:** **2,905 photos / 398.9 MB moved in
    1 m 55 s, zero failures, 1,541 distinct objects** (dedupe avoided 1,364 duplicate uploads).
    All four columns then report 0 inline; after `VACUUM (FULL)` on
    `attendance_punches`/`shifts`/`users` the database went **658 MB → 100 MB** (`shifts`
    269 MB → 4.9 MB, `attendance_punches` 267 MB → 5.9 MB). Read path confirmed: a stored URL
    presigns and the image fetches 200 `image/jpeg`.
  - `VACUUM (FULL)` must be issued **one table per statement** — psql sends a multi-statement
    `-c` as one transaction and vacuum cannot run inside one.

Phase B is out of scope for the cutover deploy itself (it's a separate, post-deploy job) but
must be run, and the same fix applies to production.

**Interim mitigation applied 2026-07-24:** the co-tenant apps sharing the box
(`swat-*`, `mm-web`, `portal-web`) were stopped (`docker stop`, reversible via
`docker start`) to relieve memory pressure while this is resolved.

---

## Related

- [`ci-cd.md`](./ci-cd.md) — the deploy workflow itself
- [`operations.md`](./operations.md) — migrations, backup/restore, SSM access
- [`../REVAMP-STATUS.md`](../REVAMP-STATUS.md) — phase status + the hazard table
- [`../testing/manual-uat.md`](../testing/manual-uat.md) — the acceptance matrix
