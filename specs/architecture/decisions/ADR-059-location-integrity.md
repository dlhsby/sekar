# ADR-059 — Location integrity (anti-spoofing)

**Status:** Active · implemented
**Date:** 2026-08-02
**Relates to:** [ADR-005→010](./README.md) (advisory geofencing — **unchanged**), [ADR-050](./ADR-050-presence-model.md) (presence axes), [ADR-055](./ADR-055-punch-attendance-model.md) (punch log)

## Context

The release app shipped with **no anti-spoofing defences at all**:

- `react-native-geolocation-service` exposes `position.mocked`; it was never read.
- ~10 independent `getCurrentPosition` / `watchPosition` call sites each declared their
  own options, so any new rule would have to be added in ten places to hold.
- `resolvePunchedAt` clamped only the **future**. Backdating was unbounded — a device
  with its clock rolled back could claim a punch from any point in the past, with no
  GPS spoofing involved at all.
- The tracking stream trusted `logged_at` completely, and that field *drives presence*
  (`ACTIVE` vs `OFFLINE`). A client could therefore fabricate its own attendance history.
- Evidence photos could be chosen from the gallery.
- No dedup, rate limit, or anomaly detection on the ping stream.

Clock-in is two moments in a shift; the tracking stream is the whole shift and is what
supervisors actually watch. It was the least defended path in the system.

## Decision

### 1. Block missing and forged location — never "outside area"

Being **outside an assigned area does not block anything**. ADR-005→010 stands: the
geofence remains advisory, `outside_boundary` is still computed, stored and surfaced,
and a punch outside the boundary still succeeds. That behaviour was removed in Phase 2C
for a reason — GPS under tree canopy in parks is exactly the honest case — and this ADR
does not reverse it.

What *is* refused is a fix that is missing or forged, because neither is ever
legitimate:

| Rejection | Rule |
|---|---|
| `MISSING_COORDINATES` | exactly `(0,0)`. `gps_lat`/`gps_lng` are already required by the DTO, so a missing fix arrives as null island, not as absent. A lone zero component is a real place and is accepted. |
| `MOCKED` | the OS reported a mock provider |
| `IMPOSSIBLE_TRAVEL` | implied ground speed above a vehicle-clearing ceiling |

**Poor accuracy is advisory, never a rejection.** It is the tree-canopy case. It also
must never grant a bypass, or a spoofer would simply claim terrible accuracy to look
like an honest worker.

### 2. One evaluator, two consumers

The rules live in `common/utils/location-integrity.util.ts` and are consumed by both
`shifts.service` (punches) and `location.service` (pings). Writing them twice is how one
path silently stops enforcing. It is a pure function — `now` and the previous fix are
passed in — which keeps every branch testable and usable inside a batch loop.

On mobile the mirror of this is `services/location/verifiedPosition.ts`: the single seam
for obtaining a fix. `VerifiedPosition` carries `mocked` alongside the coordinates, so a
caller **cannot obtain coordinates without also receiving the mock verdict**. The check
is a property of the only type you can get a position in, not something a call site opts
into.

### 3. Punches reject; pings are recorded but excluded from presence

A punch is evidence, so it is refused outright — the gate runs before the selfie upload
and the insert, leaving no orphaned photo and no partial state.

A ping is refused differently. The row **is** stored, with `rejection_reason` set.
Dropping it would make a spoofing worker look identical to one whose phone is simply
off, which is the opposite of the point: the row is what lets a supervisor see "faking
location" rather than a silent gap. What refusal costs the worker is **presence** — a
rejected ping never advances tracking status, so they read as inactive until they stop.

A bad ping does not fail the request. Rejecting the whole batch would punish an honest
client for one bad fix among twenty, and the offline queue would then retry the same
payload forever. Pings are judged individually, in capture order, and chained so a
spoofed jump is caught *within* a batch. The last-known-fix lookup only chains from
**clean** rows: seeding the speed check with a spoofed position would make the next
genuine ping look like a teleport.

### 4. Timestamps clamped on both sides

`punched_at` and `logged_at` are clamped into `[now − 24h, now]` and the raw client claim
preserved in `clock_skew_ms`. Clamping rather than rejecting keeps the offline queue
working — a worker with no signal all shift must still be able to sync afterwards — while
closing the backdating hole. Impossible-travel is measured against the **clamped** time;
against the raw claim, a backdated fix would inflate the interval and make any jump look
slow enough to pass.

### 5. Camera-only evidence, and the app blocks while spoofing

Activity, task-completion and pruning photos are camera-only. Profile pictures are not
evidence and are unaffected.

While a mock provider is active the app is blocked by a non-dismissable overlay. There is
no "later": the only way out is to turn the provider off, and the worker is already being
recorded as inactive, so dismissing would only hide that from them. The tracker keeps
sending pings carrying `mocked: true` — silence would look like a switched-off phone.

### 6. Dev override, build-time stripped

`ALLOW_MOCK_LOCATION` / `ALLOW_GALLERY_UPLOAD` in `src/config/integrity.ts`, both gated on
`__DEV__`. `react-native-dotenv` inlines `@env` at bundle time, so these are compile-time
constants; the `__DEV__` guard means a release bundle constant-folds the bypass away and
**cannot honour a misconfigured `.env.production`**. Flags fail closed — only the exact
string `"true"` enables. The backend refuses the permissive value when
`NODE_ENV === 'production'`.

## Consequences

- Server-side controls carry the real weight. Every client check (mock detection, camera-
  only, the blocker) is defeatable by someone who can patch the APK; they raise cost and
  stop casual cheating. The controls that hold are the ones that do not trust the client:
  timestamp clamping, impossible travel, and null-island rejection.
- The client's `is_mocked` is treated as sufficient evidence to **reject**, never as
  evidence to **trust** — the geometric checks still run when a client claims it is clean.
- `MIN_GPS_ACCURACY_METERS` (`gps.constants.ts`), which existed unenforced "for future
  use", now feeds the `poor_accuracy` advisory.
- New columns: `attendance_punches.{poor_accuracy, clock_skew_ms}`,
  `location_logs.{rejection_reason, poor_accuracy, clock_skew_ms}`, plus a partial index
  on clean pings. Migration `17542000000000` is additive and idempotent; no backfill, since
  the defaults describe existing rows correctly.
- Error codes `GPS_MOCKED` / `GPS_MISSING_COORDINATES` / `GPS_IMPOSSIBLE_TRAVEL` are
  distinct because the app shows a different remedy for each.

## Not decided here

Play Integrity attestation, root/emulator detection, device binding, replay nonces, and
EXIF/photo provenance are scoped but not implemented. Each is server-verified work; a
client-side "it passed" is worthless.
