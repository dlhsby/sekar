# E2E scenario catalog

One object per scenario carrying **what it proves, how to arrange it, and what the
API must answer**. Seeding and verification read the same object, so a scenario
cannot drift from its own assertion.

```bash
npm run e2e:scenarios                      # arrange + verify (local dev DB)
npm run e2e:scenarios -- --only=ATT        # one domain, or --only=ATT-12,MON-18
npm run e2e:scenarios -- --verify-only     # assert without re-arranging
npm run e2e:scenarios:seed                 # arrange only — no API needed
npm run e2e:scenarios:purge                # remove every e2e_* subject and row
```

The API must be running and pointed at the **same database** the runner seeds.
For the local dev DB that is `apps/be/.env.local` defaults (`sekar_db` on 15432).

## Two rules the catalog is built on

**1. `arrange` writes punches, never `shifts` rows.** Since ADR-055 the session is
*derived* from the punch log. The previous seeder wrote the projection directly and
staged **zero punches**, so every seeded worker had an empty Log Kehadiran and no
derivable Jam Masuk/Keluar. Here the projection is rebuilt from the punches using
the production `AttendanceDerivationService`, so a seeded session is computed by
the same code the API uses.

**2. Every expectation is about its own subject, never a global total.** The same
catalog runs against the local DB and against the staging clone, where 1 184 real
users make any absolute count meaningless. `"this worker resolves to terlambat"`
holds in both; `"the city shows 7 online"` does not.

## Subjects

Every scenario owns a dedicated `e2e_<handle>` user, created on demand and
removable with `--purge`. Dedicated accounts rather than demo personas because a
scenario must not depend on state another scenario mutates — and on the staging
clone, real users have unknown password hashes and must not be polluted.

Lokasi assignment is deterministic (hash of the scenario id), so a re-run puts the
same worker in the same place.

## Adding a scenario

```ts
{
  id: 'ATT-07',
  domain: 'attendance',
  title: 'Back-to-back shifts do not merge into one session',
  proves: 'ADR-055 — the session key includes the shift definition',
  guards: 'optional: the defect this stops coming back',
  subject: { handle: 'att_b2b', role: 'satgas', scope: 'location' },
  async arrange({ helpers, subject, today }) { /* write punches + schedules */ },
  expect: [{ what: '…', get: ({ today }) => `/…`, as: 'worker', check: (body) => null }],
}
```

Two traps worth knowing, both learned by scenarios failing:

- **Schedule on `helpers.currentShiftDefId()`**, not a hardcoded `'Shift 3'`, for
  anything asserting display scope or staffing. `scheduleScopesForCurrentShift`
  only matches occurrences on the shift whose window contains *now*, so a
  hardcoded shift silently falls back to city scope whenever the suite runs
  outside that window.
- **Mark self-only reads `as: 'worker'`.** `/shifts/attendance/:date/punches` and
  `/shifts/current-state` are `@Roles(...CLOCKABLE_ROLES)` reading `@GetUser()`:
  an admin gets 403 and there is no `userId` parameter to widen them with.

`assertCatalogIsSound()` rejects duplicate ids and any scenario that arranges data
but asserts nothing — the shape that passes vacuously.

## Coverage

`CATALOG` is a plain array, so holes are findable rather than assumed:

```ts
CATALOG.filter((s) => s.guards)          // regression guards
CATALOG.filter((s) => s.domain === 'monitoring')
```

Clock-dependent variants that need an injected `now` (evaluating a shift at 02:00)
stay in the unit tests — the runner cannot move the wall clock. Mobile stays
manual; this proves the API contract both clients read.
