/**
 * Location integrity evaluation — shared by every ingest path.
 *
 * Both the punch path (`shifts.service`) and the ping stream
 * (`location.service`) must judge a fix the same way. Writing the rules twice
 * is how one path silently stops enforcing, so the rules live here and the
 * callers differ only in what they *do* with the verdict.
 *
 * Deliberately pure: no DI, no repository, no clock of its own. `now` and the
 * previous fix are passed in, which is what makes every branch testable and
 * keeps the evaluator usable from a batch loop without per-item async work.
 *
 * Scope note: the client's `isMocked` is a *report*, not proof. A patched APK
 * can always send `false`. It is treated as sufficient evidence to reject, never
 * as evidence to trust — which is why the geometric checks (null island,
 * impossible travel) run regardless of what the client claims.
 */

import { GpsUtil } from './gps.util';
import { MIN_GPS_ACCURACY_METERS } from '../constants/gps.constants';

/** Why a fix was refused. `null` when it is acceptable. */
export enum LocationRejection {
  /** Coordinates absent in all but name — (0,0) is the Gulf of Guinea. */
  MISSING_COORDINATES = 'MISSING_COORDINATES',
  /** The OS reported a mock provider. */
  MOCKED = 'MOCKED',
  /** Implied speed from the previous fix is not physically plausible. */
  IMPOSSIBLE_TRAVEL = 'IMPOSSIBLE_TRAVEL',
}

/** Non-fatal observations recorded alongside an accepted fix. */
export interface LocationAdvisories {
  /** Reported accuracy is too poor to be meaningful (or absent). */
  poorAccuracy: boolean;
  /**
   * `clientTimestamp - receivedAt` in ms. Negative = backdated.
   * Recorded rather than silently corrected so a supervisor can see a device
   * whose clock is wrong (or being manipulated).
   */
  clockSkewMs: number;
  /** Implied ground speed from the previous fix, km/h. `null` if no previous. */
  impliedSpeedKmh: number | null;
}

export interface LocationVerdict {
  accepted: boolean;
  /** Set when `accepted` is false. */
  rejection: LocationRejection | null;
  /** The timestamp to persist — always clamped into the allowed window. */
  effectiveTimestamp: Date;
  advisories: LocationAdvisories;
}

export interface PreviousFix {
  lat: number;
  lng: number;
  at: Date;
}

export interface LocationCandidate {
  lat: number;
  lng: number;
  /** Metres, as reported by the device. */
  accuracyMeters?: number | null;
  /** The client's claim about when this was captured. */
  clientTimestamp?: Date | null;
  /** The client's report of the OS mock-provider flag. */
  isMocked?: boolean | null;
}

export interface IntegrityThresholds {
  /**
   * How far in the past a client may claim a fix was captured.
   *
   * Cannot be small: the offline queue legitimately syncs hours late, and a
   * worker with no signal all shift must still be able to upload afterwards.
   */
  maxBackdateMs: number;
  /**
   * Plausible ground speed ceiling. Set above vehicle speed — field staff do
   * travel between parks by motorbike and car — so this catches teleporting,
   * not commuting.
   */
  maxSpeedKmh: number;
  /** Accuracy worse than this is recorded as unreliable. */
  minAccuracyMeters: number;
  /**
   * Ignore implied speed over very short intervals. Two fixes a second apart
   * with ±30 m of ordinary GPS jitter imply >100 km/h while standing still, so
   * without this the check would fire constantly on a stationary worker.
   */
  minTravelIntervalMs: number;
}

export const DEFAULT_INTEGRITY_THRESHOLDS: IntegrityThresholds = {
  maxBackdateMs: 24 * 60 * 60 * 1000, // 24h — covers a full offline shift
  maxSpeedKmh: 200,
  minAccuracyMeters: MIN_GPS_ACCURACY_METERS,
  minTravelIntervalMs: 30 * 1000,
};

/** Exactly (0,0) — null island. Not a place any Surabaya worker can stand. */
const isNullIsland = (lat: number, lng: number): boolean => lat === 0 && lng === 0;

/**
 * Clamp a client-supplied capture time into [now - maxBackdate, now].
 *
 * Both bounds matter. The upper bound was already enforced; the lower was not,
 * so a device with its clock rolled back could claim a punch from any point in
 * the past. Clamping rather than rejecting keeps the offline queue working —
 * the untouched claim is still visible via `clockSkewMs`.
 */
const clampTimestamp = (
  claimed: Date | null | undefined,
  now: Date,
  maxBackdateMs: number,
): Date => {
  if (!claimed || Number.isNaN(claimed.getTime())) return now;
  const earliest = now.getTime() - maxBackdateMs;
  if (claimed.getTime() > now.getTime()) return now;
  if (claimed.getTime() < earliest) return new Date(earliest);
  return claimed;
};

/** Implied ground speed between two fixes, km/h. `null` when not meaningful. */
export const impliedSpeedKmh = (
  candidate: { lat: number; lng: number },
  at: Date,
  previous: PreviousFix,
  minIntervalMs: number,
): number | null => {
  const elapsedMs = at.getTime() - previous.at.getTime();
  // Non-monotonic or too-close fixes carry no usable speed signal.
  if (elapsedMs < minIntervalMs) return null;

  const metres = GpsUtil.calculateDistance(
    previous.lat,
    previous.lng,
    candidate.lat,
    candidate.lng,
  );
  return metres / 1000 / (elapsedMs / 1000 / 3600);
};

/**
 * Judge a single fix.
 *
 * Order matters: cheapest and most certain checks first, so a rejected fix
 * reports the most actionable reason rather than a downstream symptom.
 */
export function evaluateLocation(
  candidate: LocationCandidate,
  context: {
    now: Date;
    previous?: PreviousFix | null;
    thresholds?: Partial<IntegrityThresholds>;
    /**
     * Development escape hatch: accept a fix the client reports as mocked.
     *
     * Passed in rather than read from the environment here so this stays a pure
     * function — and so the decision to relax enforcement is visible at the call
     * site instead of hidden inside the evaluator. Resolve it with
     * `mockedLocationAllowed()` from `common/config/integrity-overrides`, which
     * refuses in production.
     *
     * Skips the MOCKED and IMPOSSIBLE_TRAVEL rules.
     *
     * Impossible travel was originally kept on here, reasoning that it is a
     * geometric fact independent of the provider. That is true and beside the
     * point: **a mock provider is one you move by typing coordinates**, so a
     * tester who checks Jakarta and then Surabaya has "travelled" 700 km in a
     * minute. The rule then blocks the punch itself — the failure this was
     * reported for was `Gagal clock out` on an emulator — which makes the
     * override that exists to keep an emulator usable not actually keep it
     * usable. Anything already trusting a self-declared mocked fix has no
     * stricter claim to make about the distance between two of them.
     *
     * NULL ISLAND is still rejected: (0, 0) is a broken fix rather than a
     * teleport, and it is never a coordinate anyone wants to test at.
     */
    allowMocked?: boolean;
  },
): LocationVerdict {
  const thresholds = { ...DEFAULT_INTEGRITY_THRESHOLDS, ...context.thresholds };
  const { now } = context;

  const effectiveTimestamp = clampTimestamp(
    candidate.clientTimestamp,
    now,
    thresholds.maxBackdateMs,
  );
  const clockSkewMs = candidate.clientTimestamp
    ? candidate.clientTimestamp.getTime() - now.getTime()
    : 0;

  const speed = context.previous
    ? impliedSpeedKmh(
        candidate,
        effectiveTimestamp,
        context.previous,
        thresholds.minTravelIntervalMs,
      )
    : null;

  const advisories: LocationAdvisories = {
    // Absent accuracy counts as poor: "unknown" must not read as "excellent".
    poorAccuracy:
      candidate.accuracyMeters == null || candidate.accuracyMeters > thresholds.minAccuracyMeters,
    clockSkewMs,
    impliedSpeedKmh: speed,
  };

  const reject = (rejection: LocationRejection): LocationVerdict => ({
    accepted: false,
    rejection,
    effectiveTimestamp,
    advisories,
  });

  if (isNullIsland(candidate.lat, candidate.lng)) {
    return reject(LocationRejection.MISSING_COORDINATES);
  }
  if (candidate.isMocked === true && context.allowMocked !== true) {
    return reject(LocationRejection.MOCKED);
  }
  if (speed !== null && speed > thresholds.maxSpeedKmh && context.allowMocked !== true) {
    return reject(LocationRejection.IMPOSSIBLE_TRAVEL);
  }

  return { accepted: true, rejection: null, effectiveTimestamp, advisories };
}
