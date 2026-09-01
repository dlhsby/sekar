# Data retention — location logs and photos

**Status:** proposed. Written 2026-09-02 after a storage-full outage on staging.
Retention *periods* are a product decision and are left as `TBD` — the mechanisms
and the measurements are the part that needed writing down.

Related: [`aws-cost-position.md`](aws-cost-position.md) ·
[`staging-cutover-runbook.md`](staging-cutover-runbook.md) (F9, F12) ·
[`infrastructure.md`](infrastructure.md)

---

## 1. Why this exists

On 2026-09-02 staging RDS hit **0 bytes free** on a 20 GB volume and stopped
accepting writes. Nothing could be freed from *inside* the database, because
Postgres needs WAL space to record even a `TRUNCATE` — the deadlock had to be
broken by adding storage.

Two independent causes, with different shapes:

| | `location_logs` | Inline photos |
|---|---|---|
| Shape | **unbounded growth** | **wrong placement** |
| Measured | 8,496,250 rows / 2,471 MB in ~2 months | 27,847 rows / **12.9 GB** across 12 columns |
| Refills? | Yes, continuously from the mobile app | Only via write paths that still inline |
| Fix applied | `TRUNCATE` (2,471 MB → 88 kB) | backfill to S3 (12 GB → 18 MB on `activities`) |
| Fix durable? | **No** — it will refill | Partially — see §3 |

Result of both fixes: database **16 GB → 224 MB**.

## 2. `location_logs` — growth

GPS pings, one row per device report. It is the single fastest-growing table and
has no retention today, so the outage recurs on a timer.

**Mechanism.** A nightly job deleting rows older than the window, plus a
reclaim strategy — this is the part that is easy to get wrong:

- `DELETE` does **not** return space to the volume. It only marks tuples dead;
  plain `VACUUM` makes that space reusable *within* the table. That is enough to
  stop growth, and is the steady-state behaviour to aim for.
- `VACUUM FULL` returns space to the filesystem but needs free space roughly
  equal to the table's live size, and takes an `ACCESS EXCLUSIVE` lock. Do not
  schedule it; run it deliberately, with headroom verified first.
- Better long term: **partition by month** and `DROP` old partitions. A dropped
  partition returns its space immediately with no vacuum and no long lock —
  which is exactly the property the nightly delete lacks.

**Retention window: TBD.** Inputs for the decision: what monitoring replay
actually needs, and whether any report reads raw pings rather than the
`location_daily_summaries` projection.

**Also consider ping thinning at write time** — a 25 m distance filter already
exists in the codebase; if pings are still landing at full rate the cheapest
retention is not recording redundant rows at all.

## 3. Photos — placement, then retention

The defect is not volume, it is that base64 data-URIs were stored in Postgres
`text`/`text[]` columns. The backfill
(`apps/be/src/database/backfill/backfill-inline-photos.ts`) moved all of it to
S3, but it clears **existing** debt; it does not change how new photos arrive.

**All 12 photo-bearing columns**, with what was found on staging:

| Table | Column | Rows inline | Size |
|---|---|---|---|
| `activities` | `photo_urls` (array) | 22,802 | **11,963 MB** |
| `activities` | `photo_before_url` | 0 | — |
| `activities` | `photo_after_url` | 0 | — |
| `attendance_punches` | `photo_url` | 2,438 | 449 MB |
| `shifts` | `clock_in_photo_url` | 1,377 | 248 MB |
| `shifts` | `clock_out_photo_url` | 1,061 | 201 MB |
| `users` | `profile_picture_url` | 169 | 28 MB |
| `overtimes` | `photo_urls` (array) | 0 | — |
| `pruning_requests` | `photo_urls` (array) | 0 | — |
| `tasks` | `completion_photo_urls` (array) | 0 | — |
| `notable_plants` | `photo_urls` (array) | 0 | — |
| `assets` | `photo_url` | 0 | — |

**Prevention comes first.** F9 Phase A stopped new inline photos on
`activities`; every other write path above is still able to inline one. Until
each accepts an uploaded object and stores a URL, the debt re-accrues and the
backfill has to be re-run. Note `attendance_punches` is not an independent
source — migration `17520` **copied** its photos verbatim from `shifts` (F12),
so the same image was stored twice.

**Then retention, in S3 rather than Postgres** — this is the point of moving
them. Options, cheapest first:

- **Lifecycle rules** on `sekar-media-staging-id`: transition to Infrequent
  Access after N days, expire after M. No application code.
- Keep **evidence photos** (clock-in/out, punches) on a compliance-driven
  window; keep **work photos** (activities, tasks) on a shorter one. These are
  different obligations and should not share a number.
- `app-releases/` must be **excluded** from any expiry — it backs the public
  `/android` download and the in-app updater.

**Retention windows: TBD**, and they are a records-management question, not an
infrastructure one — clock-in photos are attendance evidence for real workers.

## 4. Guardrails that were missing

Independent of retention, these would have turned the outage into an alert:

- **`FreeStorageSpace` alarm** on RDS. AWS emitted a "low storage" event at 5%;
  nothing was watching it. Alarm well before that — 25% and 10%.
- **Free-space pre-flight before a migration chain.** The cutover checklist
  checks disk on the EC2 box but not on RDS, and migration `17520` copies a
  base64 column into a new table. A chain that duplicates data needs a headroom
  check on the database volume.
- **`FreeableMemory` alarm.** `db.t4g.micro` has 1 GB. Under pressure Postgres
  kept serving *existing* pooled connections while refusing *new* ones — so the
  API looked healthy at 200 while nobody could log in. That failure mode is
  invisible to a plain health check.
- **Nightly `pg_dump` to S3.** The free plan caps automated backups at 1 day.

## 5. What was actually done on 2026-09-02

Recorded so the numbers are not re-derived later:

- `location_logs` truncated: 8,496,250 rows → 0 (restored afterwards from the
  rescue dump, which is retained 30 days in `sekar-migration-204284492859`)
- Photo backfill: 22,809 activity rows now reference S3, **0** inline remain;
  bucket holds 38,289 objects / 9.89 GB
- `VACUUM FULL` on `activities`, `shifts`, `attendance_punches`
- Database **16 GB → 224 MB**; `activities` **12 GB → 18 MB**
- RDS storage raised 20 → 40 GB as a temporary measure; the plan is to
  `pg_dump`/restore into a fresh 20 GB instance and delete the 40 GB one
