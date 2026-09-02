# ADR-058 — No inline media in Postgres

**Status:** Active · implemented in code; data backfilled on live staging 2026-09-02 (see tail) · enforcement partial
**Date:** 2026-08-01
**Rests on:** F9 tier-2 (see [`../../deployment/staging-cutover-runbook.md`](../../deployment/staging-cutover-runbook.md) §2, §8)

## Context

Photos were persisted as base64 `data:` URIs in `text` columns. On the
2026-08-01 staging clone that was **528 MB of a 658 MB database — 80 %**:

| column | rows holding a data URI | bytes |
|---|---|---|
| `attendance_punches.photo_url` | 1 361 / 1 361 | 250 MB |
| `shifts.clock_in_photo_url` | 773 / 773 | 140 MB |
| `shifts.clock_out_photo_url` | 588 / 588 | 110 MB |
| `users.profile_picture_url` | 163 / 163 | 28 MB (one row 5.4 MB) |

Every one of those columns was **100 %** inline. The cost is not only disk: a
column joined into a list is re-serialised per row, which is how an unscoped day
roster reached **190 MB** (ADR-057) — one 137 KB avatar, repeated across each of
that worker's rows.

A global `PhotoUrlInterceptor` and a backfill script already existed and the
runbook recorded the work as done. It regressed anyway, three times over, which
is what this ADR exists to prevent.

## Decision

**An image is never stored in Postgres. The column holds a URL to object
storage; the bytes live in MinIO (local and production) or S3 (staging).**

Three mechanisms, in order of preference:

1. **`PhotoUrlInterceptor` (global).** Converts any inline `data:`/`blob:` value
   in a known photo field to storage *before* the handler runs, and presigns
   stored URLs on the way out. Clients may keep sending base64 — the backend
   simply refuses to persist it. This is why the mobile app needed no change.
2. **`PhotoStorageService`** for handlers the interceptor structurally cannot
   reach: `store(dataUri, folder)`, and `upload(buffer, mime, folder)` for
   multipart, where there is no body field to rewrite.
3. **`npm run backfill:inline-photos`** for existing debt. Idempotent,
   keyset-paginated, per-row isolated, content-hash deduped.

## Why it regressed, and what each rule is guarding

Every one of these was a silent failure — green tests, working feature, wrong
storage:

- **The interceptor rewrites *fields*, so a name it does not know is a hole.**
  Clock-in selfies arrive as **`selfie_photo`**, absent from `FIELDS`, and went
  straight through to `attendance_punches.photo_url`. → *A new photo field must
  be added to `FIELDS`, or converted explicitly in its service.*
- **The map is keyed on the JSON property, which is the ENTITY property, not the
  column.** `Activity.photoBeforeUrl` (`@Column({ name: 'photo_before_url' })`),
  `PruningRequest.photoUrls` and `NotablePlant.photoUrls` never matched their
  snake_case keys, so they were skipped in *both* directions. → *Both spellings
  are listed. Check the property name, not the migration.*
- **A multipart handler runs after the interceptor.**
  `POST /users/:id/profile-picture` assembled the data URI itself, inside the
  handler. → *Use `PhotoStorageService.upload` for uploads.*
- **A new table is not in the backfill list automatically.**
  `attendance_punches` postdates the script and was never swept — the single
  largest column of the four. → *Adding a photo column means adding a `TARGETS`
  entry.*

## Consequences

- **Stored URLs are private and time-limited.** The bucket refuses an unsigned
  request — a raw object URL answers **403**, verified — so a photo field that
  the interceptor misses is a *broken image*, not merely an unsigned one.
- **Presigned links expire (24 h), so no client may cache one indefinitely.**
  Mobile persists the whole user object; `AuthProvider.restoreSession` already
  fetched `/auth/me` on boot but merged only `location_id`/`district_id`, so the
  avatar stayed the link signed at *login* and 403'd a day later. `MeResponseDto`
  documents the TTL.
- **A list endpoint must not select a photo column it does not render.** This is
  the ADR-057 rule seen from the other side.
- **Deploys need the backfill run**, then `VACUUM (FULL)` — **one table per
  statement**, because `psql -c` runs a multi-statement string in a transaction
  and vacuum cannot run inside one.

## Not required: rejecting base64 at the DTO

The original plan called for `IsNotInlineMedia` on every photo DTO field. That
was superseded by decision (1): clients may still send base64, and the backend
converts it. Adding the validator to `selfie_photo` would reject exactly what the
installed mobile app sends. It stays only where the client already uploads
separately (`activities`).

## Results

Backfill on the staging clone: **2 905 photos / 398.9 MB in 1 m 55 s, zero
failures, 1 541 distinct objects** (dedup avoided 1 364 duplicate uploads). All
columns then report 0 inline. After `VACUUM (FULL)`:

| | before | after |
|---|---|---|
| database | 658 MB | **100 MB** |
| `shifts` | 269 MB | 4.9 MB |
| `attendance_punches` | 267 MB | 5.9 MB |

End to end: a multipart upload lands a bare URL in the column, the API returns it
presigned, and the browser decodes it.

---

## Applied to live staging — 2026-09-02

The results above were measured on the **2026-08-01 rehearsal clone**. Live
staging was not migrated at that time and kept accumulating inline photos, so
the "implemented" status was true of the *code path* but not of the *data*.

The backfill finally ran on live staging during the AWS account migration, and
the real numbers were an order of magnitude larger than the clone's:

| | Clone (2026-08-01) | Live staging (2026-09-02) |
|---|---|---|
| `activities` inline rows | — | **22,802** |
| `activities` size | — | 12 GB → **18 MB** |
| Total inline media | 528 MB | **12.9 GB** across 12 columns |
| Database | 658 MB → 100 MB | 16 GB → **224 MB** |

Objects now in S3: **38,289** (9.89 GB). Rows still holding a `data:` URI: **0**.

### What this cost before it was fixed

Not hypothetical. On 2026-09-02 the inline photos filled the 20 GB staging
volume during the cutover, and Postgres stopped accepting writes — at zero free
space it cannot even `TRUNCATE`, because that needs WAL space. Recovery required
raising storage (RDS storage can never be reduced in place, so this then forced
a dump/restore onto a fresh instance). Migration `17520` made it worse by
copying `shifts.photo_url` verbatim into the new `attendance_punches` table —
519 MB for 1,361 photos, the same image stored twice.

### The rule is only half-enforced

F9 Phase A stopped new inline photos on `activities`. **The other write paths
can still inline one**, so the debt re-accrues and the backfill has to be
re-run. The remaining columns are enumerated in
[`../../deployment/data-retention.md`](../../deployment/data-retention.md) §3.
Closing those paths is what would let this ADR claim "implemented" without
qualification.

**Status is therefore better read as: decided and proven, enforcement partial.**
