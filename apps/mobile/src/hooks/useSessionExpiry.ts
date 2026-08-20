/**
 * Turns "the server no longer accepts this session" into an actual logout.
 *
 * Before this existed the 401 path called `clearAll()` and stopped there: the
 * tokens were gone while Redux still held `isAuthenticated: true`, so
 * `RootNavigator` kept the worker inside the app on a session that could no
 * longer talk to the server. Every request 401'd, the tracker kept pumping
 * pings into the offline queue, and the only visible symptom was a toast
 * reading "Sesi tidak valid. Silakan masuk kembali." with no way to act on it.
 *
 * This is deliberately a hook rather than a module-level subscriber: tearing a
 * session down means dispatching, and `dispatch` belongs to the store the
 * Provider owns. It also means the subscription follows the component
 * lifecycle instead of outliving it.
 */
import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { onSessionExpired, resetSessionExpiry } from '../services/auth/sessionEvents';
import { logout, resetState as resetAuthState } from '../store/slices/authSlice';
import { resetState as resetShiftState } from '../store/slices/shiftSlice';
import { resetState as resetActivitiesState } from '../store/slices/activitiesSlice';
import { resetState as resetNotificationsState } from '../store/slices/notificationsSlice';
import { locationTracker } from '../services/location';
import { websocketService } from '../services/websocket';
import i18n from '../i18n/config';
import { NBToast } from '../components/nb';

export function useSessionExpiry(): void {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  // The latch lives in the emitter, but only this hook knows when a NEW session
  // has begun. Without re-arming, the second sign-in of an app run could never
  // report its own expiry.
  const wasAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated.current) {
      resetSessionExpiry();
    }
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = onSessionExpired((reason) => {
      console.warn(`[Session] Expired (${reason}) — signing out`);

      // Stop producing work FIRST. The tracker is the only thing still writing
      // while the session is dead, and every ping it takes now can only be
      // queued, never sent.
      void locationTracker.stop().catch((error) => {
        console.warn('[Session] Failed to stop location tracking:', error);
      });
      try {
        websocketService.disconnect();
      } catch (error) {
        console.warn('[Session] Failed to disconnect websocket:', error);
      }

      // NOTE: the offline queue is deliberately left alone. The voluntary
      // logout path clears it, but only after offering to sync it first — this
      // path arrives unannounced and mid-shift, so anything already captured
      // has to outlive it and sync when the worker signs back in. The queue
      // lives in AsyncStorage while the credentials live in EncryptedStorage,
      // so `clearAll()` does not reach it.
      dispatch(resetAuthState());
      dispatch(resetShiftState());
      dispatch(resetActivitiesState());
      dispatch(resetNotificationsState());
      // Offline state is NOT reset: it mirrors the surviving queue, and
      // zeroing the pending count would tell the worker their unsent work
      // is gone.

      // Dispatched last so navigation only unwinds once the state behind it is
      // already consistent.
      dispatch(logout());

      NBToast.show({
        level: 'warning',
        title: i18n.t('auth:sessionExpired.title'),
        body: i18n.t('auth:sessionExpired.body'),
      });
    });

    return unsubscribe;
  }, [dispatch]);
}
