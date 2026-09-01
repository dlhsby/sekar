# ADR-052: Domain term `rayon` → `district` (code/DB English-canonical; UI keeps "Rayon")

## Status

Accepted — **New**

## Date

2026-07-20

## Context

The geography tier between city and kawasan was named **`rayon`** everywhere — DB
table/columns (`rayons`, `*.rayon_id`), TypeORM entity (`Rayon`), module/routes
(`/rayons`), DTOs, the monitoring drill scope value `'rayon'`, and hundreds of
identifiers. `rayon` is an Indonesian word; the rest of the codebase is
English-canonical (ADR-010: *code English, Indonesian only for UI labels*). The
odd term out read confusingly next to `region`/`location`/`city` and made the
API/Swagger surface half-Indonesian.

Two axes were being conflated: the **stored English identifier** (schema, code,
API contract) and the **Indonesian label the user sees**. DLH Surabaya calls this
tier "Rayon" and will keep doing so — the term must survive in the UI.

## Decision

Standardise on **`district`** for **DB, code, and English UI**, and keep
**"Rayon"** as the **Indonesian UI/translation** term only.

- **DB:** physical rename — `rayons` → `districts`, every `rayon_id`/`to_rayon_id`
  FK column → `district_id`/`to_district_id` (14 tables), via migration
  `17510000000000-RenameRayonToDistrict` (idempotent, reversible). **District
  *names* are data and stay Indonesian** — `"Rayon Pusat"`, `"Rayon Barat 1"`, …
  are untouched (they are display values, not identifiers).
- **Code:** entity `Rayon` → `District`; module `rayons/` → `districts/`;
  route `@Controller('rayons')` → `'districts'`; DTOs (`*RayonDto` → `*DistrictDto`,
  `RayonStatsDto` → `DistrictStatsDto`); enum `StaffingLevel.RAYON` → `.DISTRICT`;
  monitoring drill scope value `'rayon'` → `'district'`; WS room/event
  `monitoring:rayon:{id}` / `subscribe:rayon` → `monitoring:district:{id}` /
  `subscribe:district`; and all geography-tier identifiers.
- **English UI:** the frontends render "District" from English copy; **Indonesian
  copy renders "Rayon"** via i18n (Stage 4).

### Deliberately kept as `rayon` (not identifiers of the tier)

- **Role codes** `admin_rayon`, `kepala_rayon` (+ TS enum keys `ADMIN_RAYON`,
  `KEPALA_RAYON`, seed user codes `*_rayon_*`) — role codes are **frozen contract**
  (JWT + guards); renaming them would force re-logins and break tokens. They mirror
  the role, not the geography tier.
- **DB constraint / index names** that embed `rayon` (`FK_users_rayon_id`,
  `idx_rayons_code`, `UQ_rayons_code`, …) — cosmetic; TypeORM matches on the explicit
  names the entities declare, and renaming them is churn with no behavioural value.
- **Frozen migrations** (all pre-`17510000000000`) — history is immutable.
- **Snapshot seed keys** (`rayon_code`/`rayon_lat`/`rayon_lng` in the districts
  snapshot JSON) and the **CSV-import contract** (`rayonName`,
  `historical_rayon_name` in the pruning backfill) — external/frozen data shapes.

## Rollout (staged, per the user)

Physical DB rename, staged across multiple PRs — each verified green before the next:

1. **DB migration + backend** *(this PR)* — schema rename + full backend code sweep.
2. **Web** — types, `/districts` API calls, drill `Scope`/`variant` `'rayon'` → `'district'`.
3. **Mobile** — same, plus the WS `subscribe:district` event.
4. **i18n split** — English keys → `district`; Indonesian copy keeps "Rayon".

## Consequences

- **Contract change — clients lag the backend between stages.** After Stage 1 the
  WS room/event is `subscribe:district`; web/mobile still emit `subscribe:rayon`
  until Stages 2–3. This is intentional (backend-first) and self-heals as each stage
  lands. Record in the cutover plan alongside `areaType`→`locationType` and the
  `radius_meters` removal.
- The `district`/`region`/`location`/`city` scope vocabulary is now internally
  consistent, matching the ADR-044 `monitoring_scope` values already in use.
- Verified Stage 1: backend `tsc` clean, **149 suites / 2459 tests** pass, `eslint`
  0 errors; app boots against the renamed schema (`GET /districts` returns rows with
  `name: "Rayon Barat 1"`, `users.district_id` queried live).
