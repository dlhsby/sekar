/**
 * usePermissionMonitor — Phase 4 M3a+b runtime permission re-check.
 *
 * Handles the gap left by `permissionManager.shouldShowPermissionRequest()`:
 * once a user finishes the OB-2 onboarding, that helper returns `false`
 * forever, even if the user later revokes a critical permission from system
 * Settings (or the OS itself revokes it after an upgrade, MIUI auto-reset,
 * etc.). This hook re-evaluates the status of the THREE required
 * permissions — location, camera, notifications — on mount and on every
 * `inactive|background → active` AppState transition.
 *
 * What it does NOT do:
 *   - Re-prompt the OS dialog. Android/iOS only allow one prompt per
 *     permission; after denial the only recourse is Settings deep-link.
 *   - Block navigation. The caller decides whether to surface a banner,
 *     toast, or full-screen blocker.
 *
 * Returned `missing` is the list of permissions whose status is not
 * `granted`. The list is stable (sorted by enum order) so callers can use
 * it as a React dependency without thrashing.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import i18n from '../../i18n/config';
import { PermissionType, permissionManager } from './PermissionManager';

export interface PermissionMonitorState {
  missing: PermissionType[];
  /** True until the first check resolves. Lets callers avoid flashing the banner on cold start. */
  initializing: boolean;
  /** Imperative re-check (e.g. after the user returns from Settings via a custom path). */
  refresh: () => Promise<void>;
}

export function usePermissionMonitor(enabled: boolean): PermissionMonitorState {
  const [missing, setMissing] = useState<PermissionType[]>([]);
  const [initializing, setInitializing] = useState<boolean>(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const enabledRef = useRef<boolean>(enabled);
  enabledRef.current = enabled;

  const refresh = useCallback(async () => {
    if (!enabledRef.current) {
      setMissing([]);
      setInitializing(false);
      return;
    }
    try {
      const status = await permissionManager.checkAllPermissions();
      const next: PermissionType[] = [];
      if (!status.location.granted) next.push(PermissionType.LOCATION);
      if (!status.camera.granted) next.push(PermissionType.CAMERA);
      if (!status.notifications.granted) next.push(PermissionType.NOTIFICATIONS);
      setMissing((prev) => (sameSet(prev, next) ? prev : next));
    } catch {
      // Fail-closed on a check error: pretend nothing is missing rather
      // than risk a stuck banner with no real underlying signal.
      setMissing([]);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setMissing([]);
      setInitializing(false);
      return;
    }
    refresh();
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && prev !== 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  return { missing, initializing, refresh };
}

function sameSet(a: PermissionType[], b: PermissionType[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const PERMISSION_LABEL: Record<PermissionType, string> = {
  [PermissionType.LOCATION]: i18n.t('components:permissions.location'),
  [PermissionType.CAMERA]: i18n.t('components:permissions.camera'),
  [PermissionType.NOTIFICATIONS]: i18n.t('components:permissions.notifications'),
  [PermissionType.BACKGROUND_LOCATION]: i18n.t('components:permissions.backgroundLocation'),
  [PermissionType.GALLERY]: i18n.t('components:permissions.gallery'),
};
