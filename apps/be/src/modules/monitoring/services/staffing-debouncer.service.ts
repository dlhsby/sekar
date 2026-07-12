import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Audit M4 (2026-05-23): cross-replica deduplication. Without Redis-backed
// gating, two replicas both fire after the in-process timer expires and emit
// twice. We SET NX EX a per-area key on emission — the first replica wins,
// the second skips.
import { RedisService } from '../../../common/services/redis.service';

type AreaState = Record<string, unknown>;

interface PendingFlip {
  state: AreaState;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * StaffingDebouncerService
 *
 * Prevents broadcasting cascades when many workers change status
 * in a short period (e.g. shift start/end). Instead of emitting
 * `area:staffing-changed` for every individual status flip, it
 * coalesces rapid successive changes into a single emission after
 * a configurable quiet period (STAFFING_DEBOUNCE_SECONDS, default 30 s).
 *
 * Usage:
 *   debouncer.setEmitter((locationId, state) => gateway.emitAreaStaffingChanged(...))
 *   debouncer.flag(locationId, currentState)   // call on each relevant status change
 *   debouncer.flush(locationId)                // force-emit immediately (e.g. on clock-out)
 */
@Injectable()
export class StaffingDebouncerService {
  private readonly logger = new Logger(StaffingDebouncerService.name);
  private readonly pending = new Map<string, PendingFlip>();
  private readonly debounceMs: number;
  private emitter?: (locationId: string, state: AreaState) => void;

  constructor(
    private readonly config: ConfigService,
    // Optional: when Redis isn't wired (e.g. unit tests, single-replica dev)
    // the dedupe step is skipped and the original in-process behaviour
    // takes over. `@Optional()` keeps existing test providers (which omit
    // RedisService) working.
    @Optional() private readonly redis?: RedisService,
  ) {
    this.debounceMs = config.get<number>('STAFFING_DEBOUNCE_SECONDS', 30) * 1000;
  }

  /**
   * Audit M4: Redis-backed leader election for cross-replica emit.
   * Returns `true` when **this** replica won the right to emit for the
   * given area inside the dedupe window; `false` when another replica
   * already emitted.
   *
   * TTL is the debounce window + a small grace period so a stuck replica
   * can't permanently muzzle the others.
   */
  private async tryClaimEmit(locationId: string): Promise<boolean> {
    if (!this.redis) return true; // graceful: no Redis = single-replica mode
    try {
      const client = this.redis.getClient();
      const key = `monitoring:staffing-emit:${locationId}`;
      const ttlSec = Math.max(5, Math.ceil(this.debounceMs / 1000) + 5);
      const result = await client.set(key, '1', 'EX', ttlSec, 'NX');
      return result === 'OK';
    } catch (err) {
      // Treat Redis errors as "claim succeeded" — better to double-emit
      // once than to silently drop staffing updates when Redis flaps.
      this.logger.warn(
        `StaffingDebouncer claim failed for area ${locationId}: ${(err as Error).message}; falling through to local emit`,
      );
      return true;
    }
  }

  /**
   * Register the callback that will be invoked after the debounce window closes.
   * Should be called once during application startup (e.g. in a module lifecycle hook).
   */
  setEmitter(fn: (locationId: string, state: AreaState) => void): void {
    this.emitter = fn;
  }

  /**
   * Flag an area as having changed staffing state.
   * Resets the debounce timer if one is already pending for this area.
   *
   * @param locationId  Location UUID
   * @param state   Current staffing state to emit when the timer fires
   */
  flag(locationId: string, state: AreaState): void {
    const existing = this.pending.get(locationId);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.pending.delete(locationId);
      if (!this.emitter) {
        this.logger.warn(`StaffingDebouncer: no emitter set for area ${locationId}`);
        return;
      }
      // Single-replica / dev path stays synchronous so tests that drive the
      // service with `jest.advanceTimersByTime` continue to see the emit
      // immediately on the same tick.
      if (!this.redis) {
        this.emitter(locationId, state);
        return;
      }
      // Audit M4: only one replica should emit per dedupe window.
      void this.tryClaimEmit(locationId)
        .then((claimed) => {
          if (!claimed) {
            this.logger.debug(
              `StaffingDebouncer: another replica already emitted for area ${locationId}; skipping`,
            );
            return;
          }
          this.emitter?.(locationId, state);
        })
        .catch((err) => {
          this.logger.warn(
            `StaffingDebouncer claim path errored for area ${locationId}: ${(err as Error).message}`,
          );
          // tryClaimEmit already treats errors as claim-success internally,
          // but keep this catch so an unexpected `.then` throw doesn't bubble.
        });
    }, this.debounceMs);

    this.pending.set(locationId, { state, timer });
  }

  /**
   * Force-emit the pending staffing state for an area immediately,
   * bypassing the remaining debounce window.
   * No-op if no pending state exists for the area.
   */
  flush(locationId: string): void {
    const existing = this.pending.get(locationId);
    if (!existing) return;

    clearTimeout(existing.timer);
    this.pending.delete(locationId);
    if (!this.emitter) return;

    // Single-replica / no-Redis: emit synchronously (preserves caller
    // contract for tests + dev).
    if (!this.redis) {
      this.emitter(locationId, existing.state);
      return;
    }
    // Audit M4: cross-replica dedupe holds even on forced flush. Best-effort
    // async — callers don't await flush today, so wrap with void.
    void this.tryClaimEmit(locationId)
      .then((claimed) => {
        if (claimed) this.emitter?.(locationId, existing.state);
      })
      .catch(() => null);
  }

  /** Returns the number of areas currently awaiting debounced emission. */
  pendingCount(): number {
    return this.pending.size;
  }
}
