# ADR-019: Two-Tier Offline Connectivity Model

## Status

Accepted

## Date

2026-03-12

## Context

SEKAR's mobile app has offline sync via `syncManager.ts` covering 4 action types (shift-clock-in, shift-clock-out, location-update, activity-submit). However, the current implementation treats "offline" as a binary state — the app is either connected or not.

Field workers in Surabaya's parks report two distinct failure modes:

1. **No internet** — Device has no network connectivity (underground, rural area)
2. **Server unreachable** — Device has internet (can browse web) but SEKAR server is down or unreachable (server maintenance, DNS issue, firewall)

These require different user communication and different recovery strategies:
- No internet → poll NetInfo for network restoration
- Server unreachable → poll health endpoint for server restoration

### Current Behavior

```
NetInfo.isConnected = false → "Offline" mode (queue actions)
NetInfo.isConnected = true  → Assume online (try API calls, fail silently or show generic error)
```

This causes confusion when the server is down but the worker has internet — the app appears "online" but all API calls fail.

## Decision

**Implement a three-state connectivity model** with distinct UI indicators and recovery strategies.

### ConnectivityStatus Enum

```typescript
enum ConnectivityStatus {
  ONLINE = 'online',              // Internet + server reachable
  NO_INTERNET = 'no_internet',    // No network connectivity
  SERVER_UNREACHABLE = 'server_unreachable',  // Internet OK, server down
}
```

### Detection Algorithm

```
When NO_INTERNET:
- Listen to NetInfo change events (immediate detection, no polling)
- On internet restored → check GET /health with 5s timeout
  - Success → ONLINE (flush queue)
  - Timeout/Error → SERVER_UNREACHABLE

When SERVER_UNREACHABLE:
- Poll GET /health every 30 seconds
  - Success → ONLINE (flush queue)
  - Timeout/Error → remain SERVER_UNREACHABLE
- Rationale: 30s balances detection speed vs server load from degraded clients
  (5s polling is too aggressive for a server that's already known to be down)

When ONLINE:
- Listen to NetInfo change events
- On disconnect → NO_INTERNET
- On reconnect → check /health → ONLINE or SERVER_UNREACHABLE
```

### UI Indicators

| Status | Banner Color | Icon | Indonesian Text |
|--------|-------------|------|-----------------|
| NO_INTERNET | Yellow (#F59E0B) | wifi-off | "Tidak ada koneksi internet" |
| SERVER_UNREACHABLE | Orange (#F97316) | server-off | "Server tidak dapat dihubungi" |
| ONLINE (recovery) | Green (#22C55E) | check | "Terhubung kembali" (auto-dismiss 3s) |

### Queue Behavior

| Action | NO_INTERNET | SERVER_UNREACHABLE |
|--------|------------|-------------------|
| Queue new actions | Yes | Yes |
| Show queue count | Yes ("X menunggu") | Yes ("X menunggu") |
| Attempt flush | No (wait for internet) | Every 30s (health check) |
| Auto-flush on recovery | Yes (immediate) | Yes (immediate) |

## Consequences

### Positive

- Workers understand *why* the app is offline (their internet vs server issue)
- Reduces support tickets ("app not working" → worker can self-diagnose)
- Different polling strategies reduce unnecessary network requests
- Health endpoint (GET /health) is lightweight (~1ms response)

### Negative

- More complex state machine than binary online/offline
- Health endpoint polling adds minimal server load (~1 req/30s per degraded client)
- Banner takes screen space (mitigated by slim design)

### Mitigations

- Health endpoint excluded from rate limiting and logging
- Polling only when degraded (no polling when ONLINE)
- Banner is dismissible and auto-hides on recovery

## Known Limitations

**NetInfo stale state on Android:** On some Android devices and OS versions, the `NetInfo` library reports a stale connectivity state with delays of up to 30 seconds after actual network conditions change. This means the app may briefly show NO_INTERNET when the device actually has connectivity, or remain in ONLINE state for up to 30 seconds after losing internet.

**Authoritative signal:** The implementation treats API call network errors as the authoritative connectivity signal. A failed API request immediately triggers a connectivity re-check (health endpoint probe) and updates the state accordingly, regardless of what NetInfo reports.

**NetInfo role:** NetInfo serves as a secondary/initial signal only — it provides quick UI feedback before the next API call confirms actual state. It is most reliable for the NO_INTERNET → recovery transition (detecting when a network interface becomes available), but should not be trusted as the sole source of truth.

**Practical impact:** Workers may see a brief false "Tidak ada koneksi internet" banner on some devices. This resolves itself within 30 seconds or on the next API call, whichever comes first. The queue is not flushed until the health endpoint confirms the server is reachable, so no data loss occurs from stale NetInfo state.

## Alternatives Considered

1. **Binary online/offline** — Current behavior; rejected because workers can't distinguish personal connectivity from server issues
2. **Three-tier with "degraded"** — ONLINE/DEGRADED/OFFLINE; rejected because "degraded" (slow but connected) doesn't change behavior enough to warrant a separate state
3. **WebSocket-based detection** — Use Socket.IO disconnect events; rejected because WebSocket may not be active for all roles (field workers don't use monitoring WebSocket)
