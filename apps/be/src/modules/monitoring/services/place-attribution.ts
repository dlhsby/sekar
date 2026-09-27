/**
 * Which assigned lokasi a clocked-in worker is attributed to, updated as they
 * move (ADR-064). A person can hold several places in one shift — alone at A and
 * with the team at B (ADR-063), or a korlap's many taman — and is counted ONCE,
 * at the place they are actually at. Clock-in picks the first place (inside,
 * else nearest); pings then move the attribution, with hysteresis so GPS jitter
 * on a shared boundary cannot flip it back and forth.
 */

/** A worker must stay inside another assigned place this long before switching. */
export const REATTRIBUTE_AFTER_MS = 2 * 60_000;

export interface AttributionState {
  /** Currently attributed lokasi (tracking.location_id). */
  current: string | null;
  /** Another assigned lokasi the worker has been seen inside, awaiting confirmation. */
  pendingId: string | null;
  pendingSince: Date | null;
}

export interface AttributionInput extends AttributionState {
  /** The assigned lokasi containing this ping (current preferred), or null. */
  containing: string | null;
  /** Device time of the ping. */
  at: Date;
}

export interface AttributionResult {
  locationId: string | null;
  pendingId: string | null;
  pendingSince: Date | null;
  switched: boolean;
}

const settled = (locationId: string | null, switched = false): AttributionResult => ({
  locationId,
  pendingId: null,
  pendingSince: null,
  switched,
});

export function decideAttribution(input: AttributionInput): AttributionResult {
  const { current, containing, pendingId, pendingSince, at } = input;

  // Outside every assigned place, or still at the current one: nothing moves.
  if (!containing || containing === current) return settled(current);

  // No place yet (ad-hoc clock-in, cleared lokasi): nothing to flap against.
  if (!current) return settled(containing, true);

  if (pendingId === containing && pendingSince) {
    return at.getTime() - pendingSince.getTime() >= REATTRIBUTE_AFTER_MS
      ? settled(containing, true)
      : { locationId: current, pendingId, pendingSince, switched: false };
  }

  // First sighting of this other place (or a different one): start the clock.
  return { locationId: current, pendingId: containing, pendingSince: at, switched: false };
}
