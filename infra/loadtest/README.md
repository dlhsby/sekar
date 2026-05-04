# SEKAR Load Tests

Phase 3 sub-phase 3-14 — k6 harness for the monitoring-v2 pipeline (ADR-029).

## Prerequisites

1. [k6 installed](https://k6.io/docs/get-started/installation/) (`brew install k6` / `apt install k6`).
2. Backend running with Redis enabled (`./infra/start.sh && cd be && npm run start:dev`).
3. Seeded database with at least `WORKER_COUNT` users named `${WORKER_PREFIX}${1..N}` (e.g. `satgas1..satgas500`). The default seed only creates a handful — for a real 500-VU run, generate users via a dedicated `seed-loadtest.ts` (TODO) or lower `WORKER_COUNT` to whatever your seed contains.

## Quick run (smoke, 5 VUs / 30 s)

```bash
k6 run \
  -e API=http://localhost:3000 \
  -e WORKER_COUNT=5 \
  -e PING_INTERVAL=12 \
  -e DURATION=30s \
  infra/loadtest/monitoring-500w.js
```

## Full run (500 VUs / 30 min — staging only)

```bash
k6 run \
  -e API=https://api-staging.sekar.dlhsurabaya.go.id \
  -e WORKER_COUNT=500 \
  -e PING_INTERVAL=12 \
  -e DURATION=30m \
  -e WORKER_PREFIX=loadtest_satgas \
  -e WORKER_PASSWORD=$LOADTEST_PASSWORD \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
  infra/loadtest/monitoring-500w.js
```

## Pass thresholds

The script enforces these via k6 `thresholds`; the run exits non-zero if any breach.

| Metric | Threshold |
|--------|-----------|
| `http_req_duration{type:ingest}` p95 | < 200 ms |
| `ws_broadcast_latency_ms` p95 | < 500 ms |
| `checks` rate | > 0.999 |

## What gets exercised

- **Pinging scenario** (constant-VU, `WORKER_COUNT` VUs): each VU posts one
  `POST /api/v1/location/batch` every `PING_INTERVAL` s — drives the Redis
  Streams projector + staffing debouncer.
- **Monitoring scenario** (5 VUs): admin-authenticated Socket.IO clients
  subscribe to monitoring updates; each broadcast frame's `broadcasted_at`
  timestamp is diffed against client receipt time to populate
  `ws_broadcast_latency_ms`.

## Out-of-band assertions (manual / Datadog)

These are not enforced by the script — verify after each run:

- Postgres pool utilization < 70 % (`pg_stat_activity` snapshot).
- Redis stream consumer lag < 5 s at any point.
- Zero missed status transitions (sample 100 VUs' WS log against DB).

See [`specs/phases/phase-3-plants-monitoring-rebuild/infrastructure.md`](../../specs/phases/phase-3-plants-monitoring-rebuild/infrastructure.md#k6-load-test-harness) for the full spec.
