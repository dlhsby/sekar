# ADR-043: Production gap-closure decisions — offline sync / push / background location / message broker

## Status

Partially Accepted (desk audit complete Jun 10, 2026 — see `status_reviews.md § Gap Audit`):
- **Gap 1 (offline sync): Accepted/Delivered** — 4-2 shipped the full 7-type queue + 3-state connectivity; field flows remain.
- **Gap 2 (push hardening): Accepted/Delivered** — 4-3 shipped preferences + BullMQ `fcm-retry` + inbox; staging latency probes remain.
- **Gap 3 (background location): Accepted/Delivered for Android (Jun 11)** — owner approved; a Notifee-hosted foreground service (type `location`, silent persistent notification) now runs for the duration of every shift, started/stopped by the LocationTracker lifecycle. Device validation (screen-off continuity + battery) per the field checklist. iOS stays screen-on only until the `watchPosition` background migration (Phase 5; Android is the production fleet).
- **Gap 4 (broker): Accepted/Delivered** — BullMQ on existing Redis 7 live since 4-3; 4-5 exports use `setImmediate` + retry cron (documented deviation, acceptable at current volume).

## Date

2026-05-22 (desk-audit verdicts recorded 2026-06-10)

## Context

Approaching release, the project owner explicitly flagged doubt about four production-readiness capabilities:

1. **Offline sync** — does it actually work for a satgas in a no-coverage area?
2. **Push notifications** — `FCM_ENABLED=true` was set during Phase 3, but does it work end-to-end including retry on failure?
3. **Background location tracking** — `react-native-geolocation-service` is a dependency, but is the Android foreground service + iOS background mode wiring correct?
4. **Message broker** — do we need one (BullMQ / AMQP / Kafka) and for which workloads?

The original Phase 4 README (March 12, 2026) made assumptions about each of these (e.g., "FCM_ENABLED=false → set to true"; "Redis not installed") that were already stale by May 2026 because Phase 3 silently shipped a lot of the infrastructure. The owner wants verified findings, not speculation.

Sub-Phase 4-V (Production-Readiness Gap Audit) runs each gap as a staging-build verification with explicit pass/fail criteria. The output of that audit lands in `specs/phases/phase-4-production-readiness/status_reviews.md § Gap Audit`. This ADR records the **decision framework** the audit feeds into, the **expected verdict** for each gap based on current code-survey evidence, and **what we will do** about each verdict.

## Decision

For each gap, the audit produces one of three verdicts:

- **Deliver in 4-x** — sub-phase 4-x is scoped to ship the missing capability.
- **Already-good for MVP** — no work in Phase 4 beyond verification; accept residual risk; track in observability.
- **Defer to Phase 5** — capability is missing or weak, but release-blocking risk is low; addressed post-launch.

### Gap 1 — Offline sync

**Decision: Deliver in 4-2.** Current code-survey evidence shows `offlineQueue.ts` + `syncManager.ts` exist with 4 queue types but no `ConnectivityBanner` and no NO_INTERNET / SERVER_UNREACHABLE distinction (ADR-019 spec, not yet implemented). Phase 4 Sub-Phase 4-2 ships the missing queue types (overtime-start/end, task-completion, reassignment), the connectivity banner, the heartbeat polling against `/health`, and timezone preservation.

### Gap 2 — Push notifications

**Decision: Deliver hardening in 4-3.** FCM is live and 8 triggers are wired (May 16-17 commits). What's missing: retry queue (sync failures drop today), per-user `NotificationPreferences` opt-out, and the user-facing NotificationsScreen (NOTIF-1) + web inbox page. Phase 4 Sub-Phase 4-3 adds these on the **BullMQ-on-existing-Redis** queue established in this ADR (Gap 4).

### Gap 3 — Background location tracking

**Decision (provisional): Deliver fixes in 4-2 if missing; Already-good for MVP if wired.** This is the **highest-risk** gap because the failure mode is silent (app appears to work but doesn't track in background). The audit must:

- Verify Android `AndroidManifest.xml` declares `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` (API 34+), `ACCESS_BACKGROUND_LOCATION`.
- Verify a foreground-service implementation exists with a persistent notification.
- Verify iOS `Info.plist` includes `UIBackgroundModes: location` and `NSLocationAlwaysAndWhenInUseUsageDescription`.
- Measure 4-h field-shift battery drain (target ≤ 15 %/h average).
- Verify throttling (no GPS polling while stationary).

If any of these probes fail, the verdict escalates to **Deliver in 4-2** (treat as release blocker). Otherwise, document in observability and ship.

### Gap 4 — Message broker / job queue

**Decision: Adopt BullMQ on existing Redis 7. No new infrastructure.**

The "do we need a message broker?" question reframes as "do we need a job queue?" because the workloads in question are unit-of-work asynchronous tasks, not pub-sub event streams. Pub-sub already exists (Phase 3 Redis Streams for monitoring projector; `@socket.io/redis-adapter` for WebSocket fan-out). The missing capability is **reliable async job execution with retry**, which BullMQ provides on top of the Redis instance already running.

Workloads adopted onto BullMQ:

| Queue | Producer | Worker | Retry policy |
|-------|----------|--------|--------------|
| `fcm-retry` | `notifications.service.sendToUser()` on transient failure | `FcmRetryProcessor` | Exponential backoff 1m / 5m / 30m / 2h / 12h; drop after 5 |
| `export-jobs` | `POST /export` async (> 5k rows) | `ExportJobProcessor` | Manual retry only; failures notify requestor |
| `csv-import` | `POST /import/*/csv` async (> 1k rows) | `CsvImportProcessor` | No retry; report row-by-row errors |
| `kmz-parse` | `POST /import/kmz` heavy | `KmzParseProcessor` | 1 retry on parse-timeout |

Workloads explicitly **not** moved to BullMQ:

| Workload | Reason |
|----------|--------|
| Cron-driven aggregations (shift reminder, stale cleanup, daily summary, retention) | `@nestjs/schedule` is sufficient; no retry needed because next tick retries |
| Monitoring projector (Redis Streams consumer) | Streams is already the queue; BullMQ would be a duplicate |
| WebSocket fan-out | `@socket.io/redis-adapter` is the right primitive for pub-sub |

**No AMQP / RabbitMQ / Kafka adoption.** Throughput needs are well within Redis-backed BullMQ capacity (target: ≤ 100 FCM retries/min peak, ≤ 5 exports / hour at scale).

Future migration path: if FCM retry volume grows to require partitioned consumers (> 1000 retries/min), revisit with a follow-up ADR.

## Consequences

### Positive

- **One audit pass replaces hand-waving.** Each gap gets a measured verdict + decision.
- **No new infrastructure.** BullMQ rides on existing Redis 7; Sentry on the same observability budget.
- **Background-location risk surfaced early.** If wiring is missing, it's a 1-week fix inside 4-2 rather than a post-launch fire-drill.
- **Clear scope for 4-2 + 4-3.** Each sub-phase knows exactly what to ship after 4-V completes.

### Negative

- **One-time audit cost (4-5 dev-days for 4-V).** Adds time to the timeline but reduces post-launch risk.
- **BullMQ adds a new SDK** to the backend codebase, with its own concepts (queues, workers, jobs, scheduler). ~ 1 d of integration cost; offset by reusing existing Redis.
- **Bull Board UI at `/admin/queues`** requires admin-only auth gating.

### Neutral

- **Verdicts are provisional in this ADR.** The audit may change verdicts (e.g., Gap 3 may escalate). This ADR is updated in-place when 4-V lands; the audit findings file (`status_reviews.md`) carries the timestamped evidence.

## Implementation

Phase 4 Sub-Phase 4-V (audit), then sub-phases 4-2 / 4-3 / 4-5 carry the resulting work. See [`status_reviews.md § Gap Audit`](../../phases/phase-4-production-readiness/status_reviews.md#gap-audit) for the running findings.

## References

- ADR-016 — Redis for WebSocket scaling (parent infra)
- ADR-019 — Offline connectivity model (Gap 1)
- `specs/phases/phase-4-production-readiness/README.md § 4-V` — audit scope
- `specs/phases/phase-4-production-readiness/backend.md § R2` — BullMQ implementation
- `specs/phases/phase-4-production-readiness/infrastructure.md § I1` — BullMQ on existing Redis
