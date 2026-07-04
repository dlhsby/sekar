/**
 * Diagnostics Screen
 * Provides diagnostic information for troubleshooting: permissions status,
 * connectivity checks, and sync data. Wrapped by MainNavigator with a
 * profile-style header (withProfileHeader).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { NBBackgroundPattern, NBText, NBButton } from '../../components/nb';
import { nbColors, nbSpacing, nbRadius, nbBorders, nbShadows } from '../../constants/nbTokens';
import { useAppSelector } from '../../store/hooks';
import { selectTotalPendingCount } from '../../store/slices/offlineSlice';
import { permissionManager } from '../../services/permissions';
import { useAppUpdate } from '../../hooks';
import config from '../../constants/config';

// ─── Types ────────────────────────────────────────────────────────────────────

type PermStatus = 'pending' | 'granted' | 'denied';

interface PermRow {
  key: string;
  title: string;
  why: string;
  icon: string;
  tint: string;
}

// ─── Permission Rows (constructed with i18n) ──────────────────────────────────

function getPermissionRows(t: any): PermRow[] {
  return [
    {
      key: 'notifications',
      title: t('profile:diagnostics.permissions.notifications.title'),
      why: t('profile:diagnostics.permissions.notifications.why'),
      icon: '🔔',
      tint: nbColors.bgAccentPink,
    },
    {
      key: 'location',
      title: t('profile:diagnostics.permissions.location.title'),
      why: t('profile:diagnostics.permissions.location.why'),
      icon: '📍',
      tint: nbColors.bgAccentMint,
    },
    {
      key: 'background_location',
      title: t('profile:diagnostics.permissions.backgroundLocation.title'),
      why: t('profile:diagnostics.permissions.backgroundLocation.why'),
      icon: '🛰️',
      tint: nbColors.bgAccentGreen,
    },
    {
      key: 'camera',
      title: t('profile:diagnostics.permissions.camera.title'),
      why: t('profile:diagnostics.permissions.camera.why'),
      icon: '📷',
      tint: nbColors.bgAccentYellow,
    },
    {
      key: 'gallery',
      title: t('profile:diagnostics.permissions.gallery.title'),
      why: t('profile:diagnostics.permissions.gallery.why'),
      icon: '🖼️',
      tint: nbColors.bgAccentLilac,
    },
  ];
}

// ─── Server Ping ──────────────────────────────────────────────────────────────

async function pingServer(): Promise<'reachable' | 'timeout' | 'unreachable'> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const base = config.API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');
    const res = await fetch(`${base}/health/live`, { signal: controller.signal });
    clearTimeout(id);
    return res.status < 500 ? 'reachable' : 'unreachable';
  } catch {
    clearTimeout(id);
    return controller.signal.aborted ? 'timeout' : 'unreachable';
  }
}

// ─── Permission Row Component ─────────────────────────────────────────────────

function PermissionRow({
  row,
  status,
  onRequest,
  onOpenSettings,
}: {
  row: PermRow;
  status: PermStatus;
  onRequest: () => Promise<void>;
  onOpenSettings: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequest = useCallback(async () => {
    setIsRequesting(true);
    try {
      await onRequest();
    } finally {
      setIsRequesting(false);
    }
  }, [onRequest]);

  return (
    <View style={styles.permissionRow}>
      <View style={[styles.picoIcon, { backgroundColor: row.tint }]}>
        <NBText variant="body-sm">{row.icon}</NBText>
      </View>
      <View style={styles.permissionRowBody}>
        <NBText variant="body-sm" color="black" style={styles.permissionTitle}>
          {row.title}
        </NBText>
        <NBText variant="caption" color="gray600">
          {row.why}
        </NBText>
      </View>
      {status === 'pending' ? (
        <NBButton
          title={t('profile:diagnostics.permissionButtons.check')}
          variant="primary"
          size="sm"
          onPress={handleRequest}
          loading={isRequesting}
        />
      ) : status === 'granted' ? (
        <View style={[styles.pill, { backgroundColor: nbColors.statusActiveBg }]}>
          <NBText variant="mono-sm" color="statusActive">
            {t('profile:diagnostics.status.granted')}
          </NBText>
        </View>
      ) : (
        <View style={{ gap: nbSpacing.sm }}>
          <View style={[styles.pill, { backgroundColor: nbColors.statusMissingBg }]}>
            <NBText variant="mono-sm" color="statusMissing">
              {t('profile:diagnostics.status.denied')}
            </NBText>
          </View>
          <NBButton
            title={t('profile:diagnostics.permissionButtons.openSettings')}
            variant="outline"
            size="sm"
            onPress={onOpenSettings}
            style={styles.openSettingsButton}
          />
        </View>
      )}
    </View>
  );
}

// ─── Connectivity Status Item ─────────────────────────────────────────────────

function ConnectivityRow({
  label,
  status,
}: {
  label: string;
  status: 'online' | 'offline' | 'checking' | 'reachable' | 'timeout' | 'unreachable';
}): React.JSX.Element {
  const { t } = useTranslation();

  const statusColor =
    status === 'online' || status === 'reachable'
      ? nbColors.statusActive
      : status === 'offline' || status === 'unreachable'
      ? nbColors.statusMissing
      : status === 'timeout'
      ? nbColors.warning
      : nbColors.gray500;

  const statusLabel =
    status === 'online'
      ? t('profile:diagnostics.status.online')
      : status === 'offline'
      ? t('profile:diagnostics.status.offline')
      : status === 'checking'
      ? t('profile:diagnostics.status.checking')
      : status === 'reachable'
      ? t('profile:diagnostics.status.reachable')
      : status === 'timeout'
      ? t('profile:diagnostics.status.timeout')
      : t('profile:diagnostics.status.unreachable');

  return (
    <View style={styles.connectivityRow}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <NBText variant="body-sm" color="black" style={{ flex: 1 }}>
        {label}
      </NBText>
      <NBText variant="mono-sm" color="gray600">
        {statusLabel}
      </NBText>
    </View>
  );
}

// ─── Sync Status Row ──────────────────────────────────────────────────────────

function SyncStatusRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.syncRow}>
      <NBText variant="body-sm" color="black">
        {label}
      </NBText>
      {typeof value === 'string' || typeof value === 'number' ? (
        <NBText variant="mono-sm" color="gray600">
          {value}
        </NBText>
      ) : (
        value
      )}
    </View>
  );
}

// ─── Section Helper ───────────────────────────────────────────────────────────

function DiagSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <NBText variant="mono-sm" color="gray600" uppercase style={styles.sectionTitle}>
        {title}
      </NBText>
      <View style={styles.sectionCard}>
        {children}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function DiagnosticsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { bottom: bottomInset } = useSafeAreaInsets();

  // Redux state
  const isOnline = useAppSelector((state) => state.offline.isOnline);
  const isSyncing = useAppSelector((state) => state.offline.isSyncing);
  const lastSyncTime = useAppSelector((state) => state.offline.lastSyncTime);
  const pendingCount = useAppSelector((state) => selectTotalPendingCount(state));

  // Permission states
  const permRows = getPermissionRows(t);
  const [permStatuses, setPermStatuses] = useState<Record<string, PermStatus>>(() => {
    const init: Record<string, PermStatus> = {};
    permRows.forEach((r) => (init[r.key] = 'pending'));
    return init;
  });

  // Server connectivity state
  const [serverStatus, setServerStatus] = useState<
    'checking' | 'reachable' | 'timeout' | 'unreachable'
  >('checking');

  // App version checker ("doctor")
  const appUpdate = useAppUpdate();

  // ─── Load permission statuses on mount ─────────────────────────────────────

  const refreshPermissions = useCallback(async () => {
    try {
      const all = await permissionManager.checkAllPermissions();
      setPermStatuses({
        notifications: mapStatus(all.notifications),
        location: mapStatus(all.location),
        background_location: mapStatus(all.backgroundLocation),
        camera: mapStatus(all.camera),
        gallery: mapStatus(all.gallery),
      });
    } catch (error) {
      console.error('[DiagnosticsScreen] Failed to check permissions:', error);
    }
  }, []);

  const checkServer = useCallback(async () => {
    setServerStatus('checking');
    const result = await pingServer();
    setServerStatus(result);
  }, []);

  useEffect(() => {
    refreshPermissions();
    checkServer();
  }, [refreshPermissions, checkServer]);

  // AppState listener for permission re-check on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void refreshPermissions();
      }
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  // ─── Permission request handlers ──────────────────────────────────────────

  const handleRequestPermission = useCallback(
    async (key: string) => {
      try {
        const row = permRows.find((r) => r.key === key);
        if (!row) return;

        // Background location needs foreground first
        if (key === 'background_location') {
          const fg = await permissionManager.requestLocationPermission();
          setPermStatuses((s) => ({
            ...s,
            location: mapStatus(fg),
          }));
          if (fg.granted) {
            const bg = await permissionManager.requestBackgroundLocationPermission();
            setPermStatuses((s) => ({ ...s, background_location: mapStatus(bg) }));
          }
          return;
        }

        // Handle other permissions
        let result;
        switch (key) {
          case 'notifications':
            result = await permissionManager.requestNotificationPermission();
            break;
          case 'location':
            result = await permissionManager.requestLocationPermission();
            break;
          case 'camera':
            result = await permissionManager.requestCameraPermission();
            break;
          case 'gallery':
            result = await permissionManager.requestGalleryPermission();
            break;
          default:
            return;
        }

        setPermStatuses((s) => ({ ...s, [key]: mapStatus(result) }));
      } catch (error) {
        console.error(`[DiagnosticsScreen] Failed to request ${key}:`, error);
      }
    },
    [],
  );

  // ─── Format sync time ─────────────────────────────────────────────────────

  const formatSyncTime = useCallback((isoString: string | null): string => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();

      if (isToday) {
        return date.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else {
        return (
          date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }) +
          ' ' +
          date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })
        );
      }
    } catch {
      return '—';
    }
  }, []);

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: nbSpacing.md + bottomInset },
        ]}
      >
        {/* Section A: Permissions */}
        <DiagSection title={t('profile:diagnostics.sections.permissions')}>
          {permRows.map((row) => (
            <PermissionRow
              key={row.key}
              row={row}
              status={permStatuses[row.key] || 'pending'}
              onRequest={() => handleRequestPermission(row.key)}
              onOpenSettings={() => permissionManager.openSettings()}
            />
          ))}
        </DiagSection>

        {/* Section B: Connectivity */}
        <DiagSection title={t('profile:diagnostics.sections.connectivity')}>
          <ConnectivityRow
            label={t('profile:diagnostics.connectivity.internet')}
            status={isOnline ? 'online' : 'offline'}
          />
          <View style={styles.divider} />
          <ConnectivityRow
            label={t('profile:diagnostics.connectivity.server')}
            status={serverStatus}
          />
          <NBText
            variant="mono-sm"
            color="gray600"
            style={styles.apiBaseUrl}
          >
            {config.API_BASE_URL.replace(/\/api\/v\d+\/?$/, '')}
          </NBText>
          <NBButton
            title={t('profile:diagnostics.connectivity.recheck')}
            variant="outline"
            size="sm"
            onPress={checkServer}
            loading={serverStatus === 'checking'}
            style={styles.recheckButton}
          />
        </DiagSection>

        {/* Section: App version ("doctor") */}
        <DiagSection title={t('profile:diagnostics.sections.appVersion')}>
          <SyncStatusRow
            label={t('profile:diagnostics.appVersion.installed')}
            value={`v${appUpdate.installed.version} (build ${appUpdate.installed.versionCode})`}
          />
          <View style={styles.divider} />
          <View style={styles.syncRow}>
            <NBText variant="body-sm" color="black">
              {t('profile:diagnostics.appVersion.status')}
            </NBText>
            {appUpdate.status === 'checking' ? (
              <NBText variant="mono-sm" color="gray600">
                {t('profile:diagnostics.status.checking')}
              </NBText>
            ) : appUpdate.status === 'unknown' ? (
              <NBText variant="mono-sm" color="gray600">
                {t('profile:diagnostics.status.unknown')}
              </NBText>
            ) : appUpdate.status === 'upToDate' ? (
              <View style={[styles.pill, { backgroundColor: nbColors.statusActiveBg }]}>
                <NBText variant="mono-sm" color="statusActive">
                  {t('profile:diagnostics.status.upToDate')}
                </NBText>
              </View>
            ) : (
              <View style={[styles.pill, { backgroundColor: nbColors.bgAccentYellow }]}>
                <NBText variant="mono-sm" color="black">
                  {t('profile:diagnostics.status.updateAvailable')}
                </NBText>
              </View>
            )}
          </View>
          {appUpdate.latest &&
            (appUpdate.status === 'upToDate' || appUpdate.status === 'updateAvailable') && (
              <>
                <View style={styles.divider} />
                <SyncStatusRow
                  label={t('profile:diagnostics.appVersion.available')}
                  value={`v${appUpdate.latest.version} (build ${appUpdate.latest.versionCode ?? '—'})`}
                />
              </>
            )}
          {appUpdate.status === 'updateAvailable' && (
            <NBButton
              title={appUpdate.updateActionLabel}
              variant="primary"
              size="sm"
              onPress={appUpdate.openUpdate}
              style={styles.recheckButton}
            />
          )}
          <NBButton
            title={t('profile:diagnostics.appVersion.recheck')}
            variant="outline"
            size="sm"
            onPress={appUpdate.check}
            loading={appUpdate.status === 'checking'}
            style={styles.recheckButton}
          />
        </DiagSection>

        {/* Section C: Data & Sync */}
        <DiagSection title={t('profile:diagnostics.sections.dataSync')}>
          <SyncStatusRow
            label={t('profile:diagnostics.dataSync.pendingQueue')}
            value={
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      pendingCount > 0
                        ? nbColors.primary
                        : nbColors.gray100,
                  },
                ]}
              >
                <NBText
                  variant="mono-sm"
                  color={pendingCount > 0 ? 'white' : 'gray600'}
                >
                  {pendingCount}
                </NBText>
              </View>
            }
          />
          <View style={styles.divider} />
          <SyncStatusRow
            label={t('profile:diagnostics.dataSync.lastSync')}
            value={formatSyncTime(lastSyncTime)}
          />
          {isSyncing && (
            <>
              <View style={styles.divider} />
              <NBText variant="caption" color="gray600" style={styles.syncingText}>
                {t('profile:diagnostics.dataSync.syncing')}
              </NBText>
            </>
          )}
        </DiagSection>
      </ScrollView>
    </NBBackgroundPattern>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Map PermissionResult to PermStatus
 */
function mapStatus(result: {
  granted: boolean;
  canRequest: boolean;
}): PermStatus {
  if (result.granted) return 'granted';
  if (!result.canRequest) return 'denied'; // BLOCKED
  return 'pending';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingTop: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
  },

  // ─── Section ───────────────────────────────────────────────────────────

  section: {
    marginBottom: nbSpacing.md,
  },

  sectionTitle: {
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
    marginLeft: nbSpacing.xs,
  },

  sectionCard: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    overflow: 'hidden',
    ...nbShadows.sm,
  },

  // ─── Permission Row ────────────────────────────────────────────────────

  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray300,
  },

  picoIcon: {
    width: 40,
    height: 40,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  permissionRowBody: {
    flex: 1,
  },

  permissionTitle: {
    fontWeight: '600',
  },

  openSettingsButton: {
    marginTop: nbSpacing.xs,
  },

  pill: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Connectivity Row ──────────────────────────────────────────────────

  connectivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: nbSpacing.xs,
  },

  apiBaseUrl: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    marginTop: nbSpacing.sm,
  },

  recheckButton: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.sm,
  },

  // ─── Sync Row ──────────────────────────────────────────────────────────

  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
  },

  badge: {
    minWidth: 32,
    height: 24,
    borderRadius: nbRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.xs,
  },

  syncingText: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
  },

  divider: {
    height: 1,
    backgroundColor: nbColors.gray300,
    marginHorizontal: nbSpacing.md,
  },
});
