import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
 *   debouncer.setEmitter((areaId, state) => gateway.emitAreaStaffingChanged(...))
 *   debouncer.flag(areaId, currentState)   // call on each relevant status change
 *   debouncer.flush(areaId)                // force-emit immediately (e.g. on clock-out)
 */
@Injectable()
export class StaffingDebouncerService {
  private readonly logger = new Logger(StaffingDebouncerService.name);
  private readonly pending = new Map<string, PendingFlip>();
  private readonly debounceMs: number;
  private emitter?: (areaId: string, state: AreaState) => void;

  constructor(private readonly config: ConfigService) {
    this.debounceMs = config.get<number>('STAFFING_DEBOUNCE_SECONDS', 30) * 1000;
  }

  /**
   * Register the callback that will be invoked after the debounce window closes.
   * Should be called once during application startup (e.g. in a module lifecycle hook).
   */
  setEmitter(fn: (areaId: string, state: AreaState) => void): void {
    this.emitter = fn;
  }

  /**
   * Flag an area as having changed staffing state.
   * Resets the debounce timer if one is already pending for this area.
   *
   * @param areaId  Area UUID
   * @param state   Current staffing state to emit when the timer fires
   */
  flag(areaId: string, state: AreaState): void {
    const existing = this.pending.get(areaId);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.pending.delete(areaId);
      if (this.emitter) {
        this.emitter(areaId, state);
      } else {
        this.logger.warn(`StaffingDebouncer: no emitter set for area ${areaId}`);
      }
    }, this.debounceMs);

    this.pending.set(areaId, { state, timer });
  }

  /**
   * Force-emit the pending staffing state for an area immediately,
   * bypassing the remaining debounce window.
   * No-op if no pending state exists for the area.
   */
  flush(areaId: string): void {
    const existing = this.pending.get(areaId);
    if (!existing) return;

    clearTimeout(existing.timer);
    this.pending.delete(areaId);

    if (this.emitter) {
      this.emitter(areaId, existing.state);
    }
  }

  /** Returns the number of areas currently awaiting debounced emission. */
  pendingCount(): number {
    return this.pending.size;
  }
}
