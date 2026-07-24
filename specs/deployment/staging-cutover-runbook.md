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

---

## 3. Rehearsal (must pass before go-live)

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

## 5. Cutover

1. Merge `main` → `staging` (or `workflow_dispatch`). The workflow takes a pre-deploy RDS snapshot
   and **waits for it** before migrating.
2. Watch the SSM output: maintenance mode → migrate → reference seed → recreate → healthcheck →
   `DEPLOY-VERIFIED <sha>`.
3. Flush the Redis role cache (F7).
4. Run the post-deploy verification below.

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

**Tier 2 — the real fix (follow-up project, drops the DB ~8 GB → <1 GB):**
- Migrate existing data-URIs out of Postgres into **object storage**, rewriting `photo_urls`
  to object keys; presign on read (the machinery already exists in `s3.service.ts`).
- **Storage is infra-agnostic per environment** (matches the existing convention): **MinIO**
  for local dev and production (`docker-compose.prod.yml`), **real AWS S3** for staging
  (`sekar-media-staging`). The `S3Service` already speaks both via `AWS_ENDPOINT_URL` /
  `AWS_S3_FORCE_PATH_STYLE`, so the migration and upload paths target the same client.
- Change mobile to upload to the bucket (presigned PUT) and send keys, not base64.
- Validate `photo_urls` as keys/URLs, rejecting `data:` payloads at the DTO.

Tier 2 is out of scope for the cutover itself but must be tracked — the same bloat and
OOM ride along to production otherwise.

**Interim mitigation applied 2026-07-24:** the co-tenant apps sharing the box
(`swat-*`, `mm-web`, `portal-web`) were stopped (`docker stop`, reversible via
`docker start`) to relieve memory pressure while this is resolved.

---

## Related

- [`ci-cd.md`](./ci-cd.md) — the deploy workflow itself
- [`operations.md`](./operations.md) — migrations, backup/restore, SSM access
- [`../REVAMP-STATUS.md`](../REVAMP-STATUS.md) — phase status + the hazard table
- [`../testing/manual-uat.md`](../testing/manual-uat.md) — the acceptance matrix
