/**
 * Stationary-ping thinning.
 *
 * The tracker polls every 10–60 s for the whole shift regardless of movement —
 * `LOCATION_DISTANCE_FILTER_METERS` exists in the mobile config but is never
 * read, because the tracker uses a `setTimeout` + `getCurrentPosition` loop and
 * `distanceFilter` only applies to `watchPosition`. So a worker standing still
 * writes ~100 rows/hour that all say the same thing. On the operational DB that
 * is 5.4 M rows / 3.2 GB, and it is the bulk of the cross-AZ read traffic.
 *
 * Thinning server-side rather than fixing the client is deliberate: it takes
 * effect immediately for every app version already in the field, where a client
 * change would only reach workers who update.
 *
 * What this is NOT: it does not drop pings that carry information. A fix that
 * moved, or one that is the first after a quiet spell, is always kept.
 */

import { GpsUtil } from './gps.util';

export interface ThinningThresholds {
  /**
   * Movement below this is "the same place". Set above typical GPS wander so
   * jitter alone does not defeat the thinning — a stationary phone routinely
   * reports ±10–20 m.
   */
  minMoveMeters: number;
  /**
   * Always keep a ping once this much time has passed, even standing still.
   *
   * MUST stay comfortably below the monitoring "active" threshold
   * (`active_max_age_seconds`, 10 min by default) — presence is derived from the
   * age of the newest ping, so thinning past that would make a present worker
   * silently go OFFLINE. This is the constraint that makes the whole thing safe.
   */
  heartbeatMs: number;
}

export const DEFAULT_THINNING: ThinningThresholds = {
  minMoveMeters: 25,
  heartbeatMs: 4 * 60 * 1000, // 4 min — under half the 10-min offline threshold
};

export interface ThinningReference {
  lat: number;
  lng: number;
  at: Date;
}

/**
 * Should this ping be dropped as a redundant "still here" report?
 *
 * Returns false (keep) whenever there is any doubt: no reference point, a real
 * move, a stale reference, or a non-monotonic timestamp. Dropping a ping is
 * lossy and unrecoverable, so the bias is always towards keeping.
 */
export function isRedundantStationaryPing(
  candidate: { lat: number; lng: number; at: Date },
  previous: ThinningReference | null | undefined,
  thresholds: ThinningThresholds = DEFAULT_THINNING,
): boolean {
  if (!previous) return false;

  const elapsedMs = candidate.at.getTime() - previous.at.getTime();
  // Out-of-order or same-instant: no basis to judge, so keep it.
  if (elapsedMs <= 0) return false;
  // Heartbeat due — keep regardless of movement, so presence stays fresh.
  if (elapsedMs >= thresholds.heartbeatMs) return false;

  const movedMeters = GpsUtil.calculateDistance(
    previous.lat,
    previous.lng,
    candidate.lat,
    candidate.lng,
  );
  return movedMeters < thresholds.minMoveMeters;
}
