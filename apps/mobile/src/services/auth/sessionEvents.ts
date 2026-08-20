/**
 * The seam between "the transport layer discovered the session is dead" and
 * "the app tears that session down".
 *
 * `apiClient` is where a dead session is DETECTED — it owns the 401 handling
 * and the refresh attempt — but it cannot dispatch the logout itself: the
 * Redux store's thunks import `apiClient`, so importing the store back would
 * close a require cycle. Metro resolves a cycle to `undefined` at module-init
 * rather than throwing, so that mistake does not crash; it silently produces a
 * `dispatch` that is not a function, at exactly the moment the app most needs
 * to react. An event emitter inverts the dependency: the transport announces,
 * a root-level subscriber decides what that means.
 *
 * Deliberately hand-rolled rather than reusing `EventEmitter`: the whole
 * contract is one event with a latch, and the latch is the part that matters.
 */

/** Why the session ended. Both are terminal — neither is a retryable error. */
export type SessionExpiredReason =
  /** The refresh token itself was rejected by the server. */
  | 'refresh_rejected'
  /** A retried request came back 401 again — the new token is not working. */
  | 'retry_exhausted';

type Listener = (reason: SessionExpiredReason) => void;

const listeners = new Set<Listener>();

/**
 * Latched so a session expires ONCE.
 *
 * When a token dies, every request already in flight fails together. Without
 * this, each one would drive its own logout, its own navigation reset and its
 * own toast — the worker would see a stack of identical "session expired"
 * messages for a single event.
 */
let expired = false;

/**
 * Subscribe to session expiry. Returns an unsubscribe function.
 */
export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce that the current session is over. No-op if it already has been —
 * see the `expired` latch above.
 */
export function emitSessionExpired(reason: SessionExpiredReason): void {
  if (expired) {
    return;
  }
  expired = true;

  for (const listener of listeners) {
    try {
      listener(reason);
    } catch (error) {
      // A subscriber that throws must not prevent the remaining teardown:
      // stopping the tracker and clearing auth state are separate concerns and
      // one failing is not a reason to skip the other.
      console.error('[SessionEvents] Listener failed:', error);
    }
  }
}

/**
 * Re-arm the latch for a NEW session. Called when authentication is
 * (re-)established — without it, the second session of an app run could never
 * report its own expiry.
 */
export function resetSessionExpiry(): void {
  expired = false;
}

/** Test seam: is the latch currently tripped? */
export function hasSessionExpired(): boolean {
  return expired;
}
