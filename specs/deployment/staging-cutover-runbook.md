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

---

## 3. Rehearsal (must pass before go-live)

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

## Related

- [`ci-cd.md`](./ci-cd.md) — the deploy workflow itself
- [`operations.md`](./operations.md) — migrations, backup/restore, SSM access
- [`../REVAMP-STATUS.md`](../REVAMP-STATUS.md) — phase status + the hazard table
- [`../testing/manual-uat.md`](../testing/manual-uat.md) — the acceptance matrix
