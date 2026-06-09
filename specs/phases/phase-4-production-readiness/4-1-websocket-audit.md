# 4-1 A1 — WebSocket Connection-Stability Audit

**Date:** June 9, 2026 · **Gateway:** `be/src/gateways/events.gateway.ts`

Audit of the Socket.IO real-time layer for multi-instance production readiness (the
substance of sub-phase 4-1 task A1). Outcome: **multi-instance safe**; the one blocking
defect (in-memory `emitToUser`) is fixed.

## Findings

| Area | State | Evidence |
|------|-------|----------|
| **Auth on connect** | ✅ JWT-gated | `handleConnection` verifies the handshake JWT (`jwtService.verify`) and disconnects on failure (`:119`, `:151`). |
| **Room model** | ✅ Room-based | On connect each socket joins `user:{id}` (`:130`); city roles join `monitoring:city` (`:135`); scoped roles auto-join rayon/area rooms (`:145`). |
| **Redis adapter** | ✅ Enabled | `server.adapter(createAdapter(pub, sub))` (`:93`) — fan-out across instances via Redis pub/sub. |
| **Per-user emit** | ✅ Fixed (Jun 9) | `emitToUser` now emits to the `user:{id}` **room** (`:407`) instead of scanning the in-memory `connectedClients` map. The old scan only saw sockets on the local instance, so personal events (e.g. `TASK_ASSIGNED`) were silently dropped for users connected to a different instance behind the adapter. |
| **Connection stats** | ✅ Local-only by design | `connectedClients` is retained for `getStats()` (per-instance connection count) — not for routing. |
| **Reconnection** | ✅ Client-driven | Socket.IO client auto-reconnect; on reconnect the socket re-runs `handleConnection` and re-joins its rooms. |

## Deferred to 4-V (need a staging environment)

- **Multi-node delivery test:** start two API instances + Redis, emit a personal event from
  instance A, assert a client on instance B receives it. (Unit test asserts the room target;
  end-to-end cross-instance delivery is a staging concern.)
- **Sentry staging test-event:** confirm the backend + mobile Sentry projects receive a live
  event once `SENTRY_DSN` / `SENTRY_DSN_MOBILE` are set in staging.

## Verification (this checkpoint)

`events.gateway.spec.ts` asserts `emitTaskAssigned` targets `user:worker-1` (room) — 48/48 green.
