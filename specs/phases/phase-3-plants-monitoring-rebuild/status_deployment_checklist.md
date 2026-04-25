# Phase 3: Deployment Checklist

**Last Updated:** 2026-04-24
**Status:** ⏳ Not Started
**Deployment pattern:** Feature-flagged pilot → rollout
**Related ADRs:** [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md)
**See also:** [Infrastructure](./infrastructure.md), [Testing (incl. manual QA)](./testing.md), [README](./README.md)

---

## Pre-Deploy Verification

### Code & migrations

- [ ] All sub-phases 3-1 through 3-14 marked ✅ in [STATUS.md](./STATUS.md)
- [ ] All backend unit/integration tests pass in CI (≥ 85 % stmts per new module)
- [ ] All mobile/web tests pass in CI
- [ ] ESLint rule for `tracksViewChanges={true}` is enabled and CI passes
- [ ] `17460000000000-Phase3Schema.ts` applies cleanly on staging DB clone
- [ ] `17460001000000-Phase3BackfillIndexes.ts` applies with `CONCURRENTLY` (no long locks)
- [ ] Migration round-trip test (apply → revert → re-apply) passes on scratch DB
- [ ] CSV backfill seeder runs on a 10-row fixture and on the full 5,008-row CSV; re-run produces 0 inserts (idempotent on `activities.reference_code`)

### Infrastructure

- [ ] Redis 7 service added to production docker-compose / k8s manifest
- [ ] `REDIS_URL` set in production secrets; matches region/VPC of backend
- [ ] Redis AOF persistence enabled; volume mounted
- [ ] `maxmemory 256mb` + `allkeys-lru` set
- [ ] `redis-cli ping` from backend host returns `PONG`
- [ ] `/health/full` returns `redis: { status: "up", stream_lag_s: <5 }`
- [ ] Socket.IO Redis adapter loads on boot (log line `Redis adapter attached to /`)
- [ ] Fallback mode tested: kill Redis → backend logs `WARN Redis unreachable, falling back to in-process pub/sub` → `/health/full` reports `redis: down`, HTTP 200 with `status: "degraded"`

### Feature flag

- [ ] `PHASE3_FEATURES_ENABLED=false` on production
- [ ] Flag infra (`feature_flags` table) has Phase 3 entries for: `phase3.enabled`, `phase3.cluster_v2`, `phase3.plant_overlays`
- [ ] Rayon-scoped toggle verified: flag can be enabled for `rayon=Selatan` only

### Env vars (new)

- [ ] `REDIS_URL`
- [ ] `REDIS_STREAM_MAX_LEN=100000`
- [ ] `MONITORING_SWEEP_CRON=*/5 * * * *`
- [ ] `STAFFING_DEBOUNCE_SECONDS=30`
- [ ] `CLUSTER_ZOOM_THRESHOLD=14`
- [ ] `PHASE3_FEATURES_ENABLED` present (default `false`)

### Load test

- [ ] k6 `monitoring-500w.js` run completed on staging-like env
- [ ] p95 ingest < 200 ms ✅
- [ ] p95 `status:v2` broadcast < 500 ms ✅
- [ ] Postgres pool utilization < 70 % ✅
- [ ] Redis stream consumer lag < 5 s ✅
- [ ] Zero missed status transitions on 100-worker sampled subset ✅
- [ ] Report archived under `infra/loadtest/reports/<date>-phase3.html`

### Data

- [ ] `plant_species` seed loaded (131 rows)
- [ ] `monitoring_configs` new rows present (`staffing_debounce_seconds`, `stale_status_sweep_cron`, `cluster_zoom_threshold`, `redis_stream_max_len`)
- [ ] `service_capacity` seed loaded (7 rayons × 12 weeks × `pruning`)
- [ ] CSV backfill run completed; `SELECT COUNT(*) FROM activities WHERE reference_code LIKE '25PR%'` returns 5,008
- [ ] Drive→S3 photo rehost job completed (spot-check 10 random photos are served from S3)

### Auth / role matrix

- [ ] `staff_kecamatan` enum value present in `user_role` type
- [ ] `PRUNING_REQUEST_REVIEWERS` role group deployed and includes `admin_data`
- [ ] `role-matrix.e2e-spec.ts` integration test passed
- [ ] Spot check: `admin_data` in Rayon Timur cannot review a request from Selatan (403)
- [ ] Spot check: `staff_kecamatan` cannot reach `/monitoring/snapshot` (403)

### Documentation

- [ ] `specs/COMPLETION_STATUS.md` updated with Phase 3 status
- [ ] `specs/api/contracts.md` includes all ~35 new endpoints
- [ ] `specs/database/schema.md` + `erd.md` include new tables and indexes
- [ ] `specs/deployment/infrastructure.md` includes Redis
- [ ] ADR-029 through ADR-035 merged and linked

---

## Deployment Sequence

1. **Additive DB migrations**
   ```
   npm run migration:run           # on production DB
   npm run migration:run:loadtest  # CONCURRENTLY indexes (separate file)
   ```
2. **Backend deploy**, `PHASE3_FEATURES_ENABLED=false`
3. **Verify** `/health/full` reports Redis up
4. **Run CSV backfill** seeder in dry-run first, then full
5. **Web + mobile OTA** deploy
6. **Pilot flag ON** for Rayon Selatan only (`UPDATE feature_flags SET value='true' WHERE key='phase3.enabled' AND scope='rayon:selatan'`)
7. **Observe 48 h** — check metrics + bug reports
8. **Flag ON for all rayons** (scope=global)

---

## Rollback Procedure

1. Flip `phase3.enabled` to `false` (global or per-rayon as appropriate)
2. Clients within ~30 s revert to Phase 2E behavior (WS event listeners ignore Phase 3 events; map falls back to Phase 2D rendering)
3. If rollback happens mid-deploy: redeploy previous backend image
4. **Do not revert migrations** — they are additive and safe to keep

**Full revert (rare, only if Phase 3 is fully abandoned):**
- Run `down()` migrations as documented in [database.md §Rollback Notes](./database.md#rollback-notes)
- Remove Redis from docker-compose
- Revert backend to Phase 2E tag

---

## Post-Deploy Monitoring (first 48 h)

| Metric | Target | Alert threshold |
|--------|--------|-----------------|
| Redis stream lag (`XINFO GROUPS`) | < 5 s | > 30 s for 5 min |
| Postgres active connections | < 10 of 15 | > 13 for 1 min |
| `/api/v1/location/batch` p95 | < 200 ms | > 500 ms for 5 min |
| `status:v2` emit-to-receive p95 | < 500 ms | > 1 s for 5 min |
| Pruning requests submitted | > 0 | — |
| Pruning requests converted | > 0 within 24 h | — |
| FCM deliveries to submitters | > 90 % success | < 80 % for 1 h |
| Mobile app crashes tagged `monitoring/cluster` | 0 | any |

On-call rotation: backend lead primary, mobile lead secondary for first 48 h.

---

## Sign-off

| Role | Name | Date | Sign-off |
|------|------|------|----------|
| Backend lead | | | ☐ |
| Mobile lead | | | ☐ |
| Web lead | | | ☐ |
| QA lead | | | ☐ |
| Product owner | | | ☐ |
| DLH client rep | | | ☐ |

---

**Last Updated:** 2026-04-24
