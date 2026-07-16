# ADR-011: Phase 2D Materialized Status Tracking with Configurable Thresholds

> ⚠️ **The five-status enum described below is gone.** Superseded by [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md), then collapsed 5 → 3 (`active` / `offline` / `absent`, inside-outside becomes an axis) by the [ADR-046](./ADR-046-monitoring-subject-model.md) amendment of 2026-07-16. Note `offline` **inverted meaning** in that change. Kept for history only.

## Status

Accepted

## Context

Phase 2D introduced a comprehensive real-time monitoring system requiring clear user status differentiation for field supervisors. The pre-Phase 2D monitoring had several critical gaps:

- The binary online/offline model could not express intermediate states (e.g., a worker who has clocked in but stopped sending GPS pings, or a worker who has drifted outside their assigned area)
- `is_within_area` was hardcoded to `true` — no actual geofencing was performed at the monitoring layer
- `shift_name` was hardcoded to `'Active Shift'`
- Status thresholds (e.g., how long without a GPS ping before a worker is considered "missing") were hardcoded constants requiring a backend redeploy to change
- `getLiveUsers()` executed N+1 queries per dashboard load — one JOIN per user to check shift and location status — making the endpoint unacceptably slow at scale

The monitoring system needed to differentiate between workers who are:
1. Actively sending GPS pings from within their assigned area (**active**)
2. In an active shift but with stale GPS pings (**inactive / idle**)
3. Sending GPS pings but from outside their assigned area boundary (**outside_area**)
4. Scheduled to be working but not detected (no clock-in, or GPS silent for over an hour) (**missing**)
5. Not on any active shift (**offline** — not shown on map)

## Decision

Introduce a **materialized status tracking** approach:

1. **Four-status model** — Replace the binary model with the `TrackingStatus` enum: `active | inactive | outside_area | missing | offline`. The enum value `inactive` maps to the UI label "Idle" for display purposes; always use the enum value in code.

2. **`user_tracking_status` table** — A materialized cache table storing the current computed status for each user. Updated on every location ping (via `StatusCalculatorService` called from `LocationService.onLocationPing`) and on clock-in/clock-out events (via `ShiftsService`). Eliminates N+1 queries by allowing `getLiveUsers()` to execute a single JOIN against this table.

3. **`monitoring_configs` table** — A JSONB key-value store for runtime-adjustable thresholds. The four canonical config keys are:
   - `status_thresholds` — GPS ping age thresholds for each status transition
   - `geofencing` — tolerance meters and outside-area grace period
   - `map_defaults` — default Google Maps center, zoom, and cluster settings
   - `alerts` — low battery and understaffing notification settings

   Thresholds are read by `MonitoringCacheService.getThresholds()` with an in-memory cache (TTL: 60 seconds) to avoid per-request database reads.

4. **Background cron scheduler** — A 60-second cron job (`StatusSchedulerService`) re-evaluates all users with active shifts whose `user_tracking_status` has not been updated in the last threshold window. This catches workers who stop sending GPS pings without explicitly clocking out (the "missing" detection path).

5. **WebSocket boundary events** — When `StatusCalculatorService` detects a status transition to/from `outside_area`, it emits `user:left-area` or `user:entered-area` WebSocket events to the relevant monitoring rooms, in addition to the existing `user:status-changed` event.

## Consequences

### Positive

- **O(1) status lookups** — `getLiveUsers()` becomes a single indexed JOIN on `user_tracking_status` rather than N+1 queries
- **Real-time WebSocket events** — Status changes and boundary crossings are emitted immediately on every GPS ping or shift event, enabling live map updates without client polling
- **Runtime threshold tuning** — Operations staff (admin_system, superadmin) can adjust detection thresholds via the `/monitoring/config` API without a backend redeploy
- **Soft geofencing preserved** — Consistent with ADR-005 and Phase 2C: workers are never blocked from clocking in; boundary violations only update their `outside_area` status on the monitoring dashboard
- **Accurate shift_name and is_within_area** — Both fields are now computed from real data (shift JOIN + polygon/radius check via `GpsUtil.isWithinAreaBoundary()`)

### Negative

- **Staleness window** — `user_tracking_status` can be up to 60 seconds stale between cron ticks. Workers who stop sending pings will not be marked `missing` until the next scheduler run detects the stale timestamp. This is acceptable for operational monitoring (60 seconds is within the expected GPS ping interval).
- **Additional write load** — Every location ping now writes to `user_tracking_status` in addition to `location_logs`. At the expected ping rate (60 seconds) with ~200 concurrent workers, this adds ~3–4 writes/second — negligible for PostgreSQL.
- **Config cache invalidation** — When a threshold is updated via `/monitoring/config/:key`, the in-memory cache in `MonitoringCacheService` may serve stale thresholds for up to 60 seconds before the next TTL expiry.

## Alternatives Considered

### Compute status on-the-fly per request

Rejected. Computing status for all live users on every dashboard load requires joining `shifts`, `location_logs`, and `areas` for each user. With 200+ concurrent workers, this is a multi-table aggregation on every request, incompatible with the sub-200ms response time requirement.

### Redis for status cache

Considered but rejected for Phase 2D. Adding Redis would require infrastructure changes and ops overhead. PostgreSQL with a dedicated `user_tracking_status` table achieves the same O(1) lookup with a simpler deployment. Redis can be introduced in a later phase if write throughput becomes a bottleneck.

### Environment variables for thresholds

Rejected. Environment variables require a backend redeploy to change. Operations staff need to tune thresholds (e.g., extend the inactive window during adverse weather) without engineering involvement. The `monitoring_configs` table with role-restricted API access addresses this directly.

---

**Date:** 2026-03-03
**Author:** System Architect
**Supersedes:** None
**Related ADRs:** [ADR-005](./ADR-005-gps-boundary-tolerance.md) (GPS boundary tolerance), [ADR-006](./ADR-006-postgresql-partitioning.md) (location_logs partitioning), [ADR-009](./ADR-009-phase2c-role-system-overhaul.md) (role system), [ADR-010](./ADR-010-phase2c-terminology-cleanup.md) (terminology)
