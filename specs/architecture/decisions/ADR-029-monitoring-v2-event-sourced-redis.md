# ADR-029: Monitoring v2 — Event-Sourced Status via Redis Streams + Socket.IO Redis Adapter

## Status

Accepted — **Supersedes [ADR-011](./ADR-011-phase2d-monitoring-status-model.md)**

## Date

2026-04-24

## Context

Phase 2D introduced a five-status monitoring model (ADR-011) backed by `user_tracking_status` and an in-process pipeline: `LocationService.onLocationPing` → `StatusCalculatorService` → `EventsGateway` → in-memory Socket.IO rooms. The five-status model itself (`active | inactive | outside_area | missing | offline`) has proven sound in production. The **pipeline** has not.

Grounded evidence from code exploration (April 2026):

- **Query explosion per ping.** `StatusCalculatorService.onLocationPing` (`be/src/modules/monitoring/services/status-calculator.service.ts:186-263`) issues **6+ DB queries per ping**: user, shift, area, boundary, last status, threshold config. At 500 workers pinging every 12 s (~42 pings/s), this saturates the 15-connection Postgres pool in ~50 s.
- **Missed transitions on batch flush.** `LocationService.saveLocationLogs` (`be/src/modules/location/location.service.ts:92-103`) runs status calculation only on the latest location in a batch. Offline batches submitted on reconnect silently drop intermediate status transitions (e.g., a worker who entered and re-exited an area while offline).
- **Missing indexes.** `location_logs` has only the PK index. Missing `(user_id, logged_at DESC)`, `(shift_id, logged_at)`, `(user_id, shift_id, logged_at)`. Query plans fall back to sequential scans at scale.
- **No stale-status sweep.** A worker who stops pinging (phone off, app killed) stays `ACTIVE` forever. No cron detects this.
- **Staffing-changed fanout storms.** `EventsGateway.emitStaffingChangedIfNeeded` (`events.gateway.ts:362-418`) emits on every status flip. Noisy GPS near an area boundary produces minute-scale fanout storms.
- **In-memory Socket.IO rooms cap horizontal scale.** Adding a second NestJS instance breaks cross-instance event delivery. ADR-016 already approved Redis for this; Phase 2D shipped before it landed.
- **Mobile marker regressions** fixed in commit `c2b8e85` (Apr 24) documented the client-side cost of every spurious broadcast: bitmap redraws, bridge crashes, polygon remounts. We must minimize broadcasts, not just survive them.

ADR-011's status semantics are correct. The transport and projection layers need to be rebuilt.

## Decision

Adopt an **event-sourced monitoring pipeline** with Redis at the center, replacing the in-process `StatusCalculatorService` dispatch.

### Architecture

```
mobile ping → POST /location/logs
  ↓
LocationService (thin; eager-load + enqueue only)
  ↓
Redis Stream: monitoring:ping-stream  (XADD, MAXLEN ~100k)
  ↓
StatusProjectorService (consumer group: status-projector)
  ├─ evaluates ADR-011 five-status transitions
  ├─ idempotent UPSERT into user_tracking_status
  └─ XADD monitoring:status-stream on change
  ↓
StaffingDebouncerService (consumer group: staffing-debouncer)
  ├─ coalesces per-area events in a 30 s tumbling window
  └─ emits AREA_STAFFING_CHANGED once per window per area
  ↓
EventsGateway (behind @socket.io/redis-adapter)
  └─ fans out to monitoring:* rooms across all NestJS instances

StaleStatusSweeperService (@Cron every 5 min)
  └─ flips ACTIVE → MISSING where last_ping_at < now - threshold
```

### Components

| Component | Responsibility |
|---|---|
| `LocationService` (refactored) | Eager-load user + shift + area relations **once per ping**, pre-resolve context, publish to `monitoring:ping-stream`. No status logic in the hot path. |
| `StatusProjectorService` (new) | Single writer to `user_tracking_status`. Consumes `ping-stream`, evaluates transitions per ADR-011, performs idempotent `INSERT … ON CONFLICT DO UPDATE WHERE status_changed`. |
| `StaffingDebouncerService` (new) | Consumes `status-stream`, keyed per `area_id`, 30 s tumbling window. Emits one consolidated `AREA_STAFFING_CHANGED` per area per window. |
| `StaleStatusSweeperService` (new) | NestJS `@Cron('*/5 * * * *')`. SELECTs `user_tracking_status` rows with `status IN ('active','inactive')` and `last_ping_at < now - interval`; flips to `missing`; publishes to `status-stream`. |
| `EventsGateway` (unchanged surface) | Uses `@socket.io/redis-adapter` (per ADR-016) for cross-instance broadcast. No direct writes to `user_tracking_status`. |

### Batch handling

`LocationService` iterates the offline batch and publishes each ping to `monitoring:ping-stream` (not just the latest). The stream's consumer group guarantees in-order, at-least-once projection; idempotency at the projector handles retries.

### Missing indexes (ship with this ADR)

```sql
CREATE INDEX idx_location_logs_user_logged ON location_logs(user_id, logged_at DESC);
CREATE INDEX idx_location_logs_shift_logged ON location_logs(shift_id, logged_at);
CREATE INDEX idx_location_logs_user_shift_logged ON location_logs(user_id, shift_id, logged_at);
CREATE INDEX idx_user_tracking_status_area_updated ON user_tracking_status(area_id, updated_at DESC);
CREATE INDEX idx_user_tracking_status_in_area ON user_tracking_status(is_within_area, area_id);
```

### Configuration (via `monitoring_configs` rows)

| Key | Default | Purpose |
|---|---|---|
| `staffing_debounce_seconds` | 30 | Tumbling-window size for staffing events |
| `stale_status_sweep_cron` | `*/5 * * * *` | Sweeper cron expression |
| `redis_stream_max_len` | 100000 | `XADD MAXLEN ~` bound per stream |
| `cluster_zoom_threshold` | 14 | Client-side clustering boundary (see web/mobile work) |

## Consequences

### Positive

- **Horizontal scale unlocked.** Socket.IO Redis adapter + stateless projectors allow N NestJS instances.
- **DB pressure collapses.** Ping handler drops from 6+ queries to 1 (eager-loaded). All status reads/writes funnel through a single projector with batched UPSERTs.
- **No missed transitions.** Every ping in an offline batch is projected; `StaleStatusSweeperService` guarantees eventual correctness for silent clients.
- **Bounded fanout.** The 30 s staffing debouncer eliminates GPS-jitter storms. Mobile client load drops proportionally.
- **Clean separation of concerns.** Ingest (`LocationService`), projection (`StatusProjectorService`), aggregation (`StaffingDebouncerService`), transport (`EventsGateway`) are independently testable and scalable.
- **Preserves ADR-011 semantics.** The five-status model, thresholds, and `user_tracking_status` schema are unchanged on the read side.

### Negative

- **Redis becomes a production dependency.** Already approved in ADR-016; this ADR hard-commits the adoption for Phase 3 rather than Phase 4.
- **Additional operational surface.** Consumer-group lag and stream length must be monitored. Added to `/health` and runbook.
- **Debugging distributed flows is harder** than a single in-process call. Mitigation: structured logging with `ping_id` correlation from ingest through broadcast.

### Redis Unreachable — Degraded Mode

Consistent with ADR-016's stance: when Redis is unreachable, the projector writes synchronously in-process and `EventsGateway` falls back to the in-memory adapter. Cross-instance delivery is lost; the health endpoint surfaces the degraded state. Recovery is automatic on Redis return — projectors resume from the last acknowledged stream entry.

## Alternatives Considered

1. **Keep the in-process pipeline and optimize queries.** Rejected. Eager-loading helps but cannot fix missed transitions, staffing storms, or the single-instance WebSocket ceiling. The architectural shape is the problem.
2. **RabbitMQ / Bull for the event stream.** Rejected per ADR-016 rationale: Redis already covers Socket.IO adapter, cache, and streams; adding a broker doubles operational surface.
3. **PostgreSQL LISTEN/NOTIFY as the event bus.** Rejected. Not durable across subscriber restarts, no consumer-group semantics, and conflates OLTP with event transport.
4. **Client polling instead of WebSocket.** Rejected. At 500 workers with 5 s polling, we amplify load 40× vs. the ping cadence and lose sub-second latency on status changes.
5. **Event-sourced + CQRS with separate read store.** Over-engineered for our scale. `user_tracking_status` is already a materialized read model; a single projector is sufficient.

## References

- [ADR-011](./ADR-011-phase2d-monitoring-status-model.md) — superseded; five-status model preserved
- [ADR-016](./ADR-016-redis-websocket-scaling.md) — Redis adoption rationale and failure semantics
- [ADR-005](./ADR-005-gps-boundary-tolerance.md) — GPS tolerance still drives transition thresholds
- Phase 3 plan: `../../phases/phase-3-plants-monitoring-rebuild/README.md`
- API contracts: `../../api/contracts.md`
- Database schema: `../../database/schema.md`
