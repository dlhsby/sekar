/**
 * The forced-logout path.
 *
 * The governing constraint is "make sure no data is lost", so the assertions
 * that matter most here are the negative ones: what this path must NOT touch.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useSessionExpiry } from '../useSessionExpiry';
import { emitSessionExpired, resetSessionExpiry } from '../../services/auth/sessionEvents';
import { locationTracker } from '../../services/location';
import { websocketService } from '../../services/websocket';
import * as offlineQueue from '../../services/sync/offlineQueue';
import { logout } from '../../store/slices/authSlice';

const mockDispatch = jest.fn();

jest.mock('../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ auth: { isAuthenticated: true } }),
}));

jest.mock('../../services/location', () => ({
  locationTracker: { stop: jest.fn(() => Promise.resolve()) },
}));

jest.mock('../../services/websocket', () => ({
  websocketService: { disconnect: jest.fn() },
}));

jest.mock('../../services/sync/offlineQueue', () => ({
  clearQueueForCurrentUser: jest.fn(),
  clearOrphanedItems: jest.fn(),
}));

jest.mock('../../components/nb', () => ({
  NBToast: { show: jest.fn() },
}));

describe('useSessionExpiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSessionExpiry();
  });

  it('stops the tracker and signs the worker out', () => {
    renderHook(() => useSessionExpiry());

    act(() => {
      emitSessionExpired('refresh_rejected');
    });

    // The tracker is the only thing still producing work on a dead session.
    expect(locationTracker.stop).toHaveBeenCalled();
    expect(websocketService.disconnect).toHaveBeenCalled();
    // Dispatching `logout` is what actually moves the worker to the login
    // screen: `RootNavigator` gates on `isAuthenticated && user`, so clearing
    // the tokens alone left them inside the app on a session that could no
    // longer talk to the server.
    expect(mockDispatch).toHaveBeenCalledWith(logout());
  });

  it('NEVER clears the offline queue', () => {
    // The voluntary logout path clears the queue, but only after offering to
    // sync it first. This path arrives unannounced and mid-shift, so anything
    // already captured has to outlive it. A regression guard: if either of
    // these is ever added here, unsent work starts disappearing on expiry.
    renderHook(() => useSessionExpiry());

    act(() => {
      emitSessionExpired('refresh_rejected');
    });

    expect(offlineQueue.clearQueueForCurrentUser).not.toHaveBeenCalled();
    expect(offlineQueue.clearOrphanedItems).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount, so a stale listener cannot dispatch', () => {
    const { unmount } = renderHook(() => useSessionExpiry());
    unmount();
    mockDispatch.mockClear();

    act(() => {
      emitSessionExpired('refresh_rejected');
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
