# Phase 3: Infrastructure

**Last Updated:** 2026-04-24
**Status:** ⏳ Not Started
**New dependency:** Redis 7 (promoted from Phase 4 per [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md) for monitoring v2)
**Related ADRs:** [ADR-016](../../architecture/decisions/ADR-016-redis-websocket-scaling.md), [ADR-029](../../architecture/decisions/ADR-029-monitoring-v2-redis.md), [ADR-034](../../architecture/decisions/ADR-034-pruning-cycle-prediction.md)
**See also:** [Backend](./backend.md), [Deployment Checklist](./status_deployment_checklist.md), [README](./README.md)

---

## Token Generator CI Job (M1-R sub-phase 3-R1)

A new CI job `tokens-verify` enforces zero drift between `specs/ui-ux/tokens.json` and the committed generated artifacts.

- **Workflow:** `.github/workflows/ci.yml` — new job `tokens-verify` runs on every PR before build/test.
- **Steps:**
  1. `npm ci`
  2. `npx ajv validate -s specs/ui-ux/tokens.schema.json -d specs/ui-ux/tokens.json` (schema gate)
  3. `npm run tokens:build` (regenerates `fe/web/src/app/generated/tokens.css` + `fe/mobile/src/constants/generated/tokens.ts`)
  4. `git diff --exit-code` over `fe/web/src/app/generated/` and `fe/mobile/src/constants/generated/` (drift gate)
- **Failure mode:** non-zero diff → fail with diff posted as job summary. Devs fix `tokens.json`, re-run `npm run tokens:build`, and commit the regenerated files.
- **Artifacts:** generator output is **always committed** (git-tracked). CI re-runs the generator to verify.

## PWA Build Pipeline (M1-R sub-phase 3-R4)

The web PWA is built by the existing Next.js `build` step plus a service-worker emit.

- **Source:** `fe/web/src/sw/sw.ts` — TypeScript service worker source (Workbox-manifest assisted; library choice locked in ADR-037).
- **Output:** `fe/web/public/sw.js` — emitted during `next build`; gitignored at `public/sw.js` level (regenerated each build).
- **Manifest:** `fe/web/public/manifest.webmanifest` — committed.
- **Icons:** `fe/web/public/icons/` — committed (192/512/512-maskable/180 apple-touch).
- **Feature flag:** `NEXT_PUBLIC_FEATURE_PWA` controls service-worker registration in `app/layout.tsx`. Production-only by default; staging set to enabled after smoke test.
- **Lighthouse audit (CI):** `npm run lighthouse:pwa` (uses `lighthouserc.json`) on staging URL; PWA score < 90 fails the staging deploy.

## Visual Regression CI Jobs (M1-R sub-phase 3-R3)

- `web-visreg` — runs `npx playwright test fe/web/e2e/visual-regression.spec.ts` after `npm run build`. Pinned Chromium version. Diff artifacts uploaded on failure for reviewer comparison.
- `mobile-snapshots` — runs `npm test -- --ci` in `fe/mobile`; fails on Jest snapshot diff. Authors update baselines with explicit `[visreg-update]` commit tag.

## ESLint CI Gates (M1-R sub-phase 3-R1)

- Existing `web-lint` and `mobile-lint` jobs gain new rules: `no-inline-hex-colors`, `no-tailwind-shadow-classes-with-blur`, `prefer-nb-shadow-utility`, mobile RN custom rule banning `shadowRadius > 0` outside `generated/`.
- Allowlist file `scripts/hex-allowlist.txt` documents legitimate exceptions (e.g., `bg.overlay` rgba, embedded SVG fills); CI checks against the allowlist.

---

## Summary of Changes

| Component | Change | Reason |
|-----------|--------|--------|
| `infra/docker-compose.yml` | +`redis:7-alpine` service. Host port `16379` (overridable via `REDIS_PORT` env), container internal `6379`. The `+10000` offset avoids colliding with system Redis or another project on the dev box. | Socket.IO Redis adapter + Redis Streams + cache |
| `be/src/common/services/redis.service.ts` | New | Connection pool + `/health` report + graceful shutdown |
| `be/src/gateways/events.gateway.ts` | Wire `@socket.io/redis-adapter` | Horizontal-scale WS (future multi-instance) |
| `be/src/modules/monitoring/streams/` | New | Redis Streams producer + consumer group for `location:pings` |
| `be/src/modules/monitoring/cron/` | +2 cron jobs | `MonitoringStaleSweeper` (every 5 min), `PlantDueDateRecalculator` (daily 02:00 WIB) |
| `infra/loadtest/` | New k6 harness | 500-worker / 12-s ping / 30-min simulation |
| `.env.example` | +5 entries | See below |
| `be/src/modules/health/` | Extend | Add Redis check to `/health/full` |

---

## docker-compose additions

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: sekar-redis
    restart: unless-stopped
    ports:
      # Host 16379 (override via REDIS_PORT) → container 6379.
      - "${REDIS_PORT:-16379}:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - sekar-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  sekar-redis-data:
```

Redis runs alongside PostgreSQL (5432), Adminer (8080), LocalStack S3 (4566). Host port `16379` (offset by `+10000` from the default to avoid colliding with system Redis or another project on the dev box). Production deployments continue to use the standard `6379` via `REDIS_HOST` / `REDIS_URL` secrets.

---

## `.env.example` additions

```env
# Redis (Phase 3) — dev host port is 16379 (override REDIS_PORT in infra/.env).
# Production uses the standard 6379 via secrets pipeline.
REDIS_URL=redis://localhost:16379
REDIS_STREAM_MAX_LEN=100000          # MAXLEN ~ trim threshold on XADD

# Monitoring v2
MONITORING_SWEEP_CRON=*/5 * * * *    # StaleStatusSweeperService
STAFFING_DEBOUNCE_SECONDS=30         # AREA_STAFFING_CHANGED debouncer window
CLUSTER_ZOOM_THRESHOLD=14            # Google Maps zoom above which markers replace clusters

# Feature flags
PHASE3_FEATURES_ENABLED=false        # Master switch (see deployment checklist)
```

Production values for `REDIS_URL` go through the same secrets pipeline as `DATABASE_URL` (not committed).

---

## Redis Streams Pipeline

**Stream:** `location:pings`

| Step | Who | Command |
|------|-----|---------|
| Produce | `LocationService.ingest()` | `XADD location:pings MAXLEN ~ 100000 * user_id <...> lat <...> lng <...> ts <...>` |
| Consume | `StatusProjectorService` | `XREADGROUP GROUP monitoring-projector consumer-1 COUNT 100 BLOCK 1000 STREAMS location:pings >` |
| Ack | same | `XACK location:pings monitoring-projector <id>` |

The consumer group guarantees at-least-once delivery. The projector is idempotent on `(user_id, ts)` via an UPSERT into `user_tracking_status`.

**Trim policy:** `MAXLEN ~ 100000` means the stream never grows beyond ~100k messages (approximate trimming for performance). At 500 workers × 1 ping / 12 s × 3600 s = 150k pings/hour — stream keeps ~40 minutes of history, enough for projector replay on restart.

---

## Socket.IO Redis Adapter

```ts
// be/src/gateways/events.gateway.ts
import { createAdapter } from '@socket.io/redis-adapter';

afterInit(server: Server) {
  const pubClient = this.redis.duplicate();
  const subClient = pubClient.duplicate();
  server.adapter(createAdapter(pubClient, subClient));
}
```

**Fallback:** If `REDIS_URL` is unreachable on boot, `RedisService` logs `WARN` and wires the adapter as a no-op, falling back to in-process pub/sub (single-instance degraded mode). `/health/full` reports `redis: "down"` so operators notice.

---

## Cron Jobs

| Job | Cron | Service | Purpose |
|-----|------|---------|---------|
| `MonitoringStaleSweeper` | `${MONITORING_SWEEP_CRON}` (default `*/5 * * * *`) | `StaleStatusSweeperService` | Flip `ACTIVE` without recent ping → `MISSING` |
| `PlantDueDateRecalculator` | `0 2 * * *` WIB | `PlantDueDateService.recomputeAll()` | Recompute `area_plants.next_due_at` and `status` |
| `OverdueAreasDigest` | `0 7 * * 1` WIB (Mondays) | `PlantDueDateService.sendWeeklyDigest()` | Email / FCM to top_management + admin_data |

Cron scheduling uses `@nestjs/schedule`. Jobs skip silently if `PHASE3_FEATURES_ENABLED=false`.

---

## Health Check

`GET /health/full` returns:

```json
{
  "status": "ok",
  "checks": {
    "database":   { "status": "up", "latency_ms": 4 },
    "redis":      { "status": "up", "stream_lag_s": 1.2, "last_ack_ts": "…" },
    "monitoring": { "status": "up", "active_consumers": 1, "sweep_last_run": "…" }
  }
}
```

If Redis is down, `status: "degraded"` (200) is returned — the service continues with in-process pub/sub. `redis: down` is visible for operators.

---

## k6 Load Test Harness

Location: `infra/loadtest/monitoring-500w.js`.

```js
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    pinging: {
      executor: 'constant-vus',
      vus: 500,
      duration: '30m',
    },
  },
  thresholds: {
    'http_req_duration{type:ingest}':  ['p(95)<200'],
    'ws_msgs_received':                ['count>0'],
    'checks':                          ['rate>0.999'],
  },
};

export default function () {
  const token = __ENV.K6_WORKER_TOKEN;
  const res = http.post(`${__ENV.API}/api/v1/location/batch`,
    JSON.stringify({ pings: [/* one ping, lat jitter */] }),
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      tags: { type: 'ingest' } }
  );
  check(res, { 'ingest 201': r => r.status === 201 });
  sleep(12);
}
```

**Pass criteria:**

- p95 `ingest` < 200 ms
- p95 `status:v2` broadcast latency < 500 ms (measured via separate WS client)
- Postgres pool utilization < 70 % (Datadog / `pg_stat_activity` spot checks)
- Redis stream consumer lag < 5 s at any point
- Zero missed status transitions (audit from a 100-worker sampling subset's client-side WS log vs DB)

Run with: `k6 run -e API=http://localhost:3000 -e K6_WORKER_TOKEN=... infra/loadtest/monitoring-500w.js`.

---

## Deployment Sequence

1. Additive DB migrations.
2. Backend deploy with `PHASE3_FEATURES_ENABLED=false`.
3. Verify `/health/full` reports Redis up.
4. Run CSV backfill seeder (idempotent on `activities.reference_code`).
5. Web + mobile OTA.
6. Flip `PHASE3_FEATURES_ENABLED=true` in pilot rayon (Selatan) via config table (`feature_flags` — re-use existing flag infra).
7. Observe 48 h.
8. Enable for all rayons.

**Rollback:** set `PHASE3_FEATURES_ENABLED=false` and redeploy previous image. Migrations are additive; no reverse migration unless the entire phase is abandoned.

---

**Last Updated:** 2026-04-24
