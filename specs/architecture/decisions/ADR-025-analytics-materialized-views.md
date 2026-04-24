# ADR-025: Analytics Data Aggregation — Materialized Views

**Date:** March 13, 2026
**Status:** Accepted
**Deciders:** Technical Lead, Backend Engineer
**Related:** Phase 4 Sub-Phase 4-2 (Analytics Module)

---

## Context

Phase 4 analytics module needs pre-aggregated data for dashboard KPIs, worker performance scores, area metrics, and operational summaries. Raw queries across shifts, activities, tasks, and location_logs tables would be too slow for real-time dashboard rendering (potentially scanning millions of location_log rows).

## Decision Drivers

- **Query performance** — Dashboard should load in <1 second
- **Data freshness** — Acceptable staleness: up to 24 hours for daily metrics
- **Maintenance complexity** — Minimize custom aggregation code
- **Scalability** — Must handle growing data volume (90-day location logs)
- **Consistency** — Dashboard data should be consistent across all views

## Options Considered

### Option A: Materialized Views — **Selected**

PostgreSQL materialized views with `REFRESH MATERIALIZED VIEW CONCURRENTLY` via nightly cron.

**Pros:**
- Native PostgreSQL feature — no additional infrastructure
- `CONCURRENTLY` allows reads during refresh (no downtime)
- Standard SQL for view definitions — easy to modify
- Query optimizer can use indexes on materialized views
- Single refresh point ensures data consistency

**Cons:**
- Stale data (up to 24 hours with nightly refresh)
- Full refresh even if only partial data changed
- Requires unique index for `CONCURRENTLY` option

### Option B: Application-Level Cron Aggregation

NestJS cron job that runs SQL aggregation queries and writes results to dedicated `analytics_*` tables.

**Pros:**
- Full control over aggregation logic
- Can do incremental updates (only process new data)
- TypeORM entity for aggregated data

**Cons:**
- More code to maintain (aggregation logic + entities + migrations)
- Risk of inconsistency if aggregation fails mid-way
- Custom retry/recovery logic needed
- Duplicates what materialized views do natively

### Option C: Redis-Only Caching

Cache query results in Redis with TTL, no pre-aggregation.

**Pros:**
- Simplest implementation
- Always fresh on cache miss
- No database changes needed

**Cons:**
- Cold cache = slow first query (potentially 5-10 seconds)
- Cache invalidation complexity
- Memory pressure on Redis for large result sets
- No indexed access — full re-query on miss

## Decision

**Option A: Materialized Views** + Redis cache (5-minute TTL) as a two-layer strategy.

- **Layer 1:** Materialized views store pre-aggregated daily data (refreshed nightly at 02:00 WIB)
- **Layer 2:** Redis caches API responses (5-minute TTL) to handle repeated dashboard loads

This gives fast reads (Redis hit → instant, Redis miss → materialized view query <500ms) with acceptable data freshness (daily metrics are 24h stale, which is acceptable for analytics).

## Implementation

### Materialized Views

```sql
-- 3 views, each with unique index for CONCURRENTLY support
CREATE MATERIALIZED VIEW worker_performance_daily AS ...;
CREATE UNIQUE INDEX idx_wpd_user_date ON worker_performance_daily(user_id, date);

CREATE MATERIALIZED VIEW area_metrics_daily AS ...;
CREATE UNIQUE INDEX idx_amd_area_date ON area_metrics_daily(area_id, date);

CREATE MATERIALIZED VIEW operational_metrics_daily AS ...;
CREATE UNIQUE INDEX idx_omd_date ON operational_metrics_daily(date);
```

### Refresh Strategy

```typescript
// NestJS cron job — runs at 02:00 WIB daily
@Cron('0 2 * * *', { timeZone: 'Asia/Jakarta' })
async refreshAnalyticsViews() {
  await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY worker_performance_daily');
  await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY area_metrics_daily');
  await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY operational_metrics_daily');
  // Invalidate Redis cache
  await this.redis.del('analytics:*');
}
```

## Consequences

- **Positive:** Fast dashboard queries, consistent data, minimal custom code
- **Negative:** Daily data staleness, Chromium not needed but refresh takes time
- **Mitigation:** Redis cache for sub-second repeated loads; manual refresh endpoint for admins

---

**Last Updated:** 2026-03-13
