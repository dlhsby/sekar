/**
 * Client-side stationary-ping thinning.
 *
 * `LOCATION_DISTANCE_FILTER_METERS` was documented in the tracker docblock and
 * parsed into `constants/config.ts`, but nothing ever read it: the tracker polls
 * `getCurrentPosition` on a `setTimeout` loop, and `distanceFilter` is only
 * honoured by `watchPosition`. So a worker standing still uploaded a ping every
 * 10–60 s all shift saying the same thing. This makes the setting real.
 *
 * The server thins too (`location-thinning.util.ts`), and that is the control
 * that matters — it applies to every app version already in the field. This one
 * exists for a different reason: it saves the worker's **mobile data and
 * battery**, because a ping thinned here is never uploaded at all.
 *
 * The two must agree on the safety rule. Presence is derived server-side from
 * the age of the newest ping, so a heartbeat has to survive no matter how still
 * the worker stands — thinning past it would make a present worker read OFFLINE.
 */

import { calculateDistance } from '../../utils/gpsUtils';

/**
 * Always keep a ping once this much time has passed, even standing still.
 *
 * Mirrors the server's `DEFAULT_THINNING.heartbeatMs`. Must stay comfortably
 * under the monitoring "active" threshold (10 min by default); 4 min leaves room
 * for a late upload or a retry without the worker flipping to OFFLINE.
 */
export const CLIENT_HEARTBEAT_MS = 4 * 60 * 1000;

export interface ThinningReference {
  latitude: number;
  longitude: number;
  /** ISO 8601, as carried on `LocationPing.timestamp`. */
  timestamp: string;
}

/**
 * Should this fix be skipped as a redundant "still here" report?
 *
 * Biased towards keeping: no reference, filtering disabled, a real move, a
 * heartbeat due, or an out-of-order timestamp all keep the ping. A skipped ping
 * is never recovered, so uncertainty must never cost data.
 *
 * @param distanceFilterMeters 0 (the default) disables thinning entirely, which
 *   preserves the historical behaviour for any build that has not opted in.
 */
export function shouldSkipStationaryPing(
  candidate: { latitude: number; longitude: number; capturedAtMs: number },
  previous: ThinningReference | null,
  distanceFilterMeters: number,
  heartbeatMs: number = CLIENT_HEARTBEAT_MS,
): boolean {
  if (distanceFilterMeters <= 0) return false;
  if (!previous) return false;

  const elapsedMs = candidate.capturedAtMs - new Date(previous.timestamp).getTime();
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return false;
  if (elapsedMs >= heartbeatMs) return false;

  const movedMeters = calculateDistance(
    previous.latitude,
    previous.longitude,
    candidate.latitude,
    candidate.longitude,
  );
  return movedMeters < distanceFilterMeters;
}
