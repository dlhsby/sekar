# ADR-016: Redis for WebSocket Scaling, Caching, and Notification Retry

## Status

Accepted

## Date

2026-03-12

## Context

SEKAR's real-time monitoring system uses Socket.IO with in-memory rooms (`EventsGateway`). This works for a single-instance deployment but has several limitations:

1. **WebSocket scaling** — In-memory rooms cannot be shared across multiple NestJS instances. If we scale horizontally, users connected to different instances won't receive each other's events.
2. **Caching** — `MonitoringCacheService` uses an in-memory loader abstraction. Monitoring thresholds, staffing summaries, and user roles are re-fetched from PostgreSQL on every request.
3. **Notification retry** — FCM push notifications have no retry queue. If a notification fails, it's lost.
4. **JWT blacklist** — The planned JWT refresh token rotation (Phase 3) needs a fast token blacklist store. PostgreSQL adds latency to every authenticated request.
5. **Rate limiting** — Per-endpoint rate limiting needs a shared counter store for multi-instance deployments.

The question is whether to add Redis, use a message broker (RabbitMQ/Bull), or keep everything in-memory.

## Decision

**Adopt Redis 7 as the unified solution** for caching, WebSocket adapter, JWT blacklist, rate limiting, and notification retry queue.

### Why Redis (not RabbitMQ/Bull)

| Requirement | Redis | RabbitMQ | Bull (Redis-backed) |
|-------------|-------|----------|---------------------|
| Socket.IO adapter | `@socket.io/redis-adapter` | Not applicable | Not applicable |
| Key-value cache | Native | Not applicable | Not applicable |
| JWT blacklist | SET with TTL | Overkill | Unnecessary abstraction |
| Rate limiting | INCR with TTL | Not suitable | Unnecessary |
| Notification retry | Redis Streams or sorted set | Native queuing | Full queue semantics |
| Operational complexity | Low (single service) | Medium (separate broker) | Low (uses Redis) |
| Memory footprint | ~50-100MB | ~200-500MB | ~50-100MB |

Redis covers all 5 requirements with a single service. RabbitMQ adds operational complexity without proportional benefit for SEKAR's scale (~500 concurrent users). Bull is Redis-backed anyway and adds unnecessary abstraction for simple retry logic.

### Redis Usage

| Use Case | Key Pattern | TTL | Impact |
|----------|------------|-----|--------|
| Socket.IO adapter | Internal | N/A | Enables multi-instance WebSocket |
| Monitoring thresholds | `monitoring:thresholds` | 60s | Eliminates DB reads per status check |
| Staffing summary | `monitoring:staffing:{areaId}` | 30s | Reduces monitoring query load |
| User role | `auth:role:{userId}` | 300s | Speeds up JWT validation |
| JWT blacklist | `auth:blacklist:{hash}` | Dynamic (see below) | Enables token revocation |
| Rate limit counters | `ratelimit:{ip}:{endpoint}` | 60s | Per-endpoint rate limiting |
| Shift reminder dedup | `shift-reminder:{date}:{userId}` | 24h | Prevents duplicate notifications |

## Consequences

### Positive

- Single infrastructure addition covers 5 distinct needs
- `@socket.io/redis-adapter` is a drop-in replacement for in-memory adapter
- `MonitoringCacheService` already has loader abstraction — swap is minimal
- Redis 7 provides reliable persistence with AOF
- Docker Compose integration is straightforward (`redis:7-alpine`)

### Negative

- New infrastructure dependency (must be available in production)
- Adds ~256MB memory requirement
- Need degraded mode handling when Redis is unavailable (this is NOT seamless failover — see below)
- Team must learn Redis key design and TTL management

### Redis Failure: Degraded Mode (Not Graceful Failover)

When Redis goes down mid-flight, Socket.IO room state is lost. This is **not** a graceful fallback — it is a degraded mode with the following behaviour:

- Existing room subscriptions on the Redis adapter are lost immediately
- Connected clients receive a `disconnect` event from Socket.IO
- Clients **must reconnect** to restore their room memberships; the server cannot restore them automatically
- The server falls back to the single-node in-memory adapter until Redis recovers
- Any in-flight cross-node events during the failure window are dropped silently

**Recovery:** Once Redis becomes reachable again, the adapter reconnects automatically and new room joins are replicated. Clients that reconnected during the outage will have already rejoined their rooms via the normal handshake flow.

### Mitigations

- Degraded mode: if Redis is unavailable, fall back to in-memory for cache/adapter, skip blacklist check, use in-memory rate limiting
- Docker Compose makes local development seamless
- Production Redis can use managed services (AWS ElastiCache, Railway Redis)

## Implementation Notes

### AOF Persistence

Redis 7 uses `appendonly yes` with `appendfsync everysec` by default. This means up to 1 second of data loss on crash.

| Use Case | Impact of 1s Data Loss | Acceptable? |
|----------|----------------------|-------------|
| JWT blacklist | Token valid for up to 15m (access) or 7d (refresh); losing 1s of blacklist entries is negligible | Yes |
| Rate limiting | Counters reset naturally on TTL expiry | Yes |
| WebSocket rooms | Rooms are rebuilt on client reconnect; no persistence needed | Yes |
| Monitoring cache | Cache rebuilds from DB on miss | Yes |

**Production recommendation:** Keep `appendfsync everysec` (default). No need for `appendfsync always` (which adds latency to every write).

### Eviction Policy

Use `volatile-lru` (not `allkeys-lru`):

- `allkeys-lru` can evict keys WITHOUT TTL set (e.g., JWT blacklist entries that might not have TTL set correctly during edge cases)
- `volatile-lru` only evicts keys that have a TTL set, protecting non-expiring keys from accidental eviction
- **Requirement:** Ensure ALL cache keys have TTL set (already the case per the key pattern table above)
- If ALL keys are guaranteed to have TTL, `allkeys-lru` is also safe — but `volatile-lru` provides a safety net

### JWT Blacklist TTL

Blacklist entry TTL is **dynamic**, calculated at revocation time based on the token's own expiry:

```
TTL = token.exp - Math.floor(Date.now() / 1000)   // seconds remaining until token expires
```

This ensures the blacklist entry is automatically removed from Redis exactly when the token itself would have expired, preventing unbounded blacklist growth.

| Token Type | Max TTL at Issuance | Blacklist Entry TTL |
|------------|---------------------|---------------------|
| Access token | ~15 minutes | ≤ 900 seconds |
| Refresh token | ~7 days | ≤ 604,800 seconds |

**Edge case:** If `token.exp - now < 0` (already expired), skip the blacklist write — an expired token is already invalid and does not need to be blacklisted.

### emitToUser() Refactoring

The current `emitToUser()` pattern in `EventsGateway` uses an in-memory `Map<userId, socketId>` to track connected users. This is **incompatible with the Redis adapter** because the Map is local to each instance.

> **HARD DEPENDENCY — SEQUENCING CONSTRAINT:** `emitToUser()` MUST be refactored to room-based emit BEFORE the Redis adapter is activated. Enabling `@socket.io/redis-adapter` with the current direct-socket emit pattern will silently break cross-node delivery — events emitted to a `socketId` local to one instance will never reach clients connected to a different instance. No test will catch this in single-instance CI; it will only fail in multi-node production. Refactor first, then enable the adapter.

**Before enabling `@socket.io/redis-adapter`**, refactor to room-based pattern:

```typescript
// BEFORE (in-memory, single instance only):
this.userSocketMap.set(userId, client.id);
this.server.to(client.id).emit(event, data);

// AFTER (Redis adapter compatible):
client.join(`user:${userId}`);
this.server.to(`user:${userId}`).emit(event, data);
```

Cross-reference: backend.md refactoring section (Sub-Phase 3-7).

## Alternatives Considered

1. **Keep in-memory** — Works for single instance but blocks horizontal scaling and has no JWT blacklist
2. **RabbitMQ** — Overkill for our notification retry needs; doesn't cover caching or Socket.IO
3. **Bull Queue** — Good for job queuing but still requires Redis; adds abstraction layer we don't need
4. **PostgreSQL LISTEN/NOTIFY** — Could handle pub/sub but not suitable for caching, rate limiting, or Socket.IO adapter
