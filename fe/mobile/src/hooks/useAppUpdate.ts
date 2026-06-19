/**
 * useAppUpdate — checks the running build against the backend release registry.
 *
 * Behaviour by environment (config.IS_PRODUCTION):
 *   - dev / staging → "Unduh APK" opens the direct APK download (sideload).
 *   - production     → opens the Play Store (store listing; wired up later).
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import config from '../constants/config';
import {
  getApkDownloadUrl,
  getLatestRelease,
  type AppRelease,
} from '../services/api/appReleasesApi';
import {
  getInstalledVersion,
  isUpdateAvailable,
  type InstalledVersion,
} from '../utils/appVersion';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.wahyutrip.sekar';

export type AppUpdateStatus = 'checking' | 'upToDate' | 'updateAvailable' | 'unknown';

export interface AppUpdateState {
  status: AppUpdateStatus;
  installed: InstalledVersion;
  latest: AppRelease | null;
  /** Re-run the check (sets status to 'checking' first). */
  check: () => void;
  /** Open the appropriate update destination for the current environment. */
  openUpdate: () => void;
  /** Label for the update action, environment-aware. */
  updateActionLabel: string;
}

export function useAppUpdate(): AppUpdateState {
  const [installed] = useState<InstalledVersion>(() => getInstalledVersion());
  const [latest, setLatest] = useState<AppRelease | null>(null);
  const [status, setStatus] = useState<AppUpdateStatus>('checking');

  // The async fetch — does NOT set 'checking' itself, so the mount effect avoids
  // a synchronous setState (status already starts at 'checking').
  const runCheck = useCallback(async () => {
    const res = await getLatestRelease('android');
    if (res.error || !res.data) {
      setLatest(null);
      setStatus('unknown');
      return;
    }
    setLatest(res.data);
    setStatus(isUpdateAvailable(installed, res.data) ? 'updateAvailable' : 'upToDate');
  }, [installed]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const check = useCallback(() => {
    setStatus('checking');
    void runCheck();
  }, [runCheck]);

  const openUpdate = useCallback(() => {
    const url = config.IS_PRODUCTION ? PLAY_STORE_URL : getApkDownloadUrl('android');
    Linking.openURL(url).catch(() => {});
  }, []);

  return {
    status,
    installed,
    latest,
    check,
    openUpdate,
    updateActionLabel: config.IS_PRODUCTION ? 'Buka Play Store' : 'Unduh APK',
  };
}
