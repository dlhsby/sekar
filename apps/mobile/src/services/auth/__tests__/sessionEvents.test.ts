/**
 * Unit tests: the session-expiry event seam.
 *
 * `apiClient` cannot import the Redux store — the store's thunks import
 * `apiClient`, and Metro resolves that cycle to `undefined` at module-init
 * rather than throwing, so the bug would surface as a silent no-op at runtime.
 * The emitter is the seam that lets the transport layer say "this session is
 * over" without knowing who is listening.
 */
import {
  onSessionExpired,
  emitSessionExpired,
  resetSessionExpiry,
} from '../sessionEvents';

describe('sessionEvents', () => {
  beforeEach(() => {
    resetSessionExpiry();
  });

  it('delivers the reason to every subscriber', () => {
    const a = jest.fn();
    const b = jest.fn();
    onSessionExpired(a);
    onSessionExpired(b);

    emitSessionExpired('refresh_rejected');

    expect(a).toHaveBeenCalledWith('refresh_rejected');
    expect(b).toHaveBeenCalledWith('refresh_rejected');
  });

  it('latches, so a burst of concurrent 401s logs the worker out ONCE', () => {
    // Several in-flight requests fail together when a token dies. Without the
    // latch each one would drive its own logout and its own toast.
    const listener = jest.fn();
    onSessionExpired(listener);

    emitSessionExpired('refresh_rejected');
    emitSessionExpired('refresh_rejected');
    emitSessionExpired('retry_exhausted');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('re-arms after reset, so the NEXT session can also expire', () => {
    const listener = jest.fn();
    onSessionExpired(listener);

    emitSessionExpired('refresh_rejected');
    resetSessionExpiry();
    emitSessionExpired('refresh_rejected');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops delivering once unsubscribed', () => {
    const listener = jest.fn();
    const unsubscribe = onSessionExpired(listener);

    unsubscribe();
    emitSessionExpired('refresh_rejected');

    expect(listener).not.toHaveBeenCalled();
  });

  it('one throwing subscriber does not stop the others', () => {
    // A logout listener that blows up must not prevent the rest of the app
    // from tearing the session down.
    const boom = jest.fn(() => {
      throw new Error('listener exploded');
    });
    const survivor = jest.fn();
    onSessionExpired(boom);
    onSessionExpired(survivor);

    expect(() => emitSessionExpired('refresh_rejected')).not.toThrow();
    expect(survivor).toHaveBeenCalledWith('refresh_rejected');
  });
});
